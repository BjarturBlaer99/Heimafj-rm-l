const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { writeFile } = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const { join, resolve } = require('node:path');

// Run against an isolated production build made with a synthetic service URL:
// NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:5193
// NEXT_PUBLIC_SUPABASE_ANON_KEY=synthetic-local-anon-key
// node scripts/import-browser.test.cjs --build-dir=/path/to/build
// Optional: --port=5191 --backend-port=5193 --keep-open
// --keep-open retains only this test's Next process and in-memory backend after
// success for visual QA. Ctrl+C shuts down both. No real account/data is used.
let playwright;
try {
  playwright = require('playwright');
} catch (error) {
  if (!process.env.PLAYWRIGHT_MODULE) {
    throw new Error('Set PLAYWRIGHT_MODULE to an installed Playwright module.', { cause: error });
  }
  playwright = require(process.env.PLAYWRIGHT_MODULE);
}
const argument = (name, fallback) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const buildDir = resolve(argument('build-dir', join(__dirname, '..')));
const port = Number(argument('port', '5191'));
const backendPort = Number(argument('backend-port', '5193'));
assert(Number.isInteger(port) && port > 1024 && port < 65536);
assert(Number.isInteger(backendPort) && backendPort > 1024 && backendPort < 65536 && port !== backendPort);
const site = `http://127.0.0.1:${port}`;
const backendUrl = `http://127.0.0.1:${backendPort}`;
const keepOpen = process.argv.includes('--keep-open');
const output = (name) => join(buildDir, '.next', `import-browser-${name}`);
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const month = new Date().toISOString().slice(0, 7);
const date = (day) => `${month}-${String(day).padStart(2, '0')}`;
const user = {
  id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated',
  email: 'synthetic-import@example.invalid', email_confirmed_at: '2026-01-01T00:00:00Z',
  app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { full_name: 'Prófun innflutnings' },
  identities: [], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z'
};
const now = Math.floor(Date.now() / 1000);
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, aud: 'authenticated', role: 'authenticated', email: user.email, iat: now, exp: now + 28800 })}.dGVzdA`;
const session = { access_token: token, refresh_token: 'synthetic-import-refresh', token_type: 'bearer', expires_in: 28800, expires_at: now + 28800, user };
const categories = [
  ['Áskriftir', 'expense'], ['Reikningar', 'expense'], ['Laun', 'income'],
  ['Matur', 'expense'], ['Samgöngur', 'expense'], ['Annað', 'expense']
].map(([name, type]) => ({ id: randomUUID(), user_id: user.id, name, type, is_default: true }));
const category = (name) => categories.find((row) => row.name === name);
const transactionRows = [{ id: randomUUID(), user_id: user.id, date: date(3), type: 'expense', amount: 500, note: 'SYNTHETIC_EXISTING', category_id: category('Matur').id }];
const sampleCsv = [
  'Dagsetning;Lýsing;Tegund;Upphæð',
  `${date(1)};Bónus SYNTHETIC_GROCERY;Grocery Stores, Supermarkets;-1.234,50`,
  `${date(2)};Netflix SYNTHETIC_SUBSCRIPTION;;-1990`,
  `${date(3)};SYNTHETIC_EXISTING;;-500`,
  `${date(1)};Bónus SYNTHETIC_GROCERY;Grocery Stores, Supermarkets;-1.234,50`,
  `${date(4)};SYNTHETIC_CREDIT;;620000`,
  'not-a-date;SYNTHETIC_INVALID_DATE;;-100',
  `${date(5)};SYNTHETIC_ZERO;;0`
].join('\n');

let server;
let nextProcess;
let browser;
let page;
let nextLogs = '';
let insertAttempts = 0;
let failNextInsert = false;
let releaseInsert;
let insertStarted;
let backendFailure;
let watchdog;
let succeeded = false;
const browserErrors = [];
const checks = [];
const pass = (message) => { checks.push(message); console.log(`CHECK ${message}: passed`); };
const readJson = async (request) => { let body = ''; for await (const chunk of request) body += chunk; return body ? JSON.parse(body) : {}; };

function matches(row, params) {
  for (const [key, raw] of params) {
    if (['select', 'order', 'limit', 'offset'].includes(key)) continue;
    const operation = raw.slice(0, raw.indexOf('.'));
    const value = raw.slice(raw.indexOf('.') + 1);
    if (operation === 'eq' && String(row[key]) !== value) return false;
    if (operation === 'gte' && !(row[key] >= value)) return false;
    if (operation === 'lte' && !(row[key] <= value)) return false;
    if (operation === 'ilike' && !String(row[key] ?? '').toLowerCase().includes(value.replaceAll('%', '').toLowerCase())) return false;
  }
  return true;
}

async function startFixture() {
  server = http.createServer(async (request, response) => {
    const respond = (status, data) => {
      response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(data === undefined ? undefined : JSON.stringify(data));
    };
    try {
      const url = new URL(request.url, backendUrl);
      if (url.pathname === '/auth/v1/token' && request.method === 'POST') {
        const data = await readJson(request);
        if ((data.email === user.email && data.password === 'synthetic-test-password') || data.refresh_token === session.refresh_token) return respond(200, session);
        return respond(400, { error_code: 'invalid_credentials', msg: 'Synthetic login rejected' });
      }
      if (request.headers.authorization !== `Bearer ${token}`) return respond(401, { code: 'bad_jwt', message: 'Synthetic session required' });
      if (url.pathname === '/auth/v1/user') return respond(200, user);
      if (url.pathname === '/auth/v1/logout' && request.method === 'POST') return respond(204);
      if (!url.pathname.startsWith('/rest/v1/')) return respond(404, {});
      const table = url.pathname.slice('/rest/v1/'.length);
      if (table === 'transactions' && request.method === 'POST') {
        insertAttempts += 1;
        const body = await readJson(request);
        const rows = Array.isArray(body) ? body : [body];
        rows.forEach((row) => assert.equal(row.user_id, user.id));
        const shouldFail = failNextInsert;
        failNextInsert = false;
        if (insertStarted) {
          const pending = new Promise((done) => { releaseInsert = done; });
          insertStarted();
          insertStarted = undefined;
          await pending;
        }
        if (shouldFail) return respond(500, { message: 'Synthetic import failure', code: 'TEST_FAILURE' });
        transactionRows.push(...rows.map((row) => ({ ...row, id: randomUUID() })));
        return respond(201, rows);
      }
      if (request.method !== 'GET') return respond(405, { message: 'Outside bounded importer fixture' });
      let rows = table === 'categories' ? categories : table === 'transactions' ? transactionRows : table === 'profiles' ? [{ id: user.id, full_name: user.user_metadata.full_name, currency: 'ISK' }] : [];
      rows = rows.filter((row) => matches(row, url.searchParams));
      const [order, direction] = (url.searchParams.get('order') ?? '').split('.');
      if (order) rows.sort((left, right) => String(left[order]).localeCompare(String(right[order])) * (direction === 'desc' ? -1 : 1));
      if (url.searchParams.has('limit')) rows = rows.slice(0, Number(url.searchParams.get('limit')));
      if (table === 'transactions' && url.searchParams.get('select')?.includes('categories')) rows = rows.map((row) => ({ ...row, categories: categories.find((item) => item.id === row.category_id) ?? null }));
      return respond(200, request.headers.accept?.includes('vnd.pgrst.object') ? rows[0] ?? null : rows);
    } catch (error) {
      backendFailure = error;
      return respond(500, { message: 'Synthetic fixture assertion failed' });
    }
  });
  server.listen(backendPort, '127.0.0.1');
  await once(server, 'listening');
  nextProcess = spawn(process.execPath, [join(buildDir, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)], {
    cwd: buildDir, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production', VERCEL_ENV: 'preview', NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: backendUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'synthetic-local-anon-key', NEXT_PUBLIC_SITE_URL: site }
  });
  nextProcess.stdout.on('data', (chunk) => { nextLogs += chunk; });
  nextProcess.stderr.on('data', (chunk) => { nextLogs += chunk; });
  nextProcess.on('error', (error) => { backendFailure = error; });
  const deadline = Date.now() + 30000;
  while (true) {
    if (backendFailure) throw backendFailure;
    assert(Date.now() < deadline && nextProcess.exitCode === null, `Next startup failed: ${nextLogs}`);
    try { await fetch(`${site}/favicon.ico`, { signal: AbortSignal.timeout(1000) }); break; } catch {}
    await sleep(100);
  }
}

// Small valid stored ZIP workbook: no dependency downloads or real bank file.
function syntheticWorkbook() {
  const xmlEscape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const sheet = (rows) => `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((row, index) => `<row r="${index + 1}">${row.map((value, column) => `<c r="${String.fromCharCode(65 + column)}${index + 1}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;
  const entries = [
    ['[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
    ['_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Synthetic" sheetId="1" r:id="rId1"/><sheet name="Ignored" sheetId="2" r:id="rId2"/></sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/><Relationship Id="rId2" Target="worksheets/sheet2.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/></Relationships>'],
    ['xl/worksheets/sheet1.xml', sheet([['Dagsetning', 'Lýsing', 'Upphæð'], [date(7), 'N1 SYNTHETIC_XLSX', '-3210']])],
    ['xl/worksheets/sheet2.xml', sheet([['Dagsetning', 'Lýsing', 'Upphæð'], [date(8), 'SYNTHETIC_SECOND_SHEET', '-8888']])]
  ];
  const files = [];
  const directory = [];
  let offset = 0;
  for (const [name, text] of entries) {
    const fileName = Buffer.from(name);
    const bytes = Buffer.from(text);
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(bytes.length, 18); local.writeUInt32LE(bytes.length, 22); local.writeUInt16LE(fileName.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(bytes.length, 20); central.writeUInt32LE(bytes.length, 24); central.writeUInt16LE(fileName.length, 28); central.writeUInt32LE(offset, 42);
    files.push(local, fileName, bytes); directory.push(central, fileName);
    offset += local.length + fileName.length + bytes.length;
  }
  const central = Buffer.concat(directory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(central.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...files, central, end]);
}

async function run() {
  await startFixture();
  await writeFile(output('sample.csv'), sampleCsv);
  browser = await playwright.chromium.launch({ headless: true, ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: site }]);
  page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await page.route((url) => url.hostname !== '127.0.0.1', (route) => route.abort());
  const importer = page.getByRole('region', { name: 'Innflutningur færslna', exact: true });
  const upload = async (name, contents, mimeType = 'text/csv') => {
    await importer.getByLabel('Velja bankaskrá', { exact: true }).setInputFiles({ name, mimeType, buffer: Buffer.isBuffer(contents) ? contents : Buffer.from(contents) });
  };
  const review = async () => importer.getByRole('heading', { name: 'Yfirfara færslur', exact: true }).waitFor();
  const preview = () => importer.getByRole('table', { name: 'Færslur til innflutnings', exact: true });
  const importButton = (count) => importer.getByRole('button', { name: `Flytja inn ${count.toLocaleString('is-IS')} ${count === 1 ? 'færslu' : 'færslur'}`, exact: true });
  const reset = async () => { await importer.getByRole('button', { name: 'Breyta skrá', exact: true }).click(); await importer.getByRole('button', { name: 'Velja skrá', exact: true }).waitFor(); };
  const columns = async () => { await importer.getByText('Dálkar og flokkun', { exact: true }).click(); };
  const expectCount = async (count) => { await importButton(count).waitFor(); assert.equal(await importButton(count).isEnabled(), count > 0); };

  await page.goto(`${site}/transactions`);
  await importer.getByRole('button', { name: 'Velja skrá', exact: true }).waitFor();
  assert.equal(await importer.getByRole('button', { name: /^Flytja inn/ }).count(), 0, 'Initial state must not offer sample imports');
  assert.equal(await importer.getByRole('table').count(), 0);
  assert.equal(insertAttempts, 0);
  pass('empty initial upload state without importable examples');

  await upload('synthetic-card.csv', sampleCsv);
  await review();
  await expectCount(4);
  assert.equal(await preview().locator('tbody tr').count(), 4);
  assert.equal(await preview().getByText('SYNTHETIC_CREDIT', { exact: true }).count(), 0);
  assert.equal(await preview().getByText('SYNTHETIC_INVALID_DATE', { exact: true }).count(), 0);
  assert.equal(await preview().getByText('SYNTHETIC_ZERO', { exact: true }).count(), 0);
  assert.match(await preview().locator('tbody tr').first().innerText(), /Matur/);
  assert.match(await preview().locator('tbody tr').nth(1).innerText(), /Áskriftir/);
  await columns();
  await importer.getByRole('combobox', { name: 'Flokkur færslna', exact: true }).selectOption(category('Reikningar').id);
  assert.equal(await preview().getByRole('cell', { name: 'Reikningar', exact: true }).count(), 4);
  await importer.getByRole('combobox', { name: 'Flokkur færslna', exact: true }).selectOption('');
  assert.match(await preview().locator('tbody tr').first().innerText(), /Matur/);
  pass('CSV expense filtering, Icelandic amount, automatic categories and override');

  await reset();
  await importer.getByRole('button', { name: 'Líma CSV texta', exact: true }).click();
  await page.waitForFunction(() => document.activeElement?.tagName === 'TEXTAREA' && document.activeElement.closest('#import-transactions'));
  await importer.getByRole('button', { name: 'Velja skrá í staðinn', exact: true }).press('Enter');
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Skráarval');
  await importer.getByRole('button', { name: 'Líma CSV texta', exact: true }).press('Enter');
  await page.waitForFunction(() => document.activeElement?.tagName === 'TEXTAREA' && document.activeElement.closest('#import-transactions'));
  await importer.getByLabel('CSV texti', { exact: true }).fill(`D;N;A\n${date(6)};N1 SYNTHETIC_MANUAL;-2468`);
  assert.equal(insertAttempts, 0, 'Pasting must not save data');
  await importer.getByRole('button', { name: 'Forskoða færslur', exact: true }).click();
  await review();
  await columns();
  await importer.getByRole('combobox', { name: 'Dagsetning', exact: true }).selectOption('D');
  await importer.getByRole('combobox', { name: 'Mótaðili eða lýsing', exact: true }).selectOption('N');
  await importer.getByRole('combobox', { name: 'Upphæð í einum dálki', exact: true }).selectOption('A');
  await expectCount(1);
  assert.match(await preview().innerText(), /SYNTHETIC_MANUAL/);
  pass('paste mode transfers keyboard focus; CSV is explicitly reviewed and custom columns can be mapped');

  await reset();
  await upload('synthetic-debit.csv', `Date;Description;Debit;Credit\n${date(6)};N1 SYNTHETIC_DEBIT;2468;\n${date(7)};SYNTHETIC_DEPOSIT;;5000`);
  await review();
  await expectCount(1);
  assert.match(await preview().innerText(), /SYNTHETIC_DEBIT/);
  assert.equal(await preview().getByText('SYNTHETIC_DEPOSIT', { exact: true }).count(), 0);
  pass('new source resets manual mapping; debit/credit fallback excludes deposits');

  await reset();
  await upload('synthetic-invalid.xlsx', 'This is deliberately not a workbook.', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  await importer.getByRole('alert').first().waitFor();
  assert.equal(await importer.getByRole('table').count(), 0, 'Failed new source must not retain old preview rows');
  assert.equal(await importer.getByRole('button', { name: /^Flytja inn/ }).filter({ visible: true }).count(), 0);
  assert.equal(insertAttempts, 0);
  await upload('synthetic-valid.xlsx', syntheticWorkbook(), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  await review();
  await expectCount(1);
  assert.match(await preview().innerText(), /SYNTHETIC_XLSX/);
  assert.equal(await preview().getByText('SYNTHETIC_SECOND_SHEET', { exact: true }).count(), 0);
  assert.equal(await importer.getByRole('alert').count(), 0, 'Successful replacement clears read errors');
  pass('failed replacement clears stale rows; valid XLSX first worksheet recovers');

  await reset();
  const largeCsv = ['Date;Description;Amount', ...Array.from({ length: 1001 }, (_, index) => `${date(9)};SYNTHETIC_LIMIT_${index};-100`)].join('\n');
  await upload('synthetic-limit.csv', largeCsv);
  await review();
  await expectCount(1000);
  assert.equal(await preview().locator('tbody tr').count(), 25, 'Only the first 25 rows should be rendered');
  const limitCopy = (await importer.innerText()).replace(/[.\s\u00a0]/g, '');
  assert(limitCopy.includes('1001') && limitCopy.includes('1000') && limitCopy.includes('25'), 'Limit and shown-count disclosure must be visible');
  assert.equal(insertAttempts, 0);
  pass('1000-row import cap and 25-row preview are disclosed without saving');

  await reset();
  await upload('synthetic-card.csv', sampleCsv);
  await review();
  await expectCount(4);
  await page.screenshot({ path: output('desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await importer.scrollIntoViewIfNeeded();
  assert(await importButton(4).isVisible(), 'Mobile confirmation remains available');
  const bounds = await importer.boundingBox();
  assert(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 391, 'Importer must fit a narrow viewport');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Mobile page must not overflow horizontally');
  await page.screenshot({ path: output('mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  pass('desktop and mobile review layouts fit their viewports');

  failNextInsert = true;
  const posted = new Promise((done) => { insertStarted = done; });
  await importButton(4).click();
  await posted;
  const pendingButton = importer.getByRole('button', { name: 'Flyt inn færslur…', exact: true });
  await pendingButton.waitFor();
  assert(await pendingButton.isDisabled());
  assert(await importer.getByRole('button', { name: 'Breyta skrá', exact: true }).isDisabled());
  assert.equal(await importer.locator('input:enabled, textarea:enabled, select:enabled').count(), 0, 'Source and mappings must not change during submit');
  assert.equal(insertAttempts, 1);
  releaseInsert();
  releaseInsert = undefined;
  await importer.getByRole('alert').first().waitFor();
  await expectCount(4);
  assert.equal(transactionRows.length, 1, 'Injected failed insert must leave fixture data intact');
  await importButton(4).click();
  await page.locator('[data-feedback-tone="success"]').getByText(
    'Nýjar færslur voru fluttar inn og tvíteknum færslum sleppt. (2 fluttar inn, 2 sleppt)',
    { exact: true }
  ).waitFor({ state: 'visible' });
  assert.equal(new URL(page.url()).pathname, '/transactions');
  assert.equal(new URL(page.url()).searchParams.get('month'), month);
  assert.equal(insertAttempts, 2, 'One failed and one successful submission only');
  assert.equal(transactionRows.length, 3);
  const grocery = transactionRows.find((row) => row.note === 'Bónus SYNTHETIC_GROCERY');
  assert.equal(grocery.amount, 1234.5);
  assert.equal(grocery.category_id, category('Matur').id);
  assert.equal(transactionRows.find((row) => row.note === 'Netflix SYNTHETIC_SUBSCRIPTION').category_id, category('Áskriftir').id);
  assert(transactionRows.every((row) => row.type === 'expense' && row.user_id === user.id));
  await page.getByText('Bónus SYNTHETIC_GROCERY', { exact: true }).filter({ visible: true }).first().waitFor();
  pass('pending controls lock; failure is retryable; actual server action saves exact unique rows');

  await upload('synthetic-card.csv', sampleCsv);
  await review();
  await expectCount(4);
  await importButton(4).click();
  await page.locator('[data-feedback-tone="success"]').getByText(
    'Engar nýjar færslur fundust. Tvíteknum færslum var sleppt. (0 fluttar inn, 4 sleppt)',
    { exact: true }
  ).waitFor({ state: 'visible' });
  assert.equal(new URL(page.url()).pathname, '/transactions');
  assert.equal(new URL(page.url()).searchParams.get('month'), month);
  assert.equal(insertAttempts, 2, 'Repeated file must not produce another insert');
  assert.equal(transactionRows.length, 3);
  assert.equal(browserErrors.length, 0, `Browser errors: ${browserErrors.join('; ')}`);
  if (backendFailure) throw backendFailure;
  pass('repeat file skips persisted duplicates and displays successful return state');
  await writeFile(output('results.json'), JSON.stringify({ synthetic: true, checks, insertAttempts, persistedRows: transactionRows.length, browserErrors }, null, 2));
  console.log(`Results: ${output('results.json')}`);
  succeeded = true;
}

async function cleanup() {
  releaseInsert?.();
  const deadline = setTimeout(() => {
    if (nextProcess && nextProcess.exitCode === null) nextProcess.kill();
    server?.closeAllConnections();
    process.exit(process.exitCode || 1);
  }, 5000);
  deadline.unref();
  try { if (browser) await browser.close(); } finally {
    if (nextProcess && nextProcess.exitCode === null) nextProcess.kill();
    if (server?.listening) { server.closeAllConnections(); await new Promise((done) => server.close(done)); }
    clearTimeout(deadline);
  }
}

Promise.race([
  run(),
  new Promise((_, reject) => { watchdog = setTimeout(() => reject(new Error('Synthetic importer suite exceeded 90 seconds')), 90000); })
]).catch(async (error) => {
  process.exitCode = 1;
  console.error(error);
  console.error(nextLogs.slice(-5000));
  if (page && !page.isClosed()) {
    try {
      console.error((await page.locator('#import-transactions').innerText({ timeout: 1000 })).slice(-4000));
      console.error((await page.locator('#import-transactions').ariaSnapshot({ timeout: 1000 })).slice(-5000));
      await page.screenshot({ path: output('failure.png'), fullPage: true, timeout: 3000 });
      console.error(`Failure screenshot: ${output('failure.png')}`);
    } catch {}
  }
}).finally(async () => {
  clearTimeout(watchdog);
  if (succeeded && keepOpen) {
    await browser.close();
    browser = undefined;
    console.log(`Synthetic visual QA remains at ${site}/transactions; fixture PID=${process.pid}; Next PID=${nextProcess.pid}`);
    console.log(`Login: ${user.email} / synthetic-test-password`);
    console.log(`Sample file: ${output('sample.csv')}`);
    process.once('SIGINT', () => void cleanup());
    process.once('SIGTERM', () => void cleanup());
  } else await cleanup();
});
