import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import User from '../models/User.js';
import Question from '../models/Question.js';
import AssessmentSession from '../models/AssessmentSession.js';
import Submission from '../models/Submission.js';
import { scoreSubmission } from '../scoring.js';
import { seed } from '../seed/seed.js';
import { questions as bank } from '../seed/data/questions.js';
import { setupTestDb, login } from './helpers.js';

const SLUGS = bank.map((q) => q.slug);
// Every MCQ is answered with its own key; wrongKey is any other option.
const keyOf = (slug) => bank.find((q) => q.slug === slug).correct_answer;
const wrongKey = (slug) => bank.find((q) => q.slug === slug).options.find((o) => o.key !== keyOf(slug)).key;

// "Submission kanonik" for code questions: [verdict, passed_cases]. MCQs are all answered correctly.
const CANONICAL_RUNS = {
  'filter-active-users': ['Accepted', 4],
  'toggle-class': ['Accepted', 4],
  'array-utils': ['Wrong Answer', 2],
  'promise-all-prices': ['Wrong Answer', 0],
  'group-by-key': ['Accepted', 5],
  'questions-difficulty-filter': ['Time Limit Exceeded', 1],
  'retry-with-backoff': ['Wrong Answer', 0],
  'async-error-middleware': ['Runtime Error', 0],
};

const { app } = setupTestDb(seed);

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const bySlug = async (slug) => Question.findOne({ slug }).lean();

async function start(token, kind = 'diagnostic') {
  return request(app).post('/sessions').set(auth(token)).send({ kind });
}

async function submit(token, body) {
  return request(app).post('/submit').set(auth(token)).send(body);
}

async function finish(token, sessionId) {
  return request(app).post(`/sessions/${sessionId}/finish`).set(auth(token));
}

describe('assessment sessions', () => {
  let hosea;
  let nadia;

  // Each test starts from no sessions, so the one-open-session rule never leaks between tests.
  beforeEach(async () => {
    await AssessmentSession.deleteMany({});
    await Submission.deleteMany({});
    await Question.updateMany({}, { $set: { is_published: true } });
    await User.updateMany({}, { $set: { level: null, diagnostic_status: false } });
    hosea = await login(app, 'hosea@gapcheck.test');
    nadia = await login(app, 'nadia@gapcheck.test');
  });

  it('start twice returns the same session', async () => {
    const first = await start(hosea);
    assert.equal(first.status, 201);
    assert.deepEqual(first.body.questions.map((q) => q.slug), SLUGS);
    assert.equal(first.body.remaining_seconds, 3600);

    const second = await start(hosea);
    assert.equal(second.status, 200);
    assert.equal(second.body.session._id, first.body.session._id);
    assert.deepEqual(second.body.questions.map((q) => q.slug), SLUGS);
  });

  it('concurrent starts create one session', async () => {
    const [a, b] = await Promise.all([start(hosea), start(hosea)]);
    assert.ok([200, 201].includes(a.status) && [200, 201].includes(b.status));
    assert.equal(a.body.session._id, b.body.session._id);
    const user = await User.findOne({ email: 'hosea@gapcheck.test' });
    assert.equal(await AssessmentSession.countDocuments({ status: 'in_progress', user_id: user._id }), 1);
  });

  it('invalid kind', async () => {
    const res = await start(hosea, 'final-exam');
    assert.equal(res.status, 400);
    assert.equal(res.body.reason, 'invalid_kind');
  });

  it('canonical answers then finish', async () => {
    const { body } = await start(hosea);
    const sessionId = body.session._id;
    const user = await User.findOne({ email: 'hosea@gapcheck.test' });

    for (const q of body.questions) {
      if (q.type === 'mcq') {
        const res = await submit(hosea, { session_id: sessionId, question_id: q._id, answer: keyOf(q.slug) });
        assert.equal(res.status, 201);
        assert.equal(res.body.verdict, 'Accepted');
        continue;
      }
      // fakeJudge0 is not deterministic, so canonical code runs go straight into the collection.
      const [verdict, passed_cases] = CANONICAL_RUNS[q.slug];
      const sub = {
        user_id: user._id, question_id: q._id, session_id: sessionId,
        verdict, passed_cases, total_cases: q.test_cases.length + q.hidden_case_count,
        submitted_at: new Date(),
      };
      sub.points_earned = scoreSubmission(sub, await bySlug(q.slug));
      await Submission.create(sub);
    }

    const res = await finish(hosea, sessionId);
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'finished');
    assert.deepEqual(res.body.result, { earned: 168, possible: 290, percentage: 57.93, level: 'beginner' });

    const after = await User.findById(user._id);
    assert.equal(after.level, 'beginner');
    assert.equal(after.diagnostic_status, true);
  });

  it('best submission counts', async () => {
    const { body } = await start(hosea);
    const sessionId = body.session._id;
    const e1 = await bySlug('var-let-const');
    const e2 = await bySlug('dom-query');

    const wrong = await submit(hosea, { session_id: sessionId, question_id: e1._id, answer: wrongKey('var-let-const') });
    assert.equal(wrong.body.verdict, 'Wrong Answer');
    assert.equal(wrong.body.points_earned, 0);
    await submit(hosea, { session_id: sessionId, question_id: e1._id, answer: keyOf('var-let-const') });
    // The reverse order too, so "latest submission wins" would fail this test.
    await submit(hosea, { session_id: sessionId, question_id: e2._id, answer: keyOf('dom-query') });
    await submit(hosea, { session_id: sessionId, question_id: e2._id, answer: wrongKey('dom-query') });

    const res = await finish(hosea, sessionId);
    assert.equal(res.body.result.earned, 20);
    assert.equal(res.body.result.possible, 290);
  });

  it("submit to another user's session", async () => {
    const { body } = await start(hosea);
    const e1 = await bySlug('var-let-const');

    const sub = await submit(nadia, { session_id: body.session._id, question_id: e1._id, answer: keyOf('var-let-const') });
    assert.equal(sub.status, 403);
    assert.equal(sub.body.reason, 'forbidden_session');

    const fin = await finish(nadia, body.session._id);
    assert.equal(fin.status, 403);
    assert.equal(fin.body.reason, 'forbidden_session');
  });

  it('submit with session_id "abc"', async () => {
    const e1 = await bySlug('var-let-const');
    const res = await submit(hosea, { session_id: 'abc', question_id: e1._id, answer: keyOf('var-let-const') });
    assert.equal(res.status, 404);
    assert.equal(res.body.reason, 'invalid_id');
  });

  it('submit after expiry', async () => {
    const { body } = await start(hosea);
    const sessionId = body.session._id;
    await AssessmentSession.updateOne(
      { _id: sessionId },
      { $set: { started_at: new Date(Date.now() - 3601 * 1000) } },
    );
    const e1 = await bySlug('var-let-const');

    const res = await submit(hosea, { session_id: sessionId, question_id: e1._id, answer: keyOf('var-let-const') });
    assert.equal(res.status, 409);
    assert.equal(res.body.reason, 'session_expired');

    const saved = await AssessmentSession.findById(sessionId);
    assert.equal(saved.status, 'finished');
    assert.equal(saved.elapsed_seconds, 3600);
    assert.equal(await Submission.countDocuments({ session_id: sessionId }), 0);
  });

  it('finish twice', async () => {
    const { body } = await start(hosea);
    assert.equal((await finish(hosea, body.session._id)).status, 200);

    const again = await finish(hosea, body.session._id);
    assert.equal(again.status, 409);
    assert.equal(again.body.reason, 'session_finished');
  });

  it('question not in session', async () => {
    // A question unpublished before the start is not in question_ids, although it exists.
    await Question.updateOne({ slug: 'dom-query' }, { $set: { is_published: false } });
    const { body } = await start(hosea);
    assert.equal(body.questions.length, 14);
    const e2 = await bySlug('dom-query');

    const res = await submit(hosea, { session_id: body.session._id, question_id: e2._id, answer: keyOf('dom-query') });
    assert.equal(res.status, 400);
    assert.equal(res.body.reason, 'question_not_in_session');
  });

  it('unpublished mid-session still scored', async () => {
    const { body } = await start(hosea);
    const e1 = await bySlug('var-let-const');
    await submit(hosea, { session_id: body.session._id, question_id: e1._id, answer: keyOf('var-let-const') });
    await Question.updateOne({ _id: e1._id }, { $set: { is_published: false } });

    const res = await finish(hosea, body.session._id);
    assert.equal(res.body.result.possible, 290);
    assert.equal(res.body.result.earned, 10);
  });

  it('responses never leak keys', async () => {
    const res = await start(hosea);
    assert.equal(res.body.questions.length, 15);
    for (const q of res.body.questions) {
      assert.equal('correct_answer' in q, false);
      for (const c of q.test_cases || []) assert.notEqual(c.is_hidden, true);
      if (q.type === 'code') assert.equal(q.hidden_case_count, 1);
    }

    const e1 = await bySlug('var-let-const');
    const sub = await submit(hosea, { session_id: res.body.session._id, question_id: e1._id, answer: keyOf('var-let-const') });
    assert.equal(sub.status, 201);
    assert.equal('correct_answer' in sub.body, false);
  });

  it('code submission responses never list the hidden case', async () => {
    const { body } = await start(hosea);
    const code = await bySlug('filter-active-users');
    const hidden = code.test_cases.find((c) => c.is_hidden);
    const visibleCount = code.test_cases.length - 1;

    const res = await submit(hosea, { session_id: body.session._id, question_id: code._id, submitted_code: 'x' });
    assert.equal(res.status, 201);
    assert.equal(res.body.total_cases, code.test_cases.length);
    assert.equal(res.body.cases.length, visibleCount);
    assert.ok(res.body.cases.every((c) => c.name !== hidden.name));

    const list = await request(app).get('/submissions').set(auth(hosea));
    const [stored] = list.body.submissions;
    assert.equal(stored.total_cases, code.test_cases.length);
    assert.equal(stored.cases.length, visibleCount);
    assert.ok(stored.cases.every((c) => c.name !== hidden.name));
  });

  it('GET /submissions lists only my submissions, newest first', async () => {
    const mine = await start(hosea);
    const theirs = await start(nadia);
    const e1 = await bySlug('var-let-const');
    const e2 = await bySlug('dom-query');
    await submit(hosea, { session_id: mine.body.session._id, question_id: e1._id, answer: wrongKey('var-let-const') });
    await submit(hosea, { session_id: mine.body.session._id, question_id: e2._id, answer: keyOf('dom-query') });
    await submit(nadia, { session_id: theirs.body.session._id, question_id: e1._id, answer: keyOf('var-let-const') });

    const res = await request(app).get('/submissions').set(auth(hosea));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.submissions.map((s) => String(s.question_id)), [String(e2._id), String(e1._id)]);
    assert.ok(res.body.verdicts.includes('Accepted'));
  });
});
