import { Router } from 'express';
import { HttpError } from '../errors.js';
import { requireAuth } from '../middleware/auth.js';
import AssessmentSession from '../models/AssessmentSession.js';
import { expireIfDue, finishSession, startSession } from '../services/sessions.js';

const router = Router();

// 201 when a session was opened, 200 when the open one was resumed (also after losing a concurrent start).
// Any kind in the body is ignored: the server picks it from the retake rule.
router.post('/sessions', requireAuth, async (req, res) => {
  const { created, ...body } = await startSession(req.user.sub);
  res.status(created ? 201 : 200).json(body);
});

router.post('/sessions/:id/finish', requireAuth, async (req, res) => {
  const session = await AssessmentSession.findById(req.params.id);
  if (!session) throw new HttpError(404, 'unknown_session');
  if (String(session.user_id) !== req.user.sub) throw new HttpError(403, 'forbidden_session');
  // Checked here, before expireIfDue, which would otherwise treat an already finished session as just expired.
  if (session.status === 'finished') throw new HttpError(409, 'session_finished');

  // An overdue session is finished at its deadline; the learner still gets the result, not an error.
  if (await expireIfDue(session)) return res.json(await AssessmentSession.findById(session._id));
  res.json(await finishSession(session));
});

export default router;
