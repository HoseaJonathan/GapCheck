/**
 * Gap Check — pure analytics over submissions, topics, Bloom levels and sessions.
 *
 * Like scoring.js: no database access, no framework imports. Ids may be
 * ObjectIds or strings, so they are always compared through String().
 */
import { SOLID_TOPIC_THRESHOLD, GAP_TOPIC_THRESHOLD } from './config.js';

const BLOOM_LEVELS = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
/** Higher-order levels stay locked until the learner reaches Intermediate. */
const LOCKED_UNTIL_INTERMEDIATE = new Set(['evaluate', 'create']);
const NEXT_LEVEL_LABEL = { new: 'Beginner', beginner: 'Intermediate' };

const round2 = (n) => Number(n.toFixed(2));
const time = (s) => new Date(s.submitted_at).getTime();

/**
 * One submission per question: the one with the most points; on a tie the
 * earliest. Dates are compared as timestamps so ISO strings and Date objects
 * both work.
 */
export function bestSubmissions(subs = []) {
  const best = new Map();
  for (const s of subs) {
    const key = String(s.question_id);
    const cur = best.get(key);
    if (
      !cur ||
      s.points_earned > cur.points_earned ||
      (s.points_earned === cur.points_earned && time(s) < time(cur))
    ) {
      best.set(key, s);
    }
  }
  return [...best.values()];
}

function pointsByQuestion(best) {
  return new Map(best.map((s) => [String(s.question_id), Number(s.points_earned ?? 0)]));
}

/** Accuracy per tag. A question counts once for every tag it carries. */
export function topicAccuracy(questions = [], best = []) {
  const earnedBy = pointsByQuestion(best);
  const topics = new Map();
  for (const q of questions) {
    const earned = earnedBy.get(String(q._id)) ?? 0; // unanswered = 0
    for (const tag of q.tags ?? []) {
      const t = topics.get(tag) ?? { topic: tag, earned: 0, possible: 0, question_count: 0, zero_count: 0 };
      t.earned += earned;
      t.possible += Number(q.points ?? 0);
      t.question_count += 1;
      if (earned === 0) t.zero_count += 1;
      topics.set(tag, t);
    }
  }
  return [...topics.values()]
    .map((t) => ({
      topic: t.topic,
      accuracy: t.possible === 0 ? 0 : round2(t.earned / t.possible),
      earned: t.earned,
      possible: t.possible,
      question_count: t.question_count,
      zero_count: t.zero_count,
    }))
    .sort((a, b) => b.accuracy - a.accuracy || a.topic.localeCompare(b.topic));
}

/** Always six entries in Bloom order; accuracy is null when a level has no questions. */
export function bloomBreakdown(questions = [], best = [], level) {
  const earnedBy = pointsByQuestion(best);
  return BLOOM_LEVELS.map((bloom) => {
    const locked = LOCKED_UNTIL_INTERMEDIATE.has(bloom) && level !== 'intermediate';
    const qs = questions.filter((q) => q.bloom_level === bloom);
    const possible = qs.reduce((n, q) => n + Number(q.points ?? 0), 0);
    const earned = qs.reduce((n, q) => n + (earnedBy.get(String(q._id)) ?? 0), 0);
    const accuracy = possible === 0 ? null : round2(earned / possible);
    // Spec section 3: a level is reached by earning on it, not merely by being asked it.
    // A locked level keeps its lock fields alongside, so the client can still say why it is closed.
    const entry = { level: bloom, accuracy, reached: accuracy !== null && accuracy > 0 };
    if (locked) {
      entry.locked = true;
      entry.unlock_hint = 'Opens at Intermediate';
    }
    return entry;
  });
}

export function acceptanceRate(subs = []) {
  if (subs.length === 0) return 0;
  return round2(subs.filter((s) => s.verdict === 'Accepted').length / subs.length);
}

/**
 * @param {Array} topics topicAccuracy() output (sorted, weakest last)
 * @param {object} score  classify() output
 */
export function narrative(topics, score) {
  const solid = topics
    .filter((t) => t.accuracy >= SOLID_TOPIC_THRESHOLD)
    .map((t) => `Topik ${t.topic} sudah kokoh — akurasi ${Math.round(t.accuracy * 100)}%.`);
  const gaps = topics
    .filter((t) => t.accuracy < GAP_TOPIC_THRESHOLD)
    .map((t) => `Topik ${t.topic} masih menahan skor — ${t.question_count - t.zero_count} dari ${t.question_count} soal mendapat poin.`);

  const weakest = topics.at(-1);
  const summary = score.pointsToNextLevel !== null
    ? `Kamu berada ${score.pointsToNextLevel} poin dari ${NEXT_LEVEL_LABEL[score.level]}. Topik terlemah kamu saat ini adalah ${weakest.topic}.`
    : `Kamu sudah di level Intermediate. Topik terlemah kamu saat ini adalah ${weakest.topic}.`;
  return { solid, gaps, summary };
}

const byStart = (sessions) =>
  [...sessions].sort((a, b) => new Date(a.started_at) - new Date(b.started_at));

/** Chronological order, labelled "Diagnostic n" / "Checkpoint n" per kind. */
export function sessionLabels(sessions = []) {
  const seen = { diagnostic: 0, checkpoint: 0 };
  return byStart(sessions).map((s) => {
    seen[s.kind] += 1;
    const name = s.kind === 'diagnostic' ? 'Diagnostic' : 'Checkpoint';
    return { ...s, label: `${name} ${seen[s.kind]}` };
  });
}

/** Change of the latest session against the first and the previous one, 1 decimal. */
export function scoreDeltas(sessions = []) {
  if (sessions.length < 2) return { delta_since_first: null, delta_since_previous: null };
  const pct = byStart(sessions).map((s) => s.result.percentage);
  const last = pct.at(-1);
  return {
    delta_since_first: Number((last - pct[0]).toFixed(1)),
    delta_since_previous: Number((last - pct.at(-2)).toFixed(1)),
  };
}
