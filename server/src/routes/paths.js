import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getPathOverview, listPaths } from '../services/paths.js';

const router = Router();

router.get('/paths', requireAuth, async (req, res) => {
  res.json({ paths: await listPaths(req.user.sub) });
});

router.get('/paths/:level', requireAuth, async (req, res) => {
  res.json(await getPathOverview(req.user.sub, req.params.level));
});

export default router;
