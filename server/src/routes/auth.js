import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { JWT_SECRET } from '../config.js';
import { users } from '../data/seed.js';

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
    if (users.some((u) => u.email === email)) {
      return res.status(409).json({ error: 'Conflict', reason: 'email_taken' });
    }
    const user = {
      _id: `u${users.length + 1}`, username, email,
      password_hash: await bcrypt.hash(password, 10),
      level: null, diagnostic_status: false,
      profile: { display_name: username, initials: username.slice(0, 2).toUpperCase() },
      statistics: { streak_days: 0, acceptance_rate: 0, bonus_points: 0 },
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    users.push(user);
    res.status(201).json({ user_id: user._id });
  }
);

router.post('/auth/login', body('email').isEmail(), async (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);
  const ok = user && (await bcrypt.compare(password || '', user.password_hash || ''));
  if (!ok) return res.status(401).json({ error: 'Unauthorized', reason: 'bad_credentials' });

  const token = jwt.sign({ sub: user._id, username: user.username }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, user: publicUser(user) });
});

router.get('/me', (req, res) => res.json(publicUser(users[0])));

export default router;
