/**
 * OPEN DECISION (contradiction #3): BAB 3 specifies an execution ceiling of
 * <= 10 seconds. Module 04 copy says "inside the 5-second ceiling" and the
 * submissions table shows a Time Limit Exceeded verdict at exactly 5.00 s.
 * Named constant so one edit settles it once the team decides.
 */
export const EXECUTION_CEILING_MS = 5000;

/** OPEN DECISION (contradiction #7): no time limit exists in the proposal. */
export const SESSION_DURATION_SECONDS = 60 * 60;

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * No fallback: a default secret in source would let anyone who reads the repo
 * sign tokens. 32 characters is the floor for an HS256 key worth the name.
 */
function requireSecret(name) {
  const value = process.env[name];
  if (!value || value.length < 32 || value === 'dev-only-change-me') {
    throw new Error(
      `${name} belum diisi atau kurang dari 32 karakter. Buat dengan: `
      + `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))" `
      + 'lalu simpan di server/.env',
    );
  }
  return value;
}

export const JWT_SECRET = requireSecret('JWT_SECRET');
// iss/aud pin a token to this API, so a token signed for another service with a shared secret is rejected.
export const JWT_ISSUER = 'gapcheck-api';
export const JWT_AUDIENCE = 'gapcheck-client';

/** Short-lived access JWT; the refresh token is opaque, stored hashed, and rotated on every use. */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
/** A refresh token replaced less than this long ago is a concurrent refresh (two tabs), not theft. */
export const REFRESH_REUSE_GRACE_SECONDS = 30;

/** bcrypt cost factor; each +1 doubles the work an attacker needs per guess. */
export const BCRYPT_ROUNDS = 12;

/** Failed logins per email+IP inside the window before login answers 429. */
export const LOGIN_MAX_FAILURES = 10;
export const LOGIN_FAILURE_WINDOW_SECONDS = 15 * 60;

/**
 * Prefix the browser sees in front of API paths (the Vite proxy maps /api -> the API).
 * The refresh cookie is scoped to <prefix>/auth so it is only sent to the auth endpoints.
 */
export const API_PUBLIC_PREFIX = process.env.API_PUBLIC_PREFIX ?? '/api';

export const PORT = Number(process.env.PORT || 4000);
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gapcheck';

/** A topic counts as solid at or above this score ratio, as a gap below GAP_TOPIC_THRESHOLD. */
export const SOLID_TOPIC_THRESHOLD = 0.75;
export const GAP_TOPIC_THRESHOLD = 0.5;

/**
 * The admin role is a dev/demo tool (open every module, see quiz keys, switch path,
 * retake any time). It is not part of BAB 3, so it never works in production.
 */
export const ADMIN_ENABLED = process.env.NODE_ENV !== 'production';

/** A module quiz is passed at or above this score ratio. */
export const QUIZ_PASS_THRESHOLD = 0.7;
