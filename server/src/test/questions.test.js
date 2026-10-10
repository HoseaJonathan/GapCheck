import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import Question from '../models/Question.js';
import { seed } from '../seed/seed.js';
import { setupTestDb } from './helpers.js';

const { app } = setupTestDb(seed);

describe('GET /questions', () => {
  it('returns all published questions ordered easy, medium, hard', async () => {
    // An unpublished question must drop out without disturbing the order of the rest.
    await Question.updateOne({ slug: 'toggle-class' }, { $set: { is_published: false } });
    try {
      const res = await request(app).get('/questions');
      assert.equal(res.status, 200);
      const { questions } = res.body;
      assert.equal(questions.length, 14);
      assert.equal(questions.some((q) => q.slug === 'toggle-class'), false);
      const rank = { easy: 0, medium: 1, hard: 2 };
      const ranks = questions.map((q) => rank[q.difficulty]);
      assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
      assert.equal(questions[0].slug, 'var-let-const');
      assert.equal(questions.at(-1).slug, 'async-error-middleware');
      assert.ok(res.body.session_duration_seconds > 0);
    } finally {
      await Question.updateOne({ slug: 'toggle-class' }, { $set: { is_published: true } });
    }
  });

  it('filters by a valid difficulty', async () => {
    const res = await request(app).get('/questions?difficulty=easy');
    assert.equal(res.status, 200);
    assert.ok(res.body.questions.length > 0);
    assert.ok(res.body.questions.every((q) => q.difficulty === 'easy'));
  });

  it('rejects an invalid difficulty with 400 and the allowed list', async () => {
    const res = await request(app).get('/questions?difficulty=impossible');
    assert.equal(res.status, 400);
    assert.equal(res.body.reason, 'invalid_difficulty');
    assert.deepEqual(res.body.allowed, ['easy', 'medium', 'hard']);
  });

  it('rejects an empty difficulty with 400', async () => {
    const res = await request(app).get('/questions?difficulty=');
    assert.equal(res.status, 400);
  });

  it('never exposes correct_answer or hidden test cases', async () => {
    const res = await request(app).get('/questions');
    for (const q of res.body.questions) {
      assert.equal('correct_answer' in q, false);
      for (const c of q.test_cases || []) assert.notEqual(c.is_hidden, true);
    }
  });

  it('reports hidden_case_count for the code question', async () => {
    const res = await request(app).get('/questions');
    const code = res.body.questions.find((q) => q.slug === 'filter-active-users');
    assert.equal(code.hidden_case_count, 1);
    assert.equal(code.test_cases.length, 3); // 4 cases in total, minus the hidden one
  });
});
