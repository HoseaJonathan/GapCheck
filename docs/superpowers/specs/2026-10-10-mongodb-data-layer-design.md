# Sub-proyek 1 — Lapisan data MongoDB

Tanggal: 2026-10-10
Status: disetujui dalam sesi brainstorming, menunggu review spec tertulis

## Konteks

Bagian belajar Gap Check (learning path, materi + kuis modul, gating + progres,
latihan coding di modul) akan dibuat benar-benar berfungsi dan diberi tampilan
sesuai `docs/DESIGN.md`. Pekerjaan itu dipecah menjadi empat sub-proyek yang
dikerjakan berurutan, masing-masing dengan spec, rencana, dan implementasi sendiri:

| # | Sub-proyek | Bergantung pada |
|---|---|---|
| **1** | **Lapisan data MongoDB (dokumen ini)** | — |
| 2 | Fitur belajar inti: penugasan path dari level, materi, kuis multi-soal (lulus 70%), gating di server, progres per user, aturan retake (A4) | 1 |
| 3 | Latihan coding di modul lewat Judge0, menggantikan `fakeJudge0()` | 1, 2 |
| 4 | UI sesuai `docs/DESIGN.md` | 1–3 |

### Tujuan sub-proyek 1

Semua data pindah dari `server/src/data/seed.js` (in-memory) ke MongoDB lewat
Mongoose. Angka pada layar Result, Progress, dan Overview **dihitung** dari
submission yang tersimpan, bukan diketik. Setelah sub-proyek ini selesai, aplikasi
benar-benar MERN, dan sub-proyek 2 bisa membaca akurasi per topik yang asli.

### Keputusan yang sudah diambil

- MongoDB dijalankan lewat Docker Compose (`mongo:7`).
- Semua koleksi dimigrasi sekaligus.
- Data turunan (result, akurasi per topik, Bloom, narasi) dihitung dari submissions + questions. Bank soal dilengkapi menjadi 15 soal asli.
- Daily Puzzle **ditunda**: tetap statis, tanpa koleksi baru, sampai keputusan A6 diambil tim.
- Pendekatan arsitektur: **model Mongoose → service tipis → route**. Perhitungan tetap berupa fungsi murni tanpa akses database.

### Di luar scope

- Isi modul selain 4 modul yang sudah ada, kuis multi-soal, dan gating yang ditegakkan di server (sub-proyek 2).
- Aturan kapan retake boleh dilakukan (sub-proyek 2).
- Judge0 sungguhan. `fakeJudge0()` tetap dipakai (sub-proyek 3).
- Perubahan visual apa pun (sub-proyek 4). Perubahan client di sub-proyek ini terbatas pada yang diperlukan supaya alur data berjalan.

## 1. Koleksi dan skema

Semua `_id` bertipe ObjectId, dan id string lama (`'m04'`, `'easy-1'`, `'u1'`)
dihapus. Nama field mengikuti tabel C1–C5 di `docs/DECISIONS.md`.

| Koleksi | Field | Catatan |
|---|---|---|
| `users` | `username`, `email` (unik), `password_hash`, `level` (`null` \| `new` \| `beginner` \| `intermediate`), `diagnostic_status` (Boolean), `profile.{display_name, initials}`, `statistics.{streak_days, bonus_points}`, `created_at`, `updated_at` | `acceptance_rate` tidak disimpan dan dihitung dari submissions. `diagnostic_status` diset `true` saat sesi diagnostik pertama selesai. |
| `questions` | `slug` (unik), `title`, `difficulty` (`easy` \| `medium` \| `hard`), `points`, `type` (`code` \| `mcq`), `bloom_level`, `tags` (wajib, minimal 1), `description`, `requirements[]`, `sample.{request, expected}`, `base_code`, `options[{key, text}]`, `correct_answer` (`select: false`), `test_cases[{name, stdin, expected_output, is_hidden}]`, `is_published` | `weight_score` dihapus dan digantikan `points` (C1). |
| `assessment_sessions` | `user_id`, `kind` (`diagnostic` \| `checkpoint`), `status` (`in_progress` \| `finished`), `started_at`, `finished_at`, `elapsed_seconds`, `question_ids[]`, `result.{earned, possible, percentage, level}` | `result` adalah snapshot saat finish, sehingga riwayat tidak berubah kalau bank soal diedit. |
| `submissions` | `user_id`, `question_id`, `session_id` (opsional), `submitted_code`, `answer`, `language_id`, `judge0_token`, `verdict`, `runtime_ms`, `memory_kb`, `passed_cases`, `total_cases`, `cases[]`, `points_earned`, `submitted_at` | `session_id` boleh kosong untuk latihan modul (sub-proyek 3). `question_title` dan `difficulty` tidak diduplikasi; nilainya diambil lewat populate. `verdict` ∈ `Accepted`, `Wrong Answer`, `Runtime Error`, `Time Limit Exceeded`. |
| `learning_paths` | `level`, `title`, `description`, `steps[{title, topic, reason}]` | `module_count` per langkah dihitung dari modul yang ada, bukan disimpan. |
| `modules` | `path_id`, `order`, `title`, `topic`, `bloom_level`, `body[]`, `quiz[]`, `estimated_minutes`, `unlock_rule`, `unlock_hint` | `progress_percent` dan `flagged_by_diagnostic` dikeluarkan dari dokumen modul. Progres pindah ke `progress`, dan flag dihitung dari topik terlemah. `quiz[].correct_answer` tidak pernah dikirim ke klien. |
| `progress` | `user_id`, `module_id`, `percent_complete`, `state` (`locked` \| `in_progress` \| `completed`), `last_position`, `updated_at` | Indeks unik `(user_id, module_id)`. |

Indeks tambahan: `submissions (user_id, submitted_at)`,
`submissions (session_id, question_id)`, `assessment_sessions (user_id, started_at)`.

### Dampak yang terlihat

- Jumlah modul di Overview turun dari 22 menjadi 4, karena angkanya dihitung dari modul yang benar-benar ada. Angka ini naik lagi saat isi modul ditulis di sub-proyek 2.
- `ModuleScreen.jsx` tidak lagi meng-hardcode `m04`, `m02`, dan `m07`. Tombol "sebelumnya/berikutnya" dihitung dari daftar modul (`siblings`), dan `/modules` tanpa id diarahkan ke modul *next up* dari `/overview`.

## 2. Alur sesi asesmen

| Endpoint | Perilaku |
|---|---|
| `POST /sessions` `{ kind }` | Membuat sesi `in_progress` dengan `question_ids` berisi semua soal published, diurutkan easy → medium → hard. Kalau user masih punya sesi `in_progress` yang belum kedaluwarsa, sesi itu dikembalikan (resume). Respons: `{ session, questions, remaining_seconds }`. `questions` berupa versi aman (tanpa `correct_answer`, test case tersembunyi hanya dihitung jumlahnya). `remaining_seconds` dihitung server dari `started_at`. `kind` yang tidak valid → 400. |
| `POST /submit` (dan alias `POST /submissions`) `{ session_id, question_id, submitted_code \| answer }` | `session_id` wajib. Sesi bukan milik user → 403 `forbidden_session`. Sesi sudah `finished` → 409 `session_finished`. Waktu habis → sesi di-finish otomatis, lalu 409 `session_expired`. Soal tidak termasuk sesi → 400 `question_not_in_session`. Submit boleh berkali-kali per soal. |
| `POST /sessions/:id/finish` | Mengambil submission terbaik per soal (poin tertinggi), menjalankan `classify()` atas `question_ids`, lalu menyimpan `result`, `finished_at`, dan `elapsed_seconds`. Setelah itu memperbarui `users.level`, dan `diagnostic_status = true` kalau `kind === 'diagnostic'`. Finish kedua → 409 `session_finished`. |
| `GET /result` | Sesi `finished` terakhir milik user beserta perhitungan turunan (Bagian 3). Kalau belum ada sesi, respons berisi `{ result: null }`. Replay sesi kanonik dihapus. |
| `GET /questions?difficulty=` | Tidak berubah: kontrak dan perilaku validasinya tetap sama. |

**Aturan penilaian:** untuk setiap soal, yang dihitung adalah submission dengan
`points_earned` tertinggi di dalam sesi itu. Aturan ini perlu ditambahkan ke
narasi penilaian BAB 3.

**Waktu habis (A7):** sesi yang melewati `started_at + SESSION_DURATION_SECONDS`
di-finish secara lazy, yaitu pada request berikutnya yang menyentuh sesi
tersebut (`POST /sessions`, `POST /submit`, `POST /sessions/:id/finish`). Tidak
ada cron.

**Retake:** sesi baru boleh dimulai kapan saja asalkan sesi sebelumnya sudah
`finished`. Aturan pembatasannya ditentukan di sub-proyek 2.

**Perubahan client (`Assessment.jsx`, `api.js`):**
- Layar memulai sesi dengan `POST /sessions`, bukan `GET /questions`.
- Timer memakai `remaining_seconds` dari server.
- Setiap submit membawa `session_id`.
- Ada tombol "Selesai" yang memanggil finish lalu pindah ke `/result`.
- Layar Result menampilkan empty state berisi tautan ke `/assessment` kalau `result` bernilai `null`.

## 3. Perhitungan turunan

Fungsi murni diletakkan di `server/src/analytics.js`. Fungsi-fungsi ini menerima
array biasa, tidak mengimpor Mongoose, dan tidak mengakses database.

| Fungsi | Definisi |
|---|---|
| `bestSubmissions(subs)` | Satu submission per `question_id`, yaitu yang `points_earned`-nya tertinggi. Kalau seri, yang paling awal. |
| `topicAccuracy(questions, best)` | Per tag: `Σ points_earned / Σ points` atas soal sesi yang memiliki tag tersebut. Soal tanpa submission dihitung 0, dan soal dengan beberapa tag dihitung di setiap tag. Hasil berupa `[{ topic, accuracy, earned, possible, question_count, zero_count }]`, diurutkan menurun berdasarkan `accuracy`. |
| `bloomBreakdown(questions, best, level)` | Perhitungannya sama, tetapi per `bloom_level`, untuk keenam level (`remember` … `create`). Rinciannya: (1) `reached = accuracy > 0`; (2) level tanpa soal bernilai `accuracy: null, reached: false`; (3) `evaluate` dan `create` diberi `locked: true, unlock_hint: 'Opens at Intermediate'` kecuali `level === 'intermediate'`. |
| `acceptanceRate(subs)` | Jumlah submission `Accepted` dibagi seluruh submission milik user. Bernilai 0 kalau tidak ada submission. |
| `narrative(topics, score)` | Disusun dari template tetap berbahasa Indonesia. `solid` berisi topik dengan `accuracy ≥ SOLID_TOPIC_THRESHOLD`. `gaps` berisi topik dengan `accuracy < GAP_TOPIC_THRESHOLD`, dengan kalimat yang menyebut `zero_count` dan `question_count`. `summary` menyebut `pointsToNextLevel` dan topik terlemah. |
| `sessionLabels(sessions)` | Label "Diagnostic n" / "Checkpoint n", dengan nomor urut per `kind` berdasarkan `started_at`. |

Konstanta baru di `config.js`: `SOLID_TOPIC_THRESHOLD = 0.75`,
`GAP_TOPIC_THRESHOLD = 0.5`.

**Service yang merakit respons** (`server/src/services/`):

- **`/result`**: berisi `classify()` versi snapshot, `topic_accuracy`, `bloom_levels`, dan `narrative`. Respons juga memuat `learning_path` untuk `level` sesi tersebut, beserta langkah dan `module_count` yang dihitung. Callout pada topik terlemah menautkan modul pertama (urut `order`) yang `topic`-nya sama.
- **`/progress`**: berisi `weighted_score` dari sesi terakhir, `delta_since_first`, `delta_since_previous`, sesi berlabel, `topic_accuracy`, `bloom_levels`, `acceptance_rate`, `modules_completed` / `modules_total` (dari `progress` dan `modules` pada path user), serta 10 submission terakhir (populate `title` dan `difficulty` dari soal). Kalau user belum punya sesi, angka-angka itu bernilai `null` dan daftarnya kosong.
- **`/overview`**: `headline` dan `weighted_score` dari sesi terakhir. Bagian lainnya: (1) `next_up` adalah modul pertama di path user yang `topic`-nya sama dengan topik terlemah dan belum `completed`; kalau tidak ada, modul pertama yang belum `completed`; (2) `in_progress` diambil dari `progress` dengan `state: 'in_progress'`; (3) `path_steps` memakai `module_count` yang dihitung; (4) `puzzle` diambil dari data statis.

Bentuk respons ketiga endpoint ini mempertahankan nama field yang sekarang
dipakai client. Field baru boleh ditambahkan, tetapi field lama tidak diganti
namanya.

## 4. Infrastruktur, konfigurasi, dan seed

- **`docker-compose.yml`** (root): service `mongo` (`mongo:7`, port `27017:27017`, volume bernama `gapcheck-mongo`).
- **`server/.env.example`**: `MONGODB_URI=mongodb://localhost:27017/gapcheck`, `JWT_SECRET`, `PORT`, `CLIENT_ORIGIN`. Variabel dimuat dengan `node --env-file-if-exists=.env` (bawaan Node 22, tanpa `dotenv`). `config.js` membaca `MONGODB_URI` dengan default di atas.
- **`server/src/db.js`**: berisi `connect(uri)` dengan `serverSelectionTimeoutMS: 5000`. Kalau gagal, proses berhenti dengan pesan "MongoDB tidak terjangkau di <uri> — jalankan `docker compose up -d`", dan `disconnect()` dipakai oleh test.
- **`server/src/app.js`** membangun Express app tanpa `listen`. **`server/src/index.js`** memanggil `connect` lalu `listen`.
- **`/health`**: `{ ok, storage: 'mongodb', db: <readyState> }`.
- **Dependency baru:** `mongoose` (runtime), serta `mongodb-memory-server` dan `supertest` (dev).

**Seed (`npm run seed` → `server/src/seed/run.js`)**
Script ini mengosongkan semua koleksi lalu mengisinya ulang, sehingga bisa
dijalankan berulang kali. Kalau `NODE_ENV === 'production'`, script menolak
berjalan. Data seed ada di `server/src/seed/data/`, dan fungsi `seed(db)`
diekspor terpisah supaya bisa dipakai oleh test.

- **15 soal** (5 easy @10, 6 medium @20, 4 hard @30, total 290 poin):
  - Soal `var-let-const`, `dom-query`, `array-utils`, dan `questions-difficulty-filter` dipertahankan.
  - 11 soal baru ditulis dengan isi lengkap. Soal MCQ punya opsi dan kunci. Soal code punya `base_code`, `requirements`, `sample`, dan minimal 4 test case (satu di antaranya tersembunyi).
  - Pembagian tag: tiga soal yang bernilai 0 pada sesi kanonik bertopik `async`, dan soal `questions-difficulty-filter` bertopik `rest-api`.
  - Setiap `bloom_level` dari `remember` sampai `analyze` muncul paling tidak sekali.
- **3 learning path:** `new`, `beginner`, dan `intermediate`, masing-masing dengan langkah, `topic`, dan `reason`. Hanya path `beginner` yang punya modul, yaitu 4 modul yang sudah ada (isi materi m04 dipertahankan).
- **User `hosea@gapcheck.test` / `password123`** (level `beginner`):
  - **Lima sesi `finished`.** Empat sesi pertama (34.2, 41.8, 44.6, 46.5) hanya berupa snapshot `result` tanpa submission. Data ini disebut terus terang sebagai data demo di komentar seed dan README.
  - **Sesi kelima dibuat sebagai sesi sungguhan:** 15 submission dimasukkan lalu diproses lewat fungsi finish yang sama dengan endpoint, sehingga hasilnya 168/290 = 57.93% → `beginner`.
  - **Progres:** m01 `completed` 100, m02 `in_progress` 60.
  - **Statistik:** `streak_days: 7`, `bonus_points: 340`.
- **User `nadia@gapcheck.test` / `password123`:** belum pernah diagnostik (`level: null`, `diagnostic_status: false`).

**Pembersihan:**
- `server/src/data/seed.js` dihapus.
- Data puzzle dipindah ke `server/src/data/puzzle.static.js` dengan komentar bahwa data ini statis sampai keputusan A6 diambil.
- README diperbarui: langkah menjalankan (`docker compose up -d` → `cd server && npm run seed` → `npm run dev`), tabel status fase, dan catatan data demo.

## 5. Error handling dan pengujian

### Error handling

Satu middleware error terpusat menangani semua error dengan bentuk respons
`{ error, reason }`:

| Sumber | Status | `reason` |
|---|---|---|
| Mongoose `ValidationError` | 400 | `validation_failed` (+ `details`) |
| Mongoose `CastError` (id tidak valid) | 404 | `invalid_id` |
| Duplicate key `11000` | 409 | `duplicate` (atau `email_taken` di `/auth/register`) |
| Lainnya | 500 | `internal`. Stack trace hanya ditulis ke log server. |

Aturan lain:
- `GET /me` memakai `requireAuth` dan membaca user dari `req.user.sub`. User yang tidak ditemukan → 401 `unknown_user`. Ini memperbaiki bug saat ini, di mana route tersebut tanpa auth dan selalu mengembalikan `users[0]`.
- Setiap query data milik user difilter dengan `user_id` dari token.
- `correct_answer` dan test case tersembunyi tidak pernah muncul di respons mana pun.

### Pengujian

`npm test` menjalankan `node --test "src/**/*.test.js"`.

**Unit**
- `scoring.test.js`: 9 test yang sudah ada, tanpa perubahan.
- `analytics.test.js`:
  - setiap fungsi di Bagian 3 diuji dengan fixture kanonik 168/290; `async` harus bernilai 0.00 dan menjadi topik terlemah;
  - `bloomBreakdown` mengunci `evaluate`/`create` untuk level beginner dan membukanya untuk intermediate;
  - `sessionLabels` diuji untuk kind campuran;
  - `delta_since_first` = 23.7 dan `delta_since_previous` = 11.4 dari lima sesi seed;
  - `acceptanceRate` bernilai 0 untuk daftar kosong.

**Integration** (`mongodb-memory-server` + `supertest`, database baru yang di-seed untuk setiap file test):

| Area | Kasus |
|---|---|
| Auth | Login benar → 200 + token. Password salah → 401. Tanpa token → 401 `missing_token`. Token rusak → 401 `invalid_token`. `/me` mengembalikan user yang login. |
| `/questions` | Tanpa parameter → semua soal published. `?difficulty=easy` → hanya soal easy. `impossible` → 400. String kosong → 400. Tidak ada `correct_answer` di respons. |
| Sesi | (1) `POST /sessions` dua kali → `_id` sama. (2) Submit seluruh jawaban kanonik lalu finish → 57.93 / beginner. (3) Submit ke sesi milik user lain → 403. (4) Submit setelah `started_at` dimundurkan melewati batas → 409 `session_expired`, dan sesi menjadi `finished`. (5) Finish dua kali → 409. (6) Soal di luar sesi → 400. |
| Result/Progress | Untuk `hosea`, nilai `/result` dan `/progress` cocok dengan fixture. Untuk `nadia`, `/result` → `{ result: null }`. |
| Modul | `/modules/abc` → 404 `invalid_id`. Respons `/modules/:id` tidak mengandung `quiz[].correct_answer`. |

**Verifikasi manual**
1. `docker compose up -d`, lalu `npm run seed`, lalu jalankan server dan client.
2. Login sebagai hosea. Overview, Result, dan Progress harus menampilkan angka hasil perhitungan, dengan grafik lima titik.
3. Login sebagai nadia. Result harus menampilkan empty state. Kerjakan diagnostik sampai selesai, lalu pastikan Result dan Progress terisi.

Catatan: `mongodb-memory-server` mengunduh binary MongoDB (sekitar 70 MB) saat
pertama kali dijalankan.

## Kriteria selesai

- `server/src/data/seed.js` tidak ada lagi, dan tidak ada route yang membaca data in-memory selain puzzle statis.
- `npm test` hijau: unit + integration.
- Alur verifikasi manual di atas berjalan pada Docker Compose.
- README menjelaskan cara menjalankan aplikasi dan menyebut data demo secara terus terang.
- Tidak ada `correct_answer` atau test case tersembunyi di respons API mana pun.

## Dampak ke dokumen skripsi

- BAB 3: aturan "submission dengan poin tertinggi yang dihitung"; koleksi `assessment_sessions` dan `progress` (C4, C5); aturan waktu habis (A7, auto-finish).
- `docs/DECISIONS.md` bagian D: status "Nama koleksi dan field sesuai tabel basis data" diperbarui setelah tabel C masuk dokumen.
