// Existing user-management UI, isolated API doubles, no account mutations.
const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve(__dirname, '../../audit/users-navigation-2026-11-18');

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const user = { _id: 'ui-admin', username: 'ui.admin', name: 'Quản trị viên', roles: [0], isActive: true };
    const users = [user, { _id: 'ui-client', username: 'ui.client', name: 'Khách hàng minh họa', roles: [6], isActive: true }];
    const token = 'test.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url') + '.test';
    const mutations = [];
    await context.addInitScript(({ token }) => localStorage.setItem('token', token), { token });
    await context.route('**/api/**', (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      if (request.method() !== 'GET' && pathname !== '/api/auth/refresh') mutations.push(pathname);
      let data = [];
      if (pathname === '/api/auth/refresh') data = { user, token };
      else if (pathname === '/api/auth/me') data = { user };
      else if (pathname === '/api/users') data = users;
      return route.fulfill({ status: 200, json: { success: true, data } });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://localhost:4001/customers/users');
    await expect(page.getByRole('heading', { name: 'Quản lý người dùng' })).toBeVisible();
    await expect(page.getByText('Khách hàng minh họa', { exact: true })).toBeVisible();
    const sidebarUsers = page.getByRole('link', { name: 'Người dùng', exact: true });
    await expect(sidebarUsers).toHaveCount(1);
    await expect(sidebarUsers).toHaveAttribute('href', '/customers/users');
    await expect(sidebarUsers).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('button', { name: 'Khách hàng', exact: true })).toHaveAttribute('aria-expanded', 'true');
    await page.screenshot({ path: path.join(out, 'desktop.png') });
    await page.getByRole('button', { name: 'Thêm người dùng' }).click();
    await expect(page.getByRole('dialog', { name: 'Thêm người dùng' })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('row').filter({ hasText: 'ui.client' }).getByRole('button', { name: 'Sửa', exact: true }).click();
    const edit = page.getByRole('dialog', { name: 'Sửa người dùng' });
    await expect(edit.getByRole('textbox', { name: 'Tên đăng nhập' })).toHaveValue('ui.client');
    await page.keyboard.press('Escape');
    await page.goto('http://localhost:4001/manage/users?page=2#accounts');
    await expect(page).toHaveURL(/\/customers\/users\?page=2#accounts$/);
    await expect(page.getByRole('heading', { name: 'Quản lý người dùng' })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 900 });
    await page.screenshot({ path: path.join(out, 'mobile.png') });
    await page.getByRole('button', { name: 'Mở menu' }).click();
    const drawer = page.getByRole('dialog', { name: 'Điều hướng nội bộ' });
    await expect(drawer.getByRole('link', { name: 'Người dùng', exact: true })).toHaveAttribute('aria-current', 'page');
    await page.screenshot({ path: path.join(out, 'mobile-menu.png') });
    expect(mutations).toEqual([]);
    expect(errors).toEqual([]);
    console.log('Passed: Users in Customers on desktop/mobile, staff and customer accounts, existing create/edit forms, old URL redirect, no account mutations or page errors.');
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exit(1); });
