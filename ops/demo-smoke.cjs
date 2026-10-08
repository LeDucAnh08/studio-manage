// Verify the actual compiled demo UI without resetting or changing business records.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, expect } = require('@playwright/test');
const { MongoClient } = require('mongodb');
const { DEMO_URI, PROJECT } = require('./seed-demo.cjs');

async function main() {
  const root = path.resolve(__dirname, '..');
  const base = 'http://127.0.0.1:4001';
  const status = await (await fetch(`${base}/__demo/status`)).json();
  assert.equal(status.type, 'studio-project-demo');
  assert.equal(status.root, root);
  assert.equal(status.phase, 'ready');
  const mongo = new MongoClient(DEMO_URI);
  await mongo.connect();
  let scenario;
  try {
    scenario = await mongo.db('studio_project_demo').collection('projectmetadata').findOne({
      _id: 'scenario:v1',
      project: PROJECT,
      status: 'completed',
    });
    assert.ok(scenario, 'Completed demo scenarios are required');
  } finally {
    await mongo.close();
  }
  const screenshots = path.join(root, '.workflow-tools', 'screenshots');
  fs.mkdirSync(screenshots, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const checks = [];
  const login = async (username, password, viewport = { width: 1280, height: 900 }) => {
    const context = await browser.newContext({ baseURL: base, viewport });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.getByLabel('Tên đăng nhập', { exact: true }).fill(username);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL((url) => url.pathname !== '/login');
    return page;
  };
  try {
    const admin = await login('superadmin', 'Admin@1234');
    await expect(admin.getByRole('heading', { name: /Xin chào/ })).toBeVisible();
    checks.push('Admin login and compiled dashboard');
    await admin.screenshot({ path: path.join(screenshots, 'demo-dashboard.png'), fullPage: true });
    await admin.goto(`/workflow-bookings/${scenario.records.completedPhoto}`);
    await expect(
      admin.getByRole('heading', { name: 'Demo · Lớp đã hoàn tất', exact: true }),
    ).toBeVisible();
    await expect(admin.getByText('Hoàn tất', { exact: true }).first()).toBeVisible();
    checks.push('Completed photography details');
    await admin.goto(`/rental-orders/${scenario.records.completedRental}`);
    await expect(
      admin.getByRole('heading', { name: 'Khách thuê demo đồ án', exact: true }),
    ).toBeVisible();
    await expect(
      admin.getByRole('heading', { name: 'Kết quả nhận trả', exact: true }),
    ).toBeVisible();
    checks.push('Completed rental and returns');
    const accountant = await login('demo.accountant', 'Staff@1234', { width: 360, height: 800 });
    const financeResponse = accountant.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/reports/finance' && response.ok(),
    );
    await accountant.goto('/manage/reports');
    await expect(
      accountant.getByRole('heading', { name: 'Báo cáo dịch vụ và kho', exact: true }),
    ).toBeVisible();
    await expect(
      accountant.getByRole('table', { name: 'So sánh dịch vụ trong kỳ', exact: true }),
    ).toBeVisible();
    const finance = await (await financeResponse).json();
    const due = finance.data.snapshot.reduce((total, row) => total + row.due, 0);
    const formattedDue = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(due);
    await expect(accountant.getByText(formattedDue, { exact: true }).first()).toBeVisible();
    checks.push('Mobile finance report matches current outstanding payment from API');
    await accountant.screenshot({
      path: path.join(screenshots, 'demo-reports-mobile.png'),
      fullPage: true,
    });
    await accountant.getByRole('button', { name: 'Phân bổ kho', exact: true }).click();
    await expect(
      accountant.getByRole('heading', { name: 'Phân bổ theo mẫu và kích cỡ', exact: true }),
    ).toBeVisible();
    await expect(
      accountant.getByRole('table', { name: 'Phân bổ trang phục theo mẫu và size' }),
    ).toBeVisible();
    assert.ok(
      await accountant.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2),
      'Mobile page overflows',
    );
    checks.push('Mobile shared-stock report without page overflow');
    await accountant.screenshot({
      path: path.join(screenshots, 'demo-inventory-mobile.png'),
      fullPage: true,
    });
    const client = await login('demo.client', 'Client@1234');
    await client.goto(`/account/bookings/${scenario.records.completedPhoto}`);
    await expect(
      client.getByRole('heading', { name: 'Đánh giá đã gửi', exact: true }),
    ).toBeVisible();
    await client.goto(`/account/rentals/${scenario.records.completedRental}`);
    await expect(
      client.getByRole('heading', { name: 'Đánh giá thuê đã gửi', exact: true }),
    ).toBeVisible();
    checks.push('Client can read both completed services and feedback');
    const photographer = await login('demo.photographer', 'Staff@1234');
    await photographer.goto(`/workflow-bookings/${scenario.records.upcomingPhoto}`);
    await expect(
      photographer.getByRole('heading', { name: 'Demo · Lớp sắp chụp', exact: true }),
    ).toBeVisible();
    checks.push('Assigned photographer can read upcoming job');
    const sale = await login('demo.sale', 'Staff@1234');
    await sale.goto(`/rental-orders/${scenario.records.completedRental}`);
    await expect(
      sale.getByRole('heading', { name: 'Khách thuê demo đồ án', exact: true }),
    ).toBeVisible();
    checks.push('Sale can read rental service');
    assert.deepEqual(errors, [], 'Uncaught browser errors');
    const evidence = {
      generatedAt: new Date().toISOString(),
      target: base,
      checks,
      pageErrors: errors,
      screenshots: path.relative(root, screenshots),
    };
    fs.writeFileSync(
      path.join(root, '.workflow-tools', 'demo-browser.json'),
      JSON.stringify(evidence, null, 2),
    );
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
