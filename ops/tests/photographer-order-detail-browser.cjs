// Browser check for the real routes using isolated API responses.
const { chromium, expect } = require('@playwright/test');
const path = require('node:path');

const yearbookId = '000000000000000000261115';
const conceptId = '000000000000000000000002';
// The portrait has pre-rotation metadata, and the square has no stored dimensions.
const galleryPhotos = [
  {
    width: 1200,
    height: 800,
    png: 'iVBORw0KGgoAAAANSUhEUgAAAAwAAAAICAIAAABChommAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQYlWNwTakkiBhGFQEA0EpswV0RfKIAAAAASUVORK5CYII=',
  },
  {
    width: 1200,
    height: 800,
    png: 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAMCAIAAADQ/GvKAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFElEQVQYlWOoTHDFihhGJVzRggAA785rQQvpIVkAAAAASUVORK5CYII=',
  },
  {
    width: 0,
    height: 0,
    png: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFElEQVQYlWNIC6nGgxhGpUOwBAsAEkV4tRbw2eYAAAAASUVORK5CYII=',
  },
];
const photoFixture = (index) =>
  galleryPhotos[(index + Math.floor(index / 3)) % galleryPhotos.length];
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
    let albumReads = 0;
    await context.route('**/api/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === base + '/album') albumReads++;
      if (pathname.startsWith(base + '/album/photos/')) {
        const index = Number(pathname.split('/photo-').pop()) - 1;
        await route.fulfill({
          contentType: 'image/png',
          body: Buffer.from(photoFixture(index).png, 'base64'),
        });
        return;
      }
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
    expect(albumReads).toBe(0);
    const deliveryTab = page.getByRole('tab', { name: 'Bàn giao' });
    await deliveryTab.click();
    const delivery = page.getByRole('tabpanel', { name: 'Bàn giao' });
    await expect(delivery.getByRole('heading', { name: 'Chuẩn bị album ảnh gốc' })).toBeVisible();
    const steps = delivery.getByRole('navigation', { name: 'Các bước bàn giao' });
    for (const label of ['Album ảnh gốc', 'Yêu cầu chỉnh ảnh', 'Ảnh đã chỉnh', 'Nghiệm thu']) {
      await expect(steps.getByRole('button', { name: label })).toBeVisible();
    }
    await expect(delivery.getByText('Xem ảnh bàn giao', { exact: true })).toHaveCount(0);
    await expect(page).toHaveURL(
      'http://localhost:4001/workflow-bookings/' + yearbookId + '?tab=delivery',
    );
    const albumName = delivery.getByLabel('Tên album');
    await albumName.fill('Bản nháp chưa lưu');
    const readsAfterOpening = albumReads;
    await page.getByRole('tab', { name: 'Tổng quan' }).click();
    await overview.getByRole('button', { name: 'Xem ảnh bàn giao' }).click();
    await expect(deliveryTab).toBeFocused();
    await expect(albumName).toHaveValue('Bản nháp chưa lưu');
    expect(albumReads).toBe(readsAfterOpening);
    const back = page.getByRole('link', { name: 'Đơn chụp ảnh', exact: true }).last();
    await expect(back).toHaveAttribute('href', returnTo);
    await back.hover();
    await expect(back).toHaveCSS('text-decoration-line', 'none');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(steps.getByRole('button', { name: 'Album ảnh gốc' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
    if (out)
      await page.screenshot({
        path: path.join(out, 'photographer-order-1-mobile.png'),
        fullPage: true,
      });
    await page.goto(
      'http://localhost:4001/workflow-bookings/' + yearbookId + '/delivery?tab=selection',
    );
    await expect(delivery.getByRole('heading', { name: 'Chuẩn bị album ảnh gốc' })).toBeVisible();
    responses[base + '/album'] = {
      publicId: 'photo-gallery-fixture',
      title: 'Album kỉ yếu test',
      status: 'draft',
      version: 1,
      limit: 0,
      coverId: 'drive-5',
      folders: [],
      deliveryVersions: [],
      photos: Array.from({ length: 29 }, (_, index) => ({
        id: `photo-${index + 1}`,
        driveId: `drive-${index + 1}`,
        name: `DSC_${index + 1}.jpg`,
        folderId: 'fixture',
        source: 'drive',
        available: true,
        selected: false,
        note: '',
        width: photoFixture(index).width,
        height: photoFixture(index).height,
        deliveryVersion: 0,
      })),
    };
    await page.setViewportSize({ width: 1487, height: 1058 });
    await page.goto('http://localhost:4001/workflow-bookings/' + yearbookId + '?tab=delivery');
    const gallery = delivery.getByRole('region', { name: 'Khung cuộn ảnh' });
    const galleryLayout = () =>
      gallery.evaluate((frame) => {
        const { top, bottom } = frame.getBoundingClientRect();
        const photos = Array.from(frame.querySelectorAll('li'));
        return {
          photosInFrame: photos.filter((photo) => {
            const bounds = photo.getBoundingClientRect();
            return bounds.top >= top - 1 && bounds.bottom <= bottom + 1;
          }).length,
          canScroll: frame.scrollHeight > frame.clientHeight,
          scrollsHorizontally: frame.scrollWidth > frame.clientWidth,
        };
      });
    await expect(gallery).toBeVisible();
    const firstRow = gallery.locator('.photographer-delivery__gallery-row').first();
    await expect
      .poll(() =>
        firstRow.evaluate((row) => {
          const photos = Array.from(row.querySelectorAll('img'));
          if (photos.length !== 3 || photos.some((photo) => !photo.naturalWidth)) return null;
          const [landscape, portrait, square] = photos.map((photo) =>
            photo.getBoundingClientRect(),
          );
          const bounds = row.getBoundingClientRect();
          return {
            names: photos.map((photo) => photo.alt),
            sameHeight: [portrait, square].every(
              (photo) =>
                Math.abs(photo.top - landscape.top) < 1 &&
                Math.abs(photo.bottom - landscape.bottom) < 1,
            ),
            proportionalWidths: landscape.width > square.width && square.width > portrait.width,
            fillsRow:
              Math.abs(landscape.left - bounds.left) < 1 &&
              Math.abs(square.right - bounds.right) < 1,
            preservesAspect: photos.every((photo) => {
              const { width, height } = photo.getBoundingClientRect();
              return Math.abs(height - width * (photo.naturalHeight / photo.naturalWidth)) < 1;
            }),
            clearBackground: photos.every(
              (photo) =>
                getComputedStyle(photo.parentElement).backgroundColor === 'rgba(0, 0, 0, 0)',
            ),
          };
        }),
      )
      .toEqual({
        names: ['DSC_1.jpg', 'DSC_2.jpg', 'DSC_3.jpg'],
        sameHeight: true,
        proportionalWidths: true,
        fillsRow: true,
        preservesAspect: true,
        clearBackground: true,
      });
    const galleryWindow = { photosInFrame: 9, canScroll: true, scrollsHorizontally: false };
    await expect.poll(galleryLayout).toEqual(galleryWindow);
    await expect(delivery.getByRole('button', { name: /Xem thêm ảnh/ })).toHaveCount(0);
    await expect(gallery.getByRole('button', { name: 'Xem DSC_29.jpg' })).toHaveCount(0);
    await gallery.press('End');
    const lastPhoto = gallery.getByRole('button', { name: 'Xem DSC_29.jpg' });
    await expect(lastPhoto).toBeAttached();
    await lastPhoto.click();
    await expect(page.getByRole('dialog', { name: 'DSC_29.jpg' })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 390, height: 844 });
    await gallery.evaluate((frame) => {
      frame.scrollTop = 0;
    });
    await expect.poll(galleryLayout).toEqual(galleryWindow);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
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
    console.log(
      'Photographer order, justified 9-photo scrolling gallery, and concept browser checks passed.',
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
