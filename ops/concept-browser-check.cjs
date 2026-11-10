const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
module.exports = async ({ base, actors, token, orderId }) => {
  const root = path.resolve(__dirname, '..'),
    out = path.join(root, 'audit/concept-booking');
  fs.mkdirSync(out, { recursive: true });
  const vite = spawn(
    process.execPath,
    [
      path.join(root, 'node_modules/vite/bin/vite.js'),
      '--host',
      '127.0.0.1',
      '--port',
      '4047',
      '--strictPort',
    ],
    {
      cwd: path.join(root, 'frontend'),
      windowsHide: true,
      stdio: 'pipe',
      env: {
        ...process.env,
        VITE_CONCEPT_BOOKING_ENABLED: 'true',
        VITE_API_URL: '/api',
        DEV_API_PROXY_TARGET: base.replace(/\/api$/, ''),
      },
    },
  );
  let logs = '';
  vite.stdout.on('data', (d) => {
    logs += d;
  });
  vite.stderr.on('data', (d) => {
    logs += d;
  });
  let browser;
  try {
    for (let i = 0; ; i++) {
      try {
        if ((await fetch('http://127.0.0.1:4047')).ok) break;
      } catch {}
      if (i > 50) throw new Error('Vite did not start: ' + logs);
      await new Promise((r) => setTimeout(r, 300));
    }
    browser = await require('playwright').chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(
      ({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      },
      {
        token: token('client'),
        user: {
          _id: String(actors.client._id),
          name: 'Khách',
          username: actors.client.username,
          roles: [6],
          email: actors.client.email,
          emailVerifiedAt: actors.client.emailVerifiedAt,
        },
      },
    );
    const page = await context.newPage(),
      errors = [];
    page.setDefaultTimeout(60000);
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:4047/concept-booking', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.getByRole('button', { name: 'Chọn Gói riêng' }).click();
    await page.locator('.concept-date-grid button:enabled').first().click();
    await page
      .getByRole('button', { name: /\d\d:\d\d.*–/ })
      .first()
      .click();
    await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await page
      .getByRole('button', { name: /^Chọn photo/ })
      .first()
      .click();
    await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await page.getByLabel('Họ tên liên hệ').fill('Khách buổi concept');
    await page.getByLabel('Số điện thoại', { exact: true }).fill('0901234567');
    await page.getByLabel('Ý tưởng và yêu cầu').fill('Chụp chân dung nhẹ nhàng.');
    await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await page.getByRole('checkbox').check();
    await page.screenshot({ path: path.join(out, 'checkout-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: 'Tạo QR cọc 30%' }).click();
    await page.waitForURL('**/account/concept-orders/*');
    await page.getByRole('button', { name: 'Thanh toán thử', exact: true }).click();
    await page.getByText(/Đã xác nhận ·/).waitFor();
    await page.screenshot({ path: path.join(out, 'confirmed-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      'Mobile checkout overflow',
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(out, 'confirmed-mobile.png'), fullPage: true });
    await page.goto(`http://127.0.0.1:4047/account/concept-orders/${orderId}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.getByRole('heading', { name: 'Album và hậu kỳ' }).waitFor();
    await page.getByRole('button', { name: 'Retouch v4', exact: true }).click();
    await page.getByRole('button', { name: 'Xem ảnh IMG_001.jpg' }).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button', { name: 'Phóng to', exact: true }).click();
    await page.screenshot({ path: path.join(out, 'album-mobile.png'), fullPage: true });
    await page.keyboard.press('Escape');
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      'Mobile album overflow',
    );
    const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await adminContext.addInitScript(
      ({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      },
      {
        token: token('admin'),
        user: {
          _id: String(actors.admin._id),
          name: 'Admin',
          username: actors.admin.username,
          roles: [0],
        },
      },
    );
    const admin = await adminContext.newPage();
    admin.on('pageerror', (e) => errors.push(e.message));
    await admin.goto('http://127.0.0.1:4047/settings/concepts');
    await admin.getByRole('heading', { name: 'Concept, gói chụp và ekip' }).waitFor();
    await admin.getByRole('button', { name: 'Gói chụp', exact: true }).click();
    await admin.screenshot({ path: path.join(out, 'catalog-admin.png'), fullPage: true });
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(out, 'browser.json'),
      JSON.stringify(
        {
          passed: true,
          desktop: [1440, 1000],
          mobile: [390, 844],
          pageErrors: errors,
          checks: [
            'real checkout',
            'sandbox payment',
            'confirmed schedule',
            'mobile overflow',
            'versioned Drive album',
            'zoom/Escape',
            'admin catalog',
          ],
        },
        null,
        2,
      ),
    );
  } finally {
    if (browser) await browser.close();
    vite.kill();
    await new Promise((r) => setTimeout(r, 500));
  }
};
