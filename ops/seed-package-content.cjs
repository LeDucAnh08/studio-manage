// Seed the three optional information sections in the local Windows demo DB.
// Dry run by default. Existing nonempty fields and all other package data are preserved.
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const backendRequire = createRequire(path.join(root, 'backend/package.json'));
const dotenv = backendRequire('dotenv');
const mongoose = backendRequire('mongoose');
const { validateNativeUri } = require('./mongodb-windows.cjs');

const samples = {
  'Kỷ yếu Sân trường': { photos: 10, hours: 4, concepts: 2, locations: '1 địa điểm: sân trường' },
  'Thanh xuân Ngoại cảnh': {
    photos: 15,
    hours: 6,
    concepts: 3,
    locations: '2 địa điểm: sân trường và một điểm ngoại cảnh',
  },
  'Dấu ấn Tốt nghiệp': {
    photos: 20,
    hours: 6,
    concepts: 3,
    locations: '2 địa điểm: sân trường và một điểm chụp tốt nghiệp',
  },
  'Miền nhớ Trọn ngày': {
    photos: 25,
    hours: 8,
    concepts: 4,
    locations: '3 địa điểm trong lịch trình đã thống nhất',
  },
  'Thanh xuân Signature': {
    photos: 30,
    hours: 10,
    concepts: 5,
    locations: '3 địa điểm theo concept riêng của lớp',
  },
};
const keys = ['deliverables', 'shootScope', 'pricingConditions'];

async function main() {
  if (process.argv.slice(2).some((arg) => arg !== '--apply')) {
    throw new Error('Usage: node ops/seed-package-content.cjs [--apply]');
  }
  const apply = process.argv.includes('--apply');
  const env = dotenv.parse(await fs.readFile(path.join(root, 'backend/.env')));
  process.env.TS_NODE_PROJECT = path.join(root, 'backend/tsconfig.json');
  backendRequire('ts-node/register/transpile-only');
  const Package = backendRequire(path.join(root, 'backend/src/models/Package')).default;
  const { readPackageContent } = backendRequire(
    path.join(root, 'backend/src/utils/packageContentInput'),
  );
  await mongoose.connect(validateNativeUri(env.MONGO_URI), { serverSelectionTimeoutMS: 5000 });
  try {
    assert.equal(mongoose.connection.name, 'studio_db');
    const packages = await Package.find().sort({ pricePerMember: 1 }).lean();
    const report = [];
    for (const pkg of packages) {
      const sample = samples[pkg.name];
      if (!sample) {
        report.push({ name: pkg.name, result: 'no-sample-skipped' });
        continue;
      }
      const content = {
        deliverables: [
          `Tối thiểu ${sample.photos} ảnh cá nhân đã chỉnh sửa/người, kèm bộ ảnh nhóm và tập thể của lớp.`,
          'Hậu kỳ toàn bộ ảnh đạt chất lượng; bàn giao file JPEG độ phân giải cao qua thư mục Google Drive riêng của lớp.',
          ...(pkg.deliveryDays
            ? [`Bàn giao trong tối đa ${pkg.deliveryDays} ngày sau buổi chụp.`]
            : []),
          'Ảnh gốc, video, ảnh in và album vật lý được báo giá riêng khi lớp có nhu cầu.',
        ].join('\n'),
        shootScope: [
          `Thời lượng tối đa ${sample.hours} giờ, gồm chuẩn bị và di chuyển giữa các điểm chụp.`,
          `Bao gồm ${sample.concepts} concept tại ${sample.locations}.`,
          'Chụp cá nhân, nhóm bạn và tập thể lớp; concept và lịch trình được thống nhất trước ngày chụp.',
          'Địa điểm hoặc thời gian ngoài phạm vi gói được studio tư vấn và báo giá trước khi thực hiện.',
        ].join('\n'),
        pricingConditions: [
          `Giá tham khảo ${pkg.pricePerMember.toLocaleString('vi-VN')} đ/người, áp dụng cho lớp từ 30 thành viên tại nội thành Hà Nội.`,
          'Lớp dưới 30 thành viên, chụp ngoại thành hoặc có yêu cầu riêng sẽ nhận báo giá theo thực tế.',
          'Vé vào địa điểm, phí thuê bối cảnh và phương tiện di chuyển chưa bao gồm trong giá/người.',
          'Thuế (nếu có), ưu đãi và phụ phí được thể hiện trong báo giá cuối cùng; studio xác nhận với lớp trước khi đặt cọc.',
        ].join('\n'),
      };
      const missing = keys.filter((key) => !pkg.details?.[key]?.trim());
      if (!apply || !missing.length) {
        report.push({
          name: pkg.name,
          result: missing.length ? 'would-seed' : 'kept',
          fields: missing,
        });
        continue;
      }
      // Reuse the API validator before touching data. Existing galleries are left untouched.
      readPackageContent({ version: 0, details: content }, 0);
      const version = pkg.detailsVersion || 0;
      const versionFilter =
        version === 0
          ? { $or: [{ detailsVersion: 0 }, { detailsVersion: { $exists: false } }] }
          : { detailsVersion: version };
      const updates = Object.fromEntries(missing.map((key) => [`details.${key}`, content[key]]));
      if (!pkg.details) {
        updates.details = new Package({ details: content }).details.toObject();
        for (const key of missing) delete updates[`details.${key}`];
      }
      const result = await Package.updateOne(
        { _id: pkg._id, ...versionFilter },
        { $set: updates, $inc: { detailsVersion: 1 } },
        { runValidators: true },
      );
      if (result.modifiedCount === 1) {
        const saved = await Package.findById(pkg._id).lean();
        for (const key of keys)
          assert.equal(saved.details[key], missing.includes(key) ? content[key] : pkg.details[key]);
        const unchanged = (item) => {
          const copy = JSON.parse(JSON.stringify(item));
          for (const key of keys) delete copy.details?.[key];
          delete copy.detailsVersion;
          delete copy.updatedAt;
          return copy;
        };
        if (pkg.details) assert.deepEqual(unchanged(saved), unchanged(pkg));
      }
      report.push({
        name: pkg.name,
        result: result.modifiedCount === 1 ? 'seeded' : 'concurrent-change-skipped',
        fields: missing,
      });
    }
    console.log(
      JSON.stringify(
        { mode: apply ? 'apply' : 'check', database: 'studio_db', packages: report },
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
      ? `Local database operation failed (${error.code || error.name}).`
      : error.message,
  );
  process.exitCode = 1;
});
