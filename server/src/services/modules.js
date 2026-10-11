import { HttpError } from '../errors.js';
import { gradeQuiz } from '../learning.js';
import LearningPath from '../models/LearningPath.js';
import Module from '../models/Module.js';
import Progress from '../models/Progress.js';
import QuizAttempt from '../models/QuizAttempt.js';
import User from '../models/User.js';
import { loadLatestAnalysis } from './analysis.js';
import { moduleStatuses, progressMap } from './progression.js';

export { progressMap };

/**
 * Lists only need the outline; body and quiz are sent when one module is opened.
 * An inclusion list, because excluding quiz would collide with the schema's own
 * exclusion of quiz.correct_answer (MongoDB rejects the overlapping paths).
 * `requires` is in it because locks are computed from it.
 */
export const OUTLINE = 'path_id order title topic bloom_level estimated_minutes requires';

/** The path for a level and its modules in order; no level (no diagnostic yet) means no path. */
export async function loadPath(level) {
  if (!level) return { path: null, modules: [] };
  const path = await LearningPath.findOne({ level }).lean();
  if (!path) return { path: null, modules: [] };
  const modules = await Module.find({ path_id: path._id }).select(OUTLINE).sort({ order: 1 }).lean();
  return { path, modules };
}

export const withProgress = (module, progress) =>
  ({ ...module, progress_percent: progress.get(String(module._id))?.percent_complete ?? 0 });

/** Steps with module_count derived from the modules that exist, never stored. */
export const stepsWithCounts = (path, modules) =>
  path.steps.map((step) => ({ ...step, module_count: modules.filter((m) => m.topic === step.topic).length }));

async function weakestTopic(userId) {
  return (await loadLatestAnalysis(userId))?.topics.at(-1)?.topic ?? null;
}

const pathModules = (pathId) => Module.find({ path_id: pathId }).select(OUTLINE).sort({ order: 1 }).lean();

const withStatus = (module, statuses) => ({ ...module, ...statuses.get(String(module._id)) });

/**
 * Whether `mod` is locked for the caller. Locks are computed against the
 * module's own path, not the caller's, so a module of another level is gated
 * by its own chain.
 */
async function isLocked(userId, mod) {
  const siblings = await pathModules(mod.path_id);
  return (await moduleStatuses(userId, siblings)).get(String(mod._id))?.locked ?? false;
}

/** Modules on the path of the caller's level, each with the caller's status. */
export async function listModules(userId) {
  const user = await User.findById(userId).lean();
  if (!user) throw new HttpError(401, 'unknown_user');
  const { modules } = await loadPath(user.level);
  const statuses = await moduleStatuses(userId, modules);
  return modules.map((m) => withStatus(m, statuses));
}

/**
 * Modules are shared content, so any signed-in user may open any of them;
 * only the status fields are per caller. A locked module is sent as its
 * outline only: its content is not readable before the prerequisite is passed.
 */
export async function getModule(userId, moduleId) {
  const mod = await Module.findById(moduleId).lean();
  if (!mod) throw new HttpError(404, 'unknown_module');

  const [siblings, weakest] = await Promise.all([pathModules(mod.path_id), weakestTopic(userId)]);
  const statuses = await moduleStatuses(userId, siblings);

  const { body, quiz, ...outline } = mod;
  const module = { ...withStatus(outline, statuses), flagged_by_diagnostic: mod.topic === weakest };
  if (!module.locked) {
    // Key and explanation are already excluded by the schema; stripped here too so a widened query cannot leak them.
    module.body = body ?? [];
    module.quiz = (quiz ?? []).map(({ correct_answer, explanation, ...item }) => item);
  }
  return { module, siblings: siblings.map((s) => withStatus(s, statuses)) };
}

/** Upsert that tolerates losing a race: the unique (user, module) index rejects the second insert. */
async function upsertProgress(filter, update) {
  try {
    await Progress.updateOne(filter, update, { upsert: true });
  } catch (err) {
    if (err?.code !== 11000) throw err;
    // The row now exists, so the same update without upsert applies to it.
    await Progress.updateOne(filter, update);
  }
}

/**
 * Marks a module as opened. $setOnInsert only acts on a new row, so reopening
 * (StrictMode double effects, double clicks) never lowers a completed module.
 */
export async function startModule(userId, moduleId) {
  const mod = await Module.findById(moduleId).select(OUTLINE).lean();
  if (!mod) throw new HttpError(404, 'unknown_module');
  if (await isLocked(userId, mod)) throw new HttpError(403, 'module_locked');

  const filter = { user_id: userId, module_id: mod._id };
  await upsertProgress(filter, { $setOnInsert: { state: 'in_progress', percent_complete: 50 } });
  const row = await Progress.findOne(filter).lean();
  return { state: row.state, progress_percent: row.percent_complete };
}

/**
 * Grades and stores one quiz attempt. A failed attempt reveals only the score,
 * so the quiz cannot be solved by probing; the key and explanations come back
 * only once the learner has passed.
 */
export async function submitQuizAttempt(userId, moduleId, answers, now = new Date()) {
  const mod = await Module.findById(moduleId).select('+quiz.correct_answer +quiz.explanation').lean();
  if (!mod) throw new HttpError(404, 'unknown_module');
  if (!mod.quiz?.length) throw new HttpError(404, 'no_quiz');
  if (await isLocked(userId, mod)) throw new HttpError(403, 'module_locked');
  const grade = gradeQuiz(mod.quiz, answers);
  if (!grade) throw new HttpError(400, 'incomplete_answers');

  const attempt = await QuizAttempt.create({
    user_id: userId, module_id: mod._id, answers, ...grade, submitted_at: now,
  });
  // Counting up to this attempt's own _id (not all rows) keeps two concurrent submits from sharing a number.
  const attempt_no = await QuizAttempt.countDocuments({
    user_id: userId, module_id: mod._id, _id: { $lte: attempt._id },
  });
  const result = { attempt_no, ...grade };
  if (!grade.passed) return result;

  const filter = { user_id: userId, module_id: mod._id };
  await upsertProgress(filter, { $set: { state: 'completed', percent_complete: 100 } });
  // Conditional so only the first pass is recorded, even when two passes race.
  await Progress.updateOne({ ...filter, completed_at: { $exists: false } }, { $set: { completed_at: now } });

  const next = await Module.findOne({ path_id: mod.path_id, requires: mod._id }).select('_id').lean();
  return {
    ...result,
    review: mod.quiz.map((item, i) => ({
      question: item.question,
      your_answer: answers[i],
      correct_answer: item.correct_answer,
      explanation: item.explanation,
    })),
    next_module_id: next?._id ?? null,
  };
}

/** The caller's attempts on a module, newest first, numbered from the oldest. Answers are not sent back. */
export async function listQuizAttempts(userId, moduleId) {
  const mod = await Module.findById(moduleId).select('_id').lean();
  if (!mod) throw new HttpError(404, 'unknown_module');
  // Same order attempt_no was assigned in at submit time.
  const rows = await QuizAttempt.find({ user_id: userId, module_id: mod._id })
    .select('score correct_count total passed submitted_at').sort({ _id: 1 }).lean();
  const attempts = rows.map(({ score, correct_count, total, passed, submitted_at }, i) => ({
    attempt_no: i + 1, score, correct_count, total, passed, submitted_at,
  }));
  return { attempts: attempts.reverse() };
}
