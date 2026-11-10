// Local sandbox: direct private uploads, gallery, feedback and redelivery.
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const { createHmac, randomUUID } = require('node:crypto');
const { chromium, expect } = require('@playwright/test');
const root = path.resolve(__dirname, '../..'),
  r = require('node:module').createRequire(path.join(root, 'backend/package.json'));
const env = r('dotenv').parse(fs.readFileSync(path.join(root, 'backend/.env')));
require('../mongodb-windows.cjs').validateNativeUri(env.MONGO_URI);
const profile = JSON.parse(fs.readFileSync(path.join(root, '.workflow-tools/.env.sepay-sandbox')));
const uri = new URL(env.MONGO_URI);
uri.pathname = '/studio_sepay_sandbox';
const origin = 'http://127.0.0.1:4013',
  api = 'http://127.0.0.1:5013/api';
const evidence = path.join(root, 'audit/private-delivery-2026-11-06');
async function main() {
  const dbClient = new (r('mongodb').MongoClient)(uri.toString());
  await dbClient.connect();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const db = dbClient.db();
    assert.equal(db.databaseName, 'studio_sepay_sandbox');
    fs.mkdirSync(evidence, { recursive: true });
    const user = await db.collection('users').findOne({ username: 'mango' }),
      admin = await db.collection('users').findOne({ roles: { $in: [0, 1] } }),
      photo = await db.collection('users').findOne({ roles: 3, isActive: true });
    const pkg = await db.collection('packages').findOne({ name: '[Sandbox] Gói chụp thử QR' });
    const token = (actor) =>
      r('jsonwebtoken').sign({ id: String(actor._id) }, profile.jwtSecret, { expiresIn: '15m' });
    const call = async (route, actor, data, method = data ? 'POST' : 'GET') => {
      const response = await fetch(api + route, {
        method,
        headers: {
          Authorization: `Bearer ${token(actor)}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `delivery-ui-${randomUUID()}`,
        },
        ...(data ? { body: JSON.stringify(data) } : {}),
      });
      const body = await response.json();
      assert.ok(response.ok, body.message);
      return body.data;
    };
    let day = new Date(Date.now() + 210 * 86400000).toISOString().slice(0, 10);
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
    const booking = await call('/bookings', user, {
      packageId: String(pkg._id),
      members: 1,
      className: '[Mẫu mango] Album hậu kỳ',
      contactName: user.name,
      phone: '0901234567',
      startAt: `${day}T08:00:00+07:00`,
      endAt: `${day}T12:00:00+07:00`,
      location: 'Studio sandbox',
      students: [
        { name: 'Học sinh thử album', phone: '0901234567', pantsSize: '28', shirtSize: 'M' },
      ],
      packageAgreement: {
        accepted: true,
        pricePerMember: pkg.pricePerMember,
        depositPercent: pkg.depositPercent,
        holdHours: pkg.depositHoldHours,
        detailsVersion: pkg.detailsVersion,
        updatedAt: pkg.updatedAt.toISOString(),
      },
    });
    const action = async (data) => {
      const detail = await call(`/bookings/${booking._id}/workflow`, admin);
      return call(`/bookings/${booking._id}/workflow/actions`, admin, {
        expectedVersion: detail.workflow.version,
        ...data,
      });
    };
    await action({ action: 'photographer.assign', photographerId: String(photo._id) });
    await call(
      `/bookings/${booking._id}/review`,
      admin,
      { status: 'approved', note: 'Duyệt để kiểm thử album riêng tư' },
      'PATCH',
    );
    const approved = await call(`/bookings/${booking._id}/workflow`, user),
      payment = approved.workflow.depositPayment;
    const timestamp = String(Math.floor(Date.now() / 1000)),
      payload = JSON.stringify({
        id: Date.now(),
        gateway: 'MBBank',
        accountNumber: 'SBSTUDIO001',
        code: payment.reference,
        content: payment.reference,
        transferType: 'in',
        transferAmount: payment.amount,
        transactionDate: new Date(Date.now() + 7 * 3600000)
          .toISOString()
          .slice(0, 19)
          .replace('T', ' '),
        referenceCode: `DELIVERY-UI-${Date.now()}`,
      });
    const paid = await fetch(api + '/payments/sepay/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SePay-Timestamp': timestamp,
        'X-SePay-Signature': `sha256=${createHmac('sha256', profile.webhookSecret).update(`${timestamp}.${payload}`).digest('hex')}`,
      },
      body: payload,
    });
    assert.equal(paid.status, 200);
    await action({ action: 'progress.update', status: 'shooting' });
    await action({ action: 'progress.update', status: 'editing' });
    const context = async (actor) => {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      await ctx.addInitScript(
        ({ token, user }) => {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
        },
        {
          token: token(actor),
          user: {
            _id: String(actor._id),
            username: actor.username,
            name: actor.name,
            roles: actor.roles,
          },
        },
      );
      return ctx;
    };
    const staff = await context(admin),
      customer = await context(user),
      staffPage = await staff.newPage(),
      page = await customer.newPage();
    staffPage.setDefaultTimeout(20000);
    page.setDefaultTimeout(20000);
    const sample = (name, source) => ({
      name,
      mimeType: 'image/webp',
      buffer: fs.readFileSync(
        path.join(root, 'frontend/src/assets/images/customer-portfolio', source),
      ),
    });
    await staffPage.goto(`${origin}/workflow-bookings/${booking._id}`);
    await staffPage.getByRole('link', { name: 'Xem ảnh bàn giao', exact: true }).click();
    await staffPage.getByRole('tab', { name: 'Ảnh đã chỉnh', exact: true }).click();
    await staffPage.getByText('Tải ảnh trực tiếp lên hệ thống', { exact: true }).click();
    const input = staffPage.getByLabel('Ảnh đã hậu kỳ', { exact: true });
    await expect(input).toBeEnabled();
    await input.setInputFiles([
      sample('hau-ky-tap-the.webp', 'tnv00451-640.webp'),
      sample('hau-ky-chan-dung.webp', 'may01381-640.webp'),
    ]);
    await expect(staffPage.getByText('2 ảnh đã tải', { exact: true })).toBeVisible();
    await staffPage.getByRole('button', { name: 'Gửi ảnh tải lên', exact: true }).click();
    await expect(staffPage.getByLabel('Phiên bản ảnh')).toHaveValue('1');
    await page.goto(`${origin}/account/bookings/${booking._id}`);
    await page.getByRole('link', { name: 'Xem ảnh bàn giao' }).click();
    await expect(page.getByRole('heading', { name: 'Album bàn giao' })).toBeVisible();
    await page.waitForFunction(() => {
      const img = document.querySelector('.delivery-gallery__viewer img');
      return img?.complete && img.naturalWidth > 0;
    });
    const detail = await call(`/bookings/${booking._id}/workflow`, user),
      photoId = detail.workflow.progress.photos[0].id;
    assert.equal(detail.workflow.progress.photos.length, 2);
    assert.equal(
      (
        await customer.request.get(`${api}/bookings/${booking._id}/delivery/photos/${photoId}`)
      ).status(),
      401,
    );
    const denied = await customer.request.get(
      `${origin}/@fs/${path.join(root, '.data/private-delivery', `${photoId}.jpg`).replaceAll('\\', '/')}`,
    );
    assert.equal(denied.status(), 403);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      );
      await page.screenshot({ path: path.join(evidence, `album-${width}.png`), fullPage: true });
    }
    const note = 'Ảnh hau-ky-tap-the cần tăng sáng nhẹ và giữ màu da tự nhiên.';
    await page.getByLabel('Nội dung phản hồi').fill(note);
    await page.getByRole('button', { name: 'Gửi phản hồi' }).click();
    await expect(page.getByText(note, { exact: true })).toBeVisible();
    await staffPage.reload();
    await expect(staffPage.getByText(note, { exact: true })).toBeVisible();
    await staffPage.screenshot({
      path: path.join(evidence, 'studio-feedback.png'),
      fullPage: true,
    });
    await staffPage.getByRole('button', { name: 'Chuyển sang hậu kỳ', exact: true }).click();
    await staffPage.getByText('Tải ảnh trực tiếp lên hệ thống', { exact: true }).click();
    await expect(staffPage.getByLabel('Ảnh đã hậu kỳ', { exact: true })).toBeEnabled();
    await staffPage
      .getByLabel('Ảnh đã hậu kỳ', { exact: true })
      .setInputFiles(sample('hau-ky-ban-chinh-sua.webp', 'pbi00061-640.webp'));
    await expect(staffPage.getByText('3 ảnh đã tải', { exact: true })).toBeVisible();
    await staffPage.getByRole('button', { name: 'Gửi ảnh tải lên', exact: true }).click();
    await expect(staffPage.getByLabel('Phiên bản ảnh')).toHaveValue('2');
    await page.reload();
    await expect(page.getByLabel('Phiên bản ảnh')).toHaveValue('2');
    await page.getByLabel('Phiên bản ảnh').selectOption('1');
    await expect(page.getByRole('button', { name: 'Gửi phản hồi' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Xác nhận ảnh đã đạt yêu cầu' })).toHaveCount(0);
    await page.getByLabel('Phiên bản ảnh').selectOption('2');
    await expect(page.getByRole('button', { name: 'Gửi phản hồi' })).toBeDisabled();
    const latest = await call(`/bookings/${booking._id}/workflow`, user);
    assert.equal(latest.workflow.progress.deliveryVersion, 2);
    assert.equal(latest.workflow.progress.photos.length, 3);
    assert.ok(latest.workflow.progress.revisionRequests[0].resolvedAt);
    console.log(
      JSON.stringify({
        bookingId: booking._id,
        mode: 'local-sandbox',
        checks: [
          'staff-direct-upload',
          'private-auth-images',
          'vite-private-storage-denied',
          'dedicated-customer-album',
          'mobile-no-overflow',
          'feedback-visible-to-studio',
          'redelivery-preserves-history',
          'old-version-read-only',
        ],
      }),
    );
  } finally {
    await browser.close();
    await dbClient.close();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
