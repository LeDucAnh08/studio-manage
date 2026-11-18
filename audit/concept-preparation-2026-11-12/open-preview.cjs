const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { chromium } = require('@playwright/test');
const { MongoClient } = require('mongodb');
const root = path.resolve(__dirname, '../..');
async function main() {
  const env = require('dotenv').parse(fs.readFileSync(path.join(root, 'backend/.env')));
  require('../../ops/mongodb-windows.cjs').validateNativeUri(env.MONGO_URI);
  const db = await MongoClient.connect(env.MONGO_URI);
  let actor, pkg, photographer;
  try {
    [actor, pkg, photographer] = await Promise.all([
      db.db().collection('users').findOne({ username: 'mango' }),
      db.db().collection('conceptpackages').findOne({ name: 'Chân dung Tự nhiên', active: true }),
      db.db().collection('users').findOne({ name: 'Lê Minh Đức' }),
    ]);
  } finally {
    await db.close();
  }
  if (!actor || !pkg || !photographer) throw new Error('Preview source records missing.');
  const token = require('jsonwebtoken').sign({ id: String(actor._id) }, env.JWT_SECRET, { expiresIn: '1h' });
  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  const context = await browser.newContext({ viewport: { width: 1487, height: 1058 } });
  await context.addInitScript(({ token, user, draft }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    if (!sessionStorage.getItem('yume-concept-draft-v1'))
      sessionStorage.setItem('yume-concept-draft-v1', JSON.stringify(draft));
  }, {
    token,
    user: { _id: String(actor._id), username: actor.username, name: actor.name, roles: actor.roles },
    draft: {
      ownerId: String(actor._id), packageId: String(pkg._id), photographerId: String(photographer._id),
      startAt: '2026-11-14T07:00:00.000Z', step: 4, people: 1, costumes: [],
      wardrobeMeasurements: [{ size: 'M', heightCm: 165.5, weightKg: 55.2 }],
      contactName: 'Mai Anh', phone: '0912345678',
      brief: 'Mình thích ảnh tự nhiên, ánh sáng dịu và tông màu ấm.', referencesText: '', key: randomUUID(),
    },
  });
  const page = await context.newPage();
  await page.goto(`http://localhost:4001/concept-booking/packages/${pkg._id}/book/costumes`);
  await page.getByRole('heading', { name: 'Thông tin buổi chụp', exact: true }).waitFor();
  console.log('Preparation screen opened in Chrome; no order created.');
}
main().catch((e) => { console.error(e.message); process.exitCode = 1; });
