// Read-only verification of the merged preparation form, saved drafts and one-step Back.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium, expect: baseExpect } = require('@playwright/test');
const expect = baseExpect.configure({ timeout: 60000 });
const root = path.resolve(__dirname, '../..');
const r = require('node:module').createRequire(path.join(root, 'backend/package.json'));
const out = path.join(root, 'audit/concept-preparation-2026-11-12');
async function main() {
  const env = r('dotenv').parse(fs.readFileSync(path.join(root, 'backend/.env')));
  require('../mongodb-windows.cjs').validateNativeUri(env.MONGO_URI);
  const db = await r('mongodb').MongoClient.connect(env.MONGO_URI);
  let browser;
  try {
    const actor = await db.db().collection('users').findOne({ username: 'mango' });
    const family = await db
      .db()
      .collection('conceptpackages')
      .findOne({ name: 'Khoảnh khắc sum vầy', active: true });
    assert.ok(actor);
    assert.ok(family);
    const before = await db.db().collection('conceptorders').countDocuments();
    const token = r('jsonwebtoken').sign({ id: String(actor._id) }, env.JWT_SECRET, {
      expiresIn: '20m',
    });
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({
      viewport: { width: 1487, height: 1058 },
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
      page.getByRole('heading', { name: 'Thông tin buổi chụp', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.concept-preparation-person input')).toHaveCount(3);
    await expect(page.getByLabel('Số người tham gia', { exact: true })).toHaveCount(0);
    await expect(page.getByText('1 người', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Họ tên liên hệ', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Ý tưởng và yêu cầu', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tiếp tục', exact: true })).toHaveCount(1);
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
      if (name !== 'preparation-review')
        await expect(page.getByRole('complementary', { name: 'Thông tin đặt chụp' })).toContainText(
          'Lê Minh Đức',
        );
      await page.evaluate(async () => {
        await document.fonts.ready;
        document.activeElement?.blur();
        scrollTo(0, 0);
      });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true });
    };
    await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Kiểm tra họ tên');
    await page.getByLabel('Họ tên liên hệ', { exact: true }).fill('Mai Anh');
    await page.getByLabel('Số điện thoại', { exact: true }).fill('0912345678');
    await page
      .getByLabel('Ý tưởng và yêu cầu', { exact: true })
      .fill('Mình thích ảnh tự nhiên, ánh sáng dịu và tông màu ấm.');
    await expect(page.getByRole('complementary', { name: 'Thông tin đặt chụp' })).toContainText(
      'Lê Minh Đức',
    );
    await capture('preparation-desktop', { width: 1487, height: 1058 });
    await page.getByLabel(/^Link ảnh mẫu/).fill('https://example.com/style.jpg');
    await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Kiểm tra trước khi đặt cọc', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Người 1 · Size M · 165.5 cm · 55.2 kg', { exact: true }),
    ).toBeVisible();
    assert.ok(page.url().endsWith('/book/review'));
    const reviewBack = await checkBack('Quay lại thông tin buổi chụp', 'costumes');
    await capture('preparation-review', { width: 1487, height: 1058 });
    await reviewBack.click();
    await expect(page.getByLabel('Size người 1', { exact: true })).toHaveValue('M');
    await page.reload();
    await expect(page.getByLabel('Chiều cao người 1', { exact: true })).toHaveValue('165.5');
    await expect(page.getByLabel('Cân nặng người 1', { exact: true })).toHaveValue('55.2');
    await expect(page.getByLabel('Họ tên liên hệ', { exact: true })).toHaveValue('Mai Anh');
    await expect(page.getByLabel(/^Link ảnh mẫu/)).toHaveValue('https://example.com/style.jpg');
    await page.goto(page.url().replace('/book/costumes', '/book/brief'));
    await expect(page).toHaveURL(/\/book\/costumes$/);
    await expect(page.getByLabel('Size người 1', { exact: true })).toHaveValue('M');
    await page.getByLabel(/^Link ảnh mẫu/).fill('');
    await capture('preparation-tablet', { width: 834, height: 1194 });
    await capture('preparation-mobile', { width: 390, height: 844 });
    await capture('preparation-small', { width: 320, height: 844 });
    await page.setViewportSize({ width: 390, height: 844 });
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
    await page.evaluate(
      ({ packageId, photographerId }) =>
        sessionStorage.setItem(
          'yume-concept-draft-v1',
          JSON.stringify({
            ownerId: JSON.parse(localStorage.getItem('user') || '{}')._id,
            packageId,
            startAt: '2026-11-14T07:00:00.000Z',
            photographerId,
            costumes: [],
            wardrobeMeasurements: [],
            contactName: '',
            phone: '',
            people: 1,
            brief: '',
            referencesText: '',
            step: 4,
            key: crypto.randomUUID(),
          }),
        ),
      { packageId: String(family._id), photographerId: String(actor._id) },
    );
    await page.goto(`http://localhost:4001/concept-booking/packages/${family._id}/book/costumes`);
    await page.screenshot({ path: path.join(out, 'family-participant-before-select.png') });
    assert.match(page.url(), /\/book\/costumes$/);
    await expect(
      page.getByRole('heading', { name: 'Thông tin buổi chụp', exact: true }),
    ).toBeVisible();
    const peopleSelect = page.locator('.concept-preparation-people select');
    await expect(peopleSelect).toBeVisible();
    await expect(peopleSelect.locator('option')).toHaveCount(6);
    assert.equal(
      await peopleSelect.evaluate((element) => getComputedStyle(element).backgroundImage),
      'none',
    );
    assert.equal(
      await peopleSelect.evaluate((element) => getComputedStyle(element).backgroundRepeat),
      'no-repeat',
    );
    await peopleSelect.selectOption('4');
    await expect(peopleSelect).toHaveValue('4');
    await page.screenshot({ path: path.join(out, 'family-participant-select.png') });
    assert.deepEqual(calls, []);
    assert.deepEqual(errors, []);
    assert.equal(await db.db().collection('conceptorders').countDocuments(), before);
    fs.writeFileSync(
      path.join(out, 'browser.json'),
      JSON.stringify(
        {
          passed: true,
          measurements: { size: 'M', heightCm: 165.5, weightKg: 55.2 },
          mergedContactAndBrief: true,
          fixedOnePersonPackage: true,
          multiPersonSelector: true,
          nativeParticipantSelector: true,
          directReviewWithoutBriefStep: true,
          legacyBriefRedirect: true,
          draftSurvivesReload: true,
          viewports: [1487, 834, 390, 320],
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
      'Merged contact/measurements/brief, direct review, legacy redirect, draft reload and one-step Back passed on desktop/tablet/mobile; no orders created.',
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
