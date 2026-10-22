// Fictional presentation data only. Existing rental contracts and stock are never rewritten.
const path = require('node:path');
const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const r = require('node:module').createRequire(path.resolve(__dirname, '../backend/package.json'));
const { MongoClient, ObjectId, BSON } = r('mongodb');
const { DEMO_URI, PROJECT, validateDemoUri } = require('./seed-demo.cjs');
const { CATALOG_PRESENTATION } = require('./fixtures/rental-catalog-presentation.cjs');
const MARKER = 'rental-catalog-presentation:v1';
const ids = () => CATALOG_PRESENTATION.map((row) => new ObjectId(row.id));

function planChanges(records) {
  const byId = new Map(records.map((record) => [String(record._id), record]));
  return CATALOG_PRESENTATION.flatMap((row) => {
    const before = byId.get(row.id);
    if (
      !before ||
      before.isRentalItem !== true ||
      ![row.previousName, row.name].includes(before.name)
    )
      throw new Error(`Missing or changed demo product: ${row.key}. No update applied.`);
    if (before.rentalDailyPrice != null && before.rentalDailyPrice !== row.rentalDailyPrice)
      throw new Error(`Daily price already configured: ${row.key}. No update applied.`);
    const after = {
      name: row.name,
      description: row.description,
      rentalDailyPrice: row.rentalDailyPrice,
    };
    if (
      !Number.isSafeInteger(after.rentalDailyPrice) ||
      after.rentalDailyPrice <= 0 ||
      !after.name ||
      after.name.length > 120 ||
      !after.description ||
      after.description.length > 2000
    )
      throw new Error(`Invalid presentation data: ${row.key}.`);
    return Object.entries(after).some(([key, value]) => before[key] !== value)
      ? [{ id: row.id, before, after }]
      : [];
  });
}

async function patchCatalog(
  db,
  { apply = false, backupDir = path.resolve(__dirname, '../.workflow-tools') } = {},
) {
  if (!['studio_project_demo', 'studio_catalog_presentation_audit'].includes(db.databaseName))
    throw new Error('This update is restricted to the local demo or its isolated test database.');
  const metadata = db.collection('projectmetadata');
  const assertProject = async (session) => {
    if ((await metadata.findOne({ _id: 'seed:v1' }, { session }))?.project !== PROJECT)
      throw new Error('Demo project marker is missing. No update applied.');
  };
  await assertProject();
  if (await metadata.findOne({ _id: MARKER })) return { status: 'already-applied', changed: 0 };
  const costumes = db.collection('costumes');
  const before = await costumes
    .find({ _id: { $in: ids() } })
    .sort({ _id: 1 })
    .toArray();
  const changes = planChanges(before);
  const products = changes.map(({ id, after }) => ({ id, ...after }));
  if (!apply) return { status: 'dry-run', changed: changes.length, products };

  await fs.mkdir(backupDir, { recursive: true });
  const backup = path.join(
    backupDir,
    `catalog-presentation-before-${Date.now()}-${randomUUID()}.json`,
  );
  await fs.writeFile(
    backup,
    BSON.EJSON.stringify({ project: PROJECT, marker: MARKER, products: before }, null, 2),
    { encoding: 'utf8', flag: 'wx', mode: 0o600 },
  );
  const session = db.client.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      await db
        .collection('resourcelocks')
        .updateOne(
          { _id: 'studio-resources' },
          { $inc: { version: 1 } },
          { upsert: true, session },
        );
      await assertProject(session);
      if (await metadata.findOne({ _id: MARKER }, { session })) {
        result = { status: 'already-applied', changed: 0 };
        return;
      }
      const current = await costumes
        .find({ _id: { $in: ids() } }, { session })
        .sort({ _id: 1 })
        .toArray();
      if (BSON.EJSON.stringify(current) !== BSON.EJSON.stringify(before))
        throw new Error('Catalog changed after preflight. No update applied; run dry-run again.');
      for (const { id, after } of changes)
        await costumes.updateOne({ _id: new ObjectId(id) }, { $set: after }, { session });
      await metadata.insertOne(
        {
          _id: MARKER,
          project: PROJECT,
          appliedAt: new Date(),
          productIds: ids(),
          changed: changes.length,
        },
        { session },
      );
      result = { status: 'applied', changed: changes.length, backup, products };
    });
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = { planChanges, patchCatalog };
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args.length === 1 && args[0] !== '--apply'))
      throw new Error('Usage: node ops/update-demo-catalog.cjs [--apply] (defaults to dry-run).');
    const client = new MongoClient(validateDemoUri(process.env.MONGO_URI || DEMO_URI), {
      serverSelectionTimeoutMS: 5000,
    });
    try {
      await client.connect();
      const db = client.db();
      if (
        db.databaseName !== 'studio_project_demo' ||
        (await db.admin().command({ hello: 1 })).setName !== 'rs0'
      )
        throw new Error('Expected the dedicated demo database on rs0.');
      console.log(
        JSON.stringify(await patchCatalog(db, { apply: args[0] === '--apply' }), null, 2),
      );
    } finally {
      await client.close();
    }
  })().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
