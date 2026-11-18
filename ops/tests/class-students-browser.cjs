// Real components with isolated API doubles; no database reads or writes.
const { chromium, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');
const out = path.resolve(__dirname, '../../audit/class-students-2026-11-18');

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const user = { _id: 'ui-test-admin', username: 'ui-test-admin', name: 'Admin', roles: [0], isActive: true };
    const token = 'test.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url') + '.test';
    const customer = { _id: '000000000000000000000001', className: '12A1', school: 'Trường minh họa', contactName: 'Đại diện lớp', contactPhone: '0901234567', contactAddress: 'Hà Nội', total: 55 };
    const students = Array.from({ length: 55 }, (_, index) => ({ _id: `student-${index}`, name: `Học sinh ${index + 1}`, contact: '0901234567', height: 165, weight: 52, shirtSize: 'L', pantsSize: 'M', notes: 'Thông tin đã điền khi đặt kỉ yếu' }));
    const rosterRequests = [];
    const financialRequests = [];
    await context.addInitScript(({ token }) => localStorage.setItem('token', token), { token });
    await context.route('**/api/**', (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/transactions')) financialRequests.push(url.pathname);
      let data = [];
      let pagination = { total: 0, page: 1, limit: 20 };
      if (url.pathname.endsWith('/auth/refresh')) data = { user, token };
      else if (url.pathname.endsWith('/auth/me')) data = { user };
      else if (url.pathname === '/api/customers') { data = [customer]; pagination = { total: 45, page: Number(url.searchParams.get('page') || 1), limit: 20 }; }
      else if (url.pathname === `/api/customers/${customer._id}`) data = customer;
      else if (url.pathname === `/api/customers/${customer._id}/students`) { data = { source: 'booking', students }; rosterRequests.push(url.pathname); }
      else if (url.pathname === '/api/schedules') { data = [{ _id: 'schedule-1', workflowBooking: 'booking-1', shootDate: '2026-11-22', startTime: '08:00', endTime: '12:00', location: 'Sân trường minh họa', leadPhotographer: { name: 'Nguyễn Anh Khoa', username: 'nhiepanh.anhkhoa' }, supportPhotographers: [{ name: 'Trần Gia Bảo', username: 'nhiepanh.giabao' }], status: 'confirmed' }]; pagination.total = 1; }
      else if (url.pathname === '/api/bookings/booking-1/workflow') data = {
        booking: { _id: 'booking-1', status: 'pending', packageName: 'Gói kỉ yếu', members: 55, className: '12A1', startAt: '2026-11-22T01:00:00Z', endAt: '2026-11-22T05:00:00Z', location: 'Sân trường minh họa' },
        workflow: { bookingId: 'booking-1', version: 1, lifecycle: 'intake', quote: null, payments: null, resources: null, allowedCostumes: [], members: [], progress: null, changeRequest: null, feedback: null, quoteHistory: [], deliveryHistory: [], paymentInstructions: null, paymentReady: false, events: [], memberEntry: null },
      };
      else if (url.pathname === '/api/bookings/booking-1') data = null;
      return route.fulfill({ status: 200, json: { success: true, data, pagination } });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://localhost:4001/customers?search=12A&page=2&limit=20');
    await expect(page.getByRole('heading', { name: 'Danh sách lớp học', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Thông tin học sinh', exact: true })).toHaveCount(0);
    await page.getByRole('link', { name: 'Chi tiết lớp 12A1, Trường minh họa' }).click();
    const table = page.getByRole('table', { name: 'Thông tin học sinh của lớp' });
    await expect(table).toBeVisible();
    const schedules = page.getByRole('table', { name: 'Lịch chụp', exact: true });
    await expect(schedules.getByText('Sân trường minh họa')).toBeVisible();
    await expect(schedules.getByText('Chính: Nguyễn Anh Khoa')).toBeVisible();
    await expect(schedules.getByText('Hỗ trợ: Trần Gia Bảo')).toBeVisible();
    await expect(schedules.getByText(/nhiepanh\./)).toHaveCount(0);
    for (const label of ['Tổng thu', 'Tổng chi', 'Lợi nhuận', 'Thu chi']) await expect(page.getByText(label, { exact: true })).toHaveCount(0);
    await schedules.screenshot({ path: path.join(out, 'schedule-history.png') });
    await schedules.getByText('Sân trường minh họa').click();
    await expect(page).toHaveURL(/\/workflow-bookings\/booking-1$/);
    await expect(page.getByText('Hồ sơ chụp kỉ yếu', { exact: true })).toBeVisible();
    const orderBack = page.getByRole('link', { name: '← Chi tiết lớp' });
    await expect(orderBack).toHaveAttribute('href', `/customers/${customer._id}`);
    await orderBack.click();
    await expect(table).toBeVisible();
    await expect(table.getByRole('row', { name: /Học sinh 1 / })).toContainText('0901234567');
    await expect(table.getByRole('columnheader', { name: 'Size áo' })).toBeVisible();
    const section = page.getByRole('region', { name: 'Thông tin học sinh', exact: true });
    await section.getByRole('button', { name: 'Trang sau' }).first().click();
    await section.getByRole('button', { name: 'Trang sau' }).first().click();
    await expect(table.getByText('Học sinh 55', { exact: true })).toBeVisible();
    const back = page.getByRole('link', { name: 'Danh sách lớp', exact: true });
    await expect(back).toHaveCSS('text-decoration-line', 'none');
    await back.hover();
    await expect(back).toHaveCSS('text-decoration-line', 'none');
    await back.focus();
    await expect(back).toHaveCSS('text-decoration-line', 'none');
    await page.screenshot({ path: path.join(out, 'desktop.png') });
    await back.click();
    await expect(page).toHaveURL(/\/customers\?search=12A&page=2&limit=20$/);
    await expect(page.getByRole('textbox', { name: 'Tìm kiếm lớp hoặc trường' })).toHaveValue('12A');
    await page.goto('http://localhost:4001/customers/size');
    await expect(page).toHaveURL(/\/customers$/);
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(`http://localhost:4001/customers/${customer._id}`);
    await expect(table).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: path.join(out, 'mobile.png') });
    expect(errors).toEqual([]);
    expect(financialRequests).toEqual([]);
    expect(rosterRequests.length).toBeGreaterThan(0);
    console.log('Passed: merged sidebar, class details, student fields, 55-member pagination, list context, old URL redirect, Back styling and mobile layout; no page errors.');
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exit(1); });
