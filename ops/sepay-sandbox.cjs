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
  SEPAY_DEMO_UI: 'true',
  SEPAY_SANDBOX_DATABASE: database,
  SEPAY_WEBHOOK_SECRET: profile.webhookSecret,
  PAYMENT_BANK_CODE: 'MBBank',
  SEPAY_BANK_GATEWAY: 'MBBank',
  PAYMENT_BANK_NAME: 'MBBank',
  PAYMENT_ACCOUNT_NAME: 'YUME STUDIO',
  PAYMENT_ACCOUNT_NUMBER: 'SBSTUDIO001',
  PORT: '5013',
  NODE_ENV: 'development',
  RENTAL_HOLD_MINUTES: '120',
  CORS_ORIGIN: 'http://localhost:4001',
  GAS_WEBHOOK_URL: '',
  GAS_WEBHOOK_SECRET: '',
  TELEGRAM_BOT_TOKEN: '',
  EMAIL_ENABLED: 'true',
  EMAIL_MODE: 'test',
  EMAIL_FROM: 'Yume Sandbox <notifications@example.test>',
  EMAIL_PUBLIC_URL: 'http://localhost:4001',
  RESEND_API_KEY: '',
};
Object.assign(process.env, env);
r('ts-node/register/transpile-only');
const mongoose = r('mongoose');
const model = (name) => r(path.join(root, 'backend/src/models', name)).default;
const Booking = model('Booking'),
  Rental = model('RentalOrder'),
  Costume = model('Costume'),
  Workflow = model('BookingWorkflow'),
  User = model('User'),
  Package = model('Package'),
  Receipt = model('SePayReceipt');
const { readPackageAgreement } = r(path.join(root, 'backend/src/services/packageBooking'));
const { approvePackageBooking, executeWorkflowAction } = r(
  path.join(root, 'backend/src/controllers/workflowController'),
);
const { depositPaymentDto } = r(path.join(root, 'backend/src/services/depositPayment'));
const { rentalPaymentDto } = r(path.join(root, 'backend/src/services/rentalCheckout'));
const { createRental } = r(path.join(root, 'backend/src/controllers/rentalController'));
const { rentalPolicy } = r(path.join(root, 'backend/src/services/rentalPolicy'));
const id = (key) =>
  new mongoose.Types.ObjectId(
    createHash('sha256').update(`sepay-sandbox-v1:${key}`).digest('hex').slice(0, 24),
  );

const studentNames = [
  'Nguyễn Minh Anh',
  'Trần Hoàng Nam',
  'Lê Ngọc Linh',
  'Phạm Gia Hân',
  'Hoàng Tuấn Anh',
  'Vũ Khánh Linh',
  'Đặng Đức Minh',
  'Bùi Phương Thảo',
  'Đỗ Hải Đăng',
  'Hồ Mai Chi',
  'Ngô Quang Huy',
  'Dương Ngọc Anh',
  'Lý Minh Khang',
  'Đinh Thu Hà',
  'Phan Bảo Ngọc',
  'Trịnh Quốc Bảo',
  'Mai Thanh Tâm',
  'Tạ Hương Giang',
  'Đào Nhật Minh',
  'Cao Thùy Dương',
  'Lâm Anh Tuấn',
  'Tô Yến Nhi',
  'Võ Gia Bảo',
  'Hà Diệu Linh',
  'Nguyễn Đức Anh',
];

// Exact known fixture text only; never rewrite payment references, amounts or safety labels.
function displayTextUpdates(record) {
  const updates = {};
  const replacements = {
    'Trường sandbox Yume': 'THPT Nguyễn Trãi',
    'Studio thử nghiệm': 'Yume Studio',
    'Studio sandbox': 'Yume Studio',
    'Mô phỏng nội bộ; không nhận tiền thật.': '',
    'Kiểm thử browser sandbox': '',
    'Duyệt sandbox để mô phỏng tiền cọc.': 'Đã xác nhận thông tin đặt chụp.',
    'Duyệt kiểm thử sandbox': 'Đã xác nhận thông tin đặt chụp.',
    'Duyệt kiểm thử thông báo email': 'Đã xác nhận thông tin đặt chụp.',
    'Duyệt để kiểm thử album riêng tư': 'Đã xác nhận thông tin đặt chụp.',
  };
  const walk = (value, prefix = '') => {
    if (
      !value ||
      typeof value !== 'object' ||
      value instanceof Date ||
      value instanceof mongoose.Types.ObjectId
    )
      return;
    for (const [key, original] of Object.entries(value)) {
      const field = prefix ? `${prefix}.${key}` : key;
      if (typeof original !== 'string') {
        walk(original, field);
        continue;
      }
      if (
        ![
          'name',
          'label',
          'className',
          'school',
          'location',
          'note',
          'reviewNote',
          'message',
          'packageName',
        ].includes(key)
      )
        continue;
      let text = replacements[original] ?? original;
      text = text.replaceAll('[Sandbox] Gói chụp thử QR', 'Gói chụp kỷ yếu');
      if (key === 'className' && /^\[(Mẫu mango|Sandbox)\]/.test(text))
        text = /chờ studio duyệt/.test(text)
          ? '12A1'
          : /chờ tiền cọc/.test(text)
            ? '12A2'
            : /Album/.test(text)
              ? '12A3'
              : '12A4';
      if (key === 'name' && /^Học sinh mẫu \d+$/.test(text))
        text = studentNames[(Number(text.match(/\d+$/)[0]) - 1) % studentNames.length];
      if (text !== original) updates[field] = text;
    }
  };
  walk(record);
  return updates;
}

async function seed() {
  for (const model of [Rental, Workflow]) {
    await model.updateMany(
      { 'depositPayment.mode': 'sandbox', 'depositPayment.bankName': 'MBBank (mô phỏng)' },
      { $set: { 'depositPayment.bankName': 'MBBank' } },
    );
    await model.updateMany(
      { 'depositPayment.mode': 'sandbox', 'depositPayment.accountName': 'YUME SANDBOX' },
      { $set: { 'depositPayment.accountName': 'YUME STUDIO' } },
    );
  }
  await Workflow.updateMany(
    { 'depositPayment.mode': 'sandbox', 'quote.paymentInstructions.bankName': 'MBBank (mô phỏng)' },
    { $set: { 'quote.paymentInstructions.bankName': 'MBBank' } },
  );
  await Workflow.updateMany(
    { 'depositPayment.mode': 'sandbox', 'quote.paymentInstructions.accountName': 'YUME SANDBOX' },
    { $set: { 'quote.paymentInstructions.accountName': 'YUME STUDIO' } },
  );
  await Costume.updateOne(
    { _id: id('rental-costume') },
    {
      $setOnInsert: {
        name: 'Áo dài trắng',
        gender: 'unisex',
        itemKind: 'clothing',
        isRentalItem: true,
        rentalDailyPrice: 50000,
        rentalSecurityDeposit: 100000,
        inventory: [
          { size: 'M', quantity: 3, condition: 'good' },
          { size: 'L', quantity: 3, condition: 'good' },
        ],
      },
    },
    { upsert: true },
  );
  // Only normalize this fixture's visible text; preserve prices, stock and workflow history.
  await Costume.updateOne(
    { _id: id('rental-costume'), name: '[Sandbox] Áo dài thuê tự động' },
    { $set: { name: 'Áo dài trắng' } },
  );
  const rentals = await Rental.find({ 'requestedLines.costumeId': id('rental-costume') });
  for (const rental of rentals) {
    let changed = false;
    const lines = [
      rental.requestedLines,
      rental.quote?.lines,
      ...rental.quoteHistory.map((quote) => quote.lines),
    ];
    for (const group of lines)
      for (const line of group || [])
        if (
          String(line.costumeId) === String(id('rental-costume')) &&
          line.name === '[Sandbox] Áo dài thuê tự động'
        ) {
          line.name = 'Áo dài trắng';
          changed = true;
        }
    if (rental.note === '[Demo] Đơn mango sẵn sàng bấm Thanh toán thử trên web.') {
      rental.note = '';
      changed = true;
    }
    if (changed) await rental.save();
  }
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
      name: 'Gói chụp kỷ yếu',
      pricePerMember: 300000,
      depositPercent: 30,
      depositHoldHours: 24,
      studentsPerCrew: 15,
      deliveryDays: 5,
      duration: 'half_day',
      costumes: [],
    });
  if (pkg.name === '[Sandbox] Gói chụp thử QR') {
    pkg.name = 'Gói chụp kỷ yếu';
    await pkg.save();
  }
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
          name: studentNames[row % studentNames.length],
          contact: `0909${String(row + 1).padStart(6, '0')}`,
          height: 155 + row,
          weight: 45 + row,
          pantsSize: String(27 + (row % 6)),
          shirtSize: 'M',
        })),
        className: stage === 'pending' ? '12A1' : '12A2',
        school: 'THPT Nguyễn Trãi',
        contactName: client.name,
        phone: '0901234567',
        startAt: start,
        endAt: end,
        location: 'Yume Studio',
        note: '',
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
        await approvePackageBooking(String(booking._id), admin, 'Đã xác nhận thông tin đặt chụp.');
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
  const fixtures = await Booking.find({
    $or: [{ package: id('package') }, { className: /^\[(Mẫu mango|Sandbox)\]/ }],
  }).lean();
  for (const booking of fixtures) {
    const updates = displayTextUpdates(booking);
    if (Object.keys(updates).length)
      await Booking.collection.updateOne({ _id: booking._id }, { $set: updates });
    const workflow = await Workflow.findOne({ booking: booking._id }).lean();
    const workflowUpdates = displayTextUpdates(workflow);
    if (workflow && Object.keys(workflowUpdates).length)
      await Workflow.collection.updateOne({ _id: workflow._id }, { $set: workflowUpdates });
  }
  return results;
}

async function seedPendingRentals() {
  const client = await User.findOne({ username: 'mango', isActive: true });
  assert.ok(client?.roles.includes(6), 'Need the existing mango customer');
  const policy = rentalPolicy();
  const filter = {
    client: client._id,
    autoCheckout: true,
    status: 'awaiting_deposit',
    'reservation.status': 'held',
    'reservation.expiresAt': { $gt: new Date() },
  };
  const existing = await Rental.countDocuments(filter);
  for (let index = existing; index < Math.min(2, policy.maxPending); index++) {
    const receive = new Date(Date.now() + (3 + index * 3) * 86400000 + 7 * 3600000);
    const returned = new Date(+receive + 86400000);
    let response;
    await createRental(
      {
        user: client,
        body: {
          contactName: client.name,
          phone: '0901234567',
          note: '',
          receiveDate: receive.toISOString().slice(0, 10),
          returnDate: returned.toISOString().slice(0, 10),
          termsAccepted: true,
          policyVersion: policy.version,
          lines: [
            {
              costumeId: String(id('rental-costume')),
              size: index ? 'L' : 'M',
              quantity: index + 1,
            },
          ],
        },
        get: () => `sandbox-rental-${randomBytes(16).toString('hex')}`,
      },
      {
        status(code) {
          this.code = code;
          return this;
        },
        json(body) {
          response = { status: this.code, body };
        },
      },
    );
    assert.equal(response.status, 201, response.body.message);
    assert.equal(response.body.data.status, 'awaiting_deposit');
    assert.equal(response.body.data.depositPayment?.status, 'pending');
    assert.equal(response.body.data.depositPayment?.demoSimulation, true);
  }
  const rentals = await Rental.find(filter).select('+depositPayment').lean();
  return rentals.map((rental) => ({
    rentalId: String(rental._id),
    amount: rental.quote.deposit,
    expiresAt: rental.reservation.expiresAt,
    url: `http://localhost:4001/account/rentals/${rental._id}`,
  }));
}

async function main() {
  const command = process.argv[2] || 'seed';
  if (!['seed', 'serve', 'pay', 'pay-rental', 'status'].includes(command))
    throw new Error(
      'Usage: node ops/sepay-sandbox.cjs seed | serve | status | pay BOOKING_ID [AMOUNT] | pay-rental RENTAL_ID [AMOUNT]',
    );
  await mongoose.connect(uri.toString(), { autoIndex: false });
  assert.equal(mongoose.connection.name, database);
  try {
    if (command === 'seed' || command === 'serve')
      await Promise.all([
        Receipt.createIndexes(),
        Workflow.createIndexes(),
        Rental.createIndexes(),
      ]);
    if (command === 'pay' || command === 'pay-rental') {
      const isRental = command === 'pay-rental';
      assert.ok(mongoose.isValidObjectId(process.argv[3]), 'Provide a sandbox booking ID');
      const rental = isRental
        ? await Rental.findById(process.argv[3]).select('+depositPayment')
        : null;
      const booking = isRental ? null : await Booking.findById(process.argv[3]),
        workflow = isRental ? null : await Workflow.findOne({ booking: process.argv[3] });
      assert.ok(
        isRental
          ? rental?.depositPayment?.mode === 'sandbox'
          : booking && workflow?.depositPayment?.mode === 'sandbox',
        'Sandbox QR not found',
      );
      const payment = isRental ? rentalPaymentDto(rental) : depositPaymentDto(booking, workflow);
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
          ...(isRental
            ? { rentalId: String(rental._id), status: (await Rental.findById(rental._id)).status }
            : {
                bookingId: String(booking._id),
                lifecycle: (await Workflow.findById(workflow._id)).lifecycle,
              }),
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
            rentals: await seedPendingRentals(),
            frontend: 'http://localhost:4001',
            rentalCatalog: 'http://localhost:4001/costumes',
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
          'localhost',
          '--port',
          '4001',
          '--strictPort',
        ],
        {
          cwd: path.join(root, 'frontend'),
          env: {
            ...env,
            VITE_API_URL: '/api',
            DEV_API_PROXY_TARGET: 'http://127.0.0.1:5013',
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
