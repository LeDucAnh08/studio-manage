// Local Redis/worker control. Secrets and PIDs stay in ignored .workflow-tools.
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const r = createRequire(path.join(root, 'backend/package.json'));
const Redis = r('ioredis');
const home = path.join(root, '.workflow-tools/background-jobs');
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function readEnv() {
  return r('dotenv').parse(fs.readFileSync(path.join(root, 'backend/.env')));
}
function redisSettings(test = false) {
  fs.mkdirSync(home, { recursive: true });
  const name = test ? 'redis-test' : 'redis-local';
  const file = path.join(home, `${name}.json`);
  if (fs.existsSync(file)) {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (
      saved.name !== name ||
      saved.port !== (test ? 6386 : 6385) ||
      !/^[a-f0-9]{64}$/.test(saved.password)
    )
      throw new Error('Invalid local Redis settings; refusing to use another endpoint');
    return { ...saved, url: `redis://:${saved.password}@127.0.0.1:${saved.port}/0` };
  }
  const port = test ? 6386 : 6385,
    password = randomBytes(32).toString('hex');
  const config = { name, port, password, url: `redis://:${password}@127.0.0.1:${port}/0` };
  fs.writeFileSync(file, JSON.stringify(config, null, 2), { mode: 0o600 });
  return config;
}
function connect(config) {
  const client = new Redis(config.url, {
    connectTimeout: 2000,
    maxRetriesPerRequest: 1,
    retryStrategy: null,
  });
  client.on('error', () => {});
  return client;
}
async function startRedis(test = false) {
  const config = redisSettings(test);
  let client = connect(config);
  try {
    await client.ping();
    return config;
  } catch {
  } finally {
    client.disconnect();
  }
  const directory = path.join(home, config.name);
  fs.mkdirSync(directory, { recursive: true });
  const linux = (value) => '/mnt/' + value[0].toLowerCase() + value.slice(2).replaceAll('\\', '/');
  const lines = [
    'bind 127.0.0.1',
    'protected-mode yes',
    `port ${config.port}`,
    `requirepass ${config.password}`,
    'appendonly yes',
    'appendfsync everysec',
    'maxmemory 256mb',
    'maxmemory-policy noeviction',
    'daemonize yes',
    `dir "${linux(directory)}"`,
    `pidfile "${linux(path.join(directory, 'redis.pid'))}"`,
    `logfile "${linux(path.join(directory, 'redis.log'))}"`,
  ];
  const conf = path.join(directory, 'redis.conf');
  fs.writeFileSync(conf, lines.join('\n') + '\n', { mode: 0o600 });
  // Compose uses the same credential but a container-local persistent directory.
  if (!test)
    fs.writeFileSync(
      path.join(home, 'docker-redis.conf'),
      [
        'bind 0.0.0.0',
        'protected-mode yes',
        'port 6379',
        `requirepass ${config.password}`,
        'appendonly yes',
        'appendfsync everysec',
        'maxmemory 256mb',
        'maxmemory-policy noeviction',
        'dir /data',
      ].join('\n') + '\n',
      { mode: 0o600 },
    );
  const launched = spawnSync('wsl.exe', ['-d', 'Ubuntu', '--', 'redis-server', linux(conf)], {
    windowsHide: true,
    timeout: 20000,
    stdio: 'pipe',
  });
  if (launched.status !== 0)
    throw new Error(
      'Could not start private Redis in Ubuntu WSL; see Redis log or use the queue Compose overlay',
    );
  for (let i = 0; i < 20; i++) {
    client = connect(config);
    try {
      await client.ping();
      const info = await client.info('server');
      config.runId = info.match(/run_id:(\w+)/)?.[1];
      fs.writeFileSync(path.join(home, `${config.name}.json`), JSON.stringify(config, null, 2), {
        mode: 0o600,
      });
      return config;
    } catch {
      await pause(500);
    } finally {
      client.disconnect();
    }
  }
  throw new Error('Private Redis did not become reachable on Windows loopback');
}
async function startWorker() {
  const env = { ...process.env, ...readEnv() };
  if (env.BACKGROUND_JOBS_MODE !== 'bullmq')
    throw new Error('Enable BullMQ in backend/.env after cutover checks');
  const pidFile = path.join(home, 'worker.json');
  if (fs.existsSync(pidFile)) {
    const pid = JSON.parse(fs.readFileSync(pidFile)).pid;
    try {
      process.kill(pid, 0);
      throw new Error('Recorded worker is still running; stop it before starting another');
    } catch (e) {
      if (e.code !== 'ESRCH') throw e;
    }
  }
  const entry = path.join(root, 'backend/dist/workers/main.js');
  if (!fs.existsSync(entry)) throw new Error('Build the backend before starting worker');
  const out = fs.openSync(path.join(home, 'worker.log'), 'a');
  const child = spawn(process.execPath, [entry], {
    cwd: path.join(root, 'backend'),
    env,
    detached: true,
    windowsHide: true,
    stdio: ['ignore', out, out],
  });
  child.unref();
  fs.closeSync(out);
  fs.writeFileSync(
    pidFile,
    JSON.stringify({ pid: child.pid, entry, startedAt: new Date().toISOString() }, null, 2),
  );
  await pause(3000);
  try {
    process.kill(child.pid, 0);
  } catch {
    throw new Error('Worker exited; inspect ignored worker.log');
  }
  console.log('Worker started:', child.pid);
}
async function enableLocal() {
  const env = readEnv();
  require('./mongodb-windows.cjs').validateNativeUri(env.MONGO_URI);
  if (env.NODE_ENV && env.NODE_ENV !== 'development')
    throw new Error('Local activation requires development mode');
  const config = redisSettings(),
    client = connect(config);
  try {
    if (
      (await client.config('GET', 'appendonly'))[1] !== 'yes' ||
      (await client.config('GET', 'maxmemory-policy'))[1] !== 'noeviction'
    )
      throw new Error('Redis persistence and noeviction are required');
  } finally {
    client.disconnect();
  }
  const { MongoClient } = r('mongodb');
  const mongo = await MongoClient.connect(env.MONGO_URI);
  const envPath = path.join(root, 'backend/.env'),
    original = fs.readFileSync(envPath, 'utf8');
  let changed = false;
  try {
    const leases = await mongo
      .db()
      .collection('emailoutboxes')
      .countDocuments({ status: 'sending', lockedUntil: { $gt: new Date() } });
    if (leases)
      throw new Error('Email leases are still active; wait for delivery to drain before cutover');
    const backup = path.join(home, 'env-before-bullmq.env');
    if (!fs.existsSync(backup)) fs.writeFileSync(backup, original, { mode: 0o600 });
    let updated = original;
    const additions = {
      BACKGROUND_JOBS_MODE: 'bullmq',
      REDIS_URL: config.url,
      BACKGROUND_JOBS_PREFIX: env.BACKGROUND_JOBS_PREFIX || 'yume',
    };
    for (const [key, value] of Object.entries(additions)) {
      const line = new RegExp(`^${key}=.*$`, 'm');
      updated = line.test(updated)
        ? updated.replace(line, `${key}=${value}`)
        : `${updated.trimEnd()}\n${key}=${value}\n`;
    }
    fs.writeFileSync(envPath, updated);
    changed = true;
    Object.assign(process.env, env, additions);
    const expected = r(path.join(root, 'backend/dist/config/queue.js')).queueConfig();
    const appFile = path.join(root, 'backend/src/app.ts');
    fs.utimesSync(appFile, new Date(), new Date());
    let ready = false;
    for (let i = 0; i < 60; i++) {
      const runtime = await mongo
        .db()
        .collection('backgroundjobruntime')
        .findOne({ _id: 'runtime' });
      try {
        const response = await fetch(`http://127.0.0.1:${Number(env.PORT) || 5002}/api/health`, {
          signal: AbortSignal.timeout(1000),
        });
        if (runtime?.mode === 'bullmq' && runtime.prefix === expected.prefix && response.ok) {
          ready = true;
          break;
        }
      } catch {}
      await pause(500);
    }
    if (!ready)
      throw new Error(
        'API did not reload BullMQ configuration; start the development API and retry',
      );
    await startWorker();
    console.log('BullMQ activated locally. Database, email and payment settings retained.');
  } catch (e) {
    if (changed) {
      fs.writeFileSync(envPath, original);
      const appFile = path.join(root, 'backend/src/app.ts');
      fs.utimesSync(appFile, new Date(), new Date());
    }
    throw e;
  } finally {
    await mongo.close();
  }
}
async function main() {
  const command = process.argv[2] || 'status',
    test = process.argv.includes('--test');
  if (command === 'redis-start') {
    const config = await startRedis(test),
      client = connect(config);
    try {
      console.log(
        JSON.stringify({
          status: await client.ping(),
          port: config.port,
          persistence: await client.config('GET', 'appendonly'),
          eviction: await client.config('GET', 'maxmemory-policy'),
        }),
      );
    } finally {
      client.disconnect();
    }
  } else if (command === 'enable') await enableLocal();
  else if (command === 'start') await startWorker();
  else if (command === 'stop') {
    const file = path.join(home, 'worker.json');
    if (!fs.existsSync(file)) {
      console.log('No recorded worker');
      return;
    }
    const { pid } = JSON.parse(fs.readFileSync(file));
    const { MongoClient } = r('mongodb');
    const env = readEnv();
    require('./mongodb-windows.cjs').validateNativeUri(env.MONGO_URI);
    const mongo = await MongoClient.connect(env.MONGO_URI);
    try {
      const control = mongo.db().collection('backgroundjobruntime');
      const row = await control.findOne({ _id: 'runtime' });
      if (row?.workerPid !== pid || !row.workerInstance)
        throw new Error(
          'Recorded PID does not match worker heartbeat; refusing to stop another process',
        );
      await control.updateOne(
        { _id: 'runtime', workerInstance: row.workerInstance },
        { $set: { stopWorkerInstance: row.workerInstance } },
      );
      for (let i = 0; i < 90; i++) {
        try {
          process.kill(pid, 0);
        } catch (error) {
          if (error.code !== 'ESRCH')
            throw new Error('Cannot verify worker process state; no forced termination attempted');
          console.log('Worker drained and stopped');
          return;
        }
        await pause(500);
      }
      throw new Error(
        'Worker has not stopped; inspect active jobs. No forced termination was attempted',
      );
    } finally {
      await mongo.close();
    }
  } else if (command === 'status') {
    const config = redisSettings(test),
      client = connect(config);
    try {
      console.log('Redis:', await client.ping(), 'port', config.port);
    } finally {
      client.disconnect();
    }
    const file = path.join(home, 'worker.json');
    if (fs.existsSync(file)) {
      const { pid } = JSON.parse(fs.readFileSync(file));
      try {
        process.kill(pid, 0);
        console.log('Worker process:', pid);
      } catch {
        console.log('Worker stopped');
      }
    }
  } else
    throw new Error(
      'Use redis-start [--test] | enable | start | stop | status. For cutover/rollback follow docs/background-jobs.md.',
    );
}
module.exports = { startRedis, redisSettings };
if (require.main === module)
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
