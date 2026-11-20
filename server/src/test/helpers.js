import { before, after } from 'node:test';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { connect, disconnect } from '../db.js';
import { createApp } from '../app.js';

/** Registers node:test hooks that run an in-memory Mongo for the file; fixture() fills it. */
export function setupTestDb(fixture) {
  let mongod;
  const app = createApp();
  before(async () => {
    mongod = await MongoMemoryServer.create();
    await connect(mongod.getUri('gapcheck_test'));
    if (fixture) await fixture();
  });
  after(async () => {
    await disconnect();
    await mongod?.stop();
  });
  return { app };
}

/** Reads one cookie's value out of a response's Set-Cookie headers. */
export function cookieValue(res, name) {
  const line = (res.headers['set-cookie'] ?? []).find((c) => c.startsWith(`${name}=`));
  return line ? decodeURIComponent(line.split(';')[0].slice(name.length + 1)) : null;
}

/** Logs in and returns the access JWT from its cookie, for use as a Bearer token. */
export async function login(app, email, password = 'password123') {
  const res = await request(app).post('/auth/login').send({ email, password });
  return cookieValue(res, 'gc_access');
}
