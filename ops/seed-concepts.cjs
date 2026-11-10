// Explicit sandbox seed; never reads the production MONGO_URI or resets a database.
const path = require('node:path');
const assert = require('node:assert/strict');
process.env.TS_NODE_PROJECT = path.join(__dirname, '../backend/tsconfig.json');
require('ts-node/register/transpile-only');
const mongoose = require('mongoose');
async function main() {
  const uri = new URL(process.env.CONCEPT_DEMO_URI || '');
  assert.equal(uri.protocol, 'mongodb:');
  assert.ok(['127.0.0.1', 'localhost'].includes(uri.hostname));
  const database = decodeURIComponent(uri.pathname.slice(1));
  assert.match(database, /^studio_sepay_concept_[a-z0-9_]+$/);
  const password = process.env.CONCEPT_DEMO_PASSWORD;
  assert.ok(
    password && password.length >= 12,
    'Set CONCEPT_DEMO_PASSWORD (12+ characters) for the sandbox accounts.',
  );
  await mongoose.connect(uri.toString());
  assert.equal(mongoose.connection.name, database);
  try {
    const User = require('../backend/src/models/User').default,
      Concept = require('../backend/src/models/Concept').default,
      Package = require('../backend/src/models/ConceptPackage').default,
      Profile = require('../backend/src/models/PhotographerProfile').default;
    const users = {};
    for (const [name, role, label] of [
      ['concept-admin', 0, 'Điều phối'],
      ['concept-client', 6, 'Khách concept'],
      ['concept-photographer', 3, 'Nguyễn An'],
    ]) {
      users[name] = await User.findOne({ username: name });
      if (!users[name])
        users[name] = await User.create({
          username: name,
          name: label,
          password,
          roles: [role],
          isActive: true,
          email: name + '@example.test',
          emailVerifiedAt: new Date(),
        });
    }
    for (const [name, description, packageName, price, quota] of [
      [
        'Chân dung cá nhân',
        'Một buổi chụp chân dung nhẹ nhàng, ánh sáng tự nhiên.',
        'Chân dung 60 phút',
        1200000,
        10,
      ],
      [
        'Gia đình',
        'Lưu giữ khoảnh khắc bên những người thân yêu.',
        'Gia đình 90 phút',
        2400000,
        20,
      ],
    ]) {
      const concept = await Concept.findOneAndUpdate(
        { name },
        { $setOnInsert: { name, description, active: true } },
        { upsert: true, new: true },
      );
      await Package.updateOne(
        { concept: concept._id, name: packageName },
        {
          $setOnInsert: {
            concept: concept._id,
            name: packageName,
            price,
            durationMinutes: quota === 10 ? 60 : 90,
            maxPeople: quota === 10 ? 2 : 6,
            retouchQuota: quota,
            extraPhotoPrice: 70000,
            costumeCount: 0,
            costumeTypes: [],
            active: true,
          },
        },
        { upsert: true },
      );
    }
    const concepts = await Concept.find({ name: { $in: ['Chân dung cá nhân', 'Gia đình'] } });
    await Profile.updateOne(
      { photographer: users['concept-photographer']._id },
      {
        $setOnInsert: {
          photographer: users['concept-photographer']._id,
          concepts: concepts.map((c) => c._id),
          bio: 'Chân dung và gia đình với phong cách tự nhiên.',
          published: true,
          portfolio: [],
        },
      },
      { upsert: true },
    );
    console.log(
      'Seeded isolated concept catalog and accounts; existing entries preserved. No orders, payments or emails created.',
    );
  } finally {
    await mongoose.disconnect();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
