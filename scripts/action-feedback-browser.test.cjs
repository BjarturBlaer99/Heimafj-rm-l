// Run only against the isolated responsive-preview.cjs --writable fixture.
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const site = 'http://127.0.0.1:5191';
const backend = 'http://127.0.0.1:5193';
const output = join(process.env.TEMP, 'finance-feedback-preview');
const month = new Date().toISOString().slice(0, 7);
const waitFor = async (check, message) => {
  const deadline = Date.now() + 15000;
  while (!(await check())) {
    assert(Date.now() < deadline, message);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};

(async () => {
  await mkdir(output, { recursive: true });
  const { session } = await (await fetch(`${backend}/__fixture`)).json();
  const control = async (settings) => {
    const response = await fetch(`${backend}/__control`, {
      method: settings ? 'POST' : 'GET',
      headers: { authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      ...(settings ? { body: JSON.stringify(settings) } : {})
    });
    assert(response.ok, 'Writable synthetic fixture required');
    return response.json();
  };
  await control();
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'is-IS', reducedMotion: 'reduce' });
    await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url'), url: site, sameSite: 'Lax' }]);
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    const success = page.locator('[data-feedback-tone="success"]');
    const failure = page.locator('[data-feedback-tone="error"]');
    const dismiss = async () => { await page.getByRole('button', { name: 'Loka skilaboðum' }).click(); assert.equal(await success.count(), 0); };
    const expectSuccess = async (text) => { await success.filter({ hasText: text }).waitFor(); assert.equal(await failure.count(), 0); };
    const goto = async (path) => { await page.goto(site + path, { waitUntil: 'networkidle', timeout: 120000 }); assert(!page.url().includes('/login')); };
    const note = 'QA success ' + Date.now();

    await goto(`/transactions?month=${month}&type=expense`);
    const newTransaction = page.locator('form').filter({ has: page.getByRole('button', { name: 'Bæta við', exact: true }) });
    assert(await newTransaction.getAttribute('action'), 'Queued form action exists before hydration; no native GET submission');
    await newTransaction.locator('[name=note]').fill(note);
    await newTransaction.locator('[name=amount]').fill('1234');
    const baseline = (await control()).mutationCount;
    await control({ delayMs: 1200 });
    await newTransaction.getByRole('button', { name: 'Bæta við', exact: true }).click();
    assert(await newTransaction.getByRole('button').isDisabled(), 'Saving disables duplicate submission');
    assert.equal(await success.count(), 0, 'No success before persistence');
    await newTransaction.evaluate((form) => form.requestSubmit());
    await expectSuccess('Færslunni var bætt við.');
    assert.equal((await control()).mutationCount, baseline + 1, 'Duplicate submission did not write twice');
    await waitFor(async () => (await newTransaction.locator('[name=note]').inputValue()) === '', 'Successful new form resets');
    assert.equal(new URL(page.url()).search, `?month=${month}&type=expense`, 'Filters preserved');
    const firstNotice = await success.elementHandle();
    await newTransaction.locator('[name=note]').fill(note + ' second');
    await newTransaction.locator('[name=amount]').fill('2345');
    await newTransaction.getByRole('button').click();
    await waitFor(async () => !(await firstNotice.evaluate((element) => element.isConnected)), 'Repeated success remounts/announces notice');
    await expectSuccess('Færslunni var bætt við.');
    assert.equal((await control()).mutationCount, baseline + 2);
    await page.screenshot({ path: join(output, 'transaction-success-mobile.png') });
    await dismiss();

    const editor = page.locator('form').filter({ has: page.locator(`input[name=note][value="${note}"]`) }).first();
    await editor.evaluate((form) => { form.closest('details').open = true; });
    await editor.locator('[name=amount]').fill('3456');
    await editor.getByRole('button', { name: 'Vista breytingar' }).click();
    await expectSuccess('Færslan var uppfærð.');
    assert.equal(await editor.locator('[name=amount]').inputValue(), '3456', 'Edit retains updated value');
    await dismiss();
    const transactionId = await editor.locator('[name=id]').inputValue();
    const deletion = page.locator('form').filter({ has: page.locator(`input[name=id][value="${transactionId}"]`) }).filter({ hasNot: page.locator('[name=note]') }).first();
    page.once('dialog', (dialog) => dialog.accept());
    await deletion.getByRole('button').click();
    await expectSuccess('Færslunni var eytt.');
    assert.equal(await deletion.count(), 0, 'Notification survives deletion of its form');
    await dismiss();

    await newTransaction.locator('[name=note]').fill(note + ' rejected');
    await newTransaction.locator('[name=amount]').fill('4567');
    await control({ failNextTable: 'transactions' });
    await newTransaction.getByRole('button').click();
    await failure.waitFor();
    assert.equal(await success.count(), 0, 'Rejected write never reports success');
    assert.equal(await newTransaction.locator('[name=note]').inputValue(), note + ' rejected', 'Failure retains input');
    assert(!(await newTransaction.getByRole('button').isDisabled()), 'Failure unlocks form');
    await page.getByRole('button', { name: 'Loka skilaboðum' }).click();
    console.log('PASS transactions: create, repeated create, edit, pending/duplicate protection, error and retained input');

    await goto('/savings-goals');
    const bucketForm = page.locator('form').filter({ has: page.getByRole('button', { name: 'Vista heildarupphæð', exact: true, includeHidden: true }) }).first();
    await bucketForm.evaluate((form) => { form.closest('details').open = true; });
    await bucketForm.locator('[name=amount]').fill('4700000');
    await bucketForm.getByRole('button').click();
    await expectSuccess('Heildarupphæð sparnaðar var uppfærð.');
    assert.equal(await bucketForm.locator('[name=amount]').inputValue(), '4700000');
    await dismiss();
    await bucketForm.locator('[name=amount]').fill('4800000');
    await bucketForm.getByRole('button').click();
    await expectSuccess('Heildarupphæð sparnaðar var uppfærð.');
    assert.equal(await bucketForm.locator('[name=amount]').inputValue(), '4800000', 'Successive edits keep newest balance');
    await dismiss();
    const addSavings = page.locator('form').filter({ has: page.getByRole('button', { name: 'Bæta við sparnað', exact: true }) }).first();
    await addSavings.locator('[name=amount]').fill('5000');
    await addSavings.getByRole('button').click();
    await expectSuccess('Upphæðinni var bætt við sparnað.');
    assert.equal(new URL(page.url()).search, '', 'Savings feedback does not navigate away');
    const bounds = await success.locator('..').boundingBox();
    assert(bounds.x >= 0 && bounds.x + bounds.width <= 390 && bounds.y >= 72 && bounds.y + bounds.height < 760, 'Mobile notice stays within viewport and clear of navigation');
    await page.screenshot({ path: join(output, 'savings-success-mobile.png') });
    await dismiss();
    console.log('PASS savings: update, repeated update, add contribution, mobile notification layout');

    await goto('/income');
    const income = page.locator('form').filter({ has: page.getByRole('button', { name: 'Skrá tekjur', exact: true }) });
    await income.locator('[name=amount]').fill('10000');
    await income.getByRole('button').click();
    await expectSuccess('Tekjurnar voru skráðar.');
    await dismiss();
    await goto(`/bills?month=${month}`);
    const bill = page.locator('form').filter({ has: page.getByRole('button', { name: 'Bæta við', exact: true }) });
    await bill.locator('[name=name]').fill(note + ' bill');
    await bill.locator('[name=amount]').fill('7000');
    await bill.getByRole('button').click();
    await expectSuccess('Reikningurinn var vistaður fyrir valinn mánuð.');
    assert.equal(new URL(page.url()).search, `?month=${month}`);
    await dismiss();
    console.log('PASS income and bill creation/navigation');

    await goto('/settings');
    const profile = page.locator('form').filter({ has: page.locator('input[name=full_name]') });
    await profile.locator('[name=full_name]').fill('Alex QA');
    await profile.getByRole('button').click();
    await expectSuccess('Notandaupplýsingarnar voru uppfærðar.');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(250); // Let the existing theme color transitions finish.
    await page.screenshot({ path: join(output, 'profile-success-desktop-dark.png') });
    await dismiss();

    await goto(`/transactions?month=${month}&type=expense&success=imported_partial&imported=2&skipped=1`);
    await expectSuccess('2 fluttar inn, 1 sleppt');
    assert.equal(new URL(page.url()).search, `?month=${month}&type=expense`, 'Consumes flash parameters only');
    await dismiss();
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await success.count(), 0, 'Consumed success is not replayed on refresh');
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS profile, desktop dark theme, imported counts and no stale feedback on refresh');
    console.log('Screenshots: ' + output);
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
