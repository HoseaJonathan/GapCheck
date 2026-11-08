import { Router } from 'express';
import { HttpError } from '../errors.js';
import { LEVELS } from '../learning.js';
import { requireAuth } from '../middleware/auth.js';
import User from '../models/User.js';
import { isAdminUser } from '../services/admin.js';

const router = Router();

/** Dev/demo only: the admin switches their own level to browse another learning path. */
router.patch('/admin/level', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.sub);
  if (!user) throw new HttpError(401, 'unknown_user');
  if (!isAdminUser(user)) throw new HttpError(403, 'admin_only');
  const { level } = req.body ?? {};
  if (!LEVELS.includes(level)) throw new HttpError(400, 'invalid_level');
  user.level = level;
  await user.save();
  res.json({ level: user.level });
});

export default router;
