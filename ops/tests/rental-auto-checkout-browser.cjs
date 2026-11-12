// Called from the isolated rental integration test; no real bank transfers.
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium, expect } = require('@playwright/test');
module.exports = async ({ apiOrigin, client, token, itemId, get }) => {
  const root = path.resolve(__dirname, '../..');
  const { createServer } = await import('vite');
  const { default: react } = await import('@vitejs/plugin-react');
  const { default: tailwindConfig } = await import(
    require('node:url').pathToFileURL(path.join(root, 'frontend/tailwind.config.js')).href
  );
  const evidence = path.join(root, 'audit/rental-auto-checkout-2026-11-10');
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
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(90000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(
      `http://127.0.0.1:4026/rental/start?item=${itemId}&receiveDate=2099-10-20&returnDate=2099-10-22`,
      { waitUntil: 'domcontentloaded' },
    );
    await page.getByLabel('Kích cỡ 1', { exact: true }).selectOption('M');
    await page.getByLabel('Người liên hệ', { exact: true }).fill('Khách demo thuê tự động');
    await page.getByLabel('Số điện thoại', { exact: true }).fill('0901234567');
    await page.getByRole('button', { name: 'Xem lại yêu cầu thuê', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Kiểm tra yêu cầu thuê' })).toBeVisible();
    const submit = page.getByRole('button', { name: 'Đặt thuê và thanh toán cọc', exact: true });
    await expect(submit).toBeDisabled();
    await page.getByRole('checkbox', { name: /Tôi đã đọc và đồng ý/ }).check();
    await expect(submit).toBeEnabled();
    await page.screenshot({ path: path.join(evidence, 'desktop-terms.png'), fullPage: true });
    await submit.click();
    await expect(page).toHaveURL(/\/account\/rentals\/[a-f0-9]{24}$/);
    await expect(
      page.getByRole('heading', { name: 'Thanh toán tiền cọc', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Chờ cọc bảo đảm', { exact: false }).first()).toBeVisible();
    await page.screenshot({ path: path.join(evidence, 'desktop-deposit.png'), fullPage: true });
    const id = page.url().split('/').pop();
    const order = await get(id);
    expect(order.depositPayment.demoSimulation).toBe(true);
    await page.getByRole('button', { name: 'Thanh toán', exact: true }).click();
    await expect(
      page.getByText('Đã nhận cọc — trang phục đã được giữ.', { exact: true }),
    ).toBeVisible({ timeout: 20000 });
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
            'consent required',
            'automatic checkout',
            'deposit QR',
            'local payment button confirms and polling updates',
            'paid order cannot cancel/change',
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
