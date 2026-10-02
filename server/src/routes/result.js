import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { classify, POINTS } from '../scoring.js';
import { learning_paths, users } from '../data/seed.js';

const router = Router();

/**
 * The prototype replays the canonical mockup session (168 / 290 = 57.93%)
 * so the result screen shows arithmetic that is actually computed, not typed.
 * Phase 4 replaces this with the real session's submissions.
 */
function canonicalSession() {
  const mk = (d, n) => Array.from({ length: n }, (_, i) => ({
    _id: `${d}-${i + 1}`, difficulty: d, type: 'code', points: POINTS[d],
  }));
  const questions = [...mk('easy', 5), ...mk('medium', 6), ...mk('hard', 4)];
  const full = (id) => ({ question_id: id, verdict: 'Accepted', passed_cases: 5, total_cases: 5 });
  const part = (id, p, t) => ({ question_id: id, verdict: 'Wrong Answer', passed_cases: p, total_cases: t });
  const submissions = [
    ...[1, 2, 3, 4, 5].map((i) => full(`easy-${i}`)),
    ...[1, 2, 3, 4].map((i) => full(`medium-${i}`)),
    part('medium-5', 2, 5), part('medium-6', 0, 4),
    full('hard-1'), part('hard-2', 0, 5), part('hard-3', 0, 5), part('hard-4', 0, 5),
  ];
  return { questions, submissions };
}

router.get('/result', requireAuth, (req, res) => {
  const { questions, submissions } = canonicalSession();
  const score = classify(submissions, questions);
  const path = learning_paths.find((p) => p.level === score.level) || learning_paths[0];

  res.json({
    ...score,
    narrative: {
      solid: [
        'Sintaks dasar JavaScript dan manipulasi DOM sudah kokoh — lima soal easy lolos seluruhnya.',
        'Kamu bisa membaca kode orang lain dan menjelaskan perbedaannya.',
      ],
      gaps: [
        'Async error handling adalah satu-satunya topik yang masih menahan skor — tiga soal, tidak ada yang lolos.',
        'Validasi query parameter pada Express gagal di kasus nilai tidak valid, bukan di routing.',
      ],
      summary:
        `Kamu berada ${score.pointsToNextLevel} poin dari Intermediate. Fondasinya sudah ada; yang belum terbentuk adalah cara kamu menangani kegagalan di kode asinkron.`,
    },
    learning_path: path,
    user: { level: score.level, previous_level: users[0].level },
  });
});

export default router;
