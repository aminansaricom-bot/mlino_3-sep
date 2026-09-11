// اجرای اختیاری با Playwright موجود در محیط؛ وابستگی جدیدی به برنامه اضافه نمی‌شود.
const { chromium } = require(process.env.MLINO_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

(async () => {
  const output = process.env.MLINO_BROWSER_OUTPUT || path.join(__dirname, '20260911_INTENT_EVIDENCE');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.MLINO_CHROME_BIN });
  const results = [];
  try {
    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(process.env.MLINO_PREVIEW_URL || 'http://127.0.0.1:4179', { waitUntil: 'networkidle' });
      const persistence = () => page.evaluate(async () => ({ local: { ...localStorage }, session: { ...sessionStorage }, databases: (await indexedDB.databases()).map(db => db.name), cookie: document.cookie, url: location.href }));
      const before = await persistence();
      const requests = [];
      page.on('request', request => requests.push(request.url()));
      const open = () => page.getByRole('button', { name: 'دستیار هوشمند' }).click();
      const click = name => page.getByRole('button', { name, exact: true }).click();
      await open();
      assert.equal(await page.locator('#intent-text').count(), 0);
      await click('شروع نشست تازه');
      assert.equal(await page.locator('#intent-text').count(), 0);
      await click('موافقم؛ شروع نشست');
      await page.locator('#intent-text').pressSequentially('نیاز آزمایشی خصوصی');
      assert.equal(await page.locator('#intent-text').inputValue(), 'نیاز آزمایشی خصوصی');
      await click('مرور متن نیاز');
      await click('ادامه به تأیید');
      await click('تأیید همین نسخه');
      await page.getByText('همین نسخه تأیید شد. تطبیق کسب‌وکار همچنان غیرفعال است.').waitFor();
      await page.locator('.foundation-dialog').screenshot({ path: path.join(output, `confirmed-${viewport.width}.png`) });
      await click('اصلاح نیاز');
      assert.equal(await page.getByText('همین نسخه تأیید شد.', { exact: true }).count(), 0);
      await page.locator('#intent-text').fill('متن اصلاح‌شده آزمایشی');
      await click('مرور متن نیاز');
      await click('ادامه به تأیید');
      assert.equal(await page.getByRole('button', { name: 'تأیید همین نسخه', exact: true }).count(), 1);
      await click('مکث نشست');
      assert.equal(await page.getByRole('button', { name: 'تأیید همین نسخه', exact: true }).count(), 0);
      await click('ادامهٔ نشست');
      await click('تأیید همین نسخه');
      await click('این نیاز را نمی‌خواهم');
      assert.equal(await page.locator('#intent-text').inputValue(), '');
      await page.locator('#intent-text').fill('نمونه سوم');
      await click('مرور متن نیاز');
      await click('ادامه به تأیید');
      await click('تأیید همین نسخه');
      await click('لغو رضایت');
      assert.equal(await page.locator('#intent-text').count(), 0);
      assert.equal(await page.getByText('نمونه سوم', { exact: true }).count(), 0);
      assert.deepEqual(await persistence(), before);
      assert.deepEqual(requests, []);
      await click('شروع نشست تازه');
      await click('موافقم؛ شروع نشست');
      assert.equal(await page.locator('#intent-text').inputValue(), '');
      await page.locator('#intent-text').fill('پیش از بازخوانی');
      await page.reload({ waitUntil: 'networkidle' });
      await open();
      await click('شروع نشست تازه');
      await click('موافقم؛ شروع نشست');
      assert.equal(await page.locator('#intent-text').inputValue(), '');
      await page.clock.install();
      await page.locator('#intent-text').fill('نیاز با مهلت نشست');
      await page.clock.fastForward(30 * 60 * 1000 + 1000);
      await page.getByText('زمان این نشست به پایان رسید.', { exact: true }).waitFor();
      assert.equal(await page.locator('#intent-text').count(), 0);
      const bounds = await page.locator('.foundation-dialog').boundingBox();
      assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= viewport.width);
      assert.deepEqual(await persistence(), before);
      assert.deepEqual(errors, []);
      results.push({ viewport, passed: true, storageUnchanged: true, intentRequests: 0, pageErrors: 0,
        checks: ['consent-before-input', 'typing-spaces', 'confirm', 'correct-reconfirm', 'pause-resume', 'reject-clears', 'withdraw-clears', 'new-session-empty', 'reload-empty', 'idle-expiry-with-browser-clock', 'dialog-fits'] });
      await context.close();
    }
    const assetsPath = path.join(__dirname, '../app/dist/assets');
    const buildAssets = fs.readdirSync(assetsPath).sort().map(name => ({ name,
      sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(assetsPath, name))).digest('hex') }));
    fs.writeFileSync(path.join(output, 'browser-results.json'), JSON.stringify({ build: 'production-preview', buildAssets, results }, null, 2));
    console.log(JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
