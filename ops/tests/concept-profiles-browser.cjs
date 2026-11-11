// Read-only browser verification of personal photographer pages and booking handoff.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium, expect: baseExpect } = require('@playwright/test');
const expect = baseExpect.configure({ timeout: 60000 });
const root = path.resolve(__dirname, '../..');
const r = require('node:module').createRequire(path.join(root, 'backend/package.json'));
const out = path.join(root, 'audit/concept-photographer-2026-11-11');
async function main() {
  const env = r('dotenv').parse(fs.readFileSync(path.join(root, 'backend/.env')));
  require('../mongodb-windows.cjs').validateNativeUri(env.MONGO_URI);
  const db = await r('mongodb').MongoClient.connect(env.MONGO_URI);
  let browser, page;
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
    page = await context.newPage();
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
    await expect(page.locator('[data-date="2026-11-14"]')).toBeEnabled();
    await page.locator('[data-date="2026-11-14"]').click();
    await page.getByRole('button', { name: '14:00–15:00', exact: true }).click();
    await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Chọn thợ chụp', exact: true })).toBeVisible();
    const listUrl = page.url();
    const names = ['Lê Minh Đức', 'Nguyễn Gia Bảo', 'Phạm Minh Quân', 'Trần Anh Khoa'];
    const people = await db
      .db()
      .collection('users')
      .find({ name: { $in: names }, roles: 3 })
      .toArray();
    assert.equal(people.length, 4);
    const profiles = [];
    for (const name of names) {
      const person = people.find((p) => p.name === name);
      const response = await context.request.get(
        'http://localhost:4001/api/concepts/photographers/' + person._id,
      );
      assert.equal(response.status(), 200);
      const profile = (await response.json()).data;
      assert.equal(profile.portfolio.length, 6);
      assert.ok(profile.story && profile.tagline && profile.portraitUrl);
      for (const field of ['email', 'phone', 'roles', 'password', 'published'])
        assert.equal(field in profile, false);
      profiles.push(profile);
    }
    assert.equal(new Set(profiles.map((p) => p.tagline)).size, 4);
    assert.equal(new Set(profiles.map((p) => p.portraitUrl)).size, 4);
    const capture = async (name, viewport) => {
      await page.setViewportSize(viewport);
      for (const img of await page.locator('main img').all()) {
        await img.scrollIntoViewIfNeeded();
        await expect(img).toHaveJSProperty('complete', true);
        assert.ok(await img.evaluate((el) => el.naturalWidth > 0));
      }
      await page.evaluate(async () => {
        await document.fonts.ready;
        scrollTo(0, 0);
      });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true });
    };
    await expect(
      page.getByRole('link', { name: 'Xem hồ sơ Lê Minh Đức', exact: true }),
    ).toBeVisible();
    await capture('photographer-list-desktop', { width: 1488, height: 1058 });
    await page.getByRole('link', { name: 'Xem hồ sơ Lê Minh Đức', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Lê Minh Đức', exact: true })).toBeVisible();
    const profileUrl = page.url();
    assert.match(profileUrl, /\/photographers\/[a-f0-9]{24}$/);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Chọn Lê Minh Đức', exact: true })).toBeEnabled();
    await expect(page.locator('.photographer-work-grid figure')).toHaveCount(6);
    await expect(
      page.getByRole('heading', { name: 'Điều tôi chú trọng', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Buổi chụp cùng tôi', exact: true }),
    ).toBeVisible();
    await capture('profile-duc-desktop', { width: 1488, height: 1058 });
    await capture('profile-duc-source-size', { width: 1105, height: 1424 });
    const back = page.getByRole('link', { name: 'Quay lại danh sách thợ', exact: true });
    await back.hover();
    assert.equal(await back.evaluate((el) => getComputedStyle(el).textDecorationLine), 'none');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Chọn Lê Minh Đức', exact: true })).toBeEnabled();
    await capture('profile-duc-tablet', { width: 834, height: 1194 });
    await capture('profile-duc-mobile', { width: 390, height: 844 });
    await capture('profile-duc-compact', { width: 320, height: 844 });
    await page.getByRole('link', { name: 'Quay lại danh sách thợ', exact: true }).click();
    await expect(page).toHaveURL(listUrl);
    await expect(
      page.getByRole('link', { name: 'Xem hồ sơ Nguyễn Gia Bảo', exact: true }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Xem hồ sơ Nguyễn Gia Bảo', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Nguyễn Gia Bảo', exact: true })).toBeVisible();
    await expect(
      page.getByText('Tôi thích khoảnh khắc bạn quên mất máy ảnh.', { exact: true }),
    ).toBeVisible();
    await capture('profile-bao-desktop', { width: 1488, height: 1058 });
    await page.goto(profileUrl);
    await expect(page.getByRole('button', { name: 'Chọn Lê Minh Đức', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Chọn Lê Minh Đức', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/book\/costumes$/);
    await expect(
      page.getByRole('heading', { name: 'Thông tin trang phục', exact: true }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Quay lại chọn thợ', exact: true }).click();
    await expect(page).toHaveURL(listUrl);
    await expect(page.locator('.photographer-selection-card[data-selected="true"]')).toContainText(
      'Lê Minh Đức',
    );
    await expect(page.getByRole('button', { name: 'Tiếp tục', exact: true })).toBeEnabled();
    const guest = await browser.newContext({ viewport: { width: 1488, height: 1058 } });
    const guestPage = await guest.newPage();
    await guestPage.goto(profileUrl);
    await expect(
      guestPage.getByRole('heading', { name: 'Lê Minh Đức', exact: true }),
    ).toBeVisible();
    await expect(
      guestPage.getByRole('button', { name: 'Chọn Lê Minh Đức', exact: true }),
    ).toBeDisabled();
    const family = (
      await (await context.request.get('http://localhost:4001/api/concepts')).json()
    ).data.packages.find((p) => p.name === 'Khoảnh khắc sum vầy');
    for (const [name, slug] of [
      ['Phạm Minh Quân', 'quan'],
      ['Trần Anh Khoa', 'khoa'],
    ]) {
      const person = people.find((p) => p.name === name);
      await guestPage.goto(
        'http://localhost:4001/concept-booking/packages/' +
          family._id +
          '/photographers/' +
          person._id,
      );
      await expect(guestPage.getByRole('heading', { name, exact: true })).toBeVisible();
      for (const img of await guestPage.locator('.photographer-page img').all()) {
        await img.scrollIntoViewIfNeeded();
        await expect(img).toHaveJSProperty('complete', true);
      }
      await guestPage.evaluate(async () => {
        await document.fonts.ready;
        scrollTo(0, 0);
      });
      await guestPage.screenshot({
        path: path.join(out, 'profile-' + slug + '-desktop.png'),
        fullPage: true,
      });
    }
    const admin = await db.db().collection('users').findOne({ roles: 0, isActive: true });
    assert.ok(admin);
    const adminContext = await browser.newContext({ viewport: { width: 1488, height: 1058 } });
    const adminToken = r('jsonwebtoken').sign({ id: String(admin._id) }, env.JWT_SECRET, {
      expiresIn: '10m',
    });
    await adminContext.addInitScript(
      ({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      },
      {
        token: adminToken,
        user: {
          _id: String(admin._id),
          name: admin.name,
          username: admin.username,
          roles: admin.roles,
        },
      },
    );
    const management = await adminContext.newPage();
    await management.goto('http://localhost:4001/settings/concepts');
    await management.getByRole('button', { name: 'Hồ sơ thợ', exact: true }).click();
    await management
      .getByLabel(/^Thợ chụp/)
      .selectOption(String(people.find((p) => p.name === 'Lê Minh Đức')._id));
    await expect(management.getByLabel(/^Câu định vị riêng/)).toHaveValue(
      'Giữ nét riêng của bạn trong từng khung hình.',
    );
    await expect(management.getByLabel('Ảnh chân dung thợ', { exact: true })).toHaveValue(
      '/images/concepts/photographer-minh-duc.webp',
    );
    await expect(management.getByLabel('Đường dẫn ảnh', { exact: true })).toHaveCount(6);
    await management.screenshot({ path: path.join(out, 'profile-management.png') });
    assert.deepEqual(errors, []);
    assert.equal(await db.db().collection('conceptorders').countDocuments(), before);
    fs.writeFileSync(
      path.join(out, 'profiles-browser.json'),
      JSON.stringify(
        {
          passed: true,
          profiles: profiles.map((p) => ({ name: p.name, photos: p.portfolio.length })),
          errors,
          noOrdersCreated: true,
          selection: '2026-11-14 14:00 UTC+7',
          desktop: [1488, 1058],
          tablet: [834, 1194],
          mobile: [390, 844],
          compact: [320, 844],
          guestReadOnly: true,
          adminForm: true,
        },
        null,
        2,
      ),
    );
    console.log(
      'Personal profiles: four distinct profiles, separate routes, reload/back, keyboard selection, guest/public privacy, admin fields, desktop/tablet/mobile passed; no orders created.',
    );
  } catch (failure) {
    if (page) {
      await page
        .screenshot({ path: path.join(out, 'profile-failure.png'), fullPage: true })
        .catch(() => {});
      console.log('Visible alerts:', await page.getByRole('alert').allTextContents());
    }
    throw failure;
  } finally {
    await browser?.close();
    await db.close();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
