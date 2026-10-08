// Real API journeys over persistent demo data. Requests are journaled before sending,
// so an interrupted run can reuse the original body and idempotency key safely.
const path = require('node:path');
const backendRequire = require('node:module').createRequire(
  path.resolve(__dirname, '../backend/package.json'),
);
const { MongoClient, ObjectId } = backendRequire('mongodb');
const { DEMO_URI, PROJECT, ACCOUNTS, validateDemoUri } = require('./seed-demo.cjs');

function validateBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Demo API requires http://127.0.0.1:5002.');
  }
  if (
    url.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost'].includes(url.hostname) ||
    url.port !== '5002' ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw new Error('The demo scenario is restricted to the dedicated local API on port 5002.');
  return url.origin;
}

async function runDemoScenario(baseUrl = 'http://127.0.0.1:5002', uri = DEMO_URI) {
  const base = validateBaseUrl(baseUrl);
  const client = new MongoClient(validateDemoUri(uri), { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  try {
    const db = client.db('studio_project_demo');
    const metadata = db.collection('projectmetadata');
    const seed = await metadata.findOne({ _id: 'seed:v1', project: PROJECT });
    if (!seed) throw new Error('Run the persistent demo seed before the API scenario.');
    const completed = await metadata.findOne({
      _id: 'scenario:v1',
      project: PROJECT,
      status: 'completed',
    });
    if (completed)
      return { status: 'retained', ...completed.records, database: 'studio_project_demo' };
    const tokens = {};
    const call = async (route, actor, body, method = body ? 'POST' : 'GET', key) => {
      const response = await fetch(base + '/api' + route, {
        method,
        signal: AbortSignal.timeout(20000),
        headers: {
          'Content-Type': 'application/json',
          ...(actor ? { Authorization: `Bearer ${tokens[actor]}` } : {}),
          ...(key ? { 'Idempotency-Key': key } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await response.json();
      if (!response.ok || data.success === false)
        throw new Error(`HTTP ${response.status}: ${data.message || 'Demo API request failed'}`);
      return data.data;
    };
    for (const account of ACCOUNTS) {
      const data = await call('/auth/login', null, {
        username: account.username,
        password: account.password,
      });
      if (
        String(data.user._id) !== seed.users[account.username] ||
        !account.roles.every((role) => data.user.roles.includes(role))
      )
        throw new Error('The API account IDs do not match the dedicated demo database.');
      tokens[account.username] = data.token;
    }
    const admin = 'superadmin';
    const customer = 'demo.client';
    const accountant = 'demo.accountant';
    const photographer = 'demo.photographer';
    const sale = 'demo.sale';
    const day = (offset) =>
      new Date(Date.now() + offset * 86400000 + 7 * 3600000).toISOString().slice(0, 10);
    await metadata.updateOne(
      { _id: 'scenario:v1' },
      {
        $setOnInsert: {
          project: PROJECT,
          status: 'building',
          createdAt: new Date(),
          today: day(0),
          tomorrow: day(1),
          upcoming: day(7),
        },
      },
      { upsert: true },
    );
    const plan = await metadata.findOne({ _id: 'scenario:v1', project: PROJECT });
    if (!plan) throw new Error('The persisted demo scenario marker is invalid.');
    if (plan.status === 'completed')
      return { status: 'retained', ...plan.records, database: 'studio_project_demo' };

    const step = async (name, makeRequest, recover) => {
      const id = `scenario:v1:${name}`;
      let stored = await metadata.findOne({ _id: id });
      if (stored?.done) return { _id: stored.resultId };
      if (!stored) {
        const request = await makeRequest();
        await metadata.updateOne(
          { _id: id },
          { $setOnInsert: { project: PROJECT, request, createdAt: new Date() } },
          { upsert: true },
        );
        stored = await metadata.findOne({ _id: id });
      }
      try {
        const recovered = recover ? await recover(stored.request) : null;
        const { route, actor, body, method = 'POST' } = stored.request;
        // Rental accepts only letters, digits, underscores and hyphens; photography
        // also permits dots. Keep the original photography keys on interrupted runs.
        const commandKey = route.startsWith('/rentals')
          ? `demo_v1_${name.replaceAll('.', '_')}`
          : `demo.v1.${name}`;
        const data = recovered || (await call(route, actor, body, method, commandKey));
        const resultId = data?._id ? String(data._id) : undefined;
        await metadata.updateOne(
          { _id: id },
          { $set: { done: true, resultId, finishedAt: new Date() } },
        );
        return data;
      } catch (error) {
        throw new Error(
          `Demo step ${name} failed (${error.message}). Data and request journal were retained; rerun after correcting the cause. Do not reset the database.`,
        );
      }
    };
    const photoRead = (id) => call(`/bookings/${id}/workflow`, admin);
    const photoAction = (name, id, actor, body) =>
      step(name, async () => ({
        route: `/bookings/${id}/workflow/actions`,
        actor,
        body: { expectedVersion: (await photoRead(id)).workflow.version, ...body },
      }));
    const rentalRead = (id) => call(`/rentals/${id}`, admin);
    const rentalAction = (name, id, actor, body) =>
      step(name, async () => ({
        route: `/rentals/${id}/actions`,
        actor,
        body: { expectedVersion: (await rentalRead(id)).version, ...body },
      }));

    const preparePhoto = async (label, shootDate, members, deposit) => {
      const { _id: bookingId } = await step(`${label}.request`, async () => ({
        route: '/bookings',
        actor: customer,
        body: {
          packageId: seed.packageId,
          startAt: `${label === 'photo.complete' ? plan.tomorrow : shootDate}T08:00:00+07:00`,
          endAt: `${label === 'photo.complete' ? plan.tomorrow : shootDate}T10:00:00+07:00`,
          members,
          contactName: 'Khách hàng demo đồ án',
          phone: '0900000000',
          className: label === 'photo.complete' ? 'Demo · Lớp đã hoàn tất' : 'Demo · Lớp sắp chụp',
          school: 'Trường minh họa đồ án',
          location: 'Địa điểm minh họa đồ án',
          note: 'Dữ liệu giả lập; dùng để trình diễn UI/UX và quy trình nghiệp vụ.',
        },
      }));
      const reviewNote = 'Duyệt yêu cầu minh họa đồ án; lịch chụp sẽ theo báo giá được đồng ý.';
      await step(
        `${label}.approve`,
        async () => ({
          route: `/bookings/${bookingId}/review`,
          actor: admin,
          method: 'PATCH',
          body: { status: 'approved', note: reviewNote },
        }),
        async () => {
          const booking = await call(`/bookings/${bookingId}`, admin);
          return booking.status === 'approved' && booking.reviewNote === reviewNote
            ? { _id: bookingId }
            : null;
        },
      );
      await photoAction(`${label}.quote`, bookingId, admin, {
        action: 'quote.propose',
        quote: {
          currency: 'VND',
          lines: [{ label: 'Gói chụp minh họa đồ án', quantity: members, unitPrice: 350000 }],
          depositRequired: deposit,
          proposedSchedule: {
            shootDate,
            startTime: '08:00',
            endTime: '10:00',
            location: 'Địa điểm minh họa đồ án',
          },
          delivery: { targetDays: 7 },
          terms: ['Dữ liệu demo, không phải hợp đồng với khách hàng thật.'],
          editingTerms: ['Một vòng yêu cầu chỉnh sửa.'],
        },
      });
      await photoAction(`${label}.accept`, bookingId, customer, { action: 'quote.accept' });
      await step(`${label}.members`, async () => ({
        route: `/bookings/${bookingId}/workflow/members`,
        actor: customer,
        body: {
          expectedVersion: (await photoRead(bookingId)).workflow.version,
          members: Array.from({ length: members }, (_, index) => ({
            name: `Thành viên demo ${index + 1}`,
            gender: index % 2 ? 'male' : 'female',
            costumeSizes: [{ costumeId: seed.costumeId, size: 'M' }],
          })),
        },
      }));
      await photoAction(`${label}.deposit`, bookingId, accountant, {
        action: 'payment.record',
        kind: 'deposit',
        amount: deposit,
        method: 'cash',
        reference: 'Thu minh họa đồ án',
      });
      await photoAction(`${label}.confirm`, bookingId, admin, {
        action: 'resources.confirm',
        schedule: {
          shootDate,
          startTime: '08:00',
          endTime: '10:00',
          location: 'Địa điểm minh họa đồ án',
          photographerIds: [seed.users[photographer]],
        },
        costumes: [
          {
            costumeId: seed.costumeId,
            size: 'M',
            quantity: members,
            receiveDate: shootDate,
            returnDate: shootDate,
          },
        ],
      });
      return bookingId;
    };
    const completedPhoto = await preparePhoto('photo.complete', plan.today, 2, 200000);
    for (const status of ['shooting', 'editing', 'delivered'])
      await photoAction(`photo.complete.${status}`, completedPhoto, photographer, {
        action: 'progress.update',
        status,
        ...(status === 'delivered'
          ? { deliveryUrl: 'https://drive.google.com/drive/folders/demo-graduation-project' }
          : {}),
      });
    await photoAction('photo.complete.delivery-accept', completedPhoto, customer, {
      action: 'delivery.accept',
      deliveryVersion: 1,
    });
    await photoAction('photo.complete.balance', completedPhoto, accountant, {
      action: 'payment.record',
      kind: 'balance',
      amount: 500000,
      method: 'cash',
      reference: 'Thu minh họa đồ án',
    });
    await photoAction('photo.complete.feedback', completedPhoto, customer, {
      action: 'feedback.submit',
      rating: 5,
      comment: 'Phản hồi mẫu đồ án: quy trình rõ ràng, dễ theo dõi.',
    });

    const lines = [{ costumeId: seed.costumeId, size: 'M', quantity: 2 }];
    const { _id: completedRental } = await step('rental.complete.request', async () => ({
      route: '/rentals',
      actor: customer,
      body: {
        contactName: 'Khách thuê demo đồ án',
        phone: '0900000000',
        receiveDate: plan.today,
        returnDate: plan.today,
        lines,
        note: 'Đơn mẫu nhận và trả trong ngày để trình diễn đối soát hoàn cọc.',
      },
    }));
    await rentalAction('rental.complete.quote', completedRental, sale, {
      action: 'quote.propose',
      lines: lines.map((line) => ({ ...line, unitPrice: 150000 })),
      receiveDate: plan.today,
      returnDate: plan.today,
      deposit: 600000,
      terms: ['Phí cả kỳ thuê 300.000đ; hoàn cọc sau nhận trả và đồng ý đối soát.'],
    });
    await rentalAction('rental.complete.accept', completedRental, customer, {
      action: 'quote.accept',
      quoteVersion: 1,
    });
    await rentalAction('rental.complete.deposit', completedRental, accountant, {
      action: 'payment.record',
      kind: 'deposit',
      amount: 600000,
      method: 'cash',
    });
    await rentalAction('rental.complete.confirm', completedRental, admin, {
      action: 'resources.confirm',
    });
    await rentalAction('rental.complete.balance', completedRental, accountant, {
      action: 'payment.record',
      kind: 'balance',
      amount: 300000,
      method: 'cash',
    });
    await rentalAction('rental.complete.handover', completedRental, admin, { action: 'handover' });
    await rentalAction('rental.complete.return', completedRental, admin, {
      action: 'return',
      lines: [{ costumeId: seed.costumeId, size: 'M', good: 2, damaged: 0, lost: 0 }],
    });
    await rentalAction('rental.complete.settlement', completedRental, admin, {
      action: 'settlement.propose',
      charges: [],
      note: 'Nhận trả đủ, tình trạng tốt; hoàn toàn bộ cọc demo.',
    });
    await rentalAction('rental.complete.settlement-accept', completedRental, customer, {
      action: 'settlement.accept',
      settlementVersion: 1,
    });
    await rentalAction('rental.complete.refund', completedRental, accountant, {
      action: 'payment.record',
      kind: 'refund',
      amount: 600000,
      method: 'cash',
    });
    await rentalAction('rental.complete.feedback', completedRental, customer, {
      action: 'feedback.submit',
      rating: 5,
      comment: 'Phản hồi mẫu đồ án: hoàn cọc đúng đối soát.',
    });
    const upcomingPhoto = await preparePhoto('photo.upcoming', plan.upcoming, 3, 300000);
    if (
      (await photoRead(completedPhoto)).workflow.lifecycle !== 'completed' ||
      (await rentalRead(completedRental)).status !== 'completed' ||
      (await photoRead(upcomingPhoto)).workflow.lifecycle !== 'confirmed'
    )
      throw new Error('Demo API journeys did not reach their expected final states.');
    const records = { completedPhoto, completedRental, upcomingPhoto };
    await metadata.updateOne(
      { _id: 'scenario:v1', project: PROJECT },
      { $set: { status: 'completed', completedAt: new Date(), records } },
    );
    const transactions = await db.collection('transactions').countDocuments({
      $or: [
        { workflowBooking: { $in: [new ObjectId(completedPhoto), new ObjectId(upcomingPhoto)] } },
        { rentalOrder: new ObjectId(completedRental) },
      ],
    });
    return { status: 'completed', database: 'studio_project_demo', ...records, transactions };
  } finally {
    await client.close();
  }
}

module.exports = { runDemoScenario, validateBaseUrl };
if (require.main === module)
  runDemoScenario(
    process.env.DEMO_API_URL || 'http://127.0.0.1:5002',
    process.env.MONGO_DEMO_URI || DEMO_URI,
  )
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
