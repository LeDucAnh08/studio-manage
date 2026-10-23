// Additive fixtures for testing date/size availability in the dedicated local demo.
const path = require('node:path');
const fs = require('node:fs/promises');
const { createHash, randomUUID } = require('node:crypto');
const r = require('node:module').createRequire(path.resolve(__dirname, '../backend/package.json'));
const { MongoClient, ObjectId, BSON } = r('mongodb');
const { DEMO_URI, PROJECT, validateDemoUri } = require('./seed-demo.cjs');
const { PRODUCTS, HOLDS, WINDOWS } = require('./fixtures/rental-availability.cjs');
const MARKER = 'rental-availability:v1';
const DAY = 86400000;
const stableId = (collection, key) =>
  new ObjectId(
    createHash('sha256')
      .update(`${PROJECT}:${MARKER}:${collection}:${key}`)
      .digest('hex')
      .slice(0, 24),
  );

function validateAnchor(anchorDay) {
  if (
    typeof anchorDay !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(anchorDay) ||
    !Number.isFinite(Date.parse(`${anchorDay}T12:00:00+07:00`)) ||
    new Date(`${anchorDay}T12:00:00+07:00`).toISOString().slice(0, 10) !== anchorDay
  )
    throw new Error('Anchor must be a valid YYYY-MM-DD date.');
  return anchorDay;
}
const day = (anchor, offset) =>
  new Date(Date.parse(`${anchor}T12:00:00+07:00`) + offset * DAY).toISOString().slice(0, 10);
const at = (value) => new Date(`${value}T00:00:00+07:00`);
const windowsFor = (anchorDay) =>
  WINDOWS.map((window) => ({
    ...window,
    receiveDate: day(anchorDay, window.startOffset),
    returnDate: day(anchorDay, window.endOffset),
  }));

function buildRecords(anchorDay, refs, now = new Date()) {
  validateAnchor(anchorDay);
  const costumes = PRODUCTS.map(({ key, typeName, ...product }) => {
    if (!refs.types[typeName]) throw new Error(`Missing costume category: ${typeName}`);
    return {
      _id: stableId('costumes', key),
      ...product,
      type: refs.types[typeName],
      isRentalItem: true,
      rentalPrice: 0,
      createdAt: now,
      updatedAt: now,
    };
  });
  const rentalorders = [],
    transactions = [];
  for (const hold of HOLDS) {
    const rentalId = stableId('rentalorders', hold.key);
    const paymentId = stableId('payments', hold.key);
    const transactionId = stableId('transactions', hold.key);
    const lines = hold.lines.map((line) => {
      const index = PRODUCTS.findIndex((product) => product.key === line.product);
      if (index < 0) throw new Error(`Unknown fixture product: ${line.product}`);
      const product = costumes[index];
      return {
        costumeId: product._id,
        name: product.name,
        size: line.size,
        quantity: line.quantity,
        unitPrice: product.rentalDailyPrice,
      };
    });
    const rentalDays = hold.endOffset - hold.startOffset + 1;
    if (!Number.isSafeInteger(rentalDays) || rentalDays < 1)
      throw new Error('Invalid hold period.');
    const receiveDate = at(day(anchorDay, hold.startOffset));
    const returnDate = at(day(anchorDay, hold.endOffset));
    const fee = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity * rentalDays, 0);
    const deposit = Math.max(100000, Math.ceil((fee * 0.3) / 10000) * 10000);
    const quote = {
      version: 1,
      pricingMode: 'daily',
      rentalDays,
      lines,
      receiveDate,
      returnDate,
      fee,
      deposit,
      terms: [
        'Tính phí cả ngày nhận và ngày trả.',
        'Nhận và trả trang phục tại studio; kiểm tra đủ số lượng và tình trạng khi bàn giao.',
      ],
      proposedAt: now,
      acceptedAt: now,
    };
    const creationKey = `rental-availability-v1-${hold.key}`;
    rentalorders.push({
      _id: rentalId,
      client: refs.client._id,
      creationKey,
      creationFingerprint: createHash('sha256')
        .update(JSON.stringify({ lines, receiveDate, returnDate }))
        .digest('hex'),
      version: 3,
      pricingMode: 'daily',
      status: 'confirmed',
      contactName: 'Đại diện nhóm thuê',
      phone: '0901234567',
      note: 'Nhận trang phục theo danh sách và kích cỡ đã thống nhất.',
      requestedLines: lines,
      requestedReceiveDate: receiveDate,
      requestedReturnDate: returnDate,
      quote,
      quoteHistory: [],
      payments: [
        {
          _id: paymentId,
          kind: 'deposit',
          amount: deposit,
          method: 'cash',
          reference: creationKey,
          at: now,
          actor: refs.accountant._id,
          transaction: transactionId,
        },
      ],
      events: [
        {
          action: 'rental.created',
          actor: refs.client._id,
          at: now,
          message: 'Đã tiếp nhận yêu cầu thuê trang phục.',
        },
        {
          action: 'quote.propose',
          actor: refs.sale._id,
          at: now,
          message: 'Studio đã gửi báo giá theo ngày.',
        },
        {
          action: 'quote.accept',
          actor: refs.client._id,
          at: now,
          message: 'Khách hàng đã đồng ý báo giá.',
        },
        {
          action: 'payment.record',
          actor: refs.accountant._id,
          at: now,
          message: 'Đã nhận đủ cọc và giữ trang phục trong kỳ thuê.',
        },
      ],
      commands: [],
      createdAt: now,
      updatedAt: now,
    });
    transactions.push({
      _id: transactionId,
      rentalOrder: rentalId,
      rentalPayment: paymentId,
      type: 'income',
      amount: deposit,
      categoryId: refs.depositCategory._id,
      description: `Cọc thuê trang phục ${day(anchorDay, hold.startOffset)} – ${day(anchorDay, hold.endOffset)}`,
      date: now,
      createdBy: refs.accountant._id,
      accountantRefunded: false,
      createdAt: now,
      updatedAt: now,
    });
  }
  return { costumes, rentalorders, transactions };
}

async function loadRefs(db, session) {
  const client = await db
    .collection('users')
    .findOne({ username: 'demo.client', roles: 6, isActive: true }, { session });
  const accountant = await db
    .collection('users')
    .findOne({ username: 'demo.accountant', roles: 5, isActive: true }, { session });
  const sale = await db
    .collection('users')
    .findOne({ username: 'demo.sale', roles: 2, isActive: true }, { session });
  const depositCategory = await db
    .collection('categories')
    .findOne({ name: 'Cọc thuê', type: 'income' }, { session });
  const types = Object.fromEntries(
    (
      await db
        .collection('costumetypes')
        .find(
          { name: { $in: [...new Set(PRODUCTS.map((product) => product.typeName))] } },
          { session },
        )
        .toArray()
    ).map((type) => [type.name, type._id]),
  );
  if (!client || !accountant || !sale || !depositCategory)
    throw new Error('Demo customer, sale, accountant or rental deposit category is missing.');
  return { client, accountant, sale, depositCategory, types };
}

async function validateRecords(records) {
  process.env.TS_NODE_PROJECT = path.resolve(__dirname, '../backend/tsconfig.json');
  r('ts-node/register/transpile-only');
  for (const [collection, modelName] of Object.entries({
    costumes: 'Costume',
    rentalorders: 'RentalOrder',
    transactions: 'Transaction',
  })) {
    const Model = r(path.resolve(__dirname, `../backend/src/models/${modelName}`)).default;
    for (const record of records[collection]) await new Model(record).validate();
  }
}

async function assertProject(db, session) {
  if (
    (await db.collection('projectmetadata').findOne({ _id: 'seed:v1' }, { session }))?.project !==
    PROJECT
  )
    throw new Error('The dedicated demo project marker is missing. No data added.');
}

async function assertNoCollisions(db, records, session) {
  for (const [collection, documents] of Object.entries(records)) {
    const selectors = [{ _id: { $in: documents.map((record) => record._id) } }];
    if (collection === 'costumes')
      selectors.push({ name: { $in: documents.map((record) => record.name) } });
    if (collection === 'rentalorders')
      selectors.push({
        client: documents[0].client,
        creationKey: { $in: documents.map((record) => record.creationKey) },
      });
    if (await db.collection(collection).findOne({ $or: selectors }, { session }))
      throw new Error(`Fixture collision in ${collection}; existing data was preserved.`);
  }
}

const fingerprint = (record) =>
  createHash('sha256').update(BSON.EJSON.stringify(record)).digest('hex');
async function snapshot(db) {
  const result = {};
  for (const { name } of await db.listCollections({}, { nameOnly: true }).toArray()) {
    if (name === 'resourcelocks') continue; // Only the shared transaction lock version changes.
    result[name] = (await db.collection(name).find({}).toArray()).map((record) => ({
      _id: record._id,
      hash: fingerprint(record),
    }));
  }
  return result;
}
async function verifyPreserved(db, before) {
  let preserved = 0;
  for (const [name, records] of Object.entries(before)) {
    const after = new Map(
      (
        await db
          .collection(name)
          .find({ _id: { $in: records.map((record) => record._id) } })
          .toArray()
      ).map((record) => [String(record._id), fingerprint(record)]),
    );
    if (records.some((record) => after.get(String(record._id)) !== record.hash))
      throw new Error(`Existing records changed in ${name}; inspect preservation evidence.`);
    preserved += records.length;
  }
  return preserved;
}

async function seedAvailability(
  db,
  {
    apply = false,
    anchorDay = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10),
    evidenceDir = path.resolve(__dirname, '../.workflow-tools'),
  } = {},
) {
  validateAnchor(anchorDay);
  if (
    !['studio_project_demo', 'studio_rental_availability_audit'].includes(db.databaseName) ||
    (await db.admin().command({ hello: 1 })).setName !== 'rs0'
  )
    throw new Error('Expected the local demo or isolated audit database on rs0.');
  await assertProject(db);
  const metadata = db.collection('projectmetadata');
  const previous = await metadata.findOne({ _id: MARKER });
  if (previous) {
    if (previous.project !== PROJECT || previous.status !== 'completed')
      throw new Error('Unexpected rental availability marker.');
    return {
      status: 'retained',
      anchorDay: previous.anchorDay,
      created: 0,
      counts: previous.counts,
      windows: windowsFor(previous.anchorDay),
    };
  }
  const refs = await loadRefs(db);
  const now = new Date();
  const records = buildRecords(anchorDay, refs, now);
  await validateRecords(records);
  await assertNoCollisions(db, records);
  const counts = Object.fromEntries(
    Object.entries(records).map(([name, documents]) => [name, documents.length]),
  );
  const result = {
    status: 'dry-run',
    anchorDay,
    counts,
    windows: windowsFor(anchorDay),
    products: PRODUCTS.map((product) => ({
      key: product.key,
      id: String(stableId('costumes', product.key)),
      name: product.name,
      rentalDailyPrice: product.rentalDailyPrice,
    })),
  };
  if (!apply) return result;
  const before = await snapshot(db);
  await fs.mkdir(evidenceDir, { recursive: true });
  const evidence = path.join(
    evidenceDir,
    `rental-availability-before-${Date.now()}-${randomUUID()}.json`,
  );
  await fs.writeFile(
    evidence,
    BSON.EJSON.stringify({ project: PROJECT, anchorDay, records: before }, null, 2),
    { flag: 'wx', mode: 0o600 },
  );
  const session = db.client.startSession();
  let retained;
  try {
    await session.withTransaction(async () => {
      await db
        .collection('resourcelocks')
        .updateOne(
          { _id: 'studio-resources' },
          { $inc: { version: 1 } },
          { upsert: true, session },
        );
      await assertProject(db, session);
      const concurrent = await metadata.findOne({ _id: MARKER }, { session });
      if (concurrent) {
        retained = concurrent;
        return;
      }
      const currentRefs = await loadRefs(db, session);
      const currentRecords = buildRecords(anchorDay, currentRefs, now);
      if (BSON.EJSON.stringify(currentRecords) !== BSON.EJSON.stringify(records))
        throw new Error('Fixture references changed after preflight; no data added.');
      await assertNoCollisions(db, records, session);
      for (const [collection, documents] of Object.entries(records))
        await db.collection(collection).insertMany(documents, { session });
      await metadata.insertOne(
        {
          _id: MARKER,
          project: PROJECT,
          status: 'completed',
          anchorDay,
          counts,
          createdAt: now,
          recordIds: Object.fromEntries(
            Object.entries(records).map(([name, documents]) => [
              name,
              documents.map((record) => record._id),
            ]),
          ),
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
  const preservedRecords = await verifyPreserved(db, before);
  return retained
    ? {
        status: 'retained',
        anchorDay: retained.anchorDay,
        created: 0,
        counts: retained.counts,
        windows: windowsFor(retained.anchorDay),
      }
    : { ...result, status: 'applied', preservedRecords, evidence };
}

module.exports = { stableId, buildRecords, seedAvailability, MARKER, windowsFor };
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const options = {};
    for (let index = 0; index < args.length; index++) {
      if (args[index] === '--apply') options.apply = true;
      else if (args[index] === '--anchor' && args[index + 1]) options.anchorDay = args[++index];
      else
        throw new Error(
          'Usage: node ops/seed-rental-availability.cjs [--apply] [--anchor YYYY-MM-DD]',
        );
    }
    const client = new MongoClient(validateDemoUri(process.env.MONGO_DEMO_URI || DEMO_URI), {
      serverSelectionTimeoutMS: 5000,
    });
    try {
      await client.connect();
      console.log(JSON.stringify(await seedAvailability(client.db(), options), null, 2));
    } finally {
      await client.close();
    }
  })().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
