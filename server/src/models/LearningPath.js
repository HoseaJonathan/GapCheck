import mongoose from 'mongoose';

// module_count per step is derived from existing modules, not stored.
const learningPathSchema = new mongoose.Schema(
  {
    level: { type: String, enum: ['new', 'beginner', 'intermediate'], required: true },
    title: { type: String, required: true },
    description: String,
    steps: [{ title: String, topic: String, reason: String, _id: false }],
  },
  { collection: 'learning_paths' },
);

export default mongoose.model('LearningPath', learningPathSchema);
