/**
 * Isi materi per level. seed.js mengisi path_id dan requires (modul order - 1 di
 * path yang sama), jadi keduanya tidak ditulis di sini. Status kunci dihitung dari
 * requires, bukan disimpan, sehingga unlock_rule/unlock_hint juga tidak ada.
 * Progres per user ada di koleksi progress.
 *
 * Modul sengaja mengajarkan konsep yang diukur soal diagnostik, dan sebagian
 * contohnya dekat dengan solusi soal itu: modul beginner 7 hampir sama dengan
 * async-error-middleware, modul 6 dengan questions-difficulty-filter, modul 4
 * mendekati promise-all-prices, dan modul intermediate 1 dengan
 * retry-with-backoff. Karena checkpoint memakai bank soal yang sama, kenaikan
 * skor checkpoint sebagian mencerminkan paparan ini (lihat docs/DECISIONS.md,
 * "Ancaman validitas").
 */

const lead = (text) => ({ type: 'lead', text });
const text = (t) => ({ type: 'text', text: t });
const callout = (t, tone) => (tone ? { type: 'callout', tone, text: t } : { type: 'callout', text: t });
const code = (label, src) => ({ type: 'code', label, code: src });

const ref = (title, publisher, url) => ({ title, publisher, url, accessed_at: ACCESSED });

// Official sources every module's body and quiz were checked against, on this date.
const ACCESSED = '2026-10-25';
const MDN = 'MDN Web Docs';
const SRC = {
  promises: ref('Using promises', MDN, 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises'),
  asyncFn: ref('async function', MDN, 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function'),
  promiseAll: ref('Promise.all()', MDN, 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all'),
  allSettled: ref('Promise.allSettled()', MDN, 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled'),
  returnAwait: ref('return-await', 'typescript-eslint', 'https://typescript-eslint.io/rules/return-await/'),
  nodeCli: ref('Command-line API: --unhandled-rejections', 'Node.js', 'https://nodejs.org/api/cli.html#--unhandled-rejectionsmode'),
  expressErrors: ref('Error Handling', 'Express.js', 'https://expressjs.com/en/guide/error-handling.html'),
  expressRouting: ref('Routing', 'Express.js', 'https://expressjs.com/en/guide/routing.html'),
  expressApp: ref('Application Object (app.use, query parser)', 'Express.js', 'https://expressjs.com/en/5x/api/application.html'),
  expressMiddleware: ref('Using middleware', 'Express.js', 'https://expressjs.com/en/guide/using-middleware.html'),
  express5: ref('Upgrade to Express v5', 'Express.js', 'https://expressjs.com/en/guide/migrating-5.html'),
  httpStatus: ref('HTTP response status codes', MDN, 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status'),
  rfc9110: ref('RFC 9110: HTTP Semantics', 'IETF', 'https://httpwg.org/specs/rfc9110.html'),
  reactState: ref('State as a Snapshot', 'React', 'https://react.dev/learn/state-as-a-snapshot'),
  reactConditional: ref('Conditional Rendering', 'React', 'https://react.dev/learn/conditional-rendering'),
  reactEffects: ref('Synchronizing with Effects', 'React', 'https://react.dev/learn/synchronizing-with-effects'),
  useEffect: ref('useEffect', 'React', 'https://react.dev/reference/react/useEffect'),
  fetch: ref('Window: fetch() method', MDN, 'https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch'),
  equality: ref('Equality comparisons and sameness', MDN, 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness'),
  typeofOp: ref('typeof', MDN, 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof'),
  querySelector: ref('Document: querySelector() method', MDN, 'https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector'),
  addEventListener: ref('EventTarget: addEventListener() method', MDN, 'https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener'),
  backoff: ref('Exponential Backoff And Jitter (Brooker, 2015)', 'AWS Architecture Blog', 'https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/'),
  constStmt: ref('const', MDN, 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const'),
  dataTypes: ref('JavaScript data types and data structures', MDN, 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Data_structures'),
  operators: ref('Expressions and operators', MDN, 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Expressions_and_operators'),
  functions: ref('Functions', MDN, 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions'),
  arrowFn: ref('Arrow function expressions', MDN, 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions'),
  arrayMap: ref('Array.prototype.map()', MDN, 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map'),
  arrayFilter: ref('Array.prototype.filter()', MDN, 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter'),
  arrayFind: ref('Array.prototype.find()', MDN, 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find'),
  arrayReduce: ref('Array.prototype.reduce()', MDN, 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce'),
  textContent: ref('Node: textContent property', MDN, 'https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent'),
};

const KEYS = ['a', 'b', 'c', 'd'];
/** Keys follow the option order, so the correct letter is chosen by where the right option is placed. */
const item = (question, options, correct_answer, explanation) => ({
  question,
  options: options.map((t, i) => ({ key: KEYS[i], text: t })),
  correct_answer,
  explanation,
});

// --- beginner: REST API dan React -------------------------------------------

const beginner = [
  {
    order: 1, title: 'Callback, Promise, dan async/await', topic: 'async', bloom_level: 'understand', estimated_minutes: 25,
    references: [SRC.promises, SRC.asyncFn],
    body: [
      lead('JavaScript menjalankan kode di satu thread. Operasi yang butuh waktu, seperti membaca file, request jaringan, atau timer, tidak ditunggu dengan memblokir program. Hasilnya diserahkan belakangan lewat callback, Promise, atau async/await. Modul ini membandingkan ketiganya.'),
      text('Callback adalah fungsi yang dikirim sebagai argumen lalu dipanggil ketika hasilnya siap. Node.js memakai konvensi error-first: argumen pertama callback berisi error (atau null kalau berhasil), argumen kedua berisi data.'),
      code('Callback error-first', `const fs = require('fs');

fs.readFile('catatan.txt', 'utf8', (err, content) => {
  if (err) {
    console.log('Gagal membaca:', err.code); // mis. ENOENT kalau file tidak ada
    return;
  }
  console.log(content);
});

console.log('Baris ini tercetak lebih dulu');`),
      text('Promise adalah objek yang mewakili hasil yang belum ada. Statusnya mulai dari pending, lalu berubah sekali saja menjadi fulfilled (lewat resolve) atau rejected (lewat reject). Setelah berubah, statusnya tidak bisa berubah lagi. Method .then menerima hasilnya, .catch menerima error, dan setiap .then mengembalikan Promise baru sehingga bisa dirantai. async/await adalah cara menulis rantai yang sama agar terbaca seperti kode berurutan.'),
      code('.then dan async/await untuk tugas yang sama', `function delay(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// Dengan .then
delay(100, 2)
  .then((x) => x * 10)
  .then((result) => console.log('then:', result)); // then: 20

// Dengan async/await
async function compute() {
  const x = await delay(100, 2);
  return x * 10;
}
compute().then((result) => console.log('await:', result)); // await: 20`),
      callout('Fungsi async selalu mengembalikan Promise, walaupun di dalamnya tertulis return 20. Pemanggilnya tetap harus memakai await atau .then untuk mendapatkan angka 20.'),
      text('Urutan eksekusi mengikuti aturan tetap. Semua kode sinkron selesai lebih dulu. Setelah itu callback Promise dijalankan (antrean microtask), baru kemudian callback timer seperti setTimeout, walaupun jedanya 0 ms.'),
    ],
    quiz: [
      item(
        'Fungsi berikut dipanggil sebagai f():\n\nasync function f() {\n  return 5;\n}\n\nApa nilai yang dikembalikan oleh f()?',
        ['Angka 5', 'Promise yang resolve dengan nilai 5', 'undefined', 'Fungsi baru yang harus dipanggil lagi'],
        'b',
        'Fungsi async selalu mengembalikan Promise. Nilai yang di-return menjadi nilai resolve Promise itu, jadi angka 5 baru didapat lewat await f() atau f().then(...).',
      ),
      item(
        "Apa urutan output kode berikut?\n\nconsole.log('A');\nsetTimeout(() => console.log('B'), 0);\nPromise.resolve().then(() => console.log('C'));\nconsole.log('D');",
        ['A B C D', 'A D B C', 'A D C B', 'A C D B'],
        'c',
        'Kode sinkron (A, lalu D) selesai lebih dulu. Callback Promise masuk antrean microtask, yang dikosongkan sebelum callback timer, sehingga C tercetak sebelum B meskipun jeda setTimeout 0 ms.',
      ),
      item(
        "Apa yang terjadi pada Promise berikut?\n\nconst p = new Promise((resolve, reject) => {\n  resolve('ok');\n  reject(new Error('gagal'));\n});",
        [
          'Status p berubah menjadi rejected karena reject dipanggil terakhir',
          'p melempar TypeError karena resolve dan reject dipanggil bersamaan',
          'p tetap pending karena resolve dan reject saling membatalkan',
          "p fulfilled dengan nilai 'ok', dan panggilan reject diabaikan",
        ],
        'd',
        'Status Promise hanya bisa berubah sekali. Setelah resolve pertama, Promise sudah fulfilled, sehingga panggilan reject berikutnya tidak berpengaruh apa-apa dan tidak melempar error.',
      ),
      item(
        'Pada callback Node.js berbentuk (err, data) => { ... }, kapan err berisi nilai selain null?',
        [
          'Ketika operasinya gagal; data biasanya tidak bisa dipakai',
          'Ketika operasinya berhasil tetapi data kosong',
          'Ketika callback dipanggil lebih dari sekali',
        ],
        'a',
        'Pada konvensi error-first, argumen pertama hanya diisi ketika operasi gagal. Karena itu callback memeriksa err lebih dulu sebelum memakai data.',
      ),
    ],
  },
  {
    order: 2, title: 'Error handling pada kode asinkron', topic: 'async', bloom_level: 'understand', estimated_minutes: 20,
    references: [SRC.promises, SRC.nodeCli, SRC.expressErrors],
    body: [
      lead('Di kode sinkron, error naik lewat call stack sampai bertemu try/catch. Di kode asinkron, error berubah menjadi Promise yang reject. Error itu hanya tertangani kalau ada yang memasang .catch atau meng-await Promise tersebut di dalam try/catch. Modul ini membahas ke mana error asinkron pergi dan bagaimana meneruskannya ke tempat yang bisa menanganinya.'),
      text('throw di dalam fungsi async tidak langsung meledak di baris pemanggil. Yang terjadi, Promise hasil fungsi itu menjadi reject. Hal yang sama berlaku untuk throw di dalam callback .then. Ada dua cara setara untuk menanganinya: .catch di ujung rantai, atau await di dalam try/catch. Blok finally berjalan dalam kedua kasus, baik berhasil maupun gagal.'),
      code('Menangkap dengan .catch', `async function getUser(id) {
  if (!id) throw new Error('id wajib diisi');
  return { id, name: 'Ayu' };
}

getUser()
  .then((user) => console.log(user))
  .catch((err) => console.log('Tertangkap:', err.message)); // Tertangkap: id wajib diisi`),
      code('Menangkap dengan try/catch dan await', `async function main() {
  try {
    const user = await getUser();
    console.log(user);
  } catch (err) {
    console.log('Tertangkap:', err.message);
  } finally {
    console.log('Selesai, berhasil maupun gagal');
  }
}
main();`),
      callout('Promise yang reject tanpa penanganan menjadi unhandled rejection. Sejak Node.js 15, kondisi ini secara default menghentikan proses. Jadi setiap Promise harus punya .catch atau di-await di dalam try/catch.', 'warn'),
      text('Masalah muncul ketika fungsi async kamu dipanggil oleh kode yang tidak memperhatikan Promise yang dikembalikan. Contohnya Express 4, yang memanggil handler tetapi mengabaikan nilai baliknya. Reject dari handler itu tidak sampai ke mana pun. Solusinya adalah pembungkus: panggil fungsinya, lalu sambungkan .catch ke callback error milik pemanggil, yaitu next.'),
      code('Pembungkus yang meneruskan reject ke next', `function asyncHandler(fn) {
  // fn mengembalikan Promise; .catch(next) memastikan reject-nya tidak hilang
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

const handler = asyncHandler(async () => {
  throw new Error('boom');
});

// Meniru cara Express memanggil handler: req, res, dan next
handler({}, {}, (err) => console.log('next menerima:', err.message)); // next menerima: boom`),
    ],
    quiz: [
      item(
        "Perhatikan kode berikut:\n\nasync function f() {\n  throw new Error('x');\n}\nconst p = f();\n\nApa yang terjadi pada baris const p = f();?",
        [
          'Error dilempar di baris itu dan menghentikan kode berikutnya',
          "p berisi Promise yang reject dengan Error 'x'",
          'p berisi undefined',
          'p berisi objek Error',
        ],
        'b',
        'Di dalam fungsi async, throw tidak keluar sebagai exception sinkron. Error itu menjadi alasan reject dari Promise yang dikembalikan, dan baru muncul saat Promise di-await atau diberi .catch.',
      ),
      item(
        'Kenapa asyncHandler ditulis sebagai (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)?',
        [
          'Supaya handler berjalan lebih cepat',
          'Supaya respons dikirim dua kali kalau terjadi error',
          'Supaya error sinkron di dalam fn diabaikan',
          'Supaya reject dari fn diteruskan ke next, karena pemanggil handler tidak menangani Promise yang dikembalikan',
        ],
        'd',
        'Pemanggil seperti Express 4 tidak memasang .catch pada Promise dari handler. Dengan .catch(next), alasan reject diserahkan ke next sehingga sampai ke middleware error.',
      ),
      item(
        'Kapan blok finally pada try/catch/finally dijalankan?',
        [
          'Hanya ketika blok try berhasil tanpa error',
          'Hanya ketika blok catch dijalankan',
          'Selalu, setelah try selesai (dan setelah catch kalau terjadi error)',
        ],
        'c',
        'finally dijalankan di kedua jalur, berhasil maupun gagal. Karena itu finally cocok untuk pekerjaan beres-beres seperti mematikan indikator loading.',
      ),
      item(
        "fetchData() resolve dengan nilai null. Apa yang tercetak?\n\nfetchData()\n  .then((data) => {\n    if (!data) throw new Error('kosong');\n    return data;\n  })\n  .catch((err) => console.log(err.message));",
        [
          'kosong',
          'Tidak ada, karena throw di dalam .then hilang',
          'null',
        ],
        'a',
        'throw di dalam callback .then membuat Promise hasil .then itu reject. .catch di ujung rantai menerima error tersebut dan mencetak pesannya, yaitu "kosong".',
      ),
    ],
  },
  {
    order: 3, title: 'Kenapa try/catch tidak menangkap error Promise', topic: 'async', bloom_level: 'understand', estimated_minutes: 18,
    references: [SRC.promises, SRC.returnAwait],
    body: [
      lead('Kode yang tampak terlindungi try/catch ternyata bisa tetap meloloskan error. Penyebabnya, try/catch hanya menjaga kode yang berjalan selama blok try masih aktif. Modul ini menjelaskan kapan error Promise lolos, dan bagaimana await membuat try/catch bekerja, termasuk di dalam loop retry.'),
      code('Sebelum', "try {\n  fetchData().then(render);\n} catch (err) {\n  console.error(err);\n}"),
      callout('catch tidak pernah dieksekusi: error terjadi setelah blok try selesai, di dalam microtask Promise.', 'warn'),
      code('Sesudah', "try {\n  const data = await fetchData();\n  render(data);\n} catch (err) {\n  console.error(err);\n}"),
      text('Jebakan yang sama muncul pada return task() tanpa await di dalam try. Fungsi langsung mengembalikan Promise itu, blok try selesai, lalu reject-nya baru terjadi di luar jangkauan catch. Dengan return await task(), fungsi menunggu hasilnya selagi masih di dalam try, sehingga catch bisa menangkap kegagalannya. Hal ini menentukan berhasil tidaknya fungsi retry: tanpa await, percobaan pertama yang gagal langsung keluar dari fungsi dan tidak pernah diulang.'),
      code('Retry sederhana yang benar', `function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tryTimes(task, times) {
  for (let i = 1; i <= times; i++) {
    try {
      // await wajib: tanpa await, reject dari task lolos dari catch di bawah
      return await task();
    } catch (err) {
      if (i === times) throw err;
      await sleep(100);
    }
  }
}

let calls = 0;
const flaky = async () => {
  calls++;
  if (calls < 2) throw new Error('gagal');
  return 'ok';
};
tryTimes(flaky, 3).then((result) => console.log(result, 'setelah', calls, 'percobaan')); // ok setelah 2 percobaan`),
      text('Prinsip yang sama berlaku untuk callback setTimeout. try { setTimeout(() => { throw err; }, 0); } catch {} tidak menangkap apa pun, karena callback baru berjalan setelah blok try selesai. Itu sebabnya jeda di dalam fungsi async dibuat dengan membungkus setTimeout dalam Promise lalu meng-await-nya, seperti sleep di atas.'),
    ],
    quiz: [
      item(
        'Kapan try/catch sinkron bisa menangkap error dari Promise?',
        [
          'Selalu, asalkan fungsi yang mengembalikan Promise dipanggil di dalam blok try',
          'Hanya jika Promise di-await di dalam blok try',
          'Hanya pada Node, tidak di browser',
        ],
        'b',
        'try/catch hanya menjaga kode selama blok try masih berjalan. Dengan await, eksekusi menunggu di dalam try sampai Promise selesai, sehingga reject-nya dilempar di sana dan ditangkap catch.',
      ),
      item(
        "task() reject dengan Error 'gagal'. Apa hasil await load()?\n\nasync function load() {\n  try {\n    return task();\n  } catch (err) {\n    return 'cadangan';\n  }\n}",
        [
          "'cadangan', karena task() dipanggil di dalam blok try sehingga reject-nya ditangkap catch",
          'undefined',
          "Error 'gagal' dilempar ke pemanggil, karena catch tidak pernah berjalan",
          'Promise yang tidak pernah selesai',
        ],
        'c',
        "Tanpa await, return task() langsung menyerahkan Promise itu sebagai hasil fungsi dan blok try selesai. Reject terjadi setelahnya, di luar try, sehingga await load() melempar Error 'gagal'. Dengan return await task(), hasilnya menjadi 'cadangan'.",
      ),
      item(
        "Apa yang terjadi pada kode berikut?\n\ntry {\n  setTimeout(() => {\n    throw new Error('x');\n  }, 0);\n} catch (err) {\n  console.log('tertangkap');\n}",
        [
          'catch ini tidak menangkap error tersebut, karena callback setTimeout berjalan setelah blok try selesai',
          "'tertangkap' tercetak, karena callback setTimeout ditulis di dalam blok try sehingga error yang dilemparnya tetap ditangkap catch",
          'setTimeout menolak callback yang melempar error',
        ],
        'a',
        'Blok try hanya mendaftarkan timer lalu selesai. Saat callback berjalan, try/catch tadi sudah tidak aktif, sehingga error menjadi uncaught exception.',
      ),
      item(
        'Di dalam loop retry, jeda dibuat dengan await sleep(ms), dengan sleep membungkus setTimeout dalam Promise. Kenapa tidak cukup menulis setTimeout(() => {}, ms) saja?',
        [
          'setTimeout tidak menerima jeda lebih dari 1000 ms',
          'setTimeout hanya tersedia di browser',
          'setTimeout melempar error kalau dipanggil di dalam fungsi async',
          'setTimeout tidak menghentikan eksekusi: loop langsung lanjut ke percobaan berikutnya tanpa menunggu',
        ],
        'd',
        'setTimeout hanya menjadwalkan callback lalu langsung kembali. Fungsi async baru benar-benar menunggu kalau ada Promise yang di-await, dan Promise itu resolve ketika timer selesai.',
      ),
    ],
  },
  {
    order: 4, title: 'Menjalankan Promise secara paralel (Promise.all, Promise.allSettled)', topic: 'async', bloom_level: 'apply', estimated_minutes: 20,
    references: [SRC.promiseAll, SRC.allSettled],
    body: [
      lead('Kalau beberapa operasi asinkron tidak saling bergantung, menunggunya satu per satu membuang waktu. Promise.all dan Promise.allSettled menjalankan semuanya bersamaan, lalu menunggu hasilnya sekaligus.'),
      text('await di dalam loop for membuat setiap request menunggu request sebelumnya selesai. Jika tiga request masing-masing butuh 100 ms, totalnya sekitar 300 ms. Kalau semua request dimulai lebih dulu lalu ditunggu bersama, totalnya hanya sekitar 100 ms.'),
      code('Berurutan vs paralel', `const STOCK = { pen: 12, book: 5, folder: 8 };
// Meniru request ke server: setiap pemanggilan butuh 100 ms
const stockOf = (id) => new Promise((resolve) => setTimeout(() => resolve(STOCK[id]), 100));

async function totalStockSequential(ids) {
  let total = 0;
  for (const id of ids) {
    total += await stockOf(id); // menunggu satu per satu: sekitar 300 ms
  }
  return total;
}

async function totalStock(ids) {
  // map memulai semua request sekaligus; Promise.all hanya menunggu semuanya selesai
  const stocks = await Promise.all(ids.map((id) => stockOf(id)));
  return stocks.reduce((sum, n) => sum + n, 0);
}

totalStock(['pen', 'book', 'folder']).then((total) => console.log(total)); // 25`),
      text('Promise.all menerima array Promise dan resolve menjadi array hasil dengan urutan yang sama seperti input, bukan urutan selesai. Array kosong langsung resolve menjadi []. Kesalahan umum adalah memakai ids.map(async ...) tanpa Promise.all. Hasilnya array berisi Promise, bukan angka, sehingga penjumlahannya menghasilkan string yang aneh.'),
      callout('Promise.all langsung reject begitu ada satu Promise yang reject (fail-fast), dan hasil yang lain diabaikan. Kalau kamu tetap butuh hasil yang berhasil walaupun sebagian gagal, pakai Promise.allSettled.', 'warn'),
      code('Promise.allSettled', `async function loadDashboard() {
  const results = await Promise.allSettled([
    Promise.resolve({ name: 'Ayu' }),
    Promise.reject(new Error('layanan nilai sedang down')),
  ]);
  for (const r of results) {
    // Setiap elemen berbentuk { status: 'fulfilled', value } atau { status: 'rejected', reason }
    if (r.status === 'fulfilled') console.log('berhasil:', r.value);
    else console.log('gagal:', r.reason.message);
  }
}
loadDashboard();
// berhasil: { name: 'Ayu' }
// gagal: layanan nilai sedang down`),
    ],
    quiz: [
      item(
        "Dengan const wait = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));\n\nApa hasil await Promise.all([wait(300, 'a'), wait(100, 'b')])?",
        ["['b', 'a']", "['a', 'b']", "'b'", 'Error, karena kedua Promise selesai pada waktu berbeda'],
        'b',
        "Promise.all menyusun hasil sesuai urutan array input, bukan urutan selesai. Walaupun 'b' selesai lebih dulu, hasilnya tetap ['a', 'b'].",
      ),
      item(
        'Apa masalah kode berikut?\n\nconst stocks = ids.map(async (id) => await stockOf(id));\nconst total = stocks.reduce((sum, n) => sum + n, 0);',
        [
          'stocks berisi Promise, bukan angka, sehingga total bukan jumlah stok; hasilnya harus ditunggu dulu dengan await Promise.all(stocks)',
          'map tidak boleh menerima fungsi async, sehingga kode ini error sintaks',
          'Request dijalankan berurutan, sehingga hasilnya benar tetapi lambat',
        ],
        'a',
        'Fungsi async selalu mengembalikan Promise, sehingga map menghasilkan array Promise. Menjumlahkan angka dengan Promise menghasilkan string seperti "0[object Promise]...". Promise.all mengubahnya menjadi array angka.',
      ),
      item(
        'Halaman memuat tiga data dari tiga layanan. Kalau satu layanan gagal, dua data lainnya tetap harus tampil. Mana yang paling tepat?',
        [
          'Promise.all, karena semua data dimuat paralel',
          'Promise.race, karena mengambil hasil yang paling cepat',
          'await satu per satu di dalam loop tanpa try/catch',
          'Promise.allSettled, lalu tampilkan elemen yang berstatus fulfilled',
        ],
        'd',
        'Promise.allSettled menunggu semua Promise dan melaporkan status masing-masing tanpa reject. Promise.all gagal total begitu satu reject, dan Promise.race hanya memberi satu hasil.',
      ),
      item(
        'Tiga Promise yang dimulai bersamaan selesai dalam 100 ms, 200 ms, dan 300 ms. Kira-kira berapa lama await Promise.all([...]) menunggu?',
        ['600 ms', '100 ms', '300 ms', '200 ms'],
        'c',
        'Karena ketiganya berjalan bersamaan, Promise.all selesai ketika Promise paling lambat selesai, yaitu sekitar 300 ms. Angka 600 ms adalah waktu kalau ketiganya ditunggu berurutan.',
      ),
    ],
  },
  {
    order: 5, title: 'Routing dan parameter di Express (req.params, req.query)', topic: 'rest-api', bloom_level: 'understand', estimated_minutes: 20,
    references: [SRC.expressRouting, SRC.expressApp],
    body: [
      lead('Express mencocokkan setiap request dengan rute berdasarkan method dan path. Bagian path yang diawali titik dua menjadi req.params, sedangkan bagian setelah tanda tanya menjadi req.query. Nilai di req.params selalu string; nilai di req.query juga string, kecuali kalau nama parameternya berulang.'),
      text('Path parameter dipakai untuk identitas resource, misalnya /users/42 untuk user dengan id 42. Query string dipakai untuk opsi yang tidak mengubah identitas resource, seperti filter, urutan, atau halaman: /users?active=true&page=2.'),
      code('Melihat params dan query', `const express = require('express');
const app = express();

app.get('/users/:id', (req, res) => {
  res.json({ params: req.params, query: req.query });
});

app.listen(3000);
// GET /users/42?active=true
// -> { "params": { "id": "42" }, "query": { "active": "true" } }`),
      text('Query string tidak pernah masuk ke req.params. Express memisahkan path dari query sebelum mencocokkan rute, sehingga /users/42?active=true tetap cocok dengan /users/:id dan nilai id adalah "42".'),
      callout('Nilai di req.params selalu string. Nilai di req.query berupa string untuk satu nilai, tetapi menjadi array kalau nama parameternya berulang (?tag=a&tag=b). req.params.id === 42 selalu false. Ubah dulu dengan Number(...), lalu periksa hasilnya, misalnya dengan Number.isInteger.', 'warn'),
      code('Beberapa parameter dan konversi angka', `app.get('/posts/:postId/comments/:commentId', (req, res) => {
  const postId = Number(req.params.postId);
  if (!Number.isInteger(postId)) {
    return res.status(400).json({ error: 'postId harus bilangan bulat' });
  }
  res.json({ postId, commentId: req.params.commentId });
});
// GET /posts/7/comments/abc -> { "postId": 7, "commentId": "abc" }`),
      text('Urutan pendaftaran rute juga penting, karena Express memakai rute pertama yang cocok. Rute /users/me harus didaftarkan sebelum /users/:id. Kalau urutannya terbalik, "me" ditangkap sebagai nilai id.'),
    ],
    quiz: [
      item(
        "Rute app.get('/products/:id', handler) menerima GET /products/7?color=red. Apa isi req.params?",
        ["{ id: 7 }", "{ id: '7', color: 'red' }", "{ id: '7?color=red' }", "{ id: '7' }"],
        'd',
        "Query string dipisahkan sebelum rute dicocokkan, jadi params hanya berisi bagian path. Nilainya string '7', bukan angka.",
      ),
      item(
        'Untuk request yang sama, GET /products/7?color=red, apa nilai req.query.color?',
        ["'red'", 'undefined, karena color tidak didaftarkan di rute', "['red']"],
        'a',
        'Query string tidak perlu didaftarkan di rute. Express mem-parse-nya ke req.query, dan satu nilai tunggal menjadi string biasa.',
      ),
      item(
        'Kenapa kondisi if (req.params.id === 42) tidak pernah bernilai true?',
        [
          'req.params baru terisi setelah express.json() dipasang',
          'Operator === tidak bisa membandingkan angka',
          'req.params.id selalu string, sedangkan 42 adalah number, dan === tidak mengonversi tipe',
        ],
        'c',
        "Parameter rute selalu string. '42' === 42 bernilai false karena tipenya berbeda. Ubah dulu dengan Number(req.params.id) sebelum membandingkan.",
      ),
      item(
        "app.get('/users/:id', ...) didaftarkan sebelum app.get('/users/me', ...). Ke mana GET /users/me diarahkan?",
        [
          'Ke handler /users/me, karena cocok persis',
          "Ke handler /users/:id dengan id bernilai 'me'",
          '404, karena dua rute bentrok',
          'Ke kedua handler secara bergantian',
        ],
        'b',
        "Express memeriksa rute sesuai urutan pendaftaran dan memakai yang pertama cocok. /users/:id cocok untuk 'me', sehingga rute /users/me tidak pernah tercapai. Daftarkan rute yang lebih spesifik lebih dulu.",
      ),
    ],
  },
  {
    order: 6, title: 'Validasi query parameter', topic: 'rest-api', bloom_level: 'apply', estimated_minutes: 22,
    references: [SRC.expressApp, SRC.httpStatus],
    body: [
      lead('Query parameter datang dari pengguna, sehingga isinya bisa kosong, salah ketik, atau berisi nilai yang tidak terduga. Handler yang baik memeriksa nilainya lebih dulu, membalas 400 untuk nilai yang salah, dan baru setelah itu mengambil data.'),
      text('Ada tiga kasus yang perlu dibedakan. Kalau parameter tidak dikirim, nilainya undefined dan handler memakai perilaku default (misalnya tanpa filter). Kalau parameter dikirim tetapi nilainya di luar daftar yang diizinkan, termasuk string kosong, handler membalas 400. Kalau nilainya valid, handler menerapkan filter.'),
      code('Handler dengan daftar nilai yang diizinkan', `const express = require('express');
const app = express();

const books = [
  { title: 'Dasar JavaScript', level: 'basic' },
  { title: 'Node.js Lanjut', level: 'advanced' },
];
const LEVELS = ['basic', 'advanced'];

app.get('/books', (req, res) => {
  const { level } = req.query;
  if (level === undefined) return res.json(books);
  if (!LEVELS.includes(level)) {
    return res.status(400).json({ error: \`level harus salah satu dari: \${LEVELS.join(', ')}\` });
  }
  res.json(books.filter((b) => b.level === level));
});

app.listen(3000);`),
      code('Hasil', `GET /books                   -> 200, dua buku
GET /books?level=basic       -> 200, satu buku
GET /books?level=            -> 400 (string kosong bukan nilai yang diizinkan)
GET /books?level=expert      -> 400
GET /books?level=a&level=b   -> 400 (nilainya array, bukan string)`),
      callout('Pakai return saat membalas 400. Tanpa return, eksekusi lanjut ke res.json berikutnya dan Express melempar "Cannot set headers after they are sent". Pastikan juga setiap cabang mengirim respons. Cabang yang lupa membalas membuat request menggantung sampai client timeout.', 'warn'),
      text('Memeriksa dengan daftar nilai yang diizinkan (whitelist) lebih aman daripada menolak nilai yang dilarang satu per satu (blacklist). Semua nilai di luar daftar otomatis tertolak, termasuk string kosong, salah ketik, array dari parameter yang berulang, dan karakter aneh yang tidak terpikirkan sebelumnya.'),
    ],
    quiz: [
      item(
        'Client mengirim GET /books?level= (tanpa nilai). Apa nilai req.query.level?',
        ['undefined, karena parameter tanpa nilai dianggap tidak dikirim', "'' (string kosong)", 'null', 'false'],
        'b',
        "Parameter yang ada tetapi tanpa nilai menjadi string kosong. Karena itu pengecekan level === undefined tidak cukup; string kosong harus ditolak oleh pemeriksaan daftar nilai yang diizinkan.",
      ),
      item(
        "Apa yang terjadi untuk nilai level yang tidak valid pada handler berikut?\n\nif (!LEVELS.includes(level)) res.status(400).json({ error: 'level tidak valid' });\nres.json(books.filter((b) => b.level === level));",
        [
          'Express menghentikan handler secara otomatis setelah status 400',
          'Kedua respons dikirim berurutan ke client: lebih dulu status 400 dengan pesan error, lalu daftar buku hasil filter dengan status 200',
          'Respons 400 terkirim, lalu res.json kedua tetap berjalan dan Express melempar error karena header sudah terkirim',
        ],
        'c',
        'res.status(...).json(...) hanya mengirim respons; fungsi handler tetap berlanjut. Tanpa return, res.json kedua mencoba mengirim respons lagi dan memicu "Cannot set headers after they are sent".',
      ),
      item(
        'Mana yang membuat request menggantung (client menunggu sampai timeout) ketika nilai level tidak valid?',
        [
          'if (!valid) return;',
          "if (!valid) return res.status(400).json({ error: 'level tidak valid' });",
          'if (!valid) return res.sendStatus(400);',
        ],
        'a',
        'return tanpa mengirim respons mengakhiri handler, tetapi client tidak pernah menerima balasan. Dua pilihan lain mengirim status 400 sebelum keluar dari handler.',
      ),
      item(
        "Kenapa pemeriksaan LEVELS.includes(level) lebih aman daripada level !== 'expert'?",
        [
          'includes lebih cepat daripada operator !==',
          'includes mengubah nilai menjadi huruf kecil sebelum membandingkan, sehingga variasi penulisan seperti Basic atau BASIC otomatis diterima sebagai basic tanpa perlu diperiksa terpisah',
          'Express mewajibkan pemakaian includes untuk query parameter',
          'Semua nilai di luar daftar otomatis ditolak, termasuk string kosong, salah ketik, dan array; blacklist hanya menolak nilai yang sudah terpikirkan',
        ],
        'd',
        "Whitelist menerima hanya nilai yang diketahui benar. Dengan blacklist, nilai seperti '', 'Basic', atau array lolos karena tidak sama dengan 'expert'.",
      ),
    ],
  },
  {
    order: 7, title: 'Status code dan middleware error', topic: 'rest-api', bloom_level: 'apply', estimated_minutes: 22,
    references: [SRC.httpStatus, SRC.rfc9110, SRC.expressErrors],
    body: [
      lead('Status code memberi tahu client apa yang terjadi tanpa harus membaca isi respons. Middleware error mengumpulkan semua kegagalan ke satu tempat, sehingga setiap error dibalas dengan format yang sama.'),
      text('Status dibagi per kelompok. 2xx berarti berhasil: 200 OK, 201 Created untuk data baru, 204 No Content. 4xx berarti kesalahan di sisi client: 400 Bad Request untuk input yang tidak valid, 401 Unauthorized kalau belum login atau token salah, 403 Forbidden kalau sudah login tetapi tidak berhak, 404 Not Found kalau resource tidak ada. 5xx berarti kesalahan di sisi server, misalnya 500 Internal Server Error.'),
      text('Express 4 hanya menangkap error yang dilempar secara sinkron dari handler. Kalau handler async reject, middleware error tidak dipanggil dan client tidak mendapat respons. Sejak Node.js 15, unhandled rejection itu bahkan menghentikan proses server. Express 5 sudah meneruskan reject dari handler async ke next secara otomatis, tetapi banyak proyek masih memakai Express 4. Karena itu pola asyncHandler masih perlu dikenali.'),
      code('Rute async, HttpError, dan middleware error', `const express = require('express');
const app = express();

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Untuk Express 4: meneruskan reject dari handler async ke next
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const findItem = async (id) => (id === '1' ? { id: 1, name: 'Pena' } : null);

app.get('/items/:id', asyncHandler(async (req, res) => {
  const item = await findItem(req.params.id);
  if (!item) throw new HttpError(404, 'item tidak ditemukan');
  res.json(item);
}));

// Empat parameter: dari jumlah inilah Express mengenali middleware error.
// Didaftarkan paling akhir, setelah semua rute.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res.status(err.status ?? 500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(3000);
// GET /items/1 -> 200 { "id": 1, "name": "Pena" }
// GET /items/9 -> 404 { "error": "item tidak ditemukan" }`),
      callout('Kalau error terjadi setelah respons terkirim (res.headersSent bernilai true), middleware error tidak boleh mengirim respons kedua. Serahkan ke penanganan bawaan Express dengan next(err).', 'warn'),
      text('Di kode berbasis callback, misalnya fs.readFile di dalam handler, error tidak bisa di-throw ke Express karena callback berjalan belakangan. Teruskan error itu secara eksplisit dengan next(err).'),
    ],
    quiz: [
      item(
        'Client mengirim POST /users tanpa field wajib email. Status mana yang paling tepat?',
        ['200 OK', '400 Bad Request', '404 Not Found', '500 Internal Server Error'],
        'b',
        'Kesalahannya ada pada input dari client, jadi kelompoknya 4xx, dan 400 menandakan request tidak valid. 404 untuk resource yang tidak ada, sedangkan 500 untuk kesalahan di server.',
      ),
      item(
        'Bagaimana Express mengenali sebuah fungsi sebagai middleware error?',
        [
          'Fungsi itu didaftarkan dengan app.error()',
          'Nama fungsinya errorHandler',
          'Fungsi itu dipasang sebelum semua rute',
          'Fungsi itu punya empat parameter: (err, req, res, next)',
        ],
        'd',
        'Express membedakan middleware error dari jumlah parameternya. Fungsi dengan empat parameter hanya dipanggil ketika ada error yang diteruskan, dan biasanya dipasang setelah semua rute.',
      ),
      item(
        "Di Express 4, rute app.get('/x', async () => { throw new Error('boom'); }) dipasang tanpa pembungkus. Apa yang terjadi saat GET /x?",
        [
          'Middleware error membalas 500 dengan pesan boom',
          'Express mengulang handler sampai berhasil',
          'Middleware error tidak dipanggil; Promise yang reject tidak ditangani, sehingga client tidak mendapat respons',
        ],
        'c',
        'Express 4 mengabaikan Promise yang dikembalikan handler, sehingga reject-nya tidak pernah sampai ke next. Akibatnya client tidak mendapat balasan, dan sejak Node.js 15 unhandled rejection itu menghentikan proses server. Pembungkus asyncHandler mengatasinya dengan .catch(next).',
      ),
      item(
        "Dengan middleware error res.status(err.status ?? 500).json({ error: err.message || 'Internal Server Error' }), apa respons untuk throw new Error('x')?",
        ["500 dengan { error: 'x' }", '200 dengan { error: \'x\' }', "500 dengan { error: 'Internal Server Error' }", "400 dengan { error: 'x' }"],
        'a',
        "Error biasa tidak punya properti status, sehingga err.status ?? 500 menghasilkan 500. Pesannya 'x' tidak kosong, jadi teks cadangan 'Internal Server Error' tidak dipakai.",
      ),
      item(
        'User sudah login dengan token yang valid, tetapi mencoba menghapus catatan milik user lain. Status mana yang tepat?',
        ['401 Unauthorized', '403 Forbidden', '404 Not Found', '500 Internal Server Error'],
        'b',
        'Identitas user sudah diketahui, jadi masalahnya bukan autentikasi (401). Ia hanya tidak berhak melakukan aksi itu, dan itulah arti 403 Forbidden.',
      ),
    ],
  },
  {
    order: 8, title: 'State dan render kondisional', topic: 'react', bloom_level: 'understand', estimated_minutes: 20,
    references: [SRC.reactState, SRC.reactConditional],
    body: [
      lead('Komponen React adalah fungsi yang menghasilkan tampilan dari props dan state. Ketika state berubah lewat setter, React memanggil ulang fungsi itu dan memperbarui DOM. Render kondisional menentukan apa yang tampil berdasarkan nilai-nilai tersebut.'),
      text('useState mengembalikan pasangan [nilai, setter]. Memanggil setter menjadwalkan render ulang. Variabel pada render yang sedang berjalan tidak ikut berubah; nilai baru baru terlihat pada render berikutnya. State juga tidak boleh diubah langsung (mutasi), karena React tidak tahu ada perubahan dan tidak merender ulang.'),
      code('State dengan useState', `import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>Diklik {count} kali</p>
      <button onClick={() => setCount((c) => c + 1)}>Tambah</button>
    </div>
  );
}`),
      text('Saat render, React tidak menampilkan apa pun untuk true, false, null, dan undefined. Angka 0 berbeda: 0 adalah teks yang valid dan akan tampil. Operator a && b mengembalikan a kalau a falsy, sehingga {count && <Badge />} menampilkan "0" ketika count bernilai 0. Sebaliknya, {count > 0 && ...} aman, karena perbandingan menghasilkan boolean dan false tidak dirender.'),
      code('Tiga cara render kondisional', `function Inbox({ unread }) {
  return (
    <div>
      {/* unread 0 -> tampil "0", karena 0 && ... menghasilkan 0 */}
      {unread && <span>{unread} pesan baru</span>}

      {/* Aman: perbandingan menghasilkan boolean, dan false tidak dirender */}
      {unread > 0 && <span>{unread} pesan baru</span>}

      {/* Dua cabang: pakai ternary */}
      {unread > 0 ? <span>{unread} pesan baru</span> : <span>Tidak ada pesan</span>}
    </div>
  );
}`),
      callout('{items.length && <List items={items} />} adalah bug klasik: saat array kosong, layar menampilkan angka 0. Tulis {items.length > 0 && ...}.', 'warn'),
      text('Untuk keadaan yang menggantikan seluruh tampilan, kembalikan JSX lebih awal: if (!user) return <p>Memuat…</p>; sebelum JSX utama. Mengembalikan null berarti komponen tidak merender apa pun.'),
    ],
    quiz: [
      item(
        'Apa yang dirender oleh {count && <p>Ada {count}</p>} ketika count bernilai 0?',
        ['Tidak ada apa-apa', 'Teks "0"', '<p>Ada 0</p>', 'Error, karena angka tidak bisa dirender'],
        'b',
        '0 && ... mengembalikan 0, dan React merender angka 0 sebagai teks. Hanya true, false, null, dan undefined yang tidak dirender.',
      ),
      item(
        'Apa yang dirender oleh {isLoggedIn && <Menu />} ketika isLoggedIn bernilai false?',
        ['Tidak ada apa-apa', 'Teks "false"', 'Error, karena boolean tidak bisa dirender', '<Menu />'],
        'a',
        'false && ... menghasilkan false, dan React tidak merender boolean. Berbeda dengan angka 0, false tidak menghasilkan teks apa pun.',
      ),
      item(
        'Komponen memanggil setCount(5) di dalam handler klik. Pernyataan mana yang benar?',
        [
          'count langsung bernilai 5 di baris berikutnya pada handler yang sama',
          'Halaman dimuat ulang dengan count bernilai 5',
          'React menjadwalkan render ulang; pada render berikutnya count bernilai 5',
        ],
        'c',
        'Setter tidak mengubah variabel count milik render yang sedang berjalan. Ia menjadwalkan render ulang, dan pada render itu useState mengembalikan nilai baru.',
      ),
      item(
        'Kamu ingin menampilkan <Spinner /> saat loading bernilai true dan <List /> saat false. Mana yang benar?',
        [
          '{loading && <Spinner />}',
          '{if (loading) { <Spinner /> } else { <List /> }}',
          '{<Spinner /> ? loading : <List />}',
          '{loading ? <Spinner /> : <List />}',
        ],
        'd',
        'Untuk dua cabang dipakai ternary. && hanya punya satu cabang, sehingga List tidak pernah tampil. if tidak bisa ditulis di dalam kurung kurawal JSX. Pilihan ketiga memeriksa <Spinner /> yang selalu truthy, sehingga yang dirender adalah nilai loading.',
      ),
    ],
  },
  {
    order: 9, title: 'Mengambil data dengan useEffect (loading, error, cleanup)', topic: 'react', bloom_level: 'apply', estimated_minutes: 25,
    references: [SRC.reactEffects, SRC.useEffect, SRC.fetch],
    body: [
      lead('Data dari server datang setelah komponen tampil pertama kali. useEffect menjalankan kode setelah render, sehingga cocok untuk memulai fetch. Komponen yang rapi menangani tiga keadaan, yaitu sedang memuat, gagal, dan berhasil, serta membatalkan request yang sudah tidak dibutuhkan.'),
      text('Argumen kedua useEffect adalah dependency array. Dengan [] efek berjalan sekali setelah komponen tampil. Dengan [userId] efek berjalan lagi setiap kali userId berubah. Tanpa array, efek berjalan setelah setiap render. Untuk fetch, ini biasanya bug: fetch memanggil setState, setState memicu render, lalu render memicu fetch lagi tanpa henti.'),
      code('Loading, error, dan cleanup', `import { useEffect, useState } from 'react';

function UserCard({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(\`/api/users/\${userId}\`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch((err) => {
        // Abort bukan kegagalan: komponen sudah tidak butuh hasilnya
        if (err.name === 'AbortError') return;
        setError(err.message);
        setLoading(false);
      });

    // Cleanup: dijalankan sebelum efek berikutnya dan saat komponen dilepas
    return () => controller.abort();
  }, [userId]);

  if (loading) return <p>Memuat…</p>;
  if (error) return <p role="alert">Gagal memuat: {error}</p>;
  return <h2>{user.name}</h2>;
}`),
      text('fetch hanya reject ketika request itu sendiri gagal, misalnya karena kegagalan jaringan atau karena dibatalkan lewat AbortController (dengan error bernama AbortError). Respons 404 atau 500 tetap membuat Promise resolve, dengan res.ok bernilai false. Karena itu res.ok harus diperiksa sendiri, seperti pada contoh di atas.'),
      callout('Jangan menulis useEffect(async () => ...). Fungsi async mengembalikan Promise, sedangkan React mengharapkan efek mengembalikan fungsi cleanup atau tidak mengembalikan apa pun. Buat fungsi async di dalam efek, lalu panggil.', 'warn'),
      code('Fungsi async di dalam efek', `import { useEffect, useState } from 'react';

function UserName({ userId }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;
    // Kosongkan data user sebelumnya agar tidak tampil selagi user baru dimuat
    setUser(null);
    setError(null);

    async function load() {
      try {
        const res = await fetch(\`/api/users/\${userId}\`);
        if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
        const data = await res.json();
        // Respons untuk userId lama diabaikan kalau userId sudah berganti
        if (!ignore) setUser(data);
      } catch (err) {
        if (!ignore) setError(err.message);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [userId]);

  if (error) return <span role="alert">{error}</span>;
  return <span>{user ? user.name : 'Memuat…'}</span>;
}`),
      text('Cleanup juga mencegah race condition. Misalkan userId berganti dari 1 ke 2 sebelum respons untuk user 1 datang. Cleanup efek lama membatalkan atau mengabaikan respons itu, sehingga yang tampil selalu data user yang sedang dipilih.'),
    ],
    quiz: [
      item(
        'Apa masalah efek berikut?\n\nuseEffect(() => {\n  fetch(\'/api/items\').then((r) => r.json()).then(setItems);\n});',
        [
          'Efek tidak pernah berjalan karena tidak punya dependency array',
          'Efek hanya berjalan sekali setelah render pertama, karena tanpa dependency array React memperlakukannya sama seperti [], sehingga data tidak pernah diperbarui',
          'Efek berjalan setelah setiap render; setItems memicu render, lalu efek melakukan fetch lagi tanpa henti',
        ],
        'c',
        'Tanpa dependency array, efek berjalan setelah setiap render. setItems dengan array baru memicu render, render memicu efek, dan siklus itu terus berulang. Untuk sekali muat, tulis [] sebagai dependency.',
      ),
      item(
        'Server membalas 404 untuk sebuah fetch. Apa yang dilakukan Promise dari fetch?',
        [
          'Reject dengan error 404, sehingga kegagalannya langsung masuk ke .catch tanpa perlu memeriksa res.ok atau res.status',
          'Resolve dengan objek Response yang res.ok-nya bernilai false',
          'Melempar error secara sinkron',
          'Tidak pernah selesai',
        ],
        'b',
        'fetch hanya reject ketika request itu sendiri gagal, misalnya karena jaringan atau dibatalkan. Status HTTP apa pun, termasuk 404 dan 500, tetap resolve, jadi kode harus memeriksa res.ok atau res.status sendiri.',
      ),
      item(
        'Kapan fungsi cleanup yang dikembalikan oleh efek dijalankan?',
        [
          'Hanya sekali, saat komponen pertama kali tampil',
          'Setiap kali fetch di dalam efek selesai, sehingga cleanup adalah tempat untuk menyimpan hasil fetch ke state sebelum komponen render ulang',
          'Tidak pernah, kecuali dipanggil manual',
          'Sebelum efek dijalankan ulang karena dependency berubah, dan saat komponen dilepas dari layar',
        ],
        'd',
        'React menjalankan cleanup efek lama sebelum menjalankan efek baru, dan sekali lagi saat komponen di-unmount. Karena itu cleanup cocok untuk membatalkan request lama.',
      ),
      item(
        'Kenapa useEffect(async () => { ... }, []) tidak dianjurkan?',
        [
          'Fungsi async mengembalikan Promise, padahal React mengharapkan efek mengembalikan fungsi cleanup atau tidak mengembalikan apa pun',
          'Fungsi async tidak didukung oleh browser modern',
          'fetch tidak bisa dipakai di dalam useEffect',
        ],
        'a',
        'Nilai balik efek dianggap fungsi cleanup. Promise bukan fungsi, jadi React tidak bisa memakainya untuk cleanup. Pola yang benar adalah mendefinisikan fungsi async di dalam efek lalu memanggilnya.',
      ),
    ],
  },
];

// --- new: Fondasi JavaScript (modul contoh) ---------------------------------

const newcomer = [
  {
    order: 1, title: 'Variabel, tipe data, dan operator dasar', topic: 'javascript', bloom_level: 'remember', estimated_minutes: 15,
    references: [SRC.constStmt, SRC.dataTypes, SRC.operators],
    body: [
      lead('Program menyimpan data di dalam variabel, yaitu nama yang menunjuk ke sebuah nilai. Modul ini mengenalkan tiga hal yang dipakai di semua modul berikutnya: cara membuat variabel dengan const dan let, tujuh tipe data primitif, dan operator dasar untuk menghitung serta membandingkan.'),
      text('Variabel dibuat dengan const atau let. Variabel const tidak bisa di-assign ulang dan wajib diberi nilai saat dibuat. Variabel let boleh di-assign ulang. Keduanya hanya berlaku di dalam blok kurung kurawal tempat ia dideklarasikan. Kata kunci var adalah cara lama yang aturannya berbeda; di kode modern, pakai const secara default dan let hanya kalau nilainya memang perlu diganti.'),
      code('const dan let', `const nama = 'Ayu';
let umur = 17;
umur = 18;            // boleh: let bisa di-assign ulang
// nama = 'Budi';     // TypeError: const tidak bisa di-assign ulang
// const kota;        // SyntaxError: const wajib diberi nilai saat dibuat

const hobi = ['membaca'];
hobi.push('berenang'); // boleh: isi array berubah, variabelnya tetap menunjuk array yang sama
console.log(hobi);     // ['membaca', 'berenang']`),
      callout('const melarang assign ulang, bukan perubahan isi. Array atau object yang disimpan di const tetap bisa ditambah dan diubah isinya.'),
      text('JavaScript punya tujuh tipe primitif: string (teks), number (angka), boolean (true atau false), undefined, null, bigint (bilangan bulat sangat besar), dan symbol. Selain itu, semua nilai adalah object, termasuk array dan fungsi. undefined adalah nilai bawaan variabel yang dibuat tanpa nilai, misalnya let x;. null dipakai untuk menandai bahwa sebuah nilai sengaja dikosongkan.'),
      code('Operator dasar', `console.log(7 + 2);          // 9
console.log(7 - 2);          // 5
console.log(7 % 2);          // 1   (sisa bagi)
console.log(2 ** 3);         // 8   (pangkat)
console.log('7' + 2);        // '72' (+ dengan string menyambung teks)
console.log(7 > 2 && 2 > 5); // false (&& bernilai true hanya kalau keduanya true)
console.log(!true);          // false

let skor = 10;
skor += 5;                   // sama dengan skor = skor + 5
console.log(skor);           // 15`),
    ],
    quiz: [
      item(
        'Kata kunci mana yang dipakai untuk variabel yang tidak boleh di-assign ulang?',
        ['let', 'var', 'const', 'function'],
        'c',
        'Variabel const tidak bisa di-assign ulang, dan mencobanya melempar TypeError. let dan var boleh di-assign ulang, sedangkan function dipakai untuk membuat fungsi.',
      ),
      item(
        "Apa hasil '7' + 2?",
        ['9', "'72'", 'NaN', 'Error, karena tipenya berbeda'],
        'b',
        "Kalau salah satu operand + adalah string, JavaScript menyambung teks, bukan menjumlah. Angka 2 diubah menjadi string, sehingga hasilnya '72'.",
      ),
      item(
        'Mana yang bukan tipe data primitif di JavaScript?',
        ['string', 'boolean', 'array', 'undefined'],
        'c',
        'Tujuh tipe primitif adalah string, number, boolean, undefined, null, bigint, dan symbol. Array termasuk object.',
      ),
      item(
        'Apa hasil 7 % 2?',
        ['1', '3.5', '0', '14'],
        'a',
        'Operator % menghasilkan sisa bagi. 7 dibagi 2 adalah 3 dengan sisa 1. 3.5 adalah hasil 7 / 2, dan 14 adalah hasil 7 * 2.',
      ),
    ],
  },
  {
    order: 2, title: 'Fungsi: parameter, return, dan arrow function', topic: 'javascript', bloom_level: 'remember', estimated_minutes: 20,
    references: [SRC.functions, SRC.arrowFn],
    body: [
      lead('Fungsi adalah blok kode bernama yang bisa dipanggil berulang kali dengan data yang berbeda. Hampir semua kode di modul berikutnya, termasuk event listener dan method array, menerima fungsi. Modul ini mengenalkan istilah dan bentuk penulisannya.'),
      text('Nama di dalam kurung saat fungsi dibuat disebut parameter. Nilai yang dikirim saat fungsi dipanggil disebut argumen. Pada function luas(sisi) { ... } dan luas(4), sisi adalah parameter dan 4 adalah argumen. Kata kunci return mengirim nilai kembali ke pemanggil sekaligus menghentikan fungsi. Fungsi yang selesai tanpa bertemu return mengembalikan undefined.'),
      code('Deklarasi fungsi dan return', `function luasPersegi(sisi) {
  return sisi * sisi;
}
console.log(luasPersegi(4)); // 16

function sapa(nama) {
  console.log('Halo, ' + nama);
}
const hasil = sapa('Ayu'); // tercetak: Halo, Ayu
console.log(hasil);        // undefined, karena sapa tidak punya return`),
      text('Arrow function adalah cara menulis fungsi yang lebih pendek. Kalau isinya satu ekspresi tanpa kurung kurawal, nilai ekspresi itu otomatis dikembalikan. Kalau memakai kurung kurawal, return harus ditulis sendiri. Kurung di sekitar parameter boleh dihilangkan hanya kalau parameternya satu. Parameter juga bisa diberi nilai default, yang dipakai ketika argumennya tidak dikirim.'),
      code('Arrow function dan parameter default', `const tambah = (a, b) => a + b;             // return otomatis
const kali = (a, b) => { return a * b; };   // pakai {} harus menulis return
const kuadrat = x => x * x;                 // satu parameter: kurung boleh dihilangkan

function salam(nama = 'teman') {
  return \`Halo, \${nama}\`;
}

console.log(tambah(2, 3)); // 5
console.log(kali(2, 3));   // 6
console.log(kuadrat(4));   // 16
console.log(salam());      // Halo, teman`),
      callout('const f = (a, b) => { a + b }; mengembalikan undefined. Kurung kurawal membuat blok, dan blok itu tidak punya return. Hapus kurung kurawalnya atau tulis return a + b.', 'warn'),
      text('Variabel yang dibuat di dalam fungsi hanya bisa dipakai di dalam fungsi itu. Membacanya dari luar fungsi menghasilkan ReferenceError.'),
    ],
    quiz: [
      item(
        'Apa nilai yang dikembalikan oleh fungsi yang selesai tanpa bertemu return?',
        ['null', '0', 'undefined', "String kosong ''"],
        'c',
        'Fungsi tanpa return tetap mengembalikan nilai, yaitu undefined. Karena itu const hasil = sapa("Ayu") berisi undefined.',
      ),
      item(
        'Dengan const tambah = (a, b) => a + b;, apa hasil tambah(2, 3)?',
        ['5', "'23'", 'undefined'],
        'a',
        'Isi arrow function ini satu ekspresi tanpa kurung kurawal, sehingga a + b otomatis dikembalikan. Kedua argumen adalah number, jadi hasilnya 5.',
      ),
      item(
        'Dengan const kali = (a, b) => { a * b };, apa hasil kali(2, 3)?',
        ['6', 'undefined', 'Error sintaks', 'NaN'],
        'b',
        'Kurung kurawal membuat blok, dan blok itu tidak punya return. Perkaliannya dihitung tetapi tidak dikembalikan, sehingga hasilnya undefined.',
      ),
      item(
        "Pada function sapa(nama) { ... } yang dipanggil dengan sapa('Ayu'), disebut apakah 'Ayu'?",
        ['Parameter', 'Nilai return', 'Nama fungsi', 'Argumen'],
        'd',
        "Nilai yang dikirim saat memanggil fungsi disebut argumen. nama adalah parameter, yaitu nama yang menerima argumen itu di dalam fungsi.",
      ),
    ],
  },
  {
    order: 3, title: 'Perbandingan == vs === dan tipe data', topic: 'javascript', bloom_level: 'understand', estimated_minutes: 15,
    references: [SRC.equality, SRC.typeofOp],
    body: [
      lead('JavaScript punya dua operator kesamaan. === membandingkan nilai sekaligus tipe tanpa konversi. == mengonversi tipe lebih dulu sebelum membandingkan, dan aturan konversinya sering mengejutkan. Untuk memahami bedanya, kenali dulu tipe data yang ada.'),
      text('Tipe primitif di JavaScript adalah string, number, boolean, undefined, null, bigint, dan symbol. Selain itu semuanya object, termasuk array dan fungsi. Operator typeof menunjukkan tipe sebuah nilai, dengan satu jebakan lama: typeof null menghasilkan "object".'),
      code('typeof', `console.log(typeof 'halo');      // 'string'
console.log(typeof 42);          // 'number'
console.log(typeof true);        // 'boolean'
console.log(typeof undefined);   // 'undefined'
console.log(typeof null);        // 'object' (kekeliruan lama yang dipertahankan)
console.log(typeof [1, 2]);      // 'object'
console.log(Array.isArray([1, 2])); // true`),
      code('== vs ===', `console.log(5 == '5');           // true  (string diubah menjadi angka)
console.log(5 === '5');          // false (tipenya berbeda)
console.log(0 == false);         // true
console.log('' == 0);            // true
console.log(null == undefined);  // true
console.log(null === undefined); // false
console.log(NaN === NaN);        // false (pakai Number.isNaN)`),
      callout('Biasakan memakai === dan !==. Satu-satunya pemakaian == yang umum adalah x == null, untuk memeriksa null dan undefined sekaligus.'),
      text('Object dan array dibandingkan berdasarkan referensi, bukan isinya. [1] === [1] bernilai false karena keduanya dua array berbeda di memori. Ingat juga bahwa nilai dari input form dan query string selalu string. Ubah dengan Number() sebelum membandingkannya dengan angka.'),
    ],
    quiz: [
      item(
        "Apa hasil '5' === 5?",
        ['true', 'false', 'Error, karena tipenya berbeda'],
        'b',
        "=== tidak mengonversi tipe. String '5' dan number 5 berbeda tipe, jadi hasilnya false. Dengan ==, hasilnya true karena string diubah menjadi angka lebih dulu.",
      ),
      item(
        'Apa hasil typeof null?',
        ["'null'", "'undefined'", "'object'", "'number'"],
        'c',
        "typeof null menghasilkan 'object'. Ini kekeliruan dari versi awal JavaScript yang dipertahankan demi kompatibilitas. Untuk memeriksa null, pakai x === null.",
      ),
      item(
        'Apa hasil [1, 2] === [1, 2]?',
        [
          'false, karena keduanya dua array berbeda dan yang dibandingkan adalah referensinya',
          'true, karena isinya sama',
          'Error, karena array tidak bisa dibandingkan',
        ],
        'a',
        'Array adalah object, dan object dibandingkan berdasarkan referensi. Dua literal array membuat dua objek terpisah, sehingga hasilnya false walaupun isinya sama.',
      ),
      item(
        "const age = input.value; berisi teks \"17\" dari sebuah input. Mana pemeriksaan yang benar untuk \"age sama dengan 17\"?",
        [
          'age === 17',
          'age = 17',
          "age == '17' && typeof age === 'number'",
          'Number(age) === 17',
        ],
        'd',
        "input.value selalu string, jadi age === 17 bernilai false. age = 17 adalah assignment, bukan perbandingan. typeof age adalah 'string', sehingga pilihan ketiga selalu false. Number(age) mengubahnya menjadi 17 lebih dulu.",
      ),
    ],
  },
  {
    order: 4, title: 'Memilih elemen dan menangani event di DOM', topic: 'dom', bloom_level: 'apply', estimated_minutes: 20,
    references: [SRC.querySelector, SRC.addEventListener],
    body: [
      lead('DOM adalah representasi halaman HTML sebagai pohon objek yang bisa dibaca dan diubah oleh JavaScript. Ada dua keterampilan dasar: menemukan elemen, lalu bereaksi ketika pengguna berinteraksi dengannya.'),
      text('querySelector(selector) mengembalikan elemen pertama yang cocok dengan selector CSS, atau null kalau tidak ada. querySelectorAll(selector) mengembalikan NodeList berisi semua elemen yang cocok, yang bisa ditelusuri dengan forEach. getElementById(id) mengambil satu elemen berdasarkan id, ditulis tanpa tanda #.'),
      code('HTML dan JavaScript', `<button id="save" class="btn">Simpan</button>
<ul class="list">
  <li>Apel</li>
  <li>Jeruk</li>
</ul>
<form>
  <input name="nama" />
  <button>Kirim</button>
</form>
<p id="info"></p>

<script>
  const saveButton = document.querySelector('#save');
  const items = document.querySelectorAll('.list li');
  const info = document.getElementById('info');

  console.log(items.length); // 2
  items.forEach((li) => li.classList.add('item'));

  // Yang didaftarkan adalah fungsinya, bukan hasil memanggilnya
  saveButton.addEventListener('click', (event) => {
    info.textContent = 'Tersimpan';
    console.log(event.target === saveButton); // true
  });
</script>`),
      text('addEventListener menerima fungsi sebagai argumen kedua. Kalau ditulis addEventListener(\'click\', save()), tanda kurung memanggil save saat itu juga, dan yang didaftarkan adalah nilai kembaliannya. Tulis save tanpa tanda kurung, atau bungkus dengan arrow function.'),
      callout('Script yang berjalan sebelum elemennya ada, misalnya di <head> tanpa atribut defer, mendapat null dari querySelector. Pemanggilan berikutnya lalu gagal dengan "Cannot read properties of null". Taruh script di akhir <body> atau pakai <script defer>.', 'warn'),
      code('Event delegation dan preventDefault', `// Lanjutan script di atas (memakai elemen dan variabel info yang sama)

// Satu listener di <ul> menangani semua <li>, termasuk yang ditambahkan belakangan
document.querySelector('.list').addEventListener('click', (event) => {
  const li = event.target.closest('li');
  if (li) li.classList.toggle('done');
});

// Mencegah form memuat ulang halaman saat dikirim
document.querySelector('form').addEventListener('submit', (event) => {
  event.preventDefault();
  info.textContent = 'Form diproses tanpa memuat ulang halaman';
});`),
    ],
    quiz: [
      item(
        'Halaman berisi tiga elemen <li class="item">. Apa yang dikembalikan oleh document.querySelector(\'.item\')?',
        ['NodeList berisi tiga elemen', 'Elemen <li> pertama yang cocok', 'Array berisi tiga elemen', 'null'],
        'b',
        'querySelector selalu mengembalikan satu elemen, yaitu elemen pertama yang cocok sesuai urutan dokumen. Untuk mendapatkan semuanya, pakai querySelectorAll.',
      ),
      item(
        'Mana cara yang benar agar fungsi save dijalankan setiap kali tombol btn diklik?',
        [
          "btn.addEventListener('click', save())",
          "btn.addEventListener(save, 'click')",
          "btn.addEventListener('click', 'save')",
          "btn.addEventListener('click', save)",
        ],
        'd',
        "Argumen pertama adalah nama event dan argumen kedua adalah fungsinya. save() memanggil fungsi saat pendaftaran, dan 'save' hanyalah string, bukan fungsi.",
      ),
      item(
        "Apa yang dikembalikan oleh document.querySelector('#tidak-ada') kalau tidak ada elemen yang cocok?",
        ['undefined', 'NodeList kosong', 'null', 'Melempar error'],
        'c',
        'querySelector mengembalikan null kalau tidak ada yang cocok. querySelectorAll, sebaliknya, mengembalikan NodeList kosong. Karena itu hasil querySelector perlu diperiksa sebelum dipakai.',
      ),
      item(
        'Mengirim form memuat ulang halaman. Di dalam listener submit yang dipasang dengan addEventListener, apa yang mencegahnya?',
        [
          'event.preventDefault()',
          'event.stopPropagation()',
          'Mengembalikan false dari listener',
        ],
        'a',
        'preventDefault membatalkan aksi bawaan browser, yaitu mengirim form dan memuat ulang halaman. stopPropagation hanya menghentikan event merambat ke elemen induk. return false tidak berpengaruh pada listener yang dipasang dengan addEventListener.',
      ),
    ],
  },
  {
    order: 5, title: 'Method array: map, filter, dan find', topic: 'array-methods', bloom_level: 'understand', estimated_minutes: 20,
    references: [SRC.arrayMap, SRC.arrayFilter, SRC.arrayFind],
    body: [
      lead('Data dari server hampir selalu datang sebagai array, misalnya daftar produk, pengguna, atau pesan. Daripada menulis loop for setiap kali, JavaScript menyediakan method yang menerima fungsi callback. Modul ini membahas tiga yang paling sering dipakai: map, filter, dan find.'),
      text('map membuat array baru dengan panjang yang sama, berisi nilai yang dikembalikan callback untuk setiap elemen. filter membuat array baru yang hanya berisi elemen yang callback-nya bernilai truthy; kalau tidak ada yang lolos, hasilnya array kosong. find mengembalikan elemen pertama yang cocok, atau undefined kalau tidak ada. Ketiganya tidak mengubah array asal.'),
      code('map, filter, dan find', `const produk = [
  { nama: 'Pena', harga: 5000, stok: 12 },
  { nama: 'Buku', harga: 20000, stok: 0 },
  { nama: 'Map', harga: 8000, stok: 5 },
];

const nama = produk.map((p) => p.nama);
console.log(nama);            // ['Pena', 'Buku', 'Map']

const tersedia = produk.filter((p) => p.stok > 0);
console.log(tersedia.length); // 2

const buku = produk.find((p) => p.nama === 'Buku');
console.log(buku.harga);      // 20000

console.log(produk.find((p) => p.harga > 100000)); // undefined
console.log(produk.length);   // 3: array asal tidak berubah`),
      callout('Callback map harus mengembalikan nilai. produk.map((p) => { p.nama; }) menghasilkan [undefined, undefined, undefined], karena kurung kurawal tanpa return membuat setiap pemanggilan mengembalikan undefined.', 'warn'),
      text('Pilih method dari bentuk hasil yang dibutuhkan. Kalau setiap elemen perlu diubah, pakai map. Kalau hanya sebagian elemen yang dibutuhkan, pakai filter, yang selalu menghasilkan array. Kalau yang dibutuhkan satu elemen, pakai find, yang menghasilkan elemen itu atau undefined. Karena map dan filter menghasilkan array, keduanya bisa dirangkai.'),
      code('Merangkai filter dan map', `const namaTersedia = produk
  .filter((p) => p.stok > 0)
  .map((p) => p.nama.toUpperCase());

console.log(namaTersedia); // ['PENA', 'MAP']`),
    ],
    quiz: [
      item(
        'Apa hasil [1, 2, 3].map((n) => n * 2)?',
        ['[1, 2, 3]', '12', '[2, 4, 6]', '6'],
        'c',
        'map memanggil callback untuk setiap elemen dan menyusun hasilnya menjadi array baru dengan panjang yang sama: 1 × 2, 2 × 2, dan 3 × 2.',
      ),
      item(
        'Apa hasil [5, 8, 12].find((n) => n > 20)?',
        ['[]', 'undefined', 'null', '-1'],
        'b',
        'find mengembalikan elemen pertama yang cocok. Tidak ada angka di atas 20, sehingga hasilnya undefined. Array kosong [] adalah hasil filter untuk kasus yang sama.',
      ),
      item(
        'Apa hasil [3, 7, 10].filter((n) => n > 5)?',
        ['[7, 10]', '7', '[false, true, true]'],
        'a',
        'filter mempertahankan elemen yang callback-nya bernilai true dan selalu mengembalikan array. [false, true, true] adalah hasil map dengan callback yang sama.',
      ),
      item(
        "Kenapa ['a', 'b'].map((s) => { s.toUpperCase(); }) menghasilkan [undefined, undefined]?",
        [
          'map tidak bisa dipakai untuk array berisi string',
          'toUpperCase mengubah array asal sehingga map kehilangan datanya',
          'map hanya memproses elemen pertama',
          'Callback memakai kurung kurawal tanpa return, sehingga setiap pemanggilan mengembalikan undefined',
        ],
        'd',
        'Nilai yang dikembalikan callback menjadi elemen array baru. Dengan kurung kurawal, return harus ditulis sendiri. Tulis (s) => s.toUpperCase() atau tambahkan return.',
      ),
    ],
  },
  {
    order: 6, title: 'reduce dan menampilkan hasil array ke DOM', topic: 'array-methods', bloom_level: 'apply', estimated_minutes: 25,
    references: [SRC.arrayReduce, SRC.textContent],
    body: [
      lead('Setelah data disaring dan diubah, langkah terakhir biasanya merangkumnya, misalnya menjadi total harga, lalu menampilkannya di halaman. Modul ini memakai reduce untuk merangkum dan DOM untuk menampilkan, sehingga semua yang sudah dipelajari di jalur ini dipakai bersama.'),
      text('reduce(callback, nilaiAwal) memproses array menjadi satu nilai. Callback menerima akumulator (hasil sementara) dan elemen saat ini, lalu mengembalikan akumulator yang baru. nilaiAwal menjadi akumulator pertama. Kalau nilaiAwal tidak diberikan, elemen pertama array dipakai sebagai akumulator, dan reduce pada array kosong melempar TypeError. Karena itu, biasakan selalu memberi nilai awal.'),
      code('Menghitung total dengan reduce', `const keranjang = [
  { nama: 'Pena', harga: 5000, jumlah: 2 },
  { nama: 'Buku', harga: 20000, jumlah: 1 },
];

const total = keranjang.reduce((sum, item) => sum + item.harga * item.jumlah, 0);
console.log(total); // 30000

console.log([].reduce((sum, n) => sum + n, 0)); // 0: array kosong mengembalikan nilai awal
// [].reduce((sum, n) => sum + n);              // TypeError: array kosong tanpa nilai awal`),
      callout("Tanpa nilai awal, keranjang.reduce((sum, item) => sum + item.harga * item.jumlah) salah: akumulator pertama adalah objek Pena, bukan angka, sehingga hasilnya string '[object Object]20000'.", 'warn'),
      text('Untuk menampilkan hasilnya, buat elemen dengan document.createElement, isi teksnya dengan textContent, lalu masukkan ke halaman dengan append. Pakai textContent, bukan innerHTML, untuk teks biasa. innerHTML mem-parse isinya sebagai HTML, sehingga teks dari pengguna bisa berubah menjadi kode yang dijalankan (XSS).'),
      code('Menampilkan daftar dan total', `<ul id="daftar"></ul>
<p id="total"></p>

<script>
  const keranjang = [
    { nama: 'Pena', harga: 5000, jumlah: 2 },
    { nama: 'Buku', harga: 20000, jumlah: 1 },
  ];
  const daftar = document.querySelector('#daftar');

  keranjang
    .map((item) => \`\${item.nama} × \${item.jumlah}\`)
    .forEach((teks) => {
      const li = document.createElement('li');
      li.textContent = teks;
      daftar.append(li);
    });

  const total = keranjang.reduce((sum, item) => sum + item.harga * item.jumlah, 0);
  document.querySelector('#total').textContent = \`Total: Rp\${total}\`; // Total: Rp30000
</script>`),
    ],
    quiz: [
      item(
        'Apa hasil [2, 4, 6].reduce((sum, n) => sum + n, 10)?',
        ['12', '22', '10', '[12, 22]'],
        'b',
        'Akumulator dimulai dari nilai awal 10, lalu ditambah 2, 4, dan 6. Hasilnya 22. Angka 12 adalah hasil kalau nilai awalnya 0.',
      ),
      item(
        'Apa yang terjadi pada [].reduce((sum, n) => sum + n)?',
        ['Menghasilkan 0', 'Menghasilkan undefined', 'Melempar TypeError, karena array kosong dan tidak ada nilai awal', 'Menghasilkan []'],
        'c',
        'Tanpa nilai awal, reduce memakai elemen pertama sebagai akumulator. Array kosong tidak punya elemen pertama, sehingga reduce melempar TypeError. Dengan nilai awal 0, hasilnya 0.',
      ),
      item(
        'Kamu ingin menampilkan nama yang diketik pengguna di dalam sebuah <li>. Mana yang paling tepat?',
        ['li.innerHTML = nama', 'li.textContent = nama', "li.setAttribute('nama', nama)"],
        'b',
        'textContent memasukkan nama sebagai teks biasa. innerHTML mem-parse isinya sebagai HTML, sehingga input seperti <img onerror=...> bisa dijalankan. setAttribute hanya membuat atribut dan tidak menampilkan teks.',
      ),
      item(
        'Array nilai berisi [70, 85, 90]. Mana yang menghitung rata-ratanya?',
        [
          'nilai.map((n) => n / 3)',
          'nilai.filter((n) => n > 0).length',
          'nilai.find((n) => n)',
          'nilai.reduce((s, n) => s + n, 0) / nilai.length',
        ],
        'd',
        'reduce menjumlahkan semua nilai menjadi 245, lalu dibagi banyaknya nilai, 3. map menghasilkan array, filter(...).length menghitung jumlah elemen, dan find hanya mengembalikan elemen pertama.',
      ),
    ],
  },
];

// --- intermediate: Arsitektur aplikasi MERN (modul contoh) -------------------

const intermediate = [
  {
    order: 1, title: 'Retry dengan exponential backoff', topic: 'async', bloom_level: 'apply', estimated_minutes: 25,
    references: [SRC.backoff, SRC.returnAwait, SRC.httpStatus],
    body: [
      lead('Request ke layanan lain kadang gagal sesaat karena jaringan putus, server sibuk, atau rate limit. Retry mengulang operasi yang gagal. Exponential backoff menggandakan jeda di setiap percobaan, supaya layanan yang sedang kewalahan diberi waktu untuk pulih.'),
      text('Rumusnya: jeda sebelum percobaan ke-(n+1) adalah base × 2^(n−1). Dengan base 100 ms, jedanya 100, 200, 400, 800 ms, dan seterusnya. Setelah percobaan terakhir tidak ada jeda, karena menunggu di titik itu hanya memperlambat kegagalan yang sudah pasti.'),
      code('withRetry', `const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry(task, { attempts = 3, baseDelayMs = 100 } = {}) {
  for (let n = 1; ; n++) {
    try {
      // return await, bukan return: reject harus terjadi di dalam try agar bisa diulang
      return await task(n);
    } catch (err) {
      if (n >= attempts) throw err; // percobaan terakhir: lempar ulang tanpa menunggu
      await sleep(baseDelayMs * 2 ** (n - 1));
    }
  }
}`),
      code('Mencoba withRetry', `let calls = 0;
const flaky = async () => {
  calls++;
  if (calls < 3) throw new Error(\`gagal ke-\${calls}\`);
  return 'ok';
};

const started = Date.now();
withRetry(flaky, { attempts: 4, baseDelayMs: 50 }).then((result) => {
  // Dua kegagalan -> jeda 50 + 100 ms sebelum percobaan ketiga berhasil
  console.log(result, calls, 'percobaan,', Date.now() - started, 'ms'); // ok 3 percobaan, ~150 ms
});`),
      callout('return task() tanpa await di dalam try membuat reject lolos dari catch. Akibatnya fungsi langsung gagal pada percobaan pertama, dan retry tidak pernah terjadi.', 'warn'),
      text('Tidak semua error layak diulang. 400, 401, dan 404 akan memberi hasil yang sama berapa kali pun diulang. Retry layak untuk timeout, 503 Service Unavailable, dan 429 Too Many Requests. Pada sistem dengan banyak client, tambahkan jitter, yaitu sedikit nilai acak pada jeda, agar client yang gagal bersamaan tidak mengulang pada detik yang sama dan membanjiri server lagi.'),
      code('Jeda dengan jitter', `// Jitter: jeda acak antara 50% dan 100% dari jeda eksponensial
const delayWithJitter = (n, baseDelayMs) => {
  const exp = baseDelayMs * 2 ** (n - 1);
  return exp / 2 + Math.random() * (exp / 2);
};

console.log(delayWithJitter(3, 100)); // angka antara 200 dan 400`),
    ],
    quiz: [
      item(
        'withRetry dipanggil dengan attempts 4 dan baseDelayMs 200, dan task selalu gagal. Jeda apa saja yang ditunggu sebelum withRetry akhirnya reject?',
        ['200, 400, 800 ms', '200, 400, 800, 1600 ms', '200, 200, 200 ms', '0, 200, 400, 800 ms'],
        'a',
        'Ada empat percobaan, jadi ada tiga jeda di antaranya: 200 × 2^0, 200 × 2^1, dan 200 × 2^2. Setelah percobaan keempat, error langsung dilempar tanpa menunggu.',
      ),
      item(
        'Respons mana yang paling tidak layak di-retry?',
        ['503 Service Unavailable', 'Timeout jaringan', '404 Not Found', '429 Too Many Requests'],
        'c',
        '404 berarti resource memang tidak ada, sehingga mengulang request tidak mengubah hasilnya. Tiga pilihan lain adalah kegagalan sementara yang bisa berhasil kalau dicoba lagi.',
      ),
      item(
        'Di dalam loop retry tertulis try { return task(n); } catch (err) { ... }, tanpa await. Apa akibatnya kalau task reject?',
        [
          'Retry tetap berjalan normal',
          'Reject lolos dari catch, sehingga withRetry langsung reject pada percobaan pertama tanpa mengulang',
          'task dipanggil dua kali pada setiap percobaan',
          'Kode error sintaks karena return harus berada di luar try',
        ],
        'b',
        'Tanpa await, Promise dari task langsung dikembalikan dan blok try selesai. Reject terjadi di luar try, sehingga catch, yang berisi logika retry, tidak pernah berjalan.',
      ),
      item(
        'Apa tujuan menambahkan jitter pada jeda backoff?',
        [
          'Membuat total waktu tunggu selalu lebih pendek',
          'Menjamin percobaan berikutnya pasti berhasil',
          'Menghilangkan kebutuhan batas jumlah percobaan',
          'Agar banyak client yang gagal bersamaan tidak mengulang pada saat yang persis sama',
        ],
        'd',
        'Tanpa jitter, client yang gagal pada saat yang sama juga akan mengulang pada saat yang sama, sehingga server kembali dibanjiri. Nilai acak menyebarkan percobaan ulang itu ke rentang waktu yang lebih lebar.',
      ),
    ],
  },
  {
    order: 2, title: 'Menyusun middleware Express', topic: 'express', bloom_level: 'apply', estimated_minutes: 25,
    references: [SRC.expressMiddleware, SRC.expressApp, SRC.express5],
    body: [
      lead('Di Express, setiap request melewati rangkaian middleware sesuai urutan pendaftarannya. Setiap middleware boleh membaca atau mengubah req dan res, mengakhiri request dengan mengirim respons, atau menyerahkannya ke middleware berikutnya dengan next().'),
      text('Middleware berbentuk (req, res, next). Ia punya tiga pilihan: mengirim respons, memanggil next() untuk lanjut, atau memanggil next(err) untuk melompat ke middleware error. Kalau tidak satu pun dilakukan, request menggantung sampai client timeout.'),
      code('Middleware global, per rute, per router, 404, dan error', `const express = require('express');
const app = express();

// Global: berlaku untuk semua request, dipasang paling awal
app.use(express.json());
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => console.log(req.method, req.originalUrl, res.statusCode, \`\${Date.now() - start}ms\`));
  next();
});

function requireApiKey(req, res, next) {
  if (req.get('x-api-key') !== 'rahasia') {
    return res.status(401).json({ error: 'API key salah' });
  }
  next();
}

app.get('/public', (req, res) => res.json({ ok: true }));

// Per router: requireApiKey hanya berlaku untuk rute di bawah /admin
const admin = express.Router();
admin.use(requireApiKey);
admin.get('/stats', (req, res) => res.json({ users: 10 }));
app.use('/admin', admin);

// Paling akhir: 404 untuk rute yang tidak cocok, lalu middleware error
app.use((req, res) => res.status(404).json({ error: 'not_found' }));
app.use((err, req, res, next) => {
  res.status(err.status ?? 500).json({ error: err.message });
});

app.listen(3000);`),
      text('Urutan menentukan perilaku. Parser seperti express.json() harus dipasang sebelum rute yang membaca req.body. Middleware 404 dipasang setelah semua rute, karena ia menangkap request apa pun yang sampai kepadanya. Middleware error dipasang paling akhir.'),
      code('Urutan yang salah', `const express = require('express');
const app = express();

app.post('/notes', (req, res) => {
  res.json({ received: req.body }); // Express 5: req.body undefined karena parser belum dipasang untuk rute ini
});
app.use(express.json()); // terlambat untuk rute di atas

app.listen(3000);`),
      callout('Memanggil next() setelah mengirim respons membuat middleware berikutnya bisa mengirim respons kedua, yang berujung pada error "Cannot set headers after they are sent". Pakai return res... pada jalur yang mengakhiri request.', 'warn'),
    ],
    quiz: [
      item(
        'Middleware (req, res, next) => { console.log(req.url); } dipasang dengan app.use sebelum semua rute. Apa yang terjadi pada setiap request?',
        [
          'Express memanggil next secara otomatis setelah fungsi selesai',
          'Request menggantung: tidak ada respons sampai client timeout',
          'Express membalas 500 karena next tidak dipanggil',
        ],
        'b',
        'Express tidak melanjutkan rantai dengan sendirinya. Middleware ini tidak mengirim respons dan tidak memanggil next, sehingga request berhenti di situ tanpa balasan.',
      ),
      item(
        "Di Express 5, app.use(express.json()) dipasang setelah app.post('/notes', handler). Client mengirim JSON ke POST /notes. Apa isi req.body di handler?",
        ['undefined', 'Objek hasil parse JSON', 'String JSON mentah', 'Objek kosong {}'],
        'a',
        'Middleware hanya berlaku untuk request yang melewatinya sebelum rute. Handler /notes sudah mengirim respons sebelum express.json() sempat berjalan, sehingga req.body belum diisi. Express 5 membiarkannya undefined; Express 4 mengisinya dengan {}.',
      ),
      item(
        'Di mana middleware error sebaiknya dipasang?',
        [
          'Paling awal, sebelum express.json()',
          'Di dalam setiap handler rute',
          'Di dalam app.listen',
          'Setelah semua rute dan middleware biasa',
        ],
        'd',
        'Express meneruskan error ke middleware error yang terdaftar setelah titik terjadinya error. Dengan memasangnya paling akhir, error dari semua rute dan middleware sebelumnya tertangkap.',
      ),
      item(
        "Dengan admin.use(requireApiKey) dan app.use('/admin', admin), apakah requireApiKey berjalan untuk GET /public?",
        [
          'Ya, karena semua middleware berjalan untuk semua request',
          'Ya, tetapi hanya kalau header x-api-key dikirim',
          'Tidak, karena middleware router hanya berlaku untuk request yang masuk ke router itu, yaitu path di bawah /admin',
        ],
        'c',
        "Router dipasang di path '/admin', jadi middleware di dalamnya hanya berjalan untuk request yang path-nya diawali /admin. /public ditangani di app tanpa melewati router admin.",
      ),
    ],
  },
];

export const modulesByLevel = { beginner, new: newcomer, intermediate };
