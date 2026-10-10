import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getResult } from '../services/views.js';

const router = Router();

// The latest analysable session, or { result: null } before the first diagnostic.
router.get('/result', requireAuth, async (req, res) => {
  res.json(await getResult(req.user.sub));
});

export default router;
