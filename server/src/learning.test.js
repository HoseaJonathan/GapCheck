import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lockStates, nextModule, gradeQuiz, retakeEligibility } from './learning.js';

const a = { _id: 'a', order: 1, topic: 'async', requires: null };
const b = { _id: 'b', order: 2, topic: 'async', requires: 'a' };
const c = { _id: 'c', order: 3, topic: 'react', requires: 'b' };
const mods = [a, b, c];
const steps = [
  { title: 'JavaScript asinkron', topic: 'async' },
  { title: 'React', topic: 'react' },
];

test('lockStates: first open, chain locked until prerequisite completed', () => {
  const l = lockStates(mods, new Map());
  assert.deepEqual([l.get('a').locked, l.get('b').locked, l.get('c').locked], [false, true, true]);
  assert.equal(l.get('b').unlock_hint, 'Lulus kuis modul 01 untuk membuka');
  assert.equal(l.get('b').unlock_rule, 'locked');
  assert.equal(l.get('a').unlock_rule, 'open');
  assert.equal(l.get('a').unlock_hint, null);
  const l2 = lockStates(mods, new Map([['a', { state: 'in_progress' }]]));
  assert.equal(l2.get('b').locked, true);
  const l3 = lockStates(mods, new Map([['a', { state: 'completed' }]]));
  assert.equal(l3.get('b').locked, false);
  assert.equal(l3.get('b').unlock_hint, null);
});

test('lockStates: a missing prerequisite counts as met', () => {
  const l = lockStates([{ ...b, requires: 'gone' }], new Map());
  assert.equal(l.get('b').locked, false);
});

test('nextModule is the first open, not completed module', () => {
  const none = new Map();
  assert.equal(nextModule(mods, lockStates(mods, none), none), a);
  const p1 = new Map([['a', { state: 'completed' }]]);
  assert.equal(nextModule(mods, lockStates(mods, p1), p1), b);
  const all = new Map(['a', 'b', 'c'].map((k) => [k, { state: 'completed' }]));
  assert.equal(nextModule(mods, lockStates(mods, all), all), null);
});

test('gradeQuiz boundary at 70%', () => {
  const ten = Array.from({ length: 10 }, () => ({ correct_answer: 'a' }));
  const ans = (n) => Array.from({ length: 10 }, (_, i) => (i < n ? 'a' : 'b'));
  assert.deepEqual(gradeQuiz(ten, ans(6)), { correct_count: 6, total: 10, score: 0.6, passed: false });
  assert.deepEqual(gradeQuiz(ten, ans(7)), { correct_count: 7, total: 10, score: 0.7, passed: true });
  const three = [{ correct_answer: 'a' }, { correct_answer: 'a' }, { correct_answer: 'a' }];
  assert.deepEqual(gradeQuiz(three, ['a', 'a', 'b']), { correct_count: 2, total: 3, score: 0.67, passed: false });
  assert.deepEqual(gradeQuiz(three, ['b', 'b', 'b']), { correct_count: 0, total: 3, score: 0, passed: false });
  assert.deepEqual(gradeQuiz(three, ['a', 'a', 'a']), { correct_count: 3, total: 3, score: 1, passed: true });
  const five = Array.from({ length: 5 }, () => ({ correct_answer: 'a' }));
  assert.deepEqual(gradeQuiz(five, ['a', 'a', 'a', 'a', 'b']), { correct_count: 4, total: 5, score: 0.8, passed: true });
});

test('gradeQuiz rejects malformed answers', () => {
  const two = [{ correct_answer: 'a' }, { correct_answer: 'b' }];
  assert.equal(gradeQuiz(two, ['a']), null);
  assert.equal(gradeQuiz(two, ['a', 'b', 'c']), null);
  assert.equal(gradeQuiz(two, 'ab'), null);
  assert.equal(gradeQuiz(two, undefined), null);
  assert.equal(gradeQuiz(two, ['a', null]), null);
  assert.equal(gradeQuiz(two, ['a', 1]), null);
  assert.equal(gradeQuiz([], []), null);
});

test('retakeEligibility', () => {
  const T = (d) => new Date(`2026-10-${d}T00:00:00Z`);
  const sessions = [{ finished_at: T('05') }, { finished_at: T('10') }];
  const done = (d) => ({ state: 'completed', completed_at: T(d) });
  const run = (modules, progress) => retakeEligibility({ sessions, modules, progress: new Map(progress), steps });

  assert.deepEqual(
    retakeEligibility({ sessions: [], modules: mods, progress: new Map(), steps }),
    { allowed: true, kind: 'diagnostic', reason: null },
  );
  assert.deepEqual(run(mods, [['a', done('06')], ['b', { state: 'in_progress' }]]), {
    allowed: false,
    kind: 'checkpoint',
    reason: 'Selesaikan 1 modul lagi di langkah JavaScript asinkron untuk membuka asesmen ulang.',
  });
  // 2a: step async fully completed, latest completion after last session
  assert.deepEqual(run(mods, [['a', done('06')], ['b', done('12')]]), {
    allowed: true,
    kind: 'checkpoint',
    reason: null,
  });
  // async finished before last session is not enough; React is the current step
  assert.deepEqual(run(mods, [['a', done('06')], ['b', done('07')]]), {
    allowed: false,
    kind: 'checkpoint',
    reason: 'Selesaikan 1 modul lagi di langkah React untuk membuka asesmen ulang.',
  });
  // 2b: whole path completed, all before last
  assert.deepEqual(run(mods, [['a', done('06')], ['b', done('07')], ['c', done('08')]]), {
    allowed: true,
    kind: 'checkpoint',
    reason: null,
  });
  assert.deepEqual(run([], []), {
    allowed: false,
    kind: 'checkpoint',
    reason: 'Belum ada modul untuk jalur kamu.',
  });
});

test('retakeEligibility: ISO string dates and topics outside steps', () => {
  const x = { _id: 'x', order: 1, topic: 'misc', requires: null };
  const r = retakeEligibility({
    sessions: [{ finished_at: '2026-10-10T00:00:00Z' }],
    modules: [x],
    progress: new Map(),
    steps,
  });
  assert.equal(r.allowed, false);
  assert.equal(r.reason, 'Selesaikan 1 modul lagi di langkah misc untuk membuka asesmen ulang.');
  const r2 = retakeEligibility({
    sessions: [{ finished_at: '2026-10-10T00:00:00Z' }],
    modules: [x],
    progress: new Map([['x', { state: 'completed', completed_at: '2026-10-11T00:00:00Z' }]]),
    steps,
  });
  assert.equal(r2.allowed, true);
});
