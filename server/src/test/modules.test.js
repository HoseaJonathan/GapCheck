import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';

import LearningPath from '../models/LearningPath.js';
import Module from '../models/Module.js';
import Progress from '../models/Progress.js';
import QuizAttempt from '../models/QuizAttempt.js';
import User from '../models/User.js';
import { seed } from '../seed/seed.js';
import { setupTestDb, login } from './helpers.js';

const { app } = setupTestDb(seed);

const auth = (token) => ({ Authorization: `Bearer ${token}` });

// Keys and explanations may only ever appear in the review of a passing attempt.
const assertNoKeys = (body) => {
  const json = JSON.stringify(body);
  assert.equal(json.includes('correct_answer'), false);
  assert.equal(json.includes('explanation'), false);
};

describe('modules', () => {
  let hosea;
  let nadia;
  // Beginner path modules by order: beginner[1] is order 1.
  const beginner = [];

  before(async () => {
    hosea = await login(app, 'hosea@gapcheck.test');
    nadia = await login(app, 'nadia@gapcheck.test');
    const path = await LearningPath.findOne({ level: 'beginner' }).lean();
    const mods = await Module.find({ path_id: path._id }).sort({ order: 1 }).lean();
    for (const m of mods) beginner[m.order] = m;
  });

  const getModule = (token, id) => request(app).get(`/modules/${id}`).set(auth(token));
  const start = (token, id) => request(app).post(`/modules/${id}/start`).set(auth(token));
  const submit = (token, id, answers) =>
    request(app).post(`/modules/${id}/quiz/attempts`).set(auth(token)).send({ answers });
  const attempts = (token, id) => request(app).get(`/modules/${id}/quiz/attempts`).set(auth(token));
  const keyOf = async (id) =>
    (await Module.findById(id).select('+quiz.correct_answer').lean()).quiz.map((q) => q.correct_answer);
  // A wrong option for every item: the first option key that is not the answer.
  const wrongAnswers = async (id) => {
    const mod = await Module.findById(id).select('+quiz.correct_answer').lean();
    return mod.quiz.map((q) => q.options.find((o) => o.key !== q.correct_answer).key);
  };

  it('GET /modules/abc is an invalid id', async () => {
    const res = await request(app).get('/modules/abc').set(auth(hosea));
    assert.equal(res.status, 404);
    assert.equal(res.body.reason, 'invalid_id');
  });

  it('GET /modules/:id with an unknown ObjectId', async () => {
    const res = await getModule(hosea, new mongoose.Types.ObjectId());
    assert.equal(res.status, 404);
    assert.equal(res.body.reason, 'unknown_module');
  });

  it('GET /modules for hosea: 1 completed, 2 open in progress, 3..9 locked', async () => {
    const res = await request(app).get('/modules').set(auth(hosea));
    assert.equal(res.status, 200);
    const { modules } = res.body;
    assert.deepEqual(modules.map((m) => m.order), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.deepEqual(modules.map((m) => m.locked), [false, false, true, true, true, true, true, true, true]);
    assert.deepEqual(modules.map((m) => m.state), ['completed', 'in_progress', null, null, null, null, null, null, null]);
    assert.deepEqual(modules.map((m) => m.progress_percent), [100, 50, 0, 0, 0, 0, 0, 0, 0]);
    assert.equal(modules[2].unlock_hint, 'Lulus kuis modul 02 untuk membuka');
    assert.equal(modules[2].unlock_rule, 'locked');
    assert.equal(modules[1].unlock_hint, null);
    assert.deepEqual(modules[0].quiz_status, { attempts: 1, best_score: 1, passed: true });
    assert.deepEqual(modules[1].quiz_status, { attempts: 0, best_score: null, passed: false });
    assert.equal('body' in modules[0], false);
    assert.equal('quiz' in modules[0], false);
    assertNoKeys(res.body);
  });

  it('GET /modules for nadia is empty', async () => {
    const res = await request(app).get('/modules').set(auth(nadia));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { modules: [] });
  });

  it('a locked module is served without body and quiz', async () => {
    const res = await getModule(hosea, beginner[3]._id);
    assert.equal(res.status, 200);
    const { module, siblings } = res.body;
    assert.equal(module.locked, true);
    assert.equal(module.unlock_hint, 'Lulus kuis modul 02 untuk membuka');
    assert.equal(module.state, null);
    assert.equal(module.title, beginner[3].title);
    assert.equal('body' in module, false);
    assert.equal('quiz' in module, false);
    assert.equal(module.flagged_by_diagnostic, true);
    assert.deepEqual(siblings.map((s) => s.order), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assertNoKeys(res.body);
  });

  it('an open module is served without keys or explanations', async () => {
    const res = await getModule(hosea, beginner[2]._id);
    assert.equal(res.status, 200);
    const { module, siblings } = res.body;

    assert.equal(module.order, 2);
    assert.equal(module.locked, false);
    assert.equal(module.state, 'in_progress');
    assert.equal(module.progress_percent, 50);
    assert.deepEqual(module.quiz_status, { attempts: 0, best_score: null, passed: false });
    assert.ok(module.body.length > 0);
    assert.equal(module.quiz.length, beginner[2].quiz.length);
    assert.ok(module.quiz[0].question);
    assert.ok(module.quiz[0].options.length >= 3);
    assert.equal(module.flagged_by_diagnostic, true);
    assertNoKeys(res.body);

    // Siblings carry the status fields but no content.
    assert.deepEqual(siblings.map((s) => s.progress_percent), [100, 50, 0, 0, 0, 0, 0, 0, 0]);
    assert.deepEqual(siblings.map((s) => s.locked), [false, false, true, true, true, true, true, true, true]);
    assert.deepEqual(siblings[0].quiz_status, { attempts: 1, best_score: 1, passed: true });
    assert.ok(siblings.every((s) => !('body' in s) && !('quiz' in s)));
  });

  it('start: 403 on a locked module; 50 on first open; never lowers a completed module', async () => {
    const locked = await start(hosea, beginner[3]._id);
    assert.equal(locked.status, 403);
    assert.equal(locked.body.reason, 'module_locked');
    assert.equal(await Progress.countDocuments({ module_id: beginner[3]._id }), 0);

    // nadia has no progress at all; module 1 has no prerequisite, so it is open for her.
    const first = await start(nadia, beginner[1]._id);
    assert.equal(first.status, 200);
    assert.deepEqual(first.body, { state: 'in_progress', progress_percent: 50 });
    const again = await start(nadia, beginner[1]._id);
    assert.deepEqual(again.body, { state: 'in_progress', progress_percent: 50 });

    const completed = await start(hosea, beginner[1]._id);
    assert.equal(completed.status, 200);
    assert.deepEqual(completed.body, { state: 'completed', progress_percent: 100 });
  });

  it('two concurrent first starts leave one progress row', async () => {
    const path = await LearningPath.findOne({ level: 'new' }).lean();
    const firstNew = await Module.findOne({ path_id: path._id, requires: null }).lean();
    const [a, b] = await Promise.all([start(nadia, firstNew._id), start(nadia, firstNew._id)]);
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);
    assert.deepEqual(a.body, { state: 'in_progress', progress_percent: 50 });
    assert.deepEqual(b.body, { state: 'in_progress', progress_percent: 50 });
    assert.equal(await Progress.countDocuments({ module_id: firstNew._id }), 1);
  });

  it('failed attempt: score only, no review, module stays in progress', async () => {
    const res = await submit(hosea, beginner[2]._id, await wrongAnswers(beginner[2]._id));
    assert.equal(res.status, 201);
    const total = beginner[2].quiz.length;
    assert.deepEqual(res.body, { attempt_no: 1, score: 0, correct_count: 0, total, passed: false });
    assertNoKeys(res.body);

    const after = (await getModule(hosea, beginner[2]._id)).body.module;
    assert.equal(after.state, 'in_progress');
    assert.equal(after.progress_percent, 50);
    assert.deepEqual(after.quiz_status, { attempts: 1, best_score: 0, passed: false });
    assert.equal((await getModule(hosea, beginner[3]._id)).body.module.locked, true);
  });

  it('passing attempt: review with keys and explanations, completed, next module unlocked', async () => {
    const key = await keyOf(beginner[2]._id);
    const res = await submit(hosea, beginner[2]._id, key);
    assert.equal(res.status, 201);
    const { attempt_no, score, correct_count, total, passed, review, next_module_id } = res.body;
    assert.deepEqual(
      { attempt_no, score, correct_count, total, passed },
      { attempt_no: 2, score: 1, correct_count: key.length, total: key.length, passed: true },
    );
    assert.equal(review.length, key.length);
    const full = await Module.findById(beginner[2]._id).select('+quiz.correct_answer +quiz.explanation').lean();
    assert.deepEqual(review[0], {
      question: full.quiz[0].question,
      your_answer: key[0],
      correct_answer: full.quiz[0].correct_answer,
      explanation: full.quiz[0].explanation,
    });
    assert.ok(review.every((r) => r.explanation));
    assert.equal(next_module_id, String(beginner[3]._id));

    const row = await Progress.findOne({ module_id: beginner[2]._id, state: 'completed' }).lean();
    assert.equal(row.percent_complete, 100);
    assert.ok(row.completed_at instanceof Date);

    const third = (await getModule(hosea, beginner[3]._id)).body.module;
    assert.equal(third.locked, false);
    assert.equal(third.unlock_hint, null);
    assert.ok(third.body.length > 0);
    const second = (await getModule(hosea, beginner[2]._id)).body.module;
    assert.equal(second.state, 'completed');
    assert.deepEqual(second.quiz_status, { attempts: 2, best_score: 1, passed: true });
  });

  it('passing the last module of a path has no next module', async () => {
    // Opens module 9 by completing its prerequisite directly; both rows and the attempt are removed afterwards.
    const { _id: userId } = await User.findOne({ email: 'hosea@gapcheck.test' }).lean();
    await Progress.create({
      user_id: userId, module_id: beginner[8]._id, state: 'completed', percent_complete: 100,
      completed_at: new Date('2026-09-01T00:00:00Z'),
    });
    try {
      const res = await submit(hosea, beginner[9]._id, await keyOf(beginner[9]._id));
      assert.equal(res.status, 201);
      assert.equal(res.body.passed, true);
      assert.equal(res.body.next_module_id, null);
    } finally {
      const mine = { user_id: userId, module_id: { $in: [beginner[8]._id, beginner[9]._id] } };
      await Progress.deleteMany(mine);
      await QuizAttempt.deleteMany(mine);
    }
  });

  it('a second pass keeps the first completed_at', async () => {
    const seeded = new Date('2026-09-10T10:00:00Z');
    const before = await Progress.findOne({ module_id: beginner[1]._id, state: 'completed' }).lean();
    assert.equal(before.completed_at.toISOString(), seeded.toISOString());

    const res = await submit(hosea, beginner[1]._id, await keyOf(beginner[1]._id));
    assert.equal(res.status, 201);
    assert.equal(res.body.passed, true);
    assert.equal(res.body.attempt_no, 2);
    assert.equal(res.body.next_module_id, String(beginner[2]._id));

    const after = await Progress.findById(before._id).lean();
    assert.equal(after.completed_at.toISOString(), seeded.toISOString());
    assert.equal(after.state, 'completed');
    assert.equal(after.percent_complete, 100);
  });

  it('incomplete answers → 400 incomplete_answers; locked module attempt → 403 module_locked', async () => {
    const key = await keyOf(beginner[2]._id);
    for (const answers of [key.slice(1), [...key, 'a'], 'a', undefined, key.map((k, i) => (i === 0 ? 1 : k))]) {
      const res = await submit(hosea, beginner[2]._id, answers);
      assert.equal(res.status, 400, JSON.stringify(answers));
      assert.equal(res.body.reason, 'incomplete_answers');
    }

    // Module 5 requires module 4, which hosea has not passed.
    const locked = await submit(hosea, beginner[5]._id, await keyOf(beginner[5]._id));
    assert.equal(locked.status, 403);
    assert.equal(locked.body.reason, 'module_locked');
    // Lock is checked before the answers are graded.
    const lockedBad = await submit(hosea, beginner[5]._id, []);
    assert.equal(lockedBad.body.reason, 'module_locked');

    const unknown = await submit(hosea, new mongoose.Types.ObjectId(), key);
    assert.equal(unknown.status, 404);
    assert.equal(unknown.body.reason, 'unknown_module');
  });

  it('a module without quiz items → 404 no_quiz', async () => {
    // Placed behind a locked module: no_quiz is answered before the lock check.
    const empty = await Module.create({
      path_id: beginner[1].path_id, order: 99, title: 'Tanpa kuis', topic: 'react', requires: beginner[9]._id,
    });
    try {
      const res = await submit(hosea, empty._id, []);
      assert.equal(res.status, 404);
      assert.equal(res.body.reason, 'no_quiz');
    } finally {
      await Module.deleteOne({ _id: empty._id });
    }
  });

  it('attempt history has no keys', async () => {
    const res = await attempts(hosea, beginner[2]._id);
    assert.equal(res.status, 200);
    const list = res.body.attempts;
    assert.deepEqual(list.map((a) => a.attempt_no), [2, 1]);
    assert.deepEqual(list.map((a) => a.passed), [true, false]);
    assert.deepEqual(Object.keys(list[0]).sort(), ['attempt_no', 'correct_count', 'passed', 'score', 'submitted_at', 'total']);
    assert.equal(JSON.stringify(res.body).includes('answers'), false);
    assertNoKeys(res.body);

    // Only the caller's own attempts.
    const other = await attempts(nadia, beginner[2]._id);
    assert.deepEqual(other.body, { attempts: [] });

    const unknown = await attempts(hosea, new mongoose.Types.ObjectId());
    assert.equal(unknown.status, 404);
    assert.equal(unknown.body.reason, 'unknown_module');
  });

  it('the old /quiz/:index/check route is gone', async () => {
    const res = await request(app).post(`/modules/${beginner[2]._id}/quiz/0/check`).set(auth(hosea)).send({ answer: 'b' });
    assert.equal(res.status, 404);
    assert.equal(res.body.reason, 'not_found');
  });

  it('GET /puzzle returns the static puzzle', async () => {
    const res = await request(app).get('/puzzle').set(auth(nadia));
    assert.equal(res.status, 200);
    assert.equal(res.body.puzzle.streak_days, 7);
  });

  it('module routes require a token', async () => {
    const id = beginner[2]._id;
    assert.equal((await request(app).get('/modules')).status, 401);
    assert.equal((await request(app).get(`/modules/${id}`)).status, 401);
    assert.equal((await request(app).post(`/modules/${id}/start`)).status, 401);
    assert.equal((await request(app).post(`/modules/${id}/quiz/attempts`).send({ answers: [] })).status, 401);
    assert.equal((await request(app).get(`/modules/${id}/quiz/attempts`)).status, 401);
  });
});
