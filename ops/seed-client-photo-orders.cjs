// Additive local fixtures for mango. Reruns retain existing orders and user edits.
// --validate checks the complete plan without writes; --check verifies saved records.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const r = require('node:module').createRequire(path.resolve(__dirname, '../backend/package.json'));
process.env.TS_NODE_PROJECT = path.resolve(__dirname, '../backend/tsconfig.json');
r('ts-node/register/transpile-only');
const mongoose = r('mongoose');
const names = [
  'User',
  'Package',
  'Category',
  'Season',
  'Costume',
  'Customer',
  'Student',
  'Booking',
  'BookingWorkflow',
  'Schedule',
  'RentalOrder',
  'Transaction',
  'Feedback',
];
const models = Object.fromEntries(
  names.map((name) => [name, r(path.resolve(__dirname, `../backend/src/models/${name}`)).default]),
);
const { withResourceTransaction } = r(
  path.resolve(__dirname, '../backend/src/services/workflowTransactions'),
);
const username = 'mango';
const namespace = 'client-photo-states-v1';
const states = [
  ['intake', 'Chờ duyệt', 7],
  ['quoting', 'Đang báo giá', 9],
  ['awaiting_deposit', 'Chờ đặt cọc', 11],
  ['ready_to_confirm', 'Đã đủ tiền cọc', 13],
  ['confirmed', 'Đã chốt lịch', 15],
  ['shooting', 'Đang chụp', 0],
  ['editing', 'Đang hậu kỳ', -3],
  ['delivered', 'Đã bàn giao', -12],
  ['revision_requested', 'Đang chỉnh sửa', -16],
  ['accepted', 'Đã nghiệm thu', -20],
  ['completed', 'Hoàn tất', -25],
  ['change_pending', 'Yêu cầu thay đổi', 17],
  ['cancelled', 'Đã hủy', 19],
  ['rejected', 'Đã từ chối', 21],
];
const at = (day, time = '08:00') => new Date(`${day}T${time}:00+07:00`);
const shift = (day, count) =>
  new Date(+at(day, '12:00') + count * 86400000).toISOString().slice(0, 10);
const localDay = (date) => new Date(+new Date(date) + 7 * 3600000).toISOString().slice(0, 10);

async function main() {
  const env = r('dotenv').parse(fs.readFileSync(path.resolve(__dirname, '../backend/.env')));
  const uri = require('./mongodb-windows.cjs').validateNativeUri(env.MONGO_URI);
  await mongoose.connect(uri, { autoIndex: false, serverSelectionTimeoutMS: 5000 });
  try {
    assert.equal(mongoose.connection.name, 'studio_db');
    assert.equal(
      (await mongoose.connection.db.admin().command({ hello: 1 })).setName,
      'studio-rs0',
    );
    const user = await models.User.findOne({ username, isActive: true }).lean();
    assert.ok(user?.roles.includes(6), 'mango must already be an active customer');
    assert.equal(user.name, 'leducanh');
    const id = (model, key) =>
      new mongoose.Types.ObjectId(
        createHash('sha256')
          .update(`${namespace}:${user._id}:${model}:${key}`)
          .digest('hex')
          .slice(0, 24),
      );
    const orderIds = states.map(([state]) => id('Booking', state));
    const existingOrders = await models.Booking.find({ _id: { $in: orderIds } }).lean();
    const existing = new Map(existingOrders.map((order) => [String(order._id), order]));
    const now = new Date();
    const today = localDay(now);
    const [
      admin,
      accountant,
      photographers,
      pack,
      depositCategory,
      balanceCategory,
      schedules,
      workflows,
      rentals,
      seasons,
    ] = await Promise.all([
      models.User.findOne({ isActive: true, roles: { $in: [0, 1] } }).lean(),
      models.User.findOne({ isActive: true, roles: 5 }).lean(),
      models.User.find({ isActive: true, roles: 3 }).sort({ username: 1 }).limit(2).lean(),
      models.Package.findOne({ name: 'Kỷ yếu Sân trường', pricePerMember: { $gt: 0 } }).lean(),
      models.Category.findOne({ name: 'Đặt cọc', type: 'income' }).lean(),
      models.Category.findOne({ name: 'Thanh toán còn lại', type: 'income' }).lean(),
      models.Schedule.find({ status: { $ne: 'cancelled' } })
        .select('shootDate')
        .lean(),
      models.BookingWorkflow.find({ lifecycle: { $ne: 'cancelled' } })
        .select('quote.proposedSchedule.shootDate')
        .lean(),
      models.RentalOrder.find({ status: { $in: ['confirmed', 'checked_out'] } })
        .select('quote.receiveDate quote.returnDate')
        .lean(),
      models.Season.find({}).lean(),
    ]);
    assert.ok(
      admin &&
        accountant &&
        pack &&
        depositCategory &&
        balanceCategory &&
        photographers.length === 2,
      'Required local catalog or staff is missing',
    );
    assert.ok(25 <= 2 * (pack.studentsPerCrew || 15), 'Selected crew must cover 25 students');
    const costumes = await Promise.all(
      pack.costumes.map((type) =>
        models.Costume.findOne({
          type,
          inventory: { $elemMatch: { size: 'M', condition: 'good', quantity: { $gte: 25 } } },
        }).lean(),
      ),
    );
    assert.ok(costumes.every(Boolean), 'Each included costume type needs at least 25 good M units');
    const busy = new Set([
      ...schedules.map((row) => localDay(row.shootDate)),
      ...workflows.flatMap((row) =>
        row.quote?.proposedSchedule?.shootDate
          ? [localDay(row.quote.proposedSchedule.shootDate)]
          : [],
      ),
    ]);
    const pickDay = (offset) => {
      let day = shift(today, offset);
      for (let tries = 0; tries < 366; tries++, day = shift(day, offset <= 0 ? -1 : 1)) {
        if (
          busy.has(day) ||
          rentals.some(
            (row) =>
              row.quote?.receiveDate &&
              row.quote?.returnDate &&
              localDay(row.quote.receiveDate) <= day &&
              day <= localDay(row.quote.returnDate),
          )
        )
          continue;
        busy.add(day);
        return day;
      }
      throw new Error('No free fixture date found');
    };
    const pending = [];
    const summary = [];
    const add = (model, key, input) => {
      const record = new models[model]({ ...input, _id: id(model, key) });
      pending.push({ model, record });
      return record;
    };
    for (const [index, [state, label, offset]] of states.entries()) {
      const key = state,
        bookingId = id('Booking', key);
      const prior = existing.get(String(bookingId));
      if (prior) {
        assert.equal(String(prior.client), String(user._id));
        assert.ok(
          await models.BookingWorkflow.exists({ booking: bookingId }),
          'Existing seed order is missing its workflow',
        );
        summary.push({ state, label, id: String(bookingId), retained: true });
        continue;
      }
      if (process.argv.includes('--check')) throw new Error(`Missing seeded state: ${state}`);
      const day = pickDay(offset),
        season = seasons.find((row) => row.startDate <= at(day) && at(day) <= row.endDate)?._id;
      const terminal = ['rejected', 'cancelled'].includes(state);
      const scheduled = [
        'confirmed',
        'shooting',
        'editing',
        'delivered',
        'revision_requested',
        'accepted',
        'completed',
        'change_pending',
      ].includes(state);
      const quoted = !['intake', 'rejected', 'cancelled'].includes(state);
      const accepted = quoted && state !== 'quoting';
      const delivered = ['delivered', 'revision_requested', 'accepted', 'completed'].includes(
        state,
      );
      const packageFlow = !['quoting', 'ready_to_confirm'].includes(state);
      const className = `[Mẫu mango] 12A${String(index + 1).padStart(2, '0')} · ${label}`;
      const location = 'Sân trường mẫu Yume, Hà Nội';
      const createdAt = new Date(Math.min(+at(shift(day, -30)), +now - 7 * 86400000));
      const reviewedAt = state === 'awaiting_deposit' ? now : new Date(+createdAt + 86400000),
        acceptedAt = new Date(+reviewedAt + 3600000);
      const fee = pack.pricePerMember * 25,
        deposit = Math.round((fee * (pack.depositPercent ?? 30)) / 100);
      const students = Array.from({ length: 25 }, (_, row) => ({
        _id: id('WorkflowMember', `${key}:${row}`),
        name: `${row % 2 ? 'Trần' : 'Nguyễn'} ${row % 2 ? 'Minh Anh' : 'Đức Minh'} ${row + 1}`,
        contact: `0908${String(index * 25 + row + 1).padStart(6, '0')}`,
        gender: row % 2 ? 'female' : 'male',
        height: 155 + (row % 25),
        weight: 45 + (row % 25),
        pantsSize: String(27 + (row % 7)),
        shirtSize: 'M',
        costumeSizes: costumes.map((costume) => ({ costumeId: costume._id, size: 'M' })),
      }));
      const customer = scheduled
        ? add('Customer', key, {
            className,
            school: 'THPT Yume (dữ liệu mẫu)',
            contactName: user.name,
            contactPhone: '0901234567',
            contactAddress: location,
            total: 25,
            totalMale: 13,
            totalFemale: 12,
            createdBy: user._id,
            season,
            notes: 'Dữ liệu mẫu kiểm thử trạng thái đơn chụp của mango.',
          })
        : null;
      if (customer)
        for (const [row, student] of students.entries()) {
          const linked = add('Student', `${key}:${row}`, {
            customer: customer._id,
            name: student.name,
            gender: student.gender,
            height: student.height,
            weight: student.weight,
            pantsSize: student.pantsSize,
            shirtSize: student.shirtSize,
            notes: student.contact,
            costumes: costumes.map((costume) => costume._id),
            costumeSizes: student.costumeSizes.map((item) => ({
              costume: item.costumeId,
              size: item.size,
            })),
          });
          student.student = linked._id;
        }
      const reservations = costumes.map((costume) => ({
        costumeId: costume._id,
        size: 'M',
        quantity: 25,
        receiveDate: at(day, '00:00'),
        returnDate: at(day, '00:00'),
      }));
      const schedule = scheduled
        ? add('Schedule', key, {
            customer: customer._id,
            package: pack._id,
            season,
            costumes: costumes.map((costume) => costume._id),
            shootDate: at(day, '00:00'),
            startTime: '08:00',
            endTime: '12:00',
            location,
            leadPhotographer: photographers[0]._id,
            supportPhotographers: [photographers[1]._id],
            bookedBy: admin._id,
            status: ['confirmed', 'shooting', 'change_pending'].includes(state)
              ? 'confirmed'
              : 'completed',
            workflowBooking: bookingId,
            costumeReservations: reservations.map(({ costumeId, ...item }) => ({
              costume: costumeId,
              ...item,
            })),
            notes: 'Lịch mẫu của mango.',
          })
        : null;
      const quote = {
        version: 1,
        currency: 'VND',
        lines: [
          { label: `${pack.name} · 25 học sinh`, quantity: 25, unitPrice: pack.pricePerMember },
        ],
        depositRequired: deposit,
        proposedSchedule: {
          shootDate: at(day, '00:00'),
          startTime: '08:00',
          endTime: '12:00',
          location,
        },
        delivery: {
          targetDays: pack.deliveryDays || 5,
          targetDate: at(shift(day, pack.deliveryDays || 5), '18:00'),
        },
        editingTerms: ['Chỉnh màu và ảnh chân dung; bao gồm một vòng góp ý.'],
        terms: ['Đặt cọc 30%; thanh toán phần còn lại khi nghiệm thu.'],
        proposedBy: admin._id,
        proposedAt: reviewedAt,
        ...(accepted ? { acceptedBy: user._id, acceptedAt } : {}),
      };
      const payments = [];
      const addPayment = (kind, amount) => {
        const paymentId = id('Payment', `${key}:${kind}`);
        const receivedAt =
          kind === 'balance'
            ? at(shift(day, 7), '10:00')
            : new Date(Math.min(+acceptedAt + 3600000, +now));
        const transaction = add('Transaction', `${key}:${kind}`, {
          customer: customer?._id,
          season,
          type: 'income',
          amount,
          categoryId: (kind === 'deposit' ? depositCategory : balanceCategory)._id,
          description: `[DỮ LIỆU MẪU mango] ${kind === 'deposit' ? 'Đặt cọc' : 'Thanh toán còn lại'} ${className}`,
          date: receivedAt,
          createdBy: accountant._id,
          workflowBooking: bookingId,
          workflowPayment: paymentId,
        });
        payments.push({
          _id: paymentId,
          kind,
          amount,
          method: 'bank_transfer',
          reference: `MAU-MANGO-${index + 1}-${kind}`,
          receivedAt,
          recordedBy: accountant._id,
          transaction: transaction._id,
        });
      };
      if (scheduled || state === 'ready_to_confirm') addPayment('deposit', deposit);
      if (state === 'awaiting_deposit') addPayment('deposit', Math.floor(deposit / 3));
      if (state === 'completed') addPayment('balance', fee - deposit);
      const deliveredAt = at(shift(day, 5), '17:00');
      const progress = {
        status: delivered
          ? 'delivered'
          : state === 'editing'
            ? 'editing'
            : state === 'shooting'
              ? 'shooting'
              : 'not_started',
        deliveryVersion: delivered ? 1 : 0,
        ...(delivered
          ? { deliveryUrl: `https://example.com/mango-demo-albums/${state}`, deliveredAt }
          : {}),
        ...(['accepted', 'completed'].includes(state)
          ? { acceptedAt: at(shift(day, 6), '18:00'), acceptedDeliveryVersion: 1 }
          : {}),
        revisionRequests:
          state === 'revision_requested'
            ? [
                {
                  note: 'Nhờ chỉnh sáng ảnh tập thể và sửa màu ảnh chân dung số 5.',
                  deliveryVersion: 1,
                  requestedBy: user._id,
                  at: at(shift(day, 6), '16:00'),
                },
              ]
            : [],
      };
      add('Booking', key, {
        client: user._id,
        clientRequestId: `${namespace}:${key}`,
        requestFingerprint: `${namespace}:${key}`,
        package: pack._id,
        packageName: pack.name,
        pricePerMember: pack.pricePerMember,
        packageSnapshot: {
          name: pack.name,
          pricePerMember: pack.pricePerMember,
          duration: pack.duration,
          costumeIds: pack.costumes,
          crewRatio: pack.crewRatio,
          editingScope: pack.editingScope,
          deliveryDays: pack.deliveryDays,
          studentsPerCrew: pack.studentsPerCrew,
        },
        ...(packageFlow
          ? {
              packageAgreement: {
                version: 1,
                total: fee,
                depositRequired: deposit,
                depositPercent: pack.depositPercent ?? 30,
                holdHours: pack.depositHoldHours ?? 24,
                detailsVersion: pack.detailsVersion ?? 0,
                acceptedAt: createdAt,
                terms: quote.terms,
                editingTerms: quote.editingTerms,
              },
            }
          : {}),
        members: 25,
        students: students.map(({ _id, student, gender, costumeSizes, ...item }) => item),
        className,
        school: 'THPT Yume (dữ liệu mẫu)',
        contactName: user.name,
        phone: '0901234567',
        startAt: at(day),
        endAt: at(day, '12:00'),
        location,
        note: 'Dữ liệu mẫu kiểm thử giao diện và trạng thái. Không phải giao dịch thực.',
        status: terminal ? state : state === 'intake' ? 'pending' : 'approved',
        ...(state !== 'intake'
          ? {
              reviewedBy: admin._id,
              reviewedAt,
              reviewNote: terminal
                ? `Đơn mẫu ${label.toLowerCase()}.`
                : 'Đã kiểm tra gói chụp và ekip.',
            }
          : {}),
        ...(state === 'cancelled'
          ? { cancelledAt: now, cancellationReason: 'Khách hủy đơn mẫu để kiểm thử trạng thái.' }
          : {}),
        events: [{ message: `Đơn mẫu mango: ${label}.`, audience: 'client', at: createdAt }],
        createdAt,
        updatedAt: now,
      });
      const feedback =
        state === 'completed'
          ? add('Feedback', key, {
              customer: customer._id,
              workflowBooking: bookingId,
              rating: 5,
              comment: 'Dữ liệu mẫu: lớp hài lòng với bộ ảnh và ekip.',
              isRead: true,
            })
          : null;
      add('BookingWorkflow', key, {
        booking: bookingId,
        customer: customer?._id,
        lifecycle: state === 'rejected' ? 'intake' : state,
        version: scheduled ? 8 : 2,
        ...(quoted ? { quote } : {}),
        assignedPhotographer: terminal || state === 'intake' ? undefined : photographers[0]._id,
        assignedSupportPhotographers: terminal || state === 'intake' ? [] : [photographers[1]._id],
        ...(packageFlow && (scheduled || state === 'awaiting_deposit')
          ? {
              packageReservation: {
                status: scheduled ? 'confirmed' : 'held',
                expiresAt: new Date(+now + (pack.depositHoldHours ?? 24) * 3600000),
                photographers: photographers.map((person) => person._id),
              },
            }
          : {}),
        payments,
        resources: {
          ...(schedule ? { schedule: schedule._id } : {}),
          photographers: scheduled ? photographers.map((person) => person._id) : [],
          costumes: scheduled ? reservations : [],
        },
        members: students,
        memberEntry: { opened: false },
        progress,
        deliveryHistory: delivered
          ? [
              {
                version: 1,
                deliveryUrl: progress.deliveryUrl,
                deliveredAt,
                deliveredBy: photographers[0]._id,
              },
            ]
          : [],
        ...(state === 'change_pending'
          ? {
              changeRequest: {
                kind: 'change',
                status: 'requested',
                requested: { location: 'Công viên Yên Sở (địa điểm mẫu)' },
                previousLifecycle: 'confirmed',
                note: 'Lớp muốn đổi địa điểm chụp sang công viên.',
                requestedBy: user._id,
                at: now,
              },
            }
          : {}),
        ...(feedback
          ? { feedback: { record: feedback._id, rating: 5, comment: feedback.comment, at: now } }
          : {}),
        events: [
          {
            action: 'workflow.created',
            message: 'Đã gửi yêu cầu chụp ảnh mẫu.',
            actor: user._id,
            audience: 'client',
            at: createdAt,
          },
          {
            action: 'seed.fixture',
            message: `Dữ liệu mẫu: ${label}.`,
            actor: admin._id,
            audience: 'client',
            at: now,
          },
        ],
        createdAt,
        updatedAt: now,
      });
      summary.push({ state, label, id: String(bookingId), retained: false });
    }
    for (const { record } of pending) await record.validate();
    if (!process.argv.includes('--validate') && pending.length) {
      await withResourceTransaction(async (session) => {
        // Recheck resource dates under the same lock used by booking writers.
        for (const { record } of pending.filter(
          (item) =>
            item.model === 'BookingWorkflow' &&
            (item.record.resources.schedule || item.record.packageReservation?.status === 'held'),
        )) {
          const shootDate = record.quote.proposedSchedule.shootDate;
          assert.equal(
            await models.Schedule.countDocuments({
              shootDate,
              status: { $ne: 'cancelled' },
            }).session(session),
            0,
            'Resource date changed; rerun the seed',
          );
          assert.equal(
            await models.BookingWorkflow.countDocuments({
              'quote.proposedSchedule.shootDate': shootDate,
              lifecycle: { $ne: 'cancelled' },
            }).session(session),
            0,
            'Workflow date changed; rerun the seed',
          );
          assert.equal(
            await models.RentalOrder.countDocuments({
              status: { $in: ['confirmed', 'checked_out'] },
              'quote.receiveDate': { $lte: at(localDay(shootDate), '23:59') },
              'quote.returnDate': { $gte: shootDate },
            }).session(session),
            0,
            'Rental date changed; rerun the seed',
          );
        }
        for (const { model, record } of pending)
          await models[model].create([record.toObject()], { session });
      });
    }
    if (!process.argv.includes('--validate')) {
      const stored = await models.Booking.find({ _id: { $in: orderIds }, client: user._id }).lean();
      assert.equal(stored.length, states.length);
      assert.equal(
        await models.BookingWorkflow.countDocuments({ booking: { $in: orderIds } }),
        states.length,
      );
      for (const booking of stored) {
        const workflow = await models.BookingWorkflow.findOne({ booking: booking._id });
        await new models.Booking(booking).validate();
        await workflow.validate();
        assert.equal(workflow.members.length, 25);
        for (const payment of workflow.payments)
          assert.ok(
            await models.Transaction.exists({
              _id: payment.transaction,
              workflowBooking: booking._id,
            }),
          );
        if (workflow.resources.schedule)
          assert.ok(
            await models.Schedule.exists({
              _id: workflow.resources.schedule,
              workflowBooking: booking._id,
              customer: workflow.customer,
            }),
          );
        if (workflow.customer)
          assert.equal(await models.Student.countDocuments({ customer: workflow.customer }), 25);
      }
    }
    console.log(
      JSON.stringify(
        {
          mode: process.argv.includes('--validate')
            ? 'validated-without-writes'
            : process.argv.includes('--check')
              ? 'checked'
              : 'seeded',
          database: 'studio_db',
          username,
          name: user.name,
          createdOrders: summary.filter((row) => !row.retained).length,
          retainedOrders: summary.filter((row) => row.retained).length,
          orders: summary,
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
      ? `Database operation failed (${error.code || error.name})`
      : error.message,
  );
  process.exitCode = 1;
});
