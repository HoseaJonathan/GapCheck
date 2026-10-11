import bcrypt from 'bcryptjs';

import User from '../models/User.js';
import Question from '../models/Question.js';
import AssessmentSession from '../models/AssessmentSession.js';
import Submission from '../models/Submission.js';
import LearningPath from '../models/LearningPath.js';
import Module from '../models/Module.js';
import Progress from '../models/Progress.js';
import QuizAttempt from '../models/QuizAttempt.js';
import { POINTS, THRESHOLDS, scoreSubmission } from '../scoring.js';
import { finishSession } from '../services/sessions.js';
import { questions as questionData } from './data/questions.js';
import { paths } from './data/paths.js';
import { modulesByLevel } from './data/modules.js';
import {
  PASSWORD, users as userData, historySnapshots, canonicalRuns, CANONICAL_START, CANONICAL_FINISH,
} from './data/users.js';

const MODELS = [User, Question, AssessmentSession, Submission, LearningPath, Module, Progress, QuizAttempt];
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

// Hosea finished module 1 before his last sitting (2026-09-22), so it alone cannot unlock a checkpoint.
const HOSEA_MODULE_1_DONE = new Date('2026-09-10T10:00:00Z');

/**
 * Inserts one path's modules in order so each module's prerequisite (order - 1)
 * already has an _id; the first module has no prerequisite.
 */
async function insertPathModules(pathId, modules) {
  const docs = [];
  for (const m of [...modules].sort((a, b) => a.order - b.order)) {
    docs.push(await Module.create({ ...m, path_id: pathId, requires: docs.at(-1)?._id ?? null }));
  }
  return docs;
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
  const modulesByPath = {};
  for (const path of pathDocs) {
    modulesByPath[path.level] = await insertPathModules(path._id, modulesByLevel[path.level] ?? []);
  }
  const [hoseaFirst, hoseaSecond] = modulesByPath.beginner;
  await Progress.insertMany([
    {
      user_id: hosea._id, module_id: hoseaFirst._id, state: 'completed', percent_complete: 100,
      completed_at: HOSEA_MODULE_1_DONE,
    },
    { user_id: hosea._id, module_id: hoseaSecond._id, state: 'in_progress', percent_complete: 50 },
  ]);
  // Completion only comes from passing the quiz, so module 1 needs its passing attempt.
  // Answers come from the content data, which is the single source of the key.
  const answers = modulesByLevel.beginner.find((m) => m.order === 1).quiz.map((q) => q.correct_answer);
  await QuizAttempt.create({
    user_id: hosea._id, module_id: hoseaFirst._id, answers,
    correct_count: answers.length, total: answers.length, score: 1, passed: true,
    submitted_at: HOSEA_MODULE_1_DONE,
  });

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
