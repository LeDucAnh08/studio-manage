// Independent HTTP/real-Mongo audit. Never connects to the application database.
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const backendRequire = require('node:module').createRequire(
  path.resolve(__dirname, '../../backend/package.json'),
);
process.env.TS_NODE_PROJECT = path.resolve(__dirname, '../../backend/tsconfig.json');
process.env.JWT_SECRET = 'isolated-workflow-audit-only';
process.env.CLIENT_WORKFLOW_ENABLED = 'true';
process.env.CLIENT_PORTAL_ENABLED = 'true';
backendRequire('ts-node/register/transpile-only');
const mongoose = backendRequire('mongoose');
const express = backendRequire('express');
const jwt = backendRequire('jsonwebtoken');
const fromBackend = (name) => require(path.resolve(__dirname, '../../backend/src', name));
const models = Object.fromEntries(
  [
    'User',
    'Booking',
    'BookingWorkflow',
    'Package',
    'CostumeType',
    'Costume',
    'Customer',
    'Student',
    'Schedule',
    'Transaction',
    'Category',
    'Feedback',
    'RentalOrder',
  ].map((name) => [name, fromBackend(`models/${name}`).default]),
);
const { protect } = fromBackend('middleware/auth');
const workflow = fromBackend('controllers/workflowController');

test('independent workflow audit against isolated replica set', async (t) => {
  const uri = new URL(
    process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27028/?replicaSet=rs0&directConnection=true',
  );
  assert.ok(['localhost', '127.0.0.1'].includes(uri.hostname), 'Only local MongoDB is permitted');
  uri.pathname = '/studio_workflow_audit';
  await mongoose.connect(uri.toString(), { serverSelectionTimeoutMS: 5000 });
  let server;
  t.after(async () => {
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    assert.equal(mongoose.connection.name, 'studio_workflow_audit');
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  assert.equal(mongoose.connection.name, 'studio_workflow_audit');
  assert.ok(
    (await mongoose.connection.db.admin().command({ hello: 1 })).setName,
    'Replica set is required',
  );
  await mongoose.connection.dropDatabase();
  const app = express();
  app.use(express.json());
  app.get('/workflow/:id', protect, workflow.getWorkflow);
  app.post('/workflow/:id', protect, workflow.executeWorkflowAction);
  app.get('/member/:token', workflow.getPublicMemberIntake);
  app.post('/member/:token', workflow.submitPublicMember);
  app.use('/schedules', fromBackend('routes/schedules').default);
  app.use('/transactions', fromBackend('routes/transactions').default);
  app.use('/costumes', fromBackend('routes/costumes').default);
  app.use('/bookings', fromBackend('routes/bookings').default);
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ message: err.message }));
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  for (const model of Object.values(models)) await model.syncIndexes();
  const users = {};
  for (const [name, roles] of Object.entries({
    admin: [0],
    client: [6],
    stranger: [6],
    accountant: [5],
    photographer: [3],
    otherPhotographer: [3],
  })) {
    users[name] = await models.User.create({
      username: `audit.${name}`,
      password: 'AuditPassword123!',
      roles,
      isActive: true,
      name,
    });
  }
  const kind = await models.CostumeType.create({ name: 'Audit áo dài' });
  const costume = await models.Costume.create({
    name: 'Internal photography áo dài',
    gender: 'unisex',
    type: kind._id,
    isRentalItem: false,
    inventory: [{ size: 'M', quantity: 1, condition: 'good' }],
  });
  const pack = await models.Package.create({
    name: 'Audit photo package',
    pricePerMember: 1000000,
    costumes: [kind._id],
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (url, actor, body, method = body ? 'POST' : 'GET', key = randomUUID()) => {
    const response = await fetch(base + url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
        ...(actor
          ? {
              Authorization: `Bearer ${jwt.sign({ id: String(actor._id) }, process.env.JWT_SECRET)}`,
            }
          : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  };
  const read = async (booking, actor = users.client) => {
    const r = await call(`/workflow/${booking._id}`, actor);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    return r.body.data;
  };
  const action = async (booking, actor, values, expected = 200, key = randomUUID()) => {
    const dto = await read(booking, users.admin);
    const r = await call(
      `/workflow/${booking._id}`,
      actor,
      { expectedVersion: dto.workflow.version, ...values },
      'POST',
      key,
    );
    assert.equal(r.status, expected, JSON.stringify(r.body));
    return r.body.data;
  };
  const day = (offset = 14) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
  const vietnamDay = (value) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(value));
  const newBooking = async (offset = 14) =>
    models.Booking.create({
      client: users.client._id,
      package: pack._id,
      packageName: pack.name,
      pricePerMember: pack.pricePerMember,
      packageSnapshot: {
        name: pack.name,
        pricePerMember: pack.pricePerMember,
        costumeIds: [kind._id],
      },
      members: 1,
      contactName: 'Đại diện lớp',
      phone: '0901234567',
      location: 'Hà Nội',
      startAt: `${day(offset)}T08:00:00+07:00`,
      endAt: `${day(offset)}T10:00:00+07:00`,
      status: 'approved',
    });
  const prepare = async (offset = 14) => {
    const booking = await newBooking(offset);
    await action(booking, users.admin, {
      action: 'quote.propose',
      quote: {
        currency: 'VND',
        lines: [{ label: 'Gói chụp', quantity: 1, unitPrice: 1000000 }],
        depositRequired: 200000,
        proposedSchedule: {
          shootDate: day(offset),
          startTime: '08:00',
          endTime: '10:00',
          location: 'Hà Nội',
        },
        delivery: { targetDays: 14 },
        terms: ['Theo thỏa thuận của hai bên'],
        editingTerms: ['Một vòng chỉnh sửa'],
      },
    });
    await action(booking, users.client, { action: 'quote.accept' });
    const opened = await action(booking, users.client, { action: 'member-link.open' });
    const token = opened.workflow.memberEntry.token;
    const publicRead = await call(`/member/${token}`);
    assert.equal(publicRead.status, 200, JSON.stringify(publicRead.body));
    assert.equal(publicRead.body.data.members, undefined, 'Anonymous links must not expose roster');
    assert.ok(
      publicRead.body.data.allowedCostumes.some((item) => item.costumeId === String(costume._id)),
      'Internal photography garments must be selectable',
    );
    const member = {
      requestId: randomUUID(),
      name: 'Thành viên',
      gender: 'female',
      costumeSizes: [{ costumeId: String(costume._id), size: 'M' }],
    };
    const submitted = await call(`/member/${token}`, null, member);
    assert.equal(submitted.status, 201, JSON.stringify(submitted.body));
    const retried = await call(`/member/${token}`, null, member);
    assert.ok([200, 201].includes(retried.status), JSON.stringify(retried.body));
    assert.equal(
      (await read(booking)).workflow.members.length,
      1,
      'A member retry must not duplicate the roster',
    );
    const changedRetry = await call(`/member/${token}`, null, {
      ...member,
      name: 'Different member',
    });
    assert.equal(
      changedRetry.status,
      409,
      'The same member request ID must not replace another submission',
    );
    assert.equal(
      await models.Schedule.countDocuments({ workflowBooking: booking._id }),
      0,
      'Member collection must precede Schedule',
    );
    const paid = await action(booking, users.accountant, {
      action: 'payment.record',
      kind: 'deposit',
      amount: 200000,
      method: 'bank_transfer',
      reference: 'audit',
    });
    return {
      booking,
      token,
      paid,
      resource: {
        action: 'resources.confirm',
        schedule: {
          shootDate: day(offset),
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
            receiveDate: day(offset),
            returnDate: day(offset + 1),
          },
        ],
      },
    };
  };

  await t.test('owner privacy and workflow command authorization', async () => {
    const booking = await newBooking();
    assert.equal((await call(`/workflow/${booking._id}`, users.stranger)).status, 404);
    assert.equal(
      (await call(`/workflow/${booking._id}`, null, { action: 'quote.accept', expectedVersion: 0 }))
        .status,
      401,
    );
    await action(booking, users.client, { action: 'quote.propose', quote: {} }, 403);
    assert.equal((await call(`/bookings/${booking._id}/workflow`, users.stranger)).status, 404);
    assert.equal(
      (await call('/bookings/workflow', users.accountant)).status,
      200,
      'Workflow discovery must support the accountant role',
    );
    const photographerList = await call('/bookings/workflow', users.otherPhotographer);
    assert.equal(photographerList.status, 200);
    assert.deepEqual(
      photographerList.body.data,
      [],
      'An unrelated photographer must not discover customer requests',
    );
  });
  await t.test('concurrent reservations have one winner and roll back the loser', async () => {
    const one = await prepare(14),
      two = await prepare(14);
    const results = await Promise.all(
      [one, two].map(async (fixture) => {
        const dto = await read(fixture.booking);
        return call(`/workflow/${fixture.booking._id}`, users.admin, {
          expectedVersion: dto.workflow.version,
          ...fixture.resource,
        });
      }),
    );
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409], JSON.stringify(results));
    assert.equal(
      await models.Schedule.countDocuments({
        workflowBooking: { $in: [one.booking._id, two.booking._id] },
      }),
      1,
    );
    assert.equal(
      await models.Customer.countDocuments(),
      1,
      'Losing transaction must not leave an orphan class',
    );
    const winner = results[0].status === 200 ? one : two;
    const dto = await read(winner.booking);
    assert.equal(
      (await call(`/member/${winner.token}`)).status,
      404,
      'Confirmation closes anonymous intake',
    );
    assert.equal(
      (
        await call(
          `/schedules/${dto.workflow.resources.scheduleId}`,
          users.admin,
          { status: 'cancelled' },
          'PUT',
        )
      ).status,
      409,
      'Legacy route must not bypass cancellation consent',
    );
    assert.equal(
      (
        await call(
          `/schedules/${dto.workflow.resources.scheduleId}`,
          users.admin,
          undefined,
          'DELETE',
        )
      ).status,
      409,
      'Linked schedule must not be hard deleted',
    );
  });
  await t.test('payment retries are exactly once and stale commands fail', async () => {
    const fixture = await prepare(30);
    await action(fixture.booking, users.admin, fixture.resource);
    const current = await read(fixture.booking);
    const key = randomUUID(),
      payload = {
        expectedVersion: current.workflow.version,
        action: 'payment.record',
        kind: 'balance',
        amount: 800000,
        method: 'cash',
      };
    const first = await call(
      `/workflow/${fixture.booking._id}`,
      users.accountant,
      payload,
      'POST',
      key,
    );
    assert.equal(first.status, 200, JSON.stringify(first.body));
    const retry = await call(
      `/workflow/${fixture.booking._id}`,
      users.accountant,
      payload,
      'POST',
      key,
    );
    assert.equal(retry.status, 200, JSON.stringify(retry.body));
    assert.equal(
      await models.Transaction.countDocuments({ workflowBooking: fixture.booking._id }),
      2,
    );
    assert.ok(
      [403, 404].includes(
        (await call(`/workflow/${fixture.booking._id}`, users.stranger, payload, 'POST', key))
          .status,
      ),
      'A known replay key must never bypass ownership',
    );
    const stale = await call(`/workflow/${fixture.booking._id}`, users.admin, {
      expectedVersion: current.workflow.version,
      action: 'member-link.close',
    });
    assert.equal(stale.status, 409);
    const transaction = await models.Transaction.findOne({ workflowBooking: fixture.booking._id });
    assert.equal(
      (await call(`/transactions/${transaction._id}`, users.accountant, { amount: 1 }, 'PUT'))
        .status,
      409,
    );
    assert.equal(
      (await call(`/transactions/${transaction._id}`, users.accountant, undefined, 'DELETE'))
        .status,
      409,
    );
  });
  await t.test(
    'delivery acceptance is versioned and waits for settlement to complete',
    async () => {
      const fixture = await prepare(45);
      await action(fixture.booking, users.admin, fixture.resource);
      await action(
        fixture.booking,
        users.otherPhotographer,
        { action: 'progress.update', status: 'shooting' },
        403,
      );
      for (const status of ['shooting', 'editing', 'delivered'])
        await action(fixture.booking, users.photographer, {
          action: 'progress.update',
          status,
          deliveryUrl: 'https://drive.google.com/audit-album',
        });
      const delivered = await read(fixture.booking);
      const staffView = await read(fixture.booking, users.photographer);
      assert.equal(
        staffView.workflow.quote,
        null,
        'Assigned photographers must not see commercial terms',
      );
      assert.equal(
        staffView.workflow.payments,
        null,
        'Assigned photographers must not see payments',
      );
      assert.equal(
        staffView.workflow.progress.deliveryUrl,
        delivered.workflow.progress.deliveryUrl,
        'Assigned photographers must see their own current delivery',
      );
      const accountingView = await read(fixture.booking, users.accountant);
      assert.deepEqual(
        accountingView.workflow.members,
        [],
        'Accounting does not need the class roster',
      );
      await action(
        fixture.booking,
        users.client,
        { action: 'delivery.accept', deliveryVersion: 0 },
        409,
      );
      const accepted = await action(fixture.booking, users.client, {
        action: 'delivery.accept',
        deliveryVersion: delivered.workflow.progress.deliveryVersion,
      });
      assert.equal(
        accepted.workflow.lifecycle,
        'accepted',
        'Receiving photos is independent of financial settlement',
      );
      const completed = await action(fixture.booking, users.accountant, {
        action: 'payment.record',
        kind: 'balance',
        amount: 800000,
        method: 'cash',
      });
      assert.equal(completed.workflow.lifecycle, 'completed');
      await action(fixture.booking, users.client, {
        action: 'feedback.submit',
        rating: 5,
        comment: 'Đã nhận ảnh',
      });
      assert.equal(
        await models.Feedback.countDocuments({ workflowBooking: fixture.booking._id }),
        1,
      );
    },
  );
  await t.test(
    'paid cancellation before allocation requires consent and records the exact refund once',
    async () => {
      const fixture = await prepare(60);
      const requested = await action(fixture.booking, users.client, {
        action: 'change.request',
        kind: 'cancel',
        note: 'Lớp cần hủy lịch',
      });
      const requestId = requested.workflow.changeRequest._id;
      await action(fixture.booking, users.admin, {
        action: 'change.propose',
        requestId,
        proposed: { finalPayable: 50000 },
        terms: ['Giữ lại phí chuẩn bị 50.000 đồng'],
      });
      const proposed = await read(fixture.booking);
      assert.equal(proposed.workflow.lifecycle, 'change_pending');
      assert.equal(
        proposed.workflow.payments.totalRefunded,
        0,
        'Proposal alone must not refund money',
      );
      const accepted = await action(fixture.booking, users.client, {
        action: 'change.accept',
        requestId,
      });
      assert.equal(accepted.workflow.lifecycle, 'cancelled');
      assert.equal(accepted.workflow.payments.refundDue, 150000);
      await action(
        fixture.booking,
        users.accountant,
        { action: 'payment.record', kind: 'refund', amount: 150001, method: 'bank_transfer' },
        409,
      );
      const current = await read(fixture.booking);
      const key = randomUUID(),
        payload = {
          expectedVersion: current.workflow.version,
          action: 'payment.record',
          kind: 'refund',
          amount: 150000,
          method: 'bank_transfer',
        };
      assert.equal(
        (await call(`/workflow/${fixture.booking._id}`, users.accountant, payload, 'POST', key))
          .status,
        200,
      );
      assert.equal(
        (await call(`/workflow/${fixture.booking._id}`, users.accountant, payload, 'POST', key))
          .status,
        200,
      );
      const final = await read(fixture.booking);
      assert.equal(final.workflow.payments.refundDue, 0);
      assert.equal(final.workflow.payments.netReceived, 50000);
      assert.equal(
        await models.Transaction.countDocuments({
          workflowBooking: fixture.booking._id,
          type: 'expense',
        }),
        1,
      );
      assert.equal(
        await models.Schedule.countDocuments({ workflowBooking: fixture.booking._id }),
        0,
      );
    },
  );
  await t.test(
    'a conflicting accepted change preserves the original allocation and quote',
    async () => {
      const original = await prepare(75),
        occupied = await prepare(80);
      await action(original.booking, users.admin, original.resource);
      await action(occupied.booking, users.admin, occupied.resource);
      const before = await read(original.booking);
      const requested = await action(original.booking, users.client, {
        action: 'change.request',
        kind: 'change',
        proposed: { schedule: occupied.resource.schedule },
        note: 'Đổi ngày chụp',
      });
      const requestId = requested.workflow.changeRequest._id;
      await action(original.booking, users.admin, {
        action: 'change.propose',
        requestId,
        proposed: { schedule: occupied.resource.schedule, costumes: occupied.resource.costumes },
        finalPayable: 1100000,
        terms: ['Phụ phí đổi lịch 100.000 đồng'],
      });
      await action(original.booking, users.client, { action: 'change.accept', requestId }, 409);
      const after = await read(original.booking);
      assert.deepEqual(
        after.workflow.resources,
        before.workflow.resources,
        'A conflict must preserve the old resources',
      );
      assert.equal(
        after.workflow.quote.total,
        before.workflow.quote.total,
        'A conflict must not add a fee',
      );
      const schedule = await models.Schedule.findById(before.workflow.resources.scheduleId);
      assert.equal(vietnamDay(schedule.shootDate), day(75));
      const withdrawn = await action(original.booking, users.client, {
        action: 'change.withdraw',
        requestId,
      });
      assert.equal(withdrawn.workflow.lifecycle, 'confirmed');
    },
  );
  await t.test('garment stock includes both receipt and return days', async () => {
    const first = await prepare(95),
      next = await prepare(96);
    await action(first.booking, users.admin, first.resource);
    await action(next.booking, users.admin, next.resource, 409);
    assert.equal(await models.Schedule.countDocuments({ workflowBooking: next.booking._id }), 0);
    assert.equal((await read(next.booking)).workflow.lifecycle, 'ready_to_confirm');
  });
  await t.test('an agreed change retains the original accepted contract snapshot', async () => {
    const fixture = await prepare(110);
    await action(fixture.booking, users.admin, fixture.resource);
    const requested = await action(fixture.booking, users.client, {
      action: 'change.request',
      kind: 'change',
      note: 'Chuyển sang ngày tiếp theo',
    });
    const requestId = requested.workflow.changeRequest._id;
    const schedule = { ...fixture.resource.schedule, shootDate: day(112) };
    const costumes = fixture.resource.costumes.map((row) => ({
      ...row,
      receiveDate: day(112),
      returnDate: day(113),
    }));
    await action(fixture.booking, users.admin, {
      action: 'change.propose',
      requestId,
      proposed: { schedule, costumes },
      finalPayable: 1100000,
      terms: ['Phụ phí đổi ngày 100.000 đồng'],
    });
    const changed = await action(fixture.booking, users.client, {
      action: 'change.accept',
      requestId,
    });
    assert.equal(changed.workflow.quote.total, 1100000);
    assert.equal(changed.workflow.payments.totalDue, 900000);
    const stored = await models.BookingWorkflow.findOne({ booking: fixture.booking._id });
    const { selectAcceptedContractQuote } = fromBackend('utils/workflowContract');
    const original = selectAcceptedContractQuote(stored.quote, stored.quoteHistory, 1);
    assert.ok(original, 'The original accepted quote remains retrievable');
    assert.equal(
      original.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
      1000000,
    );
    assert.equal(vietnamDay(original.proposedSchedule.shootDate), day(110));
    assert.notEqual(stored.quote.version, 1, 'A changed accepted snapshot needs its own version');
  });
  await t.test(
    'a customer-approved lower service price exposes and settles the refund',
    async () => {
      const fixture = await prepare(140);
      await action(fixture.booking, users.admin, fixture.resource);
      const requested = await action(fixture.booking, users.client, {
        action: 'change.request',
        kind: 'change',
        note: 'Đổi lịch và điều chỉnh giá theo thỏa thuận',
      });
      const requestId = requested.workflow.changeRequest._id;
      await action(fixture.booking, users.admin, {
        action: 'change.propose',
        requestId,
        proposed: { schedule: { ...fixture.resource.schedule, shootDate: day(142) } },
        finalPayable: 100000,
        terms: ['Giá cuối cùng 100.000 đồng; hoàn phần đã nhận dư'],
      });
      const accepted = await action(fixture.booking, users.client, {
        action: 'change.accept',
        requestId,
      });
      assert.equal(accepted.workflow.quote.total, 100000);
      assert.equal(accepted.workflow.payments.refundDue, 100000);
      await action(
        fixture.booking,
        users.accountant,
        { action: 'payment.record', kind: 'refund', amount: 100001, method: 'cash' },
        409,
      );
      const settled = await action(fixture.booking, users.accountant, {
        action: 'payment.record',
        kind: 'refund',
        amount: 100000,
        method: 'cash',
      });
      assert.equal(settled.workflow.payments.netReceived, 100000);
      assert.equal(settled.workflow.payments.refundDue, 0);
      assert.equal(
        settled.workflow.lifecycle,
        'confirmed',
        'Refund settlement alone does not complete photography',
      );
    },
  );
  await t.test(
    'legacy inventory uncertainty blocks confirmation until precise reconciliation',
    async () => {
      await models.Costume.updateOne(
        { _id: costume._id },
        { $set: { inventory: [{ size: 'M', quantity: 2, condition: 'good' }] } },
      );
      const fixture = await prepare(165);
      const customer = await models.Customer.create({
        className: 'Lớp lịch cũ',
        contactName: 'Đại diện',
        contactPhone: '0901234567',
        contactAddress: 'Hà Nội',
        total: 1,
        totalMale: 0,
        totalFemale: 1,
      });
      const legacy = await models.Schedule.create({
        customer: customer._id,
        package: pack._id,
        costumes: [costume._id],
        shootDate: day(165),
        startTime: '12:00',
        endTime: '14:00',
        location: 'Hà Nội',
        leadPhotographer: users.photographer._id,
        status: 'confirmed',
      });
      await action(fixture.booking, users.admin, fixture.resource, 409);
      const reconciled = await call(
        `/schedules/${legacy._id}`,
        users.admin,
        {
          costumeReservations: [
            {
              costume: String(costume._id),
              size: 'M',
              quantity: 1,
              receiveDate: day(165),
              returnDate: day(165),
            },
          ],
        },
        'PUT',
      );
      assert.equal(reconciled.status, 200, JSON.stringify(reconciled.body));
      const confirmed = await action(fixture.booking, users.admin, fixture.resource);
      assert.equal(confirmed.workflow.lifecycle, 'confirmed');
      assert.equal(
        await models.Schedule.countDocuments({
          _id: { $in: [legacy._id, confirmed.workflow.resources.scheduleId] },
        }),
        2,
      );
    },
  );
  await t.test(
    'legacy garments can initialize inventory without weakening uncertain reservations',
    async () => {
      const oldGarment = await models.Costume.create({
        name: 'Legacy garment without stock',
        gender: 'unisex',
        type: kind._id,
        inventory: [],
      });
      const customer = await models.Customer.create({
        className: 'Lớp đối soát kho',
        contactName: 'Đại diện',
        contactPhone: '0901234567',
        contactAddress: 'Hà Nội',
        total: 1,
      });
      const legacy = await models.Schedule.create({
        customer: customer._id,
        costumes: [oldGarment._id],
        shootDate: day(185),
        startTime: '12:00',
        endTime: '14:00',
        leadPhotographer: users.photographer._id,
        status: 'confirmed',
      });
      const initialize = await call(
        `/costumes/${oldGarment._id}`,
        users.admin,
        { inventory: [{ size: 'M', quantity: 10, condition: 'good' }] },
        'PUT',
      );
      assert.equal(initialize.status, 200, JSON.stringify(initialize.body));
      const reduce = await call(
        `/costumes/${oldGarment._id}`,
        users.admin,
        { inventory: [{ size: 'M', quantity: 5, condition: 'good' }] },
        'PUT',
      );
      assert.equal(reduce.status, 409, 'Unknown legacy use must prevent reducing available stock');
      const reconcile = await call(
        `/schedules/${legacy._id}`,
        users.admin,
        {
          costumeReservations: [
            {
              costume: String(oldGarment._id),
              size: 'M',
              quantity: 1,
              receiveDate: day(185),
              returnDate: day(185),
            },
          ],
        },
        'PUT',
      );
      assert.equal(reconcile.status, 200, JSON.stringify(reconcile.body));
      const preciseReduction = await call(
        `/costumes/${oldGarment._id}`,
        users.admin,
        { inventory: [{ size: 'M', quantity: 5, condition: 'good' }] },
        'PUT',
      );
      assert.equal(preciseReduction.status, 200, JSON.stringify(preciseReduction.body));
    },
  );
  await t.test('shooting cannot start with garments still held by an overdue rental', async () => {
    const fixture = await prepare(210);
    await action(fixture.booking, users.admin, fixture.resource);
    const stock = await models.Costume.findById(costume._id);
    const held = stock.inventory
      .filter((row) => row.size === 'M' && row.condition === 'good')
      .reduce((sum, row) => sum + row.quantity, 0);
    const rental = await models.RentalOrder.create({
      client: users.client._id,
      creationKey: randomUUID(),
      creationFingerprint: 'simulated-passing-time',
      status: 'checked_out',
      quote: {
        version: 1,
        acceptedAt: new Date(),
        receiveDate: new Date(Date.now() - 3 * 86400000),
        returnDate: new Date(Date.now() - 86400000),
        fee: 100000,
        deposit: 100000,
        terms: ['Already checked out'],
        lines: [
          {
            costumeId: costume._id,
            name: costume.name,
            size: 'M',
            quantity: held,
            unitPrice: 100000,
          },
        ],
      },
    });
    await action(
      fixture.booking,
      users.photographer,
      { action: 'progress.update', status: 'shooting' },
      409,
    );
    assert.equal((await read(fixture.booking)).workflow.lifecycle, 'confirmed');
    await models.RentalOrder.deleteOne({ _id: rental._id });
    await action(fixture.booking, users.photographer, {
      action: 'progress.update',
      status: 'shooting',
    });
  });
  await t.test(
    'rollback flags preserve photography holds against legacy schedule creation and updates',
    async () => {
      const fixture = await prepare(240);
      await action(fixture.booking, users.admin, fixture.resource);
      assert.equal(
        await models.RentalOrder.countDocuments({ status: { $in: ['confirmed', 'checked_out'] } }),
        0,
        'The protection must work with photography only',
      );
      const customer = await models.Customer.create({
        className: 'Rollback audit',
        contactName: 'Audit',
        contactPhone: '0901234567',
        contactAddress: 'Hà Nội',
        total: 1,
      });
      const good = (await models.Costume.findById(costume._id)).inventory
        .filter((row) => row.size === 'M' && row.condition === 'good')
        .reduce((sum, row) => sum + row.quantity, 0);
      const payload = {
        customer: String(customer._id),
        status: 'confirmed',
        shootDate: day(240),
        startTime: '08:30',
        endTime: '09:30',
        location: 'Hà Nội',
        leadPhotographer: String(users.photographer._id),
        costumes: [String(costume._id)],
        costumeReservations: [
          {
            costume: String(costume._id),
            size: 'M',
            quantity: 1,
            receiveDate: day(240),
            returnDate: day(240),
          },
        ],
      };
      const legacy = await models.Schedule.create({
        ...payload,
        shootDate: day(242),
        leadPhotographer: users.otherPhotographer._id,
        costumeReservations: [
          {
            costume: costume._id,
            size: 'M',
            quantity: 1,
            receiveDate: day(242),
            returnDate: day(242),
          },
        ],
      });
      const previousWorkflow = process.env.CLIENT_WORKFLOW_ENABLED,
        previousRental = process.env.CLIENT_RENTAL_ENABLED;
      process.env.CLIENT_WORKFLOW_ENABLED = 'false';
      process.env.CLIENT_RENTAL_ENABLED = 'false';
      try {
        const helper = fromBackend('services/workflowTransactions');
        assert.equal(await helper.resourceTransactionsRequired(), true);
        const staffCollision = await call('/schedules', users.admin, payload);
        assert.equal(staffCollision.status, 409, JSON.stringify(staffCollision.body));
        const stockCollision = await call('/schedules', users.admin, {
          ...payload,
          leadPhotographer: String(users.otherPhotographer._id),
          costumeReservations: [{ ...payload.costumeReservations[0], quantity: good }],
        });
        assert.equal(stockCollision.status, 409, JSON.stringify(stockCollision.body));
        const moved = await call(`/schedules/${legacy._id}`, users.admin, payload, 'PUT');
        assert.equal(moved.status, 409, JSON.stringify(moved.body));
        assert.equal(
          vietnamDay((await models.Schedule.findById(legacy._id)).shootDate),
          day(242),
          'Failed legacy edits must keep the original schedule',
        );
      } finally {
        if (previousWorkflow === undefined) delete process.env.CLIENT_WORKFLOW_ENABLED;
        else process.env.CLIENT_WORKFLOW_ENABLED = previousWorkflow;
        if (previousRental === undefined) delete process.env.CLIENT_RENTAL_ENABLED;
        else process.env.CLIENT_RENTAL_ENABLED = previousRental;
      }
    },
  );
});
