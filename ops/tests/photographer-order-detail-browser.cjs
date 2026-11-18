// Browser check for the real routes using isolated API responses.
const { chromium, expect } = require('@playwright/test');
const path = require('node:path');

const yearbookId = '000000000000000000261115';
const conceptId = '000000000000000000000002';
const user = {
  _id: 'photo-one',
  username: 'photo.test',
  name: 'Lê Minh Đức',
  roles: [3],
  isActive: true,
};
const startAt = '2026-11-15T01:00:00Z';
const endAt = '2026-11-15T05:00:00Z';
const shoot = {
  shootDate: startAt,
  startTime: '08:00',
  endTime: '12:00',
  location: 'Sân trường Yume, Hà Nội',
};
const lead = { _id: user._id, name: user.name };
const support = { _id: 'photo-two', name: 'Trần Gia Bảo' };
const booking = {
  _id: yearbookId,
  status: 'approved',
  packageName: 'Kỉ yếu trọn gói',
  className: 'Lớp 12A12',
  school: 'THPT Yume',
  members: 30,
  contactName: 'Mai Anh',
  startAt,
  endAt,
  location: shoot.location,
  note: 'Ưu tiên ảnh tập thể ở sân trường.',
};
const workflow = {
  bookingId: yearbookId,
  version: 3,
  lifecycle: 'editing',
  orderStage: 'editing',
  shootWindow: { startAt, endAt },
  assignedPhotographer: lead,
  assignedSupportPhotographers: [support],
  quote: {
    version: 1,
    acceptedAt: startAt,
    lines: [],
    delivery: { targetDays: 7, targetDate: '2026-11-22T03:00:00Z' },
    terms: [],
    editingTerms: [],
    proposedSchedule: shoot,
  },
  resources: {
    scheduleId: 'schedule-1',
    scheduleDetails: shoot,
    photographers: [lead._id, support._id],
    costumes: [],
  },
  members: [],
  allowedCostumes: [],
  progress: { status: 'editing', deliveryVersion: 0, revisionRequests: [] },
  quoteHistory: [],
  deliveryHistory: [],
  events: [{ action: 'progress.update', at: endAt, message: 'Chuyển sang hậu kỳ' }],
};
const concept = {
  _id: conceptId,
  version: 1,
  status: 'shot',
  startAt,
  endAt,
  snapshot: {
    name: 'Gói Ngoại cảnh',
    conceptName: 'Ánh nắng',
    retouchQuota: 3,
    durationMinutes: 240,
  },
  contactName: 'Khách test',
  phone: '',
  people: 1,
  brief: 'Chụp ở khuôn viên ngoài trời.',
  references: [],
  costumes: [],
  wardrobe: 'prepared',
  photographer: lead._id,
  photographerName: lead.name,
  editor: support._id,
  editorName: support.name,
  paymentRequests: [],
  canEdit: true,
  events: [
    { action: 'shot', at: endAt, message: 'Buổi chụp hoàn tất; mời thanh toán phần còn lại.' },
  ],
};

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const out = process.env.PHOTO_ORDER_QA;
  try {
    const context = await browser.newContext({
      viewport: { width: 1487, height: 1058 },
      colorScheme: 'dark',
    });
    const token =
      'test.' + Buffer.from(JSON.stringify({ exp: 2208988800 })).toString('base64url') + '.test';
    await context.addInitScript((value) => {
      localStorage.setItem('themeMode', 'dark');
      localStorage.setItem('token', value);
    }, token);
    const base = '/api/bookings/' + yearbookId;
    const responses = {
      '/api/auth/refresh': { user, token },
      [base + '/workflow']: { booking, workflow },
      [base + '/album']: null,
      ['/api/concept-orders/' + conceptId]: concept,
      ['/api/concept-orders/' + conceptId + '/album']: null,
      '/api/workflows/photographer-orders': [
        {
          _id: yearbookId,
          service: 'yearbook',
          title: booking.className,
          packageName: booking.packageName,
          stage: 'editing',
          shootDate: startAt,
          startTime: '08:00',
          endTime: '12:00',
          updatedAt: endAt,
          role: 'lead',
        },
      ],
    };
    await context.route('**/api/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      const data = Object.hasOwn(responses, pathname) ? responses[pathname] : [];
      await route.fulfill({
        json: { success: true, data, pagination: { total: 22, page: 2, limit: 20 } },
      });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-11-18T03:00:00Z'));
    const returnTo = '/workflow-bookings?service=yearbook&view=editing&page=2';
    await page.goto('http://localhost:4001' + returnTo);
    await page.getByRole('link', { name: booking.className }).click();
    const overview = page.getByRole('tabpanel', { name: 'Tổng quan' });
    await expect(overview.getByText('Thợ chính · Bạn')).toBeVisible();
    await expect(overview.getByText(support.name)).toBeVisible();
    await expect(overview.getByText(/Hạn bàn giao/)).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Thanh toán' })).toHaveCount(0);
    if (out) await page.screenshot({ path: path.join(out, 'photographer-order-1-desktop.png') });
    await page.getByRole('tab', { name: 'Lịch & ekip' }).click();
    await expect(page.getByText(booking.note)).toBeVisible();
    await page.getByRole('button', { name: 'Tải lại hồ sơ' }).click();
    await expect(page.getByRole('tab', { name: 'Lịch & ekip' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.getByRole('tab', { name: 'Lịch sử' }).click();
    await expect(page.getByRole('heading', { name: 'Lịch sử xử lý' })).toBeVisible();
    await page.getByRole('tab', { name: 'Tổng quan' }).click();
    await overview.getByRole('link', { name: 'Xem ảnh bàn giao' }).click();
    await expect(page.getByRole('heading', { name: 'Album bàn giao' })).toBeVisible();
    await page.getByRole('link', { name: 'Quay lại hồ sơ đơn' }).click();
    const back = page.getByRole('link', { name: 'Đơn chụp ảnh', exact: true }).last();
    await expect(back).toHaveAttribute('href', returnTo);
    await back.hover();
    await expect(back).toHaveCSS('text-decoration-line', 'none');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(overview.getByRole('link', { name: 'Xem ảnh bàn giao' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
    if (out)
      await page.screenshot({
        path: path.join(out, 'photographer-order-1-mobile.png'),
        fullPage: true,
      });
    await page.goto('http://localhost:4001/concept-orders/' + conceptId);
    await expect(page.getByRole('heading', { name: concept.snapshot.conceptName })).toBeVisible();
    await page.getByRole('button', { name: 'Xem ảnh bàn giao' }).click();
    await expect(page.getByRole('tab', { name: 'Bàn giao' })).toBeFocused();
    await expect(page.getByRole('heading', { name: 'Album và hậu kỳ' })).toBeVisible();
    await page.getByRole('tab', { name: 'Lịch & ekip' }).click();
    await expect(page.getByText(concept.brief)).toBeVisible();
    await expect(
      page.getByRole('tabpanel', { name: 'Lịch & ekip' }).getByText(support.name),
    ).toBeVisible();
    expect(errors).toEqual([]);
    console.log('Photographer yearbook and concept browser checks passed.');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
