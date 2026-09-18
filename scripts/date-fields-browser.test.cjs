const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const site = 'http://127.0.0.1:5191';
const output = join(process.env.TEMP, 'finance-date-fields-20260914');

(async () => {
  await mkdir(output, { recursive: true });
  const { session } = await (await fetch('http://127.0.0.1:5193/__fixture')).json();
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'is-IS', reducedMotion: 'reduce' });
    await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url'), url: site, sameSite: 'Lax' }]);
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    const results = [];
    for (const route of ['transactions', 'income', 'bills', 'expenses', 'savings-goals']) {
      await page.goto(`${site}/${route}`, { waitUntil: 'networkidle', timeout: 120000 });
      assert(!page.url().includes('/login'), 'Use synthetic account');
      await page.locator('details').evaluateAll((items) => items.forEach((item) => { item.open = true; }));
      // iOS WebKit #301648 effectively adds native input padding outside its
      // specified width. Content-box is a regression model, not iOS emulation.
      await page.addStyleTag({ content: 'input[type=date],input[type=month]{box-sizing:content-box!important}' });
      for (const width of [320, 375, 390, 430, 640, 768, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        const controls = await page.locator('input[type=date], input[type=month]').evaluateAll((items) => items.map((input) => {
          const rect = input.getBoundingClientRect();
          const frame = input.parentElement;
          const outer = frame.getBoundingClientRect();
          let owner = frame.parentElement;
          while (getComputedStyle(owner).display === 'contents') owner = owner.parentElement;
          const parent = owner.getBoundingClientRect();
          const style = getComputedStyle(input);
          const sibling = [...(input.form?.querySelectorAll('input:not([type=hidden]):not([type=date]):not([type=month]),select') ?? [])].find((el) => el.getBoundingClientRect().width > 0);
          return { name: input.name, type: input.type, value: input.value, visible: rect.width > 0 && rect.height > 0,
            frame: frame.classList.contains('date-field'), padding: parseFloat(style.paddingLeft) + parseFloat(style.paddingRight), border: parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth),
            contained: rect.left >= outer.left - 1 && rect.right <= outer.right + 1 && outer.left >= parent.left - 1 && outer.right <= parent.right + 1,
            aligned: !owner.matches('label') || Math.abs(outer.width - parent.width) < 1,
            siblingHeight: sibling?.getBoundingClientRect().height, height: outer.height, fontSize: style.fontSize };
        }));
        const visible = controls.filter((c) => c.visible);
        assert(visible.length > 0, route + ' has date controls');
        for (const control of visible) {
          assert(control.frame && control.padding === 0 && control.border === 0, route + ' avoids native padding bug: ' + control.name);
          assert(control.contained && control.aligned, route + ' aligns with its column: ' + control.name);
          assert.equal(control.height, 44, route + ' keeps consistent height');
          if (width < 1024) assert.equal(control.fontSize, '16px', 'No input zoom on iPhone');
        }
        results.push({ route, width, controls: visible.length });
      }
      console.log('PASS widths and empty/filled controls: ' + route);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${site}/transactions`, { waitUntil: 'networkidle' });
    const date = page.getByLabel('Dagsetning', { exact: true });
    await date.fill('2026-09-14');
    assert.equal(await date.inputValue(), '2026-09-14');
    assert.equal(await date.evaluate((el) => new FormData(el.form).get('date')), '2026-09-14', 'Native field is submitted in ISO format');
    await date.fill(''); assert.equal(await date.evaluate((el) => el.checkValidity()), false, 'Required dates retain validation');
    await date.fill('2026-09-14'); await date.focus();
    assert(await date.locator('..').evaluate((el) => el.matches(':focus-within') && getComputedStyle(el).boxShadow !== 'none'), 'Keyboard focus is visible');
    await date.locator('xpath=ancestor::section[1]').screenshot({ path: join(output, 'transaction-date-390.png') });
    const from = page.getByLabel('Frá', { exact: true });
    await from.locator('xpath=ancestor::section[1]').screenshot({ path: join(output, 'date-filters-390.png') });
    await page.goto(`${site}/income`, { waitUntil: 'networkidle' });
    const month = page.getByLabel('Mánuður', { exact: true });
    await month.fill('2026-10');
    assert.equal(await month.evaluate((el) => new FormData(el.form).get('month')), '2026-10', 'Month retains native form value');
    await month.locator('xpath=ancestor::section[1]').screenshot({ path: join(output, 'income-month-390.png') });
    await writeFile(join(output, 'results.json'), JSON.stringify({ results, errors }, null, 2));
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS native date/month values, labels, validation and focus. 35 viewport/form checks.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
