const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateNativeUri } = require('../mongodb-windows.cjs');
const { validateDemoUri, DEMO_URI } = require('../seed-demo.cjs');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadInstallation(existingFiles) {
  const local = path.resolve('test-local-appdata');
  const home = path.resolve('test-user-home');
  const exports = {};
  const context = {
    module: { exports },
    process: { env: { LOCALAPPDATA: local }, argv: [] },
    require(name) {
      if (name === 'node:fs')
        return { existsSync: (file) => existingFiles(local, home).includes(file) };
      if (name === 'node:os') return { homedir: () => home };
      return require(name);
    },
    __dirname: path.resolve(__dirname, '..'),
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, '../mongodb-windows.cjs'), 'utf8'),
    context,
  );
  return { ...context.module.exports, local, home };
}

test('Windows commands find the installed AppData data folder and Programs launcher', () => {
  const installation = loadInstallation((local) => [
    path.join(local, 'StudioManage', 'MongoDB', 'mongod.cfg'),
  ]);
  assert.equal(installation.nativeHome, path.join(installation.local, 'StudioManage', 'MongoDB'));
  assert.equal(
    installation.nativeStartScript,
    path.join(installation.local, 'Programs', 'StudioMongoDB', 'Start-MongoDB.ps1'),
  );
});

test('Windows commands preserve the legacy installation and colocated launchers', () => {
  const legacy = loadInstallation(() => []);
  assert.equal(legacy.nativeHome, path.join(legacy.home, 'StudioManage', 'MongoDB'));
  assert.equal(legacy.nativeStartScript, path.join(legacy.nativeHome, 'Start-MongoDB.ps1'));
  const local = loadInstallation((local) =>
    ['mongod.cfg', 'Start-MongoDB.ps1'].map((file) =>
      path.join(local, 'StudioManage', 'MongoDB', file),
    ),
  );
  assert.equal(local.nativeStartScript, path.join(local.nativeHome, 'Start-MongoDB.ps1'));
});

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
