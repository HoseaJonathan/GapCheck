# Sub-proyek 2 — Fitur belajar inti

Tanggal: 2026-10-11
Status: disetujui dalam sesi brainstorming, menunggu review spec tertulis
Dibangun di atas: branch `feat/mongodb-data-layer` (sub-proyek 1, belum di-merge)
Branch kerja: `feat/learning-core`

## Konteks

Sub-proyek 1 memindahkan semua data ke MongoDB. Bagian belajar sudah tampil,
tetapi baru sebagian yang berfungsi:

- Penugasan path dari level sudah otomatis.
- Hanya ada 4 modul, semuanya di path beginner, dan hanya 1 yang punya isi.
- Kuis hanya dicek per soal lewat endpoint stateless, tanpa nilai.
- Gating hanya berupa label `unlock_rule`.
- Progres hanya berasal dari seed.
- Asesmen ulang tidak punya aturan.

Sub-proyek 2 menutup alur skripsi: diagnostik → level → learning path → belajar
modul → kuis → modul berikutnya terbuka → asesmen ulang menunjukkan peningkatan.

### Keputusan yang sudah diambil

| Topik | Keputusan |
|---|---|
| Isi materi | Path **beginner** lengkap (9 modul). Path `new` dan `intermediate` masing-masing 2 modul contoh dengan isi lengkap. |
| Gating | **Berurutan per modul.** Modul ke-n terbuka setelah kuis modul prasyaratnya lulus. Prasyarat disimpan eksplisit di `modules.requires`. |
| Kuis gagal | Seluruh kuis boleh diulang tanpa batas. Semua percobaan disimpan. Kunci jawaban baru ditunjukkan setelah lulus. |
| Asesmen ulang (A4) | Diagnostik pertama bebas. Checkpoint boleh dikerjakan setelah **satu langkah path** selesai sejak asesmen terakhir, atau kalau seluruh path sudah tamat. |
| Arsitektur | **Pendekatan A:** riwayat percobaan disimpan di `quiz_attempts`. Status kunci **dihitung**, tidak disimpan. |

### Di luar scope

- Tampilan sesuai `docs/DESIGN.md` (sub-proyek 4). Perubahan client di sini hanya fungsional.
- Latihan coding di modul dan Judge0 (sub-proyek 3).
- Panel admin atau dosen untuk mengelola konten. Konten ditulis sebagai data seed.
- Daily Puzzle (keputusan A6).

## 1. Perubahan data

### `modules` (diubah)

| Field | Perubahan |
|---|---|
| `requires` | **Baru.** ObjectId modul prasyarat, atau `null`. Seed mengisinya dengan modul sebelumnya (urut `order`) di path yang sama. Modul pertama bernilai `null`. |
| `order` | Dirapikan menjadi 1, 2, 3, … tanpa lompatan di setiap path. |
| `unlock_rule`, `unlock_hint` | **Tidak disimpan lagi.** Keduanya tetap ada di respons API dengan nama yang sama, tetapi dihitung (Bagian 2). |
| `body[].type` | Ditambah tipe **`text`** (paragraf biasa) di samping `lead`, `code`, dan `callout`. |
| `quiz[].explanation` | **Baru.** Penjelasan per soal, `select: false`, sama perlakuannya dengan `quiz[].correct_answer`. |

### `quiz_attempts` (koleksi baru)

| Field | Tipe | Keterangan |
|---|---|---|
| `user_id` | ObjectId | referensi `users` |
| `module_id` | ObjectId | referensi `modules` |
| `answers` | Array of String | Jawaban user, urut sesuai indeks soal. |
| `correct_count` | Number | Jumlah jawaban benar. |
| `total` | Number | Jumlah soal pada saat dinilai. |
| `score` | Number | `correct_count / total`, dibulatkan 2 desimal. |
| `passed` | Boolean | `score ≥ QUIZ_PASS_THRESHOLD`. |
| `submitted_at` | Date | Waktu percobaan. |

Indeks: `(user_id, module_id, submitted_at)`.
Konstanta baru di `config.js`: `QUIZ_PASS_THRESHOLD = 0.7`.

### `progress` (arti diperjelas)

| Field | Arti |
|---|---|
| `state` | Hanya `in_progress` atau `completed`. Status `locked` tidak pernah disimpan. Enum diubah menjadi dua nilai ini. |
| `percent_complete` | **50** saat materi dibuka pertama kali, **100** saat kuis lulus. Tidak ada nilai lain. |
| `completed_at` | **Baru.** Waktu kuis pertama kali lulus. Ditulis sekali dan tidak pernah ditimpa. |

### `assessment_sessions`

Skema tidak berubah. Bedanya, `kind` sekarang **ditentukan server** lewat
`retakeEligibility` (Bagian 2), bukan dikirim client.

## 2. Aturan — `server/src/learning.js` (fungsi murni)

Fungsi-fungsi berikut tidak mengakses database, mengikuti pola `scoring.js` dan
`analytics.js`. Id dibandingkan dengan `String()`. Argumen `progress` adalah
`Map<String(module_id), progressRow>` milik satu user.

| Fungsi | Definisi |
|---|---|
| `lockStates(modules, progress)` | Mengembalikan `Map<String(_id), { locked, unlock_rule, unlock_hint }>`. Modul **terbuka** kalau `requires` bernilai `null`, atau modul prasyaratnya punya progres `completed`. Selain itu terkunci. `unlock_hint` untuk modul terkunci: `` `Lulus kuis modul ${pad2(prasyarat.order)} untuk membuka` `` (`pad2` = dua digit, mis. `03`). Untuk modul terbuka: `null`. |
| `nextModule(modules, locks, progress)` | Modul pertama, urut `order`, yang **terbuka dan belum `completed`**. Kalau tidak ada, `null`. |
| `gradeQuiz(items, answers)` | Ditolak kalau `answers` bukan array, panjangnya ≠ jumlah soal, atau ada elemen yang bukan string: fungsi melempar error yang dipetakan ke 400 `incomplete_answers`. Kalau valid, mengembalikan `{ correct_count, total, score, passed }`, dengan `score = round2(correct_count/total)` dan `passed = correct_count/total ≥ QUIZ_PASS_THRESHOLD`. Pembandingan memakai rasio mentah, bukan `score` yang sudah dibulatkan. |
| `retakeEligibility({ sessions, modules, progress })` | Lihat aturan di bawah. Mengembalikan `{ allowed, kind, reason }`. |

**Aturan `retakeEligibility`** (`sessions` = sesi `finished` milik user;
`modules` = modul di path level user saat ini):

1. Kalau `sessions` kosong → `{ allowed: true, kind: 'diagnostic', reason: null }`.
2. Ambil `last = max(finished_at)`. Kelompokkan `modules` per `topic` (satu kelompok = satu langkah path). Boleh (`kind: 'checkpoint'`) kalau salah satu terpenuhi:
   - **(a)** ada kelompok dengan minimal satu modul yang **menjadi selesai sejak asesmen terakhir**: semua modulnya `completed`, dan `max(completed_at)` kelompok itu `> last`. Modul yang sudah lulus sebelum asesmen terakhir tetap dihitung sebagai bagian langkah, tetapi tidak cukup sendirian membuka asesmen ulang;
   - **(b)** `modules` tidak kosong dan semua modulnya `completed` (path tamat).
3. Selain itu → `{ allowed: false, kind: 'checkpoint', reason }`, dengan `reason` = `` `Selesaikan ${n} modul lagi di langkah ${title} untuk membuka asesmen ulang.` ``.
   - Kandidat langkah adalah langkah yang masih punya modul belum `completed`.
   - Yang dipilih adalah kandidat **paling awal di path**. Karena gating berurutan, itulah langkah yang sedang dikerjakan user; langkah sesudahnya masih terkunci.
   - `title` diambil dari `learning_paths.steps[].title`, dan `n` adalah jumlah modul langkah itu yang belum `completed`.
   - Kalau path user tidak punya modul sama sekali, `reason` = `'Belum ada modul untuk jalur kamu.'`.

Sesi `in_progress` selalu bisa dilanjutkan; aturan ini hanya berlaku saat membuat
sesi baru.

### Dampak ke perilaku sub-proyek 1

- **`next_up` di `/overview` = `nextModule(...)`.** Fallback `pickModuleForTopic` dan `firstOpenModule` digantikan.
  - `reason`: kalau `next_up.topic` sama dengan topik terlemah di analisis terakhir → `` `Dipilih karena topik ${topic} adalah topik terlemah di diagnostik terakhir kamu.` ``; selain itu → `'Modul berikutnya di jalur belajar kamu.'`.
  - `next_up` bernilai `null` kalau user belum punya level, path tidak punya modul, atau semua modul sudah selesai.
- **Callout topik terlemah di `/progress`** menunjuk modul pertama (urut `order`) bertopik terlemah yang **terbuka** dan belum selesai. Kalau tidak ada, menunjuk modul pertama dengan topik itu. Kalau tetap tidak ada, callout tidak ditampilkan.
- `flagged_by_diagnostic` tetap ada, dengan aturan yang sama: `module.topic === topik terlemah`.
- Kalau level berubah setelah checkpoint, user memakai path level barunya mulai dari modul pertama. Progres di path lama tetap tersimpan, tetapi tidak dipakai.

## 3. API

Semua endpoint memakai `requireAuth`. Query dibatasi `user_id` dari token, dan
error berbentuk `{ error, reason }`.

### Modul

| Endpoint | Perilaku |
|---|---|
| `GET /modules` | `{ modules }`: modul di path user, urut `order`. Setiap modul membawa field outline (`_id, path_id, order, title, topic, bloom_level, estimated_minutes`) ditambah `locked`, `unlock_rule`, `unlock_hint`, `state` (`null` \| `in_progress` \| `completed`), `progress_percent` (0/50/100), dan `quiz_status: { attempts, best_score, passed }`. |
| `GET /modules/:id` | `{ module, siblings }`. `module` selalu membawa field status yang sama dengan `GET /modules`, plus `flagged_by_diagnostic`. **Modul terbuka:** ditambah `body` dan `quiz` (tanpa `correct_answer` dan `explanation`). **Modul terkunci:** **tanpa `body` dan `quiz`**. `siblings` = modul satu path dengan field status (tanpa body/quiz). Modul tidak ada → 404 `unknown_module`; id tidak valid → 404 `invalid_id`. |
| `POST /modules/:id/start` | Kalau belum ada progres: upsert dengan `$setOnInsert: { state: 'in_progress', percent_complete: 50 }`. Kalau sudah ada: tidak berubah. Respons 200 `{ state, progress_percent }`. Modul terkunci → 403 `module_locked`. |
| `POST /modules/:id/quiz/attempts` dengan body `{ answers: string[] }` | Pemeriksaan berurutan: (1) modul ada (404); (2) tidak terkunci (403 `module_locked`); (3) `gradeQuiz` (400 `incomplete_answers`); (4) simpan percobaan. **Lulus:** progres di-upsert menjadi `completed` 100; `completed_at` ditulis hanya kalau belum ada (update bersyarat). Respons 201 `{ attempt_no, score, correct_count, total, passed }`. Kalau `passed`, ditambah `review: [{ question, your_answer, correct_answer, explanation }]` dan `next_module_id` (modul yang terbuka karena kelulusan ini, atau `null`). Kalau gagal, **tidak ada** informasi per soal. |
| `GET /modules/:id/quiz/attempts` | `{ attempts: [{ attempt_no, score, correct_count, total, passed, submitted_at }] }` milik user, terbaru di atas. Tidak memuat kunci maupun jawaban. |
| `POST /modules/:id/quiz/:index/check` | **Dihapus** (404). Endpoint ini memungkinkan menebak kunci soal satu per satu. |

### Asesmen

| Endpoint | Perubahan |
|---|---|
| `POST /sessions` | `kind` dari client diabaikan. Kalau ada sesi `in_progress`, perilakunya sama seperti sub-proyek 1 (resume atau auto-expire). Kalau tidak, server memanggil `retakeEligibility`: tidak boleh → 403 `retake_locked` dengan `{ reason }`; boleh → sesi baru dengan `kind` hasil fungsi itu. |
| `GET /overview`, `GET /progress` | Ditambah `retake: { allowed, kind, reason }`. Field lama tidak berubah. |

## 4. Isi materi

### Format

Setiap modul berisi:
- satu blok `lead`;
- 3–6 blok `text`/`code`/`callout`;
- **kuis 3–5 soal** pilihan ganda (3–4 opsi, satu kunci, setiap soal dengan `explanation`);
- `estimated_minutes`, `bloom_level`, dan `topic`.

Bahasa Indonesia. Contoh kode harus benar dan bisa dijalankan.

### Path `beginner` — "REST API dan React" (9 modul)

★ = modul yang sudah ada; judul dipertahankan, isi ditulis atau diperluas.

| order | topic | Judul | Menutup celah soal diagnostik |
|---|---|---|---|
| 1 | async | ★ Callback, Promise, dan async/await | — |
| 2 | async | ★ Error handling pada kode asinkron | `async-error-middleware` |
| 3 | async | ★ Kenapa try/catch tidak menangkap error Promise | `retry-with-backoff` |
| 4 | async | Menjalankan Promise secara paralel (`Promise.all`, `Promise.allSettled`) | `promise-all-prices` |
| 5 | rest-api | Routing dan parameter di Express (`req.params`, `req.query`) | `express-route-params` |
| 6 | rest-api | ★ Validasi query parameter | `questions-difficulty-filter` |
| 7 | rest-api | Status code dan middleware error | `async-error-middleware` |
| 8 | react | State dan render kondisional | `react-props-render` |
| 9 | react | Mengambil data dengan `useEffect` (loading, error, cleanup) | — |

Langkah path tetap tiga (`async`, `rest-api`, `react`), sehingga `module_count`
menjadi 4 / 3 / 2.

### Path `new` dan `intermediate` (2 modul contoh masing-masing)

| Path | order | topic | Judul |
|---|---|---|---|
| new | 1 | javascript | Perbandingan `==` vs `===` dan tipe data |
| new | 2 | dom | Memilih elemen dan menangani event di DOM |
| intermediate | 1 | async | Retry dengan exponential backoff |
| intermediate | 2 | express | Menyusun middleware Express |

### Seed user

- **hosea:**
  - modul beginner 1 `completed` 100, dengan satu percobaan lulus (skor penuh), `submitted_at` dan `completed_at` = `2026-09-10T10:00:00Z` (sebelum sesi terakhir 2026-09-22);
  - modul 2 `in_progress` 50;
  - akibatnya `next_up` = modul 2, dan `retake.allowed = false` dengan alasan "Selesaikan 3 modul lagi di langkah JavaScript asinkron…".
- **nadia:** tanpa progres dan tanpa percobaan (tidak berubah).

## 5. Client, error handling, dan pengujian

### Client (fungsional, tanpa restyle)

- **`api.js`:** fungsi `startModule(id)`, `submitQuiz(id, answers)`, dan `quizAttempts(id)` ditambahkan; `checkQuiz` dihapus.
- **`ModuleScreen`:**
  - Modul terkunci menampilkan judul, `unlock_hint`, dan tautan ke `next_up` (dari `/overview`).
  - Modul terbuka memanggil `startModule` sekali saat dibuka dan merender blok `text` sebagai paragraf.
  - Kuis: semua soal ditampilkan sekaligus, satu pilihan per soal. Tombol "Kirim jawaban" aktif setelah semua soal dijawab.
  - Gagal: `` `Skor ${correct_count}/${total} (${pct}%) — butuh 70%. Baca ulang materi lalu coba lagi.` `` dan tombol "Coba lagi" yang mengosongkan pilihan.
  - Lulus: daftar `review` dan tombol "Lanjut ke modul berikutnya" ke `next_module_id` (disembunyikan kalau `null`).
  - Ditampilkan juga jumlah percobaan dan skor terbaik dari `quiz_status`.
  - Daftar modul di samping memakai `locked`, `unlock_hint`, dan `state` dari `siblings`.
- **`Overview`:** blok "Asesmen ulang". Kalau `retake.allowed`, tombolnya menuju `/assessment`; kalau tidak, tombol nonaktif disertai `retake.reason`.
- **`Assessment`:** tidak mengirim `kind`. Kalau `POST /sessions` membalas 403 `retake_locked`, tampilkan `reason` dan tautan ke `/`.

### Error handling dan race condition

| Kasus | Penanganan |
|---|---|
| `POST /start` berulang (StrictMode, double-click) | Upsert dengan `$setOnInsert`, sehingga progres 100 tidak pernah turun menjadi 50. |
| Dua kelulusan kuis bersamaan | `completed_at` ditulis lewat update bersyarat (`completed_at` belum ada), sehingga hanya kelulusan pertama yang tercatat. |
| Dua submit kuis bersamaan | Tercatat sebagai dua percobaan. Ini perilaku yang benar. |
| Kunci jawaban | `quiz[].correct_answer` dan `quiz[].explanation` memakai `select: false` dan dibuang lagi di service. Keduanya hanya muncul di `review` respons kelulusan. |

### Pengujian

Semua 105 test yang ada tetap lolos, kecuali test yang secara sengaja diubah
karena perilakunya berganti. Test seperti itu diperbarui, tidak dihapus:
`next_up` hosea, `/check` lama, dan nilai `progress_percent` 60 → 50.

1. **Unit `learning.test.js`:**
   - `lockStates`: modul pertama terbuka; prasyarat `in_progress` → terkunci; prasyarat `completed` → terbuka; teks `unlock_hint`.
   - `nextModule`: garis depan; semua selesai → `null`.
   - `gradeQuiz` dengan **boundary value**: 6/10 gagal, 7/10 lulus, 2/3 gagal, 4/5 lulus, 0/3 dan 3/3. Ditolak untuk jawaban kurang, lebih, bukan array, atau berisi non-string.
   - `retakeEligibility`: sesi pertama; langkah belum lengkap (dengan teks `reason`); langkah menjadi lengkap setelah sesi terakhir, termasuk kasus satu modulnya sudah lulus sebelum sesi itu → boleh; seluruh langkah sudah lengkap sebelum sesi terakhir → tidak boleh (dan langkah itu bukan kandidat `reason`); path tamat → boleh; path tanpa modul.
2. **Integration:**
   - isi modul terkunci tidak terkirim;
   - `start` dan `attempts` pada modul terkunci → 403 `module_locked`;
   - `start` dua kali tidak menurunkan progres;
   - percobaan gagal tanpa `review`; percobaan lulus → `review`, modul berikutnya terbuka, dan `next_module_id` benar;
   - kelulusan kedua tidak mengubah `completed_at`;
   - riwayat percobaan tanpa kunci;
   - `/check` → 404;
   - hosea → `POST /sessions` 403 `retake_locked`; setelah modul 2–4 diluluskan lewat API → `retake.allowed` dan sesi baru ber-`kind: 'checkpoint'`;
   - nadia: diagnostik pertama boleh; setelah selesai → 403 `retake_locked`.
3. **Konten:**
   - kunci setiap kuis dikunci oleh test (judul modul → daftar kunci);
   - setiap modul punya 3–5 soal dengan `explanation` tidak kosong;
   - `order` berurutan 1..n per path;
   - rantai `requires` utuh: tepat satu modul `null` per path dan setiap modul lain menunjuk ke `order - 1`;
   - setiap `topic` modul beginner ada di langkah path.

## Kriteria selesai

- `npm test` hijau. `npm run build` di client sukses.
- Alur manual di aplikasi berjalan:
  - hosea membuka modul 2, gagal kuis, lalu lulus, dan modul 3 terbuka;
  - setelah modul 4 lulus, tombol asesmen ulang aktif;
  - nadia menyelesaikan diagnostik, lalu tombol asesmen ulang terkunci dengan alasannya.
- Isi materi path beginner lengkap (9 modul) dan sudah lewat review isi.
- README dan `docs/DECISIONS.md` diperbarui (A4, A5, dan koleksi `quiz_attempts`).

## Dampak ke dokumen skripsi

- **BAB 3:**
  - koleksi baru `quiz_attempts`;
  - `modules.requires` menggantikan `unlock_rule` di tabel C3;
  - `progress.completed_at` dan arti `percent_complete`;
  - fungsi perangkat lunak "Mengelola penguncian modul" (A5);
  - use case "Mengulang asesmen" beserta aturannya (A4);
  - activity diagram alur kuis modul (lulus/gagal/ulang).
- **BAB 4:** pengujian boundary value di batas 70%; data jumlah percobaan sampai lulus bisa diambil dari `quiz_attempts`.
