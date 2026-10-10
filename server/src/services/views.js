import { HttpError } from '../errors.js';
import { GAP_TOPIC_THRESHOLD } from '../config.js';
import { acceptanceRate, bloomBreakdown, narrative, scoreDeltas, sessionLabels } from '../analytics.js';
import { THRESHOLDS } from '../scoring.js';
import { puzzle } from '../data/puzzle.static.js';
import AssessmentSession from '../models/AssessmentSession.js';
import Progress from '../models/Progress.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';
import { firstOpenModule, loadLatestAnalysis, pickModuleForTopic } from './analysis.js';
import { OUTLINE, loadPath, progressMap, stepsWithCounts, withProgress } from './modules.js';

const INTERMEDIATE_THRESHOLD = THRESHOLDS.beginner + 1;
const BAND = { new: THRESHOLDS.new, beginner: THRESHOLDS.new + 1, intermediate: INTERMEDIATE_THRESHOLD };
// Same edges classify() uses. A stored snapshot keeps percentage and level, not the distance.
const NEXT_EDGE = { new: THRESHOLDS.new + 1, beginner: INTERMEDIATE_THRESHOLD };
const NEXT_LEVEL_LABEL = { new: 'Beginner', beginner: 'Intermediate' };

function pointsToNext({ percentage, level }) {
  const edge = NEXT_EDGE[level];
  return edge === undefined ? null : Number((edge - percentage).toFixed(1));
}

async function requireUser(userId) {
  const user = await User.findById(userId).lean();
  if (!user) throw new HttpError(401, 'unknown_user');
  return user;
}

/** Finished sessions, oldest first: the order labels, deltas and the chart all assume. */
const finishedSessions = (userId) =>
  AssessmentSession.find({ user_id: userId, status: 'finished' }).sort({ started_at: 1, _id: 1 }).lean();

/**
 * Topic accuracy with a callout on the weakest topic when it is a gap and a
 * module covers it. narrative() lists gaps in topic order and the weakest topic
 * is last, so when the weakest is a gap its sentence is the last gap.
 */
function topicsWithCallout(topics, story, modules, progress) {
  const weakest = topics.at(-1);
  if (!weakest || weakest.accuracy >= GAP_TOPIC_THRESHOLD) return topics;
  const module = pickModuleForTopic(modules, progress, weakest.topic);
  if (!module) return topics;
  return [...topics.slice(0, -1), { ...weakest, callout: { text: story.gaps.at(-1), module_id: module._id } }];
}

/**
 * The headline numbers come from the result stored at finish (spec: a snapshot,
 * so editing the bank later never rewrites a past sitting). The per-difficulty
 * table stays live because the snapshot does not keep it. pointsToNextLevel is
 * rederived from the snapshot so it always matches the percentage shown.
 */
function snapshotScore(live, snap) {
  if (!snap?.level) return live;
  return {
    ...live,
    earnedPoints: snap.earned,
    possiblePoints: snap.possible,
    percentage: snap.percentage,
    level: snap.level,
    pointsToNextLevel: pointsToNext(snap),
  };
}

export async function getResult(userId) {
  const analysis = await loadLatestAnalysis(userId);
  if (!analysis) return { result: null };
  const { session, questions, best, topics } = analysis;
  const score = snapshotScore(analysis.score, session.result);

  const [user, { path, modules }] = await Promise.all([requireUser(userId), loadPath(score.level)]);
  const progress = await progressMap(userId, modules);
  const story = narrative(topics, score);

  return {
    ...score,
    session_id: session._id,
    topic_accuracy: topicsWithCallout(topics, story, modules, progress),
    bloom_levels: bloomBreakdown(questions, best, score.level),
    narrative: story,
    learning_path: path && { ...path, steps: stepsWithCounts(path, modules) },
    user: { level: user.level },
  };
}

export async function getProgress(userId) {
  const user = await requireUser(userId);
  const sessions = await finishedSessions(userId);

  if (sessions.length === 0) {
    return {
      weighted_score: null, level: user.level, points_to_next_level: null,
      intermediate_threshold: INTERMEDIATE_THRESHOLD,
      delta_since_first: null, delta_since_previous: null,
      modules_completed: null, modules_total: null, acceptance_rate: null,
      sessions: [], topic_accuracy: [], bloom_levels: [], recent_submissions: [],
    };
  }

  const [analysis, { modules }, verdicts, recent] = await Promise.all([
    loadLatestAnalysis(userId),
    loadPath(user.level),
    Submission.find({ user_id: userId }).select('verdict').lean(),
    // _id breaks ties between submissions stored within the same millisecond.
    Submission.find({ user_id: userId }).sort({ submitted_at: -1, _id: -1 }).limit(10)
      .populate('question_id', 'title difficulty').lean(),
  ]);
  const progress = await progressMap(userId, modules);
  const latest = sessions.at(-1).result;

  return {
    weighted_score: latest.percentage,
    level: user.level,
    points_to_next_level: pointsToNext(latest),
    intermediate_threshold: INTERMEDIATE_THRESHOLD,
    ...scoreDeltas(sessions),
    modules_completed: [...progress.values()].filter((p) => p.state === 'completed').length,
    modules_total: modules.length,
    acceptance_rate: acceptanceRate(verdicts),
    sessions: sessionLabels(sessions).map((s) => ({
      _id: s._id, kind: s.kind, label: s.label, percentage: s.result.percentage, taken_at: s.started_at,
    })),
    // Snapshot-only history has no question set, so there is nothing to break down.
    topic_accuracy: analysis
      ? topicsWithCallout(analysis.topics, narrative(analysis.topics, analysis.score), modules, progress)
      : [],
    bloom_levels: analysis ? bloomBreakdown(analysis.questions, analysis.best, analysis.score.level) : [],
    recent_submissions: recent.map((s) => ({
      _id: s._id,
      question_id: s.question_id?._id ?? null,
      question_title: s.question_id?.title ?? null,
      difficulty: s.question_id?.difficulty ?? null,
      session_id: s.session_id,
      verdict: s.verdict,
      runtime_ms: s.runtime_ms,
      memory_kb: s.memory_kb,
      passed_cases: s.passed_cases,
      total_cases: s.total_cases,
      points_earned: s.points_earned,
      submitted_at: s.submitted_at,
    })),
  };
}

function headline(latest) {
  if (!latest) return 'Mulai dengan asesmen diagnostik.';
  const points = pointsToNext(latest);
  return points === null
    ? 'Kamu sudah di level Intermediate.'
    : `Kamu ${points} poin dari ${NEXT_LEVEL_LABEL[latest.level]}.`;
}

/**
 * The weakest topic's module when there is one, otherwise the first open module
 * on the path. The reason names the topic only when the topic picked the module,
 * so the learner is never told a module covers a gap it does not cover.
 */
function nextUp(weakest, modules, progress) {
  const byTopic = weakest ? pickModuleForTopic(modules, progress, weakest) : null;
  if (byTopic) {
    return {
      module: withProgress(byTopic, progress),
      reason: `Dipilih karena topik ${weakest} adalah topik terlemah di diagnostik terakhir kamu.`,
    };
  }
  const onPath = firstOpenModule(modules, progress);
  return onPath && { module: withProgress(onPath, progress), reason: 'Modul berikutnya di jalur belajar kamu.' };
}

export async function getOverview(userId) {
  const user = await requireUser(userId);
  const [sessions, analysis, { path, modules }, open] = await Promise.all([
    finishedSessions(userId),
    loadLatestAnalysis(userId),
    loadPath(user.level),
    Progress.find({ user_id: userId, state: 'in_progress' })
      .populate({ path: 'module_id', select: OUTLINE }).lean(),
  ]);
  const progress = await progressMap(userId, modules);
  const latest = sessions.at(-1)?.result ?? null;

  return {
    headline: headline(latest),
    weighted_score: latest?.percentage ?? null,
    band: BAND,
    level: user.level,
    next_up: nextUp(analysis?.topics.at(-1)?.topic, modules, progress),
    // A progress row whose module was deleted has nothing to show.
    in_progress: open
      .filter((p) => p.module_id)
      .map((p) => ({ ...p.module_id, progress_percent: p.percent_complete }))
      .sort((a, b) => a.order - b.order),
    path_steps: path ? stepsWithCounts(path, modules) : [],
    puzzle: {
      date: puzzle.date, topic: puzzle.topic, bonus_points: puzzle.bonus_points,
      streak_days: puzzle.streak_days, week_strip: puzzle.week_strip, solved: puzzle.solved,
    },
  };
}
