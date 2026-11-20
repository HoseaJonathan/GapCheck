import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import {
  ACCESS_TOKEN_TTL_SECONDS, JWT_AUDIENCE, JWT_ISSUER, JWT_SECRET,
  REFRESH_REUSE_GRACE_SECONDS, REFRESH_TOKEN_TTL_SECONDS,
} from '../config.js';
import { HttpError } from '../errors.js';
import AuthSession from '../models/AuthSession.js';

// Pinned so a token with alg "none" or an asymmetric alg is never accepted.
const ALGORITHM = 'HS256';

const hashToken = (token) => createHash('sha256').update(token).digest('hex');
// 256 bits from the CSPRNG: unguessable, and fast to hash since it needs no slow KDF.
const newRefreshToken = () => randomBytes(32).toString('base64url');

export function signAccessToken(userId, sessionId) {
  return jwt.sign({ sid: String(sessionId) }, JWT_SECRET, {
    algorithm: ALGORITHM, subject: String(userId),
    issuer: JWT_ISSUER, audience: JWT_AUDIENCE, expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
}

/** Opens a session for a user who just proved their password. */
export async function createSession(userId, now = new Date()) {
  const refreshToken = newRefreshToken();
  const session = await AuthSession.create({
    user_id: userId,
    refresh_hash: hashToken(refreshToken),
    expires_at: new Date(now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000),
  });
  return { accessToken: signAccessToken(userId, session._id), refreshToken, session };
}

/**
 * Checks signature, algorithm, expiry, issuer, audience, and that the session is still live.
 * Throws HttpError 401 with a reason the client can act on: token_expired means "try a refresh".
 */
export async function verifyAccessToken(token) {
  let claims;
  try {
    claims = jwt.verify(token, JWT_SECRET, { algorithms: [ALGORITHM], issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
  } catch (err) {
    throw new HttpError(401, err instanceof jwt.TokenExpiredError ? 'token_expired' : 'invalid_token');
  }
  if (typeof claims.sub !== 'string' || typeof claims.sid !== 'string') throw new HttpError(401, 'invalid_token');

  const session = await AuthSession.findById(claims.sid).select('user_id revoked_at expires_at').lean()
    .catch(() => null); // a malformed sid is a bad token, not a server error
  if (!session || session.revoked_at || session.expires_at <= new Date() || String(session.user_id) !== claims.sub) {
    throw new HttpError(401, 'session_revoked');
  }
  return { sub: claims.sub, sid: claims.sid };
}

/**
 * Exchanges a refresh token for a new pair. The swap is one conditional update, so two
 * requests with the same token cannot both win. Presenting an already rotated token
 * outside the grace window means it was copied: the whole session is revoked.
 */
export async function rotateRefreshToken(refreshToken, now = new Date()) {
  if (typeof refreshToken !== 'string' || !refreshToken) throw new HttpError(401, 'missing_refresh_token');
  const hash = hashToken(refreshToken);
  const next = newRefreshToken();

  const session = await AuthSession.findOneAndUpdate(
    { refresh_hash: hash, revoked_at: null, expires_at: { $gt: now } },
    { $set: { refresh_hash: hashToken(next), previous_refresh_hash: hash, rotated_at: now } },
    { new: true },
  );
  if (session) return { accessToken: signAccessToken(session.user_id, session._id), refreshToken: next, session };

  const rotatedFrom = await AuthSession.findOne({ previous_refresh_hash: hash, revoked_at: null });
  if (rotatedFrom) {
    const ageSeconds = (now - rotatedFrom.rotated_at) / 1000;
    // Another tab refreshed a moment ago and the browser already holds its cookies; nothing to issue here.
    if (ageSeconds <= REFRESH_REUSE_GRACE_SECONDS) return { superseded: true };
    await AuthSession.updateOne({ _id: rotatedFrom._id }, { $set: { revoked_at: now, revoked_reason: 'refresh_reuse' } });
    throw new HttpError(401, 'refresh_reused');
  }
  throw new HttpError(401, 'invalid_refresh_token');
}

/** Logout: idempotent, and silent about whether the token matched anything. */
export async function revokeByRefreshToken(refreshToken, now = new Date()) {
  if (typeof refreshToken !== 'string' || !refreshToken) return;
  await AuthSession.updateOne(
    { refresh_hash: hashToken(refreshToken), revoked_at: null },
    { $set: { revoked_at: now, revoked_reason: 'logout' } },
  );
}

export async function revokeSession(sessionId, now = new Date()) {
  await AuthSession.updateOne({ _id: sessionId, revoked_at: null }, { $set: { revoked_at: now, revoked_reason: 'logout' } });
}
