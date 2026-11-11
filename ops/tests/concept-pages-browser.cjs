// Read-only UI verification against the local application; never checks out an order.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium, expect } = require('@playwright/test');
const root = path.resolve(__dirname, '../..');
const r = require('node:module').createRequire(path.join(root, 'backend/package.json'));
const out = path.join(root, 'audit/concept-pages-2026-11-11');

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
    page.setDefaultTimeout(30000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const readyImages = async () => {
      for (const img of await page.locator('main img').all()) {
        await img.scrollIntoViewIfNeeded();
        await expect(img).toHaveJSProperty('complete', true);
        assert.ok(await img.evaluate((node) => node.naturalWidth > 0));
      }
      await page.evaluate(async () => {
        await document.fonts.ready;
        scrollTo(0, 0);
      });
    };
    fs.mkdirSync(out, { recursive: true });
    await page.goto('http://localhost:4001/concept-booking');
    await expect(
      page.getByRole('heading', { name: 'Chọn gói chụp phù hợp với bạn' }),
    ).toBeVisible();
    await expect(page.locator('.concept-catalog-card')).toHaveCount(6);
    await expect(page.getByRole('button', { name: 'Chọn gói này' })).toHaveCount(0);
    await expect(page.getByRole('list', { name: 'Các bước đặt chụp' })).toHaveCount(0);
    await readyImages();
    await page.screenshot({ path: path.join(out, 'catalog-desktop.png') });
    await page.getByRole('button', { name: 'Cặp đôi', exact: true }).click();
    await expect(page.locator('.concept-catalog-card')).toHaveCount(1);
    await page.getByRole('link', { name: 'Xem chi tiết Hẹn hò tại studio' }).click();
    await expect(page).toHaveURL(/\/concept-booking\/packages\/[a-f0-9]{24}$/);
    await page.getByRole('link', { name: 'Quay lại danh sách gói', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Cặp đôi', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: 'Tất cả', exact: true }).click();
    await page.getByRole('link', { name: 'Xem chi tiết Chân dung Tự nhiên' }).click();
    const detailUrl = page.url();
    await expect(
      page.getByRole('heading', { name: 'Studio đồng hành cùng bạn', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.concept-support-grid article')).toHaveCount(4);
    await expect(
      page.getByRole('heading', { name: 'Bộ ảnh bạn nhận được', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.concept-delivery-facts > div')).toHaveCount(3);
    await expect(
      page.getByRole('heading', { name: 'Phong cách bộ ảnh', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.concept-showcase-grid figure')).toHaveCount(2);
    await page
      .locator('section')
      .filter({
        has: page.getByRole('heading', { name: 'Studio đồng hành cùng bạn', exact: true }),
      })
      .screenshot({ path: path.join(out, 'support-desktop.png') });
    await expect(
      page.getByRole('heading', { name: 'Decor & bối cảnh', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.concept-decor-grid > div')).toHaveCount(4);
    await page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Decor & bối cảnh', exact: true }) })
      .screenshot({ path: path.join(out, 'decor-desktop.png') });
    await expect(
      page.getByRole('heading', { name: 'Chân dung Tự nhiên', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.concept-reference-grid figure')).toHaveCount(8);
    await readyImages();
    await page.screenshot({ path: path.join(out, 'detail-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: /Xem ảnh giới thiệu 1:/ }).click();
    await expect(page.getByRole('dialog')).toContainText('1 / 2');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('dialog')).toContainText('2 / 2');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /Xem ảnh 1:/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('dialog')).toContainText('2 / 8');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const cta = page.getByRole('button', { name: 'Chọn gói này', exact: true });
    assert.ok(
      await cta.evaluate(
        (button) =>
          !!(
            document.querySelector('.concept-package-charges').compareDocumentPosition(button) &
            Node.DOCUMENT_POSITION_FOLLOWING
          ),
      ),
    );
    await cta.click();
    await expect(page).toHaveURL(/\/book\/date$/);
    await expect(page.getByRole('heading', { name: 'Chọn thời gian buổi chụp' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Chọn thời gian buổi chụp' })).toBeVisible();
    await page.getByRole('link', { name: 'Quay lại chi tiết gói', exact: true }).click();
    await expect(page).toHaveURL(detailUrl);
    await expect(
      page.getByRole('heading', { name: 'Chân dung Tự nhiên', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Chụp concept', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page.locator('.concept-reference-grid figure')).toHaveCount(8);
    await page.setViewportSize({ width: 390, height: 844 });
    await readyImages();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: path.join(out, 'detail-mobile.png'), fullPage: true });
    await page
      .locator('section')
      .filter({
        has: page.getByRole('heading', { name: 'Studio đồng hành cùng bạn', exact: true }),
      })
      .screenshot({ path: path.join(out, 'support-mobile.png') });
    await page.getByRole('link', { name: 'Quay lại danh sách gói', exact: true }).click();
    await expect(page.locator('.concept-catalog-card')).toHaveCount(6);
    await readyImages();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: path.join(out, 'catalog-mobile.png'), fullPage: true });
    assert.deepEqual(errors, []);
    assert.equal(await db.db().collection('conceptorders').countDocuments(), before);
    fs.writeFileSync(
      path.join(out, 'browser.json'),
      JSON.stringify(
        {
          passed: true,
          errors,
          packages: 6,
          galleryPhotos: 8,
          noOrdersCreated: true,
          viewport: [1488, 1058],
          mobile: [390, 844],
        },
        null,
        2,
      ),
    );
    console.log(
      'Concept catalog/detail: filters, navigation, gallery, reload, desktop/mobile passed; no orders created.',
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
