/**
 * Gap Check — pure learning rules: module gating, quiz grading and retake
 * eligibility.
 *
 * Like scoring.js and analytics.js: no database access, no framework imports.
 * Ids may be ObjectIds or strings, so they are always compared through
 * String(). `progress` is a Map<String(module_id), { state, completed_at? }>
 * belonging to one user.
 */
import { QUIZ_PASS_THRESHOLD } from './config.js';

const round2 = (n) => Number(n.toFixed(2));
const pad2 = (n) => String(n).padStart(2, '0');
// Dates are compared as timestamps so Date objects and ISO strings both work.
const time = (d) => new Date(d).getTime();
const isCompleted = (progress, module) => progress.get(String(module._id))?.state === 'completed';
const byOrder = (x, y) => x.order - y.order;

/**
 * A module is open when it has no prerequisite, when the prerequisite is
 * completed, or when the prerequisite is not among `modules` at all (a missing
 * prerequisite counts as met so a data gap can never lock a learner out).
 */
export function lockStates(modules, progress) {
  const byId = new Map(modules.map((m) => [String(m._id), m]));
  const locks = new Map();
  for (const m of modules) {
    const prereq = m.requires == null ? null : byId.get(String(m.requires));
    const locked = prereq != null && !isCompleted(progress, prereq);
    locks.set(String(m._id), {
      locked,
      unlock_rule: locked ? 'locked' : 'open',
      unlock_hint: locked ? `Lulus kuis modul ${pad2(prereq.order)} untuk membuka` : null,
    });
  }
  return locks;
}

/** First module (by order) that is open and not yet completed, or null. */
export function nextModule(modules, locks, progress) {
  const sorted = [...modules].sort(byOrder);
  return (
    sorted.find((m) => !locks.get(String(m._id))?.locked && !isCompleted(progress, m)) ?? null
  );
}

/**
 * Grades one quiz attempt. Returns null for malformed answers (not an array,
 * wrong length, non-string element) or an empty quiz; callers map that to 400.
 * Passing compares the raw ratio, never the rounded score.
 */
export function gradeQuiz(items, answers) {
  if (!Array.isArray(answers) || !Array.isArray(items) || items.length === 0) return null;
  if (answers.length !== items.length) return null;
  if (!answers.every((a) => typeof a === 'string')) return null;
  const total = items.length;
  const correct_count = items.filter((item, i) => item.correct_answer === answers[i]).length;
  return {
    correct_count,
    total,
    score: round2(correct_count / total),
    passed: correct_count / total >= QUIZ_PASS_THRESHOLD,
  };
}

/** Modules grouped into path steps: topics in `steps` order, unknown topics last. */
function groupIntoSteps(modules, steps) {
  const groups = new Map();
  for (const m of [...modules].sort(byOrder)) {
    if (!groups.has(m.topic)) groups.set(m.topic, []);
    groups.get(m.topic).push(m);
  }
  const position = (topic) => {
    const i = steps.findIndex((s) => s.topic === topic);
    return i === -1 ? Infinity : i;
  };
  // Array.sort is stable, so unknown topics keep first-seen (module order) order.
  return [...groups.entries()]
    .sort(([t1], [t2]) => position(t1) - position(t2))
    .map(([topic, mods]) => ({ topic, title: steps.find((s) => s.topic === topic)?.title ?? topic, mods }));
}

/**
 * Whether the learner may start a new assessment. `sessions` are their finished
 * sessions; `modules` are the modules of their current level's path.
 *  1. No finished session yet: the diagnostic.
 *  2. Otherwise a checkpoint, once (a) some step became fully completed after
 *     the last assessment (modules passed earlier count toward the step but are
 *     not enough alone), or (b) the whole path is completed.
 *  3. Otherwise locked, pointing at the earliest step with unfinished modules,
 *     which is the one being worked on since gating is sequential.
 */
export function retakeEligibility({ sessions, modules, progress, steps }) {
  if (sessions.length === 0) return { allowed: true, kind: 'diagnostic', reason: null };
  if (modules.length === 0) {
    return { allowed: false, kind: 'checkpoint', reason: 'Belum ada modul untuk jalur kamu.' };
  }
  const allowed = { allowed: true, kind: 'checkpoint', reason: null };

  if (modules.every((m) => isCompleted(progress, m))) return allowed;

  const last = Math.max(...sessions.map((s) => time(s.finished_at)));
  const grouped = groupIntoSteps(modules, steps);
  const newlyCompleted = grouped.some(
    ({ mods }) =>
      mods.every((m) => isCompleted(progress, m)) &&
      Math.max(...mods.map((m) => time(progress.get(String(m._id)).completed_at ?? 0))) > last,
  );
  if (newlyCompleted) return allowed;

  const current = grouped.find(({ mods }) => mods.some((m) => !isCompleted(progress, m)));
  const n = current.mods.filter((m) => !isCompleted(progress, m)).length;
  return {
    allowed: false,
    kind: 'checkpoint',
    reason: `Selesaikan ${n} modul lagi di langkah ${current.title} untuk membuka asesmen ulang.`,
  };
}
