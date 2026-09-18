const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { join, resolve } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const site = 'http://127.0.0.1:5191';
const output = resolve(process.argv.find((v) => v.startsWith('--output='))?.slice(9) || '.next/responsive-qa');
const baseline = process.argv.includes('--baseline');
const interactionsOnly = process.argv.includes('--interactions');
(async () => {
  await mkdir(output, { recursive: true });
  const { session, categoryId } = await (await fetch('http://127.0.0.1:5193/__fixture')).json();
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url'), url: site, sameSite: 'Lax' }]);
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    const routes = interactionsOnly ? [] : baseline ? ['dashboard', 'transactions', 'real-estate'] : ['dashboard', 'monthly-overview', 'transactions', 'income', 'expenses', 'bills', 'savings-goals', 'real-estate', 'markets', 'analytics', 'settings', `transactions/category/${categoryId}`];
    const results = [];
    for (const route of routes) {
      await page.goto(`${site}/${route}`, { waitUntil: 'networkidle', timeout: 120000 });
      assert(!page.url().includes('/login'), 'Synthetic session must be active');
      for (const width of baseline ? [390] : [320, 390, 430, 768, 1440]) {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
        // Reveal each scrolled section before capturing the full page.
        await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 650) { window.scrollTo(0, y); await new Promise((done) => setTimeout(done, 35)); } window.scrollTo(0, 0); });
        await page.waitForTimeout(750);
        const overflow = await page.evaluate(() => [...document.querySelectorAll('main *')].filter((el) => {
          const rect = el.getBoundingClientRect();
          if (!rect.width || !rect.height || getComputedStyle(el).position === 'fixed' || el.closest('svg, [aria-hidden="true"]')) return false;
          for (let parent = el.parentElement; parent && parent.tagName !== 'MAIN'; parent = parent.parentElement) if (['auto', 'scroll'].includes(getComputedStyle(parent).overflowX)) return false;
          return rect.right > innerWidth + 2 || rect.left < -2;
        }).map((el) => ({ tag: el.tagName, text: el.textContent?.slice(0, 70), class: String(el.className).slice(0, 130) })).slice(0, 12));
        results.push({ route, width, overflow });
        if ([320, 390, 1440].includes(width)) await page.screenshot({ path: join(output, `${route.replaceAll('/', '-')}-${width}.png`), fullPage: true });
        if (width === 390) await page.screenshot({ path: join(output, `${route.replaceAll('/', '-')}-phone.png`) });
      }
      console.log(`CHECK ${route}: captured`);
    }
    await writeFile(join(output, 'results.json'), JSON.stringify({ results, errors }, null, 2));
    if (!baseline) {
      await page.setViewportSize({ width: 320, height: 844 });
      await page.goto(`${site}/transactions`, { waitUntil: 'networkidle' });
      const editor = page.locator('summary').filter({ hasText: 'Breyta færslu' }).first();
      await editor.click();
      const form = editor.locator('..').locator('form');
      assert((await form.boundingBox()).width >= 220, 'Expanded phone editor must use the card width');
      await editor.scrollIntoViewIfNeeded();
      await page.screenshot({ path: join(output, 'transaction-editor-320.png') });
      await page.getByRole('button', { name: 'Opna fleiri síður', exact: true }).click();
      const dialog = page.getByRole('dialog'); await dialog.waitFor();
      assert((await dialog.boundingBox()).width <= 320, 'Mobile menu must fit viewport');
      await page.screenshot({ path: join(output, 'navigation-320.png') });
      await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
      await context.clearCookies();
      for (const route of ['login', 'signup', 'forgot-password', '']) {
        await page.goto(`${site}/${route}`, { waitUntil: 'networkidle', timeout: 120000 });
        await page.screenshot({ path: join(output, `${route || 'demo'}-320.png`), fullPage: true });
      }
    }
    await writeFile(join(output, 'results.json'), JSON.stringify({ results, errors }, null, 2));
    console.log(JSON.stringify({ overflow: results.filter((r) => r.overflow.length), errors }, null, 2));
    if (!baseline) { assert.equal(errors.length, 0, 'No runtime errors'); assert.equal(results.filter((r) => r.overflow.length).length, 0, 'No page-level horizontal overflow'); }
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
