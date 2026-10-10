import { PORT, MONGODB_URI } from './config.js';
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
  createApp().listen(PORT, () => {
    console.log(`[gapcheck] API on http://localhost:${PORT}  (demo login: hosea@gapcheck.test / password123)`);
  });
};

start();
