// Real HTTP/replica-set audit, restricted to a disposable local database.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const r = require('node:module').createRequire(
  path.resolve(__dirname, '../../backend/package.json'),
);
process.env.TS_NODE_PROJECT = path.resolve(__dirname, '../../backend/tsconfig.json');
process.env.JWT_SECRET = 'rental-audit-local';
process.env.CLIENT_PORTAL_ENABLED = 'true';
process.env.CLIENT_RENTAL_ENABLED = 'true';
process.env.CLIENT_WORKFLOW_ENABLED = 'true';
r('ts-node/register/transpile-only');
const mongoose = r('mongoose'),
  express = r('express'),
  jwt = r('jsonwebtoken');
const source = (name) => r(path.resolve(__dirname, '../../backend/src', name));
const models = Object.fromEntries(
  [
    'User',
    'Costume',
    'CostumeType',
    'Customer',
    'Schedule',
    'Category',
    'Transaction',
    'RentalOrder',
    'Booking',
    'BookingWorkflow',
    'Package',
  ].map((name) => [name, source(`models/${name}`).default]),
);
test('rental workflow uses the same real resource lock as photography', async (t) => {
  const uri = new URL(
    process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27028/?replicaSet=rs0&directConnection=true',
  );
  assert.ok(['127.0.0.1', 'localhost'].includes(uri.hostname));
  uri.pathname = '/studio_rental_audit';
  await mongoose.connect(uri.toString(), { serverSelectionTimeoutMS: 5000 });
  let server;
  t.after(async () => {
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    assert.equal(mongoose.connection.name, 'studio_rental_audit');
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  assert.ok((await mongoose.connection.db.admin().command({ hello: 1 })).setName);
  await mongoose.connection.dropDatabase();
  const app = express();
  app.use(express.json());
  app.use('/rentals', source('routes/rentals').default);
  app.use('/schedules', source('routes/schedules').default);
  app.use('/costumes', source('routes/costumes').default);
  app.use('/transactions', source('routes/transactions').default);
  const workflow = source('controllers/workflowController');
  const { protect } = source('middleware/auth');
  app.get('/workflow/:id', protect, workflow.getWorkflow);
  app.post('/workflow/:id', protect, workflow.executeWorkflowAction);
  app.post('/photo-members/:id', protect, workflow.replaceWorkflowMembers);
  app.use((e, req, res, next) => res.status(500).json({ message: e.message }));
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  for (const model of Object.values(models)) await model.syncIndexes();
  const users = {};
  for (const [name, role] of Object.entries({
    admin: 0,
    sale: 2,
    client: 6,
    stranger: 6,
    accountant: 5,
    collaborator: 4,
    photographer: 3,
  }))
    users[name] = await models.User.create({
      username: `rental.${name}`,
      password: 'RentalTest123!',
      roles: [role],
      isActive: true,
    });
  const customer = await models.Customer.create({
    className: 'Audit rental',
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
  const at = (value) => new Date(`${value}T00:00:00+07:00`);
  const call = async (
    url,
    actor = users.admin,
    data,
    method = data ? 'POST' : 'GET',
    key = randomUUID(),
  ) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${url}`, {
      method,
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
      ...(data ? { body: JSON.stringify(data) } : {}),
    });
    return { status: response.status, body: await response.json() };
  };
  const read = async (id, actor = users.admin) => {
    const result = await call(`/rentals/${id}`, actor);
    assert.equal(result.status, 200, JSON.stringify(result.body));
    return result.body.data;
  };
  const act = async (id, actor, action, data = {}, expected = 200, key = randomUUID()) => {
    const order = await read(id);
    const response = await call(
      `/rentals/${id}/actions`,
      actor,
      { expectedVersion: order.version, action, ...data },
      'POST',
      key,
    );
    assert.equal(response.status, expected, JSON.stringify(response.body));
    return response.body.data;
  };
  const item = async (quantity = 1) => {
    const type = await models.CostumeType.create({ name: randomUUID() });
    return models.Costume.create({
      name: 'Áo dài ' + randomUUID(),
      gender: 'unisex',
      type: type._id,
      isRentalItem: true,
      rentalPrice: 100000,
      inventory: [{ size: 'M', condition: 'good', quantity }],
    });
  };
  const request = (costume) => ({
    contactName: 'Khách thuê',
    phone: '0901234567',
    note: 'Audit',
    receiveDate: day(),
    returnDate: day(2),
    lines: [{ costumeId: String(costume._id), size: 'M', quantity: 1 }],
  });
  const prepare = async (costume, receive = day(), returned = day(2)) => {
    const data = { ...request(costume), receiveDate: receive, returnDate: returned };
    const created = await call('/rentals', users.client, data);
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const id = created.body.data._id;
    await act(id, users.sale, 'quote.propose', {
      lines: data.lines.map((row) => ({ ...row, unitPrice: 100000 })),
      receiveDate: receive,
      returnDate: returned,
      deposit: 200000,
      terms: ['Phí cho cả kỳ thuê; cọc đối soát sau nhận trả.'],
    });
    await act(id, users.client, 'quote.accept', { quoteVersion: 1 });
    await act(id, users.accountant, 'payment.record', {
      kind: 'deposit',
      amount: 200000,
      method: 'cash',
    });
    return id;
  };
  await t.test('ownership, roles, stable creation retries and quote consent', async () => {
    const costume = await item(),
      key = randomUUID(),
      data = request(costume);
    const one = await call('/rentals', users.client, data, 'POST', key);
    assert.equal(one.status, 201);
    await models.Costume.updateOne(
      { _id: costume._id },
      { rentalPrice: 900000, isRentalItem: false },
    );
    const replay = await call('/rentals', users.client, data, 'POST', key);
    assert.equal(replay.status, 200);
    assert.equal(replay.body.data._id, one.body.data._id);
    assert.equal(
      (await call('/rentals', users.client, { ...data, phone: '0901234568' }, 'POST', key)).status,
      409,
    );
    assert.equal((await call(`/rentals/${one.body.data._id}`, users.stranger)).status, 404);
    assert.equal((await call(`/rentals/${one.body.data._id}`, users.photographer)).status, 403);
    assert.equal((await call('/rentals', null, data)).status, 401);
    await act(one.body.data._id, users.client, 'quote.propose', {}, 403);
    await act(one.body.data._id, users.client, '__proto__', {}, 403);
    await models.Costume.updateOne({ _id: costume._id }, { isRentalItem: true });
    await act(one.body.data._id, users.sale, 'quote.propose', {
      lines: data.lines.map((row) => ({ ...row, unitPrice: 100000 })),
      receiveDate: day(),
      returnDate: day(2),
      deposit: 200000,
      terms: ['Terms'],
    });
    await act(one.body.data._id, users.client, 'quote.accept', { quoteVersion: 99 }, 409);
  });
  await t.test('simultaneous confirmations reserve the final garment exactly once', async () => {
    const costume = await item(),
      ids = await Promise.all([prepare(costume), prepare(costume)]);
    const orders = await Promise.all(ids.map((id) => read(id)));
    const responses = await Promise.all(
      orders.map((order) =>
        call(`/rentals/${order._id}/actions`, users.admin, {
          action: 'resources.confirm',
          expectedVersion: order.version,
        }),
      ),
    );
    assert.deepEqual(responses.map((row) => row.status).sort(), [200, 409]);
    assert.equal(
      await models.RentalOrder.countDocuments({ _id: { $in: ids }, status: 'confirmed' }),
      1,
    );
  });
  await t.test('rental and photography confirmations compete under one shared lock', async () => {
    const costume = await item(),
      id = await prepare(costume, day(10), day(11));
    const pack = await models.Package.create({
      name: 'Shared inventory',
      pricePerMember: 100000,
      costumes: [costume.type],
    });
    const booking = await models.Booking.create({
      client: users.client._id,
      package: pack._id,
      packageName: pack.name,
      pricePerMember: 100000,
      packageSnapshot: { name: pack.name, pricePerMember: 100000, costumeIds: [costume.type] },
      members: 1,
      contactName: 'Lớp',
      phone: '0901234567',
      location: 'Hà Nội',
      startAt: `${day(10)}T08:00:00+07:00`,
      endAt: `${day(10)}T10:00:00+07:00`,
      status: 'approved',
    });
    const photoAct = async (action, values = {}) => {
      const old = await call(`/workflow/${booking._id}`);
      const result = await call(`/workflow/${booking._id}`, users.admin, {
        expectedVersion: old.body.data.workflow.version,
        action,
        ...values,
      });
      assert.equal(result.status, 200, JSON.stringify(result.body));
      return result.body.data;
    };
    await photoAct('quote.propose', {
      quote: {
        lines: [{ label: 'Gói', quantity: 1, unitPrice: 100000 }],
        depositRequired: 20000,
        terms: ['Terms'],
        editingTerms: ['Editing'],
        delivery: { targetDays: 10 },
        proposedSchedule: {
          shootDate: day(10),
          startTime: '08:00',
          endTime: '10:00',
          location: 'Hà Nội',
        },
      },
    });
    let old = await call(`/workflow/${booking._id}`);
    const accepted = await call(`/workflow/${booking._id}`, users.client, {
      action: 'quote.accept',
      expectedVersion: old.body.data.workflow.version,
    });
    assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
    old = await call(`/workflow/${booking._id}`);
    const memberResult = await call(`/photo-members/${booking._id}`, users.client, {
      expectedVersion: old.body.data.workflow.version,
      members: [
        {
          name: 'Member',
          gender: 'female',
          costumeSizes: [{ costumeId: String(costume._id), size: 'M' }],
        },
      ],
    });
    assert.equal(memberResult.status, 200, JSON.stringify(memberResult.body));
    await photoAct('payment.record', { kind: 'deposit', amount: 20000, method: 'cash' });
    const photoVersion = (await call(`/workflow/${booking._id}`)).body.data.workflow.version;
    const rental = await read(id);
    const responses = await Promise.all([
      call(`/rentals/${id}/actions`, users.admin, {
        expectedVersion: rental.version,
        action: 'resources.confirm',
      }),
      call(`/workflow/${booking._id}`, users.admin, {
        expectedVersion: photoVersion,
        action: 'resources.confirm',
        schedule: {
          shootDate: day(10),
          startTime: '08:00',
          endTime: '10:00',
          location: 'Hà Nội',
          photographerIds: [String(users.photographer._id)],
        },
        costumes: [
          {
            costumeId: String(costume._id),
            size: 'M',
            quantity: 1,
            receiveDate: day(10),
            returnDate: day(11),
          },
        ],
      }),
    ]);
    assert.deepEqual(
      responses.map((row) => row.status).sort(),
      [200, 409],
      JSON.stringify(responses),
    );
  });
  await t.test('legacy writes cannot bypass holds even after flags are disabled', async () => {
    const costume = await item(),
      id = await prepare(costume);
    await act(id, users.admin, 'resources.confirm');
    process.env.CLIENT_RENTAL_ENABLED = 'false';
    process.env.CLIENT_WORKFLOW_ENABLED = 'false';
    try {
      assert.equal((await call('/rentals', users.admin)).status, 404);
      const schedule = await call('/schedules', users.admin, {
        customer: String(customer._id),
        shootDate: day(1),
        status: 'confirmed',
        costumes: [String(costume._id)],
        costumeReservations: [
          {
            costume: String(costume._id),
            size: 'M',
            quantity: 1,
            receiveDate: day(1),
            returnDate: day(1),
          },
        ],
      });
      assert.equal(schedule.status, 409, JSON.stringify(schedule.body));
      const reduction = await call(
        `/costumes/${costume._id}`,
        users.admin,
        { inventory: [{ size: 'M', condition: 'good', quantity: 0 }] },
        'PUT',
      );
      assert.equal(reduction.status, 409);
      assert.equal(
        (await call(`/costumes/${costume._id}`, users.admin, undefined, 'DELETE')).status,
        409,
      );
    } finally {
      process.env.CLIENT_RENTAL_ENABLED = 'true';
      process.env.CLIENT_WORKFLOW_ENABLED = 'true';
    }
  });
  await t.test(
    'money is exactly once, returns alter condition, settlement needs consent before refund',
    async () => {
      const costume = await item(),
        id = await prepare(costume);
      await act(id, users.admin, 'resources.confirm');
      const key = randomUUID();
      const command = { kind: 'balance', amount: 100000, method: 'cash' };
      await act(id, users.accountant, 'payment.record', command, 200, key);
      await act(id, users.accountant, 'payment.record', command, 200, key);
      assert.equal(await models.Transaction.countDocuments({ rentalOrder: id, type: 'income' }), 2);
      const tx = await models.Transaction.findOne({ rentalOrder: id });
      assert.equal(
        (await call(`/transactions/${tx._id}`, users.admin, { amount: 1 }, 'PUT')).status,
        409,
      );
      assert.equal(
        (await call(`/transactions/${tx._id}`, users.admin, undefined, 'DELETE')).status,
        409,
      );
      assert.equal((await read(id, users.collaborator)).payment, undefined);
      await act(id, users.collaborator, 'handover', {}, 403);
      await act(id, users.admin, 'handover');
      await act(
        id,
        users.admin,
        'return',
        { lines: [{ costumeId: String(costume._id), size: 'M', good: 1, damaged: 1, lost: 0 }] },
        400,
      );
      await act(id, users.admin, 'return', {
        lines: [{ costumeId: String(costume._id), size: 'M', good: 0, damaged: 1, lost: 0 }],
      });
      const stock = await models.Costume.findById(costume._id);
      assert.equal(stock.inventory.find((row) => row.condition === 'good').quantity, 0);
      assert.equal(stock.inventory.find((row) => row.condition === 'damaged').quantity, 1);
      await act(id, users.admin, 'settlement.propose', {
        charges: [{ label: 'Sửa hàng theo thỏa thuận', amount: 50000 }],
        note: 'Phí thuê + phí sửa; hoàn cọc dư.',
      });
      await act(
        id,
        users.accountant,
        'payment.record',
        { kind: 'refund', amount: 150000, method: 'cash' },
        409,
      );
      await act(id, users.client, 'settlement.accept', { settlementVersion: 1 });
      await act(
        id,
        users.accountant,
        'payment.record',
        { kind: 'refund', amount: 150001, method: 'cash' },
        409,
      );
      const refundKey = randomUUID();
      await act(
        id,
        users.accountant,
        'payment.record',
        { kind: 'refund', amount: 150000, method: 'cash' },
        200,
        refundKey,
      );
      await act(
        id,
        users.accountant,
        'payment.record',
        { kind: 'refund', amount: 150000, method: 'cash' },
        200,
        refundKey,
      );
      assert.equal((await read(id)).status, 'completed');
      assert.equal(
        await models.Transaction.countDocuments({ rentalOrder: id, type: 'expense' }),
        1,
      );
      await act(id, users.client, 'feedback.submit', { rating: 5, comment: 'Good' });
      await act(id, users.client, 'feedback.submit', { rating: 5 }, 409);
    },
  );
  await t.test(
    'conflicting extension preserves the original period and accepted quote',
    async () => {
      const costume = await item(),
        first = await prepare(costume, day(20), day(21)),
        next = await prepare(costume, day(22), day(23));
      await act(first, users.admin, 'resources.confirm');
      await act(next, users.admin, 'resources.confirm');
      await act(first, users.client, 'change.request', {
        kind: 'extend',
        returnDate: day(22),
        note: 'Need one more day',
      });
      await act(first, users.sale, 'change.propose', {
        finalFee: 150000,
        terms: ['Thêm một ngày'],
      });
      const proposed = await read(first);
      await act(first, users.client, 'change.accept', { changeId: proposed.change._id }, 409);
      const after = await read(first);
      assert.equal(after.quote.returnDate, at(day(21)).toISOString());
      assert.equal(after.quote.version, 1);
      assert.equal(after.change.status, 'proposed');
      await act(first, users.client, 'change.decline');
      await act(first, users.client, 'change.request', { kind: 'cancel', note: 'Cannot collect' });
      await act(first, users.sale, 'change.propose', {
        finalFee: 10000,
        terms: ['Giữ phí đã thỏa thuận'],
      });
      await act(first, users.client, 'change.accept', { changeId: (await read(first)).change._id });
      await act(first, users.accountant, 'payment.record', {
        kind: 'refund',
        amount: 190000,
        method: 'cash',
      });
      assert.equal((await read(first)).status, 'cancelled');
    },
  );
  await t.test(
    'successful extension snapshots history and overdue unreturned stock remains held',
    async () => {
      const costume = await item(),
        id = await prepare(costume);
      await act(id, users.admin, 'resources.confirm');
      await act(id, users.accountant, 'payment.record', {
        kind: 'balance',
        amount: 100000,
        method: 'cash',
      });
      await act(id, users.admin, 'handover');
      await act(id, users.client, 'change.request', {
        kind: 'extend',
        returnDate: day(3),
        note: 'Extend',
      });
      await act(id, users.sale, 'change.propose', { finalFee: 120000, terms: ['Thêm ngày'] });
      await act(id, users.client, 'change.accept', { changeId: (await read(id)).change._id });
      const extended = await read(id);
      assert.equal(extended.quote.version, 2);
      assert.equal(extended.quoteHistory[0].version, 1);
      assert.equal(extended.payment.due, 20000);
      // Simulate passing the agreed return day; no stock is released without a return.
      await models.RentalOrder.updateOne(
        { _id: id },
        { 'quote.receiveDate': at(day(-2)), 'quote.returnDate': at(day(-1)) },
      );
      const future = await prepare(costume, day(10), day(11));
      await act(future, users.admin, 'resources.confirm', {}, 409);
    },
  );
  await t.test(
    'withdrawal and cancellation work before a resource reservation exists',
    async () => {
      const costume = await item();
      const created = await call('/rentals', users.client, request(costume));
      assert.equal(created.status, 201);
      await act(created.body.data._id, users.client, 'withdraw');
      assert.equal((await read(created.body.data._id)).status, 'cancelled');
      const id = await prepare(costume);
      await act(id, users.client, 'change.request', {
        kind: 'cancel',
        note: 'Không thể nhận hàng',
      });
      await act(id, users.admin, 'resources.confirm', {}, 409);
      await act(id, users.sale, 'change.propose', { finalFee: 0, terms: ['Hoàn toàn bộ cọc'] });
      await act(id, users.client, 'change.accept', { changeId: (await read(id)).change._id });
      await act(id, users.accountant, 'payment.record', {
        kind: 'refund',
        amount: 200000,
        method: 'cash',
      });
      const cancelled = await read(id);
      assert.equal(cancelled.status, 'cancelled');
      assert.equal(cancelled.payment.netReceived, 0);
      assert.equal(cancelled.checkedOutAt, undefined);
    },
  );
});
