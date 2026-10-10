import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    question_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    // Optional: module practice (sub-project 3) submits outside any assessment session.
    session_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentSession' },
    submitted_code: String,
    answer: String,
    language_id: Number,
    judge0_token: String,
    verdict: { type: String, enum: ['Accepted', 'Wrong Answer', 'Runtime Error', 'Time Limit Exceeded'], required: true },
    runtime_ms: Number,
    memory_kb: Number,
    passed_cases: { type: Number, default: 0 },
    total_cases: { type: Number, default: 0 },
    cases: [mongoose.Schema.Types.Mixed],
    points_earned: { type: Number, default: 0 },
    submitted_at: { type: Date, required: true, default: Date.now },
  },
  { collection: 'submissions' },
);

submissionSchema.index({ user_id: 1, submitted_at: 1 });
submissionSchema.index({ session_id: 1, question_id: 1 });

export default mongoose.model('Submission', submissionSchema);
