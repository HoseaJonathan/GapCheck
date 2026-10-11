import mongoose from 'mongoose';

import { lockStates } from '../learning.js';
import Progress from '../models/Progress.js';
import QuizAttempt from '../models/QuizAttempt.js';

/**
 * Per-learner state of modules: progress rows, computed locks and quiz history.
 * Lives apart from services/modules.js (content) so modules.js can depend on it
 * without an import cycle; modules.js re-exports progressMap for its callers.
 */

/** The caller's progress rows for these modules, keyed by String(module _id). */
export async function progressMap(userId, modules) {
  if (modules.length === 0) return new Map();
  const rows = await Progress.find({ user_id: userId, module_id: { $in: modules.map((m) => m._id) } }).lean();
  return new Map(rows.map((p) => [String(p.module_id), p]));
}

/** Attempt count, best score and whether any attempt passed, keyed by String(module _id). */
async function quizSummaries(userId, modules) {
  if (modules.length === 0) return new Map();
  const rows = await QuizAttempt.aggregate([
    { $match: { user_id: userId, module_id: { $in: modules.map((m) => m._id) } } },
    // $max over booleans is true when any attempt passed (true sorts above false).
    { $group: { _id: '$module_id', attempts: { $sum: 1 }, best_score: { $max: '$score' }, passed: { $max: '$passed' } } },
  ]);
  return new Map(rows.map(({ _id, ...summary }) => [String(_id), summary]));
}

const NO_ATTEMPTS = { attempts: 0, best_score: null, passed: false };

/**
 * Everything a module card shows for one learner. `modules` must be one whole
 * path: locks are computed within it, so a prerequisite outside the list counts
 * as met (lockStates).
 */
export async function moduleStatuses(userId, modules) {
  // aggregate() does not cast like find() does, so the id is cast here.
  const uid = new mongoose.Types.ObjectId(String(userId));
  const [progress, quizzes] = await Promise.all([progressMap(uid, modules), quizSummaries(uid, modules)]);
  const locks = lockStates(modules, progress);
  return new Map(modules.map((m) => {
    const id = String(m._id);
    const row = progress.get(id);
    return [id, {
      ...locks.get(id),
      state: row?.state ?? null,
      progress_percent: row?.percent_complete ?? 0,
      quiz_status: quizzes.get(id) ?? { ...NO_ATTEMPTS },
    }];
  }));
}
