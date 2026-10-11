import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import { JWT_SECRET } from '../config.js';
import AssessmentSession from '../models/AssessmentSession.js';
import LearningPath from '../models/LearningPath.js';
import Module from '../models/Module.js';
import Question from '../models/Question.js';
import User from '../models/User.js';
import { seed } from '../seed/seed.js';
import { questions as bank } from '../seed/data/questions.js';
import { setupTestDb, login } from './helpers.js';

const { app } = setupTestDb(seed);

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const get = (token, path) => request(app).get(path).set(auth(token));
const post = (token, path, body) => request(app).post(path).set(auth(token)).send(body);

const FALLBACK_REASON = 'Modul berikutnya di jalur belajar kamu.';
const HOSEA_RETAKE = {
  allowed: false,
  kind: 'checkpoint',
  reason: 'Selesaikan 3 modul lagi di langkah JavaScript asinkron untuk membuka asesmen ulang.',
};
const FIRST_DIAGNOSTIC = { allowed: true, kind: 'diagnostic', reason: null };

/** A throwaway user signed in by token, so these cases never touch hosea or nadia. */
async function tempUser(name, level) {
  const user = await User.create({ username: name, email: `${name}@gapcheck.test`, password_hash: 'x', level });
  return { user, token: jwt.sign({ sub: String(user._id), username: name }, JWT_SECRET) };
}

describe('result, progress and overview computed from the database', () => {
  let hosea;
  let nadia;
  let moduleByOrder;

  before(async () => {
    hosea = await login(app, 'hosea@gapcheck.test');
    nadia = await login(app, 'nadia@gapcheck.test');
    // Every path now starts at order 1, so look orders up on hosea's (beginner) path only.
    const beginner = await LearningPath.findOne({ level: 'beginner' }).lean();
    const mods = await Module.find({ path_id: beginner._id }).lean();
    moduleByOrder = new Map(mods.map((m) => [m.order, m]));
  });

  it('GET /result for hosea replays the canonical 168/290 session', async () => {
    const res = await get(hosea, '/result');
    assert.equal(res.status, 200);
    assert.equal(res.body.percentage, 57.93);
    assert.equal(res.body.level, 'beginner');
    assert.equal(res.body.earnedPoints, 168);
    assert.equal(res.body.possiblePoints, 290);
    assert.equal(res.body.topic_accuracy.at(-1).topic, 'async');
    assert.deepEqual(res.body.learning_path.steps.map((s) => s.module_count), [4, 3, 2]);
    assert.equal(
      res.body.narrative.summary,
      'Kamu berada 13.1 poin dari Intermediate. Topik terlemah kamu saat ini adalah async.',
    );
    assert.equal(res.body.user.level, 'beginner');
    assert.ok(res.body.session_id);
  });

  it('GET /result for nadia has no result yet', async () => {
    const res = await get(nadia, '/result');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { result: null });
  });

  it('GET /progress for hosea', async () => {
    const res = await get(hosea, '/progress');
    assert.equal(res.status, 200);
    const b = res.body;

    assert.equal(b.sessions.length, 5);
    assert.equal(b.sessions.at(-1).label, 'Diagnostic 3');
    assert.equal(b.sessions.at(-1).percentage, 57.93);
    assert.equal(b.weighted_score, 57.93);
    assert.equal(b.level, 'beginner');
    assert.equal(b.points_to_next_level, 13.1);
    assert.equal(b.intermediate_threshold, 71);

    assert.equal(b.delta_since_first, 23.7);
    assert.equal(b.delta_since_previous, 11.4);
    assert.equal(b.acceptance_rate, 0.67);

    assert.equal(b.modules_completed, 1);
    assert.equal(b.modules_total, 9);
    assert.deepEqual(b.retake, HOSEA_RETAKE);

    const asyncTopic = b.topic_accuracy.find((t) => t.topic === 'async');
    // Order 1 shares the topic but is already completed, so the callout skips to order 2.
    assert.equal(asyncTopic.callout.module_id, String(moduleByOrder.get(2)._id));
    assert.ok(asyncTopic.callout.text.startsWith('Topik async'));

    assert.equal(b.recent_submissions.length, 10);
    assert.ok(b.recent_submissions[0].question_title);
    assert.ok(b.recent_submissions[0].difficulty);
    assert.equal(b.bloom_levels[4].locked, true);
  });

  it('GET /progress for nadia is empty, not an error', async () => {
    const res = await get(nadia, '/progress');
    assert.equal(res.status, 200);
    assert.equal(res.body.weighted_score, null);
    assert.deepEqual(res.body.sessions, []);
    assert.deepEqual(res.body.topic_accuracy, []);
    assert.deepEqual(res.body.retake, FIRST_DIAGNOSTIC);
  });

  it('GET /overview for hosea', async () => {
    const res = await get(hosea, '/overview');
    assert.equal(res.status, 200);
    const b = res.body;

    assert.equal(b.weighted_score, 57.93);
    assert.equal(b.next_up.module.order, 2);
    assert.equal(
      b.next_up.reason,
      'Dipilih karena topik async adalah topik terlemah di diagnostik terakhir kamu.',
    );
    assert.deepEqual(b.in_progress.map((m) => m.order), [2]);
    assert.equal(b.in_progress[0].progress_percent, 50);
    assert.deepEqual(b.path_steps.map((s) => s.module_count), [4, 3, 2]);
    assert.equal(b.puzzle.streak_days, 7);
    // Module 1 was passed before the last sitting, so it cannot open the checkpoint alone.
    assert.deepEqual(b.retake, HOSEA_RETAKE);
  });

  it('GET /overview for nadia', async () => {
    const res = await get(nadia, '/overview');
    assert.equal(res.status, 200);
    assert.equal(res.body.next_up, null);
    // level null is what tells the client to offer the diagnostic instead of a module.
    assert.equal(res.body.level, null);
    assert.equal(res.body.headline, 'Mulai dengan asesmen diagnostik.');
    assert.equal(res.body.weighted_score, null);
    assert.deepEqual(res.body.in_progress, []);
    assert.deepEqual(res.body.path_steps, []);
    assert.ok(res.body.puzzle);
    assert.deepEqual(res.body.retake, FIRST_DIAGNOSTIC);
  });

  it('views never leak answer keys', async () => {
    for (const path of ['/result', '/progress', '/overview']) {
      const res = await get(hosea, path);
      assert.equal(JSON.stringify(res.body).includes('correct_answer'), false, path);
    }
  });

  it('GET /result reports the stored session snapshot, not a recomputation', async () => {
    const user = await User.findOne({ email: 'hosea@gapcheck.test' });
    const session = await AssessmentSession.findOne({ user_id: user._id, 'question_ids.0': { $exists: true } });
    const original = session.result.toObject();
    // Editing the bank after a sitting must not rewrite that sitting's score (spec: result is a snapshot).
    await AssessmentSession.updateOne(
      { _id: session._id },
      { $set: { result: { earned: 150, possible: 280, percentage: 53.57, level: 'beginner' } } },
    );
    try {
      const res = await get(hosea, '/result');
      assert.equal(res.body.earnedPoints, 150);
      assert.equal(res.body.possiblePoints, 280);
      assert.equal(res.body.percentage, 53.57);
      assert.equal(res.body.level, 'beginner');
      assert.equal(res.body.pointsToNextLevel, 17.4);
    } finally {
      await AssessmentSession.updateOne({ _id: session._id }, { $set: { result: original } });
    }
  });

  it('next_up is the next open module even when the weakest topic has no module on the path', async () => {
    const { user, token } = await tempUser('fallback-topic', 'beginner');
    // One dom question and no answer: dom is the weakest topic, and the beginner path has no dom module.
    const dom = await Question.findOne({ slug: 'dom-query' });
    await AssessmentSession.create({
      user_id: user._id, kind: 'diagnostic', status: 'finished', question_ids: [dom._id],
      started_at: new Date(), finished_at: new Date(),
      result: { earned: 0, possible: 10, percentage: 0, level: 'beginner' },
    });

    const res = await get(token, '/overview');
    assert.equal(res.status, 200);
    assert.equal(res.body.next_up.module.order, 1);
    assert.equal(res.body.next_up.reason, FALLBACK_REASON);
  });

  it('next_up follows the gating, not the weakest topic, when that topic is still locked', async () => {
    const { user, token } = await tempUser('locked-topic', 'beginner');
    // react is the weakest topic, but its modules (8 and 9) wait on the whole chain before them.
    const react = await Question.findOne({ slug: 'react-props-render' });
    await AssessmentSession.create({
      user_id: user._id, kind: 'diagnostic', status: 'finished', question_ids: [react._id],
      started_at: new Date(), finished_at: new Date(),
      result: { earned: 0, possible: 20, percentage: 0, level: 'beginner' },
    });

    const overview = await get(token, '/overview');
    assert.equal(overview.body.next_up.module.order, 1);
    // Module 1 is async, not react, so the reason must not claim it covers the gap.
    assert.equal(overview.body.next_up.reason, FALLBACK_REASON);

    // No react module is open yet, so the callout falls back to the first react module.
    const result = await get(token, '/result');
    const weakest = result.body.topic_accuracy.at(-1);
    assert.equal(weakest.topic, 'react');
    assert.equal(weakest.callout.module_id, String(moduleByOrder.get(8)._id));
  });

  it('next_up needs only a level: with no analysable topic it is the first open module', async () => {
    const { token } = await tempUser('fallback-level', 'beginner');
    const res = await get(token, '/overview');
    assert.equal(res.body.next_up.module.order, 1);
    assert.equal(res.body.next_up.reason, FALLBACK_REASON);
  });

  it('next_up stays null on a path with no modules', async () => {
    const { token } = await tempUser('empty-path', 'intermediate');
    // The seed gives every path modules, so park the intermediate ones elsewhere for this case.
    const intermediate = await LearningPath.findOne({ level: 'intermediate' }).lean();
    const parked = new mongoose.Types.ObjectId();
    await Module.updateMany({ path_id: intermediate._id }, { $set: { path_id: parked } });
    try {
      const res = await get(token, '/overview');
      assert.equal(res.status, 200);
      assert.equal(res.body.level, 'intermediate');
      assert.equal(res.body.next_up, null);
    } finally {
      await Module.updateMany({ path_id: parked }, { $set: { path_id: intermediate._id } });
    }
  });

  it('views require a token', async () => {
    for (const path of ['/result', '/progress', '/overview', '/puzzle']) {
      const res = await request(app).get(path);
      assert.equal(res.status, 401, path);
    }
  });

  // Last on purpose: it gives nadia a finished session, which the cases above assume she lacks.
  it('nadia end to end: start, submit, finish, then every view is populated', async () => {
    const started = await post(nadia, '/sessions', { kind: 'diagnostic' });
    assert.equal(started.status, 201);
    const sessionId = started.body.session._id;

    for (const q of started.body.questions) {
      const body = q.type === 'mcq'
        ? { session_id: sessionId, question_id: q._id, answer: bank.find((b) => b.slug === q.slug).correct_answer }
        : { session_id: sessionId, question_id: q._id, submitted_code: q.base_code };
      const res = await post(nadia, '/submit', body);
      assert.equal(res.status, 201, q.slug);
    }
    const finished = await post(nadia, `/sessions/${sessionId}/finish`);
    assert.equal(finished.status, 200);

    const result = await get(nadia, '/result');
    assert.notEqual(result.body.result, null);
    assert.equal(result.body.session_id, sessionId);
    assert.equal(result.body.percentage, finished.body.result.percentage);

    const progress = await get(nadia, '/progress');
    assert.equal(progress.body.sessions.length, 1);
    assert.notEqual(progress.body.weighted_score, null);

    const overview = await get(nadia, '/overview');
    assert.notEqual(overview.body.weighted_score, null);
    assert.equal(overview.body.level, finished.body.result.level);
  });
});

describe('a completed path', () => {
  let hosea;

  before(async () => {
    await seed();
    hosea = await login(app, 'hosea@gapcheck.test');
  });
  // Passing every module rewrites hosea's progress, so the seed is put back for anything that follows.
  after(seed);

  it('has no next_up and allows a checkpoint', async () => {
    const beginner = await LearningPath.findOne({ level: 'beginner' }).lean();
    const mods = await Module.find({ path_id: beginner._id }).select('+quiz.correct_answer').sort({ order: 1 }).lean();
    assert.equal(mods.length, 9);
    // In order, because each module opens only once the one before it is passed.
    for (const m of mods) {
      const res = await post(hosea, `/modules/${m._id}/quiz/attempts`, { answers: m.quiz.map((q) => q.correct_answer) });
      assert.equal(res.status, 201, `module ${m.order}`);
      assert.equal(res.body.passed, true, `module ${m.order}`);
    }

    const res = await get(hosea, '/overview');
    assert.equal(res.status, 200);
    assert.equal(res.body.next_up, null);
    assert.deepEqual(res.body.retake, { allowed: true, kind: 'checkpoint', reason: null });
  });
});
