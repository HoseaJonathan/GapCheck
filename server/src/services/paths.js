import { HttpError } from '../errors.js';
import LearningPath from '../models/LearningPath.js';
import Module from '../models/Module.js';
import User from '../models/User.js';
import { isAdminUser } from './admin.js';
import { OUTLINE } from './modules.js';
import { moduleStatuses } from './progression.js';

/** Card order on the Modules landing page: 01 New, 02 Beginner, 03 Intermediate. */
export const LEVELS = ['new', 'beginner', 'intermediate'];
const BLOOM = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];

const minutes = (mods) => mods.reduce((sum, m) => sum + (m.estimated_minutes ?? 0), 0);

async function requireUser(userId) {
  const user = await User.findById(userId).lean();
  if (!user) throw new HttpError(401, 'unknown_user');
  return user;
}

/**
 * Only the path of the caller's own level is open; the others stay locked,
 * including lower levels. A user without a level yet has every path locked.
 * The admin (dev/demo only) has every path open.
 */
const isPathLocked = (user, level) => !isAdminUser(user) && user.level !== level;

/** The three landing cards with the caller's lock state. */
export async function listPaths(userId) {
  const user = await requireUser(userId);
  const [paths, modules] = await Promise.all([
    LearningPath.find().select('level title description steps').lean(),
    Module.find().select('path_id topic estimated_minutes').lean(),
  ]);
  return LEVELS.flatMap((level, i) => {
    const path = paths.find((p) => p.level === level);
    if (!path) return [];
    const mods = modules.filter((m) => String(m.path_id) === String(path._id));
    return [{
      order: i + 1,
      level,
      title: path.title,
      description: path.description ?? '',
      // What the learner will study: the step titles with their module counts, in path order.
      steps: path.steps.map((s) => ({ title: s.title, module_count: mods.filter((m) => m.topic === s.topic).length })),
      module_count: mods.length,
      estimated_minutes: minutes(mods),
      current: user.level === level,
      locked: isPathLocked(user, level),
    }];
  });
}

/**
 * The overview shown before a path's first module: what it covers, its steps
 * with their modules and the caller's status, and every source the modules
 * cite. 404 for an unknown level, 403 when the path is locked for the caller.
 */
export async function getPathOverview(userId, level) {
  if (!LEVELS.includes(level)) throw new HttpError(404, 'unknown_path');
  const user = await requireUser(userId);
  const path = await LearningPath.findOne({ level }).lean();
  if (!path) throw new HttpError(404, 'unknown_path');
  if (isPathLocked(user, level)) throw new HttpError(403, 'path_locked');

  const modules = await Module.find({ path_id: path._id }).select(`${OUTLINE} references`).sort({ order: 1 }).lean();
  const statuses = await moduleStatuses(userId, modules);
  const outline = modules.map(({ references, ...m }) => ({ ...m, ...statuses.get(String(m._id)) }));

  // Modules on a topic that is not a step still appear, in their own group after the steps.
  const stepTopics = new Set(path.steps.map((s) => s.topic));
  const extra = outline.filter((m) => !stepTopics.has(m.topic));
  const steps = [
    ...path.steps.map((s) => ({ ...s, modules: outline.filter((m) => m.topic === s.topic) })),
    ...(extra.length ? [{ title: 'Lainnya', topic: null, reason: null, modules: extra }] : []),
  ];

  const sources = [...new Map(modules.flatMap((m) => m.references ?? []).map((r) => [r.url, r])).values()];
  const levels = modules.map((m) => BLOOM.indexOf(m.bloom_level)).filter((i) => i >= 0);
  // The learner continues at the first open module not yet completed (the same rule as next_up).
  const next = outline.find((m) => !m.locked && m.state !== 'completed') ?? null;

  return {
    path: {
      order: LEVELS.indexOf(level) + 1,
      level,
      title: path.title,
      description: path.description ?? '',
      overview: path.overview ?? '',
      outcomes: path.outcomes ?? [],
      module_count: modules.length,
      estimated_minutes: minutes(modules),
      bloom_from: levels.length ? BLOOM[Math.min(...levels)] : null,
      bloom_to: levels.length ? BLOOM[Math.max(...levels)] : null,
      steps,
      sources,
    },
    next_module: next && { _id: next._id, order: next.order, title: next.title, started: next.state === 'in_progress' },
  };
}
