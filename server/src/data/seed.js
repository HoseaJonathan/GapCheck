/**
 * In-memory seed for the prototype. Field names match the BAB 3 collections
 * (users, questions, submissions, learning_paths, modules) plus the fields the
 * mockups require that BAB 3 does not yet have — those are marked EXTRA so the
 * document revision can be written against this list.
 */

export const users = [
  {
    _id: 'u1',
    username: 'hosea',
    email: 'hosea@gapcheck.test',
    password_hash: null, // filled at boot with bcrypt("password123")
    level: 'beginner',
    diagnostic_status: true,
    profile: { display_name: 'Hosea J. Effendi', initials: 'HJ' },
    statistics: { streak_days: 7, acceptance_rate: 0.62, bonus_points: 340 },
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-09-22T00:00:00Z',
  },
];

export const questions = [
  {
    _id: 'easy-1', slug: 'var-let-const', title: 'Deklarasi variabel',
    difficulty: 'easy', points: 10, weight_score: 1, type: 'mcq',
    bloom_level: 'remember',                       // EXTRA
    tags: ['javascript', 'syntax'],                // EXTRA: required, not optional
    description: 'Mana yang membuat binding yang tidak bisa di-reassign?',
    options: [                                      // EXTRA
      { key: 'a', text: 'var' }, { key: 'b', text: 'let' },
      { key: 'c', text: 'const' }, { key: 'd', text: 'function' },
    ],
    correct_answer: 'c',                            // EXTRA
    is_published: true,
  },
  {
    _id: 'easy-2', slug: 'dom-query', title: 'Memilih elemen DOM',
    difficulty: 'easy', points: 10, weight_score: 1, type: 'mcq',
    bloom_level: 'remember', tags: ['dom'],
    description: 'Method mana yang mengembalikan elemen pertama yang cocok dengan selector CSS?',
    options: [
      { key: 'a', text: 'getElementsByClassName' },
      { key: 'b', text: 'querySelector' },
      { key: 'c', text: 'querySelectorAll' },
      { key: 'd', text: 'getElementById' },
    ],
    correct_answer: 'b',
    is_published: true,
  },
  {
    _id: 'medium-5', slug: 'array-utils', title: 'Ringkas data transaksi',
    difficulty: 'medium', points: 20, weight_score: 2, type: 'code',
    bloom_level: 'understand', tags: ['javascript', 'array-methods'],
    description:
      'Tulis summarize(transactions) yang mengembalikan total nilai per kategori.',
    requirements: [                                  // EXTRA
      'Kembalikan object biasa, bukan Map.',
      'Kategori tanpa transaksi tidak muncul di hasil.',
      'Jangan mutasi array input.',
    ],
    sample: {                                        // EXTRA
      request: "summarize([{cat:'food',amount:20},{cat:'food',amount:5}])",
      expected: "{ food: 25 }",
    },
    base_code:
      'function summarize(transactions) {\n  // your code here\n}\n\nmodule.exports = summarize;\n',
    test_cases: [                                    // EXTRA — absent from BAB 3
      { name: 'empty array', stdin: '[]', expected_output: '{}', is_hidden: false },
      { name: 'single category', stdin: '[{"cat":"food","amount":20}]', expected_output: '{"food":20}', is_hidden: false },
      { name: 'two categories', stdin: '[{"cat":"food","amount":20},{"cat":"transport","amount":8}]', expected_output: '{"food":20,"transport":8}', is_hidden: false },
      { name: 'duplicate keys', stdin: '[{"cat":"food","amount":20},{"cat":"food","amount":5}]', expected_output: '{"food":25}', is_hidden: false },
      { name: 'negative amounts', stdin: '[{"cat":"food","amount":-5}]', expected_output: '{"food":-5}', is_hidden: true },
    ],
    is_published: true,
  },
  {
    _id: 'hard-2', slug: 'questions-difficulty-filter',
    title: 'GET /questions?difficulty=',
    difficulty: 'hard', points: 30, weight_score: 3, type: 'code',
    bloom_level: 'apply', tags: ['express', 'rest-api', 'validation'],
    description:
      'Bangun handler GET /questions yang menerima query param difficulty opsional.',
    requirements: [
      'Tanpa parameter: kembalikan semua soal yang is_published true.',
      'Nilai valid (easy | medium | hard): kembalikan hanya soal dengan difficulty itu.',
      'Nilai tidak valid: balas 400, jangan lempar exception.',
      'Query yang ditolak tidak boleh menggantung request.',
    ],
    sample: {
      request: 'GET /questions?difficulty=medium',
      expected: '200 [ { "_id": "medium-5", "difficulty": "medium", ... } ]',
    },
    base_code:
      "const express = require('express');\nconst router = express.Router();\n\nrouter.get('/questions', (req, res) => {\n  // your code here\n});\n\nmodule.exports = router;\n",
    test_cases: [
      { name: 'no parameter', stdin: '/questions', expected_output: '200:all', is_hidden: false },
      { name: 'valid value', stdin: '/questions?difficulty=medium', expected_output: '200:filtered', is_hidden: false },
      { name: 'invalid value', stdin: '/questions?difficulty=impossible', expected_output: '400', is_hidden: false },
      { name: 'empty value', stdin: '/questions?difficulty=', expected_output: '400', is_hidden: false },
      { name: 'does not hang', stdin: '/questions?difficulty=%00', expected_output: '400', is_hidden: true },
    ],
    is_published: true,
  },
];

export const learning_paths = [
  {
    _id: 'lp-beginner', level: 'beginner',
    title: 'REST API dan React',
    description: 'Lanjutan dari fondasi JavaScript menuju integrasi klien-server.',
    modules_list: ['m01', 'm04', 'm07'],
    steps: [
      { title: 'JavaScript asinkron', module_count: 6, reason: 'Tiga soal async gagal seluruhnya — ini yang paling menahan skor.' },
      { title: 'REST API dengan Express', module_count: 9, reason: 'Soal GET /questions gagal di validasi parameter, bukan di routing.' },
      { title: 'React state dan data fetching', module_count: 7, reason: 'Belum diuji pada diagnostik; dibuka setelah dua langkah di atas.' },
    ],
  },
];

export const modules = [
  { _id: 'm01', path_id: 'lp-beginner', order: 1, title: 'Callback, Promise, dan async/await', topic: 'async', bloom_level: 'understand', estimated_minutes: 25, unlock_rule: 'open', progress_percent: 100 },
  { _id: 'm02', path_id: 'lp-beginner', order: 2, title: 'Error handling pada kode asinkron', topic: 'async', bloom_level: 'understand', estimated_minutes: 20, unlock_rule: 'open', progress_percent: 60 },
  { _id: 'm04', path_id: 'lp-beginner', order: 4, title: 'Kenapa try/catch tidak menangkap error Promise', topic: 'async', bloom_level: 'understand', estimated_minutes: 18, unlock_rule: 'open', progress_percent: 0, flagged_by_diagnostic: true,
    body: [
      { type: 'lead', text: 'Submission kamu pada soal "Ringkas data transaksi" mengembalikan undefined, bukan error. Modul ini menjelaskan kenapa.' },
      { type: 'code', label: 'Sebelum', code: "try {\n  fetchData().then(render);\n} catch (err) {\n  console.error(err);\n}" },
      { type: 'callout', tone: 'warn', text: 'Skor kamu nol di soal ini karena catch tidak pernah dieksekusi: error terjadi setelah blok try selesai, di dalam microtask Promise.' },
      { type: 'code', label: 'Sesudah', code: "try {\n  const data = await fetchData();\n  render(data);\n} catch (err) {\n  console.error(err);\n}" },
    ],
    quiz: [
      { question: 'Kapan try/catch sinkron bisa menangkap error dari Promise?', options: [
        { key: 'a', text: 'Selalu' },
        { key: 'b', text: 'Hanya jika Promise di-await di dalam blok try' },
        { key: 'c', text: 'Hanya pada Node, tidak di browser' },
      ], correct_answer: 'b' },
    ],
  },
  { _id: 'm07', path_id: 'lp-beginner', order: 7, title: 'Validasi query parameter', topic: 'rest-api', bloom_level: 'apply', estimated_minutes: 22, unlock_rule: 'locked', unlock_hint: 'Selesaikan kuis modul 04 untuk membuka', progress_percent: 0 },
];

/**
 * EXTRA — no collection in BAB 3. The Progress chart plots five sittings,
 * which a single diagnostic_status boolean cannot represent.
 */
export const assessment_sessions = [
  { _id: 's1', user_id: 'u1', kind: 'diagnostic', label: 'Diagnostic 1', percentage: 34.2, taken_at: '2026-08-04' },
  { _id: 's2', user_id: 'u1', kind: 'checkpoint', label: 'Checkpoint 1', percentage: 41.8, taken_at: '2026-08-18' },
  { _id: 's3', user_id: 'u1', kind: 'checkpoint', label: 'Checkpoint 2', percentage: 44.6, taken_at: '2026-09-01' },
  { _id: 's4', user_id: 'u1', kind: 'diagnostic', label: 'Diagnostic 2', percentage: 46.5, taken_at: '2026-09-12' },
  { _id: 's5', user_id: 'u1', kind: 'diagnostic', label: 'Today', percentage: 57.9, taken_at: '2026-09-22', elapsed_seconds: 2294 },
];

export const submissions = [
  { _id: 'sub1', user_id: 'u1', question_id: 'easy-1', question_title: 'Deklarasi variabel', difficulty: 'easy', verdict: 'Accepted', runtime_ms: 42, memory_kb: 8192, points_earned: 10, is_diagnostic: true, submitted_at: '2026-09-22T09:02:00Z' },
  { _id: 'sub2', user_id: 'u1', question_id: 'medium-5', question_title: 'Ringkas data transaksi', difficulty: 'medium', verdict: 'Wrong Answer', runtime_ms: 118, memory_kb: 12040, points_earned: 8, passed_cases: 2, total_cases: 5, is_diagnostic: true, submitted_at: '2026-09-22T09:19:00Z' },
  { _id: 'sub3', user_id: 'u1', question_id: 'hard-2', question_title: 'GET /questions?difficulty=', difficulty: 'hard', verdict: 'Time Limit Exceeded', runtime_ms: 5000, memory_kb: 20480, points_earned: 0, passed_cases: 1, total_cases: 5, is_diagnostic: true, submitted_at: '2026-09-22T09:38:00Z' },
];

export const topic_accuracy = [
  { topic: 'javascript', accuracy: 0.86 },
  { topic: 'dom', accuracy: 0.78 },
  { topic: 'react', accuracy: 0.54 },
  { topic: 'rest-api', accuracy: 0.41 },
  { topic: 'async', accuracy: 0.0, callout: { text: 'Async error handling adalah satu-satunya topik yang masih menahan skor — tiga soal, tidak ada yang lolos.', module_id: 'm04' } },
];

export const bloom_levels = [
  { level: 'remember', reached: true, accuracy: 0.9 },
  { level: 'understand', reached: true, accuracy: 0.66 },
  { level: 'apply', reached: true, accuracy: 0.33 },
  { level: 'analyze', reached: false, accuracy: 0.0 },
  { level: 'evaluate', locked: true, unlock_hint: 'Opens at Intermediate' },
  { level: 'create', locked: true, unlock_hint: 'Opens at Intermediate' },
];

export const puzzle = {
  _id: 'pz-2026-09-22', date: '2026-09-22', level: 'beginner', topic: 'async',
  bonus_points: 20,
  prompt: 'Kode berikut selalu mencetak undefined. Baris mana penyebabnya?',
  buggy_code: "async function total(ids) {\n  const values = ids.map(async (id) => await priceOf(id));\n  return values.reduce((a, b) => a + b, 0);\n}",
  options: [
    { key: 'a', text: 'priceOf tidak di-await' },
    { key: 'b', text: 'map mengembalikan array Promise, bukan array angka' },
    { key: 'c', text: 'reduce tidak bisa dipakai pada hasil map' },
  ],
  correct_answer: 'b',
  explanation:
    'Callback async selalu mengembalikan Promise, jadi values berisi Promise. Perlu await Promise.all(values) sebelum reduce.',
  chosen: 'b', solved: true, solve_time_seconds: 74,
  streak_days: 7,
  week_strip: [true, true, true, true, true, true, true],
  next_reset_in_seconds: 26040,
  total_bonus_points: 340,
  bonus_by_topic: [
    { topic: 'async', points: 140 },
    { topic: 'rest-api', points: 120 },
    { topic: 'react', points: 80 },
  ],
  recent: [
    { date: '2026-09-21', topic: 'rest-api', solve_time_seconds: 96, misses: 1 },
    { date: '2026-09-20', topic: 'async', solve_time_seconds: 61, misses: 0 },
    { date: '2026-09-19', topic: 'react', solve_time_seconds: 152, misses: 2 },
  ],
};
