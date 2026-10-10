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
});
