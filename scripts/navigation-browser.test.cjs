const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { writeFile } = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const { join, resolve } = require('node:path');

// Use an isolated production build without real service environment files.
// node scripts/navigation-browser.test.cjs --build-dir=/path/to/build
// Add --action-only to check a direct page load followed by a JavaScript save.
// Playwright's browser is the default; CHROME_EXECUTABLE can select an installed browser.
let playwright;
try {
  playwright = require('playwright');
} catch (error) {
  if (!process.env.PLAYWRIGHT_MODULE) {
    throw new Error('Playwright is required. Install it in the test environment or set PLAYWRIGHT_MODULE to its module path.', { cause: error });
  }
  playwright = require(process.env.PLAYWRIGHT_MODULE);
}
const { chromium } = playwright;

const buildDir = resolve(process.argv.find((value) => value.startsWith('--build-dir='))?.slice('--build-dir='.length) || join(__dirname, '..'));
const resultsPath = join(buildDir, '.next', 'navigation-browser-results.json');
const failureImagePath = join(buildDir, '.next', 'navigation-browser-failure.png');
const site = 'http://127.0.0.1:5181';
const backendUrl = 'http://127.0.0.1:5183';
const delayMs = 1200;
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const users = ['A', 'B'].map((label, index) => {
  const user = { id: `${index + 1}1111111-1111-4111-8111-111111111111`, aud: 'authenticated', role: 'authenticated', email: `synthetic-${label.toLowerCase()}@example.invalid`, email_confirmed_at: '2026-01-01T00:00:00Z', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, identities: [], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' };
  const now = Math.floor(Date.now() / 1000);
  const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, aud: 'authenticated', role: 'authenticated', email: user.email, iat: now, exp: now + 3600 })}.dGVzdA`;
  const session = { access_token: token, refresh_token: `synthetic-${label}-refresh`, token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, user };
  return { label, user, token, session, revoked: false };
});
const categories = (account) => [
  { id: '22222222-2222-4222-8222-222222222222', user_id: account.user.id, name: 'Áskriftir', type: 'expense', is_default: true },
  { id: '33333333-3333-4333-8333-333333333333', user_id: account.user.id, name: 'Reikningar', type: 'expense', is_default: true },
  { id: '44444444-4444-4444-8444-444444444444', user_id: account.user.id, name: 'Laun', type: 'income', is_default: true }
];
const transactionRows = new Map(users.map((account) => [account.user.id, [{ id: randomUUID(), user_id: account.user.id, category_id: categories(account)[2].id, categories: categories(account)[2], type: 'income', amount: account.label === 'A' ? 812345 : 622000, date: new Date().toISOString().slice(0, 10), note: `SYNTHETIC_${account.label}_SALARY` }]]));
const backendCalls = [];
const browserErrors = [];
let server;
let nextProcess;
let browser;
let activePage;
let nextLogs = '';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const transactionReadCount = () => backendCalls.filter((call) => call.method === 'GET' && call.path === '/rest/v1/transactions').length;
const bodyJson = async (request) => { let body = ''; for await (const chunk of request) body += chunk; return body ? JSON.parse(body) : {}; };

async function run() {
  server = http.createServer(async (request, response) => {
    const url = new URL(request.url, backendUrl);
    const account = users.find((user) => request.headers.authorization === `Bearer ${user.token}` && !user.revoked);
    backendCalls.push({ method: request.method, path: url.pathname, account: account?.label ?? null });
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Cache-Control', 'no-store');
    if (url.pathname === '/auth/v1/token' && request.method === 'POST') {
      const data = await bodyJson(request);
      const loginAccount = users.find((user) => user.user.email === data.email);
      if (!loginAccount || data.password !== 'synthetic-test-password') return response.writeHead(400).end(JSON.stringify({ error_code: 'invalid_credentials', msg: 'Synthetic login rejected' }));
      loginAccount.revoked = false;
      return response.end(JSON.stringify(loginAccount.session));
    }
    if (!account) return response.writeHead(401).end(JSON.stringify({ message: 'Synthetic test session required', code: 'bad_jwt' }));
    if (url.pathname === '/auth/v1/user') return response.end(JSON.stringify(account.user));
    if (url.pathname === '/auth/v1/logout' && request.method === 'POST') {
      account.revoked = true;
      return response.writeHead(204).end();
    }
    if (!url.pathname.startsWith('/rest/v1/')) return response.writeHead(404).end('{}');
    const table = url.pathname.slice('/rest/v1/'.length);
    if (table === 'transactions' && request.method === 'POST') {
      const inserted = await bodyJson(request);
      const rows = Array.isArray(inserted) ? inserted : [inserted];
      for (const row of rows) {
        assert.equal(row.user_id, account.user.id);
        transactionRows.get(account.user.id).push({ ...row, id: randomUUID(), categories: categories(account)[2] });
      }
      return response.writeHead(201).end(JSON.stringify(rows));
    }
    if (request.method !== 'GET') return response.writeHead(405).end(JSON.stringify({ message: 'Outside bounded synthetic actions' }));
    let rows = [];
    if (table === 'transactions') {
      await sleep(delayMs);
      rows = transactionRows.get(account.user.id);
    } else if (table === 'categories') rows = categories(account);
    else if (table === 'profiles') rows = [{ id: account.user.id, full_name: `Synthetic ${account.label}`, currency: 'ISK' }];
    if (request.headers.accept?.includes('vnd.pgrst.object')) return response.end(JSON.stringify(rows[0] ?? null));
    response.end(JSON.stringify(rows));
  });
  server.listen(5183, '127.0.0.1');
  await once(server, 'listening');
  nextProcess = spawn(process.execPath, [`${buildDir}/node_modules/next/dist/bin/next`, 'start', '-H', '127.0.0.1', '-p', '5181'], {
    cwd: buildDir, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production', VERCEL_ENV: 'preview', NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: backendUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'synthetic-local-anon-key', NEXT_PUBLIC_SITE_URL: site }
  });
  nextProcess.stdout.on('data', (chunk) => { nextLogs += chunk; });
  nextProcess.stderr.on('data', (chunk) => { nextLogs += chunk; });
  const deadline = Date.now() + 30000;
  while (true) {
    assert(Date.now() < deadline, `Next startup timed out: ${nextLogs}`);
    try { await fetch(`${site}/favicon.ico`, { signal: AbortSignal.timeout(1000) }); break; } catch {}
    await sleep(100);
  }
  const signedOut = await fetch(`${site}/income`, { redirect: 'manual' });
  assert.equal(signedOut.status, 307);
  assert.equal(new URL(signedOut.headers.get('location'), site).pathname, '/login');
  assert.equal(transactionReadCount(), 0);
  console.log('CHECK signed-out redirect: passed');

  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {})
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${encode(users[0].session)}`, url: site }]);
  const page = await context.newPage();
  activePage = page;
  page.setDefaultTimeout(15000);
  page.on('pageerror', (error) => browserErrors.push(error.message));
  // Block external browser embeds; all private fixtures stay on localhost.
  await page.route((url) => url.hostname !== '127.0.0.1', (route) => route.abort());
  const nav = (href) => page.locator(`aside a[href="${href}"]:visible, nav a[href="${href}"]:visible, header a[href="${href}"]:visible`).first();
  const visibleNote = async (note) => page.locator('main').getByText(note, { exact: true }).filter({ visible: true }).first().waitFor({ state: 'visible' });
  const goSettings = async () => { await nav('/settings').click(); await page.getByRole('heading', { name: 'Stillingar', exact: true }).waitFor(); await page.mouse.move(1, 1); };
  if (process.argv.includes('--action-only')) {
    await page.goto(`${site}/income`);
    await visibleNote('SYNTHETIC_A_SALARY');
    await page.locator('input[name="amount"]').fill('1234');
    await page.locator('input[name="note"]').fill('SYNTHETIC_NEW_INCOME');
    await page.getByRole('button', { name: 'Skrá tekjur', exact: true }).click();
    await visibleNote('SYNTHETIC_NEW_INCOME');
    console.log('CHECK direct-load JavaScript action freshness: passed');
    return;
  }
  await page.goto(`${site}/settings`);
  await page.getByRole('heading', { name: 'Stillingar', exact: true }).waitFor();
  await page.waitForLoadState('networkidle');
  assert.equal(transactionReadCount(), 0, 'No private destinations should be prefetched merely because links are visible');

  const startedPrefetch = performance.now();
  const prefetchResponse = page.waitForResponse((response) => new URL(response.url()).pathname === '/income' && response.url().includes('_rsc'));
  await nav('/income').hover();
  const response = await prefetchResponse;
  console.log(`CHECK received intent response status ${response.status()}`);
  // Chromium does not expose a finished body for Next's streamed prefetch here.
  // Allow the known fixture delay, then prove reuse with the click/read-count checks.
  await sleep(delayMs + 300);
  assert(transactionReadCount() > 0, 'Intent must fetch private page data before clicking');
  const prefetchMs = performance.now() - startedPrefetch;
  const afterPrefetchReads = transactionReadCount();
  const firstClick = performance.now();
  await nav('/income').click();
  await visibleNote('SYNTHETIC_A_SALARY');
  const prefetchedClickMs = performance.now() - firstClick;
  assert.equal(transactionReadCount(), afterPrefetchReads, 'Click should consume prefetched data without another private read');
  assert(prefetchedClickMs < delayMs * 0.65, `Prefetched content should avoid ${delayMs}ms backend delay: ${prefetchedClickMs}`);
  console.log(`CHECK intent data ready: hover fetch ${Math.round(prefetchMs)}ms, click ${Math.round(prefetchedClickMs)}ms, zero extra reads`);

  await goSettings();
  const beforeRepeat = transactionReadCount();
  const repeatStart = performance.now();
  await nav('/income').click();
  await visibleNote('SYNTHETIC_A_SALARY');
  const repeatedClickMs = performance.now() - repeatStart;
  assert.equal(transactionReadCount(), beforeRepeat, 'Repeated navigation within30s should reuse page data');
  assert(repeatedClickMs < delayMs * 0.65);
  console.log(`CHECK repeated navigation: ${Math.round(repeatedClickMs)}ms, zero extra reads`);

  await page.locator('input[name="amount"]').fill('1234');
  await page.locator('input[name="note"]').fill('SYNTHETIC_NEW_INCOME');
  await page.getByRole('button', { name: 'Skrá tekjur', exact: true }).click();
  await visibleNote('SYNTHETIC_NEW_INCOME');
  assert.equal(backendCalls.filter((call) => call.method === 'POST' && call.path === '/rest/v1/transactions').length, 1);
  await goSettings();
  await nav('/income').click();
  await visibleNote('SYNTHETIC_NEW_INCOME');
  console.log('CHECK server-action save and revisited page freshness: passed');

  await goSettings();
  console.log('CHECK waiting31.2s to verify actual browser-cache expiration');
  await sleep(31200);
  const beforeExpired = transactionReadCount();
  const expiredStart = performance.now();
  await nav('/income').click();
  await visibleNote('SYNTHETIC_NEW_INCOME');
  const expiredClickMs = performance.now() - expiredStart;
  assert(transactionReadCount() > beforeExpired, 'Expired page must fetch fresh private data');
  assert(expiredClickMs > delayMs * 0.7, 'Expired page should wait for the synthetic backend again');
  console.log(`CHECK30s expiration: ${Math.round(expiredClickMs)}ms and fresh backend read`);

  // Create the shared-session tab after timing checks so its reads cannot affect them.
  const returningPage = await context.newPage();
  returningPage.setDefaultTimeout(15000);
  returningPage.on('pageerror', (error) => browserErrors.push(error.message));
  await returningPage.route((url) => url.hostname !== '127.0.0.1', (route) => route.abort());
  await returningPage.goto(`${site}/income`);
  await returningPage.getByText('SYNTHETIC_A_SALARY', { exact: true }).filter({ visible: true }).first().waitFor();
  await page.bringToFront();

  await goSettings();
  await page.getByRole('button', { name: 'Skrá út', exact: true }).click();
  await page.waitForURL('**/login');
  await page.getByRole('heading', { name: 'Velkomin aftur', exact: true }).waitFor();
  assert(!((await context.cookies()).find((entry) => entry.name === 'sb-127-auth-token')?.value), 'Signout must delete auth cookie');
  const beforeBack = transactionReadCount();
  await page.goBack();
  await page.waitForURL('**/login');
  assert.equal(transactionReadCount(), beforeBack, 'Back after logout must not read private data');
  await page.locator('input[name="email"]').fill(users[1].user.email);
  await page.locator('input[name="password"]').fill('synthetic-test-password');
  await page.getByRole('button', { name: 'Skrá inn', exact: true }).click();
  await page.waitForURL('**/dashboard');
  await nav('/income').click();
  await visibleNote('SYNTHETIC_B_SALARY');
  assert.equal(await page.getByText('SYNTHETIC_A_SALARY', { exact: true }).count(), 0, 'A previous account page must not be reused after login');
  assert.equal(await page.getByText('SYNTHETIC_NEW_INCOME', { exact: true }).count(), 0, 'Prior account mutations must not leak into the new session');
  console.log('CHECK logout/back and second-account login isolation: passed');

  activePage = returningPage;
  const crossTabStarted = performance.now();
  let crossTabRefreshTrigger = 'tab activation';
  await returningPage.bringToFront();
  const returnedAccountNote = returningPage.getByText('SYNTHETIC_B_SALARY', { exact: true }).filter({ visible: true }).first();
  try {
    await returnedAccountNote.waitFor({ state: 'visible', timeout: 2500 });
  } catch {
    // Headless Chrome does not consistently emit native tab-focus events.
    crossTabRefreshTrigger = 'explicit focus event (headless fallback)';
    await returningPage.evaluate(() => window.dispatchEvent(new Event('focus')));
    await returnedAccountNote.waitFor({ state: 'visible' });
  }
  assert.equal(await returningPage.getByText('SYNTHETIC_A_SALARY', { exact: true }).count(), 0, 'Returning to another tab must not retain the prior account page');
  assert.equal(await returningPage.getByText('SYNTHETIC_NEW_INCOME', { exact: true }).count(), 0, 'Returning to another tab must not retain prior account mutations');
  const crossTabRefreshMs = Math.round(performance.now() - crossTabStarted);
  console.log(`CHECK shared-tab account freshness: ${crossTabRefreshMs}ms via ${crossTabRefreshTrigger}`);

  assert.equal(browserErrors.length, 0, `Browser runtime errors: ${browserErrors.join('; ')}`);
  const result = { synthetic: true, backendDelayMs: delayMs, prefetchMs: Math.round(prefetchMs), prefetchedClickMs: Math.round(prefetchedClickMs), repeatedClickMs: Math.round(repeatedClickMs), expiredClickMs: Math.round(expiredClickMs), expirationSeconds: 30, serverActionFreshness: true, signoutAndSecondAccountIsolation: true, crossTabAccountFreshness: true, crossTabRefreshMs, crossTabRefreshTrigger, browserErrors, backendCalls };
  await writeFile(resultsPath, JSON.stringify(result, null, 2));
  console.log(`Results: ${resultsPath}`);
  console.log(JSON.stringify({ ...result, backendCalls: backendCalls.length }, null, 2));
}

let watchdog;
Promise.race([
  run(),
  new Promise((_, reject) => {
    watchdog = setTimeout(() => reject(new Error('Synthetic browser suite exceeded 120 seconds')), 120000);
  })
]).catch(async (error) => {
  process.exitCode = 1;
  console.error(error);
  console.error(nextLogs.slice(-6000));
  console.error('Recent fixture requests:', JSON.stringify(backendCalls.slice(-30)));
  if (browserErrors.length) console.error('Browser errors:', JSON.stringify(browserErrors));
  if (activePage && !activePage.isClosed()) {
    try {
      console.error((await activePage.locator('main').innerText({ timeout: 1000 })).slice(-4000));
      await activePage.screenshot({ path: failureImagePath, fullPage: true, timeout: 3000 });
      console.error(`Failure screenshot: ${failureImagePath}`);
    } catch (diagnosticError) {
      console.error('Could not capture failure state:', diagnosticError.message);
    }
  }
}).finally(async () => {
  clearTimeout(watchdog);
  // Keep a failed browser shutdown from leaving the test runner waiting forever.
  const cleanupDeadline = setTimeout(() => {
    if (nextProcess && nextProcess.exitCode === null) nextProcess.kill();
    server?.closeAllConnections();
    process.exit(process.exitCode || 1);
  }, 5000);
  cleanupDeadline.unref();
  try {
    if (browser) await browser.close();
  } finally {
    if (nextProcess && nextProcess.exitCode === null) nextProcess.kill();
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    clearTimeout(cleanupDeadline);
  }
});
