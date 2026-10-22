const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const { createRequire } = require('node:module');
const backendRequire = createRequire(path.resolve(__dirname, '../../backend/package.json'));
const { MongoClient, ObjectId } = backendRequire('mongodb');
const { PROJECT, validateDemoUri } = require('../seed-demo.cjs');
const { CATALOG_PRESENTATION } = require('../fixtures/rental-catalog-presentation.cjs');
const { planChanges, patchCatalog } = require('../update-demo-catalog.cjs');

const TEST_DB = 'studio_catalog_presentation_audit';
const TEST_URI = `mongodb://127.0.0.1:27029/${TEST_DB}?replicaSet=rs0&directConnection=true`;
const backupDir = path.resolve(__dirname, '../../.workflow-tools/catalog-presentation-tests');
const json = (value) => JSON.stringify(value);
const products = () =>
  CATALOG_PRESENTATION.map((item, index) => ({
    _id: new ObjectId(item.id),
    name: item.previousName,
    description: `Mô tả trước cập nhật ${index}`,
    gender: 'unisex',
    type: new ObjectId('000000000000000000000001'),
    itemKind: 'clothing',
    isRentalItem: true,
    rentalPrice: 137000 + index * 1000,
    ...(index % 2 === 0 ? { rentalDailyPrice: null } : {}),
    inventory: [{ size: 'M', quantity: index + 1, condition: 'good' }],
    createdAt: new Date('2026-05-01T00:00:00Z'),
    customField: 'Giữ nguyên dữ liệu ngoài nội dung danh mục',
  }));

test('presentation plan covers the bounded catalog without mutating input', () => {
  assert.equal(CATALOG_PRESENTATION.length, 21);
  assert.equal(new Set(CATALOG_PRESENTATION.map((item) => item.id)).size, 21);
  for (const item of CATALOG_PRESENTATION) {
    assert.ok(ObjectId.isValid(item.id));
    assert.ok(Number.isSafeInteger(item.rentalDailyPrice) && item.rentalDailyPrice > 0);
    assert.ok(item.name.length > 0 && item.name.length <= 120);
    assert.ok(item.description.length > 0 && item.description.length <= 2000);
    assert.doesNotMatch(
      `${item.name} ${item.description}`,
      /\bdemo\b|đồ án|giả lập|dữ liệu minh họa|phục vụ trình diễn/i,
    );
  }
  const records = products();
  const before = json(records);
  const planned = planChanges(records);
  assert.equal(planned.length, 21);
  assert.deepEqual(
    new Set(planned.map((item) => item.id)),
    new Set(CATALOG_PRESENTATION.map((item) => item.id)),
  );
  assert.equal(json(records), before);
  const completed = records.map((record) => ({
    ...record,
    ...planned.find((item) => item.id === record._id.toString()).after,
  }));
  assert.deepEqual(planChanges(completed), []);
});

test('presentation plan refuses incomplete, renamed, non-rental or already priced targets', () => {
  assert.throws(() => planChanges(products().slice(1)));
  for (const change of [
    { name: 'Tên riêng đã được nhân viên sửa' },
    { isRentalItem: false },
    { isRentalItem: 'true' },
    { rentalDailyPrice: CATALOG_PRESENTATION.at(-1).rentalDailyPrice + 1 },
  ]) {
    const records = products();
    Object.assign(records.at(-1), change);
    assert.throws(() => planChanges(records));
  }
});

test('demo CLI URI guard refuses other databases, servers and connection modes', () => {
  validateDemoUri(
    'mongodb://127.0.0.1:27029/studio_project_demo?replicaSet=rs0&directConnection=true',
  );
  for (const uri of [
    TEST_URI,
    'mongodb://example.com:27029/studio_project_demo?replicaSet=rs0&directConnection=true',
    'mongodb://127.0.0.1:27017/studio_project_demo?replicaSet=rs0&directConnection=true',
    'mongodb://127.0.0.1:27029/studio_project_demo',
    'mongodb://user:password@127.0.0.1:27029/studio_project_demo?replicaSet=rs0&directConnection=true',
  ])
    assert.throws(() => validateDemoUri(uri));
});

test('demo presentation patch is bounded, atomic and safe to replay', async (t) => {
  const uri = new URL(TEST_URI);
  assert.ok(['127.0.0.1', 'localhost'].includes(uri.hostname));
  assert.equal(uri.port, '27029');
  assert.equal(uri.pathname, `/${TEST_DB}`);
  assert.equal(uri.searchParams.get('replicaSet'), 'rs0');
  const client = new MongoClient(TEST_URI, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db(TEST_DB);
  const dropTestDb = async () => {
    assert.equal(db.databaseName, TEST_DB);
    assert.equal(uri.pathname, '/studio_catalog_presentation_audit');
    await db.dropDatabase();
  };
  t.after(async () => {
    try {
      await dropTestDb();
    } finally {
      await client.close();
    }
  });
  assert.equal((await db.admin().command({ hello: 1 })).setName, 'rs0');
  const seed = async () => {
    await dropTestDb();
    const records = products();
    await db.collection('projectmetadata').insertOne({ _id: 'seed:v1', project: PROJECT });
    await db.collection('costumes').insertMany([
      ...records,
      {
        _id: new ObjectId('000000000000000000000099'),
        name: 'Sản phẩm ngoài phạm vi',
        rentalPrice: 999,
        rentalDailyPrice: 777,
        inventory: [],
      },
    ]);
    await db.collection('rentalorders').insertOne({
      _id: new ObjectId('000000000000000000000020'),
      priceMode: 'period',
      items: [
        { costume: records[0]._id, name: records[0].name, rentalPrice: records[0].rentalPrice },
      ],
      quote: { total: 137000, acceptedAt: new Date('2026-10-01T00:00:00Z') },
      payments: [{ amount: 100000, reference: 'preserve-payment' }],
    });
    await db.collection('bookings').insertOne({
      _id: new ObjectId('000000000000000000000030'),
      packageSnapshot: { costumeIds: [records[0].type], price: 500000 },
    });
    await db.collection('transactions').insertOne({
      _id: new ObjectId('000000000000000000000040'),
      amount: 100000,
      kind: 'deposit',
    });
    return records;
  };
  const snapshot = async () => {
    const names = (await db.listCollections({}, { nameOnly: true }).toArray())
      .map((item) => item.name)
      .sort();
    const result = {};
    for (const name of names)
      result[name] = await db.collection(name).find({}).sort({ _id: 1 }).toArray();
    return json(result);
  };

  await t.test(
    'dry run makes no database writes; apply preserves all fields outside the three catalog fields',
    async () => {
      const records = await seed();
      const before = await snapshot();
      const dryRun = await patchCatalog(db, { backupDir });
      assert.equal(dryRun.status, 'dry-run');
      assert.equal(dryRun.changed, 21);
      assert.equal(await snapshot(), before);

      const applied = await patchCatalog(db, { apply: true, backupDir });
      assert.equal(applied.status, 'applied');
      assert.equal(applied.changed, 21);
      assert.ok((await fs.stat(applied.backup)).isFile());
      const stripCatalogFields = ({ name, description, rentalDailyPrice, ...rest }) => rest;
      for (const item of CATALOG_PRESENTATION) {
        const after = await db.collection('costumes').findOne({ _id: new ObjectId(item.id) });
        const original = records.find((record) => record._id.toString() === item.id);
        assert.equal(json(stripCatalogFields(after)), json(stripCatalogFields(original)));
        assert.equal(after.name, item.name);
        assert.equal(after.description, item.description);
        assert.equal(after.rentalDailyPrice, item.rentalDailyPrice);
      }
      const beforeRecords = JSON.parse(before);
      for (const collection of ['bookings', 'rentalorders', 'transactions']) {
        assert.equal(
          json(await db.collection(collection).find({}).sort({ _id: 1 }).toArray()),
          json(beforeRecords[collection]),
        );
      }
      const outside = await db
        .collection('costumes')
        .findOne({ _id: new ObjectId('000000000000000000000099') });
      assert.equal(
        json(outside),
        json(beforeRecords.costumes.find((item) => item._id === outside._id.toString())),
      );
    },
  );

  await t.test('replay preserves subsequent staff changes', async () => {
    await db.collection('costumes').updateOne(
      { _id: new ObjectId(CATALOG_PRESENTATION[0].id) },
      {
        $set: {
          name: 'Nhân viên đã cập nhật',
          description: 'Nội dung mới của nhân viên',
          rentalDailyPrice: 99123,
        },
      },
    );
    const before = await snapshot();
    const replay = await patchCatalog(db, { apply: true, backupDir });
    assert.equal(replay.status, 'already-applied');
    assert.equal(replay.changed, 0);
    assert.equal(await snapshot(), before);
  });

  await t.test('a bad final target prevents every catalog and marker write', async () => {
    for (const invalid of ['missing', 'renamed', 'priced', 'not-rental']) {
      await seed();
      const filter = { _id: new ObjectId(CATALOG_PRESENTATION.at(-1).id) };
      if (invalid === 'missing') await db.collection('costumes').deleteOne(filter);
      else
        await db.collection('costumes').updateOne(filter, {
          $set: {
            ...(invalid === 'renamed' ? { name: 'Tên đã được sửa' } : {}),
            ...(invalid === 'priced'
              ? { rentalDailyPrice: CATALOG_PRESENTATION.at(-1).rentalDailyPrice + 1 }
              : {}),
            ...(invalid === 'not-rental' ? { isRentalItem: false } : {}),
          },
        });
      const before = await snapshot();
      await assert.rejects(() => patchCatalog(db, { apply: true, backupDir }));
      assert.equal(await snapshot(), before, invalid);
    }
  });

  await t.test('missing project identity is rejected without writes', async () => {
    await seed();
    await db.collection('projectmetadata').deleteOne({ _id: 'seed:v1' });
    const before = await snapshot();
    await assert.rejects(() => patchCatalog(db, { apply: true, backupDir }));
    assert.equal(await snapshot(), before);
  });
});
