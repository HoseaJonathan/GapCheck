import mongoose from 'mongoose';

const BLOOM_LEVELS = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];

const questionSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    points: { type: Number, required: true },
    type: { type: String, enum: ['code', 'mcq'], required: true },
    bloom_level: { type: String, enum: BLOOM_LEVELS, required: true },
    // Topic accuracy is computed per tag, so a question without one would vanish from the analysis.
    tags: {
      type: [String],
      required: true,
      validate: { validator: (v) => v.length >= 1, message: 'tags must contain at least 1 item' },
    },
    description: { type: String, required: true },
    requirements: [String],
    sample: { request: String, expected: String },
    base_code: String,
    options: { type: [{ key: String, text: String, _id: false }], default: undefined },
    // Never leaves the server: excluded from every query unless asked for with +correct_answer.
    correct_answer: { type: String, select: false },
    test_cases: {
      type: [
        { name: String, stdin: String, expected_output: String, is_hidden: { type: Boolean, default: false }, _id: false },
      ],
      default: undefined,
    },
    is_published: { type: Boolean, default: true },
  },
  { collection: 'questions' },
);

export default mongoose.model('Question', questionSchema);
