import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { setupTestDb } from './helpers.js';

const { app } = setupTestDb();

test('GET /health reports mongodb storage and a connected db', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true, storage: 'mongodb', db: 1 });
});

test('unknown route -> 404 with path', async () => {
  const res = await request(app).get('/nope');
  assert.equal(res.status, 404);
  assert.equal(res.body.path, '/nope');
  assert.equal(res.body.reason, 'not_found');
});

test('malformed JSON body -> 400 invalid_json, not 500', async () => {
  const res = await request(app).post('/auth/login').set('Content-Type', 'application/json').send('{"email":');
  assert.equal(res.status, 400);
  assert.deepEqual(res.body, { error: 'Bad Request', reason: 'invalid_json' });
});

test('body over the size limit -> 413 with the body-parser type as reason', async () => {
  const big = JSON.stringify({ email: 'x'.repeat(1024 * 1024 + 10) });
  const res = await request(app).post('/auth/login').set('Content-Type', 'application/json').send(big);
  assert.equal(res.status, 413);
  assert.equal(res.body.reason, 'entity.too.large');
});
