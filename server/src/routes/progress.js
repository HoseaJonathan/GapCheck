import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getOverview, getProgress } from '../services/views.js';

const router = Router();

router.get('/progress', requireAuth, async (req, res) => {
  res.json(await getProgress(req.user.sub));
});

router.get('/overview', requireAuth, async (req, res) => {
  res.json(await getOverview(req.user.sub));
});

export default router;
