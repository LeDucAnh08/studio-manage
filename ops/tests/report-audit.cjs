const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const r = require('node:module').createRequire(
  path.resolve(__dirname, '../../backend/package.json'),
);
process.env.TS_NODE_PROJECT = path.resolve(__dirname, '../../backend/tsconfig.json');
process.env.JWT_SECRET = 'reports-audit-local';
r('ts-node/register/transpile-only');
const mongoose = r('mongoose'),
  express = r('express'),
  jwt = r('jsonwebtoken');
const source = (name) => r(path.resolve(__dirname, '../../backend/src', name));
const { seedReportData } = require('../fixtures/report-data.cjs');
test('service and inventory reports reconcile read-only snapshots on real MongoDB', async (t) => {
  const uri = new URL(
    process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27028/?replicaSet=rs0&directConnection=true',
  );
  assert.ok(['127.0.0.1', 'localhost'].includes(uri.hostname));
  uri.pathname = '/studio_report_audit';
  await mongoose.connect(uri.toString(), { serverSelectionTimeoutMS: 5000 });
  let server;
  t.after(async () => {
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    assert.equal(mongoose.connection.name, 'studio_report_audit');
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  assert.equal(mongoose.connection.name, 'studio_report_audit');
  await mongoose.connection.dropDatabase();
  const app = express();
  app.use('/reports', source('routes/reports').default);
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const User = source('models/User').default;
  const users = [];
  for (const role of [0, 1, 2, 3, 4, 5, 6])
    users[role] = await User.create({
      username: `reports.${role}`,
      password: 'ReportAudit123!',
      roles: [role],
      isActive: true,
    });
  const ids = await seedReportData(mongoose.connection.db, mongoose.Types.ObjectId);
  const call = async (type = 'finance', query = 'from=2026-10-01&to=2026-10-03', role = 0) => {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/reports/${type}?${query}`,
      {
        headers:
          role === null
            ? {}
            : {
                Authorization:
                  'Bearer ' + jwt.sign({ id: String(users[role]._id) }, process.env.JWT_SECRET),
              },
      },
    );
    return { status: response.status, body: await response.json() };
  };
  await t.test('only admin and accountant can read either report', async () => {
    for (const type of ['finance', 'inventory']) {
      assert.equal((await call(type, undefined, null)).status, 401);
      for (const role of [2, 3, 4, 6])
        assert.equal((await call(type, undefined, role)).status, 403);
      for (const role of [0, 1, 5]) assert.equal((await call(type, undefined, role)).status, 200);
    }
  });
  await t.test(
    'cash by linked service, Vietnam inclusive boundaries and ambiguous legacy links',
    async () => {
      const report = await call();
      assert.equal(report.status, 200, JSON.stringify(report.body));
      const rows = report.body.data.cash;
      assert.deepEqual(
        rows.find((r) => r._id === 'photography'),
        { _id: 'photography', count: 1, income: 500, expense: 0 },
      );
      assert.deepEqual(
        rows.find((r) => r._id === 'rental'),
        { _id: 'rental', count: 2, income: 1500, expense: 500 },
      );
      assert.deepEqual(
        rows.find((r) => r._id === 'unclassified'),
        { _id: 'unclassified', count: 2, income: 25, expense: 75 },
      );
      const firstDay = await call('finance', 'from=2026-10-01&to=2026-10-01');
      assert.equal(firstDay.body.data.cash.find((r) => r._id === 'photography').income, 500);
      assert.equal(firstDay.body.data.cash.find((r) => r._id === 'rental').income, 0);
    },
  );
  await t.test(
    'current contract, debt, refund and security differ from period cash and proposed charges',
    async () => {
      const report = (await call()).body.data;
      const photo = report.snapshot.find((r) => r._id === 'photography'),
        rental = report.snapshot.find((r) => r._id === 'rental');
      assert.equal(photo.count, 3);
      assert.equal(photo.agreedValue, 3300);
      assert.equal(photo.due, 1500);
      assert.equal(photo.refundDue, 700);
      assert.equal(rental.count, 7);
      assert.equal(rental.agreedValue, 5100);
      assert.equal(rental.due, 1400);
      assert.equal(rental.refundDue, 1500);
      assert.equal(rental.depositHeld, 550);
      assert.equal(rental.unsettledSurplus, 500);
      const next = (await call('finance', 'from=2026-10-04&to=2026-10-04')).body.data;
      assert.deepEqual(
        next.snapshot.sort((a, b) => a._id.localeCompare(b._id)),
        report.snapshot.sort((a, b) => a._id.localeCompare(b._id)),
      );
      assert.equal(next.cash[0].income, 9000);
      const accepted = report.accepted;
      assert.equal(accepted.find((r) => r._id === 'photography').serviceValue, 2000);
      assert.equal(accepted.find((r) => r._id === 'photography').cancellationValue, 300);
      assert.equal(accepted.find((r) => r._id === 'rental').serviceValue, 1300);
      assert.equal(accepted.find((r) => r._id === 'rental').cancellationValue, 300);
    },
  );
  await t.test(
    'drilldowns match service, date or global debt and disclose no private payload',
    async () => {
      const base = 'from=2026-10-01&to=2026-10-03';
      const due = await call('finance', base + '&view=due&service=photography');
      assert.equal(due.body.pagination.total, 1);
      assert.equal(due.body.data.rows[0].referenceId, ids.bookingB);
      const agreed = await call('finance', base + '&view=agreed&service=rental');
      assert.equal(agreed.body.pagination.total, 3);
      const refund = await call('finance', base + '&view=refund');
      assert.equal(refund.body.pagination.total, 3);
      assert.ok(!JSON.stringify(due.body).includes('private'));
      assert.ok(!JSON.stringify(agreed.body).includes('private'));
      const empty = await call('finance', base + '&page=2');
      assert.equal(empty.body.data.rows.length, 0);
      assert.equal(empty.body.pagination.total, 5);
    },
  );
  await t.test(
    'shared stock counts only Schedule, actual inclusive returns and overdue held units',
    async () => {
      const result = await call('inventory');
      assert.equal(result.status, 200, JSON.stringify(result.body));
      const rows = result.body.data.rows,
        m = rows.find((r) => r.costumeId === ids.costume && r.size === 'M'),
        l = rows.find((r) => r.costumeId === ids.costume && r.size === 'L');
      assert.equal(m.good, 5);
      assert.equal(m.photographyDays, 6);
      assert.equal(m.rentalDays, 18);
      assert.equal(m.peak, 8);
      assert.equal(m.overCapacityDays, 3);
      assert.equal(m.utilization, 160);
      assert.equal(l.rentalDays, 4);
      assert.equal(l.peak, 2);
      assert.equal(l.overCapacityDays, 1);
      const unknown = rows.find((r) => r.costumeId === ids.legacyCostume);
      assert.equal(unknown.utilization, null);
      assert.equal(unknown.unknownSchedules, 1);
      assert.equal(unknown.peak, 0);
      assert.equal(result.body.data.summary.overdueOrders, 1);
      assert.equal(result.body.data.summary.unknownSchedules, 1);
      const filtered = await call(
        'inventory',
        'from=2026-10-01&to=2026-10-03&q=' + encodeURIComponent('Áo báo cáo'),
      );
      assert.equal(filtered.body.pagination.total, 2);
      assert.equal(filtered.body.data.summary.good, 6);
    },
  );
  await t.test(
    'invalid dates, reversed/long periods, duplicate filters and malformed page rejected',
    async () => {
      for (const query of [
        'from=2026-02-30',
        'from=2026-10-04&to=2026-10-01',
        'from=2024-01-01&to=2026-01-01',
        'from=2026-10-01&from=2026-10-02',
        'page=0',
        'page=-1',
        'view=none',
        'service=none',
      ])
        assert.equal((await call('finance', query)).status, 400, query);
      assert.equal((await call('inventory', 'q=x&q=y')).status, 400);
    },
  );
  await t.test(
    'null source dates are skipped and make the affected utilization incomplete',
    async () => {
      await mongoose.connection.db.collection('schedules').insertOne({
        _id: new mongoose.Types.ObjectId(),
        status: 'confirmed',
        costumes: [new mongoose.Types.ObjectId(ids.costume)],
        shootDate: new Date('2026-10-02T00:00:00+07:00'),
        costumeReservations: [
          {
            costume: new mongoose.Types.ObjectId(ids.costume),
            size: 'M',
            quantity: 99,
            receiveDate: null,
            returnDate: new Date('2026-10-03T00:00:00+07:00'),
          },
        ],
      });
      const result = await call('inventory');
      assert.equal(result.status, 200);
      const m = result.body.data.rows.find((r) => r.costumeId === ids.costume && r.size === 'M');
      assert.equal(m.photographyDays, 6);
      assert.equal(m.utilization, null);
      assert.equal(m.invalidIntervals, 1);
      assert.equal(result.body.data.summary.invalidIntervals, 1);
    },
  );
  await t.test(
    'paged cash detail has stable totals and reports perform no source writes',
    async () => {
      const db = mongoose.connection.db;
      await db.collection('transactions').insertMany(
        Array.from({ length: 25 }, (_, n) => ({
          _id: new mongoose.Types.ObjectId(),
          type: 'income',
          amount: n,
          date: new Date('2026-10-02T00:00:00+07:00'),
        })),
      );
      const before = await db.collection('rentalorders').find().toArray();
      const first = await call(),
        second = await call('finance', 'from=2026-10-01&to=2026-10-03&page=2');
      assert.equal(first.body.pagination.total, 30);
      assert.equal(first.body.data.rows.length, 20);
      assert.equal(second.body.data.rows.length, 10);
      assert.equal(
        new Set([...first.body.data.rows, ...second.body.data.rows].map((r) => r._id)).size,
        30,
      );
      assert.deepEqual(await db.collection('rentalorders').find().toArray(), before);
    },
  );
});
