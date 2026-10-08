const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const net = require('node:net');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { MongoClient } = require('mongodb');

const ROOT = path.resolve(__dirname, '..');
const TOOLS = path.join(ROOT, '.workflow-tools');
const URI = 'mongodb://127.0.0.1:27029/studio_project_demo?replicaSet=rs0&directConnection=true';
const ADMIN_URI = 'mongodb://127.0.0.1:27029/?directConnection=true';
const TYPE = 'studio-project-demo';
const URL = 'http://127.0.0.1:4001';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const children = new Set();
let server;
let mongod;
let mongoStarted = false;
let stopping = false;
let phase = 'starting';
let readiness;
let scenario;

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(2500) });
  return response.json();
}

async function status() {
  try {
    const value = await request(`${URL}/__demo/status`);
    if (value.type !== TYPE || value.root !== ROOT) throw new Error('Unexpected application');
    return value;
  } catch {
    return undefined;
  }
}

async function occupied(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    socket.setTimeout(800);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function child(command, args, options = {}) {
  const processHandle = spawn(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    windowsHide: true,
    ...options,
  });
  children.add(processHandle);
  processHandle.once('exit', () => children.delete(processHandle));
  return processHandle;
}

function run(args, options = {}) {
  return new Promise((resolve, reject) => {
    const processHandle = child(process.execPath, args, options);
    processHandle.once('error', reject);
    processHandle.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed: ${path.basename(args[0])} (exit ${code})`));
    });
  });
}

async function waitMongo(primary = false) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const client = new MongoClient(ADMIN_URI, { serverSelectionTimeoutMS: 500 });
    try {
      await client.connect();
      const hello = await client.db('admin').command({ hello: 1 });
      if (!primary || hello.isWritablePrimary) return hello;
    } catch {
      // The owned process may still be starting or electing its primary.
    } finally {
      await client.close();
    }
    await sleep(500);
  }
  throw new Error('Local MongoDB did not become ready. See demo-mongod.log.');
}

async function shutdown() {
  if (stopping) return;
  stopping = true;
  phase = 'stopping';
  for (const processHandle of children) {
    if (processHandle !== mongod) processHandle.kill();
  }
  if (mongoStarted) {
    const client = new MongoClient(URI, { serverSelectionTimeoutMS: 1000 });
    try {
      await client.connect();
      await client.db('admin').command({ shutdown: 1, force: true });
    } catch {
      // A successful MongoDB shutdown closes the command connection.
    } finally {
      await client.close();
    }
    for (let attempt = 0; attempt < 40 && mongod?.exitCode === null; attempt += 1) await sleep(250);
  }
  for (const processHandle of children) processHandle.kill();
  if (server) await new Promise((resolve) => server.close(resolve));
}

async function serve() {
  fs.mkdirSync(TOOLS, { recursive: true });
  const configPath = path.join(TOOLS, 'demo-config.json');
  let config;
  if (fs.existsSync(configPath)) config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  else {
    config = { jwtSecret: crypto.randomBytes(48).toString('hex') };
    fs.writeFileSync(configPath, JSON.stringify(config), { flag: 'wx' });
  }
  if (typeof config.jwtSecret !== 'string' || config.jwtSecret.length < 32)
    throw new Error('Invalid local demo-config.json');
  const token = crypto.randomBytes(32).toString('hex');
  const express = require('express');
  const app = express();
  app.disable('x-powered-by');
  app.get('/__demo/status', (_req, res) =>
    res.json({
      type: TYPE,
      root: ROOT,
      pid: process.pid,
      phase,
      frontend: 'http://localhost:4001',
      backend: 'http://localhost:5002',
      database: 'studio_project_demo',
      readiness,
      scenario,
    }),
  );
  app.post('/__demo/stop', (req, res) => {
    if (req.get('X-Demo-Token') !== token) return res.sendStatus(403);
    res.json({ stopping: true });
    setTimeout(() => shutdown().then(() => process.exit(0)), 100);
  });
  app.use('/api', (req, res) => {
    const proxy = http.request(
      {
        hostname: '127.0.0.1',
        port: 5002,
        path: req.originalUrl,
        method: req.method,
        headers: { ...req.headers, host: '127.0.0.1:5002' },
      },
      (upstream) => {
        res.writeHead(upstream.statusCode, upstream.headers);
        upstream.pipe(res);
      },
    );
    proxy.on('error', () => {
      if (!res.headersSent) res.status(503).json({ message: 'Demo backend is starting' });
      else res.destroy();
    });
    req.on('aborted', () => proxy.destroy());
    req.pipe(proxy);
  });
  app.use((_req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    if (phase !== 'ready')
      return res.status(503).send(`Demo: ${phase}. See .workflow-tools/demo.log.`);
    next();
  });
  app.use(express.static(path.join(ROOT, 'frontend', 'dist')));
  app.get('*', (_req, res) => res.sendFile(path.join(ROOT, 'frontend', 'dist', 'index.html')));
  await new Promise((resolve, reject) => {
    server = app.listen(4001, '127.0.0.1', resolve);
    server.once('error', reject);
  });
  fs.writeFileSync(
    path.join(TOOLS, 'demo-state.json'),
    JSON.stringify({ root: ROOT, pid: process.pid, token }),
  );
  process.once('SIGINT', () => shutdown().then(() => process.exit(0)));
  process.once('SIGTERM', () => shutdown().then(() => process.exit(0)));
  try {
    if ((await occupied(5002)) || (await occupied(27029)))
      throw new Error('Port 5002 or 27029 is already used; no existing process was changed.');
    const bundledMongo = path.join(TOOLS, 'mongod.exe');
    const mongoBinary =
      process.env.DEMO_MONGOD || (fs.existsSync(bundledMongo) ? bundledMongo : 'mongod');
    const dataPath = path.join(TOOLS, 'demo-mongo-data');
    fs.mkdirSync(dataPath, { recursive: true });
    const mongo = child(mongoBinary, [
      '--dbpath',
      dataPath,
      '--port',
      '27029',
      '--bind_ip',
      '127.0.0.1',
      '--replSet',
      'rs0',
      '--wiredTigerCacheSizeGB',
      '0.25',
      '--setParameter',
      'diagnosticDataCollectionEnabled=false',
      '--logpath',
      path.join(TOOLS, 'demo-mongod.log'),
      '--logappend',
    ]);
    mongod = mongo;
    mongo.once('error', (error) => console.error(`Cannot launch MongoDB: ${error.code}`));
    mongo.once('exit', (code) => {
      if (!stopping) {
        phase = 'failed';
        console.error(`Demo MongoDB stopped unexpectedly (exit ${code}).`);
      }
    });
    const hello = await waitMongo();
    const inspection = new MongoClient(ADMIN_URI, { serverSelectionTimeoutMS: 2000 });
    try {
      await inspection.connect();
      const options = await inspection.db('admin').command({ getCmdLineOpts: 1 });
      if (path.resolve(options.parsed?.storage?.dbPath || '') !== dataPath)
        throw new Error('Port 27029 is not the owned demo database.');
      mongoStarted = true;
    } finally {
      await inspection.close();
    }
    if (hello.setName && hello.setName !== 'rs0') throw new Error('Unexpected demo replica set');
    if (!hello.setName) {
      const client = new MongoClient(ADMIN_URI, { serverSelectionTimeoutMS: 2000 });
      try {
        await client.connect();
        await client.db('admin').command({
          replSetInitiate: {
            _id: 'rs0',
            members: [{ _id: 0, host: '127.0.0.1:27029' }],
          },
        });
      } finally {
        await client.close();
      }
    }
    await waitMongo(true);
    phase = 'building';
    await run(['node_modules/typescript/bin/tsc', '-p', 'backend/tsconfig.json']);
    await run(['node_modules/typescript/bin/tsc', '--noEmit', '-p', 'frontend/tsconfig.json']);
    await run([path.join(ROOT, 'node_modules/vite/bin/vite.js'), 'build'], {
      cwd: path.join(ROOT, 'frontend'),
      env: {
        ...process.env,
        VITE_CLIENT_PORTAL_ENABLED: 'true',
        VITE_CLIENT_RENTAL_ENABLED: 'true',
        VITE_API_URL: '/api',
      },
    });
    phase = 'seeding';
    await require('./seed-demo.cjs').seedDemo(URI);
    const backend = child(process.execPath, ['backend/dist/app.js'], {
      env: {
        ...process.env,
        MONGO_URI: URI,
        JWT_SECRET: config.jwtSecret,
        JWT_EXPIRES_IN: '7d',
        PORT: '5002',
        NODE_ENV: 'development',
        CORS_ORIGIN: 'http://localhost:4001,http://127.0.0.1:4001',
        CLIENT_PORTAL_ENABLED: 'true',
        CLIENT_WORKFLOW_ENABLED: 'true',
        CLIENT_RENTAL_ENABLED: 'true',
        TELEGRAM_BOT_TOKEN: '',
        GAS_WEBHOOK_URL: '',
        GAS_WEBHOOK_SECRET: '',
        PAYMENT_BANK_NAME: '',
        PAYMENT_ACCOUNT_NAME: '',
        PAYMENT_ACCOUNT_NUMBER: '',
        PAYMENT_TRANSFER_TEMPLATE: '',
      },
    });
    backend.once('exit', () => {
      if (!stopping) {
        phase = 'failed';
        console.error('Demo backend stopped unexpectedly.');
      }
    });
    let healthy = false;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        healthy = (await request('http://127.0.0.1:5002/api/health')).status === 'ok';
      } catch {
        /* starting */
      }
      if (healthy) break;
      await sleep(500);
    }
    if (!healthy) throw new Error('Demo backend did not become healthy.');
    phase = 'preparing-scenarios';
    try {
      scenario = await require('./demo-scenario.cjs').runDemoScenario('http://127.0.0.1:5002', URI);
    } catch (error) {
      // A sample journey interrupted across dates must not prevent opening the UI
      // to inspect or continue the preserved records. Never reset them automatically.
      scenario = { status: 'incomplete', warning: error.message };
      console.warn(error.message);
    }
    if (
      backend.exitCode !== null ||
      backend.signalCode !== null ||
      mongod.exitCode !== null ||
      mongod.signalCode !== null
    )
      throw new Error('An owned demo service exited during startup.');
    const result = await require('./audit-studio-readiness.cjs').audit(URI);
    const evidence = path.join(TOOLS, `demo-readiness-${Date.now()}.json`);
    fs.writeFileSync(evidence, JSON.stringify(result, null, 2), { flag: 'wx' });
    readiness = {
      ready: result.ready,
      evidence: path.relative(ROOT, evidence),
      blockers: result.findings
        .filter((f) => f.severity === 'blocker')
        .reduce((sum, f) => sum + f.count, 0),
      warnings: result.findings
        .filter((f) => f.severity === 'warning')
        .reduce((sum, f) => sum + f.count, 0),
    };
    if (
      phase === 'failed' ||
      backend.exitCode !== null ||
      backend.signalCode !== null ||
      mongod.exitCode !== null ||
      mongod.signalCode !== null
    )
      throw new Error('An owned demo service exited during readiness audit.');
    phase = 'ready';
    console.log('Demo ready: http://localhost:4001');
    console.log(JSON.stringify({ database: 'studio_project_demo', readiness }));
  } catch (error) {
    phase = 'failed';
    console.error(error.message);
    await sleep(2000);
    await shutdown();
    process.exitCode = 1;
  }
}

async function main() {
  const command = process.argv[2] || 'start';
  if (command === '_serve') return serve();
  if (!['start', 'stop', 'status'].includes(command))
    throw new Error('Usage: node ops/demo.cjs start|stop|status');
  const current = await status();
  if (command === 'status') {
    console.log(JSON.stringify(current || { phase: 'stopped' }, null, 2));
    return;
  }
  if (command === 'stop') {
    if (!current) {
      console.log('Demo is stopped.');
      return;
    }
    const state = JSON.parse(fs.readFileSync(path.join(TOOLS, 'demo-state.json'), 'utf8'));
    if (state.root !== ROOT || state.pid !== current.pid)
      throw new Error('Demo identity mismatch; nothing was stopped.');
    await request(`${URL}/__demo/stop`, {
      method: 'POST',
      headers: { 'X-Demo-Token': state.token },
    });
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (!(await status())) break;
      await sleep(500);
    }
    if (await status())
      throw new Error('Demo is still stopping. Inspect demo.log and retry status.');
    console.log('Demo stopped. Data preserved.');
    return;
  }
  if (current?.phase === 'ready') {
    console.log(JSON.stringify(current, null, 2));
    return;
  }
  if (!current) {
    if (await occupied(4001))
      throw new Error('Port 4001 is used by another app; nothing was changed.');
    fs.mkdirSync(TOOLS, { recursive: true });
    const output = fs.openSync(path.join(TOOLS, 'demo.log'), 'a');
    const worker = spawn(process.execPath, [__filename, '_serve'], {
      cwd: ROOT,
      detached: true,
      windowsHide: true,
      stdio: ['ignore', output, output],
    });
    fs.closeSync(output);
    worker.unref();
    console.log('Starting local demo. Logs: .workflow-tools/demo.log');
  }
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const value = await status();
    if (value?.phase === 'ready') {
      console.log(JSON.stringify(value, null, 2));
      return;
    }
    if (value?.phase === 'failed')
      throw new Error('Demo startup failed. Inspect demo.log, then use stop/start to retry.');
    if (attempt % 10 === 0) console.log(`Demo: ${value?.phase || 'starting'}`);
    await sleep(1000);
  }
  throw new Error('Startup still pending. Run node ops/demo.cjs status and inspect demo.log.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
