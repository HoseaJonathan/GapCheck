import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { BCRYPT_ROUNDS } from '../config.js';
import { HttpError } from '../errors.js';
import {
  REFRESH_COOKIE, accessTokenOf, clearAuthCookies, requireAuth, setAuthCookies,
} from '../middleware/auth.js';
import User from '../models/User.js';
import { isAdminUser } from '../services/admin.js';
import { clearFailures, lockedFor, recordFailure } from '../services/loginLimiter.js';
import {
  createSession, revokeByRefreshToken, revokeSession, rotateRefreshToken, verifyAccessToken,
} from '../services/tokens.js';

const router = Router();

const publicUser = (u) => ({
  _id: u._id, username: u.username, email: u.email,
  level: u.level, diagnostic_status: u.diagnostic_status,
  profile: u.profile, statistics: u.statistics,
  is_admin: isAdminUser(u),
});

// Compared against when the email is unknown, so a miss costs the same bcrypt time as a
// wrong password and response timing does not reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-password', BCRYPT_ROUNDS);

// bcrypt only reads the first 72 bytes; a longer password would silently match its own prefix.
const MAX_PASSWORD_BYTES = 72;

const normaliseEmail = (email) => email.trim().toLowerCase();

const registerRules = [
  body('username').isString().withMessage('Username wajib diisi.').bail()
    .trim().isLength({ min: 3, max: 30 }).withMessage('Username 3–30 karakter.').bail()
    .matches(/^[a-zA-Z0-9_.-]+$/).withMessage('Username hanya boleh huruf, angka, titik, garis bawah, dan strip.'),
  body('email').isString().withMessage('Email wajib diisi.').bail()
    .trim().isEmail().withMessage('Format email tidak valid.').bail()
    .isLength({ max: 254 }).withMessage('Email terlalu panjang.'),
  body('password').isString().withMessage('Password wajib diisi.').bail()
    .isLength({ min: 8 }).withMessage('Password minimal 8 karakter.').bail()
    .custom((p) => Buffer.byteLength(p, 'utf8') <= MAX_PASSWORD_BYTES)
    .withMessage(`Password maksimal ${MAX_PASSWORD_BYTES} byte.`),
];

/** Same { error, reason, details } shape the central handler uses for schema validation. */
function assertValid(req) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return;
  const details = errors.array({ onlyFirstError: true }).map((e) => ({ path: e.path, message: e.msg }));
  throw new HttpError(400, 'validation_failed', { details });
}

router.post('/auth/register', registerRules, async (req, res) => {
  assertValid(req);
  const { username, password } = req.body;
  const email = normaliseEmail(req.body.email);

  let user;
  try {
    user = await User.create({
      username, email,
      password_hash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      profile: { display_name: username, initials: username.slice(0, 2).toUpperCase() },
    });
  } catch (err) {
    // The unique index is the only race-free check; a find-then-insert could let two requests through.
    if (err?.code === 11000) {
      throw new HttpError(409, err.keyPattern?.username ? 'username_taken' : 'email_taken');
    }
    throw err;
  }
  res.status(201).json({ user_id: user._id });
});

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  // Non-string values would otherwise be read as Mongo operators (NoSQL injection) or crash bcrypt.
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    throw new HttpError(400, 'missing_credentials');
  }
  const normalised = normaliseEmail(email);
  const retryAfter = lockedFor(req.ip, normalised);
  if (retryAfter) {
    res.set('Retry-After', String(retryAfter));
    throw new HttpError(429, 'too_many_attempts', { retry_after_seconds: retryAfter });
  }

  const user = await User.findOne({ email: normalised });
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  // One reason for both an unknown email and a wrong password, so login cannot be used to probe accounts.
  if (!user || !ok) {
    recordFailure(req.ip, normalised);
    throw new HttpError(401, 'bad_credentials');
  }
  clearFailures(req.ip, normalised);

  const tokens = await createSession(user._id);
  setAuthCookies(res, tokens);
  // Tokens stay in httpOnly cookies only; the body never carries them, so page scripts never see one.
  res.json({ user: publicUser(user) });
});

router.post('/auth/refresh', async (req, res) => {
  let result;
  try {
    result = await rotateRefreshToken(req.cookies?.[REFRESH_COOKIE]);
  } catch (err) {
    // A dead refresh token is dead for good; clearing stops the browser from replaying it.
    clearAuthCookies(res);
    throw err;
  }
  if (!result.superseded) setAuthCookies(res, result);
  res.json({ ok: true });
});

/**
 * Revokes the session server-side, so the access JWT stops working immediately
 * (requireAuth checks the session), not only when it expires. Always 204, even when
 * the cookies were already gone or expired: logging out twice is not an error.
 */
router.post('/auth/logout', async (req, res) => {
  await revokeByRefreshToken(req.cookies?.[REFRESH_COOKIE]);
  // A caller with only an access token (a Bearer client, or an expired refresh cookie) still ends its session.
  const access = accessTokenOf(req);
  if (access) {
    const claims = await verifyAccessToken(access).catch(() => null);
    if (claims) await revokeSession(claims.sid);
  }
  clearAuthCookies(res);
  res.status(204).end();
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.sub);
  if (!user) throw new HttpError(401, 'unknown_user');
  res.json(publicUser(user));
});

export default router;
