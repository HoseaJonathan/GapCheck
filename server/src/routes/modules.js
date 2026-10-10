import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { checkQuizAnswer, getModule, listModules } from '../services/modules.js';

const router = Router();

router.get('/modules', requireAuth, async (req, res) => {
  res.json({ modules: await listModules(req.user.sub) });
});

router.get('/modules/:id', requireAuth, async (req, res) => {
  res.json(await getModule(req.user.sub, req.params.id));
});

router.post('/modules/:id/quiz/:index/check', requireAuth, async (req, res) => {
  res.json(await checkQuizAnswer(req.params.id, req.params.index, req.body?.answer));
});

export default router;
