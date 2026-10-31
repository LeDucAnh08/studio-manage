// Add catalog stock and demo images only. Does not create orders or monthly stock resets.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const r = require('node:module').createRequire(path.join(root, 'backend/package.json'));
const mongoose = r('mongoose');
const { validateNativeUri } = require('./mongodb-windows.cjs');
const { CATALOG_PRESENTATION } = require('./fixtures/rental-catalog-presentation.cjs');
const { PRODUCTS } = require('./fixtures/rental-availability.cjs');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const namespace = 'november-catalog:2026:v1';
const idFor = (key) => new mongoose.Types.ObjectId(hash(`${namespace}:${key}`).slice(0, 24));

async function main() {
  if (process.argv.slice(2).some((arg) => arg !== '--apply'))
    throw new Error('Usage: node ops/seed-november-costumes.cjs [--apply]');
  const apply = process.argv.includes('--apply');
  const env = r('dotenv').parse(await fs.readFile(path.join(root, 'backend/.env')));
  process.env.TS_NODE_PROJECT = path.join(root, 'backend/tsconfig.json');
  r('ts-node/register/transpile-only');
  const Costume = r(path.join(root, 'backend/src/models/Costume')).default;
  const CostumeType = r(path.join(root, 'backend/src/models/CostumeType')).default;
  const imageUrl = (key) => `/costume-demo/${key}.webp`;
  const images = [
    ...CATALOG_PRESENTATION.filter((row) => !row.key.startsWith('legacy')),
    ...PRODUCTS,
  ];
  for (const item of images) {
    const file = path.join(root, 'frontend/public', imageUrl(item.key));
    const metadata = await r('sharp')(await fs.readFile(file)).metadata();
    assert.equal(metadata.format, 'webp');
    assert.ok(metadata.width > 300 && metadata.height > 300);
  }
  await mongoose.connect(validateNativeUri(env.MONGO_URI), { serverSelectionTimeoutMS: 5000 });
  try {
    assert.equal(mongoose.connection.name, 'studio_db');
    const db = mongoose.connection.db;
    const original = await Costume.find().lean();
    const protectedSnapshot = async () => {
      const snapshot = {};
      for (const name of ['rentalorders', 'bookings', 'schedules', 'transactions']) {
        snapshot[name] = hash(
          JSON.stringify(await db.collection(name).find().sort({ _id: 1 }).toArray()),
        );
      }
      return snapshot;
    };
    const protectedBefore = await protectedSnapshot();
    const report = [];
    for (const row of CATALOG_PRESENTATION.filter((item) => !item.key.startsWith('legacy'))) {
      const pkg = original.find((item) => String(item._id) === row.id || item.name === row.name);
      if (!pkg) throw new Error(`Missing base catalog item: ${row.name}`);
      const emptyImage = !pkg.imageUrl?.trim();
      if (apply && emptyImage)
        await Costume.updateOne(
          { _id: pkg._id, imageUrl: pkg.imageUrl ?? { $exists: false } },
          { $set: { imageUrl: imageUrl(row.key) } },
          { runValidators: true },
        );
      report.push({
        name: pkg.name,
        result: emptyImage ? (apply ? 'image-seeded' : 'would-add-image') : 'kept',
      });
    }
    for (const product of PRODUCTS) {
      const { key, typeName, ...input } = product;
      const existing = await Costume.findOne({
        $or: [{ _id: idFor(key) }, { name: product.name }],
      }).lean();
      if (existing) {
        if (apply && !existing.imageUrl?.trim())
          await Costume.updateOne(
            { _id: existing._id, imageUrl: existing.imageUrl ?? { $exists: false } },
            { $set: { imageUrl: imageUrl(key) } },
            { runValidators: true },
          );
        report.push({ name: existing.name, result: 'kept' });
        continue;
      }
      const type = await CostumeType.findOne({ name: typeName }).lean();
      if (!type) throw new Error(`Missing category: ${typeName}`);
      const inventory =
        product.itemKind === 'accessory'
          ? [{ size: 'FREE', quantity: key === 'laceParasol' ? 24 : 40, condition: 'good' }]
          : ['S', 'M', 'L', 'XL'].map((size, i) => ({
              size,
              quantity: [18, 32, 24, 16][i],
              condition: 'good',
            }));
      const record = new Costume({
        ...input,
        _id: idFor(key),
        type: type._id,
        inventory,
        imageUrl: imageUrl(key),
        isRentalItem: true,
        rentalPrice: 0,
      });
      await record.validate();
      if (apply)
        await Costume.updateOne(
          { _id: record._id },
          { $setOnInsert: record.toObject() },
          { upsert: true, runValidators: true },
        );
      report.push({
        name: product.name,
        result: apply ? 'created' : 'would-create',
        units: inventory.reduce((sum, entry) => sum + entry.quantity, 0),
      });
    }
    for (const before of original) {
      const after = await Costume.findById(before._id).lean();
      const comparable = (value) => {
        const copy = JSON.parse(JSON.stringify(value));
        delete copy.imageUrl;
        delete copy.updatedAt;
        return copy;
      };
      assert.deepEqual(
        comparable(after),
        comparable(before),
        `Existing catalog data changed: ${before.name}`,
      );
      if (before.imageUrl?.trim()) assert.equal(after.imageUrl, before.imageUrl);
    }
    assert.deepEqual(
      await protectedSnapshot(),
      protectedBefore,
      'Orders or financial data changed during seeding',
    );
    console.log(
      JSON.stringify(
        {
          mode: apply ? 'apply' : 'check',
          month: '2026-11',
          stockIsSharedAcrossDates: true,
          existingRecordsPreserved: original.length,
          packages: report,
        },
        null,
        2,
      ),
    );
  } finally {
    await mongoose.disconnect();
  }
}
main().catch((error) => {
  console.error(
    error.name.startsWith('Mongo')
      ? `Local database operation failed (${error.code || error.name}).`
      : error.message,
  );
  process.exitCode = 1;
});
