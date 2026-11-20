import {
  ACCESS_TOKEN_TTL_SECONDS, API_PUBLIC_PREFIX, CLIENT_ORIGIN, IS_PRODUCTION, REFRESH_TOKEN_TTL_SECONDS,
} from '../config.js';
import { HttpError } from '../errors.js';
import { verifyAccessToken } from '../services/tokens.js';

export const ACCESS_COOKIE = 'gc_access';
export const REFRESH_COOKIE = 'gc_refresh';

// httpOnly keeps both tokens away from page scripts (an XSS cannot read them);
// SameSite=Strict keeps other sites from making the browser send them.
const baseCookie = { httpOnly: true, secure: IS_PRODUCTION, sameSite: 'strict' };
const accessCookie = { ...baseCookie, path: '/' };
// The refresh token only travels to the auth endpoints, never with ordinary API calls.
const refreshCookie = { ...baseCookie, path: `${API_PUBLIC_PREFIX}/auth` };

export function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie(ACCESS_COOKIE, accessToken, { ...accessCookie, maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000 });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...refreshCookie, maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000 });
}

export function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE, accessCookie);
  res.clearCookie(REFRESH_COOKIE, refreshCookie);
}

/**
 * Authentication only: establishes who the caller is and sets req.user = { sub, sid }.
 * What they may touch is decided per route by scoping every query to req.user.sub.
 *
 * JWT verification runs BEFORE any code reaches Judge0 — the activity diagram
 * calls this out, so it has its own black box test case (invalid token -> 401).
 *
 * The browser sends the httpOnly cookie; a Bearer header is accepted for
 * non-browser clients (tests, curl). Both carry the same short-lived access JWT.
 */
export function accessTokenOf(req) {
  const [scheme, bearer] = (req.get('authorization') || '').split(' ');
  return req.cookies?.[ACCESS_COOKIE] || (scheme === 'Bearer' && bearer) || null;
}

export async function requireAuth(req, res, next) {
  const token = accessTokenOf(req);
  if (!token) throw new HttpError(401, 'missing_token');
  req.user = await verifyAccessToken(token);
  next();
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF guard on top of SameSite: a page on another origin that is still "same site"
 * (another port on localhost, a sibling subdomain) would otherwise get the cookies sent.
 * Browsers always attach Origin to cross-origin writes; requests without one are not
 * from a browser page, so they carry no ambient cookies worth protecting.
 */
export function checkOrigin(req, res, next) {
  const origin = req.get('origin');
  if (SAFE_METHODS.has(req.method) || !origin || origin === CLIENT_ORIGIN) return next();
  throw new HttpError(403, 'bad_origin');
}
