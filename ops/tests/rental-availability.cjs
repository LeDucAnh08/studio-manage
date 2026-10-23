// Only the explicitly named disposable local database may be dropped by these checks.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const r = require('node:module').createRequire(
  path.resolve(__dirname, '../../backend/package.json'),
);
const { MongoClient, ObjectId } = r('mongodb');
const { PROJECT } = require('../seed-demo.cjs');
const { PRODUCTS, HOLDS, WINDOWS } = require('../fixtures/rental-availability.cjs');
const { buildRecords, seedAvailability, MARKER } = require('../seed-rental-availability.cjs');

process.env.TS_NODE_PROJECT = path.resolve(__dirname, '../../backend/tsconfig.json');
r('ts-node/register/transpile-only');
const { getRentalAvailability } = r(
  path.resolve(__dirname, '../../backend/src/services/rentalAvailability'),
);

const ANCHOR = '2026-10-22';
const NOW = new Date('2026-10-22T03:00:00.000Z');
const DAY = 86400000;
const TEST_DB = 'studio_rental_availability_audit';
const TEST_URI = `mongodb://127.0.0.1:27029/${TEST_DB}?replicaSet=rs0&directConnection=true`;
const evidenceDir = path.resolve(__dirname, '../../.workflow-tools/rental-availability-tests');
const json = (value) => JSON.stringify(value);
const date = (offset) => new Date(+new Date(`${ANCHOR}T00:00:00+07:00`) + offset * DAY);
const context = () => ({
  types: Object.fromEntries(
    [...new Set(PRODUCTS.map((row) => row.typeName))].map((name) => [name, new ObjectId()]),
  ),
  client: {
    _id: new ObjectId(),
    username: 'demo.client',
    name: 'Khách thuê',
    roles: [6],
    isActive: true,
  },
  sale: {
    _id: new ObjectId(),
    username: 'demo.sale',
    name: 'Tư vấn',
    roles: [2],
    isActive: true,
  },
  accountant: {
    _id: new ObjectId(),
    username: 'demo.accountant',
    name: 'Kế toán',
    roles: [5],
    isActive: true,
  },
  depositCategory: { _id: new ObjectId(), name: 'Cọc thuê', type: 'income' },
});

test('new availability fixtures preserve daily pricing, inclusive periods and linked deposits', () => {
  const refs = context();
  const before = json(refs);
  const records = buildRecords(ANCHOR, refs, NOW);
  assert.equal(json(refs), before);
  assert.deepEqual(buildRecords(ANCHOR, refs, NOW), records);
  assert.equal(records.costumes.length, PRODUCTS.length);
  assert.equal(records.rentalorders.length, HOLDS.length);
  assert.equal(records.transactions.length, HOLDS.length);
  for (const rows of Object.values(records))
    assert.equal(new Set(rows.map((row) => String(row._id))).size, rows.length);

  const byId = new Map(records.costumes.map((row) => [String(row._id), row]));
  for (const costume of records.costumes) {
    assert.equal(costume.isRentalItem, true);
    assert.ok(Number.isSafeInteger(costume.rentalDailyPrice) && costume.rentalDailyPrice > 0);
    assert.ok(PRODUCTS.some((row) => row.name === costume.name));
    assert.ok(Object.values(refs.types).some((id) => String(id) === String(costume.type)));
    assert.doesNotMatch(
      `${costume.name} ${costume.description}`,
      /\bdemo\b|đồ án|dữ liệu minh họa/i,
    );
    assert.ok(
      costume.inventory.every((row) => Number.isSafeInteger(row.quantity) && row.quantity > 0),
    );
  }
  for (const order of records.rentalorders) {
    const quote = order.quote;
    assert.equal(String(order.client), String(refs.client._id));
    assert.equal(order.status, 'confirmed');
    assert.equal(order.pricingMode, 'daily');
    assert.equal(quote.pricingMode, 'daily');
    assert.ok(quote.acceptedAt instanceof Date && Number.isFinite(+quote.acceptedAt));
    assert.equal(quote.rentalDays, (+quote.returnDate - +quote.receiveDate) / DAY + 1);
    assert.equal(
      quote.fee,
      quote.lines.reduce(
        (total, line) => total + line.unitPrice * line.quantity * quote.rentalDays,
        0,
      ),
    );
    assert.equal(+order.requestedReceiveDate, +quote.receiveDate);
    assert.equal(+order.requestedReturnDate, +quote.returnDate);
    assert.ok(Number.isSafeInteger(quote.deposit) && quote.deposit > 0);
    assert.equal(order.checkedOutAt, undefined);
    assert.equal(order.returnedAt, undefined);
    assert.equal(
      new Set(quote.lines.map((line) => `${line.costumeId}:${line.size}`)).size,
      quote.lines.length,
    );
    for (const line of quote.lines) {
      const costume = byId.get(String(line.costumeId));
      assert.ok(costume);
      assert.equal(line.unitPrice, costume.rentalDailyPrice);
      const stock = costume.inventory
        .filter((row) => row.size === line.size && row.condition === 'good')
        .reduce((sum, row) => sum + row.quantity, 0);
      assert.ok(Number.isSafeInteger(line.quantity) && line.quantity > 0 && line.quantity <= stock);
    }
    assert.equal(
      order.payments.reduce(
        (sum, payment) => sum + (payment.kind === 'refund' ? -payment.amount : payment.amount),
        0,
      ),
      quote.deposit,
    );
    for (const payment of order.payments) {
      const transaction = records.transactions.find(
        (row) => String(row._id) === String(payment.transaction),
      );
      assert.ok(transaction);
      assert.equal(String(transaction.rentalOrder), String(order._id));
      assert.equal(String(transaction.rentalPayment), String(payment._id));
      assert.equal(String(transaction.categoryId), String(refs.depositCategory._id));
      assert.equal(String(transaction.createdBy), String(refs.accountant._id));
      assert.equal(transaction.type, 'income');
      assert.equal(transaction.amount, payment.amount);
      assert.equal(+transaction.date, +payment.at);
    }
  }
});

test('fixture windows exercise actual availability, inclusive boundaries and disjoint holds', () => {
  const records = buildRecords(ANCHOR, context(), NOW);
  for (const window of WINDOWS) {
    const period = { receiveDate: date(window.startOffset), returnDate: date(window.endOffset) };
    for (const product of PRODUCTS) {
      const costume = records.costumes.find((row) => row.name === product.name);
      const actual = getRentalAvailability(costume, period, records.rentalorders, [], date(0));
      const normalized = Object.fromEntries(
        product.inventory.map((row) => [row.size, actual[row.size] ?? 0]),
      );
      assert.deepEqual(normalized, window.expected[product.key], `${window.key}: ${product.key}`);
    }
  }
  const peach = records.costumes.find(
    (row) => row.name === PRODUCTS.find((row) => row.key === 'peachAoDai').name,
  );
  assert.deepEqual(
    getRentalAvailability(
      peach,
      { receiveDate: date(2), returnDate: date(2) },
      records.rentalorders,
      [],
      date(0),
    ),
    {},
  );
  assert.deepEqual(
    getRentalAvailability(
      peach,
      { receiveDate: date(3), returnDate: date(3) },
      records.rentalorders,
      [],
      date(0),
    ),
    { M: 2, L: 1 },
  );
});

test('invalid calendar anchors are rejected before any fixture is built', () => {
  for (const anchor of ['2026-02-30', '2026-2-3', 'not-a-date', '', null, 20261022])
    assert.throws(() => buildRecords(anchor, context(), NOW), String(anchor));
});

test('availability seed is create-only, atomic and safe to replay in its isolated audit database', async (t) => {
  const uri = new URL(TEST_URI);
  assert.equal(uri.protocol, 'mongodb:');
  assert.equal(uri.hostname, '127.0.0.1');
  assert.equal(uri.port, '27029');
  assert.equal(uri.pathname, `/${TEST_DB}`);
  assert.equal(uri.searchParams.get('replicaSet'), 'rs0');
  const client = new MongoClient(TEST_URI, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db(TEST_DB);
  const dropTestDatabase = async () => {
    assert.equal(uri.hostname, '127.0.0.1');
    assert.equal(uri.port, '27029');
    assert.equal(uri.pathname, '/studio_rental_availability_audit');
    assert.equal(db.databaseName, 'studio_rental_availability_audit');
    await db.dropDatabase();
  };
  t.after(async () => {
    try {
      await dropTestDatabase();
    } finally {
      await client.close();
    }
  });
  assert.equal((await db.admin().command({ hello: 1 })).setName, 'rs0');

  const initialize = async () => {
    await dropTestDatabase();
    const refs = context();
    await db.collection('projectmetadata').insertOne({ _id: 'seed:v1', project: PROJECT });
    await db.collection('users').insertMany([refs.client, refs.sale, refs.accountant]);
    await db.collection('categories').insertOne(refs.depositCategory);
    await db
      .collection('costumetypes')
      .insertMany(Object.entries(refs.types).map(([name, _id]) => ({ _id, name })));
    await db.collection('costumes').insertOne({
      _id: new ObjectId(),
      name: 'Trang phục hiện có',
      rentalDailyPrice: 999000,
      inventory: [{ size: 'M', quantity: 8, condition: 'good' }],
      customField: 'Giữ nguyên',
    });
    await db.collection('rentalorders').insertOne({
      _id: new ObjectId(),
      status: 'completed',
      quote: { fee: 137000 },
      payments: [{ amount: 100000, reference: 'giữ-nguyên' }],
    });
    await db
      .collection('bookings')
      .insertOne({ _id: new ObjectId(), packageSnapshot: { name: 'Gói hiện có', price: 500000 } });
    await db
      .collection('transactions')
      .insertOne({ _id: new ObjectId(), amount: 137000, reference: 'giao-dịch-hiện-có' });
    return refs;
  };
  const snapshot = async () => {
    const result = {};
    const names = (await db.listCollections({}, { nameOnly: true }).toArray())
      .map((row) => row.name)
      .sort();
    for (const name of names)
      result[name] = await db.collection(name).find({}).sort({ _id: 1 }).toArray();
    return result;
  };

  await t.test('dry run has no writes; apply preserves all existing records', async () => {
    const refs = await initialize();
    const before = await snapshot();
    const planned = buildRecords(ANCHOR, refs, NOW);
    const counts = Object.fromEntries(
      Object.entries(planned).map(([name, rows]) => [name, rows.length]),
    );
    const dryRun = await seedAvailability(db, { anchorDay: ANCHOR, evidenceDir });
    assert.equal(dryRun.status, 'dry-run');
    assert.deepEqual(dryRun.counts, counts);
    assert.equal(json(await snapshot()), json(before));
    const applied = await seedAvailability(db, { apply: true, anchorDay: ANCHOR, evidenceDir });
    assert.equal(applied.status, 'applied');
    assert.equal(applied.anchorDay, ANCHOR);
    assert.deepEqual(applied.counts, counts);
    for (const [name, records] of Object.entries(before))
      for (const record of records)
        assert.equal(
          json(await db.collection(name).findOne({ _id: record._id })),
          json(record),
          `${name}: ${record._id}`,
        );
    for (const [name, count] of Object.entries(counts))
      assert.equal(await db.collection(name).countDocuments(), (before[name]?.length ?? 0) + count);
    assert.ok(await db.collection('projectmetadata').findOne({ _id: MARKER }));
  });

  await t.test('replay preserves subsequent staff edits and the original date anchor', async () => {
    const costume = await db.collection('costumes').findOne({ name: PRODUCTS[0].name });
    await db
      .collection('costumes')
      .updateOne(
        { _id: costume._id },
        { $set: { name: 'Tên đã được nhân viên sửa', rentalDailyPrice: 99123 } },
      );
    const before = json(await snapshot());
    const replay = await seedAvailability(db, {
      apply: true,
      anchorDay: '2026-10-23',
      evidenceDir,
    });
    assert.equal(replay.status, 'retained');
    assert.equal(replay.anchorDay, ANCHOR);
    assert.equal(json(await snapshot()), before);
  });

  await t.test('an ID or name collision rejects every fixture write', async () => {
    for (const collision of ['id', 'name']) {
      const refs = await initialize();
      const product = buildRecords(ANCHOR, refs, NOW).costumes.at(-1);
      await db
        .collection('costumes')
        .insertOne(
          collision === 'id'
            ? { ...product, name: 'Trùng mã ngoài phạm vi' }
            : { ...product, _id: new ObjectId() },
        );
      const before = json(await snapshot());
      await assert.rejects(() =>
        seedAvailability(db, { apply: true, anchorDay: ANCHOR, evidenceDir }),
      );
      assert.equal(json(await snapshot()), before, collision);
    }
  });

  await t.test('missing project identity or invalid anchor prevents writes', async () => {
    await initialize();
    await db.collection('projectmetadata').deleteOne({ _id: 'seed:v1' });
    const before = json(await snapshot());
    await assert.rejects(() =>
      seedAvailability(db, { apply: true, anchorDay: ANCHOR, evidenceDir }),
    );
    assert.equal(json(await snapshot()), before);
    await initialize();
    const validBefore = json(await snapshot());
    await assert.rejects(() =>
      seedAvailability(db, { apply: true, anchorDay: '2026-02-30', evidenceDir }),
    );
    assert.equal(json(await snapshot()), validBefore);
  });
});
