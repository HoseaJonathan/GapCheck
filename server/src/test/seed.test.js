import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';

import User from '../models/User.js';
import Question from '../models/Question.js';
import AssessmentSession from '../models/AssessmentSession.js';
import Submission from '../models/Submission.js';
import LearningPath from '../models/LearningPath.js';
import Module from '../models/Module.js';
import Progress from '../models/Progress.js';
import { seed, assertSeedAllowed } from '../seed/seed.js';
import { setupTestDb } from './helpers.js';

setupTestDb(seed);

describe('seed', () => {
  it('produces the canonical latest session', async () => {
    const hosea = await User.findOne({ email: 'hosea@gapcheck.test' });
    const latest = await AssessmentSession.findOne({ user_id: hosea._id }).sort({ started_at: -1 }).lean();
    assert.deepEqual(latest.result, { earned: 168, possible: 290, percentage: 57.93, level: 'beginner' });
    assert.equal(latest.elapsed_seconds, 2294);
    assert.equal(await AssessmentSession.countDocuments({ user_id: hosea._id, status: 'finished' }), 5);
    assert.equal(await AssessmentSession.countDocuments({ status: 'in_progress' }), 0);
    assert.equal(hosea.level, 'beginner');
    assert.equal(hosea.diagnostic_status, true);
    assert.equal(await bcrypt.compare('password123', hosea.password_hash), true);
  });

  it('keeps the four history snapshots as percentages without submissions', async () => {
    const hosea = await User.findOne({ email: 'hosea@gapcheck.test' });
    const snaps = await AssessmentSession.find({ user_id: hosea._id, question_ids: { $size: 0 } }).sort({ started_at: 1 }).lean();
    assert.deepEqual(snaps.map((s) => s.result.percentage), [34.2, 41.8, 44.6, 46.5]);
    assert.deepEqual(snaps.map((s) => s.result.level), ['new', 'beginner', 'beginner', 'beginner']);
    assert.deepEqual(snaps.map((s) => s.kind), ['diagnostic', 'checkpoint', 'checkpoint', 'diagnostic']);
    assert.equal(snaps[0].result.earned, 99); // round(290 * 34.2 / 100)
    assert.equal(await Submission.countDocuments(), 15);
  });

  it('counts documents per collection', async () => {
    assert.equal(await Question.countDocuments(), 15);
    assert.equal(await Question.countDocuments({ difficulty: 'easy' }), 5);
    assert.equal(await Question.countDocuments({ is_published: true }), 15);
    assert.equal(await LearningPath.countDocuments(), 3);
    assert.equal(await Module.countDocuments(), 4);
    assert.equal(await User.countDocuments(), 2);
    assert.equal(await Progress.countDocuments(), 2);
  });

  it('gives every code question exactly one hidden case and covers remember..analyze', async () => {
    const questions = await Question.find().select('+correct_answer').lean();
    for (const q of questions) {
      if (q.type === 'code') {
        assert.equal(q.test_cases.filter((c) => c.is_hidden).length, 1, q.slug);
        assert.ok(q.requirements.length >= 2 && q.requirements.length <= 4, q.slug);
        assert.ok(q.base_code.includes('module.exports'), q.slug);
        assert.ok(q.sample.request && q.sample.expected, q.slug);
      } else {
        assert.ok(q.options.length >= 3 && q.options.length <= 4, q.slug);
        assert.ok(q.options.some((o) => o.key === q.correct_answer), q.slug);
      }
    }
    assert.deepEqual(
      [...new Set(questions.map((q) => q.bloom_level))].sort(),
      ['analyze', 'apply', 'remember', 'understand'],
    );
    const tags = new Set(questions.flatMap((q) => q.tags));
    assert.equal(tags.has('syntax') || tags.has('validation'), false);
  });

  it('builds paths and modules so that async has 3 modules, rest-api 1, react 0', async () => {
    const beginner = await LearningPath.findOne({ level: 'beginner' }).lean();
    assert.equal(beginner.title, 'REST API dan React');
    assert.deepEqual(beginner.steps.map((s) => s.topic), ['async', 'rest-api', 'react']);
    const modules = await Module.find({ path_id: beginner._id }).sort({ order: 1 }).lean();
    assert.deepEqual(modules.map((m) => m.order), [1, 2, 4, 7]);
    const counts = Object.fromEntries(beginner.steps.map((s) => [s.topic, modules.filter((m) => m.topic === s.topic).length]));
    assert.deepEqual(counts, { async: 3, 'rest-api': 1, react: 0 });
    assert.ok(modules[2].body.length > 0 && modules[2].quiz.length === 1);
    for (const level of ['new', 'intermediate']) {
      const p = await LearningPath.findOne({ level }).lean();
      assert.equal(p.steps.length, 3);
    }
  });

  it('records hosea module progress', async () => {
    const hosea = await User.findOne({ email: 'hosea@gapcheck.test' });
    const rows = await Progress.find({ user_id: hosea._id }).populate('module_id').lean();
    const byOrder = Object.fromEntries(rows.map((r) => [r.module_id.order, [r.state, r.percent_complete]]));
    assert.deepEqual(byOrder, { 1: ['completed', 100], 2: ['in_progress', 60] });
  });

  it('leaves nadia without a diagnostic', async () => {
    const nadia = await User.findOne({ email: 'nadia@gapcheck.test' });
    assert.equal(nadia.level, null);
    assert.equal(nadia.diagnostic_status, false);
    assert.equal(nadia.profile.display_name, 'Nadia Pramesti');
    assert.equal(await AssessmentSession.countDocuments({ user_id: nadia._id }), 0);
  });

  it('is idempotent', async () => {
    const result = await seed();
    assert.equal(await Question.countDocuments(), 15);
    assert.equal(await User.countDocuments(), 2);
    assert.equal(await Submission.countDocuments(), 15);
    assert.equal(await AssessmentSession.countDocuments(), 5);
    assert.deepEqual([...result.questions.keys()].length, 15);
    assert.ok(result.users.hosea._id && result.users.nadia._id);
  });
});

describe('assertSeedAllowed', () => {
  it('refuses production', () => {
    assert.throws(() => assertSeedAllowed({ NODE_ENV: 'production' }), /Seed ditolak di production/);
    assert.doesNotThrow(() => assertSeedAllowed({ NODE_ENV: 'development' }));
    assert.doesNotThrow(() => assertSeedAllowed({}));
  });
});
