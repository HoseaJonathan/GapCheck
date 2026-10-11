import mongoose from 'mongoose';

// Every submit is kept as its own row (never overwritten): retake rules and history are derived from the attempt list.
const quizAttemptSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    module_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
    // One chosen option key per question, in quiz order.
    answers: { type: [String], required: true },
    correct_count: { type: Number, required: true },
    total: { type: Number, required: true },
    score: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    submitted_at: { type: Date, required: true },
  },
  { collection: 'quiz_attempts' },
);

// Attempts are read per learner per module in chronological order.
quizAttemptSchema.index({ user_id: 1, module_id: 1, submitted_at: 1 });

export default mongoose.model('QuizAttempt', quizAttemptSchema);
