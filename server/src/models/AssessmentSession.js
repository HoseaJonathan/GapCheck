import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: ['diagnostic', 'checkpoint'], required: true },
    status: { type: String, enum: ['in_progress', 'finished'], default: 'in_progress' },
    started_at: { type: Date, required: true, default: Date.now },
    finished_at: Date,
    elapsed_seconds: Number,
    question_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    // Snapshot taken at finish, so history does not change when the question bank is edited.
    result: { earned: Number, possible: Number, percentage: Number, level: String },
  },
  { collection: 'assessment_sessions' },
);

sessionSchema.index({ user_id: 1, started_at: 1 });
// The database, not application code, guarantees one open session per user (no race between two tabs).
sessionSchema.index({ user_id: 1 }, { unique: true, partialFilterExpression: { status: 'in_progress' } });

export default mongoose.model('AssessmentSession', sessionSchema);
