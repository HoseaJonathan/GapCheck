import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { seed } from '../seed/seed.js';
import { setupTestDb, login } from './helpers.js';

const { app } = setupTestDb(seed);
const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('learning paths (Modules landing and path overview)', () => {
  let hosea;
  let nadia;
  let admin;

  before(async () => {
    [hosea, nadia, admin] = await Promise.all([
      login(app, 'hosea@gapcheck.test'), login(app, 'nadia@gapcheck.test'), login(app, 'admin@gapcheck.test'),
    ]);
  });

  const list = async (token) => (await request(app).get('/paths').set(auth(token))).body.paths;
  const overview = (token, level) => request(app).get(`/paths/${level}`).set(auth(token));

  it('lists the three paths in order 01 New, 02 Beginner, 03 Intermediate with counts', async () => {
    const paths = await list(hosea);
    assert.deepEqual(paths.map((p) => [p.order, p.level, p.module_count]), [[1, 'new', 6], [2, 'beginner', 9], [3, 'intermediate', 2]]);
    assert.ok(paths.every((p) => p.title && p.description && p.estimated_minutes > 0));
    // Each card lists what the learner will study: the path's steps with their module counts.
    assert.deepEqual(paths[0].steps, [
      { title: 'Dasar JavaScript', module_count: 3 },
      { title: 'Manipulasi DOM', module_count: 1 },
      { title: 'Method array', module_count: 2 },
    ]);
  });

  it('own level is current, lower levels are review, higher levels stay locked', async () => {
    const paths = await list(hosea);
    assert.deepEqual(paths.map((p) => [p.level, p.access]), [
      ['new', 'review'], ['beginner', 'current'], ['intermediate', 'locked'],
    ]);
    // The old booleans still describe the same three states for existing callers.
    assert.deepEqual(paths.map((p) => [p.locked, p.current]), [
      [false, false], [false, true], [true, false],
    ]);
  });

  it('a learner without a level has every path locked; the admin has every path open', async () => {
    assert.ok((await list(nadia)).every((p) => p.locked && !p.current));
    assert.ok((await list(admin)).every((p) => !p.locked));
  });

  it('the overview of the learner\'s path has steps, outcomes, Bloom range, sources and where to continue', async () => {
    const res = await overview(hosea, 'beginner');
    assert.equal(res.status, 200);
    const { path, next_module } = res.body;
    assert.equal(path.order, 2);
    assert.ok(path.overview.length > 0);
    assert.ok(path.outcomes.length > 0);
    assert.deepEqual(path.steps.map((s) => [s.topic, s.modules.length]), [['async', 4], ['rest-api', 3], ['react', 2]]);
    assert.equal(path.bloom_from, 'understand');
    assert.equal(path.bloom_to, 'apply');
    // hosea passed module 1 and is on module 2, whose quiz unlocks module 3.
    assert.deepEqual(path.steps[0].modules.map((m) => [m.order, m.locked, m.state]), [
      [1, false, 'completed'], [2, false, 'in_progress'], [3, true, null], [4, true, null],
    ]);
    assert.deepEqual([next_module.order, next_module.started], [2, true]);
    // Sources are the modules' references, each listed once.
    const urls = path.sources.map((s) => s.url);
    assert.ok(urls.length > 0);
    assert.equal(new Set(urls).size, urls.length);
    // The outline never carries module content or quiz keys.
    const json = JSON.stringify(res.body);
    for (const leak of ['correct_answer', 'explanation', '"body"', '"quiz"']) assert.equal(json.includes(leak), false, leak);
  });

  it('the new path climbs Bloom from remember and starts at module 01', async () => {
    const res = await overview(admin, 'new');
    assert.equal(res.status, 200);
    assert.equal(res.body.path.bloom_from, 'remember');
    assert.equal(res.body.path.bloom_to, 'apply');
    assert.deepEqual([res.body.next_module.order, res.body.next_module.started], [1, false]);
  });

  it('403 for a locked path, 404 for an unknown level, 401 without a token', async () => {
    // 'new' is below hosea's level and therefore open now; 'intermediate' is above it.
    const locked = await overview(hosea, 'intermediate');
    assert.equal(locked.status, 403);
    assert.equal(locked.body.reason, 'path_locked');
    assert.equal((await overview(nadia, 'beginner')).status, 403);
    const unknown = await overview(hosea, 'expert');
    assert.equal(unknown.status, 404);
    assert.equal(unknown.body.reason, 'unknown_path');
    assert.equal((await request(app).get('/paths')).status, 401);
  });

  it('a level the learner has passed is open and never gated by its quizzes', async () => {
    const res = await overview(hosea, 'new');
    assert.equal(res.status, 200);
    const modules = res.body.path.steps.flatMap((s) => s.modules);
    assert.equal(modules.length, 6);
    // Spec A5b: sequential `requires` gating applies inside the learner's own
    // path only, so revisiting never means passing module 1's quiz again.
    assert.deepEqual(modules.filter((m) => m.locked).map((m) => m.order), []);
  });

  it('a module in a review path can be started without a module_locked refusal', async () => {
    const { path } = (await overview(hosea, 'new')).body;
    // Module 3 has an unpassed prerequisite; in hosea's own path that would be 403.
    const third = path.steps.flatMap((s) => s.modules).find((m) => m.order === 3);
    const res = await request(app).post(`/modules/${third._id}/start`).set(auth(hosea));
    assert.notEqual(res.status, 403);
  });

  it('an opened module names its path so the page can link back to the overview', async () => {
    const { path } = (await overview(hosea, 'beginner')).body;
    const mod = await request(app).get(`/modules/${path.steps[0].modules[0]._id}`).set(auth(hosea));
    assert.deepEqual(mod.body.path, { level: 'beginner', title: 'REST API dan React' });
  });
});
