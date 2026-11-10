// Dedicated loopback replica set; never opens or resets the user's MongoDB installation.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { MongoClient } = require('mongodb');
const root = path.resolve(__dirname, '..');
const home = path.join(root, '.workflow-tools/concept-tests');
const port = 27047;
const uri = `mongodb://127.0.0.1:${port}/?directConnection=true`;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function main() {
  const probe = new MongoClient(uri, { serverSelectionTimeoutMS: 500 });
  try {
    await probe.connect();
    throw new Error('Test port is already in use; refusing to attach to another database server.');
  } catch (e) {
    if (!/ECONNREFUSED|Server selection timed out/.test(e.message)) throw e;
  } finally {
    await probe.close();
  }
  fs.mkdirSync(home, { recursive: true });
  const runDirectory = fs.mkdtempSync(path.join(home, 'run-'));
  fs.mkdirSync(path.join(runDirectory, 'data'));
  const installed = path.join(
    require('node:os').homedir(),
    'StudioManage/MongoDB/7.0.45/bin/mongod.exe',
  );
  const binary =
    process.env.CONCEPT_TEST_MONGOD || (fs.existsSync(installed) ? installed : 'mongod');
  const mongo = spawn(
    binary,
    [
      '--dbpath',
      path.join(runDirectory, 'data'),
      '--bind_ip',
      '127.0.0.1',
      '--port',
      String(port),
      '--replSet',
      'concept-test',
      '--logpath',
      path.join(runDirectory, 'mongod.log'),
      '--logappend',
    ],
    { windowsHide: true, stdio: 'ignore' },
  );
  let launchError;
  mongo.on('error', (e) => {
    launchError = e;
  });
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 1000 });
  try {
    for (let i = 0; ; i++) {
      if (launchError) throw launchError;
      try {
        await client.connect();
        break;
      } catch (e) {
        if (i >= 20) throw e;
        await pause(300);
      }
    }
    try {
      await client.db('admin').command({
        replSetInitiate: {
          _id: 'concept-test',
          members: [{ _id: 0, host: `127.0.0.1:${port}` }],
        },
      });
    } catch (e) {
      if (e.codeName !== 'AlreadyInitialized') throw e;
    }
    for (let i = 0; !(await client.db('admin').command({ hello: 1 })).isWritablePrimary; i++) {
      if (i > 40) throw new Error('Test replica set did not elect primary');
      await pause(250);
    }
    const files = process.argv.includes('--all')
      ? JSON.parse(fs.readFileSync(path.join(root, 'backend/package.json'), 'utf8'))
          .scripts.test.split(' ')
          .slice(2)
      : process.argv.slice(2);
    const child = spawn(
      process.execPath,
      ['--test', ...(files.length ? files : ['tests/concept-booking.cjs'])],
      {
        cwd: path.join(root, 'backend'),
        windowsHide: true,
        stdio: 'inherit',
        env: {
          ...process.env,
          MONGO_TEST_URI: `mongodb://127.0.0.1:${port}/studio_sepay_concept_test?replicaSet=concept-test&directConnection=true`,
        },
      },
    );
    const code = await new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('exit', resolve);
    });
    process.exitCode = code || 0;
  } finally {
    // Graceful shutdown avoids replaying a forcibly interrupted journal on the next run.
    try { await client.db('admin').command({ shutdown: 1 }); } catch { /* shutdown closes the socket */ }
    await client.close();
    if (mongo.exitCode === null)
      await Promise.race([new Promise((r) => mongo.once('exit', r)), pause(5000)]);
    if (mongo.exitCode === null) mongo.kill();
    if (mongo.exitCode !== null) {
      const resolved = fs.realpathSync(runDirectory);
      if (path.dirname(resolved) !== fs.realpathSync(home) || !path.basename(resolved).startsWith('run-'))
        throw new Error('Refusing cleanup outside this test run');
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
