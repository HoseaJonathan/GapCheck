export const PASSWORD = 'password123';

export const users = {
  hosea: {
    username: 'hosea',
    email: 'hosea@gapcheck.test',
    profile: { display_name: 'Hosea J. Effendi', initials: 'HJ' },
    statistics: { streak_days: 7, bonus_points: 340 },
    created_at: new Date('2026-08-01T00:00:00Z'),
  },
  nadia: {
    username: 'nadia',
    email: 'nadia@gapcheck.test',
    profile: { display_name: 'Nadia Pramesti', initials: 'NP' },
    statistics: { streak_days: 0, bonus_points: 0 },
  },
};

/** Riwayat hosea yang hanya berupa persentase; earned/possible/level diturunkan di seed.js. */
export const historySnapshots = [
  { kind: 'diagnostic', started_at: '2026-08-04', percentage: 34.2 },
  { kind: 'checkpoint', started_at: '2026-08-18', percentage: 41.8 },
  { kind: 'checkpoint', started_at: '2026-09-01', percentage: 44.6 },
  { kind: 'diagnostic', started_at: '2026-09-12', percentage: 46.5 },
];

/**
 * Hasil kanonik sesi kelima untuk soal code: [verdict, passed_cases, runtime_ms, memory_kb].
 * Soal MCQ semuanya dijawab benar, jadi tidak perlu ditulis di sini.
 */
export const canonicalRuns = {
  'filter-active-users': ['Accepted', 4, 64, 9216],
  'toggle-class': ['Accepted', 4, 58, 9216],
  'array-utils': ['Wrong Answer', 2, 118, 12040],
  'promise-all-prices': ['Wrong Answer', 0, 96, 9216],
  'group-by-key': ['Accepted', 5, 87, 10240],
  'questions-difficulty-filter': ['Time Limit Exceeded', 1, 5000, 20480],
  'retry-with-backoff': ['Wrong Answer', 0, 140, 11264],
  'async-error-middleware': ['Runtime Error', 0, 35, 8192],
};

export const CANONICAL_START = new Date('2026-09-22T09:00:00Z');
export const CANONICAL_FINISH = new Date('2026-09-22T09:38:14Z');
