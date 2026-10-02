import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, POINTS } from './scoring.js';

/** Build n questions of one difficulty with ids like "easy-1". */
const bank = (difficulty, n) =>
  Array.from({ length: n }, (_, i) => ({
    _id: `${difficulty}-${i + 1}`,
    difficulty,
    type: 'code',
    points: POINTS[difficulty],
  }));

const solved = (id, cases = 5) => ({
  question_id: id,
  verdict: 'Accepted',
  passed_cases: cases,
  total_cases: cases,
});

const partial = (id, passed, total) => ({
  question_id: id,
  verdict: 'Wrong Answer',
  passed_cases: passed,
  total_cases: total,
});

test('canonical mockup fixture: 168 / 290 = 57.93% -> beginner', () => {
  const questions = [...bank('easy', 5), ...bank('medium', 6), ...bank('hard', 4)];
  const submissions = [
    ...['easy-1', 'easy-2', 'easy-3', 'easy-4', 'easy-5'].map((id) => solved(id)),
    ...['medium-1', 'medium-2', 'medium-3', 'medium-4'].map((id) => solved(id)),
    partial('medium-5', 2, 5), // 20 * 2/5 = 8  -> the "+8 partial credit"
    partial('medium-6', 0, 4),
    solved('hard-1'),
    partial('hard-2', 0, 6),
    partial('hard-3', 0, 6),
    partial('hard-4', 0, 6),
  ];

  const r = classify(submissions, questions);

  assert.equal(r.earnedPoints, 168);
  assert.equal(r.possiblePoints, 290);
  assert.equal(r.percentage, 57.93);
  assert.equal(r.level, 'beginner');
  assert.deepEqual(r.byDifficulty.easy, { correct: 5, total: 5, earned: 50, possible: 50 });
  assert.deepEqual(r.byDifficulty.medium, { correct: 4, total: 6, earned: 88, possible: 120 });
  assert.deepEqual(r.byDifficulty.hard, { correct: 1, total: 4, earned: 30, possible: 120 });
  assert.equal(r.pointsToNextLevel, 13.1); // "13.1 points to Intermediate"
});

/**
 * Boundary value analysis. 100 easy questions = 1000 possible points, so one
 * correct answer moves the score by exactly 1 percentage point.
 */
const atPercent = (p) => {
  const questions = bank('easy', 100);
  const submissions = questions.slice(0, p).map((q) => solved(q._id));
  return classify(submissions, questions);
};

test('boundary 40 -> new (upper edge of NEW)', () => {
  assert.equal(atPercent(40).level, 'new');
});
test('boundary 41 -> beginner (lower edge of BEGINNER)', () => {
  assert.equal(atPercent(41).level, 'beginner');
});
test('boundary 70 -> beginner (upper edge of BEGINNER)', () => {
  assert.equal(atPercent(70).level, 'beginner');
});
test('boundary 71 -> intermediate (lower edge of INTERMEDIATE)', () => {
  assert.equal(atPercent(71).level, 'intermediate');
});

test('equivalence partitions: 0 and 100', () => {
  assert.equal(atPercent(0).level, 'new');
  assert.equal(atPercent(100).level, 'intermediate');
  assert.equal(atPercent(100).pointsToNextLevel, null);
});

test('empty session does not divide by zero', () => {
  const r = classify([], []);
  assert.equal(r.percentage, 0);
  assert.equal(r.level, 'new');
});

test('mcq questions score on correct_answer, not verdict', () => {
  const questions = [
    { _id: 'q1', difficulty: 'easy', type: 'mcq', points: 10, correct_answer: 'b' },
    { _id: 'q2', difficulty: 'easy', type: 'mcq', points: 10, correct_answer: 'c' },
  ];
  const r = classify(
    [{ question_id: 'q1', answer: 'b' }, { question_id: 'q2', answer: 'a' }],
    questions
  );
  assert.equal(r.earnedPoints, 10);
  assert.equal(r.possiblePoints, 20);
});

test('a run that never finished earns nothing, even with cases passed', () => {
  const questions = [{ _id: 'h1', difficulty: 'hard', type: 'code', points: 30 }];
  const tle = classify(
    [{ question_id: 'h1', verdict: 'Time Limit Exceeded', passed_cases: 4, total_cases: 5 }],
    questions
  );
  const wrong = classify(
    [{ question_id: 'h1', verdict: 'Wrong Answer', passed_cases: 4, total_cases: 5 }],
    questions
  );
  assert.equal(tle.earnedPoints, 0);
  assert.equal(wrong.earnedPoints, 24);
});
