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
import QuizAttempt from '../models/QuizAttempt.js';
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
    assert.equal(await Module.countDocuments(), 13);
    assert.equal(await User.countDocuments(), 2);
    assert.equal(await Progress.countDocuments(), 2);
    assert.equal(await QuizAttempt.countDocuments(), 1);
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

  it('pins every MCQ answer key', async () => {
    const expected = {
      'var-let-const': 'c', 'dom-query': 'b', 'array-map-return': 'd', 'strict-equality': 'c',
      'event-listener': 'a', 'react-props-render': 'b', 'express-route-params': 'c',
    };
    const mcqs = await Question.find({ type: 'mcq' }).select('+correct_answer').lean();
    assert.deepEqual(Object.fromEntries(mcqs.map((q) => [q.slug, q.correct_answer])), expected);
  });

  it('each path has contiguous orders and an unbroken requires chain', async () => {
    for (const level of ['beginner', 'new', 'intermediate']) {
      const path = await LearningPath.findOne({ level });
      const mods = await Module.find({ path_id: path._id }).sort({ order: 1 }).lean();
      assert.ok(mods.length > 0, level);
      assert.deepEqual(mods.map((m) => m.order), mods.map((_, i) => i + 1), level);
      assert.equal(mods[0].requires, null, level);
      mods.slice(1).forEach((m, i) => assert.equal(String(m.requires), String(mods[i]._id), `${level} ${m.order}`));
      assert.equal(mods.filter((m) => m.requires === null).length, 1, level);
    }
  });

  it('beginner path has 9 modules with the spec titles and step counts 4/3/2', async () => {
    const beginner = await LearningPath.findOne({ level: 'beginner' }).lean();
    assert.equal(beginner.title, 'REST API dan React');
    assert.deepEqual(beginner.steps.map((s) => s.topic), ['async', 'rest-api', 'react']);
    const modules = await Module.find({ path_id: beginner._id }).sort({ order: 1 }).lean();
    assert.deepEqual(modules.map((m) => [m.order, m.topic, m.title]), [
      [1, 'async', 'Callback, Promise, dan async/await'],
      [2, 'async', 'Error handling pada kode asinkron'],
      [3, 'async', 'Kenapa try/catch tidak menangkap error Promise'],
      [4, 'async', 'Menjalankan Promise secara paralel (Promise.all, Promise.allSettled)'],
      [5, 'rest-api', 'Routing dan parameter di Express (req.params, req.query)'],
      [6, 'rest-api', 'Validasi query parameter'],
      [7, 'rest-api', 'Status code dan middleware error'],
      [8, 'react', 'State dan render kondisional'],
      [9, 'react', 'Mengambil data dengan useEffect (loading, error, cleanup)'],
    ]);
    const counts = Object.fromEntries(beginner.steps.map((s) => [s.topic, modules.filter((m) => m.topic === s.topic).length]));
    assert.deepEqual(counts, { async: 4, 'rest-api': 3, react: 2 });
  });

  it('new and intermediate paths carry the two sample modules from the spec', async () => {
    const outline = async (level) => {
      const path = await LearningPath.findOne({ level }).lean();
      assert.equal(path.steps.length, 3, level);
      const mods = await Module.find({ path_id: path._id }).sort({ order: 1 }).lean();
      return mods.map((m) => [m.order, m.topic, m.title]);
    };
    assert.deepEqual(await outline('new'), [
      [1, 'javascript', 'Perbandingan == vs === dan tipe data'],
      [2, 'dom', 'Memilih elemen dan menangani event di DOM'],
    ]);
    assert.deepEqual(await outline('intermediate'), [
      [1, 'async', 'Retry dengan exponential backoff'],
      [2, 'express', 'Menyusun middleware Express'],
    ]);
  });

  it('every module has one lead first, 3–6 content blocks, a realistic duration and no stored unlock fields', async () => {
    const modules = await Module.find().lean();
    assert.equal(modules.length, 13);
    for (const m of modules) {
      const rest = m.body.slice(1);
      assert.equal(m.body[0].type, 'lead', m.title);
      assert.ok(m.body[0].text, m.title);
      assert.ok(rest.length >= 3 && rest.length <= 6, m.title);
      for (const b of rest) {
        assert.ok(['text', 'code', 'callout'].includes(b.type), `${m.title}: ${b.type}`);
        if (b.type === 'code') assert.ok(b.label && b.code, m.title);
        else assert.ok(b.text, m.title);
      }
      assert.ok(['understand', 'apply'].includes(m.bloom_level), m.title);
      assert.ok(m.estimated_minutes >= 10 && m.estimated_minutes <= 30, m.title);
      // Gating is computed from requires, so the old stored labels must not come back.
      assert.equal('unlock_rule' in m, false, m.title);
      assert.equal('unlock_hint' in m, false, m.title);
    }
  });

  it('every quiz has 3–5 items, 3–4 options, a key among the options and an explanation', async () => {
    const modules = await Module.find().select('+quiz.correct_answer +quiz.explanation').lean();
    assert.equal(modules.length, 13);
    for (const m of modules) {
      assert.ok(m.quiz.length >= 3 && m.quiz.length <= 5, m.title);
      m.quiz.forEach((item, i) => {
        const where = `${m.title} #${i}`;
        assert.ok(item.question.trim(), where);
        assert.ok(item.options.length >= 3 && item.options.length <= 4, where);
        const keys = item.options.map((o) => o.key);
        assert.deepEqual(keys, ['a', 'b', 'c', 'd'].slice(0, keys.length), where);
        assert.ok(item.options.every((o) => o.text && o.text.trim()), where);
        assert.ok(keys.includes(item.correct_answer), where);
        assert.ok(item.explanation && item.explanation.trim(), where);
      });
    }
  });

  it('pins every quiz answer key', async () => {
    const expected = {
      'Callback, Promise, dan async/await': ['b', 'c', 'd', 'a'],
      'Error handling pada kode asinkron': ['b', 'd', 'c', 'a'],
      'Kenapa try/catch tidak menangkap error Promise': ['b', 'c', 'a', 'd'],
      'Menjalankan Promise secara paralel (Promise.all, Promise.allSettled)': ['b', 'a', 'd', 'c'],
      'Routing dan parameter di Express (req.params, req.query)': ['d', 'a', 'c', 'b'],
      'Validasi query parameter': ['b', 'c', 'a', 'd'],
      'Status code dan middleware error': ['b', 'd', 'c', 'a', 'b'],
      'State dan render kondisional': ['b', 'a', 'c', 'd'],
      'Mengambil data dengan useEffect (loading, error, cleanup)': ['c', 'b', 'd', 'a'],
      'Perbandingan == vs === dan tipe data': ['b', 'c', 'a', 'd'],
      'Memilih elemen dan menangani event di DOM': ['b', 'd', 'c', 'a'],
      'Retry dengan exponential backoff': ['a', 'c', 'b', 'd'],
      'Menyusun middleware Express': ['b', 'a', 'd', 'c'],
    };
    const modules = await Module.find().select('+quiz.correct_answer').lean();
    assert.deepEqual(
      Object.fromEntries(modules.map((m) => [m.title, m.quiz.map((q) => q.correct_answer)])),
      expected,
    );
  });

  it('every beginner module topic is a step of the path', async () => {
    const beginner = await LearningPath.findOne({ level: 'beginner' }).lean();
    const topics = new Set(beginner.steps.map((s) => s.topic));
    const modules = await Module.find({ path_id: beginner._id }).lean();
    assert.equal(modules.length, 9);
    for (const m of modules) assert.ok(topics.has(m.topic), m.title);
  });

  it('hosea: module 1 completed with one passing attempt, module 2 in progress at 50', async () => {
    const hosea = await User.findOne({ email: 'hosea@gapcheck.test' });
    const beginner = await LearningPath.findOne({ level: 'beginner' });
    const [m1, m2] = await Module.find({ path_id: beginner._id, order: { $in: [1, 2] } })
      .select('+quiz.correct_answer').sort({ order: 1 }).lean();
    const doneAt = new Date('2026-09-10T10:00:00Z');

    const rows = await Progress.find({ user_id: hosea._id }).lean();
    assert.equal(rows.length, 2);
    const p1 = rows.find((r) => String(r.module_id) === String(m1._id));
    const p2 = rows.find((r) => String(r.module_id) === String(m2._id));
    assert.deepEqual([p1.state, p1.percent_complete, p1.completed_at], ['completed', 100, doneAt]);
    assert.deepEqual([p2.state, p2.percent_complete], ['in_progress', 50]);
    assert.equal(p2.completed_at, undefined);

    const attempts = await QuizAttempt.find({ user_id: hosea._id }).lean();
    assert.equal(attempts.length, 1);
    const [a] = attempts;
    assert.equal(String(a.module_id), String(m1._id));
    assert.deepEqual(a.answers, m1.quiz.map((q) => q.correct_answer));
    assert.deepEqual(
      [a.correct_count, a.total, a.score, a.passed, a.submitted_at],
      [m1.quiz.length, m1.quiz.length, 1, true, doneAt],
    );
  });

  it('leaves nadia without a diagnostic', async () => {
    const nadia = await User.findOne({ email: 'nadia@gapcheck.test' });
    assert.equal(await Progress.countDocuments({ user_id: nadia._id }), 0);
    assert.equal(await QuizAttempt.countDocuments({ user_id: nadia._id }), 0);
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
    assert.equal(await Module.countDocuments(), 13);
    assert.equal(await Progress.countDocuments(), 2);
    assert.equal(await QuizAttempt.countDocuments(), 1);
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
