// Browser regression for removed messaging integration, using isolated API doubles.
const { chromium, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const output = path.resolve(__dirname, '../../audit/telegram-removal-2026-11-25');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    for (const role of [0, 1, 3, 6]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      try {
        let user = {
          _id: '000000000000000000000001',
          username: 'ui.account',
          name: 'Tài khoản kiểm tra',
          roles: [role],
          isActive: true,
          telegramId: 'obsolete-fixture-field',
        };
        const other = {
          _id: '000000000000000000000002',
          username: 'ui.client',
          name: 'Khách kiểm tra',
          roles: [6],
          isActive: true,
          telegramId: 'obsolete-column',
        };
        const token =
          'test.' +
          Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 })).toString(
            'base64url',
          ) +
          '.test';
        const requests = [],
          errors = [],
          updates = [];
        await context.addInitScript(({ token }) => localStorage.setItem('token', token), { token });
        await context.route('**/api/**', async (route) => {
          const request = route.request(),
            pathname = new URL(request.url()).pathname;
          requests.push(pathname);
          let data = [];
          if (pathname === '/api/auth/refresh') data = { user, token };
          else if (pathname === '/api/auth/me') data = { user };
          else if (pathname === '/api/auth/profile' && request.method() === 'PATCH') {
            const body = request.postDataJSON();
            updates.push(body);
            user = { ...user, name: body.name };
            data = user;
          } else if (pathname === '/api/users') data = [user, other];
          await route.fulfill({ status: 200, json: { success: true, data } });
        });
        const page = await context.newPage();
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });
        await page.goto('http://127.0.0.1:14001' + (role === 6 ? '/account/profile' : '/profile'));
        await expect(
          page.getByRole('heading', { name: 'Hồ sơ cá nhân', exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole('heading', { name: 'Thông tin cá nhân', exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole('heading', { name: 'Đổi mật khẩu', exact: true }),
        ).toBeVisible();
        await expect(page.getByText(/telegram/i)).toHaveCount(0);
        await page.getByLabel('Họ tên hiển thị', { exact: true }).fill('Tên cập nhật');
        await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
        await expect.poll(() => updates.length).toBe(1);
        expect(updates[0]).toEqual({ name: 'Tên cập nhật' });
        await page.screenshot({ path: path.join(output, 'profile-role-' + role + '.png') });
        await page.setViewportSize({ width: 390, height: 900 });
        await expect(
          page.getByRole('heading', { name: 'Đổi mật khẩu', exact: true }),
        ).toBeVisible();
        await expect(page.getByText(/telegram/i)).toHaveCount(0);
        await page.screenshot({ path: path.join(output, 'profile-role-' + role + '-mobile.png') });
        if (role === 0 || role === 1) {
          await page.setViewportSize({ width: 1440, height: 1000 });
          await page.goto('http://127.0.0.1:14001/customers/users');
          await expect(
            page.getByRole('heading', { name: 'Quản lý người dùng', exact: true }),
          ).toBeVisible();
          await expect(page.getByRole('columnheader', { name: /telegram/i })).toHaveCount(0);
          await expect(page.getByText('Khách kiểm tra', { exact: true })).toBeVisible();
          await expect(page.getByText('obsolete-column', { exact: true })).toHaveCount(0);
          await page.getByRole('button', { name: 'Thêm người dùng', exact: true }).click();
          await expect(
            page.getByRole('dialog', { name: 'Thêm người dùng', exact: true }),
          ).toBeVisible();
          await page.keyboard.press('Escape');
          await expect(
            page.getByRole('dialog', { name: 'Thêm người dùng', exact: true }),
          ).toBeHidden();
          await page.screenshot({ path: path.join(output, 'users-role-' + role + '.png') });
        }
        assert(!requests.some((url) => /telegram/i.test(url)), 'Unexpected messaging API request');
        expect(errors).toEqual([]);
        results.push({
          role,
          profileSave: true,
          desktopAndMobile: true,
          noMessagingUIOrRequests: true,
          noBrowserErrors: true,
        });
      } finally {
        await context.close();
      }
    }
    fs.writeFileSync(
      path.join(output, 'result.json'),
      JSON.stringify({ ok: true, results }, null, 2),
    );
    console.log(JSON.stringify({ ok: true, results }));
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
