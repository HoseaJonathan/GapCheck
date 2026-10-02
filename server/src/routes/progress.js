import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  assessment_sessions, bloom_levels, learning_paths, modules,
  puzzle, submissions, topic_accuracy, users,
} from '../data/seed.js';

const router = Router();

router.get('/progress', requireAuth, (req, res) => {
  const latest = assessment_sessions.at(-1);
  const previous = assessment_sessions.at(-2);
  const first = assessment_sessions[0];
  const completed = modules.filter((m) => m.progress_percent === 100).length;

  res.json({
    weighted_score: latest.percentage,
    // MOCKUP BUG: the tile reads "11.4 since first test", but 57.9 - 34.2 = 23.7.
    // 11.4 is the gain since Diagnostic 2. Both deltas are returned so the UI
    // can label each one correctly instead of repeating the mistake.
    delta_since_first: Number((latest.percentage - first.percentage).toFixed(1)),
    delta_since_previous: Number((latest.percentage - previous.percentage).toFixed(1)),
    level: users[0].level,
    points_to_next_level: Number((71 - latest.percentage).toFixed(1)),
    modules_completed: completed,
    // MOCKUP BUG: header and Progress tile say 24, but the path steps are
    // 6 + 9 + 7 = 22. The steps are the source of truth here.
    modules_total: learning_paths[0].steps.reduce((a, s) => a + s.module_count, 0),
    acceptance_rate: users[0].statistics.acceptance_rate,
    sessions: assessment_sessions,
    intermediate_threshold: 71,
    topic_accuracy: [...topic_accuracy].sort((a, b) => b.accuracy - a.accuracy),
    bloom_levels,
    recent_submissions: [...submissions].reverse(),
  });
});

router.get('/overview', requireAuth, (req, res) => {
  const latest = assessment_sessions.at(-1);
  const next = modules.find((m) => m.flagged_by_diagnostic);
  res.json({
    headline: `Kamu ${Number((71 - latest.percentage).toFixed(1))} poin dari Intermediate.`,
    weighted_score: latest.percentage,
    band: { new: 40, beginner: 41, intermediate: 71 },
    level: users[0].level,
    next_up: {
      module: next,
      reason: 'Diurutkan pertama karena modul ini membuka dua modul terkunci di langkah berikutnya.',
    },
    in_progress: modules.filter((m) => m.progress_percent > 0 && m.progress_percent < 100),
    path_steps: learning_paths[0].steps,
    puzzle: {
      date: puzzle.date, topic: puzzle.topic, bonus_points: puzzle.bonus_points,
      streak_days: puzzle.streak_days, week_strip: puzzle.week_strip, solved: puzzle.solved,
    },
  });
});

router.get('/modules', requireAuth, (req, res) => res.json({ modules }));

router.get('/modules/:id', requireAuth, (req, res) => {
  const mod = modules.find((m) => m._id === req.params.id);
  if (!mod) return res.status(404).json({ error: 'Not Found' });
  res.json({ module: mod, siblings: modules });
});

router.get('/puzzle', requireAuth, (req, res) => res.json({ puzzle }));

export default router;
