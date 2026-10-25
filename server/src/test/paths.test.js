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

  it('only the learner\'s own level is open, lower levels included', async () => {
    const paths = await list(hosea);
    assert.deepEqual(paths.map((p) => [p.level, p.locked, p.current]), [
      ['new', true, false], ['beginner', false, true], ['intermediate', true, false],
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
    const locked = await overview(hosea, 'new');
    assert.equal(locked.status, 403);
    assert.equal(locked.body.reason, 'path_locked');
    assert.equal((await overview(nadia, 'beginner')).status, 403);
    const unknown = await overview(hosea, 'expert');
    assert.equal(unknown.status, 404);
    assert.equal(unknown.body.reason, 'unknown_path');
    assert.equal((await request(app).get('/paths')).status, 401);
  });

  it('an opened module names its path so the page can link back to the overview', async () => {
    const { path } = (await overview(hosea, 'beginner')).body;
    const mod = await request(app).get(`/modules/${path.steps[0].modules[0]._id}`).set(auth(hosea));
    assert.deepEqual(mod.body.path, { level: 'beginner', title: 'REST API dan React' });
  });
});
