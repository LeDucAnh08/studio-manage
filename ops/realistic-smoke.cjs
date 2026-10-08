// Read the seeded graduation-project demo through its actual compiled UI and API.
// Login and navigation do not submit or alter business records.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, expect } = require('@playwright/test');
const { MongoClient } = require('mongodb');
const { DEMO_URI, PROJECT, validateDemoUri } = require('./seed-demo.cjs');

const money = (amount = 0) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);

async function main() {
  const root = path.resolve(__dirname, '..');
  const base = 'http://127.0.0.1:4001';
  const status = await (await fetch(`${base}/__demo/status`)).json();
  assert.equal(status.type, 'studio-project-demo');
  assert.equal(status.root, root);
  assert.equal(status.phase, 'ready');
  const mongo = new MongoClient(validateDemoUri(DEMO_URI));
  await mongo.connect();
  let seed;
  try {
    seed = await mongo.db('studio_project_demo').collection('projectmetadata').findOne({
      _id: 'realistic:v1',
      project: PROJECT,
      status: 'completed',
    });
    assert.ok(seed, 'Complete the realistic seed before running its browser verification.');
  } finally {
    await mongo.close();
  }
  const groups = seed.records.groups;
  const services = seed.records.services;
  assert.equal(groups.length, 20);
  const expectedMembers = groups.reduce((sum, group) => sum + group.members, 0);
  const firstGroup = groups[0];
  const confirmedGroup = groups[14];
  const completedPhoto = String(services.bookings[0]);
  const confirmedPhoto = String(services.bookings[14]);
  const completedRental = String(services.rentals[0]);
  const handedRental = String(services.rentals[18]);
  const screenshots = path.join(root, '.workflow-tools', 'screenshots');
  fs.mkdirSync(screenshots, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const checks = [];
  const login = async (username, password, viewport = { width: 1440, height: 900 }) => {
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
  const api = async (page, route) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    assert.ok(token, 'The browser login must supply an authenticated session.');
    const response = await page.request.get(`${base}/api${route}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.ok(response.ok(), `Read-only API request failed: ${route} (${response.status()})`);
    const body = await response.json();
    assert.notEqual(body.success, false, `Read-only API request failed: ${route}`);
    return body;
  };
  const noOverflow = async (page) =>
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2),
      'The mobile page must contain its wide tables without horizontal page overflow.',
    );
  try {
    const admin = await login('superadmin', 'Admin@1234');
    await expect(admin.getByRole('heading', { name: /Xin chào/ })).toBeVisible();
    const customers = (await api(admin, '/customers?limit=1000')).data;
    const customerIds = new Set(customers.map((row) => String(row._id)));
    for (const group of groups) assert.ok(customerIds.has(String(group.customer)));
    const students = (await api(admin, '/students?limit=2000')).data;
    const seededIds = new Set(groups.map((row) => String(row.customer)));
    const seededStudents = students.filter((row) => seededIds.has(String(row.customer)));
    assert.equal(seededStudents.length, expectedMembers);
    for (const group of groups)
      assert.equal(
        seededStudents.filter((row) => String(row.customer) === String(group.customer)).length,
        group.members,
      );
    await admin.goto('/customers');
    await expect(
      admin.getByRole('heading', { name: 'Khách hàng (Lớp)', exact: true }),
    ).toBeVisible();
    await expect(
      admin.locator(`a[href="/customers/${confirmedGroup.customer}"]`).first(),
    ).toBeVisible();
    checks.push(
      `Admin sees all ${groups.length} seeded classes and ${expectedMembers} roster members`,
    );
    await admin.screenshot({
      path: path.join(screenshots, 'realistic-customers.png'),
      fullPage: true,
    });

    const firstCustomer = customers.find((row) => String(row._id) === String(firstGroup.customer));
    await admin.goto(`/customers/${firstGroup.customer}`);
    await expect(
      admin.getByRole('heading', { name: firstCustomer.className, exact: true }),
    ).toBeVisible();
    await expect(admin.getByText(firstCustomer.school, { exact: true })).toBeVisible();
    await expect(admin.getByText('Sĩ số:', { exact: true }).locator('..')).toHaveText(
      `Sĩ số: ${firstGroup.members}`,
    );
    await expect(admin.getByRole('heading', { name: 'Lịch chụp', exact: true })).toBeVisible();
    checks.push('Class detail displays the seeded school, class size and shooting history');

    const photo = (await api(admin, `/bookings/${completedPhoto}/workflow`)).data;
    assert.equal(photo.workflow.lifecycle, 'completed');
    assert.equal(photo.workflow.members.length, firstGroup.members);
    assert.equal(photo.workflow.payments.netReceived, photo.workflow.quote.total);
    await admin.goto(`/workflow-bookings/${completedPhoto}`);
    await expect(
      admin.getByRole('heading', { name: firstCustomer.className, exact: true }),
    ).toBeVisible();
    await expect(admin.getByText('Hoàn tất', { exact: true }).first()).toBeVisible();
    await expect(
      admin.getByRole('heading', { name: 'Đánh giá đã gửi', exact: true }),
    ).toBeVisible();
    checks.push(
      'Completed photography displays the full roster, agreed fee and submitted feedback',
    );
    await admin.screenshot({
      path: path.join(screenshots, 'realistic-completed-photo.png'),
      fullPage: true,
    });

    const upcoming = (await api(admin, `/bookings/${confirmedPhoto}/workflow`)).data;
    assert.equal(upcoming.workflow.lifecycle, 'confirmed');
    assert.equal(upcoming.workflow.members.length, confirmedGroup.members);
    assert.ok(upcoming.workflow.resources.photographers.length >= 3);
    await admin.goto(`/workflow-bookings/${confirmedPhoto}`);
    await expect(admin.getByText('Đã chốt lịch', { exact: true }).first()).toBeVisible();
    await expect(
      admin.getByRole('heading', { name: 'Lịch và nguồn lực đã xác nhận', exact: true }),
    ).toBeVisible();
    checks.push('Upcoming photography displays its reserved crew and clothing sizes');

    const rental = (await api(admin, `/rentals/${completedRental}`)).data;
    assert.equal(rental.status, 'completed');
    assert.equal(rental.payment.netReceived, rental.quote.fee);
    assert.equal(rental.payment.due, 0);
    assert.equal(rental.payment.refundDue, 0);
    await admin.goto(`/rental-orders/${completedRental}`);
    await expect(
      admin.getByRole('heading', { name: rental.contactName, exact: true }),
    ).toBeVisible();
    await expect(
      admin.getByRole('heading', { name: 'Kết quả nhận trả', exact: true }),
    ).toBeVisible();
    await expect(admin.getByText('Đã thu sau hoàn:', { exact: false }).first()).toContainText(
      `${rental.payment.netReceived.toLocaleString('vi-VN')} đ`,
    );
    checks.push(
      'Completed rental displays returned quantities and the settled fee after deposit refund',
    );

    const handed = (await api(admin, `/rentals/${handedRental}`)).data;
    assert.equal(handed.status, 'checked_out');
    assert.equal(handed.payment.netReceived, handed.quote.fee + handed.quote.deposit);
    assert.ok(handed.checkedOutAt);
    assert.equal(handed.returnedAt, undefined);
    await admin.goto(`/rental-orders/${handedRental}`);
    await expect(admin.getByText(/Đã giao, chờ nhận trả · Hồ sơ/)).toBeVisible();
    await expect(admin.getByRole('heading', { name: 'Kết quả nhận trả', exact: true })).toHaveCount(
      0,
    );
    checks.push('Current handed-over rental retains its security deposit and awaits return');

    const accountant = await login('ketoan.maianh', 'Staff@1234', { width: 360, height: 800 });
    const from = seed.anchorDay.slice(0, 8) + '01';
    const to = seed.anchorDay;
    const range = `from=${from}&to=${to}`;
    const finance = (
      await api(accountant, `/reports/finance?${range}&view=cash&service=all&page=1`)
    ).data;
    const photoDebt = finance.snapshot.find((row) => row._id === 'photography')?.due || 0;
    assert.ok(
      photoDebt > 0,
      'Open service histories should supply a realistic outstanding balance.',
    );
    await accountant.goto(`/manage/reports?${range}`);
    await expect(
      accountant.getByRole('heading', { name: 'Báo cáo dịch vụ và kho', exact: true }),
    ).toBeVisible();
    const debtTable = accountant.getByRole('table', {
      name: 'Giá trị hợp đồng và công nợ hiện tại',
      exact: true,
    });
    await expect(
      debtTable.getByRole('row').filter({ hasText: 'Chụp ảnh' }).getByRole('cell').nth(2),
    ).toHaveText(money(photoDebt));
    await noOverflow(accountant);
    checks.push(
      'Mobile accountant report matches the API outstanding balance without page overflow',
    );
    await accountant.screenshot({
      path: path.join(screenshots, 'realistic-reports-mobile.png'),
      fullPage: true,
    });

    const inventory = (await api(accountant, `/reports/inventory?${range}&page=1`)).data;
    assert.equal(inventory.summary.conflictRows, 0);
    await accountant.getByRole('button', { name: 'Phân bổ kho', exact: true }).click();
    await expect(
      accountant.getByRole('heading', { name: 'Phân bổ theo mẫu và kích cỡ', exact: true }),
    ).toBeVisible();
    await expect(
      accountant.getByRole('table', { name: 'Phân bổ trang phục theo mẫu và size', exact: true }),
    ).toBeVisible();
    await noOverflow(accountant);
    checks.push(
      'Mobile shared-stock report displays the larger catalog without conflicts or page overflow',
    );
    await accountant.screenshot({
      path: path.join(screenshots, 'realistic-inventory-mobile.png'),
      fullPage: true,
    });

    const client = await login('khach.maianh', 'Client@1234');
    const ownPhoto = (await api(client, `/bookings/${completedPhoto}/workflow`)).data;
    assert.equal(ownPhoto.workflow.lifecycle, 'completed');
    assert.equal(ownPhoto.workflow.payments.netReceived, photo.workflow.payments.netReceived);
    await client.goto(`/account/bookings/${completedPhoto}`);
    await expect(
      client.getByRole('heading', { name: firstCustomer.className, exact: true }),
    ).toBeVisible();
    await expect(
      client.getByRole('heading', { name: 'Đánh giá đã gửi', exact: true }),
    ).toBeVisible();
    checks.push('New customer account can read its own completed photography and feedback');
    assert.deepEqual(errors, [], 'Uncaught browser errors');
    const evidence = {
      generatedAt: new Date().toISOString(),
      target: base,
      seed: 'realistic:v1',
      classes: groups.length,
      members: expectedMembers,
      checks,
      pageErrors: errors,
      screenshots: path.relative(root, screenshots),
    };
    fs.writeFileSync(
      path.join(root, '.workflow-tools', 'realistic-browser.json'),
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
