import { ADMIN_ENABLED } from '../config.js';
import User from '../models/User.js';

/** Whether a loaded user document gets the admin bypasses; always false in production. */
export const isAdminUser = (user) => ADMIN_ENABLED && user?.role === 'admin';

export async function isAdmin(userId) {
  return isAdminUser(await User.findById(userId).select('role').lean());
}
