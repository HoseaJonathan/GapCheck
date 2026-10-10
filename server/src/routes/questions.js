import { Router } from 'express';
import { SESSION_DURATION_SECONDS } from '../config.js';
import { HttpError } from '../errors.js';
import { listPublished, toSafeQuestion } from '../services/questions.js';

const router = Router();
const VALID_DIFFICULTY = ['easy', 'medium', 'hard'];

/**
 * GET /questions?difficulty=
 * This endpoint is itself one of the seeded diagnostic questions, so the real
 * implementation has to match the behaviour the question asserts:
 *   no parameter -> all published, valid value -> filtered,
 *   invalid value -> 400, and a rejected query never hangs the request.
 */
router.get('/questions', async (req, res) => {
  const { difficulty } = req.query;

  if (difficulty !== undefined && !VALID_DIFFICULTY.includes(difficulty)) {
    throw new HttpError(400, 'invalid_difficulty', { allowed: VALID_DIFFICULTY });
  }

  const set = await listPublished(difficulty);
  // Hidden test cases and correct answers never leave the server.
  res.json({ questions: set.map(toSafeQuestion), session_duration_seconds: SESSION_DURATION_SECONDS });
});

export default router;
