import { bestSubmissions, topicAccuracy } from '../analytics.js';
import { classify } from '../scoring.js';
import AssessmentSession from '../models/AssessmentSession.js';
import Question from '../models/Question.js';
import Submission from '../models/Submission.js';

/**
 * The newest finished session that can be analysed per topic, with everything
 * derived from it. Demo snapshots are stored with `question_ids: []` and are
 * skipped, since there is nothing to break down; a real session finished with
 * no answers still counts and simply scores 0.
 *
 * `questions` carry correct_answer (classify needs it for MCQs), so callers
 * must never put them in a response.
 */
export async function loadLatestAnalysis(userId) {
  const session = await AssessmentSession.findOne({
    user_id: userId, status: 'finished', 'question_ids.0': { $exists: true },
  }).sort({ started_at: -1, _id: -1 }).lean();
  if (!session) return null;

  // No is_published filter, same as finishSession: an unpublished question still belongs to this sitting.
  const [questions, subs] = await Promise.all([
    Question.find({ _id: { $in: session.question_ids } }).select('+correct_answer').lean(),
    Submission.find({ session_id: session._id }).lean(),
  ]);
  const best = bestSubmissions(subs);
  return { session, questions, best, topics: topicAccuracy(questions, best), score: classify(best, questions) };
}

/**
 * The module the weakest-topic callout points at: the first module (by order)
 * on `topic` that is open and not completed; failing that, the first module on
 * the topic at all; otherwise null. Locked modules are passed over first
 * because sending a learner to a module they cannot open yet does not help,
 * and finished ones because they already did it.
 *
 * @param {Array} modules   modules of one path
 * @param {Map}   locks     lockStates(modules, progress)
 * @param {Map}   progress  String(module _id) -> progress document
 */
export function calloutModule(modules, locks, progress, topic) {
  const onTopic = modules.filter((m) => m.topic === topic).sort((a, b) => a.order - b.order);
  const workable = (m) => !locks.get(String(m._id))?.locked && progress.get(String(m._id))?.state !== 'completed';
  return onTopic.find(workable) ?? onTopic[0] ?? null;
}
