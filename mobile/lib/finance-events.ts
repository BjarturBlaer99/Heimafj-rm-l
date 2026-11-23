type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeFinanceChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function emitFinanceChange(): void {
  for (const listener of listeners) listener();
}
