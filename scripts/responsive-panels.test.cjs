// Checks interactions that reveal additional mobile layouts; all data is synthetic.
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = join(process.env.TEMP, 'finance-mobile-panels');
(async () => {
  await mkdir(output, { recursive: true });
  const { session } = await (await fetch('http://127.0.0.1:5193/__fixture')).json();
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 320, height: 844 }, isMobile: true, hasTouch: true });
    await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url'), url: 'http://127.0.0.1:5191', sameSite: 'Lax' }]);
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    const capture = async (name, locator) => {
      await locator.scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
      const bounds = await locator.boundingBox();
      assert(bounds.x >= -1 && bounds.x + bounds.width <= page.viewportSize().width + 1, name + ' fits screen');
      await locator.screenshot({ path: join(output, name + '.png') });
    };
    await page.goto('http://127.0.0.1:5191/transactions', { waitUntil: 'networkidle', timeout: 120000 });
    const month = new Date().toISOString().slice(0, 7);
    await page.locator('input[type=file]').setInputFiles({ name: 'synthetic-mobile.csv', mimeType: 'text/csv', buffer: Buffer.from(`Dagsetning;Lýsing;Upphæð\n${month}-09;Mjög löng lýsing á matarinnkaupum fyrir heimilið;-1234567\n${month}-10;Netflix áskrift;-2990`) });
    await page.getByText('Mjög löng lýsing á matarinnkaupum fyrir heimilið', { exact: true }).first().waitFor();
    await capture('import-review-320', page.locator('#import-transactions'));
    await page.goto('http://127.0.0.1:5191/real-estate', { waitUntil: 'networkidle', timeout: 120000 });
    for (const width of [320, 640, 768, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await capture('mortgage-' + width, page.locator('section[aria-labelledby="mortgage-calculator-title"]'));
    }
    await page.setViewportSize({ width: 320, height: 844 });
    const housingTabs = page.getByRole('tablist', { name: 'Tegund húsnæðis' }).getByRole('tab');
    for (let i = 0; i < await housingTabs.count(); i++) { await housingTabs.nth(i).click(); assert.equal(await housingTabs.nth(i).getAttribute('aria-selected'), 'true'); }
    await page.goto('http://127.0.0.1:5191/markets', { waitUntil: 'networkidle', timeout: 120000 });
    for (const label of ['Sjóðir', 'Gengi', 'Hagkerfið']) {
      await page.getByRole('tab', { name: label, exact: true }).click();
      await capture('markets-' + label, page.getByRole('tabpanel'));
    }
    await page.goto('http://127.0.0.1:5191/analytics', { waitUntil: 'networkidle' });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: join(output, 'analytics-1280.png'), fullPage: true });
    await page.goto('http://127.0.0.1:5191/reset-password', { waitUntil: 'networkidle' });
    await page.setViewportSize({ width: 320, height: 844 });
    await page.screenshot({ path: join(output, 'reset-320.png'), fullPage: true });
    await context.clearCookies();
    await page.goto('http://127.0.0.1:5191/', { waitUntil: 'networkidle', timeout: 120000 });
    for (const label of ['Færslur', 'Reikningar', 'Sparnaður']) {
      await page.getByRole('navigation', { name: 'Sýningarvalmynd' }).getByRole('button', { name: label, exact: true }).click();
      await capture('demo-' + label, page.locator('main'));
    }
    console.log('PASS import review, mortgage 320–1280, housing tabs, market tabs, analytics, password reset, demo sections');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
