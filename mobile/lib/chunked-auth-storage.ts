type Store = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown>; removeItem(key: string): Promise<unknown> };
type Manifest = { version: 1; generation: string; count: number };

// Supabase sessions can exceed iOS Keychain's historical per-value size limit.
// Publish the manifest last: an interrupted write cannot replace a good session
// with half a session. The legacy unencrypted entry is removed after migration.
export function createAuthStorage(secure: Store, legacy: Store, uniqueId: () => string) {
  const queues = new Map<string, Promise<unknown>>();
  const manifestKey = (key: string) => `${key}.secure-v1`;
  function parse(raw: string | null): Manifest | null {
    if (!raw || raw === 'removed') return null;
    const value = JSON.parse(raw);
    if (value.version !== 1 || !/^[a-zA-Z0-9-]+$/.test(value.generation) || !Number.isInteger(value.count) || value.count < 1 || value.count > 256) throw new Error('Ekki tókst að lesa vistaða innskráningu.');
    return value;
  }
  const partKey = (key: string, manifest: Manifest, index: number) => `${manifestKey(key)}.${manifest.generation}.${index}`;
  async function cleanup(key: string, manifest: Manifest | null) {
    if (manifest) await Promise.all(Array.from({ length: manifest.count }, (_, index) => secure.removeItem(partKey(key, manifest, index)).catch(() => {})));
  }
  async function write(key: string, value: string) {
    const previous = await secure.getItem(manifestKey(key));
    let old: Manifest | null = null;
    try { old = parse(previous); } catch { /* Replace a damaged manifest on fresh sign-in. */ }
    const characters = Array.from(value);
    const manifest: Manifest = { version: 1, generation: uniqueId(), count: Math.max(1, Math.ceil(characters.length / 400)) };
    if (manifest.count > 256) throw new Error('Innskráningarupplýsingarnar eru of stórar til að vista á tækinu.');
    try {
      for (let index = 0; index < manifest.count; index++) await secure.setItem(partKey(key, manifest, index), characters.slice(index * 400, (index + 1) * 400).join(''));
      await secure.setItem(manifestKey(key), JSON.stringify(manifest));
    } catch (error) { await cleanup(key, manifest); throw error; }
    await legacy.removeItem(key);
    await cleanup(key, old);
  }
  function serialize<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const pending = (queues.get(key) ?? Promise.resolve()).catch(() => {}).then(operation);
    queues.set(key, pending);
    void pending.finally(() => { if (queues.get(key) === pending) queues.delete(key); }).catch(() => {});
    return pending;
  }
  return {
    getItem: (key: string) => serialize(key, async () => {
      const raw = await secure.getItem(manifestKey(key));
      if (raw === 'removed') return null;
      let manifest: Manifest | null;
      try { manifest = parse(raw); } catch { await secure.setItem(manifestKey(key), 'removed'); await legacy.removeItem(key); return null; }
      if (!manifest) {
        const value = await legacy.getItem(key);
        if (value !== null) await write(key, value);
        return value;
      }
      const parts = await Promise.all(Array.from({ length: manifest.count }, (_, index) => secure.getItem(partKey(key, manifest, index))));
      if (parts.some((part) => part === null)) { await secure.setItem(manifestKey(key), 'removed'); await legacy.removeItem(key); await cleanup(key, manifest); return null; }
      return parts.join('');
    }),
    setItem: (key: string, value: string) => serialize(key, () => write(key, value)),
    removeItem: (key: string) => serialize(key, async () => {
      const raw = await secure.getItem(manifestKey(key));
      // A tombstone prevents an old AsyncStorage entry from reviving a logout.
      await secure.setItem(manifestKey(key), 'removed');
      await legacy.removeItem(key);
      let previous: Manifest | null = null;
      try { previous = parse(raw); } catch { /* Logout also clears damaged sessions. */ }
      await cleanup(key, previous);
    }),
  };
}
