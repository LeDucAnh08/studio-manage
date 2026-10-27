const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateNativeUri } = require('../mongodb-windows.cjs');
const { validateDemoUri, DEMO_URI } = require('../seed-demo.cjs');

test('Windows seed accepts only its authenticated local database without weakening the demo guard', () => {
  const native =
    'mongodb://test:example@127.0.0.1:27020/studio_db?authSource=admin&replicaSet=studio-rs0&directConnection=true';
  assert.equal(validateNativeUri(native), native);
  for (const invalid of [
    DEMO_URI,
    native.replace('127.0.0.1', 'example.com'),
    native.replace('27020', '27017'),
    native.replace('/studio_db', '/another_database'),
    native.replace('studio-rs0', 'rs0'),
    native.replace('admin&', 'other&'),
    native.replace('test:example@', ''),
    native.replace('directConnection=true', 'directConnection=false'),
    'invalid',
  ])
    assert.throws(() => validateNativeUri(invalid));
  assert.throws(() => validateDemoUri(native));
  assert.equal(validateDemoUri(DEMO_URI), DEMO_URI);
});
