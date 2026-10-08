// Fictional histories for the dedicated local graduation-project database.
// Stable IDs and a completed marker keep reruns from overwriting user edits.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const backendRequire = require('node:module').createRequire(
  path.resolve(__dirname, '../backend/package.json'),
);
const { DEMO_URI, PROJECT, validateDemoUri } = require('./seed-demo.cjs');
const { seedCatalog } = require('./fixtures/realistic-catalog.cjs');
const { seedServices } = require('./fixtures/realistic-services.cjs');
const { audit } = require('./audit-studio-readiness.cjs');
const NAMESPACE = 'realistic:v1';
const DAY = 86400000;
const modelNames = [
  'User',
  'Season',
  'CostumeType',
  'Costume',
  'Package',
  'Category',
  'Customer',
  'Student',
  'Booking',
  'BookingWorkflow',
  'Schedule',
  'RentalOrder',
  'Transaction',
  'Feedback',
  'AccountRequest',
];

function loadModels() {
  const compiled = fs.existsSync(path.resolve(__dirname, '../backend/dist/models/User.js'));
  if (!compiled) {
    process.env.TS_NODE_PROJECT = path.resolve(__dirname, '../backend/tsconfig.json');
    backendRequire('ts-node/register/transpile-only');
  }
  const directory = compiled ? 'dist' : 'src';
  return {
    models: Object.fromEntries(
      modelNames.map((name) => [
        name,
        backendRequire(path.resolve(__dirname, `../backend/${directory}/models/${name}`)).default,
      ]),
    ),
    withResourceTransaction: backendRequire(
      path.resolve(__dirname, `../backend/${directory}/services/workflowTransactions`),
    ).withResourceTransaction,
  };
}

function helpers(anchorDay, mongoose) {
  const at = (date, time = '09:00') => {
    const value = new Date(`${date}T${time.length === 5 ? `${time}:00` : time}+07:00`);
    if (!Number.isFinite(+value)) throw new Error('Invalid fixture date.');
    return value;
  };
  return {
    at,
    day: (offset) => new Date(+at(anchorDay, '12:00') + offset * DAY).toISOString().slice(0, 10),
    id: (model, key) =>
      new mongoose.Types.ObjectId(
        createHash('sha256')
          .update(`${PROJECT}:${NAMESPACE}:${model}:${key}`)
          .digest('hex')
          .slice(0, 24),
      ),
  };
}

async function seedGroups(context) {
  const { ensure, catalog, at, day } = context;
  const names = [
    ['12A1', 'THPT Nguyễn Trãi', 'Hà Đông'],
    ['12A2', 'THPT Trần Phú', 'Hoàn Kiếm'],
    ['12D1', 'THPT Lê Quý Đôn', 'Đống Đa'],
    ['12A3', 'THPT Yên Hòa', 'Cầu Giấy'],
    ['12B2', 'THPT Kim Liên', 'Đống Đa'],
    ['12D2', 'THPT Phan Đình Phùng', 'Ba Đình'],
    ['12A4', 'THPT Việt Đức', 'Hoàn Kiếm'],
    ['12C1', 'THPT Nguyễn Gia Thiều', 'Long Biên'],
    ['K62 Kế toán 02', 'Khoa Kinh tế và Quản trị', 'Thanh Xuân'],
    ['K65 Công nghệ 01', 'Khoa Công nghệ thông tin', 'Hai Bà Trưng'],
    ['12A5', 'THPT Nguyễn Trãi', 'Hà Đông'],
    ['12D3', 'THPT Trần Phú', 'Hoàn Kiếm'],
    ['12A2', 'THPT Lê Quý Đôn', 'Đống Đa'],
    ['12B1', 'THPT Yên Hòa', 'Cầu Giấy'],
    ['K61 Ngôn ngữ 03', 'Khoa Ngôn ngữ và Văn hóa', 'Cầu Giấy'],
    ['12D4', 'THPT Kim Liên', 'Đống Đa'],
    ['12A6', 'THPT Việt Đức', 'Hoàn Kiếm'],
    ['12C2', 'THPT Nguyễn Gia Thiều', 'Long Biên'],
    ['K63 Marketing 02', 'Khoa Kinh tế và Quản trị', 'Thanh Xuân'],
    ['12A1', 'THPT Phan Đình Phùng', 'Ba Đình'],
  ];
  const offsets = [
    -125, -112, -96, -82, -68, -53, -40, -30, -19, -11, -7, -5, -9, -8, 10, 17, 24, 28, 31, 35,
  ];
  const families = [
    'Nguyễn',
    'Trần',
    'Lê',
    'Phạm',
    'Hoàng',
    'Vũ',
    'Đặng',
    'Bùi',
    'Đỗ',
    'Dương',
    'Đinh',
    'Hồ',
  ];
  const maleNames = [
    'Minh Quân',
    'Đức Huy',
    'Quang Minh',
    'Gia Bảo',
    'Tuấn Kiệt',
    'Hoàng Nam',
    'Anh Tú',
    'Quốc Khánh',
    'Hải Đăng',
    'Thành Đạt',
    'Nhật Anh',
    'Đình Phúc',
    'Khánh Duy',
    'Việt Hoàng',
  ];
  const femaleNames = [
    'Mai Anh',
    'Phương Linh',
    'Ngọc Hà',
    'Minh Thư',
    'Thảo Nhi',
    'Gia Hân',
    'Khánh Vy',
    'Thu Trang',
    'Thanh Tâm',
    'Bảo Ngọc',
    'Hương Giang',
    'Quỳnh Chi',
    'Hà My',
    'Phương Thảo',
  ];
  const locations = [
    'Sân trường và Văn Miếu – Quốc Tử Giám',
    'Hoàng thành Thăng Long',
    'Công viên Yên Sở',
    'Sân trường và phố đi bộ Hồ Gươm',
    'Vườn hoa Bách Thảo',
  ];
  const photographers = catalog.staff.filter((user) => user.roles.includes(3));
  const sales = catalog.staff.filter((user) => user.roles.includes(2));
  const groups = [];
  for (const [index, [className, school, district]] of names.entries()) {
    const key = `class-${String(index + 1).padStart(2, '0')}`;
    const count = 37 + (index % 8);
    const pack = catalog.packages[index % catalog.packages.length];
    const client = catalog.clients[index % catalog.clients.length];
    const shootDay = day(offsets[index]);
    const createdAt = at(day(Math.min(offsets[index] - 30, -12)), '10:15');
    const season = catalog.seasons.find(
      (row) => row.startDate <= at(shootDay) && row.endDate >= at(shootDay),
    );
    if (!season) throw new Error('A class has no matching season.');
    const totalMale = Math.floor(count / 2);
    const customer = await ensure('Customer', key, {
      className,
      school,
      contactName: client.name,
      contactPhone: `090000${String(2000 + index)}`,
      contactAddress: `${district}, Hà Nội`,
      total: count,
      totalMale,
      totalFemale: count - totalMale,
      createdBy: sales[index % sales.length]._id,
      season: season._id,
      notes:
        index % 2
          ? 'Lớp trưởng tổng hợp danh sách, thống nhất concept tông trắng và xanh navy.'
          : 'Chụp cùng giáo viên chủ nhiệm; ưu tiên ảnh tập thể và nhóm bạn thân.',
      createdAt,
      updatedAt: createdAt,
    });
    const students = [];
    for (let member = 0; member < count; member++) {
      const gender = member < totalMale ? 'male' : 'female';
      const position = gender === 'male' ? member : member - totalMale;
      const given = gender === 'male' ? maleNames : femaleNames;
      const name = `${families[(position + index * 3) % families.length]} ${given[(Math.floor(position / families.length) + position + index) % given.length]}`;
      const height =
        gender === 'male' ? 166 + ((member * 3 + index) % 19) : 151 + ((member * 2 + index) % 18);
      const weight =
        gender === 'male' ? 54 + ((member * 5 + index) % 25) : 43 + ((member * 3 + index) % 20);
      const size =
        gender === 'male'
          ? height < 168
            ? 'M'
            : height < 176
              ? 'L'
              : 'XL'
          : height < 158
            ? 'S'
            : height < 164
              ? 'M'
              : 'L';
      const outfits = pack.costumes.flatMap((typeId) => {
        const choices = catalog.costumes.filter(
          (costume) =>
            String(costume.type) === String(typeId) &&
            costume.itemKind === 'clothing' &&
            [gender, 'unisex'].includes(costume.gender) &&
            costume.inventory.some(
              (row) => row.size === size && row.condition === 'good' && row.quantity > 0,
            ),
        );
        return choices.length ? [choices[index % choices.length]] : [];
      });
      if (!outfits.length) throw new Error('A roster member has no compatible outfit.');
      const student = await ensure('Student', `${key}:student:${member + 1}`, {
        customer: customer._id,
        name,
        gender,
        height,
        weight,
        notes: member % 17 === 0 ? 'Thử size trước buổi chụp; ưu tiên phom rộng vừa.' : '',
        costumes: outfits.map((costume) => costume._id),
        costumeSizes: outfits.map((costume) => ({ costume: costume._id, size })),
        createdAt: at(day(Math.min(offsets[index] - 12, -3)), '19:30'),
        updatedAt: at(day(Math.min(offsets[index] - 10, -2)), '20:00'),
      });
      students.push(student);
    }
    const requiredCrew = Math.ceil(count / (pack.studentsPerCrew || 15));
    if (requiredCrew > photographers.length)
      throw new Error('Not enough photographers for the package.');
    groups.push({
      key,
      customer,
      students,
      client,
      package: pack,
      costume: catalog.costumes.find((row) => String(row._id) === String(students[0].costumes[0])),
      photographers: Array.from(
        { length: requiredCrew },
        (_, n) => photographers[(index + n) % photographers.length],
      ),
      shootDay,
      location: locations[index % locations.length],
    });
  }
  return groups;
}

async function seedExpenses({ ensure, catalog, groups, at, day }) {
  const rows = [
    ['print', 1480000, 'In album bìa vải và ảnh nhóm cho lớp'],
    ['photographer', 2400000, 'Thanh toán công ekip chụp ngoại cảnh'],
    ['transport', 850000, 'Thuê xe vận chuyển trang phục và thiết bị'],
    ['maintenance', 620000, 'Giặt hấp áo dài, vest sau đợt chụp'],
    ['equipment', 390000, 'Pin máy ảnh, thẻ nhớ và vật tư buổi chụp'],
    ['marketing', 1200000, 'Thiết kế và truyền thông mùa kỷ yếu'],
    ['office', 1750000, 'Điện, internet và vật tư studio'],
  ];
  const result = [];
  for (let index = 0; index < 42; index++) {
    const [category, amount, description] = rows[index % rows.length];
    const group = groups[index % 10];
    const contextual = ['print', 'photographer', 'transport'].includes(category);
    const date = contextual
      ? new Date(+at(group.shootDay, '16:15') + (4 + (Math.floor(index / 10) % 3)) * DAY)
      : at(day(-118 + index * 2), '16:15');
    const season = catalog.seasons.find((row) => row.startDate <= date && row.endDate >= date);
    const record = await ensure('Transaction', `operating-expense:${index + 1}`, {
      type: 'expense',
      amount: amount + (index % 5) * 50000,
      categoryId: catalog.categoriesByKey[category]._id,
      description: contextual
        ? `${description} ${group.customer.className} · ${group.customer.school}`
        : `${description} · đợt ${Math.floor(index / rows.length) + 1}`,
      ...(contextual ? { customer: group.customer._id } : {}),
      date,
      createdBy: catalog.staffByKey.accountant._id,
      season: season?._id,
      accountantRefunded: false,
      createdAt: date,
      updatedAt: date,
    });
    result.push(record._id);
  }
  return result;
}

async function fingerprints(db) {
  const result = {};
  for (const { name } of await db.listCollections({}, { nameOnly: true }).toArray()) {
    if (['projectmetadata', 'resourcelocks'].includes(name) || name.startsWith('system.')) continue;
    result[name] = (await db.collection(name).find({}).sort({ _id: 1 }).toArray()).map(
      (record) => ({
        id: record._id,
        hash: createHash('sha256').update(JSON.stringify(record)).digest('hex'),
      }),
    );
  }
  return result;
}

async function verifyPreserved(db, before) {
  let preserved = 0;
  for (const [name, entries] of Object.entries(before)) {
    const hashes = new Map(entries.map((entry) => [String(entry.id), entry.hash]));
    const records = await db
      .collection(name)
      .find({ _id: { $in: entries.map((entry) => entry.id) } })
      .toArray();
    if (
      records.length !== entries.length ||
      records.some(
        (record) =>
          hashes.get(String(record._id)) !==
          createHash('sha256').update(JSON.stringify(record)).digest('hex'),
      )
    )
      throw new Error(`Existing records changed in ${name}; inspect preservation evidence.`);
    preserved += records.length;
  }
  return preserved;
}

async function seedRealistic(uri = DEMO_URI, { validateOnly = false } = {}) {
  const safeUri = validateDemoUri(uri);
  const mongoose = backendRequire('mongoose');
  const { models, withResourceTransaction } = loadModels();
  const now = new Date();
  const today = new Date(+now + 7 * 3600000).toISOString().slice(0, 10);
  let session;
  let context;
  const validated = {};
  const ensure = async (name, stableKey, input, naturalFilter) => {
    const stableId = context.id(name, stableKey);
    if (validateOnly) {
      const record = new models[name]({ ...input, _id: stableId });
      await record.validate();
      validated[name] = (validated[name] || 0) + 1;
      return record;
    }
    const filter = naturalFilter ? { $or: [{ _id: stableId }, naturalFilter] } : { _id: stableId };
    const existing = await models[name].findOne(filter).session(session || null);
    if (existing) return existing;
    const [record] = await models[name].create([{ ...input, _id: stableId }], { session });
    return record;
  };
  const write = async () => {
    const catalog = await seedCatalog(context);
    const groups = await seedGroups({ ...context, catalog });
    const services = await seedServices({ ...context, catalog, groups });
    const expenses = await seedExpenses({ ...context, catalog, groups });
    return {
      services,
      expenses,
      groups: groups.map((group) => ({
        key: group.key,
        customer: String(group.customer._id),
        client: String(group.client._id),
        members: group.students.length,
      })),
    };
  };
  if (validateOnly) {
    context = { models, ensure, now, ...helpers(today, mongoose) };
    await write();
    return { validation: 'passed', databaseWrites: 0, records: validated };
  }
  await mongoose.connect(safeUri, { serverSelectionTimeoutMS: 5000, autoIndex: false });
  try {
    const db = mongoose.connection.db;
    if (
      mongoose.connection.name !== 'studio_project_demo' ||
      (await db.admin().command({ hello: 1 })).setName !== 'rs0'
    )
      throw new Error('Unexpected database or replica set.');
    const metadata = db.collection('projectmetadata');
    const previous = await metadata.findOne({ _id: NAMESPACE });
    if (previous?.status === 'completed')
      return {
        database: mongoose.connection.name,
        status: 'retained',
        anchorDay: previous.anchorDay,
        created: 0,
        counts: previous.counts,
      };
    const anchorDay = previous?.anchorDay || today;
    // This edition deliberately models the 2026 school year rather than silently shifting seasons.
    if (anchorDay < '2026-09-01' || anchorDay > '2026-11-15')
      throw new Error(
        'This fixture models autumn 2026; update its season ranges before a new edition.',
      );
    context = { models, ensure, now, ...helpers(anchorDay, mongoose) };
    const plannedSeasons = [
      ['summer', '2026-05-01', '2026-08-31'],
      ['autumn', '2026-09-01', '2026-10-31'],
      ['yearEnd', '2026-11-01', '2026-12-31'],
    ];
    for (const season of await models.Season.find({})) {
      if (
        plannedSeasons.some(
          ([key, start, end]) =>
            String(season._id) !== String(context.id('Season', `season:${key}`)) &&
            season.startDate <= context.at(end, '23:59:59') &&
            season.endDate >= context.at(start, '00:00'),
        )
      )
        throw new Error(
          'An existing season overlaps the new fixture. Existing seasons were preserved.',
        );
    }
    for (const model of Object.values(models)) await model.createIndexes();
    const before = await fingerprints(db);
    const stamp = now.toISOString().replace(/[:.]/g, '-');
    const evidenceDir = path.resolve(__dirname, '../.workflow-tools');
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(
      path.join(evidenceDir, `realistic-before-${stamp}.json`),
      JSON.stringify(before, null, 2),
    );
    await metadata.updateOne(
      { _id: NAMESPACE },
      {
        $setOnInsert: {
          project: PROJECT,
          anchorDay,
          createdAt: now,
          status: 'initializing',
          schemaVersion: 1,
        },
      },
      { upsert: true },
    );
    const records = await withResourceTransaction(async (activeSession) => {
      session = activeSession;
      return write();
    });
    session = undefined;
    const preserved = await verifyPreserved(db, before);
    const readiness = await audit(safeUri);
    fs.writeFileSync(
      path.join(evidenceDir, `realistic-readiness-${stamp}.json`),
      JSON.stringify(readiness, null, 2),
    );
    if (!readiness.ready)
      throw new Error('New fixture requires correction: see realistic-readiness evidence.');
    const counts = {};
    for (const [name, model] of Object.entries(models)) {
      const total = await model.countDocuments({});
      counts[name] = { added: total - (before[model.collection.name]?.length || 0), total };
    }
    const result = {
      database: mongoose.connection.name,
      status: 'completed',
      anchorDay,
      counts,
      preservedRecords: preserved,
      readiness: {
        ready: readiness.ready,
        findings: readiness.findings.map(({ code, severity, count }) => ({
          code,
          severity,
          count,
        })),
      },
    };
    await metadata.updateOne(
      { _id: NAMESPACE },
      {
        $set: {
          status: 'completed',
          completedAt: new Date(),
          counts,
          records,
          preservedRecords: preserved,
        },
      },
    );
    fs.writeFileSync(
      path.join(evidenceDir, 'realistic-seed.json'),
      JSON.stringify(result, null, 2),
    );
    return result;
  } finally {
    await mongoose.disconnect();
  }
}

module.exports = { seedRealistic, NAMESPACE };
if (require.main === module)
  seedRealistic(process.env.MONGO_DEMO_URI || DEMO_URI, {
    validateOnly: process.argv.includes('--validate'),
  })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
