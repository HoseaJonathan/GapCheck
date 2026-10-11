import { test } from 'node:test';
import assert from 'node:assert/strict';

import { lockStates } from '../learning.js';
import { calloutModule } from '../services/analysis.js';

// Pure helper: plain objects stand in for lean Module and Progress documents.
// The chain mirrors a seeded path: each module requires the one before it by order.
const modules = [
  { _id: 'm4', order: 4, topic: 'async', requires: 'm3' },
  { _id: 'm1', order: 1, topic: 'async', requires: null },
  { _id: 'm3', order: 3, topic: 'rest-api', requires: 'm2' },
  { _id: 'm2', order: 2, topic: 'async', requires: 'm1' },
];
const progressOf = (rows) => new Map(Object.entries(rows).map(([id, state]) => [id, { state }]));
const pick = (progress, topic) => calloutModule(modules, lockStates(modules, progress), progress, topic);

test('calloutModule: first open, not-completed module on the topic, by order', () => {
  assert.equal(pick(progressOf({ m1: 'completed', m2: 'in_progress' }), 'async')._id, 'm2');
  assert.equal(pick(new Map(), 'async')._id, 'm1');
});

test('calloutModule: a locked module on the topic is skipped for the first one on the topic', () => {
  // m4 is the only unfinished async module but waits on m3, so the callout must not point at it.
  const progress = progressOf({ m1: 'completed', m2: 'completed' });
  assert.equal(pick(progress, 'async')._id, 'm1');
});

test('calloutModule: every module on the topic completed -> the first one on the topic', () => {
  const done = progressOf({ m1: 'completed', m2: 'completed', m3: 'completed', m4: 'completed' });
  assert.equal(pick(done, 'async')._id, 'm1');
});

test('calloutModule: only locked modules on the topic -> the first one on the topic', () => {
  assert.equal(pick(new Map(), 'rest-api')._id, 'm3');
});

test('calloutModule: no module on the topic -> null', () => {
  assert.equal(pick(new Map(), 'dom'), null);
  assert.equal(calloutModule([], new Map(), new Map(), 'async'), null);
});
