/* Browser acceptance for the Expo app's web build against an in-memory fake Supabase.
 *
 * Run from mobile/: npm run test:web-acceptance
 *
 * What it covers: startup routing (no Unmatched Route), protected-route redirects,
 * password sign-in, dashboard totals, session restore after reload, a 1,000 kr.
 * savings bucket contribution (amount grouping, RPC payload, top confirmation,
 * retry with the same request ID after a lost response), JSON account export and
 * bill pay/undo against the database's linked-expense rule and sign-out.
 *
 * What it does NOT prove: iPhone/Expo Go behaviour, SecureStore (web uses
 * AsyncStorage/localStorage), the native date picker, the iOS share sheet or the
 * real Supabase project's RLS/RPC installation. The RPC's SQL is covered separately
 * by `npm run test:database` at the repository root. All data here is synthetic
 * and never leaves this process; no environment file or remote project is read.
 */
const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');

const mobileRoot = path.resolve(__dirname, '..');
const outputDir = path.join(mobileRoot, '.expo', 'web-acceptance');
const apiPort = 54329;
const webPort = 54330;
const apiUrl = `http://127.0.0.1:${apiPort}`;
const webUrl = `http://127.0.0.1:${webPort}`;

function localDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
const today = localDate();
const monthPrefix = today.slice(0, 8);

// ---------------------------------------------------------------- fake backend
const userId = crypto.randomUUID();
const otherUserId = crypto.randomUUID();
const email = 'test.user@example.invalid';
const password = 'synthetic-password-1';
const user = {
  id: userId, aud: 'authenticated', role: 'authenticated', email, created_at: '2026-11-01T10:00:00Z',
  app_metadata: { provider: 'email' }, user_metadata: {},
};
const categoryFood = crypto.randomUUID();
const categoryIncome = crypto.randomUUID();
const db = {
  profiles: [{ id: userId, full_name: 'Test User', currency: 'ISK' }, { id: otherUserId, full_name: 'Other', currency: 'ISK' }],
  categories: [
    { id: categoryFood, user_id: userId, name: 'Matur og heimili', type: 'expense' },
    { id: categoryIncome, user_id: userId, name: 'Laun', type: 'income' },
  ],
  transactions: [
    { id: crypto.randomUUID(), user_id: userId, category_id: categoryIncome, amount: '820000.00', type: 'income', date: `${monthPrefix}01`, note: 'Mánaðarlaun', created_at: '2026-11-01T10:00:00Z' },
    { id: crypto.randomUUID(), user_id: userId, category_id: categoryFood, amount: '12840.00', type: 'expense', date: `${monthPrefix}01`, note: 'Matvöruverslun', created_at: '2026-11-01T11:00:00Z' },
    { id: crypto.randomUUID(), user_id: otherUserId, category_id: null, amount: '999999.00', type: 'income', date: `${monthPrefix}01`, note: 'Other account', created_at: '2026-11-01T11:00:00Z' },
  ],
  budgets: [],
  bills: [{ id: crypto.randomUUID(), user_id: userId, series_id: crypto.randomUUID(), category_id: categoryFood, month: `${monthPrefix}01`, name: 'Rafmagn', amount: '9900.00', due_day: 10, is_active: true }],
  bill_payments: [],
  savings_buckets: [
    { id: crypto.randomUUID(), user_id: userId, bucket_type: 'serignarsparnadur', label: 'Séreignarsparnaður', amount: '400000.00', created_at: '2026-11-01T10:00:00Z' },
    { id: crypto.randomUUID(), user_id: userId, bucket_type: 'husnaedisparnadur', label: 'Húsnæðissparnaður', amount: '300000.00', created_at: '2026-11-01T10:00:01Z' },
    { id: crypto.randomUUID(), user_id: userId, bucket_type: 'hlutabref', label: 'Hlutabréf', amount: '0.00', created_at: '2026-11-01T10:00:02Z' },
    { id: crypto.randomUUID(), user_id: userId, bucket_type: 'sjodir', label: 'Sjóðir', amount: '20000.00', created_at: '2026-11-01T10:00:03Z' },
  ],
  savings_bucket_entries: [], savings_goals: [], savings_contributions: [],
};
const sessions = new Map();
const rpcCalls = [];
let dropNextRpcResponse = false;

function token() {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const jwt = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: userId, email, role: 'authenticated', aud: 'authenticated', exp })}.${crypto.randomBytes(16).toString('base64url')}`;
  const refresh = crypto.randomBytes(16).toString('hex');
  sessions.set(jwt, true);
  sessions.set(`refresh:${refresh}`, true);
  return { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: refresh, user };
}
function authorized(request) {
  const header = request.headers.authorization ?? '';
  return sessions.has(header.replace(/^Bearer /, ''));
}
function send(response, status, body, headers = {}) {
  response.writeHead(status, { 'content-type': 'application/json', ...headers });
  response.end(body === undefined ? '' : JSON.stringify(body));
}
function readBody(request) {
  return new Promise((resolve) => {
    let text = '';
    request.on('data', (chunk) => { text += chunk; });
    request.on('end', () => resolve(text ? JSON.parse(text) : null));
  });
}
function applyFilters(rows, params) {
  const reserved = new Set(['select', 'order', 'offset', 'limit', 'on_conflict', 'columns']);
  let result = rows;
  for (const [key, raw] of params) {
    if (reserved.has(key)) continue;
    const [op, ...rest] = raw.split('.');
    const value = rest.join('.');
    const compare = (row) => {
      const field = row[key] == null ? null : String(row[key]);
      if (op === 'eq') return field === value;
      if (op === 'gte') return field >= value;
      if (op === 'gt') return field > value;
      if (op === 'lt') return field < value;
      if (op === 'lte') return field <= value;
      if (op === 'is') return value === 'null' ? field === null : true;
      throw new Error(`Unsupported filter ${key}=${raw}`);
    };
    result = result.filter(compare);
  }
  return result;
}
function project(table, rows, select) {
  if (table !== 'transactions' || !select?.includes('categories(')) return rows;
  return rows.map((row) => {
    const category = db.categories.find((item) => item.id === row.category_id);
    return { ...row, categories: category ? { id: category.id, name: category.name, type: category.type } : null };
  });
}
// Mirrors add_savings_bucket_contribution's contract (see supabase/savings-contribution-integrity-update.sql):
// one request ID records once; a replay returns already_recorded instead of adding again.
function contribute(body) {
  const existing = db.savings_bucket_entries.find((entry) => entry.id === body.p_request_id);
  const bucket = db.savings_buckets.find((row) => row.user_id === userId && row.bucket_type === body.p_bucket_type);
  if (existing) {
    if (Number(existing.amount) !== Number(body.p_amount) || existing.date !== body.p_date) return { status: 409, body: { code: '22023', message: 'request reused with different payload' } };
    return { status: 200, body: [{ entry_id: existing.id, balance: Number(bucket.amount), already_recorded: true }] };
  }
  db.savings_bucket_entries.push({ id: body.p_request_id, user_id: userId, bucket_type: body.p_bucket_type, label: body.p_label, amount: Number(body.p_amount).toFixed(2), date: body.p_date, note: body.p_note ?? null });
  bucket.amount = (Number(bucket.amount) + Number(body.p_amount)).toFixed(2);
  return { status: 200, body: [{ entry_id: body.p_request_id, balance: Number(bucket.amount), already_recorded: false }] };
}

const api = http.createServer(async (request, response) => {
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-expose-headers': 'content-range',
  };
  for (const [key, value] of Object.entries(cors)) response.setHeader(key, value);
  if (request.method === 'OPTIONS') return send(response, 204);
  const url = new URL(request.url, apiUrl);
  const body = await readBody(request);

  if (url.pathname === '/auth/v1/token') {
    const grant = url.searchParams.get('grant_type');
    if (grant === 'password') {
      if (body?.email !== email || body?.password !== password) return send(response, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials', code: 'invalid_credentials' });
      return send(response, 200, token());
    }
    if (grant === 'refresh_token' && sessions.has(`refresh:${body?.refresh_token}`)) return send(response, 200, token());
    return send(response, 400, { error: 'invalid_grant', code: 'refresh_token_not_found' });
  }
  if (url.pathname === '/auth/v1/user') {
    if (!authorized(request)) return send(response, 401, { code: 'bad_jwt', message: 'invalid JWT' });
    if (request.method === 'PUT' && body?.data) user.user_metadata = { ...user.user_metadata, ...body.data };
    return send(response, 200, user);
  }
  if (url.pathname === '/auth/v1/logout') {
    sessions.delete((request.headers.authorization ?? '').replace(/^Bearer /, ''));
    return send(response, 204);
  }
  if (!url.pathname.startsWith('/rest/v1/')) return send(response, 404, { message: 'not found' });
  if (!authorized(request)) return send(response, 401, { code: 'PGRST301', message: 'JWT required' });

  if (url.pathname === '/rest/v1/rpc/add_savings_bucket_contribution') {
    rpcCalls.push(body);
    const result = contribute(body);
    if (dropNextRpcResponse) { dropNextRpcResponse = false; return send(response, 503, { message: 'synthetic lost response after commit' }); }
    return send(response, result.status, result.body);
  }

  const table = url.pathname.slice('/rest/v1/'.length);
  if (!(table in db)) return send(response, 404, { code: '42P01', message: `relation ${table} does not exist` });
  // RLS stand-in: an authenticated request only ever sees the signed-in account.
  const owned = db[table].filter((row) => (table === 'profiles' ? row.id : row.user_id) === userId);
  const single = (request.headers.accept ?? '').includes('vnd.pgrst.object');

  if (request.method === 'GET') {
    let rows = applyFilters(owned, url.searchParams);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const limit = url.searchParams.has('limit') ? Number(url.searchParams.get('limit')) : rows.length;
    rows = project(table, rows.slice(offset, offset + limit), url.searchParams.get('select'));
    if (single) return rows.length === 1 ? send(response, 200, rows[0]) : send(response, 406, { code: 'PGRST116', message: 'not one row' });
    return send(response, 200, rows, { 'content-range': `${offset}-${offset + rows.length - 1}/*` });
  }
  if (request.method === 'PATCH') {
    const rows = applyFilters(owned, url.searchParams);
    rows.forEach((row) => Object.assign(row, body));
    return single ? (rows.length === 1 ? send(response, 200, rows[0]) : send(response, 406, { code: 'PGRST116' })) : send(response, 200, rows);
  }
  if (request.method === 'DELETE') {
    const rows = new Set(applyFilters(owned, url.searchParams));
    // Mirrors protect_linked_bill_expense: a linked expense cannot be deleted before its payment.
    if (table === 'transactions' && db.bill_payments.some((payment) => [...rows].some((row) => row.id === payment.transaction_id))) {
      return send(response, 400, { code: 'P0001', message: 'Unlink the bill payment before deleting this expense.' });
    }
    db[table] = db[table].filter((row) => !rows.has(row));
    return send(response, 204);
  }
  if (request.method === 'POST') {
    const items = (Array.isArray(body) ? body : [body]).map((item) => ({ id: crypto.randomUUID(), ...item, user_id: userId }));
    db[table].push(...items);
    return send(response, 201, items);
  }
  return send(response, 405, { message: 'method not allowed' });
});

// ---------------------------------------------------------------- static web build
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.ico': 'image/x-icon' };
const web = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, webUrl).pathname);
  let file = path.join(outputDir, pathname);
  if (!file.startsWith(outputDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(outputDir, 'index.html');
  response.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(response);
});

// ---------------------------------------------------------------- scenario
let checks = 0;
async function check(name, run) {
  await run();
  console.log(`ok ${++checks} - ${name}`);
}

async function main() {
  console.log('# exporting web build against the fake backend');
  const exported = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', outputDir, '--clear'], {
    cwd: mobileRoot, encoding: 'utf8',
    env: { ...process.env, EXPO_PUBLIC_SUPABASE_URL: apiUrl, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'synthetic-publishable-key', EXPO_PUBLIC_STARTUP_DIAGNOSTIC: '0', CI: '1' },
  });
  if (exported.status !== 0) throw new Error(`expo export failed:\n${exported.stdout}\n${exported.stderr}`);

  await new Promise((resolve) => api.listen(apiPort, '127.0.0.1', resolve));
  await new Promise((resolve) => web.listen(webPort, '127.0.0.1', resolve));
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'is-IS', acceptDownloads: true });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const bodyText = () => page.locator('body').innerText();

  try {
    await check('signed-out startup lands on sign-in, not Unmatched Route', async () => {
      await page.goto(webUrl);
      await page.getByText('Velkomin aftur').waitFor({ timeout: 20000 });
      assert.match(new URL(page.url()).pathname, /\/sign-in$/);
      assert.doesNotMatch(await bodyText(), /Unmatched Route/i);
    });

    await check('signed-out deep link to a private tab redirects to sign-in', async () => {
      await page.goto(`${webUrl}/savings`);
      await page.getByText('Velkomin aftur').waitFor({ timeout: 20000 });
      assert.match(new URL(page.url()).pathname, /\/sign-in$/);
    });

    await check('wrong password shows an Icelandic error and stays signed out', async () => {
      await page.locator('input[type="email"], input[autocomplete="email"]').first().fill(email);
      await page.locator('input[type="password"]').first().fill('wrong-password');
      await page.getByRole('button', { name: 'Innskráning' }).click();
      await page.getByRole('alert').first().waitFor({ timeout: 10000 });
      assert.match(new URL(page.url()).pathname, /\/sign-in$/);
    });

    await check('sign-in opens the dashboard with this account\'s totals only', async () => {
      await page.locator('input[type="password"]').first().fill(password);
      await page.getByRole('button', { name: 'Innskráning' }).click();
      await page.getByText('Fjármálin í dag').waitFor({ timeout: 20000 });
      await page.getByText('820.000 kr.').first().waitFor({ timeout: 20000 });
      const text = await bodyText();
      assert.match(text, /12\.840 kr\./);
      assert.match(text, /720\.000 kr\./, 'total savings across the four buckets');
      assert.doesNotMatch(text, /999\.999/);
    });

    await check('reload restores the session (web analogue of a cold restart)', async () => {
      await page.reload();
      await page.getByText('Fjármálin í dag').waitFor({ timeout: 20000 });
      assert.doesNotMatch(await bodyText(), /Velkomin aftur/);
    });

    let requestId;
    await check('1,000 kr. bucket contribution: grouping, RPC payload, top confirmation', async () => {
      await page.getByRole('tab', { name: /Sparnaður/ }).click();
      await page.getByText('Sparnaðarflokkar').waitFor({ timeout: 20000 });
      await page.getByText('Sjóðir', { exact: true }).first().click();
      const amount = page.getByLabel('Framlag (kr.)');
      await amount.waitFor({ timeout: 10000 });
      await amount.pressSequentially('1000');
      assert.equal(await amount.inputValue(), '1.000');
      assert.equal(await page.getByLabel('Dagsetning').inputValue(), today);
      await page.getByRole('button', { name: 'Skrá framlag' }).last().click();
      const confirmation = page.getByRole('alert').filter({ hasText: 'Framlagið var skráð.' });
      await confirmation.waitFor({ timeout: 10000 });
      const box = await confirmation.boundingBox();
      assert.ok(box && box.y < 120, `confirmation should be at the top, was at y=${box?.y}`);
      assert.equal(rpcCalls.length, 1);
      const call = rpcCalls[0];
      requestId = call.p_request_id;
      assert.equal(call.p_bucket_type, 'sjodir');
      assert.equal(call.p_amount, 1000);
      assert.equal(call.p_date, today);
      assert.match(call.p_request_id, /^[0-9a-f-]{36}$/);
      assert.equal(db.savings_buckets.find((row) => row.bucket_type === 'sjodir').amount, '21000.00');
      await page.getByText('721.000 kr.').first().waitFor({ timeout: 10000 });
      await page.getByRole('button', { name: 'Loka staðfestingu' }).click();
      await confirmation.waitFor({ state: 'detached', timeout: 5000 });
    });

    await check('retry after a lost response reuses the request ID and counts the money once', async () => {
      await page.getByText('Sjóðir', { exact: true }).first().click();
      const amount = page.getByLabel('Framlag (kr.)');
      await amount.waitFor({ timeout: 10000 });
      await amount.pressSequentially('2500');
      dropNextRpcResponse = true;
      await page.getByRole('button', { name: 'Skrá framlag' }).last().click();
      await page.getByText('Ekki tókst að vista breytinguna. Athugaðu tenginguna og reyndu aftur.').waitFor({ timeout: 10000 });
      assert.equal(rpcCalls.length, 2);
      assert.equal(await page.getByRole('alert').filter({ hasText: 'Framlagið var skráð.' }).count(), 0, 'no success message after a failed response');
      assert.equal(await amount.inputValue(), '2.500', 'the form keeps the entered amount for a retry');
      await page.getByRole('button', { name: 'Skrá framlag' }).last().click();
      await page.getByRole('alert').filter({ hasText: 'Framlagið var skráð.' }).waitFor({ timeout: 10000 });
      assert.equal(rpcCalls.length, 3);
      assert.equal(rpcCalls[1].p_request_id, rpcCalls[2].p_request_id);
      assert.notEqual(rpcCalls[1].p_request_id, requestId, 'a new contribution form gets a new request ID');
      assert.equal(db.savings_bucket_entries.length, 2);
      assert.equal(db.savings_buckets.find((row) => row.bucket_type === 'sjodir').amount, '23500.00');
    });

    await check('bill pay creates one linked expense and undo removes both (database delete rule enforced)', async () => {
      await page.getByRole('tab', { name: /Reikningar/ }).click();
      await page.getByLabel(/^Rafmagn, 9\.900 kr\., ógreitt/).click();
      await page.getByRole('button', { name: 'Skrá sem greitt' }).click();
      await page.getByRole('button', { name: 'Skrá greiðslu' }).click();
      const paid = page.getByRole('alert').filter({ hasText: 'Greiðslan var skráð.' });
      await paid.waitFor({ timeout: 10000 });
      assert.equal(db.bill_payments.length, 1);
      const expense = db.transactions.find((row) => row.id === db.bill_payments[0].transaction_id);
      assert.equal(expense?.note, 'Rafmagn');
      assert.equal(Number(expense?.amount), 9900);
      assert.equal(expense?.date, `${monthPrefix}10`);
      await page.getByRole('button', { name: 'Loka staðfestingu' }).click();
      await page.getByLabel(/^Rafmagn, 9\.900 kr\., greitt/).click();
      await page.getByRole('button', { name: 'Afturkalla greiðslu' }).click();
      await page.getByRole('button', { name: 'Afturkalla greiðslu' }).last().click();
      await page.getByRole('alert').filter({ hasText: 'Greiðslan var afturkölluð.' }).waitFor({ timeout: 10000 });
      assert.equal(db.bill_payments.length, 0);
      assert.equal(db.transactions.some((row) => row.note === 'Rafmagn'), false);
      await page.getByLabel(/^Rafmagn, 9\.900 kr\., ógreitt/).waitFor({ timeout: 10000 });
      await page.getByRole('button', { name: 'Loka staðfestingu' }).click();
    });

    await check('JSON export contains all ten owned tables and the contribution', async () => {
      await page.getByRole('tab', { name: /Meira/ }).click();
      const button = page.getByRole('button', { name: 'Sækja gögnin mín' });
      await button.waitFor({ timeout: 20000 });
      const [download] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), button.click()]);
      assert.equal(download.suggestedFilename(), 'min-fjarmal-gogn.json');
      const exportedData = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
      assert.equal(exportedData.version, 1);
      assert.equal(exportedData.account.id, userId);
      assert.deepEqual(Object.keys(exportedData.data).sort(), ['bill_payments', 'bills', 'budgets', 'categories', 'profiles', 'savings_bucket_entries', 'savings_buckets', 'savings_contributions', 'savings_goals', 'transactions']);
      assert.equal(exportedData.data.savings_bucket_entries.length, 2);
      assert.ok(exportedData.data.transactions.every((row) => row.user_id === userId));
      assert.ok(exportedData.account.savings_preferences, 'savings preferences are exported');
    });

    await check('sign-out returns to sign-in and stays signed out after reload', async () => {
      await page.getByRole('button', { name: 'Skrá út' }).first().click();
      await page.getByRole('button', { name: 'Skrá út' }).last().click();
      await page.getByText('Velkomin aftur').waitFor({ timeout: 20000 });
      await page.reload();
      await page.getByText('Velkomin aftur').waitFor({ timeout: 20000 });
    });

    assert.deepEqual(pageErrors, [], 'no uncaught page errors');
  } catch (error) {
    await page.screenshot({ path: path.join(mobileRoot, '.expo', 'web-acceptance-failure.png'), fullPage: true }).catch(() => {});
    console.error(`# failure screenshot: ${path.join('.expo', 'web-acceptance-failure.png')}`);
    throw error;
  } finally {
    await browser.close();
    api.close();
    web.close();
  }
  console.log(`# ${checks} web acceptance checks passed against a synthetic in-memory backend.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
  api.close();
  web.close();
});
