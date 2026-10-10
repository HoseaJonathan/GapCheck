import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import { setupTestDb } from './helpers.js';
import User from '../models/User.js';
import Question from '../models/Question.js';
import AssessmentSession from '../models/AssessmentSession.js';
import Submission from '../models/Submission.js';
import LearningPath from '../models/LearningPath.js';
import Module from '../models/Module.js';
import Progress from '../models/Progress.js';

setupTestDb();

const validUser = { username: 'tester', email: 'tester@gapcheck.test', password_hash: 'x' };
const validQuestion = {
  slug: 'q-code', title: 'Code question', difficulty: 'easy', points: 10, type: 'code',
  bloom_level: 'apply', tags: ['javascript'], description: 'd',
};
const validMcq = {
  slug: 'q-mcq', title: 'MCQ question', difficulty: 'easy', points: 10, type: 'mcq',
  bloom_level: 'remember', tags: ['javascript'], description: 'd',
  options: [{ key: 'a', text: 'A' }, { key: 'b', text: 'B' }], correct_answer: 'b',
};

test('question without tags is rejected', async () => {
  await assert.rejects(Question.create({ ...validQuestion, tags: [] }), { name: 'ValidationError' });
  const { tags, ...noTags } = validQuestion;
  await assert.rejects(Question.create(noTags), { name: 'ValidationError' });
});

test('correct_answer is not selected by default', async () => {
  const q = await Question.create(validMcq);
  const read = await Question.findById(q._id).lean();
  assert.equal('correct_answer' in read, false);
  const withKey = await Question.findById(q._id).select('+correct_answer').lean();
  assert.equal(withKey.correct_answer, 'b');
});

test('module quiz correct_answer is not selected by default', async () => {
  const m = await Module.create({
    path_id: new mongoose.Types.ObjectId(), order: 1, title: 'M', topic: 'async', bloom_level: 'understand',
    body: [{ type: 'callout', tone: 'warn', text: 't' }],
    quiz: [{ question: 'q?', options: [{ key: 'a', text: 'A' }], correct_answer: 'a' }],
  });
  const read = await Module.findById(m._id).lean();
  assert.equal(read.quiz.length, 1);
  assert.equal('correct_answer' in read.quiz[0], false);
  assert.equal(read.body[0].type, 'callout');
  const withKey = await Module.findById(m._id).select('+quiz.correct_answer').lean();
  assert.equal(withKey.quiz[0].correct_answer, 'a');
});

test('invalid enum values are rejected', async () => {
  await assert.rejects(Question.create({ ...validQuestion, slug: 'bad', difficulty: 'extreme' }), { name: 'ValidationError' });
  await assert.rejects(User.create({ ...validUser, email: 'e@x.test', level: 'expert' }), { name: 'ValidationError' });
});

test('user level defaults to null and timestamps use snake_case', async () => {
  const u = await User.create({ ...validUser, email: 'lvl@gapcheck.test', username: 'lvl' });
  assert.equal(u.level, null);
  assert.equal(u.diagnostic_status, false);
  assert.ok(u.created_at instanceof Date && u.updated_at instanceof Date);
});

test('duplicate email -> code 11000', async () => {
  await User.init();
  await User.create(validUser);
  await assert.rejects(User.create({ ...validUser, username: 'other' }), { code: 11000 });
});

test('duplicate slug -> code 11000', async () => {
  await Question.init();
  await assert.rejects(Question.create(validMcq), { code: 11000 });
});

test('only one in_progress session per user', async () => {
  await AssessmentSession.init();
  const uid = new mongoose.Types.ObjectId();
  const base = { user_id: uid, kind: 'diagnostic', status: 'in_progress', started_at: new Date(), question_ids: [] };
  await AssessmentSession.create(base);
  await assert.rejects(AssessmentSession.create(base), { code: 11000 });
  await AssessmentSession.create({ ...base, status: 'finished' }); // finished is exempt
  await AssessmentSession.create({ ...base, status: 'finished' });
});

test('progress (user_id, module_id) is unique', async () => {
  await Progress.init();
  const row = { user_id: new mongoose.Types.ObjectId(), module_id: new mongoose.Types.ObjectId(), state: 'in_progress' };
  await Progress.create(row);
  await assert.rejects(Progress.create(row), { code: 11000 });
  const saved = await Progress.findOne({ user_id: row.user_id }).lean();
  assert.ok(saved.updated_at instanceof Date);
  assert.equal('created_at' in saved, false);
});

test('submission verdict is constrained', async () => {
  const base = {
    user_id: new mongoose.Types.ObjectId(), question_id: new mongoose.Types.ObjectId(),
    verdict: 'Accepted', submitted_at: new Date(),
  };
  await Submission.create(base);
  await assert.rejects(Submission.create({ ...base, verdict: 'Nope' }), { name: 'ValidationError' });
});

test('learning path stores steps', async () => {
  const lp = await LearningPath.create({
    level: 'beginner', title: 'T', description: 'D',
    steps: [{ title: 's', topic: 'async', reason: 'r' }],
  });
  assert.equal(lp.steps.length, 1);
});

test('collection names match BAB 3', () => {
  assert.equal(User.collection.name, 'users');
  assert.equal(Question.collection.name, 'questions');
  assert.equal(AssessmentSession.collection.name, 'assessment_sessions');
  assert.equal(Submission.collection.name, 'submissions');
  assert.equal(LearningPath.collection.name, 'learning_paths');
  assert.equal(Module.collection.name, 'modules');
  assert.equal(Progress.collection.name, 'progress');
});
