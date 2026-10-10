import { HttpError } from '../errors.js';
import LearningPath from '../models/LearningPath.js';
import Module from '../models/Module.js';
import Progress from '../models/Progress.js';
import User from '../models/User.js';
import { loadLatestAnalysis } from './analysis.js';

/**
 * Lists only need the outline; body and quiz are sent when one module is opened.
 * An inclusion list, because excluding quiz would collide with the schema's own
 * exclusion of quiz.correct_answer (MongoDB rejects the overlapping paths).
 */
export const OUTLINE = 'path_id order title topic bloom_level estimated_minutes unlock_rule unlock_hint';

/** The path for a level and its modules in order; no level (no diagnostic yet) means no path. */
export async function loadPath(level) {
  if (!level) return { path: null, modules: [] };
  const path = await LearningPath.findOne({ level }).lean();
  if (!path) return { path: null, modules: [] };
  const modules = await Module.find({ path_id: path._id }).select(OUTLINE).sort({ order: 1 }).lean();
  return { path, modules };
}

/** The caller's progress rows for these modules, keyed by String(module _id). */
export async function progressMap(userId, modules) {
  if (modules.length === 0) return new Map();
  const rows = await Progress.find({ user_id: userId, module_id: { $in: modules.map((m) => m._id) } }).lean();
  return new Map(rows.map((p) => [String(p.module_id), p]));
}

export const withProgress = (module, progress) =>
  ({ ...module, progress_percent: progress.get(String(module._id))?.percent_complete ?? 0 });

/** Steps with module_count derived from the modules that exist, never stored. */
export const stepsWithCounts = (path, modules) =>
  path.steps.map((step) => ({ ...step, module_count: modules.filter((m) => m.topic === step.topic).length }));

async function weakestTopic(userId) {
  return (await loadLatestAnalysis(userId))?.topics.at(-1)?.topic ?? null;
}

/** Modules on the path of the caller's level, each with the caller's progress. */
export async function listModules(userId) {
  const user = await User.findById(userId).lean();
  if (!user) throw new HttpError(401, 'unknown_user');
  const { modules } = await loadPath(user.level);
  const progress = await progressMap(userId, modules);
  return modules.map((m) => withProgress(m, progress));
}

/**
 * Modules are shared content, so any signed-in user may open any of them;
 * only the progress fields are per caller.
 */
export async function getModule(userId, moduleId) {
  const mod = await Module.findById(moduleId).lean();
  if (!mod) throw new HttpError(404, 'unknown_module');

  const [siblings, weakest] = await Promise.all([
    Module.find({ path_id: mod.path_id }).select(OUTLINE).sort({ order: 1 }).lean(),
    weakestTopic(userId),
  ]);
  const progress = await progressMap(userId, siblings);

  // The key is already excluded by the schema; stripped here too so a widened query cannot leak it.
  const quiz = (mod.quiz ?? []).map(({ correct_answer, ...item }) => item);
  return {
    module: { ...withProgress({ ...mod, quiz }, progress), flagged_by_diagnostic: mod.topic === weakest },
    siblings: siblings.map((s) => withProgress(s, progress)),
  };
}

/**
 * Stateless check of one quiz item. Nothing is stored: graded quiz attempts
 * with a pass mark belong to sub-project 2.
 */
export async function checkQuizAnswer(moduleId, index, answer) {
  const mod = await Module.findById(moduleId).select('+quiz.correct_answer').lean();
  if (!mod) throw new HttpError(404, 'unknown_module');
  const item = /^\d+$/.test(String(index)) ? mod.quiz?.[Number(index)] : undefined;
  if (!item) throw new HttpError(404, 'unknown_quiz_item');
  // typeof guard: a missing answer must not equal a missing key.
  return { correct: typeof answer === 'string' && answer === item.correct_answer };
}
