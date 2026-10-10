import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import Submission from '../models/Submission.js';
import { recordSubmission } from '../services/sessions.js';

const router = Router();

const VERDICTS = ['Accepted', 'Wrong Answer', 'Runtime Error', 'Time Limit Exceeded'];

// POST /submit and POST /submissions both appear in the sequence diagrams:
// /submit is the client-facing call, /submissions is the backend -> Judge0 hop.
router.post(['/submit', '/submissions'], requireAuth, async (req, res) => {
  res.status(201).json(await recordSubmission(req.user.sub, req.body));
});

router.get('/submissions', requireAuth, async (req, res) => {
  // _id breaks ties between submissions stored within the same millisecond.
  const submissions = await Submission.find({ user_id: req.user.sub }).sort({ submitted_at: -1, _id: -1 }).lean();
  res.json({ submissions, verdicts: VERDICTS });
});

export default router;
