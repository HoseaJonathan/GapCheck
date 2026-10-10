import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';

import Module from '../models/Module.js';
import { seed } from '../seed/seed.js';
import { setupTestDb, login } from './helpers.js';

const { app } = setupTestDb(seed);

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('modules', () => {
  let hosea;
  let nadia;
  let m04;

  before(async () => {
    hosea = await login(app, 'hosea@gapcheck.test');
    nadia = await login(app, 'nadia@gapcheck.test');
    m04 = await Module.findOne({ order: 4 }).lean();
  });

  const check = (token, id, index, answer) =>
    request(app).post(`/modules/${id}/quiz/${index}/check`).set(auth(token)).send({ answer });

  it('GET /modules/abc is an invalid id', async () => {
    const res = await request(app).get('/modules/abc').set(auth(hosea));
    assert.equal(res.status, 404);
    assert.equal(res.body.reason, 'invalid_id');
  });

  it('GET /modules/:id with an unknown ObjectId', async () => {
    const res = await request(app).get(`/modules/${new mongoose.Types.ObjectId()}`).set(auth(hosea));
    assert.equal(res.status, 404);
    assert.equal(res.body.reason, 'unknown_module');
  });

  it('GET /modules/:id returns the module, its siblings and no answer key', async () => {
    const res = await request(app).get(`/modules/${m04._id}`).set(auth(hosea));
    assert.equal(res.status, 200);
    const { module, siblings } = res.body;

    assert.equal(module.body.length, 4);
    assert.ok(module.quiz[0].question);
    assert.equal('correct_answer' in module.quiz[0], false);
    assert.equal(JSON.stringify(res.body).includes('correct_answer'), false);
    assert.equal(module.flagged_by_diagnostic, true);
    assert.equal(module.progress_percent, 0);
    assert.deepEqual(siblings.map((s) => s.order), [1, 2, 4, 7]);
    assert.deepEqual(siblings.map((s) => s.progress_percent), [100, 60, 0, 0]);
  });

  it('quiz check grades without revealing the key', async () => {
    const right = await check(hosea, m04._id, 0, 'b');
    assert.equal(right.status, 200);
    assert.deepEqual(right.body, { correct: true });

    const wrong = await check(hosea, m04._id, 0, 'a');
    assert.equal(wrong.status, 200);
    assert.deepEqual(wrong.body, { correct: false });

    const missing = await check(hosea, m04._id, 5, 'b');
    assert.equal(missing.status, 404);
    assert.equal(missing.body.reason, 'unknown_quiz_item');
  });

  it('quiz check without an answer is not correct', async () => {
    const res = await check(hosea, m04._id, 0, undefined);
    assert.deepEqual(res.body, { correct: false });
  });

  it('GET /modules for hosea lists the beginner path in order', async () => {
    const res = await request(app).get('/modules').set(auth(hosea));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.modules.map((m) => m.order), [1, 2, 4, 7]);
    assert.equal(JSON.stringify(res.body).includes('correct_answer'), false);
  });

  it('GET /modules for nadia is empty', async () => {
    const res = await request(app).get('/modules').set(auth(nadia));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { modules: [] });
  });

  it('GET /puzzle returns the static puzzle', async () => {
    const res = await request(app).get('/puzzle').set(auth(nadia));
    assert.equal(res.status, 200);
    assert.equal(res.body.puzzle.streak_days, 7);
  });

  it('module routes require a token', async () => {
    assert.equal((await request(app).get('/modules')).status, 401);
    assert.equal((await request(app).get(`/modules/${m04._id}`)).status, 401);
    assert.equal((await request(app).post(`/modules/${m04._id}/quiz/0/check`).send({ answer: 'b' })).status, 401);
  });
});
