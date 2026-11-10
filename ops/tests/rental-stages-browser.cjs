// Read-only checks of the local sandbox on the project's shared frontend port.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const r = require('node:module').createRequire(path.join(root, 'backend/package.json'));
const { chromium, expect } = require('@playwright/test');
const { MongoClient } = r('mongodb');
const jwt = r('jsonwebtoken');

async function main() {
  const uri = new URL(
    r('dotenv').parse(fs.readFileSync(path.join(root, 'backend/.env'))).MONGO_URI,
  );
  assert.ok(['localhost', '127.0.0.1'].includes(uri.hostname));
  uri.pathname = '/studio_sepay_sandbox';
  const client = await MongoClient.connect(uri.toString());
  let browser;
  try {
    const db = client.db();
    const actors = [
      await db.collection('users').findOne({ username: 'mango' }),
      await db.collection('users').findOne({ roles: 0, isActive: true }),
    ];
    assert.ok(actors.every(Boolean));
    const profile = JSON.parse(
      fs.readFileSync(path.join(root, '.workflow-tools/.env.sepay-sandbox')),
    );
    const evidence = path.join(root, 'audit/rental-auto-checkout-2026-11-10');
    const views = [
      '',
      'awaiting_confirmation',
      'ready_for_pickup',
      'renting',
      'settling',
      'completed',
      'cancelled',
    ];
    const labels = [
      'Tất cả',
      'Chờ xác nhận',
      'Chờ nhận đồ',
      'Đang thuê',
      'Chờ đối soát',
      'Hoàn tất',
      'Đã hủy',
    ];
    const report = [];
    const errors = [];
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const [index, actor] of actors.entries()) {
      const token = jwt.sign({ id: String(actor._id) }, profile.jwtSecret, { expiresIn: '10m' });
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      await context.addInitScript(
        ({ token, user }) => {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
        },
        {
          token,
          user: {
            _id: String(actor._id),
            username: actor.username,
            name: actor.name,
            roles: actor.roles,
          },
        },
      );
      const page = await context.newPage();
      page.setDefaultTimeout(30000);
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(
        'http://localhost:4001' + (index ? '/rental-orders' : '/account/orders?tab=rentals'),
      );
      const select = page.getByLabel(index ? 'Trạng thái đơn' : 'Trạng thái', { exact: true });
      try {
        await expect(select).toBeVisible({ timeout: 30000 });
      } catch (error) {
        console.log(
          JSON.stringify({
            url: page.url(),
            selects: await page.locator('select').evaluateAll((items) =>
              items.map((item) => ({
                html: item.outerHTML,
                label: item.parentElement.textContent,
              })),
            ),
          }),
        );
        await page.screenshot({
          path: path.join(evidence, 'stages-browser-failure.png'),
          fullPage: true,
        });
        throw error;
      }
      assert.deepEqual(await select.locator('option').allTextContents(), labels);
      for (const view of views) {
        const api = await fetch(
          'http://localhost:4001/api/rentals' + (view ? '?view=' + view : ''),
          {
            headers: { Authorization: 'Bearer ' + token },
          },
        );
        assert.equal(api.status, 200);
        const result = await api.json();
        assert.ok(!view || result.data.every((order) => order.orderStage === view));
        if (view) {
          const response = page.waitForResponse(
            (response) =>
              response.url().includes('/api/rentals?') &&
              new URL(response.url()).searchParams.get('view') === view &&
              response.status() === 200,
          );
          await select.selectOption(view);
          await response;
        }
        const rows = index
          ? page.locator('tbody tr').filter({ has: page.locator('td a') })
          : page
              .getByRole('list', { name: 'Danh sách đơn thuê trang phục' })
              .locator(':scope > li');
        await expect(rows).toHaveCount(result.data.length);
        assert.ok(
          !/\[Sandbox\]|\[Demo\]|\[Mẫu mango\]/.test(await page.locator('body').innerText()),
        );
        report.push({
          role: index ? 'studio' : 'client',
          view: view || 'all',
          total: result.pagination.total,
        });
      }
      await page.screenshot({
        path: path.join(evidence, index ? 'stages-studio.png' : 'stages-client.png'),
        fullPage: true,
      });
      if (!index) {
        await page.setViewportSize({ width: 390, height: 844 });
        await expect(page.getByRole('region', { name: 'Tiến độ đơn' })).toBeVisible();
        await expect(page.getByText('Đơn đã hết hạn thanh toán cọc.')).toBeVisible();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.screenshot({
          path: path.join(evidence, 'stages-client-mobile.png'),
          fullPage: true,
        });
        await page.getByRole('link', { name: /Xem hồ sơ đầy đủ/ }).click();
        await expect(page.getByRole('region', { name: 'Tiến độ đơn' })).toBeVisible();
        await expect(page.getByText('Đơn đã hết hạn thanh toán cọc.')).toBeVisible();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        assert.ok(!/\[Sandbox\]|\[Demo\]/.test(await page.locator('body').innerText()));
      }
      await context.close();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(evidence, 'stages-browser.json'),
      JSON.stringify({ passed: true, report, errors }, null, 2),
    );
    console.log(
      'Rental stages: client/studio filters, desktop/mobile, clean labels and detail passed on port 4001.',
    );
  } finally {
    await browser?.close();
    await client.close();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
