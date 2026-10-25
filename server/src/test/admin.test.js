import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import AssessmentSession from '../models/AssessmentSession.js';
import LearningPath from '../models/LearningPath.js';
import Module from '../models/Module.js';
import User from '../models/User.js';
import { seed } from '../seed/seed.js';
import { setupTestDb, login } from './helpers.js';

const { app } = setupTestDb(seed);
const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('admin (dev/demo account)', () => {
  let admin;
  let hosea;

  before(async () => {
    admin = await login(app, 'admin@gapcheck.test');
    hosea = await login(app, 'hosea@gapcheck.test');
  });

  const setLevel = (token, level) => request(app).patch('/admin/level').set(auth(token)).send({ level });
  const pathModules = async (level) => {
    const path = await LearningPath.findOne({ level }).lean();
    return Module.find({ path_id: path._id }).sort({ order: 1 }).lean();
  };

  it('login flags the admin, and only the admin', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'admin@gapcheck.test', password: 'password123' });
    assert.equal(res.body.user.is_admin, true);
    const me = await request(app).get('/me').set(auth(hosea));
    assert.equal(me.body.is_admin, false);
  });

  it('every module on every path is open, including ones a learner has locked', async () => {
    for (const level of ['new', 'beginner', 'intermediate']) {
      assert.equal((await setLevel(admin, level)).status, 200);
      const res = await request(app).get('/modules').set(auth(admin));
      assert.ok(res.body.modules.length > 0, level);
      assert.ok(res.body.modules.every((m) => !m.locked), level);
    }
    const last = (await pathModules('beginner')).at(-1);
    const opened = await request(app).get(`/modules/${last._id}`).set(auth(admin));
    assert.equal(opened.body.module.locked, false);
    assert.ok(opened.body.module.body.length > 0);
    assert.equal((await request(app).post(`/modules/${last._id}/start`).set(auth(admin))).status, 200);
    // The same module stays locked for a learner.
    const learner = await request(app).get(`/modules/${last._id}`).set(auth(hosea));
    assert.equal(learner.body.module.locked, true);
  });

  it('quiz items carry the key and explanation for the admin only', async () => {
    const mod = (await pathModules('beginner'))[0];
    const asAdmin = (await request(app).get(`/modules/${mod._id}`).set(auth(admin))).body.module;
    assert.ok(asAdmin.quiz.every((q) => q.correct_answer && q.explanation));
    const asLearner = JSON.stringify((await request(app).get(`/modules/${mod._id}`).set(auth(hosea))).body);
    assert.equal(asLearner.includes('correct_answer'), false);
  });

  it('switching level: 400 for an unknown level, 403 for a learner', async () => {
    assert.equal((await setLevel(admin, 'expert')).status, 400);
    assert.equal((await setLevel(admin, undefined)).status, 400);
    const res = await setLevel(hosea, 'intermediate');
    assert.equal(res.status, 403);
    assert.equal(res.body.reason, 'admin_only');
    assert.equal((await User.findOne({ email: 'hosea@gapcheck.test' }).lean()).level, 'beginner');
  });

  it('a retake is never locked for the admin, even right after a finished session', async () => {
    const user = await User.findOne({ email: 'admin@gapcheck.test' });
    await AssessmentSession.create({
      user_id: user._id, kind: 'diagnostic', status: 'finished', question_ids: [],
      started_at: new Date(), finished_at: new Date(),
      result: { earned: 0, possible: 290, percentage: 0, level: 'new' },
    });
    const res = await request(app).post('/sessions').set(auth(admin));
    assert.ok(res.status === 200 || res.status === 201, `status ${res.status}`);
    assert.equal(res.body.kind ?? res.body.session?.kind, 'checkpoint');
    // hosea's retake is still locked by the normal rule.
    assert.equal((await request(app).post('/sessions').set(auth(hosea))).status, 403);
  });
});
