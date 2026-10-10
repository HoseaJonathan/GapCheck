import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import { JWT_SECRET } from '../config.js';
import User from '../models/User.js';
import { setupTestDb, login } from './helpers.js';

const { app } = setupTestDb(async () => {
  const password_hash = await bcrypt.hash('password123', 4);
  await User.create([
    { username: 'hosea', email: 'hosea@gapcheck.test', password_hash },
    { username: 'second', email: 'second@gapcheck.test', password_hash },
  ]);
});

describe('POST /auth/login', () => {
  it('returns a token and the public user for valid credentials', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'hosea@gapcheck.test', password: 'password123' });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, 'hosea@gapcheck.test');
    assert.equal(res.body.user.password_hash, undefined);
  });

  it('rejects a wrong password with 401 bad_credentials', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'hosea@gapcheck.test', password: 'nope' });
    assert.equal(res.status, 401);
    assert.equal(res.body.reason, 'bad_credentials');
  });

  it('answers 401, not 500, for an empty body', async () => {
    const res = await request(app).post('/auth/login').send({});
    assert.equal(res.status, 401);
    assert.equal(res.body.reason, 'bad_credentials');
  });

  it('answers 401 when password is not a string', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'hosea@gapcheck.test', password: 123 });
    assert.equal(res.status, 401);
  });
});

describe('GET /me', () => {
  it('requires a token', async () => {
    const res = await request(app).get('/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.reason, 'missing_token');
  });

  it('rejects a malformed token', async () => {
    const res = await request(app).get('/me').set('Authorization', 'Bearer abc');
    assert.equal(res.status, 401);
    assert.equal(res.body.reason, 'invalid_token');
  });

  it('returns the logged-in user without password_hash', async () => {
    const token = await login(app, 'hosea@gapcheck.test');
    const res = await request(app).get('/me').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.email, 'hosea@gapcheck.test');
    assert.equal(res.body.password_hash, undefined);
  });

  it('returns the user of the token, not always the first user', async () => {
    const token = await login(app, 'second@gapcheck.test');
    const res = await request(app).get('/me').set('Authorization', `Bearer ${token}`);
    assert.equal(res.body.email, 'second@gapcheck.test');
  });

  it('rejects a valid token whose user no longer exists with 401 unknown_user', async () => {
    const token = jwt.sign({ sub: String(new mongoose.Types.ObjectId()) }, JWT_SECRET);
    const res = await request(app).get('/me').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 401);
    assert.equal(res.body.reason, 'unknown_user');
  });
});

describe('POST /auth/register', () => {
  it('rejects an existing email with 409 email_taken', async () => {
    const res = await request(app).post('/auth/register')
      .send({ username: 'dupe', email: 'hosea@gapcheck.test', password: 'password123' });
    assert.equal(res.status, 409);
    assert.equal(res.body.reason, 'email_taken');
  });

  it('creates a new user and returns its user_id', async () => {
    const res = await request(app).post('/auth/register')
      .send({ username: 'newbie', email: 'newbie@gapcheck.test', password: 'password123' });
    assert.equal(res.status, 201);
    assert.ok(res.body.user_id);
    const saved = await User.findById(res.body.user_id);
    assert.equal(saved.level, null);
    assert.equal(saved.profile.initials, 'NE');
    assert.notEqual(saved.password_hash, 'password123');
  });
});
