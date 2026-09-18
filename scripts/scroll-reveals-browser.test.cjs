const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('console', (message) => {
      // The existing site has no favicon; that browser request is unrelated to React.
      if (message.location().url === 'http://127.0.0.1:5191/favicon.ico' && message.text().includes('404')) return;
      if (message.type() === 'error') errors.push(`${message.text()} ${message.location().url}`);
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:5191/preview', { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForTimeout(850);
    const waitingCards = await page.locator('[data-scroll-reveal]').evaluateAll((cards) => cards.filter((card) => card.getAnimations().some((animation) => animation.playState === 'paused')).length);
    assert(waitingCards > 0, 'Offscreen cards wait for scrolling');
    const last = page.locator('[data-scroll-reveal]').last();
    await last.scrollIntoViewIfNeeded(); await page.waitForTimeout(900);
    assert.equal(await last.evaluate((el) => getComputedStyle(el).opacity), '1', 'Scrolling reveals cards');
    assert.equal(await page.locator('[data-reveal-state]').count(), 0, 'Animations do not mutate hydration attributes');
    await page.goto('http://127.0.0.1:5191/transactions', { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: 'Flytja inn skrá', exact: true }).click();
    assert.equal(await page.locator('#import-transactions').evaluate((el) => getComputedStyle(el).opacity), '1', 'Hash target is visible immediately');
    await page.goto('http://127.0.0.1:5191/savings-goals', { waitUntil: 'networkidle' });
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(100);
    assert.equal(await page.locator('[data-scroll-reveal]').evaluateAll((cards) => cards.filter((card) => getComputedStyle(card).opacity === '0').length), 0, 'Reduced motion leaves every card visible');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('http://127.0.0.1:5191/savings-goals', { waitUntil: 'networkidle' });
    const field = page.locator('input[name="note"]').last();
    await field.focus();
    assert.equal(await field.locator('xpath=ancestor::section[1]').evaluate((el) => getComputedStyle(el).opacity), '1', 'Keyboard focus reveals a waiting card immediately');
    assert.equal(errors.length, 0, errors.join('\n').slice(0, 5000));
    await page.goto('http://127.0.0.1:5191/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(850);
    await page.screenshot({ path: require('node:path').join(process.env.TEMP, 'finance-mobile-dashboard-ready.png') });
    console.log('PASS scroll fades, hash links, reduced motion, keyboard focus, no hydration or runtime errors');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
