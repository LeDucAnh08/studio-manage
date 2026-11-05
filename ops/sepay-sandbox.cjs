// Local end-to-end simulator. Never connects simulated money to studio_db.
const fs = require('node:fs');
const path = require('node:path');
const { createHash, createHmac, randomBytes } = require('node:crypto');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const r = require('node:module').createRequire(path.join(root, 'backend/package.json'));
const saved = r('dotenv').parse(fs.readFileSync(path.join(root, 'backend/.env')));
require('./mongodb-windows.cjs').validateNativeUri(saved.MONGO_URI);
const database = 'studio_sepay_sandbox';
const uri = new URL(saved.MONGO_URI);
uri.pathname = `/${database}`;
// Vite denies .env* files, including through /@fs workspace URLs.
const file = path.join(root, '.workflow-tools/.env.sepay-sandbox');
const legacyFile = path.join(root, '.workflow-tools/sepay-sandbox.json');
if (!fs.existsSync(file) && fs.existsSync(legacyFile)) fs.renameSync(legacyFile, file);
fs.mkdirSync(path.dirname(file), { recursive: true });
if (!fs.existsSync(file))
  fs.writeFileSync(
    file,
    JSON.stringify({
      webhookSecret: randomBytes(32).toString('hex'),
      jwtSecret: randomBytes(32).toString('hex'),
    }),
  );
const profile = JSON.parse(fs.readFileSync(file, 'utf8'));
const env = {
  ...process.env,
  MONGO_URI: uri.toString(),
  JWT_SECRET: profile.jwtSecret,
  TS_NODE_PROJECT: path.join(root, 'backend/tsconfig.json'),
  CLIENT_PORTAL_ENABLED: 'true',
  CLIENT_WORKFLOW_ENABLED: 'true',
  SEPAY_ENABLED: 'true',
  SEPAY_MODE: 'sandbox',
  SEPAY_SANDBOX_DATABASE: database,
  SEPAY_WEBHOOK_SECRET: profile.webhookSecret,
  PAYMENT_BANK_CODE: 'MBBank',
  SEPAY_BANK_GATEWAY: 'MBBank',
  PAYMENT_BANK_NAME: 'MBBank (mô phỏng)',
  PAYMENT_ACCOUNT_NAME: 'YUME SANDBOX',
  PAYMENT_ACCOUNT_NUMBER: 'SBSTUDIO001',
  PORT: '5013',
  NODE_ENV: 'development',
  CORS_ORIGIN: 'http://127.0.0.1:4013',
  GAS_WEBHOOK_URL: '',
  GAS_WEBHOOK_SECRET: '',
  TELEGRAM_BOT_TOKEN: '',
};
Object.assign(process.env, env);
r('ts-node/register/transpile-only');
const mongoose = r('mongoose');
const model = (name) => r(path.join(root, 'backend/src/models', name)).default;
const Booking = model('Booking'),
  Workflow = model('BookingWorkflow'),
  User = model('User'),
  Package = model('Package'),
  Receipt = model('SePayReceipt');
const { readPackageAgreement } = r(path.join(root, 'backend/src/services/packageBooking'));
const { approvePackageBooking, executeWorkflowAction } = r(
  path.join(root, 'backend/src/controllers/workflowController'),
);
const { depositPaymentDto } = r(path.join(root, 'backend/src/services/depositPayment'));
const id = (key) =>
  new mongoose.Types.ObjectId(
    createHash('sha256').update(`sepay-sandbox-v1:${key}`).digest('hex').slice(0, 24),
  );

async function seed() {
  const source = mongoose.connection.client.db('studio_db');
  const users = await source
    .collection('users')
    .find({ isActive: true, $or: [{ username: 'mango' }, { roles: { $in: [0, 1, 3, 5] } }] })
    .project({ _id: 1, username: 1, name: 1, roles: 1, password: 1, isActive: 1 })
    .toArray();
  const client = users.find((user) => user.username === 'mango');
  const admin = users.find((user) => user.roles.some((role) => role === 0 || role === 1));
  const photos = users.filter((user) => user.roles.includes(3)).slice(0, 2);
  assert.ok(
    client && admin && photos.length === 2,
    'Need existing mango, admin and two active photographers',
  );
  // Copy password hashes unchanged so users can use their existing login in the
  // separate sandbox. No profile, Telegram or other private account fields copied.
  for (const user of users)
    await User.collection.updateOne({ _id: user._id }, { $setOnInsert: user }, { upsert: true });
  let pkg = await Package.findById(id('package'));
  if (!pkg)
    pkg = await Package.create({
      _id: id('package'),
      name: '[Sandbox] Gói chụp thử QR',
      pricePerMember: 300000,
      depositPercent: 30,
      depositHoldHours: 24,
      studentsPerCrew: 15,
      deliveryDays: 5,
      duration: 'half_day',
      costumes: [],
    });
  const results = [];
  for (const [index, stage] of ['pending', 'awaiting'].entries()) {
    let booking = await Booking.findById(id(stage));
    if (!booking) {
      const day = new Date(Date.now() + (30 + index * 3) * 86400000).toISOString().slice(0, 10);
      const start = new Date(`${day}T08:00:00+07:00`),
        end = new Date(`${day}T12:00:00+07:00`);
      const agreement = readPackageAgreement(
        {
          accepted: true,
          pricePerMember: pkg.pricePerMember,
          depositPercent: pkg.depositPercent,
          holdHours: pkg.depositHoldHours,
          detailsVersion: pkg.detailsVersion,
          updatedAt: pkg.updatedAt.toISOString(),
        },
        pkg,
        25,
        start,
        end,
      );
      booking = await Booking.create({
        _id: id(stage),
        client: client._id,
        clientRequestId: `sepay-sandbox-${stage}`,
        package: pkg._id,
        packageName: pkg.name,
        pricePerMember: pkg.pricePerMember,
        packageSnapshot: {
          name: pkg.name,
          pricePerMember: pkg.pricePerMember,
          costumeIds: [],
          studentsPerCrew: 15,
          deliveryDays: 5,
          duration: 'half_day',
        },
        packageAgreement: agreement,
        members: 25,
        students: Array.from({ length: 25 }, (_, row) => ({
          name: `Học sinh mẫu ${row + 1}`,
          contact: `0909${String(row + 1).padStart(6, '0')}`,
          height: 155 + row,
          weight: 45 + row,
          pantsSize: String(27 + (row % 6)),
          shirtSize: 'M',
        })),
        className: `[Mẫu mango] QR ${stage === 'pending' ? 'chờ studio duyệt' : 'chờ tiền cọc'}`,
        school: 'Trường sandbox Yume',
        contactName: client.name,
        phone: '0901234567',
        startAt: start,
        endAt: end,
        location: 'Studio thử nghiệm',
        note: 'Mô phỏng nội bộ; không nhận tiền thật.',
        status: 'pending',
      });
      let response;
      await executeWorkflowAction(
        {
          user: admin,
          params: { id: String(booking._id) },
          body: {
            action: 'photographer.assign',
            expectedVersion: 0,
            photographerIds: photos.map((user) => String(user._id)),
          },
          get: () => `sandbox-assign-${stage}`,
        },
        {
          status(code) {
            this.code = code;
            return this;
          },
          json(body) {
            response = { code: this.code, body };
          },
        },
      );
      assert.equal(response.code, 200, JSON.stringify(response.body));
      if (stage === 'awaiting')
        await approvePackageBooking(
          String(booking._id),
          admin,
          'Duyệt sandbox để mô phỏng tiền cọc.',
        );
    }
    booking = await Booking.findById(booking._id);
    const workflow = await Workflow.findOne({ booking: booking._id });
    results.push({
      bookingId: String(booking._id),
      className: booking.className,
      lifecycle: workflow.lifecycle,
      payment: depositPaymentDto(booking, workflow),
    });
  }
  return results;
}

async function main() {
  const command = process.argv[2] || 'seed';
  if (!['seed', 'serve', 'pay', 'status'].includes(command))
    throw new Error(
      'Usage: node ops/sepay-sandbox.cjs seed | serve | status | pay BOOKING_ID [AMOUNT]',
    );
  await mongoose.connect(uri.toString(), { autoIndex: false });
  assert.equal(mongoose.connection.name, database);
  try {
    if (command === 'seed' || command === 'serve')
      await Promise.all([Receipt.createIndexes(), Workflow.createIndexes()]);
    if (command === 'pay') {
      assert.ok(mongoose.isValidObjectId(process.argv[3]), 'Provide a sandbox booking ID');
      const booking = await Booking.findById(process.argv[3]),
        workflow = await Workflow.findOne({ booking: process.argv[3] });
      assert.ok(booking && workflow?.depositPayment?.mode === 'sandbox', 'Sandbox QR not found');
      const payment = depositPaymentDto(booking, workflow);
      assert.equal(payment.status, 'pending', 'Only an active sandbox QR can be paid');
      const amount = process.argv[4] === undefined ? payment.amount : Number(process.argv[4]);
      assert.ok(Number.isSafeInteger(amount) && amount > 0, 'Amount must be a positive integer');
      const transactionId = Date.now(),
        timestamp = String(Math.floor(Date.now() / 1000));
      const body = JSON.stringify({
        id: transactionId,
        gateway: 'MBBank',
        accountNumber: env.PAYMENT_ACCOUNT_NUMBER,
        code: payment.reference,
        content: payment.reference,
        transferType: 'in',
        transferAmount: amount,
        transactionDate: new Date(Date.now() + 7 * 3600000)
          .toISOString()
          .slice(0, 19)
          .replace('T', ' '),
        referenceCode: `LOCAL-SANDBOX-${transactionId}`,
      });
      const signature = `sha256=${createHmac('sha256', profile.webhookSecret).update(`${timestamp}.${body}`).digest('hex')}`;
      const result = await fetch('http://127.0.0.1:5013/api/payments/sepay/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SePay-Signature': signature,
          'X-SePay-Timestamp': timestamp,
        },
        body,
      });
      assert.equal(result.status, 200, await result.text());
      console.log(
        JSON.stringify({
          simulation: 'local-signed-webhook',
          bookingId: String(booking._id),
          lifecycle: (await Workflow.findById(workflow._id)).lifecycle,
          transferred: amount,
        }),
      );
    } else if (command === 'status') {
      const rows = await Booking.find({ _id: { $in: [id('pending'), id('awaiting')] } }).lean();
      const orders = [];
      for (const booking of rows) {
        const workflow = await Workflow.findOne({ booking: booking._id });
        orders.push({
          bookingId: String(booking._id),
          lifecycle: workflow?.lifecycle,
          payment: workflow ? depositPaymentDto(booking, workflow) : null,
        });
      }
      console.log(
        JSON.stringify({ simulation: 'local-only-not-provider-bank', database, orders }, null, 2),
      );
    } else
      console.log(
        JSON.stringify(
          {
            simulation: 'local-only-not-provider-bank',
            database,
            orders: await seed(),
            frontend: 'http://127.0.0.1:4013',
            sameLoginAsLocal: true,
          },
          null,
          2,
        ),
      );
  } finally {
    await mongoose.disconnect();
  }
  if (command === 'serve') {
    const children = [
      spawn(
        process.execPath,
        ['-r', r.resolve('ts-node/register/transpile-only'), path.join(root, 'backend/src/app.ts')],
        { cwd: path.join(root, 'backend'), env, stdio: 'inherit', windowsHide: true },
      ),
      spawn(
        process.execPath,
        [
          path.join(root, 'node_modules/vite/bin/vite.js'),
          '--host',
          '127.0.0.1',
          '--port',
          '4013',
          '--strictPort',
        ],
        {
          cwd: path.join(root, 'frontend'),
          env: {
            ...env,
            VITE_API_URL: 'http://127.0.0.1:5013/api',
            VITE_CLIENT_PORTAL_ENABLED: 'true',
          },
          stdio: 'inherit',
          windowsHide: true,
        },
      ),
    ];
    const stop = () => {
      for (const child of children) child.kill();
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
    for (const child of children) {
      child.on('error', (error) => {
        console.error(error.name);
        stop();
        process.exitCode = 1;
      });
      child.on('exit', stop);
    }
  }
}
main().catch((error) => {
  console.error(
    error.name?.startsWith('Mongo') ? 'Sandbox database operation failed' : error.message,
  );
  process.exitCode = 1;
});
