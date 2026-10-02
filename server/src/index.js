import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';

import { PORT, CLIENT_ORIGIN } from './config.js';
import { users } from './data/seed.js';
import authRoutes from './routes/auth.js';
import questionRoutes from './routes/questions.js';
import submissionRoutes from './routes/submissions.js';
import resultRoutes from './routes/result.js';
import progressRoutes from './routes/progress.js';

const app = express();

// Middleware, minimal and explicit.
app.use(helmet());
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => res.json({ ok: true, storage: 'in-memory-stub' }));

app.use(authRoutes);
app.use(questionRoutes);
app.use(submissionRoutes);
app.use(resultRoutes);
app.use(progressRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not Found', path: req.path }));

// Async throughout — BAB 2 argues the non-blocking event loop is why
// concurrent sessions work, so nothing here may block.
const start = async () => {
  users[0].password_hash = await bcrypt.hash('password123', 10);
  app.listen(PORT, () => {
    console.log(`[gapcheck] API on http://localhost:${PORT}  (demo login: hosea@gapcheck.test / password123)`);
  });
};

start();

export default app;
