import { test } from 'node:test';
import assert from 'node:assert/strict';

import { firstOpenModule, pickModuleForTopic } from '../services/analysis.js';

// Pure helpers: plain objects stand in for lean Module and Progress documents.
const modules = [
  { _id: 'm4', order: 4, topic: 'async' },
  { _id: 'm1', order: 1, topic: 'async' },
  { _id: 'm7', order: 7, topic: 'rest-api' },
  { _id: 'm2', order: 2, topic: 'async' },
];
const progressOf = (rows) => new Map(Object.entries(rows).map(([id, state]) => [id, { state }]));

test('pickModuleForTopic: first not-completed module on the topic, by order', () => {
  const picked = pickModuleForTopic(modules, progressOf({ m1: 'completed', m2: 'in_progress' }), 'async');
  assert.equal(picked._id, 'm2');
});

test('pickModuleForTopic: every module on the topic completed -> the first one on the topic', () => {
  const done = progressOf({ m1: 'completed', m2: 'completed', m4: 'completed' });
  assert.equal(pickModuleForTopic(modules, done, 'async')._id, 'm1');
});

test('pickModuleForTopic: no module on the topic -> null', () => {
  assert.equal(pickModuleForTopic(modules, new Map(), 'dom'), null);
});

test('firstOpenModule: first not-completed module on the path, by order', () => {
  assert.equal(firstOpenModule(modules, progressOf({ m1: 'completed' }))._id, 'm2');
  assert.equal(firstOpenModule(modules, new Map())._id, 'm1');
});

test('firstOpenModule: empty path or everything completed -> null', () => {
  assert.equal(firstOpenModule([], new Map()), null);
  const all = progressOf({ m1: 'completed', m2: 'completed', m4: 'completed', m7: 'completed' });
  assert.equal(firstOpenModule(modules, all), null);
});
