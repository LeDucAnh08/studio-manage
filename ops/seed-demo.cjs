// Persistent graduation-project data. This script never resets a database or an existing record.
const path = require('node:path');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const backendRequire = require('node:module').createRequire(
  path.resolve(__dirname, '../backend/package.json'),
);

const DEMO_URI =
  'mongodb://127.0.0.1:27029/studio_project_demo?replicaSet=rs0&directConnection=true';
const PROJECT = 'studio-manage-graduation-demo';
const ACCOUNTS = [
  { username: 'superadmin', password: 'Admin@1234', roles: [0], name: 'Quản trị đồ án' },
  { username: 'demo.client', password: 'Client@1234', roles: [6], name: 'Khách hàng demo' },
  { username: 'demo.accountant', password: 'Staff@1234', roles: [5], name: 'Kế toán demo' },
  { username: 'demo.sale', password: 'Staff@1234', roles: [2], name: 'Sale demo' },
  { username: 'demo.photographer', password: 'Staff@1234', roles: [3], name: 'Thợ chụp demo' },
];

function validateDemoUri(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Demo requires the dedicated local MongoDB URI.');
  }
  if (
    url.protocol !== 'mongodb:' ||
    !['127.0.0.1', 'localhost'].includes(url.hostname) ||
    url.port !== '27029' ||
    url.pathname !== '/studio_project_demo' ||
    url.username ||
    url.password ||
    url.searchParams.get('replicaSet') !== 'rs0' ||
    url.searchParams.get('directConnection') !== 'true'
  )
    throw new Error('Demo is restricted to localhost:27029/studio_project_demo on rs0.');
  return url.toString();
}

function loadModels() {
  const compiled = fs.existsSync(path.resolve(__dirname, '../backend/dist/models/User.js'));
  if (!compiled) {
    process.env.TS_NODE_PROJECT = path.resolve(__dirname, '../backend/tsconfig.json');
    backendRequire('ts-node/register/transpile-only');
  }
  const directory = compiled ? 'dist' : 'src';
  return Object.fromEntries(
    [
      'User',
      'CostumeType',
      'Costume',
      'Package',
      'Category',
      'Booking',
      'BookingWorkflow',
      'RentalOrder',
      'Schedule',
      'Transaction',
      'Feedback',
      'Customer',
      'Student',
      'AccountRequest',
    ].map((name) => [
      name,
      backendRequire(path.resolve(__dirname, `../backend/${directory}/models/${name}`)).default,
    ]),
  );
}

async function seedDemo(uri = DEMO_URI) {
  const safeUri = validateDemoUri(uri);
  const mongoose = backendRequire('mongoose');
  const models = loadModels();
  const counts = { created: 0, retained: 0 };
  await mongoose.connect(safeUri, { serverSelectionTimeoutMS: 5000 });
  try {
    if (
      mongoose.connection.name !== 'studio_project_demo' ||
      (await mongoose.connection.db.admin().command({ hello: 1 })).setName !== 'rs0'
    )
      throw new Error('The demo database or replica set does not match the expected target.');

    // Add the application indexes; do not remove existing indexes with syncIndexes().
    for (const model of Object.values(models)) await model.createIndexes();
    const ensure = async (name, filter, input) => {
      const id = createHash('sha256')
        .update(`${PROJECT}:v1:${name}:${JSON.stringify(filter)}`)
        .digest('hex')
        .slice(0, 24);
      // The stable ID also finds a record whose display name was edited in the UI.
      let record = await models[name].findOne({ $or: [filter, { _id: id }] });
      if (record) {
        counts.retained++;
        return record;
      }
      try {
        record = await models[name].create({ _id: id, ...input });
        counts.created++;
      } catch (error) {
        if (error.code !== 11000) throw error;
        record = await models[name].findOne({ $or: [filter, { _id: id }] });
        if (!record) throw error;
        counts.retained++;
      }
      return record;
    };
    const users = {};
    for (const account of ACCOUNTS) {
      const user = await ensure(
        'User',
        { username: account.username },
        { ...account, isActive: true },
      );
      users[account.username] = String(user._id);
    }

    const type = await ensure(
      'CostumeType',
      { name: 'Demo · Áo dài kỷ yếu' },
      {
        name: 'Demo · Áo dài kỷ yếu',
      },
    );
    const maleType = await ensure(
      'CostumeType',
      { name: 'Demo · Trang phục nam' },
      {
        name: 'Demo · Trang phục nam',
      },
    );
    const sharedCostume = await ensure(
      'Costume',
      { name: 'Demo · Áo dài trắng' },
      {
        name: 'Demo · Áo dài trắng',
        description: 'Trang phục mẫu cho chụp kỷ yếu và thuê; dữ liệu giả lập phục vụ đồ án.',
        gender: 'unisex',
        type: type._id,
        isRentalItem: true,
        rentalPrice: 150000,
        inventory: [
          { size: 'S', quantity: 6, condition: 'good' },
          { size: 'M', quantity: 10, condition: 'good' },
          { size: 'L', quantity: 8, condition: 'good' },
          { size: 'M', quantity: 1, condition: 'repair' },
        ],
      },
    );
    await ensure(
      'Costume',
      { name: 'Demo · Vest xanh navy' },
      {
        name: 'Demo · Vest xanh navy',
        gender: 'male',
        type: maleType._id,
        isRentalItem: true,
        rentalPrice: 200000,
        inventory: [
          { size: 'M', quantity: 5, condition: 'good' },
          { size: 'L', quantity: 5, condition: 'good' },
          { size: 'XL', quantity: 3, condition: 'good' },
        ],
      },
    );
    await ensure(
      'Costume',
      { name: 'Demo · Nón lá' },
      {
        name: 'Demo · Nón lá',
        gender: 'unisex',
        type: type._id,
        itemKind: 'accessory',
        isRentalItem: true,
        rentalPrice: 30000,
        inventory: [{ size: 'FREE', quantity: 15, condition: 'good' }],
      },
    );
    const pack = await ensure(
      'Package',
      { name: 'Demo · Kỷ yếu thanh xuân' },
      {
        name: 'Demo · Kỷ yếu thanh xuân',
        pricePerMember: 350000,
        duration: 'half_day',
        costumes: [type._id, maleType._id],
        crewRatio: '1 thợ / 15 thành viên',
        studentsPerCrew: 15,
        editingScope: 'full',
        deliveryDays: 7,
        description: 'Gói mẫu đồ án: chụp ngoại cảnh, trang phục và chỉnh màu toàn bộ ảnh.',
        isPopular: true,
      },
    );
    await ensure(
      'Package',
      { name: 'Demo · Kỷ yếu trọn ngày' },
      {
        name: 'Demo · Kỷ yếu trọn ngày',
        pricePerMember: 550000,
        duration: 'full_day',
        costumes: [type._id, maleType._id],
        editingScope: 'full',
        deliveryDays: 10,
        studentsPerCrew: 15,
        description: 'Gói mẫu đồ án: hai địa điểm, ảnh nhóm và chân dung cá nhân.',
      },
    );

    for (const [name, type] of [
      ['Đặt cọc', 'income'],
      ['Thanh toán còn lại', 'income'],
      ['Cọc thuê', 'income'],
      ['Thanh toán thuê', 'income'],
      ['Hoàn cọc thuê', 'expense'],
      ['Hoàn tiền', 'expense'],
      ['In ấn / Album', 'expense'],
      ['Nhân sự / Thợ chụp', 'expense'],
      ['Thiết bị / Vật tư', 'expense'],
      ['Khác', 'expense'],
    ])
      await ensure('Category', { name, type }, { name, type, isDefault: true });

    await mongoose.connection.db.collection('projectmetadata').updateOne(
      { _id: 'seed:v1' },
      {
        $setOnInsert: { project: PROJECT, createdAt: new Date(), schemaVersion: 1 },
        $set: {
          users,
          packageId: String(pack._id),
          costumeId: String(sharedCostume._id),
          lastSeedAt: new Date(),
        },
      },
      { upsert: true },
    );
    return { database: 'studio_project_demo', ...counts, users, packageId: String(pack._id) };
  } finally {
    await mongoose.disconnect();
  }
}

module.exports = { seedDemo, validateDemoUri, DEMO_URI, PROJECT, ACCOUNTS };
if (require.main === module)
  seedDemo(process.env.MONGO_DEMO_URI || DEMO_URI)
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch(() => {
      console.error('Demo seed failed. Verify the local rs0 daemon and application models.');
      process.exitCode = 1;
    });
