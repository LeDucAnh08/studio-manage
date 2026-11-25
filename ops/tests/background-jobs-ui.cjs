// Real browser/component QA with mocked API; backend/Redis integration is tested separately.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const home = path.join(root, '.workflow-tools/background-jobs/ui');
const output = path.join(root, 'audit/bullmq-integration-2026-11-25');
async function main() {
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(output, { recursive: true });
  const entry = path.join(home, 'entry.tsx');
  fs.writeFileSync(
    entry,
    `import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter,Routes,Route} from 'react-router-dom';import BookingAlbumPage from '${path.join(root, 'frontend/src/pages/BookingAlbumPage').replaceAll('\\', '/')}';createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/workflow-bookings/booking/album']}><Routes><Route path="/workflow-bookings/:id/album" element={<BookingAlbumPage staff/>}/></Routes></MemoryRouter>);`,
  );
  await require('esbuild').build({
    entryPoints: [entry],
    bundle: true,
    outfile: path.join(home, 'bundle.js'),
    platform: 'browser',
    format: 'esm',
    jsx: 'automatic',
    alias: { '@': path.join(root, 'frontend/src') },
    define: { 'import.meta.env': '{}' },
    loader: { '.svg': 'dataurl' },
    logLevel: 'silent',
  });
  fs.writeFileSync(
    path.join(home, 'index.html'),
    '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/bundle.css"><style>body{margin:0;padding:20px;font:16px Arial;background:#f5f5f5;color:#111}button,input,textarea{font:inherit}button{cursor:pointer}</style><div id="root"></div><script type="module" src="/bundle.js"></script></html>',
  );
  const express = require('express'),
    app = express();
  app.use(express.static(home));
  const server = app.listen(4187, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const { chromium } = require('playwright');
  const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser = await chromium.launch({
    headless: true,
    ...(fs.existsSync(chrome) ? { executablePath: chrome } : {}),
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1365, height: 1000 } });
    let phase = 'pending',
      posts = 0,
      polls = 0,
      complete = false;
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const image = await require('sharp')({
      create: { width: 400, height: 260, channels: 3, background: '#ccc' },
    })
      .png()
      .toBuffer();
    const fixture = () => ({
      publicId: 'qa-album',
      title: 'Album kiểm thử xử lý nền',
      version: complete ? 4 : 3,
      status: 'open',
      limit: 2,
      canSelect: false,
      folders: [
        {
          id: 'folder',
          name: 'Ảnh thử',
          url: 'https://drive.google.com/drive/folders/queue_folder_001',
        },
      ],
      photos: [
        {
          id: 'photo',
          source: 'drive',
          driveId: 'queue_photo_001',
          name: 'Anh-dang-cong-bo.jpg',
          width: 400,
          height: 260,
          folderId: 'folder',
          deliveryVersion: 0,
          available: true,
          selected: true,
          note: 'Ghi chú cần giữ',
        },
      ],
      latestDeliveryVersion: 0,
      deliveryVersions: [],
      canCommentDelivery: false,
    });
    const dto = () => ({
      id: `qa-job-${posts}`,
      service: 'yearbook',
      orderId: 'booking',
      status: phase,
      message: phase === 'failed' ? 'Drive tạm thời không khả dụng.' : '',
    });
    await page.route('**/api/**', async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (url.pathname.includes('/photos/')) {
        await route.fulfill({ status: 200, contentType: 'image/png', body: image });
        return;
      }
      let data = null,
        status = 200;
      if (url.pathname.endsWith('/operations/latest')) data = null;
      else if (url.pathname.includes('/operations/')) {
        polls++;
        if (phase === 'succeeded') complete = true;
        data = dto();
      } else if (request.method() === 'POST') {
        posts++;
        phase = 'pending';
        data = { backgroundOperation: dto() };
        status = 202;
      } else data = fixture();
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data }),
      });
    });
    await page.goto('http://127.0.0.1:4187');
    await page.getByLabel('Tên album').waitFor();
    await page.getByLabel('Tên album').fill('Bản nháp đang nhập');
    await page.getByRole('button', { name: 'Cập nhật từ Drive', exact: true }).click();
    await page.getByText(/Đang chờ đồng bộ ảnh/).waitFor();
    await page.screenshot({ path: path.join(output, 'album-pending-desktop.png'), fullPage: true });
    assert.equal(await page.getByLabel('Tên album').inputValue(), 'Bản nháp đang nhập');
    phase = 'running';
    await page.getByText(/Đang đồng bộ ảnh\. Danh sách/).waitFor();
    await page.screenshot({ path: path.join(output, 'album-running-desktop.png'), fullPage: true });
    phase = 'failed';
    await page.getByRole('alert').filter({ hasText: 'Drive tạm thời' }).waitFor();
    await page.screenshot({ path: path.join(output, 'album-failed-desktop.png'), fullPage: true });
    assert.equal(await page.getByLabel('Tên album').inputValue(), 'Bản nháp đang nhập');
    await page.getByRole('button', { name: 'Cập nhật từ Drive', exact: true }).click();
    phase = 'succeeded';
    await page.getByText('Đã đồng bộ ảnh.', { exact: true }).waitFor();
    await page.screenshot({
      path: path.join(output, 'album-completed-desktop.png'),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Cập nhật từ Drive', exact: true }).click();
    await page.getByText(/Đang chờ đồng bộ ảnh/).waitFor();
    await page.screenshot({ path: path.join(output, 'album-pending-mobile.png'), fullPage: true });
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      'Mobile horizontal overflow',
    );
    await page.evaluate(() => window.dispatchEvent(new Event('yume:session-ended')));
    await page.waitForTimeout(200);
    const before = polls;
    await page.waitForTimeout(2500);
    assert.equal(polls, before, 'Polling continued after session ended');
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(output, 'browser-result.json'),
      JSON.stringify(
        {
          passed: true,
          api: 'mocked',
          browser: 'Chromium',
          desktop: '1365x1000',
          mobile: '390x844',
          states: ['pending', 'running', 'failed', 'succeeded'],
          draftPreserved: true,
          sessionStopsPolling: true,
          noHorizontalOverflow: true,
          consoleErrors: errors,
        },
        null,
        2,
      ),
    );
    console.log('Browser QA passed: progress, retry, drafts, mobile and session shutdown.');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
