import { EXECUTION_CEILING_MS } from '../config.js';

/**
 * Stub stand-in for the Judge0 pipeline (phase 5). Same shape the real
 * adapter will return, so the client does not change when Judge0 lands:
 * token -> poll -> verdict + runtime + memory.
 */
export function fakeJudge0(question, code) {
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
