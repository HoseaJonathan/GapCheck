import bcrypt from 'bcryptjs';

import User from '../models/User.js';
import Question from '../models/Question.js';
import AssessmentSession from '../models/AssessmentSession.js';
import Submission from '../models/Submission.js';
import LearningPath from '../models/LearningPath.js';
import Module from '../models/Module.js';
import Progress from '../models/Progress.js';
import { POINTS, THRESHOLDS, scoreSubmission } from '../scoring.js';
import { finishSession } from '../services/sessions.js';
import { questions as questionData } from './data/questions.js';
import { paths } from './data/paths.js';
import { modules as moduleData } from './data/modules.js';
import {
  PASSWORD, users as userData, historySnapshots, canonicalRuns, CANONICAL_START, CANONICAL_FINISH,
} from './data/users.js';

const MODELS = [User, Question, AssessmentSession, Submission, LearningPath, Module, Progress];
const POSSIBLE_TOTAL = questionData.reduce((sum, q) => sum + POINTS[q.difficulty], 0);

/** Seed wipes every collection, so it must never run against a production database. */
export function assertSeedAllowed(env = process.env) {
  if (env.NODE_ENV === 'production') throw new Error('Seed ditolak di production');
}

function levelFor(percentage) {
  if (percentage <= THRESHOLDS.new) return 'new';
  if (percentage <= THRESHOLDS.beginner) return 'beginner';
  return 'intermediate';
}

// Spacing leaves the last answer a few minutes before the 38m14s finish time.
const ANSWER_INTERVAL_SECONDS = 150;

function canonicalSubmission(question, index, user, session) {
  const submitted_at = new Date(CANONICAL_START.getTime() + (120 + index * ANSWER_INTERVAL_SECONDS) * 1000);
  const base = { user_id: user._id, question_id: question._id, session_id: session._id, submitted_at };
  if (question.type === 'mcq') {
    return { ...base, answer: question.correct_answer, verdict: 'Accepted', runtime_ms: 0, memory_kb: 0, cases: [] };
  }
  const [verdict, passed_cases, runtime_ms, memory_kb] = canonicalRuns[question.slug];
  const total = question.test_cases.length;
  return {
    ...base, language_id: 63, verdict, passed_cases, total_cases: total, runtime_ms, memory_kb,
    // Same shape recordSubmission stores: visible cases only, hidden ones stay out of the record.
    cases: question.test_cases
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => !c.is_hidden)
      .map(({ c, i }) => ({ name: c.name, passed: i < passed_cases, runtime_ms: Math.floor(runtime_ms / total) })),
  };
}

/** Empties every collection, builds indexes, then inserts the demo data. Safe to run repeatedly. */
export async function seed() {
  await Promise.all(MODELS.map((m) => m.deleteMany({})));
  // init() so the unique and partial indexes exist before the first insert, even in a fresh database.
  await Promise.all(MODELS.map((m) => m.init()));

  const password_hash = await bcrypt.hash(PASSWORD, 10);
  const hosea = await User.create({ ...userData.hosea, password_hash });
  const nadia = await User.create({ ...userData.nadia, password_hash });

  // Ordered insert: ObjectIds rise in array order, which is the session order.
  const inserted = await Question.insertMany(questionData);
  const questions = new Map(inserted.map((q) => [q.slug, q]));

  const pathDocs = await LearningPath.insertMany(paths);
  const beginner = pathDocs.find((p) => p.level === 'beginner');
  const moduleDocs = await Module.insertMany(moduleData.map((m) => ({ ...m, path_id: beginner._id })));
  const moduleByOrder = new Map(moduleDocs.map((m) => [m.order, m]));
  await Progress.insertMany([
    { user_id: hosea._id, module_id: moduleByOrder.get(1)._id, state: 'completed', percent_complete: 100 },
    { user_id: hosea._id, module_id: moduleByOrder.get(2)._id, state: 'in_progress', percent_complete: 60 },
  ]);

  // DATA DEMO: snapshot tanpa submission
  // The progress chart needs five sittings; only the last one is backed by real submissions.
  await AssessmentSession.insertMany(historySnapshots.map((s) => ({
    user_id: hosea._id, kind: s.kind, status: 'finished', question_ids: [],
    started_at: new Date(s.started_at), finished_at: new Date(s.started_at),
    result: {
      earned: Math.round((POSSIBLE_TOTAL * s.percentage) / 100),
      possible: POSSIBLE_TOTAL,
      percentage: s.percentage,
      level: levelFor(s.percentage),
    },
  })));

  const session = await AssessmentSession.create({
    user_id: hosea._id, kind: 'diagnostic', started_at: CANONICAL_START,
    question_ids: inserted.map((q) => q._id),
  });
  const submissions = inserted.map((q, i) => {
    const sub = canonicalSubmission(q, i, hosea, session);
    return { ...sub, points_earned: scoreSubmission(sub, q) };
  });
  await Submission.insertMany(submissions);
  // Finishing through the real service keeps the seeded result identical to what the app would compute.
  await finishSession(session, CANONICAL_FINISH);

  return {
    users: { hosea: await User.findById(hosea._id), nadia },
    questions,
  };
}
