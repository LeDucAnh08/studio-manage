const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const r = require('node:module').createRequire(path.resolve(__dirname, '../../package.json'));
const yaml = r('js-yaml');
const read = (file) => fs.readFileSync(path.resolve(__dirname, '../..', file), 'utf8');
test('Docker can explicitly hide the portal without changing its existing default or rebuilding rental alone', () => {
  const compose = yaml.load(read('docker-compose.yml'));
  const args = compose.services.frontend.build.args;
  assert.equal(args.VITE_CLIENT_PORTAL_ENABLED, '${VITE_CLIENT_PORTAL_ENABLED:-true}');
  assert.equal(args.VITE_CLIENT_RENTAL_ENABLED, '${VITE_CLIENT_RENTAL_ENABLED:-false}');
  const dockerfile = read('frontend/Dockerfile');
  assert.match(
    dockerfile,
    /ARG VITE_CLIENT_PORTAL_ENABLED=true\s+ENV VITE_CLIENT_PORTAL_ENABLED=\$\{VITE_CLIENT_PORTAL_ENABLED\}/,
  );
  assert.ok(
    dockerfile.indexOf('ENV VITE_CLIENT_PORTAL_ENABLED') < dockerfile.indexOf('RUN yarn build'),
  );
});
test('replica overlay preserves portal backend config and keeps both resource workflows opt-in', () => {
  const overlay = yaml.load(read('docker-compose.workflow.yml'));
  const env = overlay.services.backend.environment;
  assert.equal(env.CLIENT_WORKFLOW_ENABLED, '${CLIENT_WORKFLOW_ENABLED:-false}');
  assert.equal(env.CLIENT_RENTAL_ENABLED, '${CLIENT_RENTAL_ENABLED:-false}');
  assert.equal(env.CLIENT_PORTAL_ENABLED, undefined);
  assert.match(env.MONGO_URI, /replicaSet=rs0/);
  assert.ok(overlay.services.mongodb.volumes.includes('mongodb_keyfile:/keyfile:ro'));
  assert.equal(
    overlay.services.backend.depends_on['mongodb-replica-init'].condition,
    'service_completed_successfully',
  );
});
