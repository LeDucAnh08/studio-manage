const { chromium, expect } = require('@playwright/test');
const path = require('node:path');
const out = __dirname;
const id = '000000000000000000261122';
const user = { _id: 'admin', username: 'review.admin', name: 'Quản trị viên', roles: [0], isActive: true };
const startAt = '2026-11-22T01:00:00Z';
const endAt = '2026-11-22T05:00:00Z';
const location = 'Sân trường Yume, Hà Nội';
const schedule = { shootDate: '2026-11-22T00:00:00+07:00', startTime: '08:00', endTime: '12:00', location };
const lead = { _id: 'ph-one', name: 'Nguyễn Anh Khoa' };
const support = { _id: 'ph-two', name: 'Trần Gia Bảo' };
const booking = { _id: id, status: 'approved', packageName: 'Kỉ yếu trọn gói', className: 'Lớp 12A12', school: 'THPT Yume', members: 30, contactName: 'Mai Anh', phone: '0901 234 567', startAt, endAt, location, packageAgreement: { total: 7500000, depositRequired: 2250000 } };
const workflow = {
  bookingId: id, version: 3, lifecycle: 'confirmed', orderStage: 'confirmed', shootWindow: { startAt, endAt },
  assignedPhotographer: lead, assignedSupportPhotographers: [support],
  quote: { version: 1, total: 7500000, depositRequired: 2250000, acceptedAt: '2026-11-18T01:30:00Z', proposedSchedule: schedule, lines: [{ label: 'Kỉ yếu trọn gói', quantity: 30, unitPrice: 250000 }], delivery: { targetDays: 7 }, terms: [], editingTerms: [], paymentInstructions: {} },
  resources: { scheduleId: 'schedule-1', scheduleDetails: schedule, photographers: [lead._id, support._id], costumes: [] },
  members: Array.from({ length: 24 }, (_, n) => ({ _id: 'member-' + n, name: 'Học sinh ' + (n + 1), costumeSizes: [] })),
  allowedCostumes: [], payments: { requiredDeposit: 2250000, totalReceived: 2250000, netReceived: 2250000, totalRefunded: 0, totalDue: 5250000, entries: [{ _id: 'deposit', kind: 'deposit', method: 'bank_transfer', amount: 2250000, receivedAt: '2026-11-18T02:20:00Z' }] },
  progress: { status: 'not_started', deliveryVersion: 0, revisionRequests: [] },
  quoteHistory: [], deliveryHistory: [], paymentReady: true,
  events: [{ action: 'resources.confirm', at: '2026-11-18T02:20:00Z', message: 'Đã chốt lịch chụp 22/11/2026, 08:00 – 12:00.' }, { action: 'intake.received', at: '2026-11-17T08:00:00Z', message: 'Nhận yêu cầu chụp kỉ yếu từ lớp 12A12.' }]
};
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1487, height: 1058 }, colorScheme: 'dark' });
    const token = 'test.' + Buffer.from(JSON.stringify({ exp: 2208988800 })).toString('base64url') + '.test';
    await context.addInitScript(t => { localStorage.setItem('themeMode', 'dark'); localStorage.setItem('token', t); }, token);
    const requests = [];
    await context.route('**/api/**', route => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      requests.push([request.method(), pathname]);
      let data = [];
      if (pathname === '/api/auth/refresh') data = { user, token };
      else if (pathname === '/api/bookings/' + id + '/workflow') data = { booking, workflow };
      else if (pathname === '/api/bookings/' + id) data = booking;
      return route.fulfill({ json: { success: true, data } });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.clock.setFixedTime(new Date('2026-11-18T03:00:00Z'));
    await page.goto('http://localhost:4001/workflow-bookings/' + id);
    await expect(page.getByRole('heading', { name: 'Lớp 12A12', exact: true })).toBeVisible();
    await expect(page.locator('.admin-order__status')).toBeVisible();
    await expect(page.getByRole('tabpanel', { name: 'Tổng quan' }).getByText(lead.name, { exact: true })).toBeVisible();
    await expect(page.getByRole('tabpanel', { name: 'Tổng quan' }).getByText('5.250.000 đ', { exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(out, 'desktop.png') });
    const back = page.getByRole('link', { name: '← Đơn chụp ảnh', exact: true });
    await expect(back).toHaveAttribute('href', '/workflow-bookings');
    await back.hover();
    await expect(back).toHaveCSS('text-decoration-line', 'none');
    const students = page.getByRole('tab', { name: 'Học sinh' });
    await page.getByRole('button', { name: 'Hoàn thiện danh sách' }).click();
    await expect(students).toBeFocused();
    await expect(students).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: 'Lưu danh sách thành viên' })).toBeVisible();
    await page.getByRole('button', { name: 'Tải lại hồ sơ' }).click();
    await expect(students).toHaveAttribute('aria-selected', 'true');
    const tabs = [
      ['Lịch & ekip', 'Thợ phụ trách'],
      ['Thanh toán', 'Thanh toán và đối soát'],
      ['Bàn giao', 'Bàn giao ảnh'],
      ['Lịch sử', 'Lịch sử xử lý'],
    ];
    for (const [tab, heading] of tabs) {
      await page.getByRole('tab', { name: tab }).click();
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('tab', { name: 'Tổng quan' }).click();
    await expect(page.getByRole('button', { name: 'Hoàn thiện danh sách' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.screenshot({ path: path.join(out, 'mobile.png'), fullPage: true });
    await page.getByRole('tab', { name: 'Học sinh' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    expect(requests.filter(([m, p]) => m !== 'GET' && p !== '/api/auth/refresh')).toEqual([]);
    expect(errors).toEqual([]);
    console.log('Verified desktop and mobile, all tabs, CTA and focus, reload and Back link with no writes.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
