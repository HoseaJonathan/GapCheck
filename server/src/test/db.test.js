import { test } from 'node:test';
import assert from 'node:assert/strict';

import { connect } from '../db.js';

test('connect failure keeps the Indonesian hint and the original error as cause', async () => {
  await assert.rejects(connect('not-a-mongodb-uri'), (err) => {
    assert.match(err.message, /MongoDB tidak terjangkau/);
    // The driver's own message is what tells a parse error apart from a server that is down.
    assert.ok(err.cause instanceof Error);
    return true;
  });
});
