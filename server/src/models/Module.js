import mongoose from 'mongoose';

// One block shape for every kind (lead | code | callout ...); which of text/label/code/tone is set depends on type.
const blockSchema = new mongoose.Schema(
  { type: { type: String, required: true }, text: String, label: String, code: String, tone: String },
  { _id: false },
);

const quizItemSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: [{ key: String, text: String, _id: false }],
    // Never sent to the client; read it with .select('+quiz.correct_answer') when grading.
    correct_answer: { type: String, select: false },
    // Shown only after an attempt is graded, so it is hidden like correct_answer.
    explanation: { type: String, select: false },
  },
  { _id: false },
);

// progress_percent and flagged_by_diagnostic live elsewhere (progress collection / computed).
const moduleSchema = new mongoose.Schema(
  {
    path_id: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningPath', required: true },
    order: { type: Number, required: true },
    title: { type: String, required: true },
    topic: { type: String, required: true },
    bloom_level: { type: String, enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'] },
    body: [blockSchema],
    quiz: [quizItemSchema],
    estimated_minutes: Number,
    // Prerequisite module; null means the module is open from the start. Gating is computed from this, not stored.
    requires: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', default: null },
  },
  { collection: 'modules' },
);

export default mongoose.model('Module', moduleSchema);
