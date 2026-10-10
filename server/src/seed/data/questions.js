import { POINTS } from '../../scoring.js';

/**
 * Bank soal. Urutan array = urutan soal dalam sesi (easy -> medium -> hard),
 * dan insertMany memberi _id naik berurutan, jadi urutan ini juga menjadi
 * tie-break `_id` di listPublished.
 *
 * Soal code memakai satu argumen JSON dari stdin dan dibandingkan dengan
 * expected_output; tepat satu test case tersembunyi per soal.
 */

const withPoints = (type) => (q) => ({
  type, is_published: true, ...q, points: POINTS[q.difficulty],
});
const mcq = withPoints('mcq');
const code = withPoints('code');

export const questions = [
  // --- easy ---------------------------------------------------------------
  mcq({
    slug: 'var-let-const', title: 'Deklarasi variabel',
    difficulty: 'easy', bloom_level: 'remember', tags: ['javascript'],
    description: 'Mana yang membuat binding yang tidak bisa di-reassign?',
    options: [
      { key: 'a', text: 'var' }, { key: 'b', text: 'let' },
      { key: 'c', text: 'const' }, { key: 'd', text: 'function' },
    ],
    correct_answer: 'c',
  }),
  mcq({
    slug: 'dom-query', title: 'Memilih elemen DOM',
    difficulty: 'easy', bloom_level: 'remember', tags: ['dom'],
    description: 'Method mana yang mengembalikan elemen pertama yang cocok dengan selector CSS?',
    options: [
      { key: 'a', text: 'getElementsByClassName' },
      { key: 'b', text: 'querySelector' },
      { key: 'c', text: 'querySelectorAll' },
      { key: 'd', text: 'getElementById' },
    ],
    correct_answer: 'b',
  }),
  mcq({
    slug: 'array-map-return', title: 'Nilai balik callback map',
    difficulty: 'easy', bloom_level: 'understand', tags: ['javascript', 'array-methods'],
    description:
      'Perhatikan kode berikut:\n\nconst result = [1, 2, 3].map((n) => { n * 2; });\n\nApa isi result?',
    options: [
      { key: 'a', text: '[2, 4, 6]' },
      { key: 'b', text: '[1, 2, 3]' },
      { key: 'c', text: 'undefined' },
      { key: 'd', text: '[undefined, undefined, undefined]' },
    ],
    correct_answer: 'd',
  }),
  mcq({
    slug: 'strict-equality', title: 'Operator kesamaan ketat',
    difficulty: 'easy', bloom_level: 'remember', tags: ['javascript'],
    description: 'Operator mana yang membandingkan nilai sekaligus tipe, tanpa konversi tipe otomatis?',
    options: [
      { key: 'a', text: '=' }, { key: 'b', text: '==' },
      { key: 'c', text: '===' }, { key: 'd', text: '!=' },
    ],
    correct_answer: 'c',
  }),
  mcq({
    slug: 'event-listener', title: 'Mendaftarkan event listener',
    difficulty: 'easy', bloom_level: 'understand', tags: ['dom'],
    description:
      "Kode button.addEventListener('click', handleClick()) menjalankan handleClick saat halaman dimuat, bukan saat tombol diklik. Kenapa?",
    options: [
      { key: 'a', text: 'Tanda kurung memanggil fungsi saat itu juga, sehingga yang didaftarkan adalah hasil panggilannya, bukan fungsinya' },
      { key: 'b', text: 'Event click selalu dipicu otomatis ketika halaman selesai dimuat' },
      { key: 'c', text: 'addEventListener menjalankan semua listener sekali saat didaftarkan' },
    ],
    correct_answer: 'a',
  }),

  // --- medium -------------------------------------------------------------
  mcq({
    slug: 'react-props-render', title: 'Render kondisional dengan &&',
    difficulty: 'medium', bloom_level: 'understand', tags: ['react'],
    description:
      'Perhatikan komponen berikut:\n\nfunction Badge({ count }) {\n  return <span>{count > 0 && count}</span>;\n}\n\nApa yang dirender oleh <Badge count={0} />?',
    options: [
      { key: 'a', text: 'Teks "false" di dalam span' },
      { key: 'b', text: 'Span kosong, tidak ada teks' },
      { key: 'c', text: 'Teks "0" di dalam span' },
      { key: 'd', text: 'Error karena boolean tidak bisa dirender' },
    ],
    correct_answer: 'b',
  }),
  code({
    slug: 'filter-active-users', title: 'Filter pengguna aktif',
    difficulty: 'medium', bloom_level: 'apply', tags: ['javascript', 'array-methods'],
    description:
      'Tulis activeNames(users) yang menerima array user dan mengembalikan array berisi name dari user yang sedang aktif.',
    requirements: [
      'Hanya user dengan active === true yang disertakan.',
      'Kembalikan array name saja, dengan urutan seperti di array input.',
      'User tanpa field active dianggap tidak aktif.',
      'Jangan mutasi array input.',
    ],
    sample: {
      request: "activeNames([{name:'Ayu',active:true},{name:'Budi',active:false}])",
      expected: "['Ayu']",
    },
    base_code:
      'function activeNames(users) {\n  // your code here\n}\n\nmodule.exports = activeNames;\n',
    test_cases: [
      { name: 'empty array', stdin: '[]', expected_output: '[]', is_hidden: false },
      { name: 'mixed users', stdin: '[{"name":"Ayu","active":true},{"name":"Budi","active":false},{"name":"Citra","active":true}]', expected_output: '["Ayu","Citra"]', is_hidden: false },
      { name: 'nobody active', stdin: '[{"name":"Budi","active":false}]', expected_output: '[]', is_hidden: false },
      { name: 'missing active field', stdin: '[{"name":"Dewi"},{"name":"Eka","active":true}]', expected_output: '["Eka"]', is_hidden: true },
    ],
  }),
  mcq({
    slug: 'express-route-params', title: 'Parameter rute Express',
    difficulty: 'medium', bloom_level: 'understand', tags: ['express', 'rest-api'],
    description:
      "Perhatikan rute berikut:\n\napp.get('/users/:id', (req, res) => res.json({ id: req.params.id }));\n\nApa respons untuk GET /users/42?active=true?",
    options: [
      { key: 'a', text: '{ "id": 42 }' },
      { key: 'b', text: '{ "id": "42?active=true" }' },
      { key: 'c', text: '{ "id": "42" }' },
      { key: 'd', text: '{ "id": "42", "active": "true" }' },
    ],
    correct_answer: 'c',
  }),
  code({
    slug: 'toggle-class', title: 'Toggle class elemen',
    difficulty: 'medium', bloom_level: 'apply', tags: ['dom'],
    description:
      'Tulis toggleClass({ classes, name }) yang meniru element.classList.toggle di atas array nama class: jika name sudah ada ia dihapus, jika belum ada ia ditambahkan.',
    requirements: [
      'Jika name ada di classes, kembalikan array tanpa name.',
      'Jika name tidak ada, kembalikan array dengan name ditambahkan di akhir.',
      'Kembalikan array baru; jangan mutasi classes.',
    ],
    sample: {
      request: "toggleClass({ classes: ['btn'], name: 'active' })",
      expected: "['btn', 'active']",
    },
    base_code:
      'function toggleClass({ classes, name }) {\n  // your code here\n}\n\nmodule.exports = toggleClass;\n',
    test_cases: [
      { name: 'adds a missing class', stdin: '{"classes":["btn"],"name":"active"}', expected_output: '["btn","active"]', is_hidden: false },
      { name: 'removes an existing class', stdin: '{"classes":["btn","active"],"name":"active"}', expected_output: '["btn"]', is_hidden: false },
      { name: 'empty list', stdin: '{"classes":[],"name":"hidden"}', expected_output: '["hidden"]', is_hidden: false },
      { name: 'duplicated class', stdin: '{"classes":["a","x","b","x"],"name":"x"}', expected_output: '["a","b"]', is_hidden: true },
    ],
  }),
  code({
    slug: 'array-utils', title: 'Ringkas data transaksi',
    difficulty: 'medium', bloom_level: 'understand', tags: ['javascript', 'array-methods'],
    description:
      'Tulis summarize(transactions) yang mengembalikan total nilai per kategori.',
    requirements: [
      'Kembalikan object biasa, bukan Map.',
      'Kategori tanpa transaksi tidak muncul di hasil.',
      'Jangan mutasi array input.',
    ],
    sample: {
      request: "summarize([{cat:'food',amount:20},{cat:'food',amount:5}])",
      expected: '{ food: 25 }',
    },
    base_code:
      'function summarize(transactions) {\n  // your code here\n}\n\nmodule.exports = summarize;\n',
    test_cases: [
      { name: 'empty array', stdin: '[]', expected_output: '{}', is_hidden: false },
      { name: 'single category', stdin: '[{"cat":"food","amount":20}]', expected_output: '{"food":20}', is_hidden: false },
      { name: 'two categories', stdin: '[{"cat":"food","amount":20},{"cat":"transport","amount":8}]', expected_output: '{"food":20,"transport":8}', is_hidden: false },
      { name: 'duplicate keys', stdin: '[{"cat":"food","amount":20},{"cat":"food","amount":5}]', expected_output: '{"food":25}', is_hidden: false },
      { name: 'negative amounts', stdin: '[{"cat":"food","amount":-5}]', expected_output: '{"food":-5}', is_hidden: true },
    ],
  }),
  code({
    slug: 'promise-all-prices', title: 'Total harga dengan Promise.all',
    difficulty: 'medium', bloom_level: 'apply', tags: ['async'],
    description:
      'Judge menyediakan priceOf(id), fungsi async yang mengembalikan harga satu produk (apel 5000, jeruk 8000, mangga 12000). Tulis totalPrice(ids) yang mengembalikan jumlah harga semua id.',
    requirements: [
      'totalPrice harus async dan mengembalikan angka, bukan array Promise.',
      'Ambil semua harga secara paralel dengan Promise.all, bukan satu per satu.',
      'Id yang muncul dua kali dihitung dua kali.',
    ],
    sample: {
      request: "await totalPrice(['apel', 'jeruk'])",
      expected: '13000',
    },
    base_code:
      "const { priceOf } = require('./prices'); // disediakan judge\n\nasync function totalPrice(ids) {\n  // your code here\n}\n\nmodule.exports = totalPrice;\n",
    test_cases: [
      { name: 'empty list', stdin: '[]', expected_output: '0', is_hidden: false },
      { name: 'single product', stdin: '["apel"]', expected_output: '5000', is_hidden: false },
      { name: 'three products', stdin: '["apel","jeruk","mangga"]', expected_output: '25000', is_hidden: false },
      { name: 'repeated product', stdin: '["apel","apel"]', expected_output: '10000', is_hidden: true },
    ],
  }),

  // --- hard ---------------------------------------------------------------
  code({
    slug: 'group-by-key', title: 'Kelompokkan item berdasarkan key',
    difficulty: 'hard', bloom_level: 'analyze', tags: ['javascript'],
    description:
      'Tulis groupBy({ items, key }) yang mengelompokkan array object berdasarkan nilai properti key, mirip Object.groupBy.',
    requirements: [
      'Kembalikan object: setiap nilai key menjadi properti berisi array item, dengan urutan asli.',
      'Item yang tidak punya properti key dilewati.',
      'Nilai key (termasuk angka) dipakai sebagai nama properti string.',
    ],
    sample: {
      request: "groupBy({ items: [{id:1,type:'a'},{id:2,type:'b'},{id:3,type:'a'}], key: 'type' })",
      expected: "{ a: [{id:1,type:'a'},{id:3,type:'a'}], b: [{id:2,type:'b'}] }",
    },
    base_code:
      'function groupBy({ items, key }) {\n  // your code here\n}\n\nmodule.exports = groupBy;\n',
    test_cases: [
      { name: 'empty items', stdin: '{"items":[],"key":"type"}', expected_output: '{}', is_hidden: false },
      { name: 'groups by string value', stdin: '{"items":[{"id":1,"type":"a"},{"id":2,"type":"b"},{"id":3,"type":"a"}],"key":"type"}', expected_output: '{"a":[{"id":1,"type":"a"},{"id":3,"type":"a"}],"b":[{"id":2,"type":"b"}]}', is_hidden: false },
      { name: 'numeric key values', stdin: '{"items":[{"n":1,"parity":1},{"n":2,"parity":0},{"n":3,"parity":1}],"key":"parity"}', expected_output: '{"0":[{"n":2,"parity":0}],"1":[{"n":1,"parity":1},{"n":3,"parity":1}]}', is_hidden: false },
      { name: 'skips items without the key', stdin: '{"items":[{"id":1},{"id":2,"type":"a"}],"key":"type"}', expected_output: '{"a":[{"id":2,"type":"a"}]}', is_hidden: false },
      { name: 'key named like a built-in property', stdin: '{"items":[{"id":1,"k":"constructor"},{"id":2,"k":"constructor"}],"key":"k"}', expected_output: '{"constructor":[{"id":1,"k":"constructor"},{"id":2,"k":"constructor"}]}', is_hidden: true },
    ],
  }),
  code({
    slug: 'questions-difficulty-filter', title: 'GET /questions?difficulty=',
    difficulty: 'hard', bloom_level: 'apply', tags: ['express', 'rest-api'],
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
      // Contoh memakai slug karena _id sekarang ObjectId yang berbeda di tiap database.
      expected: '200 [ { "slug": "array-utils", "difficulty": "medium", ... } ]',
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
  }),
  code({
    slug: 'retry-with-backoff', title: 'Retry dengan exponential backoff',
    difficulty: 'hard', bloom_level: 'analyze', tags: ['async'],
    description:
      'Tulis retry(task, { maxAttempts, baseDelayMs }) yang memanggil task (fungsi async) dan mengulanginya bila reject, dengan jeda yang berlipat dua setiap kali gagal.\n\nCara pengujian: judge membuat task yang gagal sebanyak `failures` kali (reject dengan Error "fail <nomor percobaan>") lalu resolve "ok", mencatat argumen setiap setTimeout yang diminta, lalu mencetak {outcome, attempts, delays}. outcome berisi nilai hasil, atau "rejected: <pesan error>" bila retry akhirnya reject.',
    requirements: [
      'Panggil task paling banyak maxAttempts kali; berhenti segera setelah ada yang berhasil.',
      'Jeda sebelum percobaan ke-(n+1) adalah baseDelayMs * 2^(n-1) milidetik, ditunggu dengan setTimeout di dalam Promise.',
      'Jangan menunggu setelah percobaan terakhir; lempar ulang error terakhir.',
    ],
    sample: {
      request: 'retry(task, { maxAttempts: 3, baseDelayMs: 100 }) // task gagal 2 kali',
      expected: '{ outcome: "ok", attempts: 3, delays: [100, 200] }',
    },
    base_code:
      'function sleep(ms) {\n  return new Promise((resolve) => setTimeout(resolve, ms));\n}\n\nasync function retry(task, { maxAttempts, baseDelayMs }) {\n  // your code here\n}\n\nmodule.exports = retry;\n',
    test_cases: [
      { name: 'succeeds on first try', stdin: '{"failures":0,"maxAttempts":3,"baseDelayMs":100}', expected_output: '{"outcome":"ok","attempts":1,"delays":[]}', is_hidden: false },
      { name: 'recovers after two failures', stdin: '{"failures":2,"maxAttempts":3,"baseDelayMs":100}', expected_output: '{"outcome":"ok","attempts":3,"delays":[100,200]}', is_hidden: false },
      { name: 'gives up after maxAttempts', stdin: '{"failures":5,"maxAttempts":3,"baseDelayMs":50}', expected_output: '{"outcome":"rejected: fail 3","attempts":3,"delays":[50,100]}', is_hidden: false },
      { name: 'delay doubles each time', stdin: '{"failures":3,"maxAttempts":5,"baseDelayMs":10}', expected_output: '{"outcome":"ok","attempts":4,"delays":[10,20,40]}', is_hidden: false },
      { name: 'single attempt never waits', stdin: '{"failures":1,"maxAttempts":1,"baseDelayMs":100}', expected_output: '{"outcome":"rejected: fail 1","attempts":1,"delays":[]}', is_hidden: true },
    ],
  }),
  code({
    slug: 'async-error-middleware', title: 'Error middleware untuk handler async',
    difficulty: 'hard', bloom_level: 'analyze', tags: ['async', 'express'],
    description:
      'Judge memakai Express 4, yang tidak menangkap Promise yang reject dari handler async. Tulis asyncHandler(fn) yang membungkus handler async agar error-nya sampai ke middleware error, dan errorHandler(err, req, res, next) yang membalas error tersebut.\n\nCara pengujian: judge memasang rute yang dibungkus asyncHandler, memanggil path dari stdin, lalu mencetak "<status>:<error>" (untuk respons sukses, "<status>:ok").',
    requirements: [
      'asyncHandler meneruskan error atau alasan reject apa pun ke next.',
      'errorHandler membalas status err.status (default 500) dengan JSON { error: pesan }.',
      'Bila err tidak punya message, pesannya "Internal Server Error".',
      'Error yang terjadi setelah respons terkirim tidak boleh menghasilkan respons ganda.',
    ],
    sample: {
      request: "GET /boom // handler: async () => { throw new Error('boom'); }",
      expected: '500:boom',
    },
    base_code:
      'function asyncHandler(fn) {\n  // your code here\n}\n\nfunction errorHandler(err, req, res, next) {\n  // your code here\n}\n\nmodule.exports = { asyncHandler, errorHandler };\n',
    test_cases: [
      { name: 'resolved handler', stdin: '/ok', expected_output: '200:ok', is_hidden: false },
      { name: 'rejected handler', stdin: '/boom', expected_output: '500:boom', is_hidden: false },
      { name: 'error with status', stdin: '/missing', expected_output: '404:not found', is_hidden: false },
      { name: 'rejection with a string', stdin: '/reject-string', expected_output: '500:Internal Server Error', is_hidden: false },
      { name: 'error after response sent', stdin: '/after-send', expected_output: '200:ok', is_hidden: true },
    ],
  }),
];
