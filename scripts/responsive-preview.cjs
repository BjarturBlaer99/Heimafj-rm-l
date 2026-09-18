// Local, in-memory data for responsive QA. Never connects to a real account.
// node scripts/responsive-preview.cjs --dir=<isolated web checkout>
// Add --writable to test writes in memory. Authenticated /__control supports
// GET status and POST { failNextTable: "transactions", delayMs: 500 }.
const http = require('node:http');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { join, resolve } = require('node:path');
const { randomUUID } = require('node:crypto');
const arg = (name, fallback) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const dir = resolve(arg('dir', '.'));
const port = Number(arg('port', '5191'));
const backendPort = Number(arg('backend-port', '5193'));
const writable = process.argv.includes('--writable');
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const month = new Date().toISOString().slice(0, 7);
const stamp = new Date().toISOString();
const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'preview@example.invalid', email_confirmed_at: stamp, app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { full_name: 'Alex' }, identities: [], created_at: stamp, updated_at: stamp };
const now = Math.floor(Date.now() / 1000);
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, aud: 'authenticated', role: 'authenticated', email: user.email, iat: now, exp: now + 86400 })}.dGVzdA`;
const session = { access_token: token, refresh_token: 'synthetic-preview-refresh', token_type: 'bearer', expires_in: 86400, expires_at: now + 86400, user };
const row = (values) => ({ id: randomUUID(), user_id: user.id, created_at: stamp, updated_at: stamp, ...values });
const categories = [['Laun', 'income'], ['Matur og heimili', 'expense'], ['Samgöngur og ferðakostnaður', 'expense'], ['Áskriftir', 'expense'], ['Reikningar', 'expense'], ['Húsnæðiskostnaður', 'expense']].map(([name, type]) => row({ name, type, is_default: true }));
const transactions = Array.from({ length: 6 }, (_, i) => {
  const at = new Date(); at.setDate(1); at.setMonth(at.getMonth() - i);
  const period = at.toISOString().slice(0, 7);
  return [['Mánaðarlaun', 1265000, 0], ['Vikuleg matarinnkaup fyrir heimilið', 84290, 1], ['Bensín og samgöngur', 34800, 2], ['Húsnæðislán og fasteignagjöld', 326900, 5], ['Sími, internet og streymisþjónustur', 19990, 3], ['Matarinnkaup og heimilisvörur', 67850, 1]].map(([note, amount, index], j) => row({ note, amount: amount - i * 950, category_id: categories[index].id, type: index === 0 ? 'income' : 'expense', date: `${period}-${String(j + 1).padStart(2, '0')}` }));
}).flat();
const bills = [['Húsnæðislán og fasteignagjöld', 326900], ['Sími, internet og streymisþjónustur', 19990], ['Tryggingar fjölskyldunnar', 38900]].map(([name, amount], i) => row({ name, amount, category_id: categories[4].id, series_id: randomUUID(), month: `${month}-01`, due_day: i + 1, is_active: true }));
const buckets = [['serignarsparnadur', 'Séreignarsparnaður', 4650000], ['husnaedisparnadur', 'Húsnæðissparnaður', 3875000], ['hlutabref', 'Hlutabréf', 1245000], ['sjodir', 'Sjóðir', 875000]].map(([bucket_type, label, amount]) => row({ bucket_type, label, amount }));
const tables = {
  profiles: [{ id: user.id, full_name: 'Alex', currency: 'ISK' }], categories, transactions, bills,
  budgets: categories.filter((c) => c.type === 'expense').map((c, i) => row({ category_id: c.id, month: `${month}-01`, amount: i === 4 ? 350000 : 175000 })),
  bill_payments: [row({ bill_id: bills[0].id, transaction_id: transactions[3].id, month: `${month}-01`, amount: bills[0].amount, paid_at: transactions[3].date })],
  savings_buckets: buckets,
  savings_bucket_entries: buckets.map((b) => row({ bucket_type: b.bucket_type, label: b.label, amount: 75000, date: `${month}-05`, note: 'Reglulegur mánaðarlegur sparnaður' })),
  savings_goals: [row({ title: 'Útborgun í fyrstu íbúð á höfuðborgarsvæðinu', target_amount: 15000000, current_amount: 10645000, target_date: '2028-01-01' })], savings_contributions: []
};
const controls = { failNextTable: null, failNextReadTable: null, failReadTable: null, failAfterSavingsCommit: false, delayMs: 0, mutationCount: 0, mutationAttemptCount: 0, lastMutation: null };
const queryOptions = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']);
const filterOperators = new Set(['eq', 'is', 'gte', 'lte', 'lt', 'ilike', 'in']);
const hasTable = (name) => Object.hasOwn(tables, name);
const ownsRow = (table, item) => table === 'profiles' ? item.id === user.id : item.user_id === user.id;
const fixtureError = (status, message, code = 'PREVIEW_ERROR') => Object.assign(new Error(message), { status, code });
async function readJson(request) {
  let body = '';
  for await (const part of request) {
    body += part;
    if (Buffer.byteLength(body) > 4 * 1024 * 1024) throw fixtureError(413, 'Preview request is too large');
  }
  try { return body ? JSON.parse(body) : {}; }
  catch { throw fixtureError(400, 'Invalid preview JSON'); }
}
function assertOwnership(table, item, inserting = false) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) throw fixtureError(400, 'Expected a row object');
  if (Object.hasOwn(item, 'user_id') && item.user_id !== user.id) throw fixtureError(403, 'Preview row must belong to the synthetic user');
  if (table === 'profiles' && Object.hasOwn(item, 'id') && item.id !== user.id) throw fixtureError(403, 'Preview profile must belong to the synthetic user');
  if (inserting && !ownsRow(table, item)) throw fixtureError(403, 'Preview insert requires the synthetic owner');
}
function presentRows(table, rows, params) {
  const selection = params.get('select') ?? '*';
  if (selection.includes('categories')) rows = rows.map((item) => ({ ...item, categories: categories.find((category) => category.id === item.category_id) ?? null }));
  if (selection !== '*' && !selection.includes('(') && !selection.includes('*')) {
    const columns = selection.split(',').map((column) => column.trim());
    return rows.map((item) => Object.fromEntries(columns.map((column) => [column, item[column]])));
  }
  return rows;
}
function controlSnapshot() {
  return { writable, ...controls, rowCounts: Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length])) };
}
function matches(item, params) {
  for (const [key, raw] of params) {
    if (queryOptions.has(key)) continue;
    const [op, ...parts] = raw.split('.'); const value = parts.join('.');
    if (op === 'eq' && String(item[key]) !== value) return false;
    if (op === 'in' && !value.slice(1, -1).split(',').map((part) => part.replaceAll('"', '')).includes(String(item[key]))) return false;
    if (op === 'is') {
      if (value === 'null' ? item[key] != null : value === 'true' ? item[key] !== true : value === 'false' ? item[key] !== false : true) return false;
    }
    if (op === 'gte' && !(item[key] >= value)) return false;
    if (op === 'lte' && !(item[key] <= value)) return false;
    if (op === 'lt' && !(item[key] < value)) return false;
    if (op === 'ilike' && !String(item[key] ?? '').toLowerCase().includes(value.replaceAll('%', '').toLowerCase())) return false;
  }
  return true;
}
const backend = http.createServer(async (request, response) => {
  const send = (status, value) => { response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(value === undefined ? undefined : JSON.stringify(value)); };
  try {
    const url = new URL(request.url, `http://127.0.0.1:${backendPort}`);
    // Only this loopback fixture exposes its fake session for browser QA.
    if (url.pathname === '/__fixture') return send(200, { session, categoryId: categories[1].id });
    if (url.pathname === '/auth/v1/token' && request.method === 'POST') {
      let body = ''; for await (const part of request) body += part;
      const data = JSON.parse(body);
      return (data.email === user.email && data.password === 'preview-password') || data.refresh_token === session.refresh_token ? send(200, session) : send(400, { msg: 'Invalid preview login' });
    }
    if (request.headers.authorization !== `Bearer ${token}`) return send(401, { message: 'Synthetic session required' });
    if (url.pathname === '/auth/v1/user') {
      if (request.method === 'PUT') {
        if (!writable) return send(405, { message: 'Preview fixture is read only' });
        const body = await readJson(request);
        if (body.data) user.user_metadata = { ...user.user_metadata, ...body.data };
      }
      return send(200, user);
    }
    if (url.pathname === '/auth/v1/logout') return send(204);
    if (url.pathname === '/__control') {
      if (request.method === 'GET') return send(200, controlSnapshot());
      if (request.method !== 'POST') return send(405, { message: 'Use GET or POST for fixture controls' });
      if (!writable) return send(405, { message: 'Preview fixture is read only' });
      const data = await readJson(request);
      if (!data || Array.isArray(data) || typeof data !== 'object') throw fixtureError(400, 'Expected fixture controls');
      if (Object.keys(data).some((key) => !['failNextTable', 'failNextReadTable', 'failReadTable', 'failAfterSavingsCommit', 'delayMs', 'resetMutationLog'].includes(key))) throw fixtureError(400, 'Unknown fixture control');
      if (Object.hasOwn(data, 'failAfterSavingsCommit') && typeof data.failAfterSavingsCommit !== 'boolean') throw fixtureError(400, 'Expected a boolean');
      if (Object.hasOwn(data, 'failAfterSavingsCommit')) controls.failAfterSavingsCommit = data.failAfterSavingsCommit;
      if (Object.hasOwn(data, 'failReadTable') && data.failReadTable !== null && !hasTable(data.failReadTable)) throw fixtureError(400, 'Unknown persistent read failure table');
      if (Object.hasOwn(data, 'failReadTable')) controls.failReadTable = data.failReadTable;
      if (Object.hasOwn(data, 'failNextReadTable') && data.failNextReadTable !== null && !hasTable(data.failNextReadTable)) throw fixtureError(400, 'Unknown read failure table');
      if (Object.hasOwn(data, 'failNextReadTable')) controls.failNextReadTable = data.failNextReadTable;
      if (Object.hasOwn(data, 'failNextTable') && data.failNextTable !== null && data.failNextTable !== '*' && !hasTable(data.failNextTable)) throw fixtureError(400, 'Unknown failure table');
      if (Object.hasOwn(data, 'delayMs') && (!Number.isInteger(data.delayMs) || data.delayMs < 0 || data.delayMs > 10000)) throw fixtureError(400, 'delayMs must be an integer from 0 to 10000');
      if (Object.hasOwn(data, 'resetMutationLog') && typeof data.resetMutationLog !== 'boolean') throw fixtureError(400, 'resetMutationLog must be a boolean');
      if (Object.hasOwn(data, 'failNextTable')) controls.failNextTable = data.failNextTable;
      if (Object.hasOwn(data, 'delayMs')) controls.delayMs = data.delayMs;
      if (data.resetMutationLog) { controls.mutationCount = 0; controls.mutationAttemptCount = 0; controls.lastMutation = null; }
      return send(200, controlSnapshot());
    }
    if (!url.pathname.startsWith('/rest/v1/')) return send(405, { message: 'Unsupported preview route' });
    if (url.pathname === '/rest/v1/rpc/add_savings_bucket_contribution' && request.method === 'POST') {
      if (!writable) return send(405, { message: 'Preview fixture is read only' });
      const body = await readJson(request);
      const amount = Number(body.p_amount);
      const entry = { id: body.p_request_id, user_id: user.id, bucket_type: body.p_bucket_type, label: body.p_label, amount, date: body.p_date, note: body.p_note ?? null };
      if (!entry.id || !Number.isFinite(amount) || amount <= 0 || !buckets.some((bucket) => bucket.bucket_type === entry.bucket_type)) throw fixtureError(400, 'Invalid savings request');
      const existing = tables.savings_bucket_entries.find((item) => item.id === entry.id);
      const bucket = buckets.find((item) => item.user_id === user.id && item.bucket_type === entry.bucket_type);
      if (existing) {
        if (Object.keys(entry).some((key) => existing[key] !== entry[key])) throw fixtureError(409, 'Savings retry contents changed');
        return send(200, [{ entry_id: existing.id, balance: bucket.amount, already_recorded: true }]);
      }
      controls.mutationAttemptCount++;
      const delay = controls.delayMs; controls.delayMs = 0;
      if (delay) await new Promise((resolveDelay) => setTimeout(resolveDelay, delay));
      if (['*', 'savings_buckets', 'savings_bucket_entries'].includes(controls.failNextTable)) {
        controls.failNextTable = null;
        throw fixtureError(500, 'Synthetic savings RPC failure');
      }
      // This models the response contract only. PostgreSQL tests verify the real
      // transaction, row locks, RLS, and rollback of both writes.
      bucket.amount = Number(bucket.amount) + amount;
      tables.savings_bucket_entries.push(row(entry));
      controls.mutationCount++;
      if (controls.failAfterSavingsCommit) {
        controls.failAfterSavingsCommit = false;
        throw fixtureError(500, 'Synthetic lost savings response after commit');
      }
      return send(200, [{ entry_id: entry.id, balance: bucket.amount, already_recorded: false }]);
    }
    const table = url.pathname.slice('/rest/v1/'.length);
    if (!hasTable(table)) return send(404, { message: 'Unknown preview table' });
    if (['POST', 'PATCH', 'DELETE'].includes(request.method)) {
      if (!writable) return send(405, { message: 'Preview fixture is read only' });
      for (const [key, raw] of url.searchParams) {
        if (!queryOptions.has(key) && !filterOperators.has(raw.split('.')[0])) throw fixtureError(400, 'Unsupported mutation filter');
      }
      const ownerKey = table === 'profiles' ? 'id' : 'user_id';
      if (request.method !== 'POST' && url.searchParams.get(ownerKey) !== `eq.${user.id}`) throw fixtureError(403, 'Preview updates and deletes require an explicit owner filter');
      const body = request.method === 'DELETE' ? null : await readJson(request);
      const inputs = request.method === 'POST' && Array.isArray(body) ? body : [body];
      if (request.method !== 'DELETE') inputs.forEach((item) => assertOwnership(table, item, request.method === 'POST'));
      const mutation = { attempt: ++controls.mutationAttemptCount, table, method: request.method, status: 'pending', affectedRows: 0, startedAt: new Date().toISOString(), finishedAt: null };
      controls.lastMutation = mutation;
      const delay = controls.delayMs;
      controls.delayMs = 0;
      const fail = controls.failNextTable === '*' || controls.failNextTable === table;
      if (fail) controls.failNextTable = null;
      if (delay) await new Promise((resolveDelay) => setTimeout(resolveDelay, delay));
      try {
        if (fail) throw fixtureError(500, `Synthetic preview write failed for ${table}`, 'PREVIEW_INJECTED_FAILURE');
        const timestamp = new Date().toISOString();
        const prefer = (request.headers.prefer ?? '').split(',').map((item) => item.trim());
        const merge = prefer.includes('resolution=merge-duplicates');
        const ignore = prefer.includes('resolution=ignore-duplicates');
        const conflictKeys = (url.searchParams.get('on_conflict') ?? 'id').split(',').map((key) => key.trim());
        if (conflictKeys.some((key) => !/^[a-z_][a-z0-9_]*$/i.test(key))) throw fixtureError(400, 'Invalid conflict columns');
        let nextRows = [...tables[table]];
        let affected = [];
        if (request.method === 'POST') {
          for (const input of inputs) {
            const existing = (merge || ignore) ? nextRows.find((item) => conflictKeys.every((key) => input[key] != null && item[key] === input[key])) : nextRows.find((item) => input.id && item.id === input.id);
            if (existing) {
              if (!ownsRow(table, existing)) throw fixtureError(403, 'Cannot replace another preview owner');
              if (ignore) continue;
              if (!merge) throw fixtureError(409, 'Duplicate preview row', '23505');
              const updated = { ...existing, ...input, updated_at: timestamp };
              nextRows[nextRows.indexOf(existing)] = updated;
              affected.push(updated);
            } else {
              const defaults = table === 'bills' ? { series_id: randomUUID(), is_active: true } : table === 'savings_goals' ? { current_amount: 0 } : {};
              const inserted = { ...row({ ...defaults, ...input }), created_at: timestamp, updated_at: timestamp };
              nextRows.push(inserted);
              affected.push(inserted);
            }
          }
        } else {
          const selected = nextRows.filter((item) => ownsRow(table, item) && matches(item, url.searchParams));
          if (request.method === 'DELETE') {
            nextRows = nextRows.filter((item) => !selected.includes(item));
            affected = selected;
          } else {
            nextRows = nextRows.map((item) => {
              if (!selected.includes(item)) return item;
              const updated = { ...item, ...body, updated_at: timestamp };
              affected.push(updated);
              return updated;
            });
          }
        }
        // Preserve the seeded array identities used by relation lookups. No write
        // is committed until the complete request has passed validation.
        tables[table].splice(0, tables[table].length, ...nextRows);
        controls.mutationCount++;
        Object.assign(mutation, { status: 'succeeded', affectedRows: affected.length, finishedAt: new Date().toISOString() });
        if (!prefer.includes('return=representation')) return send(request.method === 'POST' ? 201 : 204);
        const result = presentRows(table, affected, url.searchParams);
        return send(request.method === 'POST' ? 201 : 200, request.headers.accept?.includes('vnd.pgrst.object') ? result[0] ?? null : result);
      } catch (error) {
        Object.assign(mutation, { status: 'failed', error: error.message, finishedAt: new Date().toISOString() });
        throw error;
      }
    }
    if (request.method !== 'GET') return send(405, { message: 'Unsupported preview method' });
    if (controls.failReadTable === table) return send(503, { message: 'Synthetic persistent read failure' });
    if (controls.failNextReadTable === table) { controls.failNextReadTable = null; return send(503, { message: 'Synthetic read failure' }); }
    let rows = tables[table].filter((item) => ownsRow(table, item) && matches(item, url.searchParams));
    const totalRows = rows.length;
    const orders = (url.searchParams.get('order') ?? '').split(',');
    rows.sort((a, b) => { for (const order of orders) { const [key, direction] = order.split('.'); const diff = String(a[key]).localeCompare(String(b[key])) * (direction === 'desc' ? -1 : 1); if (diff) return diff; } return 0; });
    const offset = Number(url.searchParams.get('offset') ?? 0);
    rows = rows.slice(offset, url.searchParams.has('limit') ? offset + Number(url.searchParams.get('limit')) : undefined);
    rows = presentRows(table, rows, url.searchParams);
    if (request.headers.prefer?.includes('count=exact')) response.setHeader('Content-Range', `${offset}-${Math.max(offset, offset + rows.length - 1)}/${totalRows}`);
    send(200, request.headers.accept?.includes('vnd.pgrst.object') ? rows[0] ?? null : rows);
  } catch (error) {
    if (!error.status) console.error(error);
    send(error.status ?? 500, { message: error.status ? error.message : 'Preview fixture failed', code: error.code ?? 'PREVIEW_ERROR' });
  }
});
let next;
const stop = () => { next?.kill(); backend.close(); process.exit(); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
(async () => {
  backend.listen(backendPort, '127.0.0.1'); await once(backend, 'listening');
  const mode = process.argv.includes('--production') ? 'start' : 'dev';
  next = spawn(process.execPath, [join(dir, 'node_modules/next/dist/bin/next'), mode, ...(mode === 'dev' ? ['--webpack'] : []), '-H', '127.0.0.1', '-p', String(port)], { cwd: dir, windowsHide: true, stdio: 'inherit', env: { ...process.env, NODE_ENV: mode === 'dev' ? 'development' : 'production', NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${backendPort}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'synthetic-local-anon-key', NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${port}` } });
  next.on('exit', (code) => { backend.close(); process.exit(code ?? 0); });
  console.log(`Preview: http://127.0.0.1:${port}/dashboard — preview@example.invalid / preview-password`);
  console.log(`Fixture: ${writable ? 'writable (in memory only)' : 'read only'} — http://127.0.0.1:${backendPort}/__control`);
})();
