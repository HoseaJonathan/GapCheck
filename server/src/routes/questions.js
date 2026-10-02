import { Router } from 'express';
import { questions } from '../data/seed.js';
import { SESSION_DURATION_SECONDS } from '../config.js';

const router = Router();
const VALID_DIFFICULTY = ['easy', 'medium', 'hard'];

/**
 * GET /questions?difficulty=
 * This endpoint is itself one of the seeded diagnostic questions, so the real
 * implementation has to match the behaviour the question asserts:
 *   no parameter -> all published, valid value -> filtered,
 *   invalid value -> 400, and a rejected query never hangs the request.
 */
router.get('/questions', (req, res) => {
  const { difficulty } = req.query;
  let set = questions.filter((q) => q.is_published);

  if (difficulty !== undefined) {
    if (!VALID_DIFFICULTY.includes(difficulty)) {
      return res.status(400).json({
        error: 'Bad Request',
        reason: 'invalid_difficulty',
        allowed: VALID_DIFFICULTY,
      });
    }
    set = set.filter((q) => q.difficulty === difficulty);
  }

  // Hidden test cases and correct answers never leave the server.
  const safe = set.map(({ correct_answer, test_cases, ...q }) => ({
    ...q,
    test_cases: (test_cases || []).filter((c) => !c.is_hidden),
    hidden_case_count: (test_cases || []).filter((c) => c.is_hidden).length,
  }));

  res.json({ questions: safe, session_duration_seconds: SESSION_DURATION_SECONDS });
});

export default router;
