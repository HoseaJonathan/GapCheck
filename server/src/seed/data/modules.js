/**
 * Modul untuk path `beginner` (seed.js yang mengisi path_id). Hanya order 1, 2, 4, 7:
 * karena itu langkah async punya 3 modul, rest-api 1, dan react 0.
 * Progres per user ada di koleksi progress, bukan di sini.
 */
export const modules = [
  { order: 1, title: 'Callback, Promise, dan async/await', topic: 'async', bloom_level: 'understand', estimated_minutes: 25, unlock_rule: 'open' },
  { order: 2, title: 'Error handling pada kode asinkron', topic: 'async', bloom_level: 'understand', estimated_minutes: 20, unlock_rule: 'open' },
  {
    order: 4, title: 'Kenapa try/catch tidak menangkap error Promise', topic: 'async', bloom_level: 'understand', estimated_minutes: 18, unlock_rule: 'open',
    body: [
      { type: 'lead', text: 'Submission kamu pada soal "Ringkas data transaksi" mengembalikan undefined, bukan error. Modul ini menjelaskan kenapa.' },
      { type: 'code', label: 'Sebelum', code: "try {\n  fetchData().then(render);\n} catch (err) {\n  console.error(err);\n}" },
      { type: 'callout', tone: 'warn', text: 'Skor kamu nol di soal ini karena catch tidak pernah dieksekusi: error terjadi setelah blok try selesai, di dalam microtask Promise.' },
      { type: 'code', label: 'Sesudah', code: "try {\n  const data = await fetchData();\n  render(data);\n} catch (err) {\n  console.error(err);\n}" },
    ],
    quiz: [
      {
        question: 'Kapan try/catch sinkron bisa menangkap error dari Promise?',
        options: [
          { key: 'a', text: 'Selalu' },
          { key: 'b', text: 'Hanya jika Promise di-await di dalam blok try' },
          { key: 'c', text: 'Hanya pada Node, tidak di browser' },
        ],
        correct_answer: 'b',
      },
    ],
  },
  { order: 7, title: 'Validasi query parameter', topic: 'rest-api', bloom_level: 'apply', estimated_minutes: 22, unlock_rule: 'locked', unlock_hint: 'Selesaikan kuis modul 04 untuk membuka' },
];
