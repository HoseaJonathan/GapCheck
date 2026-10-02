import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';

/**
 * JWT verification runs BEFORE any code reaches Judge0 — the activity diagram
 * calls this out, so it has its own black box test case (invalid token -> 401).
 */
export function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Unauthorized', reason: 'missing_token' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized', reason: 'invalid_token' });
  }
}
