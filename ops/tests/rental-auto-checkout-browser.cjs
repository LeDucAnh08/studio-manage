// Called from the isolated rental integration test; no real bank transfers.
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium, expect } = require('@playwright/test');
module.exports = async ({ apiOrigin, client, token, admin, adminToken, rentalId, get }) => {
  const root = path.resolve(__dirname, '../..');
  const { createServer } = await import('vite');
  const { default: react } = await import('@vitejs/plugin-react');
  const { default: tailwindConfig } = await import(
    require('node:url').pathToFileURL(path.join(root, 'frontend/tailwind.config.js')).href
  );
  const evidence =
    process.env.RENTAL_BROWSER_EVIDENCE || path.join(root, 'audit/rental-auto-checkout-2026-11-10');
  await fs.mkdir(evidence, { recursive: true });
  const vite = await createServer({
    cacheDir: path.join(require('node:os').tmpdir(), 'studio-rental-browser-vite'),
    configFile: false,
    root: path.join(root, 'frontend'),
    plugins: [react()],
    resolve: { alias: { '@': path.join(root, 'frontend/src') } },
    css: {
      postcss: {
        plugins: [
          require('tailwindcss')({
            ...tailwindConfig,
            content: [
              path.join(root, 'frontend/index.html'),
              path.join(root, 'frontend/src/**/*.{ts,tsx}'),
            ],
          }),
          require('autoprefixer')(),
        ],
      },
    },
    define: {
      'import.meta.env.VITE_API_URL': '"/api"',
      'import.meta.env.VITE_CLIENT_PORTAL_ENABLED': '"true"',
    },
    server: {
      host: '127.0.0.1',
      port: 4026,
      strictPort: true,
      proxy: { '/api': { target: apiOrigin, rewrite: (value) => value.replace(/^\/api/, '') } },
    },
  });
  await vite.listen();
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(
      ({ user, token }) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token);
      },
      {
        user: { _id: String(client._id), username: client.username, name: client.name, roles: [6] },
        token,
      },
    );
    await context.route('https://vietqr.app/**', (route) =>
      route.fulfill({
        contentType: 'image/png',
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0YQAAAAASUVORK5CYII=',
          'base64',
        ),
      }),
    );
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(90000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:4026/account/rentals/${rentalId}?payment=deposit`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(/\/account\/rentals\/[a-f0-9]{24}\?payment=deposit$/);
    await expect(
      page.getByRole('heading', { name: 'Thanh toán tiền cọc', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Chờ thanh toán cọc', { exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(evidence, 'desktop-deposit.png'), fullPage: true });
    const order = await get(rentalId);
    expect(order.depositPayment.demoSimulation).toBe(true);
    await page.getByRole('button', { name: 'Thanh toán', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Đã nhận tiền cọc' })).toBeVisible({
      timeout: 20000,
    });
    await page.getByRole('link', { name: 'Xem hồ sơ đơn thuê' }).click();
    await expect(page.getByRole('button', { name: 'Rút yêu cầu thuê', exact: true })).toHaveCount(
      0,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(
      page.getByText(
        'Đã ghi nhận thanh toán: không được hủy, đổi mẫu, size, số lượng, ngày thuê hoặc gia hạn.',
        { exact: true },
      ),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Thanh toán phần còn lại' }).click();
    await expect(page.getByRole('img', { name: 'Mã QR thanh toán phần còn lại' })).toBeVisible();
    await expect(page.getByRole('timer')).toBeVisible();
    const balancePage = page.url();
    const staffContext = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    await staffContext.addInitScript(
      ({ actor, accessToken }) => {
        localStorage.setItem('user', JSON.stringify(actor));
        localStorage.setItem('token', accessToken);
      },
      {
        actor: { _id: String(admin._id), username: admin.username, name: admin.name, roles: [0] },
        accessToken: adminToken,
      },
    );
    const staffPage = await staffContext.newPage();
    await staffPage.goto(`http://127.0.0.1:4026/rental-orders/${rentalId}`, {
      waitUntil: 'domcontentloaded',
    });
    await staffPage.getByRole('button', { name: 'Sao chép liên kết thanh toán' }).click();
    await expect
      .poll(() => staffPage.evaluate(() => navigator.clipboard.readText()))
      .toBe(balancePage);
    await staffContext.close();
    await page.getByRole('button', { name: 'Thanh toán', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Đã thanh toán đủ' })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByRole('img', { name: 'Mã QR thanh toán phần còn lại' })).toHaveCount(0);
    expect((await get(rentalId)).readyForHandover).toBe(true);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
    await page.screenshot({ path: path.join(evidence, 'mobile-paid.png'), fullPage: true });
    expect(errors).toEqual([]);
    await fs.writeFile(
      path.join(evidence, 'browser-result.json'),
      JSON.stringify(
        {
          passed: true,
          desktop: '1440x1000',
          mobile: '390x844',
          realHttp: true,
          isolatedDatabase: true,
          realBankTransfers: false,
          checks: [
            'deposit QR',
            'local payment button confirms and polling updates',
            'paid order cannot cancel/change',
            'balance checkout and countdown',
            'admin copies the customer payment link',
            'balance payment enables handover',
            'mobile no horizontal overflow',
          ],
          browserErrors: errors,
        },
        null,
        2,
      ),
    );
  } finally {
    if (browser) await browser.close();
    await vite.close();
  }
};
