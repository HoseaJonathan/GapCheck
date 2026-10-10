import { SESSION_DURATION_SECONDS } from '../config.js';
import { HttpError } from '../errors.js';
import { bestSubmissions } from '../analytics.js';
import { classify, scoreSubmission } from '../scoring.js';
import { fakeJudge0 } from '../judge/fakeJudge0.js';
import AssessmentSession from '../models/AssessmentSession.js';
import Question from '../models/Question.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';
import { listPublished, toSafeQuestion } from './questions.js';

const KINDS = ['diagnostic', 'checkpoint'];

// Every function takes `now` last so tests and the seed can pin the clock.

const deadlineOf = (session) => new Date(new Date(session.started_at).getTime() + SESSION_DURATION_SECONDS * 1000);

function remainingSeconds(session, now) {
  const elapsed = Math.floor((now - new Date(session.started_at)) / 1000);
  return Math.max(0, SESSION_DURATION_SECONDS - elapsed);
}

/** Safe questions in question_ids order; ids whose question was deleted are skipped. */
async function sessionQuestions(session) {
  const docs = await Question.find({ _id: { $in: session.question_ids } }).lean();
  const byId = new Map(docs.map((q) => [String(q._id), q]));
  return session.question_ids.map((id) => byId.get(String(id))).filter(Boolean).map(toSafeQuestion);
}

async function resume(session, now) {
  return { session, questions: await sessionQuestions(session), remaining_seconds: remainingSeconds(session, now), created: false };
}

/**
 * Lazy timeout (A7): there is no cron, so whichever request touches an
 * overdue session finishes it. The finish is stamped at the deadline, not at
 * `now`, so a late visit never inflates elapsed_seconds past the limit.
 */
export async function expireIfDue(session, now = new Date()) {
  const deadline = deadlineOf(session);
  if (now < deadline) return false;
  try {
    await finishSession(session, deadline);
  } catch (err) {
    // A parallel request expired it first; the session is just as expired.
    if (!(err instanceof HttpError && err.reason === 'session_finished')) throw err;
  }
  return true;
}

/**
 * Resumes the open session if there is one, otherwise opens a new one over
 * every published question. `created` tells the route 201 from 200.
 */
export async function startSession(userId, kind, now = new Date()) {
  if (!KINDS.includes(kind)) throw new HttpError(400, 'invalid_kind');

  const open = await AssessmentSession.findOne({ user_id: userId, status: 'in_progress' });
  if (open && !(await expireIfDue(open, now))) return resume(open, now);

  const published = await listPublished();
  let session;
  try {
    session = await AssessmentSession.create({
      user_id: userId, kind, started_at: now, question_ids: published.map((q) => q._id),
    });
  } catch (err) {
    // The partial unique index rejected a second open session: a parallel request won, so resume its session.
    if (err?.code !== 11000) throw err;
    const winner = await AssessmentSession.findOne({ user_id: userId, status: 'in_progress' });
    if (!winner) throw err;
    return resume(winner, now);
  }
  return { session, questions: published.map(toSafeQuestion), remaining_seconds: remainingSeconds(session, now), created: true };
}

const stripWhitespace = (s) => s.replace(/\s/g, '');

/**
 * fakeJudge0 accepts any long enough code, and some starter templates are long
 * enough on their own, so submitting the template untouched would be graded
 * Accepted. It is judged as empty instead. Whitespace is ignored so reindenting
 * or a different line ending does not turn the template into an answer.
 */
function isUnchangedTemplate(code, question) {
  return typeof code === 'string' && typeof question.base_code === 'string'
    && stripWhitespace(code) === stripWhitespace(question.base_code);
}

/** Grades one answer inside a session; checks run in a fixed order so each failure has one reason. */
export async function recordSubmission(userId, body, now = new Date()) {
  const { session_id, question_id, submitted_code, answer, language_id = 63 } = body || {};

  const session = await AssessmentSession.findById(session_id);
  if (!session) throw new HttpError(404, 'unknown_session');
  // Ownership before status, so another user's session reveals nothing about its state.
  if (String(session.user_id) !== String(userId)) throw new HttpError(403, 'forbidden_session');
  if (session.status === 'finished') throw new HttpError(409, 'session_finished');
  if (await expireIfDue(session, now)) throw new HttpError(409, 'session_expired');
  if (!session.question_ids.some((id) => String(id) === String(question_id))) {
    throw new HttpError(400, 'question_not_in_session');
  }

  const question = await Question.findById(question_id).select('+correct_answer').lean();
  if (!question) throw new HttpError(404, 'unknown_question');

  const run = question.type === 'mcq'
    ? { verdict: answer === question.correct_answer ? 'Accepted' : 'Wrong Answer', runtime_ms: 0, memory_kb: 0, cases: [] }
    : fakeJudge0(question, isUnchangedTemplate(submitted_code, question) ? '' : submitted_code);
  // Hidden case names reveal what they probe, so only visible per-case results are kept;
  // fakeJudge0 maps cases in test_cases order, hence the match by index. Counts still include them.
  run.cases = run.cases.filter((_, i) => !question.test_cases?.[i]?.is_hidden);

  const record = {
    user_id: userId, question_id: question._id, session_id: session._id,
    submitted_code, answer, language_id, ...run, submitted_at: now,
  };
  record.points_earned = scoreSubmission(record, question);
  return Submission.create(record);
}

/**
 * Scores the session from what is stored, not from in-memory state, so the
 * seed can insert submissions directly and still finish through here.
 */
export async function finishSession(session, now = new Date()) {
  if (session.status !== 'in_progress') throw new HttpError(409, 'session_finished');

  // No is_published filter: a question unpublished mid-session still counts toward the snapshot.
  const [questions, subs] = await Promise.all([
    Question.find({ _id: { $in: session.question_ids } }).select('+correct_answer').lean(),
    Submission.find({ session_id: session._id }).lean(),
  ]);
  const score = classify(bestSubmissions(subs), questions);
  const elapsed = Math.floor((now - new Date(session.started_at)) / 1000);

  // Conditional on in_progress so two finishes racing each other cannot both write a result.
  const finished = await AssessmentSession.findOneAndUpdate(
    { _id: session._id, status: 'in_progress' },
    {
      $set: {
        status: 'finished',
        finished_at: now,
        elapsed_seconds: Math.min(elapsed, SESSION_DURATION_SECONDS),
        result: { earned: score.earnedPoints, possible: score.possiblePoints, percentage: score.percentage, level: score.level },
      },
    },
    { new: true },
  );
  if (!finished) throw new HttpError(409, 'session_finished');

  const userUpdate = { level: score.level };
  if (finished.kind === 'diagnostic') userUpdate.diagnostic_status = true;
  await User.updateOne({ _id: finished.user_id }, { $set: userUpdate });

  return finished;
}
