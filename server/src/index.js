import bcrypt from 'bcryptjs';

import { PORT, MONGODB_URI } from './config.js';
import { users } from './data/seed.js';
import { connect } from './db.js';
import { createApp } from './app.js';

// Async throughout — BAB 2 argues the non-blocking event loop is why
// concurrent sessions work, so nothing here may block.
const start = async () => {
  try {
    await connect(MONGODB_URI);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  // Temporary: routes still read the in-memory seed until they move to Mongo.
  users[0].password_hash = await bcrypt.hash('password123', 10);
  createApp().listen(PORT, () => {
    console.log(`[gapcheck] API on http://localhost:${PORT}  (demo login: hosea@gapcheck.test / password123)`);
  });
};

start();
