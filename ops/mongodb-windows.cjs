// Controls only the authenticated MongoDB installed for this Windows account.
const fs = require('node:fs');
const path = require('node:path');
const { promisify } = require('node:util');
const { execFile } = require('node:child_process');
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

const root = path.resolve(__dirname, '..');
const local = process.env.LOCALAPPDATA;
const command = process.argv[2] || 'status';
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function validateNativeUri(value) {
  let uri;
  try {
    uri = new URL(value);
  } catch {
    throw new Error('A valid local Windows MongoDB URI is required.');
  }
  if (
    uri.protocol !== 'mongodb:' ||
    !['127.0.0.1', 'localhost'].includes(uri.hostname) ||
    uri.port !== '27020' ||
    uri.pathname !== '/studio_db' ||
    uri.searchParams.get('replicaSet') !== 'studio-rs0' ||
    uri.searchParams.get('authSource') !== 'admin' ||
    uri.searchParams.get('directConnection') !== 'true' ||
    !uri.username ||
    !uri.password
  )
    throw new Error(
      'Windows MongoDB is restricted to authenticated localhost:27020/studio_db on studio-rs0.',
    );
  return uri.toString();
}

async function inspect(client) {
  const options = (await client.db('admin').command({ getCmdLineOpts: 1 })).parsed;
  const expected = path.join(local, 'StudioManage', 'MongoDB', 'data');
  if (
    path.resolve(options.storage.dbPath).toLowerCase() !== path.resolve(expected).toLowerCase() ||
    options.net.port !== 27020 ||
    options.replication.replSetName !== 'studio-rs0' ||
    options.security.authorization !== 'enabled'
  )
    throw new Error('Refusing to control a MongoDB instance outside this installation.');
  const hello = await client.db('admin').command({ hello: 1 });
  return {
    running: true,
    host: '127.0.0.1',
    port: 27020,
    database: 'studio_db',
    replicaSet: hello.setName,
    primary: hello.isWritablePrimary,
    authenticated: true,
    dataPath: expected,
  };
}

async function main() {
  if (process.platform !== 'win32' || !local)
    throw new Error('This command manages the per-user Windows installation.');
  if (!['start', 'status', 'stop'].includes(command))
    throw new Error('Usage: node ops/mongodb-windows.cjs [start|status|stop]');
  const env = dotenv.parse(fs.readFileSync(path.join(root, 'backend/.env')));
  validateNativeUri(env.MONGO_URI);
  if (command === 'start') {
    const script = path.join(local, 'Programs', 'StudioMongoDB', 'Start-MongoDB.ps1');
    if (!fs.existsSync(script))
      throw new Error('MongoDB Windows has not been installed for this account.');
    await promisify(execFile)(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', script],
      { windowsHide: true },
    );
  }
  const client = new MongoClient(env.MONGO_URI, { serverSelectionTimeoutMS: 1500 });
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        await client.connect();
        break;
      } catch (error) {
        if (command !== 'start' || attempt >= 15) throw error;
        await pause(500);
      }
    }
    const info = await inspect(client);
    if (command === 'stop') {
      try {
        await client.db('admin').command({ shutdown: 1 });
      } catch (error) {
        if (!['MongoNetworkError', 'MongoServerSelectionError'].includes(error.name)) throw error;
      }
      console.log(JSON.stringify({ stopped: true, dataPreserved: true }));
    } else console.log(JSON.stringify(info, null, 2));
  } finally {
    await client.close();
  }
}

module.exports = { validateNativeUri };
if (require.main === module)
  main().catch((error) => {
    // Driver errors can contain connection details; never print the URI/password.
    console.error(
      error.name === 'MongoServerSelectionError'
        ? 'MongoDB Windows is not running. Use npm run db:start.'
        : error.name.startsWith('Mongo')
          ? `MongoDB operation failed (${error.code || error.name}).`
          : error.message,
    );
    process.exitCode = 1;
  });
