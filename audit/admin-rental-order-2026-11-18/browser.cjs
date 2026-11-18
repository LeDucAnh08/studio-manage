const { chromium, expect } = require('@playwright/test');
const path = require('node:path');
const id = '000000000000000000261121';
const user = { _id: 'admin', username: 'review.admin', name: 'Quản trị viên', roles: [0], isActive: true };
const receiveDate = '2026-11-21T00:00:00+07:00';
const returnDate = '2026-11-23T00:00:00+07:00';
const lines = [
  { costumeId: 'costume-1', name: 'Áo dài trắng', size: 'M', quantity: 2, unitPrice: 175000 },
  { costumeId: 'costume-2', name: 'Áo dài xanh', size: 'L', quantity: 1, unitPrice: 150000 }
];
const order = {
  _id: id, contactName: 'Nguyễn Mai Anh', phone: '09xx xxx 567', version: 3, status: 'confirmed',
  pricingMode: 'daily', autoCheckout: true, changesLocked: true, orderStage: 'ready_for_pickup',
  reservation: { status: 'confirmed', expiresAt: '2026-11-18T02:20:00Z' },
  requestedReceiveDate: receiveDate, requestedReturnDate: returnDate, requestedLines: lines, note: '',
  quote: { version: 1, pricingMode: 'daily', rentalDays: 3, lines, receiveDate, returnDate, fee: 1500000, deposit: 450000, depositKind: 'advance', depositPercent: 30, terms: [], acceptedAt: '2026-11-18T02:15:00Z' },
  payment: { netReceived: 450000, payable: 1500000, due: 1050000, refundDue: 0 },
  payments: [{ kind: 'deposit', amount: 450000, method: 'bank_transfer', at: '2026-11-18T02:20:00Z' }],
  readyForHandover: false, returns: [], change: null, quoteHistory: [],
  events: [{ action: 'rental.request', message: 'Khách gửi đơn thuê', at: '2026-11-18T02:15:00Z' }, { action: 'resources.confirm', message: 'Đã nhận cọc và giữ hàng', at: '2026-11-18T02:20:00Z' }],
  createdAt: '2026-11-18T02:15:00Z', updatedAt: '2026-11-18T02:20:00Z'
};
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1487, height: 1058 }, colorScheme: 'dark' });
    const token = 'test.' + Buffer.from(JSON.stringify({ exp: 2208988800 })).toString('base64url') + '.test';
    await context.addInitScript(t => { localStorage.setItem('themeMode', 'dark'); localStorage.setItem('token', t); }, token);
    const requests = [];
    await context.route('**/api/**', route => {
      const req = route.request();
      const pathname = new URL(req.url()).pathname;
      requests.push([req.method(), pathname]);
      let data = [];
      if (pathname === '/api/auth/refresh') data = { user, token };
      else if (pathname === '/api/rentals/' + id) data = order;
      return route.fulfill({ json: { success: true, data } });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-11-18T03:00:00Z'));
    await page.goto('http://localhost:4001/rental-orders/' + id);
    await expect(page.getByRole('heading', { name: 'Nguyễn Mai Anh', exact: true })).toBeVisible();
    const overview = page.getByRole('tabpanel', { name: 'Tổng quan' });
    await expect(overview.getByText('Đã cọc (30%)')).toBeVisible();
    await expect(overview.getByRole('row', { name: /Áo dài trắng/ })).toContainText('1.050.000 đ');
    await expect(overview.getByText('3 ngày thuê')).toBeVisible();
    await page.screenshot({ path: path.join(__dirname, 'desktop.png') });
    const back = page.getByRole('link', { name: '← Đơn thuê', exact: true });
    await expect(back).toHaveAttribute('href', '/rental-orders');
    await back.hover();
    await expect(back).toHaveCSS('text-decoration-line', 'none');
    await page.getByRole('button', { name: 'Xem thanh toán' }).click();
    await expect(page.getByRole('tab', { name: 'Thanh toán' })).toBeFocused();
    await expect(page.getByRole('heading', { name: 'Thanh toán tiền thuê', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Tải lại đơn thuê' }).click();
    await expect(page.getByRole('tab', { name: 'Thanh toán' })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('tab', { name: 'Giao & nhận trả' }).click();
    await expect(page.getByRole('button', { name: 'Xác nhận đã giao hàng' })).toBeDisabled();
    await page.getByRole('tab', { name: 'Trang phục' }).click();
    await expect(page.getByRole('heading', { name: 'Chi tiết giá và điều khoản đã xác nhận' })).toBeVisible();
    await page.getByRole('tab', { name: 'Lịch sử' }).click();
    await expect(page.getByRole('heading', { name: 'Lịch sử xử lý đơn thuê' })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('tab', { name: 'Tổng quan' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const sizes = await overview.getByRole('region', { name: 'Bảng trang phục' }).evaluate(el => [el.scrollWidth, el.clientWidth]);
    expect(sizes[0]).toBeGreaterThan(sizes[1]);
    await page.screenshot({ path: path.join(__dirname, 'mobile.png'), fullPage: true });
    expect(requests.filter(([method, pathname]) => method !== 'GET' && pathname !== '/api/auth/refresh')).toEqual([]);
    expect(errors).toEqual([]);
    console.log('Verified all five tabs, amounts, disabled handover, contextual Back, reload, mobile scroll, and no writes.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
