import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    module_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
    percent_complete: { type: Number, default: 0 },
    // 'locked' is never stored: a module without a progress row is locked or open depending on `requires`.
    state: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
    completed_at: Date,
    last_position: mongoose.Schema.Types.Mixed,
  },
  // Only updated_at: a progress row is moving state, its creation time carries no meaning.
  { collection: 'progress', timestamps: { createdAt: false, updatedAt: 'updated_at' } },
);

progressSchema.index({ user_id: 1, module_id: 1 }, { unique: true });

export default mongoose.model('Progress', progressSchema);
