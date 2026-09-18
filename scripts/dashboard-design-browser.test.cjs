// Local dashboard QA only; this script never mutates the synthetic fixture.
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const site = 'http://127.0.0.1:5191';
const backend = 'http://127.0.0.1:5193';
const output = join(process.env.TEMP, 'finance-dashboard-design');

(async () => {
  await mkdir(output, { recursive: true });
  const response = await fetch(`${backend}/__fixture`);
  assert(response.ok, 'The isolated synthetic fixture must be running');
  const { session } = await response.json();
  const read = async (table) => (await fetch(`${backend}/rest/v1/${table}`, { headers: { Authorization: `Bearer ${session.access_token}` } })).json();
  const [transactions, bills, payments] = await Promise.all(['transactions', 'bills', 'bill_payments'].map(read));
  const month = new Date().toISOString().slice(0, 7);
  const recordedNet = transactions.filter(row => row.date.startsWith(month)).reduce((sum, row) => sum + (row.type === 'income' ? 1 : -1) * Number(row.amount), 0);
  const money = value => `${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} kr.`;
  const unpaid = bills.filter(bill => bill.is_active && bill.month.startsWith(month) && !payments.some(payment => payment.bill_id === bill.id && payment.month.startsWith(month))).sort((a, b) => a.due_day - b.due_day);
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const screenshots = [];
  try {
    for (const [width, theme] of [[320, 'light'], [390, 'light'], [430, 'light'], [768, 'light'], [1024, 'light'], [1280, 'light'], [1440, 'light'], [390, 'dark'], [1440, 'dark']]) {
      const height = width < 640 ? 844 : 1000;
      const name = `${width < 640 ? 'mobile' : 'desktop'}-${theme}`;
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: width < 640, hasTouch: width < 640, locale: 'is-IS', colorScheme: theme, reducedMotion: 'reduce' });
      await context.addInitScript(value => localStorage.setItem('finance-theme-metallic', value), theme);
      await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url'), url: site, sameSite: 'Lax' }]);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.setDefaultTimeout(15000);
      await page.goto(`${site}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.getByTestId('monthly-position').waitFor();
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
      assert.equal((await page.getByTestId('monthly-position').textContent()).replaceAll('\u00a0', ' '), money(recordedNet));
      const billsSection = page.locator('section[aria-labelledby="unpaid-bills-title"]');
      const names = await billsSection.locator('a p').allTextContents();
      assert.deepEqual(names, unpaid.slice(0, 3).map(bill => bill.name));
      assert.equal(await page.getByRole('link', { name: 'Ný færsla', exact: true }).getAttribute('href'), '/transactions');
      const months = page.getByRole('group', { name: 'Tekjur og útgjöld eftir mánuðum' }).getByRole('button');
      const selected = index => page.waitForFunction(index => document.querySelectorAll('[role="group"][aria-label="Tekjur og útgjöld eftir mánuðum"] button')[index]?.getAttribute('aria-pressed') === 'true', index);
      assert.equal(await months.count(), 6);
      await months.first().click();
      await selected(0);
      await months.first().press('ArrowRight');
      await selected(1);
      await months.nth(1).press('End');
      await selected(5);
      await months.last().press('Home');
      await selected(0);
      await months.first().press('End');
      await selected(5);
      const markets = page.locator('details').filter({ has: page.locator('summary').filter({ hasText: 'Markaðir og efnahagur' }) });
      await markets.locator('summary').click();
      assert.equal(await markets.getAttribute('open'), '');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width} ${theme}: expanded market overflow`);
      await markets.locator('summary').click();
      const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, theme: document.documentElement.classList.contains('dark'), headerAnimation: getComputedStyle(document.querySelector('main header')).animationName }));
      assert.equal(layout.theme, theme === 'dark');
      assert(layout.scroll <= layout.width, `${width} ${theme}: overflow ${layout.scroll}`);
      assert.equal(layout.headerAnimation, 'none', 'Reduced motion disables dashboard entrance');
      assert.equal(errors.length, 0, errors.join('\n'));
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
      for (const fullPage of [390, 1440].includes(width) ? [false, true] : []) {
        const path = join(output, `${name}-${width}x${height}${fullPage ? '-full' : ''}.png`);
        await page.screenshot({ path, fullPage, animations: 'disabled' });
        screenshots.push(path);
        console.log('SCREENSHOT ' + path);
      }
      console.log(`PASS ${width}px ${theme}: real totals, bill order, chart mouse/keyboard, markets, reduced motion, overflow, no runtime errors`);
      await context.close();
    }
    await writeFile(join(output, 'report.json'), JSON.stringify({ screenshots }, null, 2));
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
