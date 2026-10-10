import mongoose from 'mongoose';

// acceptance_rate is deliberately absent: it is derived from submissions, so storing it would go stale.
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    // null = has not finished a diagnostic yet; Mongoose needs null listed explicitly in an enum.
    level: { type: String, enum: [null, 'new', 'beginner', 'intermediate'], default: null },
    diagnostic_status: { type: Boolean, default: false },
    profile: {
      display_name: String,
      initials: String,
    },
    statistics: {
      streak_days: { type: Number, default: 0 },
      bonus_points: { type: Number, default: 0 },
    },
  },
  { collection: 'users', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export default mongoose.model('User', userSchema);
