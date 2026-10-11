import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getModule, listModules, listQuizAttempts, startModule, submitQuizAttempt } from '../services/modules.js';

const router = Router();

router.get('/modules', requireAuth, async (req, res) => {
  res.json({ modules: await listModules(req.user.sub) });
});

router.get('/modules/:id', requireAuth, async (req, res) => {
  res.json(await getModule(req.user.sub, req.params.id));
});

router.post('/modules/:id/start', requireAuth, async (req, res) => {
  res.json(await startModule(req.user.sub, req.params.id));
});

router.post('/modules/:id/quiz/attempts', requireAuth, async (req, res) => {
  res.status(201).json(await submitQuizAttempt(req.user.sub, req.params.id, req.body?.answers));
});

router.get('/modules/:id/quiz/attempts', requireAuth, async (req, res) => {
  res.json(await listQuizAttempts(req.user.sub, req.params.id));
});

export default router;
