import { LOGIN_FAILURE_WINDOW_SECONDS, LOGIN_MAX_FAILURES } from '../config.js';

/**
 * Slows password guessing: after LOGIN_MAX_FAILURES failures for one email from one IP
 * inside the window, login answers 429 until the window passes. Kept in memory, so it
 * resets on restart and is per process — enough for a single API instance.
 */
const failures = new Map();
const WINDOW_MS = LOGIN_FAILURE_WINDOW_SECONDS * 1000;

const keyOf = (ip, email) => `${ip}|${email}`;

function live(key, now) {
  const entry = failures.get(key);
  if (entry && now - entry.first >= WINDOW_MS) {
    failures.delete(key);
    return null;
  }
  return entry ?? null;
}

/** Seconds until the caller may try again, or 0 when not locked. */
export function lockedFor(ip, email, now = Date.now()) {
  const entry = live(keyOf(ip, email), now);
  if (!entry || entry.count < LOGIN_MAX_FAILURES) return 0;
  return Math.ceil((entry.first + WINDOW_MS - now) / 1000);
}

export function recordFailure(ip, email, now = Date.now()) {
  const key = keyOf(ip, email);
  const entry = live(key, now);
  if (entry) entry.count += 1;
  else failures.set(key, { first: now, count: 1 });
}

export function clearFailures(ip, email) {
  failures.delete(keyOf(ip, email));
}

/** Test hook: every suite starts with no lockouts. */
export function resetLoginLimiter() {
  failures.clear();
}
