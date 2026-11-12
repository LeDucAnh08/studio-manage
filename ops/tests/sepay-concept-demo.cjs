// Run against `node ops/sepay-sandbox.cjs serve`; creates one sandbox order only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, createHmac } = require('node:crypto');
const { MongoClient } = require('mongodb');
const root = path.resolve(__dirname, '../..');
const env = require('dotenv').parse(fs.readFileSync(path.join(root, 'backend/.env')));
require('../mongodb-windows.cjs').validateNativeUri(env.MONGO_URI);
const profile = JSON.parse(fs.readFileSync(path.join(root, '.workflow-tools/.env.sepay-sandbox')));
const uri = new URL(env.MONGO_URI);
uri.pathname = '/studio_sepay_sandbox';
const frontend = `http://localhost:${Number(process.env.SEPAY_FRONTEND_PORT || 4013)}`;

async function main() {
  const client = await MongoClient.connect(uri.toString());
  try {
    assert.equal(client.db().databaseName, 'studio_sepay_sandbox');
    const user = await client.db().collection('users').findOne({ username: 'mango' });
    assert.ok(user?.emailVerifiedAt && user.email.endsWith('.test'));
    const token = require('jsonwebtoken').sign({ id: String(user._id) }, profile.jwtSecret, {
      expiresIn: '10m',
    });
    const call = async (route, body, key) => {
      const response = await fetch(`${frontend}/api${route}`, {
        method: body ? 'POST' : 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(key ? { 'Idempotency-Key': key } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(30000),
      });
      const result = await response.json();
      assert.ok(response.ok, `${response.status}: ${result.message}`);
      return result.data;
    };
    const catalog = await call('/concepts');
    const pkg = catalog.packages.find((p) => p.maxPeople === 1);
    assert.ok(pkg, 'Need the one-person concept catalog');
    let slot;
    for (let offset = 3; offset <= 9 && !slot; offset++) {
      const day = new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
      const availability = await call(`/concepts/availability?packageId=${pkg._id}&day=${day}`);
      slot = availability.slots[0];
    }
    assert.ok(slot, 'Need an available photographer');
    const body = {
      packageId: pkg._id,
      packageVersion: pkg.version,
      startAt: slot.startAt,
      photographerId: slot.photographers[0]._id,
      costumes: [],
      wardrobeMeasurements:
        pkg.costumeCount > 0 ? [{ size: 'M', heightCm: 165, weightKg: 55 }] : [],
      contactName: 'Khách demo',
      phone: '0901234567',
      people: 1,
      brief: 'Kiểm tra luồng cọc SePay demo.',
      references: [],
      accepted: true,
    };
    const key = randomUUID();
    const order = await call('/concept-orders', body, key);
    const retried = await call('/concept-orders', body, key);
    assert.equal(order._id, retried._id);
    assert.equal(order.status, 'awaiting_deposit');
    const payment = order.paymentRequests.find((p) => p.kind === 'deposit');
    assert.equal(payment.demoSimulation, true);
    assert.equal(payment.status, 'pending');
    assert.ok(payment.qrUrl);
    // A signed local webhook exercises authentication and the same payment path.
    const payload = JSON.stringify({
      id: Date.now(),
      gateway: payment.bankName,
      accountNumber: payment.accountNumber,
      code: payment.reference,
      content: payment.reference,
      transferType: 'in',
      transferAmount: payment.amount,
      transactionDate: new Date(Date.now() + 7 * 3600000)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' '),
      referenceCode: `CONCEPT-DEMO-${randomUUID()}`,
    });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', profile.webhookSecret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');
    const webhook = () =>
      fetch(`${frontend}/api/payments/sepay/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SePay-Timestamp': timestamp,
          'X-SePay-Signature': `sha256=${signature}`,
        },
        body: payload,
      });
    assert.equal((await webhook()).status, 200);
    assert.equal((await webhook()).status, 200);
    const confirmed = await call(`/concept-orders/${order._id}`);
    assert.equal(confirmed.status, 'confirmed');
    assert.equal(confirmed.netReceived, order.snapshot.deposit);
    assert.equal(
      await client
        .db()
        .collection('schedules')
        .countDocuments({ conceptOrder: new (require('mongodb').ObjectId)(order._id) }),
      1,
    );
    console.log(
      JSON.stringify(
        {
          database: client.db().databaseName,
          checkout: 'passed',
          signedWebhook: 'passed',
          replay: 'passed',
          demoSimulation: true,
          orderUrl: `${frontend}/account/concept-orders/${order._id}?payment=deposit`,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.close();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
