import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import { JWT_AUDIENCE, JWT_ISSUER, JWT_SECRET, LOGIN_MAX_FAILURES, REFRESH_REUSE_GRACE_SECONDS } from '../config.js';
import AuthSession from '../models/AuthSession.js';
import User from '../models/User.js';
import { resetLoginLimiter } from '../services/loginLimiter.js';
import { createSession, rotateRefreshToken } from '../services/tokens.js';
import { seed } from '../seed/seed.js';
import { cookieValue, setupTestDb, login } from './helpers.js';

const { app } = setupTestDb(seed);
beforeEach(() => resetLoginLimiter());

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const sign = (payload, options = {}) => jwt.sign(payload, JWT_SECRET, {
  algorithm: 'HS256', issuer: JWT_ISSUER, audience: JWT_AUDIENCE, expiresIn: 60, ...options,
});
async function liveSessionFor(email) {
  const user = await User.findOne({ email });
  const { session } = await createSession(user._id);
  return { user, session };
}

describe('POST /auth/register', () => {
  it('creates a user, hashes the password, and returns only user_id', async () => {
    const res = await request(app).post('/auth/register')
      .send({ username: 'newbie', email: 'Newbie@GapCheck.test ', password: 'password123' });
    assert.equal(res.status, 201);
    assert.deepEqual(Object.keys(res.body), ['user_id']);
    const saved = await User.findById(res.body.user_id);
    assert.equal(saved.email, 'newbie@gapcheck.test', 'email is trimmed and lowercased');
    assert.equal(saved.level, null);
    assert.equal(saved.role, 'learner');
    assert.equal(saved.profile.initials, 'NE');
    assert.match(saved.password_hash, /^\$2[aby]\$12\$/, 'bcrypt, cost 12');
    assert.equal(res.headers['set-cookie'], undefined, 'register does not log in by itself');
  });

  it('ignores a role sent by the client', async () => {
    const res = await request(app).post('/auth/register')
      .send({ username: 'sneaky', email: 'sneaky@gapcheck.test', password: 'password123', role: 'admin' });
    assert.equal(res.status, 201);
    assert.equal((await User.findById(res.body.user_id)).role, 'learner');
  });

  it('rejects an existing email with 409 email_taken, case-insensitively', async () => {
    const res = await request(app).post('/auth/register')
      .send({ username: 'dupe', email: 'HOSEA@gapcheck.test', password: 'password123' });
    assert.equal(res.status, 409);
    assert.equal(res.body.reason, 'email_taken');
  });

  it('rejects an existing username with 409 username_taken', async () => {
    const res = await request(app).post('/auth/register')
      .send({ username: 'hosea', email: 'other@gapcheck.test', password: 'password123' });
    assert.equal(res.status, 409);
    assert.equal(res.body.reason, 'username_taken');
  });

  it('answers 400 validation_failed with one message per bad field', async () => {
    const res = await request(app).post('/auth/register').send({ username: 'a', email: 'not-an-email', password: 'short' });
    assert.equal(res.status, 400);
    assert.equal(res.body.reason, 'validation_failed');
    assert.deepEqual(res.body.details.map((d) => d.path).sort(), ['email', 'password', 'username']);
  });

  it('answers 400 for missing fields and for non-string values', async () => {
    for (const body of [{}, { username: ['x'], email: { $ne: '' }, password: 12345678 }]) {
      const res = await request(app).post('/auth/register').send(body);
      assert.equal(res.status, 400);
      assert.equal(res.body.reason, 'validation_failed');
    }
  });

  // Boundary values: 8 is the shortest accepted password, 72 bytes the longest bcrypt reads in full.
  it('accepts passwords of 8 and 72 bytes, rejects 7 and 73', async () => {
    const cases = [[7, 400], [8, 201], [72, 201], [73, 400]];
    for (const [i, [len, status]] of cases.entries()) {
      const res = await request(app).post('/auth/register')
        .send({ username: `pw${i}len`, email: `pw${i}@gapcheck.test`, password: 'p'.repeat(len) });
      assert.equal(res.status, status, `length ${len}`);
    }
  });
});

describe('POST /auth/login', () => {
  it('sets httpOnly SameSite=Strict cookies and never puts a token in the body', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'hosea@gapcheck.test', password: 'password123' });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, 'hosea@gapcheck.test');
    assert.equal(res.body.user.password_hash, undefined);
    assert.equal(res.body.token, undefined);
    const cookies = res.headers['set-cookie'];
    for (const name of ['gc_access', 'gc_refresh']) {
      const line = cookies.find((c) => c.startsWith(`${name}=`));
      assert.ok(line, name);
      assert.match(line, /HttpOnly/);
      assert.match(line, /SameSite=Strict/);
    }
    assert.match(cookies.find((c) => c.startsWith('gc_refresh=')), /Path=\/auth/);
  });

  it('accepts the email in any case', async () => {
    const res = await request(app).post('/auth/login').send({ email: ' Hosea@GapCheck.test', password: 'password123' });
    assert.equal(res.status, 200);
  });

  it('issues an access JWT with sub, sid, iss, aud and a 15 minute expiry', async () => {
    const token = await login(app, 'hosea@gapcheck.test');
    const claims = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    const user = await User.findOne({ email: 'hosea@gapcheck.test' });
    assert.equal(claims.sub, String(user._id));
    assert.ok(await AuthSession.exists({ _id: claims.sid, user_id: user._id }));
    assert.equal(claims.iss, JWT_ISSUER);
    assert.equal(claims.aud, JWT_AUDIENCE);
    assert.equal(claims.exp - claims.iat, 15 * 60);
  });

  it('answers the same 401 bad_credentials for a wrong password and an unknown email', async () => {
    const wrong = await request(app).post('/auth/login').send({ email: 'hosea@gapcheck.test', password: 'nope-nope' });
    const unknown = await request(app).post('/auth/login').send({ email: 'ghost@gapcheck.test', password: 'nope-nope' });
    assert.equal(wrong.status, 401);
    assert.deepEqual(wrong.body, unknown.body);
    assert.equal(wrong.body.reason, 'bad_credentials');
    assert.equal(wrong.headers['set-cookie'], undefined);
  });

  it('answers 400 missing_credentials for an empty body, blanks, and non-strings', async () => {
    for (const body of [{}, { email: '', password: '' }, { email: 'hosea@gapcheck.test' },
      { email: 'hosea@gapcheck.test', password: 123 }, { email: { $ne: null }, password: 'x' }]) {
      const res = await request(app).post('/auth/login').send(body);
      assert.equal(res.status, 400, JSON.stringify(body));
      assert.equal(res.body.reason, 'missing_credentials');
    }
  });

  it(`locks one email from one IP after ${LOGIN_MAX_FAILURES} failures with 429`, async () => {
    for (let i = 0; i < LOGIN_MAX_FAILURES; i += 1) {
      await request(app).post('/auth/login').send({ email: 'nadia@gapcheck.test', password: 'wrong-guess' });
    }
    const locked = await request(app).post('/auth/login').send({ email: 'nadia@gapcheck.test', password: 'password123' });
    assert.equal(locked.status, 429);
    assert.equal(locked.body.reason, 'too_many_attempts');
    assert.ok(Number(locked.headers['retry-after']) > 0);
    const other = await request(app).post('/auth/login').send({ email: 'hosea@gapcheck.test', password: 'password123' });
    assert.equal(other.status, 200, 'other accounts are unaffected');
  });
});

describe('access token verification', () => {
  it('rejects a missing token with 401 missing_token', async () => {
    const res = await request(app).get('/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.reason, 'missing_token');
  });

  it('rejects a malformed token with 401 invalid_token', async () => {
    const res = await request(app).get('/me').set(bearer('abc'));
    assert.equal(res.status, 401);
    assert.equal(res.body.reason, 'invalid_token');
  });

  it('rejects a token signed with another secret', async () => {
    const { user, session } = await liveSessionFor('hosea@gapcheck.test');
    const forged = jwt.sign({ sid: String(session._id) }, 'x'.repeat(48), {
      subject: String(user._id), issuer: JWT_ISSUER, audience: JWT_AUDIENCE,
    });
    const res = await request(app).get('/me').set(bearer(forged));
    assert.equal(res.body.reason, 'invalid_token');
  });

  it('rejects an unsigned alg=none token', async () => {
    const { user, session } = await liveSessionFor('hosea@gapcheck.test');
    const none = jwt.sign({ sid: String(session._id), sub: String(user._id), iss: JWT_ISSUER, aud: JWT_AUDIENCE }, null, { algorithm: 'none' });
    const res = await request(app).get('/me').set(bearer(none));
    assert.equal(res.status, 401);
    assert.equal(res.body.reason, 'invalid_token');
  });

  it('rejects an expired token with 401 token_expired', async () => {
    const { user, session } = await liveSessionFor('hosea@gapcheck.test');
    const expired = jwt.sign(
      { sid: String(session._id), sub: String(user._id), iss: JWT_ISSUER, aud: JWT_AUDIENCE, exp: Math.floor(Date.now() / 1000) - 10 },
      JWT_SECRET,
    );
    const res = await request(app).get('/me').set(bearer(expired));
    assert.equal(res.status, 401);
    assert.equal(res.body.reason, 'token_expired');
  });

  it('rejects a token for another audience or issuer', async () => {
    const { user, session } = await liveSessionFor('hosea@gapcheck.test');
    for (const opts of [{ audience: 'someone-else' }, { issuer: 'someone-else' }]) {
      const res = await request(app).get('/me').set(bearer(sign({ sid: String(session._id) }, { subject: String(user._id), ...opts })));
      assert.equal(res.body.reason, 'invalid_token');
    }
  });

  it('rejects a validly signed token without a session id', async () => {
    const user = await User.findOne({ email: 'hosea@gapcheck.test' });
    const res = await request(app).get('/me').set(bearer(sign({}, { subject: String(user._id) })));
    assert.equal(res.body.reason, 'invalid_token');
  });

  it('rejects a token whose sub does not own its session', async () => {
    const { session } = await liveSessionFor('hosea@gapcheck.test');
    const nadia = await User.findOne({ email: 'nadia@gapcheck.test' });
    const res = await request(app).get('/me').set(bearer(sign({ sid: String(session._id) }, { subject: String(nadia._id) })));
    assert.equal(res.status, 401);
    assert.equal(res.body.reason, 'session_revoked');
  });

  it('accepts the access cookie as well as the Bearer header', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'nadia@gapcheck.test', password: 'password123' });
    const me = await request(app).get('/me').set('Cookie', `gc_access=${cookieValue(res, 'gc_access')}`);
    assert.equal(me.status, 200);
    assert.equal(me.body.email, 'nadia@gapcheck.test');
  });

  it('returns the user of the token, not always the first user', async () => {
    const token = await login(app, 'nadia@gapcheck.test');
    const res = await request(app).get('/me').set(bearer(token));
    assert.equal(res.body.email, 'nadia@gapcheck.test');
    assert.equal(res.body.password_hash, undefined);
  });

  it('rejects a live session whose user no longer exists with 401 unknown_user', async () => {
    const userId = new mongoose.Types.ObjectId();
    const { accessToken } = await createSession(userId);
    const res = await request(app).get('/me').set(bearer(accessToken));
    assert.equal(res.status, 401);
    assert.equal(res.body.reason, 'unknown_user');
  });
});

describe('POST /auth/refresh', () => {
  it('rotates the refresh token and issues a new access token', async () => {
    const agent = request.agent(app);
    const loginRes = await agent.post('/auth/login').send({ email: 'hosea@gapcheck.test', password: 'password123' });
    const res = await agent.post('/auth/refresh');
    assert.equal(res.status, 200);
    assert.equal(res.body.token, undefined);
    assert.notEqual(cookieValue(res, 'gc_refresh'), cookieValue(loginRes, 'gc_refresh'));
    assert.equal((await agent.get('/me')).status, 200);
  });

  it('answers 401 missing_refresh_token without a cookie', async () => {
    const res = await request(app).post('/auth/refresh');
    assert.equal(res.status, 401);
    assert.equal(res.body.reason, 'missing_refresh_token');
  });

  it('answers 401 invalid_refresh_token for a token it never issued, and clears the cookies', async () => {
    const res = await request(app).post('/auth/refresh').set('Cookie', 'gc_refresh=made-up');
    assert.equal(res.status, 401);
    assert.equal(res.body.reason, 'invalid_refresh_token');
    assert.ok(res.headers['set-cookie'].some((c) => c.startsWith('gc_refresh=;')));
  });

  it('treats a just-rotated token as a concurrent refresh, not theft', async () => {
    const user = await User.findOne({ email: 'hosea@gapcheck.test' });
    const { refreshToken, session } = await createSession(user._id);
    await rotateRefreshToken(refreshToken);
    assert.deepEqual(await rotateRefreshToken(refreshToken), { superseded: true });
    assert.equal((await AuthSession.findById(session._id)).revoked_at, null);
  });

  it('revokes the whole session when an old refresh token is replayed after the grace window', async () => {
    const user = await User.findOne({ email: 'hosea@gapcheck.test' });
    const { refreshToken, session } = await createSession(user._id);
    const rotated = await rotateRefreshToken(refreshToken);
    const later = new Date(Date.now() + (REFRESH_REUSE_GRACE_SECONDS + 1) * 1000);
    await assert.rejects(rotateRefreshToken(refreshToken, later), { status: 401, reason: 'refresh_reused' });
    assert.equal((await AuthSession.findById(session._id)).revoked_reason, 'refresh_reuse');
    // The attacker's copy and the victim's current pair both stop working.
    await assert.rejects(rotateRefreshToken(rotated.refreshToken), { reason: 'invalid_refresh_token' });
    const me = await request(app).get('/me').set(bearer(rotated.accessToken));
    assert.equal(me.body.reason, 'session_revoked');
  });

  it('refuses an expired refresh token', async () => {
    const user = await User.findOne({ email: 'hosea@gapcheck.test' });
    const { refreshToken } = await createSession(user._id, new Date(Date.now() - 8 * 24 * 3600 * 1000));
    await assert.rejects(rotateRefreshToken(refreshToken), { status: 401 });
  });
});

describe('POST /auth/logout', () => {
  it('revokes the session: the old access token and refresh token stop working at once', async () => {
    const agent = request.agent(app);
    const loginRes = await agent.post('/auth/login').send({ email: 'hosea@gapcheck.test', password: 'password123' });
    const access = cookieValue(loginRes, 'gc_access');
    const refresh = cookieValue(loginRes, 'gc_refresh');

    const out = await agent.post('/auth/logout');
    assert.equal(out.status, 204);
    assert.ok(out.headers['set-cookie'].some((c) => c.startsWith('gc_access=;')));

    const me = await request(app).get('/me').set(bearer(access));
    assert.equal(me.status, 401);
    assert.equal(me.body.reason, 'session_revoked');
    const again = await request(app).post('/auth/refresh').set('Cookie', `gc_refresh=${refresh}`);
    assert.equal(again.status, 401);
  });

  it('revokes a Bearer-only session too', async () => {
    const token = await login(app, 'nadia@gapcheck.test');
    assert.equal((await request(app).post('/auth/logout').set(bearer(token))).status, 204);
    assert.equal((await request(app).get('/me').set(bearer(token))).status, 401);
  });

  it('is idempotent: 204 without any cookie', async () => {
    assert.equal((await request(app).post('/auth/logout')).status, 204);
  });
});

describe('CSRF origin check', () => {
  it('refuses a write from another origin with 403 bad_origin', async () => {
    const res = await request(app).post('/auth/login').set('Origin', 'http://localhost:8080')
      .send({ email: 'hosea@gapcheck.test', password: 'password123' });
    assert.equal(res.status, 403);
    assert.equal(res.body.reason, 'bad_origin');
  });

  it('allows a write from the client origin', async () => {
    const res = await request(app).post('/auth/login').set('Origin', 'http://localhost:5173')
      .send({ email: 'hosea@gapcheck.test', password: 'password123' });
    assert.equal(res.status, 200);
  });
});

// Authorization: a valid token proves who the caller is; every query is still scoped to that user.
describe('authorization: one user cannot reach another user\'s data', () => {
  it('protected routes answer 401 without a token', async () => {
    for (const path of ['/questions', '/overview', '/progress', '/result', '/submissions', '/modules', '/paths']) {
      const res = await request(app).get(path);
      assert.equal(res.status, 401, path);
      assert.equal(res.body.reason, 'missing_token');
    }
  });

  it('another user\'s assessment session cannot be finished or answered into', async () => {
    const nadia = await login(app, 'nadia@gapcheck.test');
    const hosea = await login(app, 'hosea@gapcheck.test');
    const started = await request(app).post('/sessions').set(bearer(nadia));
    assert.ok([200, 201].includes(started.status), JSON.stringify(started.body));
    const sessionId = started.body.session._id;
    const questionId = started.body.questions[0]._id;

    const finish = await request(app).post(`/sessions/${sessionId}/finish`).set(bearer(hosea));
    assert.equal(finish.status, 403);
    assert.equal(finish.body.reason, 'forbidden_session');

    const submit = await request(app).post('/submit').set(bearer(hosea))
      .send({ session_id: sessionId, question_id: questionId, answer: 'a' });
    assert.equal(submit.status, 403);
    assert.equal(submit.body.reason, 'forbidden_session');
  });

  it('a user_id in the body or query does not widen GET /submissions', async () => {
    const nadiaUser = await User.findOne({ email: 'nadia@gapcheck.test' });
    const hosea = await login(app, 'hosea@gapcheck.test');
    const hoseaUser = await User.findOne({ email: 'hosea@gapcheck.test' });
    const res = await request(app).get(`/submissions?user_id=${nadiaUser._id}`).set(bearer(hosea));
    assert.equal(res.status, 200);
    assert.ok(res.body.submissions.every((s) => String(s.user_id) === String(hoseaUser._id)));
  });
});
