import mongoose from 'mongoose';

import { HttpError } from '../errors.js';
import { lockStates, pathAccess, retakeEligibility } from '../learning.js';
import AssessmentSession from '../models/AssessmentSession.js';
import LearningPath from '../models/LearningPath.js';
import Module from '../models/Module.js';
import Progress from '../models/Progress.js';
import QuizAttempt from '../models/QuizAttempt.js';
import User from '../models/User.js';
import { isAdmin, isAdminUser } from './admin.js';

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
 * True when these modules belong to a path below the learner's level, which
 * spec A5b opens for revisiting. Decided here rather than at each call site:
 * list, detail, start and quiz all read module state through moduleStatuses,
 * so one check cannot be forgotten by one of them.
 * Fails closed — an unknown user, level or path keeps the normal gating.
 */
async function isReviewPath(userId, modules) {
  const pathId = modules[0]?.path_id;
  if (!pathId) return false;
  const [user, path] = await Promise.all([
    User.findById(userId).select('level').lean(),
    LearningPath.findById(pathId).select('level').lean(),
  ]);
  if (!user?.level || !path?.level) return false;
  return pathAccess(user.level, path.level) === 'review';
}

/**
 * Everything a module card shows for one learner. `modules` must be one whole
 * path: locks are computed within it, so a prerequisite outside the list counts
 * as met (lockStates).
 */
export async function moduleStatuses(userId, modules) {
  // aggregate() does not cast like find() does, so the id is cast here.
  const uid = new mongoose.Types.ObjectId(String(userId));
  const [progress, quizzes, admin, reviewing] = await Promise.all([
    progressMap(uid, modules), quizSummaries(uid, modules), isAdmin(uid), isReviewPath(uid, modules),
  ]);
  const locks = lockStates(modules, progress, { open: admin || reviewing });
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

/**
 * Whether the learner may start a new assessment, and which kind (spec A4).
 * Every finished session counts, demo snapshots included, since each one is a
 * sitting the learner has had. The path is looked up here rather than through
 * modules.loadPath because modules.js imports this file; only the fields the
 * rule reads are loaded.
 */
export async function retakeFor(userId) {
  const user = await User.findById(userId).select('level role').lean();
  if (!user) throw new HttpError(401, 'unknown_user');
  const path = user.level ? await LearningPath.findOne({ level: user.level }).lean() : null;
  const [sessions, modules] = await Promise.all([
    AssessmentSession.find({ user_id: user._id, status: 'finished' }).select('finished_at').lean(),
    path ? Module.find({ path_id: path._id }).select('order topic requires').sort({ order: 1 }).lean() : [],
  ]);
  if (isAdminUser(user)) {
    return { allowed: true, kind: sessions.length ? 'checkpoint' : 'diagnostic', reason: null };
  }
  const progress = await progressMap(user._id, modules);
  return retakeEligibility({ sessions, modules, progress, steps: path?.steps ?? [] });
}
