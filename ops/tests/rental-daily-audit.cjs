// Real HTTP/replica-set regression checks. Only this named disposable local DB may be dropped.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const r = require('node:module').createRequire(
  path.resolve(__dirname, '../../backend/package.json'),
);

process.env.TS_NODE_PROJECT = path.resolve(__dirname, '../../backend/tsconfig.json');
process.env.JWT_SECRET = 'rental-daily-audit-local';
process.env.CLIENT_PORTAL_ENABLED = 'true';
process.env.CLIENT_RENTAL_ENABLED = 'true';
process.env.CLIENT_WORKFLOW_ENABLED = 'true';
process.env.GAS_WEBHOOK_URL = '';
process.env.TELEGRAM_BOT_TOKEN = '';
r('ts-node/register/transpile-only');

const mongoose = r('mongoose');
const express = r('express');
const jwt = r('jsonwebtoken');
const source = (name) => r(path.resolve(__dirname, '../../backend/src', name));
const models = Object.fromEntries(
  [
    'User',
    'Customer',
    'Costume',
    'CostumeType',
    'Schedule',
    'RentalOrder',
    'Transaction',
    'Category',
  ].map((name) => [name, source(`models/${name}`).default]),
);
const DB_NAME = 'studio_rental_daily_audit';
const LOCAL_HOSTS = ['127.0.0.1', 'localhost'];

test('daily rentals: dated catalog, server pricing, durable payments and shared inventory', async (t) => {
  const uri = new URL(process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27029/?replicaSet=rs0');
  assert.equal(uri.protocol, 'mongodb:');
  assert.ok(LOCAL_HOSTS.includes(uri.hostname), 'Audit requires a local MongoDB host');
  uri.pathname = `/${DB_NAME}`;
  uri.searchParams.set('directConnection', 'true');
  const dropAuditDatabase = async () => {
    assert.ok(LOCAL_HOSTS.includes(uri.hostname));
    assert.equal(uri.pathname, `/${DB_NAME}`);
    assert.ok(LOCAL_HOSTS.includes(mongoose.connection.host));
    assert.equal(mongoose.connection.name, DB_NAME);
    assert.equal(mongoose.connection.db.databaseName, DB_NAME);
    await mongoose.connection.dropDatabase();
  };
  await mongoose.connect(uri.toString(), { serverSelectionTimeoutMS: 5000 });
  let server;
  t.after(async () => {
    try {
      if (server) {
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
      }
      await dropAuditDatabase();
    } finally {
      await mongoose.disconnect();
    }
  });
  assert.ok(
    (await mongoose.connection.db.admin().command({ hello: 1 })).setName,
    'A replica set is required',
  );
  await dropAuditDatabase();

  const app = express();
  app.use(express.json());
  app.use('/rentals', source('routes/rentals').default);
  app.use('/schedules', source('routes/schedules').default);
  app.get('/public/costumes', source('controllers/costumeController').getPublicCatalog);
  app.use((error, req, res, next) => res.status(500).json({ message: error.message }));
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  for (const model of Object.values(models)) await model.syncIndexes();

  const users = {};
  for (const [name, role] of Object.entries({
    admin: 0,
    sale: 2,
    accountant: 5,
    client: 6,
    stranger: 6,
  })) {
    users[name] = await models.User.create({
      username: `daily.${name}`,
      password: 'DailyAudit123!',
      roles: [role],
      isActive: true,
    });
  }
  const customer = await models.Customer.create({
    className: 'Daily rental audit',
    contactName: 'Audit',
    contactPhone: '0901234567',
    contactAddress: 'Hà Nội',
    total: 1,
  });
  const day = (offset = 0) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(Date.now() + offset * 86400000));
  const at = (date) => new Date(`${date}T00:00:00+07:00`);
  const call = async (url, actor = users.admin, body, key = randomUUID()) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${url}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
        ...(actor
          ? {
              Authorization:
                'Bearer ' + jwt.sign({ id: String(actor._id) }, process.env.JWT_SECRET),
            }
          : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  };
  const read = async (id, actor = users.admin) => {
    const response = await call(`/rentals/${id}`, actor);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    return response.body.data;
  };
  const act = async (id, actor, action, values = {}, expected = 200, key = randomUUID()) => {
    const order = await read(id);
    const response = await call(
      `/rentals/${id}/actions`,
      actor,
      {
        action,
        expectedVersion: order.version,
        ...values,
      },
      key,
    );
    assert.equal(response.status, expected, JSON.stringify(response.body));
    return response.body.data;
  };
  const item = async (quantity = 1, rentalDailyPrice = 40000, extra = {}) => {
    const type = await models.CostumeType.create({ name: randomUUID() });
    return models.Costume.create({
      name: 'Daily audit ' + randomUUID(),
      gender: 'unisex',
      type: type._id,
      isRentalItem: true,
      rentalPrice: 900000,
      rentalDailyPrice,
      inventory: [{ size: 'M', quantity, condition: 'good' }],
      ...extra,
    });
  };
  const request = (costume, extra = {}) => ({
    contactName: 'Khách thuê',
    phone: '0901234567',
    receiveDate: day(1),
    returnDate: day(3),
    lines: [{ costumeId: String(costume._id), size: 'M', quantity: 1 }],
    ...extra,
  });
  const create = async (costume, extra = {}, expected = 201) => {
    const response = await call('/rentals', users.client, request(costume, extra));
    assert.equal(response.status, expected, JSON.stringify(response.body));
    return response.body.data;
  };
  const prepare = async (
    costume,
    {
      receive = day(1),
      returned = day(3),
      quantity = 1,
      size = 'M',
      rate = 40000,
      deposit = 100000,
    } = {},
  ) => {
    const lines = [{ costumeId: String(costume._id), size, quantity }];
    const order = await create(costume, { receiveDate: receive, returnDate: returned, lines });
    await act(order._id, users.sale, 'quote.propose', {
      lines: lines.map((line) => ({ ...line, unitPrice: rate })),
      receiveDate: receive,
      returnDate: returned,
      deposit,
      fee: 1,
      rentalDays: 99,
      pricingMode: 'period',
      terms: ['Tính tiền theo ngày; tính cả ngày nhận và ngày trả.'],
    });
    return act(order._id, users.client, 'quote.accept', { quoteVersion: 1 });
  };
  const pay = (id, amount = 100000, key = randomUUID()) =>
    act(
      id,
      users.accountant,
      'payment.record',
      {
        kind: 'deposit',
        amount,
        method: 'cash',
      },
      200,
      key,
    );
  const cancel = async (id, finalFee = 0) => {
    await act(id, users.client, 'change.request', { kind: 'cancel', note: 'Không tiếp tục thuê.' });
    await act(id, users.sale, 'change.propose', { finalFee, terms: ['Hủy theo thỏa thuận.'] });
    return act(id, users.client, 'change.accept', { changeId: (await read(id)).change._id });
  };
  const catalog = async (receive, returned, filter = {}) => {
    const params = new URLSearchParams({ receiveDate: receive, returnDate: returned, ...filter });
    const response = await call(`/public/costumes?${params}`, null);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    return response.body.data;
  };

  await t.test(
    'dates are mandatory, quotes use quantity × inclusive days and unset daily rates never inherit legacy prices',
    async () => {
      const costume = await item(3);
      for (const dates of [
        { receiveDate: undefined },
        { returnDate: undefined },
        { receiveDate: '2026-02-30' },
        { returnDate: day() },
      ])
        await create(costume, dates, 400);
      assert.equal((await call('/public/costumes', null)).status, 400);
      const prepared = await prepare(costume, { quantity: 2, rate: 35000 });
      assert.equal(prepared.pricingMode, 'daily');
      assert.equal(prepared.quote.pricingMode, 'daily');
      assert.equal(prepared.quote.rentalDays, 3);
      assert.equal(prepared.quote.fee, 210000);
      assert.equal(prepared.status, 'awaiting_deposit');
      assert.equal(prepared.requestedLines[0].unitPrice, 40000);
      assert.equal((await call(`/rentals/${prepared._id}`, users.stranger)).status, 404);

      const unpriced = await item(1, null);
      const requested = await create(unpriced, {
        lines: [{ costumeId: String(unpriced._id), size: 'M', quantity: 1, unitPrice: 1 }],
      });
      assert.equal(requested.requestedLines[0].unitPrice, undefined);
      const visible = (await catalog(day(1), day(3))).find(
        (row) => row._id === String(unpriced._id),
      );
      assert.equal(visible.rentalPrice, 900000);
      assert.equal(visible.rentalDailyPrice, null);
      await act(
        requested._id,
        users.sale,
        'quote.propose',
        {
          lines: [{ costumeId: String(unpriced._id), size: 'M', quantity: 1, unitPrice: 0 }],
          receiveDate: day(1),
          returnDate: day(3),
          deposit: 0,
          terms: ['Terms'],
        },
        400,
      );
      const quoted = await act(requested._id, users.sale, 'quote.propose', {
        lines: [{ costumeId: String(unpriced._id), size: 'M', quantity: 1, unitPrice: 21000 }],
        receiveDate: day(1),
        returnDate: day(3),
        deposit: 0,
        terms: ['Terms'],
      });
      assert.equal(quoted.quote.fee, 63000);
      const accepted = await act(requested._id, users.client, 'quote.accept', { quoteVersion: 1 });
      assert.equal(
        accepted.status,
        'confirmed',
        'Zero-deposit daily orders hold only after quote acceptance',
      );
      await create(
        costume,
        { lines: [{ costumeId: String(costume._id), size: 'M', quantity: 4 }] },
        409,
      );
    },
  );

  await t.test(
    'partial deposit leaves stock available; final top-up holds once and its replay cannot duplicate receipt or hold',
    async () => {
      const costume = await item();
      const receive = day(5);
      const returned = day(7);
      const prepared = await prepare(costume, { receive, returned });
      const partial = await pay(prepared._id, 40000);
      assert.equal(partial.status, 'awaiting_deposit');
      assert.equal(partial.payment.netReceived, 40000);
      assert.equal(partial.reservationIssue, undefined);
      assert.equal(partial.payments.length, 1);
      assert.equal(
        partial.events.filter((event) => event.action === 'resources.confirm').length,
        0,
        'An incomplete deposit must not reserve stock',
      );
      const free = (await catalog(receive, returned)).find(
        (row) => row._id === String(costume._id),
      );
      assert.deepEqual(free.availableBySize, { M: 1 });
      await create(costume, { receiveDate: receive, returnDate: returned });

      const topUpKey = randomUUID();
      const command = {
        action: 'payment.record',
        expectedVersion: partial.version,
        kind: 'deposit',
        amount: 60000,
        method: 'cash',
      };
      const finalPayment = await call(
        `/rentals/${prepared._id}/actions`,
        users.accountant,
        command,
        topUpKey,
      );
      assert.equal(finalPayment.status, 200, JSON.stringify(finalPayment.body));
      const confirmed = finalPayment.body.data;
      assert.equal(confirmed.status, 'confirmed');
      assert.equal(confirmed.payment.netReceived, 100000);
      assert.equal(confirmed.payments.length, 2);
      assert.equal(
        (await catalog(receive, returned)).some((row) => row._id === String(costume._id)),
        false,
        'The fully paid order must hide the last available item for overlapping dates',
      );
      const heldVersion = confirmed.version;
      const replay = await call(
        `/rentals/${prepared._id}/actions`,
        users.accountant,
        command,
        topUpKey,
      );
      assert.equal(replay.status, 200, JSON.stringify(replay.body));
      const stored = await models.RentalOrder.findById(prepared._id).lean();
      assert.equal(stored.status, 'confirmed');
      assert.equal(stored.version, heldVersion);
      assert.equal(stored.payments.length, 2);
      assert.equal(
        stored.payments.reduce((sum, payment) => sum + payment.amount, 0),
        100000,
      );
      assert.equal(stored.events.filter((event) => event.action === 'resources.confirm').length, 1);
      assert.equal(stored.commands.filter((entry) => entry.action === 'payment.record').length, 2);
      assert.equal(
        await models.Transaction.countDocuments({ rentalOrder: prepared._id, type: 'income' }),
        2,
      );
      const outside = (await catalog(day(8), day(8))).find(
        (row) => row._id === String(costume._id),
      );
      assert.deepEqual(outside.availableBySize, { M: 1 });
    },
  );

  await t.test(
    'catalog uses minimum free stock per day, selected size and daily-price filters without private reservation data',
    async () => {
      const costume = await item(3, 40000, {
        inventory: [
          { size: 'M', quantity: 3, condition: 'good' },
          { size: 'L', quantity: 1, condition: 'good' },
          { size: 'M', quantity: 9, condition: 'repair' },
        ],
      });
      const first = await prepare(costume, { receive: day(10), returned: day(10), quantity: 2 });
      const second = await prepare(costume, { receive: day(12), returned: day(12), quantity: 2 });
      await pay(first._id);
      await pay(second._id);
      let visible = await catalog(day(10), day(12), {
        size: 'M',
        minPrice: '30000',
        maxPrice: '50000',
      });
      const found = visible.find((row) => row._id === String(costume._id));
      assert.deepEqual(found.availableBySize, { M: 1, L: 1 });
      assert.equal(found.rentalDays, 3);
      assert.equal(
        (await catalog(day(10), day(12), { minPrice: '50000' })).some(
          (row) => row._id === String(costume._id),
        ),
        false,
      );
      await create(
        costume,
        {
          receiveDate: day(10),
          returnDate: day(12),
          lines: [{ costumeId: String(costume._id), size: 'M', quantity: 2 }],
        },
        409,
      );
      const large = await prepare(costume, { receive: day(11), returned: day(11), size: 'L' });
      await pay(large._id);
      visible = await catalog(day(10), day(12), { size: 'L' });
      assert.equal(
        visible.some((row) => row._id === String(costume._id)),
        false,
      );
      const publicJson = JSON.stringify(await catalog(day(10), day(12)));
      for (const secret of [
        String(users.client._id),
        first._id,
        second._id,
        large._id,
        'inventory',
        'costumeReservations',
        'payments',
      ])
        assert.equal(publicJson.includes(secret), false, secret);
    },
  );

  await t.test(
    'two final deposits both survive while only one gets the last item; replay is exactly once and retry works after release',
    async () => {
      const costume = await item();
      const pending = [
        await prepare(costume, { receive: day(20), returned: day(22) }),
        await prepare(costume, { receive: day(20), returned: day(22) }),
      ];
      const keys = pending.map(() => randomUUID());
      const commands = pending.map((order) => ({
        action: 'payment.record',
        expectedVersion: order.version,
        kind: 'deposit',
        amount: 100000,
        method: 'cash',
      }));
      const responses = await Promise.all(
        pending.map((order, index) =>
          call(`/rentals/${order._id}/actions`, users.accountant, commands[index], keys[index]),
        ),
      );
      assert.deepEqual(
        responses.map((row) => row.status),
        [200, 200],
        JSON.stringify(responses),
      );
      const after = await Promise.all(pending.map((order) => read(order._id)));
      assert.deepEqual(after.map((order) => order.status).sort(), [
        'confirmed',
        'ready_to_confirm',
      ]);
      const winner = after.find((order) => order.status === 'confirmed');
      const loser = after.find((order) => order.status === 'ready_to_confirm');
      assert.ok(loser.reservationIssue);
      assert.equal((await read(loser._id, users.client)).payment.netReceived, 100000);
      for (let index = 0; index < pending.length; index++) {
        assert.equal(
          (
            await call(
              `/rentals/${pending[index]._id}/actions`,
              users.accountant,
              commands[index],
              keys[index],
            )
          ).status,
          200,
        );
        assert.equal(
          await models.Transaction.countDocuments({
            rentalOrder: pending[index]._id,
            type: 'income',
          }),
          1,
        );
        const stored = await models.RentalOrder.findById(pending[index]._id).lean();
        assert.equal(stored.payments.length, 1);
        assert.equal(stored.commands.filter((row) => row.action === 'payment.record').length, 1);
      }
      await act(loser._id, users.admin, 'resources.confirm', {}, 409);
      await cancel(winner._id);
      const retried = await act(loser._id, users.admin, 'resources.confirm');
      assert.equal(retried.status, 'confirmed');
      assert.equal(retried.reservationIssue, undefined);
      await act(winner._id, users.accountant, 'payment.record', {
        kind: 'refund',
        amount: 100000,
        method: 'cash',
      });
      assert.equal((await read(winner._id)).payment.refundDue, 0);
      assert.equal(
        await models.Transaction.countDocuments({ rentalOrder: winner._id, type: 'expense' }),
        1,
      );
    },
  );

  await t.test(
    'a paid unavailable order can cancel and refund without losing its receipt',
    async () => {
      const costume = await item();
      const first = await prepare(costume, { receive: day(25), returned: day(26) });
      const second = await prepare(costume, { receive: day(25), returned: day(26) });
      await pay(first._id);
      const conflict = await pay(second._id);
      assert.equal(conflict.status, 'ready_to_confirm');
      assert.ok(conflict.reservationIssue);
      await cancel(second._id);
      await act(second._id, users.accountant, 'payment.record', {
        kind: 'refund',
        amount: 100000,
        method: 'cash',
      });
      const final = await read(second._id);
      assert.equal(final.status, 'cancelled');
      assert.equal(final.payment.netReceived, 0);
      assert.equal(await models.Transaction.countDocuments({ rentalOrder: second._id }), 2);
      assert.equal((await read(first._id)).status, 'confirmed');
    },
  );

  await t.test(
    'photography and a final rental deposit compete under the shared resource transaction',
    async () => {
      const costume = await item();
      const rental = await prepare(costume, { receive: day(30), returned: day(31) });
      const [receipt, photograph] = await Promise.all([
        call(`/rentals/${rental._id}/actions`, users.accountant, {
          action: 'payment.record',
          expectedVersion: rental.version,
          kind: 'deposit',
          amount: 100000,
          method: 'cash',
        }),
        call('/schedules', users.admin, {
          customer: String(customer._id),
          shootDate: day(30),
          status: 'confirmed',
          costumes: [String(costume._id)],
          costumeReservations: [
            {
              costume: String(costume._id),
              size: 'M',
              quantity: 1,
              receiveDate: day(30),
              returnDate: day(31),
            },
          ],
        }),
      ]);
      assert.equal(receipt.status, 200, JSON.stringify(receipt.body));
      assert.ok([201, 409].includes(photograph.status), JSON.stringify(photograph.body));
      const heldRental = await read(rental._id);
      assert.equal(
        await models.Transaction.countDocuments({ rentalOrder: rental._id, type: 'income' }),
        1,
      );
      const rentalHolds = heldRental.status === 'confirmed' ? 1 : 0;
      const scheduleHolds = await models.Schedule.countDocuments({
        costumes: costume._id,
        status: 'confirmed',
      });
      assert.equal(rentalHolds + scheduleHolds, 1);
      if (photograph.status === 201) {
        assert.equal(heldRental.status, 'ready_to_confirm');
        assert.ok(heldRental.reservationIssue);
      } else assert.equal(heldRental.status, 'confirmed');
    },
  );

  await t.test(
    'daily extension keeps the accepted rate snapshot and quote history after catalog price changes',
    async () => {
      const costume = await item(1, 40000);
      const pending = await prepare(costume, { receive: day(40), returned: day(41), rate: 35000 });
      await pay(pending._id);
      await models.Costume.updateOne(
        { _id: costume._id },
        { rentalDailyPrice: 999000, rentalPrice: 777000 },
      );
      await act(pending._id, users.client, 'change.request', {
        kind: 'extend',
        returnDate: day(43),
        note: 'Thuê thêm hai ngày.',
      });
      const proposal = await act(pending._id, users.sale, 'change.propose', {
        finalFee: 1,
        terms: ['Gia hạn hai ngày.'],
      });
      assert.equal(proposal.change.finalFee, 140000);
      const applied = await act(pending._id, users.client, 'change.accept', {
        changeId: proposal.change._id,
      });
      assert.equal(applied.quote.fee, 140000);
      assert.equal(applied.quote.rentalDays, 4);
      assert.equal(applied.quote.lines[0].unitPrice, 35000);
      assert.equal(applied.quote.returnDate, at(day(43)).toISOString());
      assert.equal(applied.quoteHistory.length, 1);
      assert.equal(applied.quoteHistory[0].fee, 70000);
      assert.equal(applied.quoteHistory[0].rentalDays, 2);
      assert.equal(applied.quoteHistory[0].returnDate, at(day(41)).toISOString());
    },
  );

  await t.test(
    'legacy orders without a pricing mode retain manual period fees and manual extension amounts',
    async () => {
      const costume = await item(1, 40000);
      const lines = [
        { costumeId: costume._id, name: costume.name, size: 'M', quantity: 1, unitPrice: 80000 },
      ];
      const legacy = await models.RentalOrder.create({
        client: users.client._id,
        creationKey: randomUUID(),
        creationFingerprint: randomUUID(),
        contactName: 'Khách cũ',
        phone: '0901234567',
        requestedLines: lines,
        requestedReceiveDate: at(day(50)),
        requestedReturnDate: at(day(52)),
      });
      await models.Costume.updateOne(
        { _id: costume._id },
        { rentalDailyPrice: 999000, rentalPrice: 777000 },
      );
      const quoted = await act(String(legacy._id), users.sale, 'quote.propose', {
        lines,
        receiveDate: day(50),
        returnDate: day(52),
        deposit: 100000,
        terms: ['Giá cho toàn kỳ thuê.'],
      });
      assert.equal(quoted.quote.pricingMode, 'period');
      assert.equal(quoted.quote.fee, 80000);
      assert.equal(quoted.quote.rentalDays, undefined);
      await act(String(legacy._id), users.client, 'quote.accept', { quoteVersion: 1 });
      const paid = await pay(String(legacy._id));
      assert.equal(paid.status, 'ready_to_confirm', 'Legacy orders keep manual confirmation');
      await act(String(legacy._id), users.admin, 'resources.confirm');
      await act(String(legacy._id), users.client, 'change.request', {
        kind: 'extend',
        returnDate: day(54),
        note: 'Gia hạn đơn cũ.',
      });
      const proposal = await act(String(legacy._id), users.sale, 'change.propose', {
        finalFee: 95000,
        terms: ['Tổng phí theo thỏa thuận.'],
      });
      assert.equal(proposal.change.finalFee, 95000);
      const applied = await act(String(legacy._id), users.client, 'change.accept', {
        changeId: proposal.change._id,
      });
      assert.equal(applied.quote.fee, 95000);
      assert.equal(applied.quote.lines[0].unitPrice, 80000);
      assert.equal(applied.quote.rentalDays, undefined);
      assert.equal(applied.quoteHistory[0].fee, 80000);
    },
  );
});
