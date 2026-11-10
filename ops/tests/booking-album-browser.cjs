// Invoked by backend/tests/booking-album.cjs with ALBUM_BROWSER_TEST=true.
// Uses its isolated MongoDB and real HTTP routes; only upstream Google is mocked.
const path = require('node:path');
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const { chromium, expect } = require('@playwright/test');
module.exports = async function runAlbumBrowser({
  bookingId,
  photographer,
  jwtToken,
  apiOrigin,
  sourceLink,
  editedLink,
  owner,
  ownerToken,
}) {
  const { createServer } = await import('vite');
  const { default: react } = await import('@vitejs/plugin-react');
  const root = path.resolve(__dirname, '../..');
  const walkthrough = require('./album-demo-walkthrough.cjs')(root);
  const evidence = path.join(root, 'audit/drive-album-2026-11-10');
  await fs.mkdir(evidence, { recursive: true });
  const vite = await createServer({
    configFile: false,
    root: path.join(root, 'frontend'),
    plugins: [react()],
    css: {
      postcss: {
        plugins: [
          require('tailwindcss')(path.join(root, 'frontend/tailwind.config.js')),
          require('autoprefixer')(),
        ],
      },
    },
    resolve: { alias: { '@': path.join(root, 'frontend/src') } },
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiOrigin),
      'import.meta.env.VITE_CLIENT_PORTAL_ENABLED': '"true"',
    },
    server: { host: '127.0.0.1', port: 4023, strictPort: true },
  });
  await vite.listen();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const origin = 'http://127.0.0.1:4023';
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(
      ({ user, token }) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token);
      },
      {
        user: {
          _id: String(photographer._id),
          name: photographer.name,
          username: photographer.username,
          roles: [3],
        },
        token: jwtToken,
      },
    );
    const studio = await context.newPage();
    studio.setDefaultNavigationTimeout(90_000);
    const errors = [];
    studio.on('pageerror', (e) => errors.push(e.message));
    await studio.goto(`${origin}/workflow-bookings/${bookingId}/album`);
    await expect(studio).toHaveURL(
      new RegExp(`/workflow-bookings/${bookingId}/delivery\\?tab=selection$`),
    );
    await studio.goto(`${origin}/workflow-bookings/${bookingId}`);
    await walkthrough.capture(
      studio,
      'Mở từ hồ sơ đơn',
      'Trong mục Bàn giao ảnh, bấm Xem ảnh bàn giao. Cả nguồn Drive, chọn ảnh và ảnh đã chỉnh đều nằm ở đây.',
      studio.getByRole('link', { name: 'Xem ảnh bàn giao', exact: true }),
    );
    await studio.getByRole('link', { name: 'Xem ảnh bàn giao', exact: true }).click();
    await expect(studio.getByRole('tab', { name: 'Ảnh chọn', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await studio.getByLabel('Tên album', { exact: true }).fill('Album thử nghiệm Drive');
    await studio.getByLabel('Thư mục Drive · mỗi link một dòng').fill(sourceLink);
    await studio.getByLabel('Số ảnh được chọn · 0 là không giới hạn').fill('1');
    await walkthrough.capture(
      studio,
      'Studio tạo album',
      'Nhập tên, link thư mục Drive và số ảnh tối đa khách được chọn. Thư mục Drive phải chia sẻ bằng link.',
      studio.getByRole('button', { name: 'Lưu và lấy ảnh', exact: true }),
    );
    await studio.getByRole('button', { name: 'Lưu và lấy ảnh', exact: true }).click();
    await expect(studio.getByRole('heading', { level: 1 })).toHaveText('Album bàn giao');
    await walkthrough.capture(
      studio,
      'Lấy ảnh và xuất bản',
      'Hệ thống đọc ảnh từ thư mục. Studio kiểm tra album rồi mở cho khách chọn.',
      studio.getByRole('button', { name: 'Xuất bản album', exact: true }),
    );
    await studio.getByRole('button', { name: 'Xuất bản album', exact: true }).click();
    await expect(studio.getByText('Đang mở chọn ảnh', { exact: true })).toBeVisible();
    await studio.getByRole('button', { name: 'Tạo link cho khách', exact: true }).click();
    const share = studio.getByLabel('Link khách · lưu lại để gửi');
    await expect(share).toHaveValue(/#access=/);
    const url = await share.inputValue();
    await walkthrough.capture(
      studio,
      'Gửi link riêng cho khách',
      'Link này cho phép xem và chọn ảnh mà không cần tài khoản. Tạo link mới hoặc thu hồi để ngừng truy cập.',
      share,
    );
    const guestContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await guestContext.addInitScript(() => localStorage.setItem('token', 'expired-account-token'));
    const guest = await guestContext.newPage();
    guest.on('pageerror', (e) => errors.push(e.message));
    await guest.goto(url);
    await expect(guest.getByRole('heading', { level: 1 })).toHaveText('Album thử nghiệm Drive');
    await expect(guest.locator('.album-grid img').first()).toBeVisible();
    await walkthrough.capture(
      guest,
      'Khách mở album',
      'Đây là màn khách nhận được khi mở link. Khách xem ảnh, chọn ảnh yêu thích và ghi yêu cầu chỉnh sửa.',
      guest.getByRole('button', { name: 'Chọn IMG_001.jpg', exact: true }),
    );
    await guest.getByRole('button', { name: 'Chọn IMG_001.jpg', exact: true }).click();
    await expect(guest.getByRole('button', { name: 'Bỏ chọn IMG_001.jpg' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await guest.getByRole('button', { name: 'Xem IMG_001.jpg', exact: true }).click();
    await guest.getByLabel('Ghi chú cho studio').fill('Giữ màu da tự nhiên');
    await walkthrough.capture(
      guest,
      'Góp ý ngay trên từng ảnh',
      'Khách mở ảnh lớn, thả tim và lưu lời dặn cho đúng tấm ảnh; không cần gửi danh sách qua tin nhắn.',
      guest.getByLabel('Ghi chú cho studio'),
    );
    await guest.getByRole('button', { name: 'Lưu ghi chú', exact: true }).click();
    await expect(
      guest.getByRole('dialog').getByRole('button', { name: 'Lưu ghi chú' }),
    ).toBeDisabled();
    await guest.keyboard.press('Escape');
    await guest.screenshot({ path: path.join(evidence, 'guest-desktop.png'), fullPage: true });
    const accountContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await accountContext.addInitScript(
      ({ user, token }) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token);
      },
      {
        user: { _id: String(owner._id), name: owner.name, username: owner.username, roles: [6] },
        token: ownerToken,
      },
    );
    const account = await accountContext.newPage();
    account.on('pageerror', (e) => errors.push(e.message));
    await account.goto(`${origin}/account/bookings/${bookingId}/delivery`);
    await expect(account.getByRole('tab', { name: 'Ảnh chọn' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(
      account.getByRole('button', { name: 'Bỏ chọn IMG_001.jpg', exact: true }),
    ).toBeEnabled();
    await expect(account.getByLabel('Thư mục Drive · mỗi link một dòng')).toHaveCount(0);
    await account.getByRole('button', { name: 'Bỏ chọn IMG_001.jpg', exact: true }).click();
    await account.getByRole('button', { name: 'Chọn IMG_001.jpg', exact: true }).click();
    await expect(
      account.getByRole('button', { name: 'Bỏ chọn IMG_001.jpg', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await guest.getByRole('button', { name: 'Tải lại album', exact: true }).click();
    await expect(guest.getByRole('button', { name: 'Hoàn tất lựa chọn' })).toBeEnabled();
    await guest.getByRole('button', { name: 'Hoàn tất lựa chọn', exact: true }).click();
    await walkthrough.capture(
      guest,
      'Khách chốt danh sách',
      'Kiểm tra lần cuối rồi xác nhận. Danh sách và ghi chú ảnh ban đầu được khóa sau khi gửi.',
      guest.getByRole('button', { name: 'Xác nhận gửi lựa chọn', exact: true }),
    );
    await guest.getByRole('button', { name: 'Xác nhận gửi lựa chọn', exact: true }).click();
    await expect(
      guest.getByText('Lựa chọn đã khóa. Liên hệ studio nếu muốn thay đổi.'),
    ).toBeVisible();
    await guest.reload();
    await expect(guest.getByText('Giữ màu da tự nhiên')).toBeVisible();
    await guest.setViewportSize({ width: 390, height: 844 });
    await guest.screenshot({ path: path.join(evidence, 'guest-mobile.png'), fullPage: true });
    await walkthrough.capture(
      guest,
      'Lựa chọn đã lưu và khóa',
      'Mở lại trên điện thoại vẫn giữ kết quả đã chọn. Khi cần thay đổi, studio có thể mở lại danh sách.',
      guest.getByText('Lựa chọn đã khóa. Liên hệ studio nếu muốn thay đổi.'),
    );
    assert.equal(
      await guest.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await studio.getByRole('button', { name: 'Tải lại album', exact: true }).click();
    await expect(studio.getByText('Đã khóa lựa chọn', { exact: true })).toBeVisible();
    await studio.getByRole('button', { name: 'Lấy tên file đã chọn' }).click();
    await expect(
      studio.getByRole('textbox', { name: 'Tên file đã chọn', exact: true }),
    ).toHaveValue('IMG_001.jpg');
    await walkthrough.capture(
      studio,
      'Studio lấy danh sách hậu kỳ',
      'Sao chép tên file đã chọn hoặc tải TXT để lọc ảnh trong phần mềm chỉnh sửa.',
      studio.getByRole('textbox', { name: 'Tên file đã chọn', exact: true }),
    );
    await studio.getByRole('tab', { name: 'Ảnh đã chỉnh', exact: true }).click();
    await studio.getByLabel('Thư mục bản bàn giao · mỗi link một dòng').fill(editedLink);
    await studio.getByRole('button', { name: 'Lấy ảnh đã chỉnh', exact: true }).click();
    await expect(studio.getByRole('button', { name: 'Xem bản chuẩn bị giao' })).toBeEnabled();
    await walkthrough.capture(
      studio,
      'Chuẩn bị ảnh đã chỉnh',
      'Dán thư mục Drive chứa ảnh đã chỉnh, xem trước rồi gửi bản bàn giao mới. Nên dùng thư mục riêng cho từng phiên bản.',
      studio.getByRole('button', { name: 'Gửi bản bàn giao mới', exact: true }),
    );
    await studio.getByRole('button', { name: 'Gửi bản bàn giao mới', exact: true }).click();
    await expect(studio.getByLabel('Phiên bản ảnh')).toHaveValue('1');
    await studio.screenshot({ path: path.join(evidence, 'studio-desktop.png'), fullPage: true });
    await walkthrough.capture(
      studio,
      'Giao ảnh trên cùng link',
      'Bản bàn giao mới xuất hiện ngay trong album hiện tại. Studio không cần gửi một link album khác.',
      studio.getByRole('tab', { name: 'Ảnh đã chỉnh', exact: true }),
    );
    await guest.reload();
    await expect(guest.getByRole('button', { name: 'Xem IMG_001-edited.jpg' })).toBeVisible();
    await guest.getByRole('button', { name: 'Xem IMG_001-edited.jpg' }).click();
    await expect(guest.getByRole('link', { name: 'Tải ảnh' })).toBeVisible();
    await walkthrough.capture(
      guest,
      'Khách xem và tải ảnh đã chỉnh',
      'Khách mở lại chính link đã nhận, chuyển sang ảnh đã chỉnh và tải ảnh trực tiếp về máy.',
      guest.getByRole('link', { name: 'Tải ảnh' }),
    );
    const [download] = await Promise.all([
      guest.waitForEvent('download'),
      guest.getByRole('link', { name: 'Tải ảnh' }).click(),
    ]);
    assert.equal(download.suggestedFilename(), 'IMG_001-edited.jpg');
    assert.equal(await download.failure(), null);
    await guest.getByLabel('Ghi chú cho studio').fill('Tăng sáng một chút');
    await guest.getByRole('button', { name: 'Lưu ghi chú' }).click();
    await expect(
      guest.getByRole('dialog').getByRole('button', { name: 'Lưu ghi chú' }),
    ).toBeDisabled();
    await guest.screenshot({ path: path.join(evidence, 'delivery-mobile.png'), fullPage: true });
    await walkthrough.capture(
      guest,
      'Góp ý bản bàn giao',
      'Ghi chú tiếp tục gắn đúng ảnh và phiên bản. Ekip xử lý yêu cầu chỉnh lại; chủ đơn đăng nhập để nghiệm thu.',
      guest.getByLabel('Ghi chú cho studio'),
    );
    await guest.keyboard.press('Escape');
    await account.reload();
    await expect(account.getByRole('tab', { name: 'Ảnh đã chỉnh' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(account.getByRole('button', { name: 'Xem IMG_001-edited.jpg' })).toBeVisible();
    await account.setViewportSize({ width: 390, height: 844 });
    await account.getByRole('button', { name: 'Xem IMG_001-edited.jpg' }).click();
    await expect(account.getByLabel('Ghi chú cho studio')).toHaveValue('Tăng sáng một chút');
    await account.keyboard.press('Escape');
    await walkthrough.capture(
      account,
      'Chủ đơn nghiệm thu tại màn bàn giao',
      'Chủ đơn xem ảnh đã chỉnh, gửi phản hồi hoặc xác nhận ảnh đạt yêu cầu ngay trong tài khoản. Link khách và tài khoản dùng chung album.',
      account.getByRole('button', { name: 'Xác nhận ảnh đã đạt yêu cầu' }),
    );
    await account.getByRole('button', { name: 'Xác nhận ảnh đã đạt yêu cầu' }).click();
    await expect(account.getByRole('button', { name: 'Xác nhận ảnh đã đạt yêu cầu' })).toHaveCount(
      0,
    );
    assert.equal(
      await account.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await studio.getByRole('tab', { name: 'Ảnh chọn', exact: true }).click();
    await studio.getByRole('button', { name: 'Thu hồi link', exact: true }).click();
    await expect(studio.getByRole('alert')).toContainText('Album đã thay đổi');
    await studio.getByRole('button', { name: 'Tải lại album', exact: true }).click();
    await expect(studio.getByRole('alert')).toHaveCount(0);
    await studio.getByRole('button', { name: 'Thu hồi link', exact: true }).click();
    await expect(
      studio.getByRole('button', { name: 'Tạo link cho khách', exact: true }),
    ).toBeVisible();
    await guest.reload();
    await expect(guest.getByRole('heading', { name: 'Album chưa khả dụng' })).toBeVisible();
    await walkthrough.capture(
      guest,
      'Thu hồi link khi cần',
      'Sau khi studio thu hồi link, link cũ dừng hoạt động. Quyền chia sẻ thư mục Drive được quản lý riêng trên Google Drive.',
      guest.getByRole('heading', { name: 'Album chưa khả dụng' }),
    );
    assert.ok(!guest.url().includes('/login'));
    assert.deepEqual(errors, []);
    await fs.writeFile(
      path.join(evidence, 'result.json'),
      JSON.stringify(
        {
          passed: true,
          upstream: 'Google fixture only',
          database: 'isolated test database',
          viewports: [1440, 390],
          browserErrors: errors,
          checked: [
            'staff creates/syncs/publishes',
            'guest selects/comments/finalizes',
            'refresh retains choices',
            'TXT export',
            'same-link Drive delivery',
            'mobile download/comments',
            'revoked link denied without login redirect',
          ],
        },
        null,
        2,
      ),
    );
    await guestContext.close();
    await accountContext.close();
    await context.close();
    await walkthrough.finish();
  } finally {
    await browser.close();
    await vite.close();
  }
};
