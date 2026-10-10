import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';

import { CLIENT_ORIGIN } from './config.js';
import { errorHandler } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import questionRoutes from './routes/questions.js';
import sessionRoutes from './routes/sessions.js';
import submissionRoutes from './routes/submissions.js';
import resultRoutes from './routes/result.js';
import progressRoutes from './routes/progress.js';
import moduleRoutes from './routes/modules.js';
import puzzleRoutes from './routes/puzzle.js';

// Factory without listen() so tests can build an app per suite.
export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: CLIENT_ORIGIN }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (req, res) =>
    res.json({ ok: true, storage: 'mongodb', db: mongoose.connection.readyState }));

  app.use(authRoutes);
  app.use(questionRoutes);
  app.use(sessionRoutes);
  app.use(submissionRoutes);
  app.use(resultRoutes);
  app.use(progressRoutes);
  app.use(moduleRoutes);
  app.use(puzzleRoutes);

  // reason keeps the { error, reason } shape every other error has; path helps spot a typo in the URL.
  app.use((req, res) => res.status(404).json({ error: 'Not Found', reason: 'not_found', path: req.path }));
  app.use(errorHandler);

  return app;
}
