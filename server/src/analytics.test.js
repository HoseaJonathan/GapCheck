import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, scoreSubmission, POINTS } from './scoring.js';
import {
  bestSubmissions, topicAccuracy, bloomBreakdown, acceptanceRate,
  narrative, sessionLabels, scoreDeltas,
} from './analytics.js';

// Canonical bank (same 15 questions as the seed): [id, difficulty, type, tags, bloom, submission]
const BANK = [
  ['e1', 'easy', 'mcq', ['javascript'], 'remember', 'ok'],
  ['e2', 'easy', 'mcq', ['dom'], 'remember', 'ok'],
  ['e3', 'easy', 'mcq', ['javascript', 'array-methods'], 'understand', 'ok'],
  ['e4', 'easy', 'mcq', ['javascript'], 'remember', 'ok'],
  ['e5', 'easy', 'mcq', ['dom'], 'understand', 'ok'],
  ['m1', 'medium', 'mcq', ['react'], 'understand', 'ok'],
  ['m2', 'medium', 'code', ['javascript', 'array-methods'], 'apply', ['Accepted', 4, 4]],
  ['m3', 'medium', 'mcq', ['express', 'rest-api'], 'understand', 'ok'],
  ['m4', 'medium', 'code', ['dom'], 'apply', ['Accepted', 4, 4]],
  ['m5', 'medium', 'code', ['javascript', 'array-methods'], 'understand', ['Wrong Answer', 2, 5]],
  ['m6', 'medium', 'code', ['async'], 'apply', ['Wrong Answer', 0, 4]],
  ['h1', 'hard', 'code', ['javascript'], 'analyze', ['Accepted', 5, 5]],
  ['h2', 'hard', 'code', ['express', 'rest-api'], 'apply', ['Time Limit Exceeded', 1, 5]],
  ['h3', 'hard', 'code', ['async'], 'analyze', ['Wrong Answer', 0, 5]],
  ['h4', 'hard', 'code', ['async', 'express'], 'analyze', ['Runtime Error', 0, 5]],
];

const questions = BANK.map(([_id, difficulty, type, tags, bloom_level]) => ({
  _id, difficulty, type, points: POINTS[difficulty], tags, bloom_level,
  ...(type === 'mcq' ? { correct_answer: 'A' } : {}),
}));

const subs = BANK.map(([qid, , type, , , s], i) => {
  const question = questions.find((q) => q._id === qid);
  const base = { question_id: qid, submitted_at: new Date(Date.UTC(2026, 0, 1, 0, 0, i)) };
  const sub = type === 'mcq'
    ? { ...base, answer: 'A', verdict: 'Accepted' }
    : { ...base, verdict: s[0], passed_cases: s[1], total_cases: s[2] };
  return { ...sub, points_earned: scoreSubmission(sub, question) };
});

const session = (kind, started, percentage) => ({
  kind, started_at: new Date(started), result: { percentage },
});
// Deliberately out of order: the functions must sort by started_at themselves.
const five = [
  session('diagnostic', '2026-04-01', 46.5),
  session('checkpoint', '2026-02-01', 41.8),
  session('diagnostic', '2026-01-01', 34.2),
  session('diagnostic', '2026-05-01', 57.93),
  session('checkpoint', '2026-03-01', 44.6),
];

test('topicAccuracy on canonical fixture', () => {
  const t = topicAccuracy(questions, bestSubmissions(subs));
  assert.deepEqual(t.at(-1), { topic: 'async', accuracy: 0, earned: 0, possible: 80, question_count: 3, zero_count: 3 });
  assert.deepEqual(t.find((x) => x.topic === 'javascript'), { topic: 'javascript', accuracy: 0.88, earned: 88, possible: 100, question_count: 6, zero_count: 0 });
  assert.equal(t.find((x) => x.topic === 'rest-api').accuracy, 0.4);
  assert.equal(t.find((x) => x.topic === 'express').accuracy, 0.25);
  assert.equal(t[0].accuracy, 1);
});

test('bestSubmissions keeps the highest points per question', () => {
  const b = bestSubmissions([
    { question_id: 'q', points_earned: 8, submitted_at: '2026-01-01T00:00:01Z' },
    { question_id: 'q', points_earned: 20, submitted_at: '2026-01-01T00:00:02Z' },
    { question_id: 'q', points_earned: 20, submitted_at: '2026-01-01T00:00:03Z' },
  ]);
  assert.equal(b.length, 1);
  assert.equal(b[0].submitted_at, '2026-01-01T00:00:02Z');
});

test('bestSubmissions tie-break also works with Date objects', () => {
  const late = { question_id: 'q', points_earned: 5, submitted_at: new Date('2026-01-01T00:00:09Z') };
  const early = { question_id: 'q', points_earned: 5, submitted_at: new Date('2026-01-01T00:00:01Z') };
  assert.equal(bestSubmissions([late, early])[0], early);
});

test('bloomBreakdown on canonical fixture, beginner', () => {
  const b = bloomBreakdown(questions, bestSubmissions(subs), 'beginner');
  assert.deepEqual(b.map((x) => x.level), ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']);
  assert.deepEqual(b.slice(0, 4).map((x) => [x.accuracy, x.reached]), [[1, true], [0.85, true], [0.44, true], [0.33, true]]);
  assert.equal(b[4].locked, true);
  assert.equal(b[4].unlock_hint, 'Opens at Intermediate');
});

test('bloomBreakdown unlocks evaluate/create at intermediate; empty level -> null', () => {
  const b = bloomBreakdown([], [], 'intermediate');
  assert.equal(b[5].locked, undefined);
  assert.deepEqual([b[0].accuracy, b[0].reached], [null, false]);
});

test('bloomBreakdown: a level with questions but 0 accuracy is not reached', () => {
  // Spec section 3: reached = accuracy > 0, so sitting a level without earning a point does not count.
  const qs = [{ _id: 'a', points: 30, bloom_level: 'analyze' }];
  const b = bloomBreakdown(qs, [{ question_id: 'a', points_earned: 0 }], 'beginner');
  assert.deepEqual([b[3].accuracy, b[3].reached], [0, false]);
});

test('acceptanceRate', () => {
  assert.equal(acceptanceRate([]), 0);
  assert.equal(acceptanceRate(subs), 0.67); // 10 dari 15 Accepted
});

test('narrative names async as the gap and the distance to Intermediate', () => {
  const n = narrative(topicAccuracy(questions, bestSubmissions(subs)), classify(subs, questions));
  assert.ok(n.gaps.includes('Topik async masih menahan skor — 0 dari 3 soal mendapat poin.'));
  assert.ok(n.solid.includes('Topik dom sudah kokoh — akurasi 100%.'));
  assert.equal(n.summary, 'Kamu berada 13.1 poin dari Intermediate. Topik terlemah kamu saat ini adalah async.');
});

test('narrative summary for intermediate has no distance', () => {
  const topics = [{ topic: 'dom', accuracy: 1, earned: 1, possible: 1, question_count: 1, zero_count: 0 }];
  const n = narrative(topics, { level: 'intermediate', pointsToNextLevel: null });
  assert.equal(n.summary, 'Kamu sudah di level Intermediate. Topik terlemah kamu saat ini adalah dom.');
});

test('sessionLabels and scoreDeltas on the five seeded sessions', () => {
  // kinds: diagnostic, checkpoint, checkpoint, diagnostic, diagnostic; % 34.2, 41.8, 44.6, 46.5, 57.93
  assert.deepEqual(sessionLabels(five).map((s) => s.label), ['Diagnostic 1', 'Checkpoint 1', 'Checkpoint 2', 'Diagnostic 2', 'Diagnostic 3']);
  assert.deepEqual(scoreDeltas(five), { delta_since_first: 23.7, delta_since_previous: 11.4 });
  assert.deepEqual(scoreDeltas(five.slice(0, 1)), { delta_since_first: null, delta_since_previous: null });
});
