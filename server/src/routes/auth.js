import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { JWT_SECRET } from '../config.js';
import { HttpError } from '../errors.js';
import { requireAuth } from '../middleware/auth.js';
import User from '../models/User.js';

const router = Router();

const publicUser = (u) => ({
  _id: u._id, username: u.username, email: u.email,
  level: u.level, diagnostic_status: u.diagnostic_status,
  profile: u.profile, statistics: u.statistics,
});

router.post(
  '/auth/register',
  body('email').isEmail(), body('username').isLength({ min: 3 }),
  body('password').isLength({ min: 8 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Bad Request', details: errors.array() });

    const { username, email, password } = req.body;
    let user;
    try {
      user = await User.create({
        username, email,
        password_hash: await bcrypt.hash(password, 10),
        profile: { display_name: username, initials: username.slice(0, 2).toUpperCase() },
      });
    } catch (err) {
      // The unique index is the only race-free check; a find-then-insert could let two requests through.
      if (err?.code === 11000) throw new HttpError(409, 'email_taken');
      throw err;
    }
    res.status(201).json({ user_id: user._id });
  }
);

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  // Non-string values would otherwise be read as Mongo operators (NoSQL injection) or crash bcrypt.
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new HttpError(401, 'bad_credentials');
  }
  const user = await User.findOne({ email });
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) throw new HttpError(401, 'bad_credentials');

  const token = jwt.sign({ sub: String(user._id), username: user.username }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, user: publicUser(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.sub);
  if (!user) throw new HttpError(401, 'unknown_user');
  res.json(publicUser(user));
});

export default router;
