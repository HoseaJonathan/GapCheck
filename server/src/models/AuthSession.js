import mongoose from 'mongoose';

/**
 * One row per login. The access JWT carries this _id as `sid`, so revoking the row
 * (logout, refresh-token reuse) ends the session at once instead of when the JWT expires.
 * Only SHA-256 hashes of refresh tokens are stored: a leaked collection cannot be replayed.
 */
const authSessionSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    refresh_hash: { type: String, required: true, unique: true },
    // The hash rotated out by the last refresh, kept to tell a concurrent refresh from a replayed token.
    previous_refresh_hash: { type: String, default: null },
    rotated_at: { type: Date, default: null },
    expires_at: { type: Date, required: true },
    revoked_at: { type: Date, default: null },
    revoked_reason: { type: String, enum: [null, 'logout', 'refresh_reuse'], default: null },
  },
  { collection: 'auth_sessions', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

authSessionSchema.index({ previous_refresh_hash: 1 });
// MongoDB deletes a row once its refresh token can no longer be used.
authSessionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('AuthSession', authSessionSchema);
