// Isolated browser verification: API doubles only, no live accounts or business writes.
const { chromium, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const root = path.resolve(__dirname, '../..');
  process.chdir(path.join(root, 'frontend'));
  const output = path.join(root, 'audit/no-seasons-2026-11-26');
  fs.mkdirSync(output, { recursive: true });
  const { createServer } = await import('vite');
  const server = await createServer({
    root: path.join(root, 'frontend'),
    server: { host: '127.0.0.1', port: 14021, strictPort: true },
  });
  await server.listen();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    for (const role of [1, 3]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const user = {
        _id: '000000000000000000000001',
        username: 'qa.user',
        name: 'Tài khoản kiểm thử',
        roles: [role],
        isActive: true,
      };
      const token =
        'test.' +
        Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 })).toString(
          'base64url',
        ) +
        '.test';
      const requests = [],
        errors = [];
      await context.addInitScript(({ token }) => localStorage.setItem('token', token), { token });
      await context.route('**/api/**', async (route) => {
        const url = new URL(route.request().url());
        requests.push(url.pathname + url.search);
        let data = [];
        if (url.pathname === '/api/auth/refresh') data = { token, user };
        else if (url.pathname === '/api/auth/me') data = { user };
        else if (url.pathname === '/api/dashboard/photographer')
          data = {
            from: '2026-11-01',
            to: '2026-11-30',
            now: '2026-11-26T12:00:00Z',
            nextRefreshAt: '2099-01-01',
            counts: { shoots: 0, upcoming: 0, editing: 0, review: 0, completed: 0, overdue: 0 },
            breakdown: { concept: 0, yearbook: 0 },
            chart: [],
            priority: [],
          };
        else if (url.pathname === '/api/dashboard')
          data = {
            totals: { income: 0, expense: 0, profit: 0 },
            daily: [],
            customerCount: 0,
            scheduleCount: 0,
            showSchedules: true,
            upcomingSchedules: [],
          };
        else if (url.pathname.endsWith('/summary')) data = [];
        await route.fulfill({
          status: 200,
          json: { success: true, data, pagination: { total: 0, page: 1, limit: 20 } },
        });
      });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      const cases =
        role === 1
          ? [
              ['/customers', '+ Thêm lớp', 'Thêm lớp mới'],
              ['/schedules', '+ Thêm lịch', 'Thêm lịch chụp'],
              ['/manage/finance', '+ Thêm giao dịch', 'Thêm giao dịch'],
              ['/', null, null],
            ]
          : [['/', null, null]];
      for (const [route, button, dialog] of cases) {
        await page.goto('http://127.0.0.1:14021' + route);
        await expect(page.getByRole('navigation', { name: 'Chức năng nội bộ' })).toBeVisible();
        await expect(page.getByText('Mùa chụp', { exact: true })).toHaveCount(0);
        if (button) {
          // Both caption variants are used by existing staff action buttons.
          const action = page.getByRole('button', { name: button, exact: true });
          await action.click();
          await expect(page.getByRole('dialog', { name: dialog, exact: true })).toBeVisible();
          await expect(page.getByRole('combobox', { name: 'Mùa chụp' })).toHaveCount(0);
        }
        await page.screenshot({
          path: path.join(output, `role-${role}-${route.replace(/\W/g, '_') || 'dashboard'}.png`),
        });
        if (button) await page.keyboard.press('Escape');
      }
      await page.setViewportSize({ width: 390, height: 900 });
      await page.goto('http://127.0.0.1:14021' + (role === 1 ? '/customers' : '/'));
      await expect(page.getByText('Mùa chụp', { exact: true })).toHaveCount(0);
      assert.ok(
        requests.every((request) => !/season/i.test(request)),
        'Obsolete season API request',
      );
      assert.deepEqual(errors, []);
      results.push({ role, noSeasonControls: true, noSeasonRequests: true, noBrowserErrors: true });
      await context.close();
    }
    fs.writeFileSync(
      path.join(output, 'result.json'),
      JSON.stringify({ ok: true, results }, null, 2),
    );
    console.log(JSON.stringify({ ok: true, results }));
  } finally {
    await browser.close();
    await server.close();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
