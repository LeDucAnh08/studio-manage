// Read-only desktop/mobile verification of the selected time-picker design.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium, expect: baseExpect } = require('@playwright/test');
const expect = baseExpect.configure({ timeout: 60000 });
const root = path.resolve(__dirname, '../..');
const r = require('node:module').createRequire(path.join(root, 'backend/package.json'));
const out = path.join(root, 'audit/concept-time-2026-11-11');
async function main() {
  const env = r('dotenv').parse(fs.readFileSync(path.join(root, 'backend/.env')));
  require('../mongodb-windows.cjs').validateNativeUri(env.MONGO_URI);
  const db = await r('mongodb').MongoClient.connect(env.MONGO_URI);
  let browser;
  try {
    const actor = await db.db().collection('users').findOne({ username: 'mango' });
    assert.ok(actor);
    const before = await db.db().collection('conceptorders').countDocuments();
    const token = r('jsonwebtoken').sign({ id: String(actor._id) }, env.JWT_SECRET, {
      expiresIn: '20m',
    });
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({
      viewport: { width: 1488, height: 1058 },
      deviceScaleFactor: 1,
      timezoneId: 'America/Los_Angeles',
    });
    await context.addInitScript(
      ({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      },
      {
        token,
        user: {
          _id: String(actor._id),
          username: actor.username,
          name: actor.name,
          roles: actor.roles,
        },
      },
    );
    const page = await context.newPage();
    page.setDefaultTimeout(90000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    fs.mkdirSync(out, { recursive: true });
    await page.goto('http://localhost:4001/concept-booking');
    await page.getByRole('link', { name: 'Xem chi tiết Chân dung Tự nhiên' }).click();
    await page.getByRole('button', { name: 'Chọn gói này', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Chọn thời gian buổi chụp', exact: true }),
    ).toBeVisible();
    const dateUrl = page.url();
    const started = Date.now();
    await expect(page.locator('[data-date="2026-11-14"]')).toBeEnabled();
    const monthLoadMs = Date.now() - started;
    await expect(page.locator('[data-date="2026-11-10"]')).toBeDisabled();
    assert.equal(
      await page
        .locator('.concept-month-grid tbody tr:first-child td:last-child button')
        .textContent(),
      '1',
    );
    await expect(page.getByRole('button', { name: 'Tháng trước', exact: true })).toBeDisabled();
    const chooseReference = async () => {
      await expect(page.locator('[data-date="2026-11-14"]')).toBeEnabled();
      await page.locator('[data-date="2026-11-14"]').click();
      await page.getByRole('button', { name: '14:00–15:00', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Tiếp tục', exact: true })).toBeEnabled();
    };
    const capture = async (name, viewport) => {
      await page.setViewportSize(viewport);
      await expect(page.locator('.concept-time-buttons button[aria-pressed="true"]')).toHaveText(
        '14:00–15:00',
      );
      await page.evaluate(async () => {
        await document.fonts.ready;
        window.scrollTo(0, 0);
      });
      const img = page.locator('.concept-time-package img');
      await expect(img).toHaveJSProperty('complete', true);
      assert.ok(await img.evaluate((node) => node.naturalWidth > 0));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true });
    };
    await chooseReference();
    await expect(
      page.getByRole('link', { name: 'Quay lại chi tiết gói', exact: true }),
    ).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Quay lại', exact: true })).toHaveCount(0);
    await capture('time-desktop', { width: 1488, height: 1058 });
    await page.getByRole('button', { name: 'Tháng sau', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tháng 12, 2026', exact: true })).toBeVisible();
    await expect(page.locator('[data-date="2026-12-31"]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Tháng trước', exact: true }).click();
    await expect(page.locator('[data-date="2026-11-15"]')).toBeEnabled();
    await page.locator('[data-date="2026-11-15"]').click();
    await expect(page.getByRole('button', { name: 'Tiếp tục', exact: true })).toBeDisabled();
    await chooseReference();
    await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Chọn thợ chụp', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Xem hồ sơ / }).first()).toBeVisible();
    await page.getByRole('link', { name: 'Quay lại chọn thời gian', exact: true }).click();
    await expect(page).toHaveURL(dateUrl);
    await expect(page.locator('.concept-time-buttons button[aria-pressed="true"]')).toHaveText(
      '14:00–15:00',
    );
    await page.reload();
    await expect(page.locator('.concept-time-buttons button[aria-pressed="true"]')).toHaveText(
      '14:00–15:00',
    );
    await expect(page.getByRole('button', { name: 'Tiếp tục', exact: true })).toBeEnabled();
    await capture('time-tablet', { width: 834, height: 1194 });
    await capture('time-mobile', { width: 390, height: 844 });
    await capture('time-compact', { width: 320, height: 844 });
    await page.getByRole('button', { name: '14:30–15:30', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.concept-time-confirmation')).toContainText('14:30–15:30');
    await page.getByRole('link', { name: 'Quay lại chi tiết gói', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Chân dung Tự nhiên', exact: true }),
    ).toBeVisible();
    assert.deepEqual(errors, []);
    assert.equal(await db.db().collection('conceptorders').countDocuments(), before);
    fs.writeFileSync(
      path.join(out, 'time-browser.json'),
      JSON.stringify(
        {
          passed: true,
          monthLoadMs,
          errors,
          timezone: 'America/Los_Angeles',
          studioSelection: '2026-11-14 14:00–15:00 UTC+7',
          noOrdersCreated: true,
          desktop: [1488, 1058],
          tablet: [834, 1194],
          mobile: [390, 844],
        },
        null,
        2,
      ),
    );
    console.log(
      'Time picker: month/day/time, limits, retry navigation, keyboard, reload and desktop/tablet/mobile passed; no orders created. Month load ms:',
      monthLoadMs,
    );
  } finally {
    await browser?.close();
    await db.close();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
