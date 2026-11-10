// Browser QA against the requested sample. Writes are intercepted, so the user's album stays intact.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium, expect } = require('@playwright/test');
const root = path.resolve(__dirname, '../..'), r = require('node:module').createRequire(path.join(root, 'backend/package.json'));
const env = r('dotenv').parse(fs.readFileSync(path.join(root, 'backend/.env')));
require('../mongodb-windows.cjs').validateNativeUri(env.MONGO_URI);
const id = 'a1cb560ddff53e2331375b45', origin = 'http://127.0.0.1:4001';
const evidence = path.join(root, 'audit/delivery-redesign-2026-11-06');
async function main() {
  const uri = new URL(env.MONGO_URI); uri.pathname = '/studio_db';
  const db = new (r('mongodb').MongoClient)(uri.toString()); await db.connect();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const user = await db.db().collection('users').findOne({ username: 'mango' });
    const token = r('jsonwebtoken').sign({ id: String(user._id) }, env.JWT_SECRET, { expiresIn: '15m' });
    const response = await fetch(`http://127.0.0.1:5002/api/bookings/${id}/workflow`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200); const original = (await response.json()).data;
    assert.equal(original.workflow.progress.photos.length, 6);
    const context = await browser.newContext({ viewport: { width: 1488, height: 1058 }, deviceScaleFactor: 1 });
    await context.addInitScript(({ token, user }) => { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)); }, { token, user: { _id: String(user._id), name: user.name, username: user.username, roles: user.roles } });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route(`**/api/bookings/${id}/workflow/actions`, async route => {
      const body = route.request().postDataJSON(), data = structuredClone(original);
      assert.equal(body.deliveryVersion, original.workflow.progress.deliveryVersion);
      if (body.action === 'revision.request') {
        assert.equal(body.note, 'Ảnh 01: chỉnh sáng hơn');
        data.workflow.lifecycle = 'revision_requested';
        data.workflow.progress.revisionRequests.push({ _id: 'preview-feedback', note: body.note, at: new Date().toISOString(), deliveryVersion: body.deliveryVersion });
      } else {
        assert.equal(body.action, 'delivery.accept');
        data.workflow.lifecycle = 'accepted';
        data.workflow.progress.acceptedDeliveryVersion = body.deliveryVersion;
        data.workflow.progress.acceptedAt = new Date().toISOString();
      }
      await route.fulfill({ json: { success: true, data } });
    });
    await page.goto(`${origin}/account/bookings/${id}/delivery`);
    await expect(page.getByRole('heading', { name: 'Album bàn giao', exact: true })).toBeVisible();
    const viewer = page.getByRole('figure', { name: 'Ảnh đang xem' });
    const ready = () => expect(viewer.locator('img')).toHaveJSProperty('complete', true);
    await ready(); await expect(viewer.locator('img')).not.toHaveJSProperty('naturalWidth', 0);
    await expect(page.getByRole('button', { name: 'Ảnh trước', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Ảnh tiếp', exact: true }).click();
    await expect(viewer).toContainText('2 / 6'); await ready();
    await viewer.focus(); await page.keyboard.press('ArrowLeft'); await expect(viewer).toContainText('1 / 6'); await ready();
    await page.getByRole('button', { name: 'Xem toàn màn hình', exact: true }).click();
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
    await page.getByRole('button', { name: 'Thoát toàn màn hình', exact: true }).click();
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
    const download = page.waitForEvent('download'); await page.getByRole('link', { name: 'Tải ảnh đang xem' }).click();
    assert.ok((await download).suggestedFilename().endsWith('.jpg'));
    await page.evaluate(() => document.activeElement?.blur());
    fs.mkdirSync(evidence, { recursive: true });
    await page.screenshot({ path: path.join(evidence, 'desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(evidence, 'mobile.png'), fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'No mobile page overflow');
    await page.getByLabel('Nội dung phản hồi').fill('Ảnh 01: chỉnh sáng hơn');
    await page.getByRole('button', { name: 'Gửi phản hồi', exact: true }).click();
    await expect(page.getByText('Đã gửi phản hồi cho studio. Ekip sẽ kiểm tra và cập nhật bản chỉnh sửa.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Xác nhận ảnh đã đạt yêu cầu' })).toHaveCount(0);
    await page.reload(); await ready();
    await page.getByRole('button', { name: 'Xác nhận ảnh đã đạt yêu cầu' }).click();
    await expect(page.getByText('Đã xác nhận ảnh đạt yêu cầu. Cảm ơn bạn!')).toBeVisible();
    assert.ok(!(await page.locator('body').innerText()).toLowerCase().includes('nghiệm thu'));
    assert.deepEqual(errors, []);
    const saved = await db.db().collection('bookingworkflows').findOne({ booking: new (r('mongodb').ObjectId)(id) });
    assert.equal(saved.version, original.workflow.version);
    console.log(JSON.stringify({ bookingId: id, verified: ['desktop','mobile','next/keyboard','fullscreen','download','version-bound feedback','customer acceptance','no customer jargon','no writes'], consoleErrors: errors.length, evidence }));
  } finally { await browser.close(); await db.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
