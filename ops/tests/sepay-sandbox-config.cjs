// Check startup configuration without opening a database, server or tunnel.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'ops/sepay-sandbox.cjs'), 'utf8');
const configSource = source.slice(0, source.indexOf('Object.assign(process.env, env);'));
const profile = {
  webhookSecret: 'local-webhook-secret-'.repeat(3),
  jwtSecret: 'local-jwt-secret-'.repeat(3),
};
function readConfig(providerText) {
  const fakeFs = {
    existsSync: (file) => file.endsWith('.env.sepay-sandbox'),
    mkdirSync() {},
    readFileSync(file) {
      if (file.endsWith('backend/.env') || file.endsWith('backend\\.env'))
        return `MONGO_URI=mongodb://127.0.0.1:27017/studio_db\n${providerText || ''}`;
      if (file.endsWith('.env.sepay-sandbox')) return JSON.stringify(profile);
      throw new Error('Unexpected read');
    },
  };
  const context = {
    URL,
    __dirname: path.join(root, 'ops'),
    process: { env: {} },
    require(name) {
      if (name === 'node:fs') return fakeFs;
      if (name === 'node:module') return { createRequire: () => require };
      if (name === './mongodb-windows.cjs')
        return { validateNativeUri: (uri) => assert.ok(uri.includes('/studio_db')) };
      return require(name);
    },
  };
  vm.runInNewContext(`${configSource}\nresult = env;`, context);
  return context.result;
}
const local = readConfig();
assert.equal(local.SEPAY_DEMO_UI, 'true');
assert.equal(local.PAYMENT_ACCOUNT_NUMBER, 'SBSTUDIO001');
const providerText = [
  'SEPAY_ENABLED=true',
  'SEPAY_MODE=sandbox',
  'PAYMENT_BANK_CODE=MBBank',
  'SEPAY_BANK_GATEWAY=MBBank',
  'PAYMENT_BANK_NAME=MBBank',
  'PAYMENT_ACCOUNT_NAME=TEST PROVIDER',
  'PAYMENT_ACCOUNT_NUMBER=0123456789',
  `SEPAY_WEBHOOK_SECRET=${'provider-test-secret-'.repeat(3)}`,
].join('\n');
const provider = readConfig(providerText);
assert.equal(provider.SEPAY_DEMO_UI, 'false');
assert.equal(provider.SEPAY_WEBHOOK_SECRET, 'provider-test-secret-'.repeat(3));
assert.equal(provider.PAYMENT_ACCOUNT_NUMBER, '0123456789');
assert.equal(provider.SEPAY_MODE, 'sandbox');
assert.equal(provider.SEPAY_SANDBOX_DATABASE, 'studio_sepay_sandbox');
assert.ok(provider.MONGO_URI.includes('/studio_sepay_sandbox'));
assert.equal(provider.PORT, '5013');
const separateDemo = readConfig(providerText.replace('SEPAY_ENABLED=true', 'SEPAY_ENABLED=false'));
assert.equal(separateDemo.SEPAY_ENABLED, 'true');
assert.equal(separateDemo.PAYMENT_ACCOUNT_NUMBER, '0123456789');
assert.equal(separateDemo.SEPAY_DEMO_UI, 'false');
assert.throws(
  () => readConfig('SEPAY_ENABLED=true\nSEPAY_MODE=sandbox\nPAYMENT_BANK_CODE=MBBank'),
  /Missing SEPAY_BANK_GATEWAY/,
);
assert.throws(
  () => readConfig(providerText.replace('SEPAY_MODE=sandbox', 'SEPAY_MODE=live')),
  /SEPAY_MODE=sandbox/,
);
assert.throws(
  () => readConfig(providerText.replace(/SEPAY_WEBHOOK_SECRET=.*/, 'SEPAY_WEBHOOK_SECRET=short')),
  /32\+ characters/,
);
console.log(
  'Sandbox config: local defaults, provider settings, demo button disabled, database isolation and invalid config checks passed.',
);
