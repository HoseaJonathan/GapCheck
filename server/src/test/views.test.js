import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import Module from '../models/Module.js';
import { seed } from '../seed/seed.js';
import { setupTestDb, login } from './helpers.js';

const { app } = setupTestDb(seed);

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const get = (token, path) => request(app).get(path).set(auth(token));

describe('result, progress and overview computed from the database', () => {
  let hosea;
  let nadia;
  let moduleByOrder;

  before(async () => {
    hosea = await login(app, 'hosea@gapcheck.test');
    nadia = await login(app, 'nadia@gapcheck.test');
    const mods = await Module.find().lean();
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
    assert.deepEqual(res.body.learning_path.steps.map((s) => s.module_count), [3, 1, 0]);
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
    assert.equal(b.modules_total, 4);

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
    assert.equal(b.in_progress[0].progress_percent, 60);
    assert.deepEqual(b.path_steps.map((s) => s.module_count), [3, 1, 0]);
    assert.equal(b.puzzle.streak_days, 7);
  });

  it('GET /overview for nadia', async () => {
    const res = await get(nadia, '/overview');
    assert.equal(res.status, 200);
    assert.equal(res.body.next_up, null);
    assert.equal(res.body.headline, 'Mulai dengan asesmen diagnostik.');
    assert.equal(res.body.weighted_score, null);
    assert.deepEqual(res.body.in_progress, []);
    assert.deepEqual(res.body.path_steps, []);
    assert.ok(res.body.puzzle);
  });

  it('views never leak answer keys', async () => {
    for (const path of ['/result', '/progress', '/overview']) {
      const res = await get(hosea, path);
      assert.equal(JSON.stringify(res.body).includes('correct_answer'), false, path);
    }
  });

  it('views require a token', async () => {
    for (const path of ['/result', '/progress', '/overview', '/puzzle']) {
      const res = await request(app).get(path);
      assert.equal(res.status, 401, path);
    }
  });
});
