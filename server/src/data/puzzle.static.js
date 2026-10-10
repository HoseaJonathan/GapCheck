/**
 * Daily Puzzle — statis sampai keputusan A6 diambil tim.
 *
 * Deliberately not a collection: how puzzles rotate, how streaks are counted and
 * whether bonus points ever touch the level are still open (A6), so a schema now
 * would only encode a guess. No `_id` either, because this is not a document.
 * The puzzle is shown as already solved, which is why its key ships with it.
 */
export const puzzle = {
  date: '2026-09-22', level: 'beginner', topic: 'async',
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
