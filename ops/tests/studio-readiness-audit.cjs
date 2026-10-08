const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const { spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const r = require('node:module').createRequire(
  path.resolve(__dirname, '../../backend/package.json'),
);
process.env.TS_NODE_PROJECT = path.resolve(__dirname, '../../backend/tsconfig.json');
r('ts-node/register/transpile-only');
const mongoose = r('mongoose');
const { audit, validateUri } = require('../audit-studio-readiness.cjs');
const model = (name) => r(path.resolve(__dirname, '../../backend/src/models', name)).default;
const at = (date) => new Date(`${date}T00:00:00+07:00`);
const now = new Date('2026-10-05T12:00:00+07:00');
test('studio readiness rejects unnamed targets before any connection', () => {
  for (const uri of [
    undefined,
    '',
    'mongodb://localhost:27028',
    'mongodb://localhost:27028/?replicaSet=rs0',
  ])
    assert.throws(() => validateUri(uri));
  validateUri(
    'mongodb://admin:encoded%40password@host1:27017,host2:27017/studio_db?replicaSet=rs0',
  );
  validateUri('mongodb+srv://studio.invalid/studio_db');
});
test('combined studio audit checks real indexes, holds and ledger without source writes', async (t) => {
  const uri = new URL(
    process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27028/?replicaSet=rs0&directConnection=true',
  );
  assert.ok(['127.0.0.1', 'localhost'].includes(uri.hostname));
  uri.pathname = '/studio_readiness_audit';
  await mongoose.connect(uri.toString(), { serverSelectionTimeoutMS: 5000 });
  const db = mongoose.connection.db;
  assert.equal(db.databaseName, 'studio_readiness_audit');
  await db.dropDatabase();
  t.after(async () => {
    assert.equal(db.databaseName, 'studio_readiness_audit');
    await db.dropDatabase();
    await mongoose.disconnect();
  });
  const models = [
    'User',
    'Booking',
    'BookingWorkflow',
    'RentalOrder',
    'Schedule',
    'Transaction',
    'Costume',
  ].map(model);
  for (const m of models) await m.init();
  const read = () => audit(uri.toString(), { now });
  const has = (result, code) => result.findings.some((r) => r.code === code);
  const codes = (result) =>
    result.findings.filter((r) => r.severity === 'blocker').map((r) => r.code);
  const names = [
    'costumes',
    'users',
    'schedules',
    'bookingworkflows',
    'rentalorders',
    'bookings',
    'transactions',
  ];
  const seed = async () => {
    for (const name of names) await db.collection(name).deleteMany({});
    const id = () => new mongoose.Types.ObjectId();
    const client = id(),
      photographer = id(),
      costume = id(),
      booking = id(),
      workflow = id(),
      schedule = id(),
      rental = id(),
      customer = id(),
      photoPayment = id(),
      rentalPayment = id(),
      photoTx = id(),
      rentalTx = id();
    await db.collection('users').insertMany([
      { _id: client, roles: [6], isActive: true, username: 'audit.client' },
      { _id: photographer, roles: [3], isActive: true, username: 'audit.photo' },
    ]);
    await db.collection('costumes').insertOne({
      _id: costume,
      isRentalItem: true,
      inventory: [{ size: 'M', quantity: 3, condition: 'good' }],
    });
    await db.collection('bookings').insertOne({ _id: booking, client });
    const allocation = {
      costume,
      size: 'M',
      quantity: 1,
      receiveDate: at('2026-10-12'),
      returnDate: at('2026-10-12'),
    };
    const proposed = {
      shootDate: at('2026-10-12'),
      startTime: '08:00',
      endTime: '10:00',
      location: 'Studio',
    };
    await db.collection('schedules').insertOne({
      _id: schedule,
      status: 'confirmed',
      workflowBooking: booking,
      customer,
      ...proposed,
      leadPhotographer: photographer,
      costumes: [costume],
      costumeReservations: [allocation],
    });
    await db.collection('bookingworkflows').insertOne({
      _id: workflow,
      booking,
      customer,
      lifecycle: 'confirmed',
      quote: {
        version: 1,
        acceptedAt: at('2026-10-01'),
        lines: [{ quantity: 1, unitPrice: 1000 }],
        depositRequired: 200,
        proposedSchedule: proposed,
      },
      resources: {
        schedule,
        photographers: [photographer],
        costumes: [{ ...allocation, costumeId: costume, costume: undefined }],
      },
      payments: [
        {
          _id: photoPayment,
          kind: 'deposit',
          amount: 200,
          receivedAt: at('2026-10-02'),
          transaction: photoTx,
        },
      ],
      members: [{ name: 'PRIVATE_ROSTER' }],
    });
    const rentalQuote = {
      version: 1,
      acceptedAt: at('2026-10-01'),
      receiveDate: at('2026-10-12'),
      returnDate: at('2026-10-14'),
      fee: 1000,
      deposit: 300,
      lines: [{ costumeId: costume, size: 'M', quantity: 2, unitPrice: 500 }],
    };
    await db.collection('rentalorders').insertOne({
      _id: rental,
      client,
      creationKey: 'readiness-rental',
      status: 'confirmed',
      quote: rentalQuote,
      payments: [
        {
          _id: rentalPayment,
          kind: 'balance',
          amount: 300,
          at: at('2026-10-02'),
          transaction: rentalTx,
        },
      ],
      phone: 'PRIVATE_PHONE',
      creationFingerprint: 'PRIVATE_KEY',
    });
    await db.collection('transactions').insertMany([
      {
        _id: photoTx,
        type: 'income',
        amount: 200,
        date: at('2026-10-02'),
        workflowBooking: booking,
        workflowPayment: photoPayment,
      },
      {
        _id: rentalTx,
        type: 'income',
        amount: 300,
        date: at('2026-10-02'),
        rentalOrder: rental,
        rentalPayment,
      },
    ]);
    return {
      client,
      photographer,
      costume,
      booking,
      workflow,
      schedule,
      rental,
      customer,
      photoPayment,
      rentalPayment,
      photoTx,
      rentalTx,
      rentalQuote,
      proposed,
    };
  };
  await t.test(
    'clean accepted allocations are not counted twice; legitimate debt is only a warning',
    async () => {
      await seed();
      const before = await Promise.all(names.map((n) => db.collection(n).find().toArray()));
      const result = await read();
      assert.equal(result.ready, true, JSON.stringify(result.findings));
      assert.equal(result.transactionCommitVerified, false);
      assert.ok(has(result, 'OUTSTANDING_PAYMENT'));
      assert.ok(!has(result, 'STOCK_CAPACITY_CONFLICT'));
      assert.ok(!JSON.stringify(result).includes('PRIVATE_'));
      assert.deepEqual(
        await Promise.all(names.map((n) => db.collection(n).find().toArray())),
        before,
      );
    },
  );
  await t.test(
    'missing required index is detected but is never created by the read-only audit',
    async () => {
      await seed();
      const collection = db.collection('rentalorders'),
        index = (await collection.listIndexes().toArray()).find((i) => i.key.creationKey);
      await collection.dropIndex(index.name);
      const result = await read();
      assert.ok(has(result, 'MISSING_UNIQUE_INDEX'));
      assert.equal(result.ready, false);
      assert.ok(!(await collection.listIndexes().toArray()).some((i) => i.key.creationKey));
      await collection.createIndex({ client: 1, creationKey: 1 }, { unique: true });
    },
  );
  await t.test(
    'overlapping photo staff and inclusive photo/rental stock excess require resolution',
    async () => {
      const ids = await seed();
      await db.collection('schedules').insertOne({
        status: 'pending',
        ...ids.proposed,
        startTime: '09:00',
        endTime: '11:00',
        leadPhotographer: ids.photographer,
        costumes: [ids.costume],
        costumeReservations: [
          {
            costume: ids.costume,
            size: 'M',
            quantity: 1,
            receiveDate: at('2026-10-12'),
            returnDate: at('2026-10-12'),
          },
        ],
      });
      const result = await read();
      assert.ok(has(result, 'PHOTOGRAPHER_COLLISION'));
      assert.ok(has(result, 'STOCK_CAPACITY_CONFLICT'));
      const conflict = result.findings.find((r) => r.code === 'STOCK_CAPACITY_CONFLICT')
        .examples[0];
      assert.equal(conflict.peak, 4);
      assert.equal(conflict.good, 3);
      assert.equal(conflict.date, '2026-10-12');
    },
  );
  await t.test(
    'adjacent photographer intervals do not collide and completed schedules keep only garment holds',
    async () => {
      const ids = await seed();
      await db.collection('schedules').insertOne({
        status: 'pending',
        ...ids.proposed,
        startTime: '10:00',
        endTime: '11:00',
        leadPhotographer: ids.photographer,
        costumes: [],
      });
      assert.ok(!has(await read(), 'PHOTOGRAPHER_COLLISION'));
      await db.collection('schedules').updateMany(
        { workflowBooking: { $exists: false } },
        {
          $set: {
            status: 'completed',
            startTime: '08:00',
            endTime: '09:00',
            leadPhotographer: new mongoose.Types.ObjectId(),
          },
        },
      );
      const result = await read();
      assert.ok(!has(result, 'PHOTOGRAPHER_COLLISION'));
      assert.ok(!has(result, 'INVALID_PHOTOGRAPHER'));
    },
  );
  await t.test('overdue checked-out order reserves future stock until actual return', async () => {
    const ids = await seed();
    await db.collection('rentalorders').updateOne(
      { _id: ids.rental },
      {
        $set: {
          status: 'checked_out',
          checkedOutAt: at('2026-10-02'),
          'quote.receiveDate': at('2026-10-01'),
          'quote.returnDate': at('2026-10-03'),
          'payments.0.amount': 1300,
        },
      },
    );
    await db
      .collection('transactions')
      .updateOne({ _id: ids.rentalTx }, { $set: { amount: 1300 } });
    await db.collection('schedules').insertOne({
      status: 'confirmed',
      ...ids.proposed,
      startTime: '10:00',
      endTime: '11:00',
      leadPhotographer: ids.photographer,
      costumes: [ids.costume],
      costumeReservations: [
        {
          costume: ids.costume,
          size: 'M',
          quantity: 1,
          receiveDate: at('2026-10-12'),
          returnDate: at('2026-10-12'),
        },
      ],
    });
    const result = await read();
    assert.ok(has(result, 'OVERDUE_RENTAL'));
    assert.ok(has(result, 'STOCK_CAPACITY_CONFLICT'));
    assert.ok(!has(result, 'RENTAL_HANDOVER_PAYMENT_MISMATCH'));
  });
  await t.test(
    'accepted extension after valid handover creates debt without invalidating original handover',
    async () => {
      const ids = await seed();
      const original = {
        ...ids.rentalQuote,
        receiveDate: at('2026-10-01'),
        returnDate: at('2026-10-03'),
      };
      await db.collection('rentalorders').updateOne(
        { _id: ids.rental },
        {
          $set: {
            status: 'checked_out',
            checkedOutAt: at('2026-10-02'),
            quoteHistory: [original],
            quote: {
              ...original,
              version: 2,
              acceptedAt: at('2026-10-04'),
              returnDate: at('2026-10-15'),
              fee: 1500,
            },
            'payments.0.amount': 1300,
          },
        },
      );
      await db
        .collection('transactions')
        .updateOne({ _id: ids.rentalTx }, { $set: { amount: 1300 } });
      const result = await read();
      assert.equal(result.ready, true, JSON.stringify(result.findings));
      assert.ok(has(result, 'OUTSTANDING_PAYMENT'));
      assert.ok(!has(result, 'RENTAL_HANDOVER_PAYMENT_MISMATCH'));
    },
  );
  await t.test(
    'workflow mirror drift, cancelled resource holds and missing approved cancellation block readiness',
    async () => {
      const ids = await seed();
      await db
        .collection('bookingworkflows')
        .updateOne({ _id: ids.workflow }, { $set: { 'resources.costumes.0.quantity': 2 } });
      assert.ok(has(await read(), 'WORKFLOW_RESOURCE_MISMATCH'));
      await db
        .collection('bookingworkflows')
        .updateOne({ _id: ids.workflow }, { $set: { lifecycle: 'cancelled' } });
      const result = await read();
      assert.ok(has(result, 'INVALID_PHOTOGRAPHY_CANCELLATION'));
      assert.ok(has(result, 'CANCELLED_WORKFLOW_HOLDS_RESOURCES'));
    },
  );
  await t.test(
    'payment mismatch, partial/dual/orphan links are blockers; unlinked legacy cash remains warning',
    async () => {
      const ids = await seed();
      await db
        .collection('transactions')
        .updateOne({ _id: ids.photoTx }, { $set: { amount: 201 } });
      await db.collection('transactions').insertMany([
        { type: 'expense', amount: 12.5, date: at('2026-10-02') },
        {
          type: 'income',
          amount: 1,
          date: at('2026-10-02'),
          rentalOrder: new mongoose.Types.ObjectId(),
        },
        {
          type: 'income',
          amount: 2,
          date: at('2026-10-02'),
          rentalOrder: ids.rental,
          rentalPayment: new mongoose.Types.ObjectId(),
          workflowBooking: ids.booking,
          workflowPayment: new mongoose.Types.ObjectId(),
        },
        {
          type: 'income',
          amount: 3,
          date: at('2026-10-02'),
          rentalOrder: ids.rental,
          rentalPayment: new mongoose.Types.ObjectId(),
        },
      ]);
      const result = await read();
      for (const code of [
        'PAYMENT_TRANSACTION_MISMATCH',
        'TRANSACTION_PARTIAL_LINK',
        'TRANSACTION_DUAL_SERVICE_LINK',
        'TRANSACTION_ORPHAN_PAYMENT',
        'UNCLASSIFIED_TRANSACTION',
      ])
        assert.ok(has(result, code), code);
      assert.ok(!has(result, 'INVALID_TRANSACTION'));
    },
  );
  await t.test(
    'partial returns and missing accepted quote/completion consent are reported',
    async () => {
      const ids = await seed();
      await db.collection('rentalorders').updateOne(
        { _id: ids.rental },
        {
          $set: {
            status: 'completed',
            checkedOutAt: at('2026-10-02'),
            returnedAt: at('2026-10-03'),
            quote: {
              ...ids.rentalQuote,
              receiveDate: at('2026-10-01'),
              returnDate: at('2026-10-03'),
            },
            returns: [{ costumeId: ids.costume, size: 'M', good: 1, damaged: 0, lost: 0 }],
          },
        },
      );
      const result = await read();
      assert.ok(has(result, 'RENTAL_RETURN_QUANTITY_MISMATCH'));
      assert.ok(has(result, 'INVALID_RENTAL_COMPLETION'));
      assert.ok(has(result, 'RENTAL_AWAITING_SETTLEMENT'));
      await db
        .collection('rentalorders')
        .updateOne({ _id: ids.rental }, { $unset: { 'quote.acceptedAt': '' } });
      assert.ok(has(await read(), 'RENTAL_WITHOUT_ACCEPTED_QUOTE'));
    },
  );
  await t.test(
    'malformed containers/rows fail safely and never print raw sensitive values',
    async () => {
      const ids = await seed();
      await db
        .collection('costumes')
        .updateOne({ _id: ids.costume }, { $set: { inventory: { secret: 'PRIVATE_ARRAY' } } });
      await db
        .collection('bookingworkflows')
        .updateOne(
          { _id: ids.workflow },
          { $set: { payments: [null], 'quote.lines': [null], 'resources.costumes': [null] } },
        );
      await db
        .collection('rentalorders')
        .updateOne(
          { _id: ids.rental },
          { $set: { 'quote.lines': [null], returns: [null], settlement: { charges: [null] } } },
        );
      const result = await read();
      assert.equal(result.ready, false);
      assert.ok(has(result, 'INVALID_DATA_SHAPE'));
      assert.ok(!JSON.stringify(result).includes('PRIVATE_'));
      assert.ok(codes(result).length > 0);
    },
  );
  await t.test('example lists are bounded while issue counts remain complete', async () => {
    await seed();
    await db
      .collection('transactions')
      .insertMany(
        Array.from({ length: 25 }, () => ({ type: 'income', amount: 1, date: at('2026-10-02') })),
      );
    const result = await read(),
      legacy = result.findings.find((r) => r.code === 'UNCLASSIFIED_TRANSACTION');
    assert.equal(legacy.count, 25);
    assert.equal(legacy.examples.length, 20);
    assert.equal(result.ready, true);
  });
  await t.test(
    'original handover fees must be provable and receipts exact before later extensions',
    async () => {
      const ids = await seed();
      const original = {
        ...ids.rentalQuote,
        receiveDate: at('2026-10-01'),
        returnDate: at('2026-10-03'),
      };
      await db.collection('rentalorders').updateOne(
        { _id: ids.rental },
        {
          $set: {
            status: 'checked_out',
            checkedOutAt: at('2026-10-02'),
            quoteHistory: [{ ...original, fee: 'PRIVATE_FEE' }],
            quote: {
              ...original,
              version: 2,
              acceptedAt: at('2026-10-04'),
              returnDate: at('2026-10-15'),
              fee: 1500,
            },
          },
        },
      );
      const invalid = await read();
      assert.ok(has(invalid, 'INVALID_RENTAL_HANDOVER_QUOTE'));
      assert.ok(!JSON.stringify(invalid).includes('PRIVATE_FEE'));
      await db
        .collection('rentalorders')
        .updateOne({ _id: ids.rental }, { $set: { quoteHistory: [original] } });
      assert.ok(has(await read(), 'RENTAL_HANDOVER_PAYMENT_MISMATCH'));
    },
  );
  await t.test(
    'zero-fee withdrawal is valid; positive unaccepted rental or excessive photo cancellation is not',
    async () => {
      const ids = await seed();
      await db.collection('transactions').deleteOne({ _id: ids.rentalTx });
      await db.collection('rentalorders').updateOne(
        { _id: ids.rental },
        {
          $set: {
            status: 'cancelled',
            payments: [],
            change: { kind: 'cancel', status: 'applied', finalFee: 0 },
          },
          $unset: { quote: '' },
        },
      );
      assert.equal((await read()).ready, true);
      await db
        .collection('rentalorders')
        .updateOne({ _id: ids.rental }, { $set: { 'change.finalFee': 10 } });
      assert.ok(has(await read(), 'INVALID_RENTAL_CANCELLATION'));
      await db.collection('bookingworkflows').updateOne(
        { _id: ids.workflow },
        {
          $set: {
            lifecycle: 'cancelled',
            changeRequest: {
              kind: 'cancel',
              status: 'applied',
              finalPayable: 2000,
              acceptedAt: at('2026-10-04'),
            },
          },
        },
      );
      await db
        .collection('schedules')
        .updateOne({ _id: ids.schedule }, { $set: { status: 'cancelled' } });
      assert.ok(has(await read(), 'INVALID_PHOTOGRAPHY_CANCELLATION'));
    },
  );
  await t.test(
    'malformed reference conversion cannot crash or disclose nested raw values',
    async () => {
      const ids = await seed();
      await db
        .collection('schedules')
        .updateOne(
          { _id: ids.schedule },
          { $set: { leadPhotographer: { toString: 'PRIVATE_REF', valueOf: 'PRIVATE_REF' } } },
        );
      const result = await read();
      assert.equal(result.ready, false);
      assert.ok(has(result, 'INVALID_PHOTOGRAPHER'));
      assert.ok(!JSON.stringify(result).includes('PRIVATE_REF'));
    },
  );
  await t.test(
    'CLI writes reviewable local evidence, refuses overwrite and redacts connection failures',
    async () => {
      await seed();
      const dir = path.resolve(__dirname, '../../.workflow-tools');
      await fs.mkdir(dir, { recursive: true });
      const output = path.join(dir, 'readiness-' + randomUUID() + '.json');
      const script = path.resolve(__dirname, '../audit-studio-readiness.cjs');
      const run = (args, connection = uri.toString()) =>
        spawnSync(process.execPath, [script, ...args], {
          encoding: 'utf8',
          timeout: 15000,
          env: { ...process.env, MONGO_URI: connection },
        });
      const clean = run(['--out', output]);
      assert.equal(clean.status, 0, clean.stderr);
      const content = await fs.readFile(output, 'utf8');
      assert.deepEqual(JSON.parse(content), JSON.parse(clean.stdout));
      assert.equal(JSON.parse(content).readOnly, true);
      assert.equal(run(['--out', output]).status, 1);
      assert.equal(await fs.readFile(output, 'utf8'), content);
      const bad = run([], 'mongodb://private:SECRET_CREDENTIAL@localhost:27028/');
      assert.equal(bad.status, 1);
      assert.ok(!bad.stderr.includes('SECRET_CREDENTIAL'));
      // Retain the successful local evidence as an ignored artifact, never studio sign-off.
    },
  );
});
