// Add demo photos only to empty galleries in the local Windows application DB.
// Run without --apply to inspect; reruns preserve packages that already have images.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const backendRequire = createRequire(path.resolve(__dirname, '../backend/package.json'));
const dotenv = backendRequire('dotenv');
const mongoose = backendRequire('mongoose');
const { validateNativeUri } = require('./mongodb-windows.cjs');
const root = path.resolve(__dirname, '..');

async function main() {
  if (process.argv.slice(2).some((arg) => arg !== '--apply')) {
    throw new Error('Usage: node ops/seed-package-images.cjs [--apply]');
  }
  const apply = process.argv.includes('--apply');
  const env = dotenv.parse(await fs.readFile(path.join(root, 'backend/.env')));
  const uri = validateNativeUri(env.MONGO_URI);
  process.env.UPLOAD_DIR = env.UPLOAD_DIR || '';
  process.env.TS_NODE_PROJECT = path.join(root, 'backend/tsconfig.json');
  backendRequire('ts-node/register/transpile-only');
  const Package = backendRequire(path.join(root, 'backend/src/models/Package')).default;
  const PackageDetail = backendRequire(path.join(root, 'backend/src/models/PackageDetail')).default;
  const { attachPackageDetails, savePackageDetails, packageDetailContent } = backendRequire(
    path.join(root, 'backend/src/services/packageDetails'),
  );
  const { storePackageImage, deletePackageImages } = backendRequire(
    path.join(root, 'backend/src/services/packageMedia'),
  );
  const samples = [
    { file: 'TNV03816.webp', alt: 'Áo dài trắng trong sân trường' },
    { file: 'PBI00061.webp', alt: 'Khoảnh khắc kỷ niệm bên bạn bè' },
    { file: 'PBI01850.webp', alt: 'Chân dung học sinh cùng đàn guitar' },
  ];
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    if (mongoose.connection.name !== 'studio_db') throw new Error('Unexpected target database.');
    const packages = await Package.find().sort({ pricePerMember: 1 }).lean();
    const report = [];
    for (const [index, record] of packages.entries()) {
      const pkg = await attachPackageDetails(record);
      if (pkg.details?.gallery?.length) {
        report.push({
          id: String(pkg._id),
          name: pkg.name,
          result: 'kept',
          images: pkg.details.gallery.length,
        });
        continue;
      }
      if (!apply) {
        report.push({ id: String(pkg._id), name: pkg.name, result: 'would-seed', images: 3 });
        continue;
      }
      const gallery = [];
      let writeAttempted = false;
      let committed = false;
      try {
        for (let offset = 0; offset < samples.length; offset++) {
          const sample = samples[(index + offset) % samples.length];
          const buffer = await fs.readFile(
            path.join(root, 'frontend/src/assets/images', sample.file),
          );
          const image = await storePackageImage({ buffer });
          gallery.push({
            ...image,
            alt: sample.alt,
            caption: 'Ảnh demo tham khảo từ portfolio Yume Studio.',
          });
        }
        const details = packageDetailContent(
          new PackageDetail({ package: pkg._id, ...pkg.details, gallery }).toObject(),
        );
        const version = pkg.detailsVersion || 0;
        writeAttempted = true;
        await savePackageDetails(pkg._id, version, details);
        committed = true;
        report.push({
          id: String(pkg._id),
          name: pkg.name,
          result: committed ? 'seeded' : 'concurrent-change-skipped',
          images: committed ? gallery.length : 0,
        });
      } catch (error) {
        if (error.status !== 409) throw error;
        report.push({
          id: String(pkg._id),
          name: pkg.name,
          result: 'concurrent-change-skipped',
          images: 0,
        });
      } finally {
        if (!committed && gallery.length) {
          let unused = gallery;
          if (writeAttempted) {
            try {
              const latest = await PackageDetail.findOne({ package: pkg._id })
                .select('gallery')
                .lean();
              unused = gallery.filter(
                (image) => !latest?.gallery?.some((saved) => saved.id === image.id),
              );
            } catch {
              // Keep uncertain files rather than remove images committed before a connection error.
              unused = [];
            }
          }
          await deletePackageImages(unused.map((image) => image.id));
        }
      }
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
  console.error(error.message);
  process.exitCode = 1;
});
