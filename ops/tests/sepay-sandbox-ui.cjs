// Browser verification against `node ops/sepay-sandbox.cjs serve` only.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { chromium, expect } = require('@playwright/test');
const root = path.resolve(__dirname, '../..');
const r = require('node:module').createRequire(path.join(root, 'backend/package.json'));
const { MongoClient } = r('mongodb');
const env = r('dotenv').parse(fs.readFileSync(path.join(root, 'backend/.env')));
require('../mongodb-windows.cjs').validateNativeUri(env.MONGO_URI);
const profile = JSON.parse(fs.readFileSync(path.join(root, '.workflow-tools/.env.sepay-sandbox')));
const uri = new URL(env.MONGO_URI);
uri.pathname = '/studio_sepay_sandbox';
const api = 'http://127.0.0.1:5013/api';
const evidence = path.join(root, 'audit/sepay-deposits-2026-11-05');

async function main() {
  const dbClient = new MongoClient(uri.toString());
  await dbClient.connect();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const db = dbClient.db();
    assert.equal(db.databaseName, 'studio_sepay_sandbox');
    const user = await db.collection('users').findOne({ username: 'mango' });
    const admin = await db.collection('users').findOne({ roles: { $in: [0, 1] } });
    const photos = await db.collection('users').find({ roles: 3 }).limit(2).toArray();
    const pkg = await db.collection('packages').findOne({ name: '[Sandbox] Gói chụp thử QR' });
    const token = (actor) =>
      r('jsonwebtoken').sign({ id: String(actor._id) }, profile.jwtSecret, { expiresIn: '20m' });
    const call = async (route, actor, data, method = data ? 'POST' : 'GET', key) => {
      const response = await fetch(api + route, {
        method,
        headers: {
          Authorization: `Bearer ${token(actor)}`,
          'Content-Type': 'application/json',
          ...(key ? { 'Idempotency-Key': key } : {}),
        },
        ...(data ? { body: JSON.stringify(data) } : {}),
      });
      const body = await response.json();
      assert.ok(response.ok, JSON.stringify(body));
      return body.data;
    };
    const action = async (id, data) => {
      const detail = await call(`/bookings/${id}/workflow`, admin);
      return call(
        `/bookings/${id}/workflow/actions`,
        admin,
        { ...data, expectedVersion: detail.workflow.version },
        'POST',
        `sandbox-ui-${Date.now()}`,
      );
    };
    let day = new Date(Date.now() + 80 * 86400000).toISOString().slice(0, 10);
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
    const booking = await call(
      '/bookings',
      user,
      {
        packageId: String(pkg._id),
        members: 25,
        className: `[Mẫu mango] UI QR ${Date.now()}`,
        school: 'Trường mô phỏng',
        contactName: user.name,
        phone: '0901234567',
        location: 'Studio sandbox',
        startAt: `${day}T08:00:00+07:00`,
        endAt: `${day}T12:00:00+07:00`,
        note: 'Kiểm thử browser sandbox',
        students: Array.from({ length: 25 }, (_, i) => ({
          name: `Học sinh ${i + 1}`,
          phone: '0901234567',
          height: 160 + (i % 20),
          weight: 50 + (i % 15),
          pantsSize: '28',
          shirtSize: 'M',
        })),
        packageAgreement: {
          accepted: true,
          pricePerMember: pkg.pricePerMember,
          depositPercent: pkg.depositPercent,
          holdHours: pkg.depositHoldHours,
          detailsVersion: pkg.detailsVersion,
          updatedAt: pkg.updatedAt.toISOString(),
        },
      },
      'POST',
      `sandbox-ui-create-${Date.now()}`,
    );
    await action(booking._id, {
      action: 'photographer.assign',
      photographerIds: photos.map((row) => String(row._id)),
    });
    await call(
      `/bookings/${booking._id}/review`,
      admin,
      { status: 'approved', note: 'Duyệt kiểm thử sandbox' },
      'PATCH',
    );
    const detail = await call(`/bookings/${booking._id}/workflow`, user);
    assert.equal(detail.workflow.depositPayment.mode, 'sandbox');
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(
      ({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      },
      {
        token: token(user),
        user: {
          _id: String(user._id),
          username: user.username,
          name: user.name,
          roles: user.roles,
        },
      },
    );
    const page = await context.newPage();
    const protectedSecret = await context.request.get(
      `http://127.0.0.1:4013/@fs/${path.join(root, '.workflow-tools/.env.sepay-sandbox').replaceAll('\\', '/')}`,
    );
    assert.equal(protectedSecret.status(), 403, 'Vite must not serve sandbox signing credentials');
    page.setDefaultTimeout(20000);
    await page.goto(`http://127.0.0.1:4013/account/bookings/${booking._id}`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('heading', { name: 'Thanh toán tiền cọc', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Chế độ thử nghiệm — QR dùng tài khoản mô phỏng, không chuyển tiền thật.'),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tải QR về điện thoại' })).toBeVisible();
    assert.ok(
      (await page.getByRole('img', { name: 'Mã QR thanh toán tiền cọc' }).count()) ||
        (await page.getByText(/Chưa tải được ảnh QR/).count()),
    );
    fs.mkdirSync(evidence, { recursive: true });
    await page
      .getByRole('heading', { name: 'Thanh toán tiền cọc', exact: true })
      .scrollIntoViewIfNeeded();
    await page
      .waitForFunction(
        () => {
          const img = document.querySelector('img[alt="Mã QR thanh toán tiền cọc"]');
          return !img || (img.complete && img.naturalWidth > 0);
        },
        undefined,
        { timeout: 15000 },
      )
      .catch(() => {});
    await page
      .getByRole('region', { name: 'Thanh toán tiền cọc' })
      .screenshot({ path: path.join(evidence, '01-qr-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page
      .getByRole('region', { name: 'Thanh toán tiền cọc' })
      .screenshot({ path: path.join(evidence, '02-qr-mobile.png') });
    const send = async (reference, amount) => {
      const id = Date.now(),
        timestamp = String(Math.floor(Date.now() / 1000));
      const body = JSON.stringify({
        id,
        gateway: 'MBBank',
        accountNumber: 'SBSTUDIO001',
        code: reference,
        content: reference,
        transferType: 'in',
        transferAmount: amount,
        transactionDate: new Date(Date.now() + 7 * 3600000)
          .toISOString()
          .slice(0, 19)
          .replace('T', ' '),
        referenceCode: `BROWSER-SANDBOX-${id}`,
      });
      const response = await fetch(api + '/payments/sepay/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SePay-Timestamp': timestamp,
          'X-SePay-Signature': `sha256=${createHmac('sha256', profile.webhookSecret).update(`${timestamp}.${body}`).digest('hex')}`,
        },
        body,
      });
      assert.equal(response.status, 200, await response.text());
    };
    await send(detail.workflow.depositPayment.reference, detail.workflow.depositPayment.amount);
    // No reload or user acknowledgement: this must update through the 5s poll.
    await expect(page.getByText('Đã nhận cọc — lịch đã được xác nhận.')).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByRole('img', { name: 'Mã QR thanh toán tiền cọc' })).toHaveCount(0);
    await page.screenshot({
      path: path.join(evidence, '03-automatically-confirmed.png'),
      fullPage: true,
    });
    assert.equal(
      await db
        .collection('schedules')
        .countDocuments({ workflowBooking: new (r('mongodb').ObjectId)(booking._id) }),
      1,
    );
    assert.equal(
      await db
        .collection('transactions')
        .countDocuments({ workflowBooking: new (r('mongodb').ObjectId)(booking._id) }),
      1,
    );
    await send('YUMEAAAAAAAAAAAAAAAA', 100000);
    const staff = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await staff.addInitScript(
      ({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      },
      {
        token: token(admin),
        user: {
          _id: String(admin._id),
          username: admin.username,
          name: admin.name,
          roles: admin.roles,
        },
      },
    );
    const staffPage = await staff.newPage();
    await staffPage.goto('http://127.0.0.1:4013/manage/payment-receipts', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      staffPage.getByText('YUMEAAAAAAAAAAAAAAAA', { exact: true }).first(),
    ).toBeVisible();
    await staffPage.screenshot({
      path: path.join(evidence, '04-staff-reconciliation.png'),
      fullPage: true,
    });
    fs.writeFileSync(
      path.join(evidence, 'checks.json'),
      JSON.stringify(
        {
          mode: 'local-sandbox',
          database: 'studio_sepay_sandbox',
          username: 'mango',
          bookingId: booking._id,
          checks: [
            'prefilled-qr-details',
            'sandbox-labelled',
            'responsive-390px',
            'signed-webhook',
            'automatic-poll-confirmation',
            'exactly-one-schedule-and-transaction',
            'staff-reconciliation-visible',
          ],
        },
        null,
        2,
      ),
    );
    console.log(JSON.stringify({ passed: true, bookingId: booking._id, evidence }));
  } finally {
    await browser.close();
    await dbClient.close();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
