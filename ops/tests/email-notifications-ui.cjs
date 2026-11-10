// Local sandbox only. Creates a fresh QA customer; never sends external email.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium, expect } = require('@playwright/test');
const root = path.resolve(__dirname, '../..');
const r = require('node:module').createRequire(path.join(root, 'backend/package.json'));
const env = r('dotenv').parse(fs.readFileSync(path.join(root, 'backend/.env')));
require('../mongodb-windows.cjs').validateNativeUri(env.MONGO_URI);
const profile = JSON.parse(fs.readFileSync(path.join(root, '.workflow-tools/.env.sepay-sandbox')));
const uri = new URL(env.MONGO_URI);
uri.pathname = '/studio_sepay_sandbox';
const base = 'http://localhost:4001',
  api = 'http://127.0.0.1:5013/api';
const evidence = path.join(root, 'audit/approved-email-2026-11-05');
async function main() {
  const client = new (r('mongodb').MongoClient)(uri.toString());
  await client.connect();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const db = client.db();
    assert.equal(db.databaseName, 'studio_sepay_sandbox');
    fs.mkdirSync(evidence, { recursive: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const suffix = Date.now(),
      username = `mango.email.${suffix}`,
      email = `${username}@example.test`,
      password = 'EmailSandbox123!';
    await page.goto(base + '/register');
    await page.getByLabel('Họ tên', { exact: true }).fill('Khách mango thử email');
    await page.getByLabel('Tên đăng nhập', { exact: true }).fill(username);
    await page.getByLabel('Email nhận thông báo (không bắt buộc)', { exact: true }).fill(email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await page.getByLabel('Nhập lại mật khẩu', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
    const login = async (target) => {
      await expect(target.getByRole('heading', { name: 'Đăng nhập', exact: true })).toBeVisible();
      await target.getByLabel('Tên đăng nhập', { exact: true }).fill(username);
      await target.getByLabel('Mật khẩu', { exact: true }).fill(password);
      await target.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    };
    await login(page);
    await page.getByRole('link', { name: 'Cập nhật email' }).click();
    await expect(page.getByLabel('Email', { exact: true })).toHaveValue(email);
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Đã ghi nhận yêu cầu xác minh email.' }),
    ).toBeVisible();
    const user = await db.collection('users').findOne({ username });
    const waitMail = async (kind) => {
      let job;
      await expect
        .poll(
          async () => {
            job = await db.collection('emailoutboxes').findOne({ user: user._id, kind });
            return job?.status;
          },
          { timeout: 30000 },
        )
        .toBe('sent');
      assert.equal(job.mode, 'test');
      assert.ok(job.providerId.startsWith('test-'));
      return job;
    };
    const verification = await waitMail('verify_email');
    const href = verification.testMessage.text.match(
      /https?:\/\/\S+\/account\/verify-email#token=[a-f0-9]+/,
    )[0];
    const guest = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const verifiedPage = await guest.newPage();
    verifiedPage.setDefaultTimeout(20000);
    await verifiedPage.goto(href);
    await login(verifiedPage);
    await expect(
      verifiedPage.getByRole('heading', { name: 'Xác minh email nhận thông báo' }),
    ).toBeVisible();
    await verifiedPage.getByRole('button', { name: 'Xác minh email', exact: true }).click();
    await expect(
      verifiedPage.getByRole('status').filter({ hasText: 'Email đã được xác minh' }),
    ).toBeVisible();
    assert.equal(new URL(verifiedPage.url()).hash, '');
    await verifiedPage.goto(base + '/account/profile');
    await expect(verifiedPage.getByText('Email đã được xác minh.', { exact: true })).toBeVisible();
    for (const width of [1440, 390]) {
      await verifiedPage.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      assert.ok(
        await verifiedPage.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      );
      await verifiedPage.screenshot({
        path: path.join(evidence, `profile-${width}.png`),
        fullPage: true,
      });
    }
    const customerToken = await verifiedPage.evaluate(() => localStorage.getItem('token'));
    const admin = await db.collection('users').findOne({ roles: { $in: [0, 1] } });
    const adminToken = r('jsonwebtoken').sign({ id: String(admin._id) }, profile.jwtSecret, {
      expiresIn: '10m',
    });
    const call = async (route, data, token = customerToken, method = data ? 'POST' : 'GET') => {
      const response = await fetch(api + route, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `email-browser-${Date.now()}`,
        },
        ...(data ? { body: JSON.stringify(data) } : {}),
      });
      const body = await response.json();
      assert.ok(response.ok, body.message);
      return body.data;
    };
    const pkg = await db.collection('packages').findOne({ name: '[Sandbox] Gói chụp thử QR' });
    const photo = await db.collection('users').findOne({ roles: 3, isActive: true });
    let day = new Date(Date.now() + 150 * 86400000).toISOString().slice(0, 10);
    while (
      (await db
        .collection('schedules')
        .findOne({ shootDate: new Date(`${day}T00:00:00+07:00`), status: { $ne: 'cancelled' } })) ||
      (await db.collection('bookingworkflows').findOne({
        'quote.proposedSchedule.shootDate': new Date(`${day}T00:00:00+07:00`),
        'packageReservation.status': 'held',
      }))
    )
      day = new Date(Date.parse(`${day}T12:00:00+07:00`) + 86400000).toISOString().slice(0, 10);
    const booking = await call('/bookings', {
      packageId: String(pkg._id),
      members: 1,
      className: '[Sandbox] Lớp thử email',
      contactName: 'Khách thử email',
      phone: '0901234567',
      location: 'Studio sandbox',
      startAt: `${day}T08:00:00+07:00`,
      endAt: `${day}T12:00:00+07:00`,
      students: [{ name: 'Học sinh thử', phone: '0901234567', pantsSize: '28', shirtSize: 'M' }],
      packageAgreement: {
        accepted: true,
        pricePerMember: pkg.pricePerMember,
        depositPercent: pkg.depositPercent,
        holdHours: pkg.depositHoldHours,
        detailsVersion: pkg.detailsVersion,
        updatedAt: pkg.updatedAt.toISOString(),
      },
    });
    await call(
      `/bookings/${booking._id}/workflow/actions`,
      { expectedVersion: 0, action: 'photographer.assign', photographerId: String(photo._id) },
      adminToken,
    );
    await call(
      `/bookings/${booking._id}/review`,
      { status: 'approved', note: 'Duyệt kiểm thử thông báo email' },
      adminToken,
      'PATCH',
    );
    const approved = await waitMail('deposit_approved');
    assert.equal(
      await db.collection('emailoutboxes').countDocuments({
        booking: new (r('mongodb').ObjectId)(booking._id),
        kind: 'deposit_approved',
      }),
      1,
    );
    fs.writeFileSync(path.join(evidence, 'approval-email.html'), approved.testMessage.html);
    const preview = await browser.newPage({ viewport: { width: 760, height: 900 } });
    await preview.setContent(approved.testMessage.html);
    await preview.screenshot({ path: path.join(evidence, 'approval-email.png'), fullPage: true });
    const orderHref = await preview
      .getByRole('link', { name: 'Xem đơn và thanh toán cọc' })
      .getAttribute('href');
    await verifiedPage.goto(orderHref);
    await expect(
      verifiedPage.getByRole('heading', { name: 'Thanh toán tiền cọc', exact: true }),
    ).toBeVisible();
    await verifiedPage
      .getByRole('region', { name: 'Thanh toán tiền cọc', exact: true })
      .screenshot({ path: path.join(evidence, 'deposit-after-email.png') });
    console.log(
      JSON.stringify({
        database: db.databaseName,
        mode: 'test-no-external-email',
        checks: [
          'register-with-email',
          'profile-request',
          'guest-login-resumes-fragment',
          'explicit-verification',
          'responsive-profile',
          'approval-enqueues-once',
          'email-opens-protected-order-and-qr',
        ],
      }),
    );
  } finally {
    await browser.close();
    await client.close();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
