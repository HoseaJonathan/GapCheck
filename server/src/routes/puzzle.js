import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { puzzle } from '../data/puzzle.static.js';

const router = Router();

router.get('/puzzle', requireAuth, (req, res) => res.json({ puzzle }));

export default router;
