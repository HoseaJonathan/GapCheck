import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { EXECUTION_CEILING_MS } from '../config.js';
import { questions, submissions } from '../data/seed.js';
import { scoreSubmission } from '../scoring.js';

const router = Router();

const VERDICTS = ['Accepted', 'Wrong Answer', 'Runtime Error', 'Time Limit Exceeded'];

/**
 * Stub stand-in for the Judge0 pipeline (phase 5). Same shape the real
 * adapter will return, so the client does not change when Judge0 lands:
 * token -> poll -> verdict + runtime + memory.
 */
function fakeJudge0(question, code) {
  const cases = question.test_cases || [];
  const looksAnswered = typeof code === 'string' && code.replace(/\s/g, '').length > 120;
  const passed = looksAnswered ? cases.length : Math.min(2, cases.length);
  const runtime_ms = looksAnswered ? 80 + Math.floor(Math.random() * 60) : EXECUTION_CEILING_MS;

  let verdict;
  if (passed >= cases.length && cases.length > 0) verdict = 'Accepted';
  else if (runtime_ms >= EXECUTION_CEILING_MS) verdict = 'Time Limit Exceeded';
  else verdict = 'Wrong Answer';

  return {
    judge0_token: `stub-${Date.now().toString(36)}`,
    verdict, runtime_ms, memory_kb: 8192 + passed * 1024,
    passed_cases: passed, total_cases: cases.length,
    cases: cases.map((c, i) => ({
      name: c.name, passed: i < passed,
      runtime_ms: Math.floor(runtime_ms / Math.max(cases.length, 1)),
    })),
  };
}

// POST /submit and POST /submissions both appear in the sequence diagrams:
// /submit is the client-facing call, /submissions is the backend -> Judge0 hop.
router.post(['/submit', '/submissions'], requireAuth, (req, res) => {
  const { question_id, submitted_code, answer, language_id = 63 } = req.body || {};
  const question = questions.find((q) => q._id === question_id);
  if (!question) return res.status(404).json({ error: 'Not Found', reason: 'unknown_question' });

  const run = question.type === 'mcq'
    ? { verdict: answer === question.correct_answer ? 'Accepted' : 'Wrong Answer', runtime_ms: 0, memory_kb: 0, cases: [] }
    : fakeJudge0(question, submitted_code);

  const record = {
    _id: `sub${submissions.length + 1}`,
    user_id: req.user.sub,
    question_id,
    question_title: question.title,
    difficulty: question.difficulty,
    submitted_code, answer, language_id,
    ...run,
    is_diagnostic: true,
    submitted_at: new Date().toISOString(),
  };
  record.points_earned = scoreSubmission(record, question);
  submissions.push(record);

  res.status(201).json(record);
});

router.get('/submissions', requireAuth, (req, res) => {
  res.json({ submissions: [...submissions].reverse(), verdicts: VERDICTS });
});

export default router;
