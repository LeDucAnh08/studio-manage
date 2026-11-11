// Read-only verification of included wardrobe measurements, one-step Back and yearbook navigation.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium, expect: baseExpect } = require('@playwright/test');
const expect = baseExpect.configure({ timeout: 60000 });
const root = path.resolve(__dirname, '../..');
const r = require('node:module').createRequire(path.join(root, 'backend/package.json'));
const out = path.join(root, 'audit/concept-wardrobe-2026-11-11');
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
    const calls = [];
    page.on('request', (req) => {
      if (new URL(req.url()).pathname.endsWith('/concepts/costumes')) calls.push(req.url());
    });
    await expect(page.getByRole('link', { name: 'Chụp kỉ yếu', exact: true })).toHaveAttribute(
      'href',
      '/account/bookings/new',
    );
    await expect(page.getByRole('link', { name: 'Đặt dịch vụ', exact: true })).toHaveCount(0);
    await expect(page.locator('[data-date="2026-11-14"]')).toBeEnabled();
    await page.locator('[data-date="2026-11-14"]').click();
    await page.getByRole('button', { name: '14:00–15:00', exact: true }).click();
    await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await page.getByRole('link', { name: 'Xem hồ sơ Lê Minh Đức', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Chọn Lê Minh Đức', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Chọn Lê Minh Đức', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Thông tin trang phục', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.concept-measurement-card input')).toHaveCount(3);
    const checkBack = async (text, suffix) => {
      const link = page.getByRole('link', { name: text, exact: true });
      await expect(page.locator('.concept-wizard-back')).toHaveCount(1);
      await expect(link).toHaveAttribute('href', new RegExp('/book/' + suffix + '$'));
      await expect(link.locator('svg')).toHaveCount(1);
      await expect(page.getByRole('button', { name: 'Quay lại', exact: true })).toHaveCount(0);
      await link.hover();
      assert.equal(await link.evaluate((el) => getComputedStyle(el).textDecorationLine), 'none');
      return link;
    };
    await checkBack('Quay lại chọn thợ', 'photographer');
    await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Điền size, chiều cao và cân nặng');
    await page.getByLabel('Size người 1', { exact: true }).fill('M');
    await page.getByLabel('Chiều cao người 1', { exact: true }).fill('165.5');
    await page.getByLabel('Cân nặng người 1', { exact: true }).fill('55.2');
    const capture = async (name, viewport) => {
      await page.setViewportSize(viewport);
      await page.evaluate(async () => {
        await document.fonts.ready;
        scrollTo(0, 0);
      });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true });
    };
    await capture('wardrobe-desktop', { width: 1488, height: 1058 });
    await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Brief cho buổi chụp', exact: true }),
    ).toBeVisible();
    await checkBack('Quay lại thông tin trang phục', 'costumes');
    await page.getByLabel('Họ tên liên hệ', { exact: true }).fill(actor.name || 'Khách');
    await page.getByLabel('Số điện thoại', { exact: true }).fill('0901234567');
    await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Kiểm tra trước khi đặt cọc', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Người 1 · Size M · 165.5 cm · 55.2 kg', { exact: true }),
    ).toBeVisible();
    const reviewBack = await checkBack('Quay lại thông tin buổi chụp', 'brief');
    await capture('wardrobe-review', { width: 1488, height: 1058 });
    await reviewBack.click();
    await page.getByRole('link', { name: 'Quay lại thông tin trang phục', exact: true }).click();
    await expect(page.getByLabel('Size người 1', { exact: true })).toHaveValue('M');
    await page.reload();
    await expect(page.getByLabel('Chiều cao người 1', { exact: true })).toHaveValue('165.5');
    await expect(page.getByLabel('Cân nặng người 1', { exact: true })).toHaveValue('55.2');
    await capture('wardrobe-mobile', { width: 390, height: 844 });
    await page.getByRole('button', { name: 'Mở menu điều hướng', exact: true }).click();
    const mobile = page
      .getByRole('dialog')
      .getByRole('navigation', { name: 'Điều hướng chính trên điện thoại' });
    await expect(mobile.getByRole('link', { name: 'Chụp kỉ yếu', exact: true })).toHaveAttribute(
      'href',
      '/account/bookings/new',
    );
    await expect(mobile.getByRole('link', { name: 'Đặt dịch vụ', exact: true })).toHaveCount(0);
    await page.screenshot({ path: path.join(out, 'yearbook-mobile-menu.png') });
    await page.keyboard.press('Escape');
    await page.getByRole('link', { name: 'Quay lại chọn thợ', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Chọn thợ chụp', exact: true })).toBeVisible();
    const photographerBack = await checkBack('Quay lại chọn thời gian', 'date');
    await photographerBack.click();
    await expect(
      page.getByRole('heading', { name: 'Chọn thời gian buổi chụp', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.concept-time-buttons button[aria-pressed="true"]')).toHaveText(
      '14:00–15:00',
    );
    assert.deepEqual(calls, []);
    assert.deepEqual(errors, []);
    assert.equal(await db.db().collection('conceptorders').countDocuments(), before);
    fs.writeFileSync(
      path.join(out, 'browser.json'),
      JSON.stringify(
        {
          passed: true,
          measurements: { size: 'M', heightCm: 165.5, weightKg: 55.2 },
          oneStepBack: true,
          arrows: true,
          noUnderlines: true,
          yearbookDesktopMobile: true,
          noCostumeCatalogRequests: true,
          noOrdersCreated: true,
          errors,
        },
        null,
        2,
      ),
    );
    console.log(
      'Wardrobe measurements, reload/review, one-step arrow Back and yearbook labels desktop/mobile passed; no orders created.',
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
