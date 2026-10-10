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
 * First module (by order) on `topic` the learner has not completed; failing
 * that, the first module on the topic at all; otherwise null. Next up and the
 * weakest-topic callout share this rule on purpose: pointing a learner at a
 * module they already finished does not help them.
 *
 * @param {Array} modules            modules of one path
 * @param {Map}   progressByModule   String(module _id) -> progress document
 */
export function pickModuleForTopic(modules, progressByModule, topic) {
  const onTopic = [...modules].filter((m) => m.topic === topic).sort((a, b) => a.order - b.order);
  return onTopic.find((m) => progressByModule.get(String(m._id))?.state !== 'completed')
    ?? onTopic[0]
    ?? null;
}

/**
 * First module (by order) on the path the learner has not completed, or null.
 * Next up falls back to this when the weakest topic has no module (or there is
 * no analysable topic yet), so a learner with a path is never left without a
 * next step just because their gap is not covered by a module.
 */
export function firstOpenModule(modules, progressByModule) {
  return [...modules]
    .sort((a, b) => a.order - b.order)
    .find((m) => progressByModule.get(String(m._id))?.state !== 'completed')
    ?? null;
}
