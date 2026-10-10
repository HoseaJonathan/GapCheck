import { MONGODB_URI } from '../config.js';
import { connect, disconnect } from '../db.js';
import Question from '../models/Question.js';
import LearningPath from '../models/LearningPath.js';
import Module from '../models/Module.js';
import User from '../models/User.js';
import AssessmentSession from '../models/AssessmentSession.js';
import Submission from '../models/Submission.js';
import Progress from '../models/Progress.js';
import { seed, assertSeedAllowed } from './seed.js';

try {
  assertSeedAllowed();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

await connect(MONGODB_URI);
try {
  await seed();
  const counts = {
    questions: await Question.countDocuments(),
    learning_paths: await LearningPath.countDocuments(),
    modules: await Module.countDocuments(),
    users: await User.countDocuments(),
    assessment_sessions: await AssessmentSession.countDocuments(),
    submissions: await Submission.countDocuments(),
    progress: await Progress.countDocuments(),
  };
  console.log(Object.entries(counts).map(([name, n]) => `${name} ${n}`).join(', '));
} finally {
  await disconnect();
}
