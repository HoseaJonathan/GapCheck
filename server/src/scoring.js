/**
 * Gap Check — level classification.
 *
 * Pure, no database access, no framework imports. The thesis needs this
 * function testable standalone (boundary value analysis at 40/41/70/71 plus
 * the canonical 168/290 fixture from the mockup).
 */

/** Difficulty weights. Proposal: Easy x1, Medium x2, Hard x3. Mockup: the same ratio x10. */
export const POINTS = Object.freeze({ easy: 10, medium: 20, hard: 30 });

/** Band edges as displayed in the UI: NEW 0-40 - BEGINNER 41-70 - INTERMEDIATE 71-100. */
export const THRESHOLDS = Object.freeze({ new: 40, beginner: 70 });

/**
 * OPEN DECISION (contradiction #1): the mockup result screen says
 * "PARTIAL CREDIT PER TEST CASE" and awards 88/120 for 4 of 6 medium questions,
 * but the BAB 3 flowchart is binary ("poin ditambahkan atau tidak").
 * Flag kept explicit so the team can flip it once the document is settled.
 */
export const PARTIAL_CREDIT = true;

/**
 * OPEN DECISION (contradiction #2): bonus points from the Daily Puzzle are
 * deliberately NOT part of this function. The canonical fixture is exactly
 * 168/290 with no bonus. Keeping bonus outside classification means a level
 * can never be earned by grinding puzzles — the answer an examiner will ask for.
 */

function pointsFor(question) {
  return Number(question.points ?? POINTS[question.difficulty] ?? 0);
}

/** Points earned by a single submission against its question. */
export function scoreSubmission(submission, question) {
  const max = pointsFor(question);
  if (!submission) return 0;

  if (question.type === 'mcq') {
    return submission.answer === question.correct_answer ? max : 0;
  }

  // Partial credit applies only to a completed run that produced wrong output.
  // A run that never finished (TLE) or crashed (Runtime Error) earns nothing —
  // this is what the mockup's submissions table shows: TLE at 5.00 s, 0 points.
  if (submission.verdict === 'Time Limit Exceeded' || submission.verdict === 'Runtime Error') {
    return 0;
  }

  const total = Number(submission.total_cases ?? 0);
  const passed = Number(submission.passed_cases ?? 0);

  if (!PARTIAL_CREDIT || total === 0) {
    return submission.verdict === 'Accepted' ? max : 0;
  }
  if (passed >= total) return max;
  return Math.round((max * passed) / total);
}

/**
 * @param {Array} submissions one entry per answered question
 * @param {Array} questions   the question set served in the session
 * @returns {{earnedPoints:number, possiblePoints:number, percentage:number,
 *            level:'new'|'beginner'|'intermediate', byDifficulty:object,
 *            pointsToNextLevel:number|null}}
 */
export function classify(submissions = [], questions = []) {
  const byQuestion = new Map(
    submissions.map((s) => [String(s.question_id), s])
  );

  const byDifficulty = {
    easy: { correct: 0, total: 0, earned: 0, possible: 0 },
    medium: { correct: 0, total: 0, earned: 0, possible: 0 },
    hard: { correct: 0, total: 0, earned: 0, possible: 0 },
  };

  let earnedPoints = 0;
  let possiblePoints = 0;

  for (const question of questions) {
    const bucket = byDifficulty[question.difficulty];
    if (!bucket) continue;

    const max = pointsFor(question);
    const submission = byQuestion.get(String(question._id));
    const earned = scoreSubmission(submission, question);

    bucket.total += 1;
    bucket.possible += max;
    bucket.earned += earned;
    if (earned >= max && max > 0) bucket.correct += 1;

    possiblePoints += max;
    earnedPoints += earned;
  }

  const percentage = possiblePoints === 0
    ? 0
    : Number(((earnedPoints / possiblePoints) * 100).toFixed(2));

  // Sequential comparison, in this order.
  let level;
  if (percentage <= THRESHOLDS.new) level = 'new';
  else if (percentage <= THRESHOLDS.beginner) level = 'beginner';
  else level = 'intermediate';

  const nextEdge = level === 'new'
    ? THRESHOLDS.new + 1
    : level === 'beginner'
      ? THRESHOLDS.beginner + 1
      : null;

  return {
    earnedPoints,
    possiblePoints,
    percentage,
    level,
    byDifficulty,
    pointsToNextLevel:
      nextEdge === null ? null : Number((nextEdge - percentage).toFixed(1)),
  };
}

export default classify;
