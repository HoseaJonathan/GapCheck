import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import Question from '../models/Question.js';
import { setupTestDb } from './helpers.js';

const base = { points: 10, bloom_level: 'apply', tags: ['js'], description: 'd' };

const { app } = setupTestDb(async () => {
  await Question.create([
    { ...base, slug: 'hard-mcq', title: 'H', difficulty: 'hard', type: 'mcq', correct_answer: 'a',
      options: [{ key: 'a', text: 'A' }] },
    { ...base, slug: 'easy-code', title: 'E', difficulty: 'easy', type: 'code', correct_answer: 'x',
      test_cases: [
        { name: 'visible', stdin: '1', expected_output: '1' },
        { name: 'secret', stdin: '2', expected_output: '2', is_hidden: true },
      ] },
    { ...base, slug: 'medium-mcq', title: 'M', difficulty: 'medium', type: 'mcq', correct_answer: 'b',
      options: [{ key: 'b', text: 'B' }] },
    { ...base, slug: 'draft', title: 'D', difficulty: 'easy', type: 'mcq', is_published: false },
  ]);
});

describe('GET /questions', () => {
  it('returns all published questions ordered easy, medium, hard', async () => {
    const res = await request(app).get('/questions');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.questions.map((q) => q.slug), ['easy-code', 'medium-mcq', 'hard-mcq']);
    assert.ok(res.body.session_duration_seconds > 0);
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
    const code = res.body.questions.find((q) => q.type === 'code');
    assert.equal(code.hidden_case_count, 1);
    assert.equal(code.test_cases.length, 1);
  });
});
