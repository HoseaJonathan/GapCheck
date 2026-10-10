# Lapisan Data MongoDB — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memindahkan seluruh data Gap Check dari `server/src/data/seed.js` (in-memory) ke MongoDB lewat Mongoose, dan menghitung angka Result/Progress/Overview dari submission yang tersimpan.

**Architecture:** Model Mongoose (`src/models/`) → service tipis (`src/services/`) → route Express (`src/routes/`). Perhitungan tetap berupa fungsi murni (`scoring.js`, `analytics.js`) tanpa akses database. Express app dibangun di `app.js` tanpa `listen`. `index.js` membuka koneksi Mongo lalu menjalankan `listen`.

**Tech Stack:** Node 22 (ESM), Express 5, Mongoose 8, MongoDB 7 (Docker Compose), `node:test`, `supertest`, `mongodb-memory-server`, React 19 + Vite (client).

**Spec:** `docs/superpowers/specs/2026-10-10-mongodb-data-layer-design.md`. Baca spec ini lebih dulu. Plan hanya mencatat keputusan, sedangkan alasannya ada di spec.

## Global Constraints

- Semua `_id` bertipe ObjectId; id string lama (`'m04'`, `'easy-1'`, `'u1'`) tidak boleh muncul di kode server maupun client.
- Nama koleksi dan field persis seperti spec Bagian 1, mengikuti tabel C1–C5 di `docs/DECISIONS.md`.
- `correct_answer` (soal maupun `modules.quiz[]`) dan test case dengan `is_hidden: true` tidak pernah muncul di respons API mana pun.
- Bentuk respons error selalu `{ error, reason }`.
- Konstanta: `SESSION_DURATION_SECONDS = 3600`, `EXECUTION_CEILING_MS = 5000`, `SOLID_TOPIC_THRESHOLD = 0.75`, `GAP_TOPIC_THRESHOLD = 0.5`.
- Variabel lingkungan dimuat dengan `node --env-file-if-exists=.env`. Jangan menambahkan `dotenv`.
- Nama field respons `/result`, `/progress`, dan `/overview` yang sudah dipakai client tidak boleh diganti. Field baru boleh ditambahkan.
- `scoring.js` dan 9 test-nya tidak diubah.
- Puzzle tetap statis (`src/data/puzzle.static.js`), tanpa koleksi.
- Bahasa teks yang tampil ke user: Indonesia. Kode dan identifier: Inggris, mengikuti gaya file yang ada (komentar menjelaskan *kenapa*, bukan *apa*).
- Setiap commit diakhiri dengan `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Double-click "mulai asesmen"**: dua `POST /sessions` yang datang bersamaan harus menghasilkan satu sesi `in_progress`, bukan dua. Test ada di Task 5.
2. **`session_id` atau `:id` yang bukan ObjectId** (`"abc"`) harus dibalas 404 `invalid_id`, bukan 500. Test ada di Task 5 (submit) dan Task 7 (modules).
3. **Body login kosong atau password bukan string** harus dibalas 401, bukan 500. Test ada di Task 4.
4. **User yang belum pernah diagnostik (nadia)** yang membuka `/overview` dan `/progress` harus mendapat respons berisi `null` atau daftar kosong, tidak crash. Test ada di Task 7.
5. **Soal di-unpublish saat sesi sedang berjalan**: finish tetap menilai soal itu, karena soal diambil berdasarkan `question_ids` tanpa filter `is_published`. Test ada di Task 5.

---

## File Structure

```
docker-compose.yml                       mongo:7 + volume gapcheck-mongo
server/.env.example                      MONGODB_URI, JWT_SECRET, PORT, CLIENT_ORIGIN
server/package.json                      scripts dev/start/seed/test, deps baru
server/src/config.js                     + MONGODB_URI, SOLID/GAP thresholds
server/src/db.js                         connect(uri), disconnect()
server/src/app.js                        createApp() — express tanpa listen
server/src/index.js                      connect → listen
server/src/errors.js                     class HttpError
server/src/middleware/errors.js          errorHandler (terpusat)
server/src/models/{User,Question,AssessmentSession,Submission,LearningPath,Module,Progress}.js
server/src/analytics.js                  fungsi murni Bagian 3
server/src/analytics.test.js
server/src/judge/fakeJudge0.js           dipindah dari routes/submissions.js
server/src/services/questions.js         toSafeQuestion, listPublished
server/src/services/sessions.js          startSession, recordSubmission, finishSession, expireIfDue
server/src/services/analysis.js          loadLatestAnalysis, pickModuleForTopic
server/src/services/views.js             getResult, getProgress, getOverview
server/src/services/modules.js           getModule, checkQuizAnswer
server/src/routes/{auth,questions,sessions,submissions,result,progress,modules,puzzle}.js
server/src/data/puzzle.static.js
server/src/seed/data/{questions,paths,modules,users}.js
server/src/seed/seed.js                  seed() — dipakai run.js dan test
server/src/seed/run.js                   CLI npm run seed
server/src/test/helpers.js               setupTestDb(), login()
server/src/test/{health,models,auth,questions,sessions,seed,views,modules}.test.js
client/src/api.js, screens/{Assessment,Result,Progress,Overview,ModuleScreen}.jsx
README.md, docs/DECISIONS.md
```

Dihapus: `server/src/data/seed.js`.

---

### Task 1: Infrastruktur — Docker, koneksi, app factory, error handler, test harness

**Files:**
- Create: `docker-compose.yml`, `server/.env.example`, `server/src/db.js`, `server/src/app.js`, `server/src/errors.js`, `server/src/middleware/errors.js`, `server/src/test/helpers.js`, `server/src/test/health.test.js`
- Modify: `server/src/index.js`, `server/src/config.js`, `server/package.json`

**Interfaces:**
- Produces:
  - `connect(uri: string): Promise<void>` dan `disconnect(): Promise<void>` (`db.js`). `connect` memakai `serverSelectionTimeoutMS: 5000`. Kalau gagal, fungsi melempar `Error` dengan pesan `MongoDB tidak terjangkau di ${uri} — jalankan \`docker compose up -d\``. `index.js` menangkapnya, mencetak pesan itu, lalu `process.exit(1)`.
  - `createApp(): express.Application` (`app.js`): memasang helmet, cors, json, `/health`, semua router, 404 handler, lalu `errorHandler` sebagai middleware terakhir.
  - `class HttpError extends Error { constructor(status: number, reason: string, extra?: object) }` (`errors.js`).
  - `errorHandler(err, req, res, next)`, dengan pemetaan sebagai berikut:

    | Error | Status | Body |
    |---|---|---|
    | `HttpError` | `status` | `{ error: <status text>, reason, ...extra }` |
    | `ValidationError` | 400 | `validation_failed` + `details` |
    | `CastError` | 404 | `invalid_id` |
    | `code === 11000` | 409 | `duplicate` |
    | lainnya | 500 | `internal`; stack hanya di `console.error` |
  - `setupTestDb(fixture?: () => Promise<void>): { app }` (`test/helpers.js`): mendaftarkan hook `before`/`after` dari `node:test`. Hook `before` menyalakan `MongoMemoryServer`, menjalankan `connect`, lalu `fixture()` kalau diberikan. Hook `after` menjalankan `disconnect` dan menghentikan server. Mulai Task 6, file test yang membutuhkan data memanggil `setupTestDb(seed)`.
  - `login(app, email: string, password = 'password123'): Promise<string>` mengembalikan token.
  - Konstanta config: `MONGODB_URI` (default `mongodb://localhost:27017/gapcheck`), `SOLID_TOPIC_THRESHOLD = 0.75`, `GAP_TOPIC_THRESHOLD = 0.5`.

- [ ] **Step 1: Pasang dependency dan script**

  Run (di `server/`): `npm install mongoose@8 && npm install -D mongodb-memory-server supertest`

  Script di `package.json`:
  - `"dev": "node --watch --env-file-if-exists=.env src/index.js"`
  - `"start": "node --env-file-if-exists=.env src/index.js"`
  - `"seed": "node --env-file-if-exists=.env src/seed/run.js"`
  - `"test": "node --test --test-concurrency=1 \"src/**/*.test.js\""`

  Ubah juga `description` menjadi `"Gap Check API — Express + MongoDB"`.

- [ ] **Step 2: Buat `docker-compose.yml` dan `server/.env.example`**

  `docker-compose.yml` berisi service `mongo` (`image: mongo:7`, `ports: ["27017:27017"]`, `volumes: [gapcheck-mongo:/data/db]`) dan volume `gapcheck-mongo`. Isi `.env.example`:

  ```
  MONGODB_URI=mongodb://localhost:27017/gapcheck
  JWT_SECRET=dev-only-change-me
  PORT=4000
  CLIENT_ORIGIN=http://localhost:5173
  ```

- [ ] **Step 3: Tulis test yang gagal — `test/health.test.js`**

  ```js
  const { app } = setupTestDb();
  test('GET /health reports mongodb storage and a connected db', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ok: true, storage: 'mongodb', db: 1 });
  });
  test('unknown route -> 404 with path', async () => {
    const res = await request(app).get('/nope');
    assert.equal(res.status, 404);
    assert.equal(res.body.path, '/nope');
  });
  ```

- [ ] **Step 4: Jalankan test dan pastikan gagal**

  Run: `npm test`
  Expected: `health.test.js` FAIL (modul `app.js` / `test/helpers.js` belum ada). Run pertama akan mengunduh binary MongoDB.

- [ ] **Step 5: Implementasikan `db.js`, `errors.js`, `middleware/errors.js`, `app.js`, `test/helpers.js`; pangkas `index.js` menjadi connect + listen**

  `/health` mengembalikan `{ ok: true, storage: 'mongodb', db: mongoose.connection.readyState }`. Sampai Task 4–8 selesai, router lama tetap dipasang apa adanya, dan pengisian `password_hash` di `index.js` tetap dipertahankan untuk sementara.

- [ ] **Step 6: Jalankan test dan pastikan lolos**

  Run: `npm test`
  Expected: 9 test scoring + 2 test health PASS.

- [ ] **Step 7: Verifikasi koneksi nyata**

  Run (di root): `docker compose up -d`, lalu di `server/`: `cp .env.example .env && npm run dev`.

  Expected: server mencetak baris "API on http://localhost:4000" dan `curl localhost:4000/health` → `"db":1`. Hentikan Mongo (`docker compose stop mongo`) lalu jalankan ulang `npm run dev`; expected: pesan "MongoDB tidak terjangkau di …" dan exit code 1. Setelah itu nyalakan Mongo lagi.

- [ ] **Step 8: Commit**

  ```bash
  git add docker-compose.yml server/.env.example server/package.json server/package-lock.json server/src/db.js server/src/app.js server/src/index.js server/src/config.js server/src/errors.js server/src/middleware/errors.js server/src/test
  git commit -m "feat(server): koneksi MongoDB, app factory, error handler terpusat"
  ```

---

### Task 2: Model Mongoose

**Files:**
- Create: `server/src/models/User.js`, `Question.js`, `AssessmentSession.js`, `Submission.js`, `LearningPath.js`, `Module.js`, `Progress.js`, `server/src/test/models.test.js`

**Interfaces:**
- Produces: default export model dengan nama `User`, `Question`, `AssessmentSession`, `Submission`, `LearningPath`, `Module`, `Progress`. Nama koleksinya: `users`, `questions`, `assessment_sessions`, `submissions`, `learning_paths`, `modules`, `progress`. Koleksi ditetapkan eksplisit lewat opsi `collection`, karena pluralisasi Mongoose akan menghasilkan `progresses` dan `assessmentsessions`. Field mengikuti spec Bagian 1. Timestamps:
  - `users`: `{ createdAt: 'created_at', updatedAt: 'updated_at' }`
  - `progress`: `{ createdAt: false, updatedAt: 'updated_at' }`
- Aturan skema yang dikunci:
  - `Question.tags`: wajib, validator `v.length >= 1`.
  - `Question.correct_answer`: `select: false`.
  - `Module.quiz[].correct_answer`: `select: false`.
  - `Question.slug` dan `User.email`: `unique: true`.
  - Enum: `difficulty`, `type`, `kind`, `status`, `verdict`, `state`, `User.level` (`null`, `new`, `beginner`, `intermediate`).
  - Indeks:
    - `Progress (user_id, module_id)` unik
    - `Submission (user_id, submitted_at)`
    - `Submission (session_id, question_id)`
    - `AssessmentSession (user_id, started_at)`
    - `AssessmentSession { user_id: 1 }` unik dengan `partialFilterExpression: { status: 'in_progress' }`. Indeks ini menegakkan butir Review Focus 1.

- [ ] **Step 1: Tulis test yang gagal — `test/models.test.js`** (pakai `setupTestDb()`; untuk task ini helper boleh berjalan tanpa seed)

  ```js
  test('question without tags is rejected', async () => {
    await assert.rejects(Question.create({ ...validQuestion, tags: [] }), { name: 'ValidationError' });
  });
  test('correct_answer is not selected by default', async () => {
    const q = await Question.create(validMcq);
    const read = await Question.findById(q._id).lean();
    assert.equal('correct_answer' in read, false);
    const withKey = await Question.findById(q._id).select('+correct_answer').lean();
    assert.equal(withKey.correct_answer, 'b');
  });
  test('duplicate email -> code 11000', async () => {
    await User.init();
    await User.create(validUser);
    await assert.rejects(User.create({ ...validUser, username: 'other' }), { code: 11000 });
  });
  test('only one in_progress session per user', async () => {
    await AssessmentSession.init();
    const base = { user_id: uid, kind: 'diagnostic', status: 'in_progress', started_at: new Date(), question_ids: [] };
    await AssessmentSession.create(base);
    await assert.rejects(AssessmentSession.create(base), { code: 11000 });
    await AssessmentSession.create({ ...base, status: 'finished' }); // finished tidak terkena batasan
  });
  test('progress (user_id, module_id) is unique', async () => { /* pola sama, code 11000 */ });
  test('collection names match BAB 3', () => {
    assert.equal(AssessmentSession.collection.name, 'assessment_sessions');
    assert.equal(Progress.collection.name, 'progress');
    assert.equal(LearningPath.collection.name, 'learning_paths');
  });
  ```

  `validQuestion`, `validMcq`, dan `validUser` adalah fixture kecil di dalam file test.

- [ ] **Step 2: Jalankan dan pastikan gagal**

  Run: `npm test`
  Expected: `models.test.js` FAIL (modul model belum ada).

- [ ] **Step 3: Implementasikan ketujuh model**

- [ ] **Step 4: Jalankan dan pastikan lolos**

  Run: `npm test`
  Expected: semua PASS.

- [ ] **Step 5: Commit**

  ```bash
  git commit -m "feat(server): model Mongoose sesuai tabel C1–C5"
  ```

---

### Task 3: Fungsi analitik murni

**Files:**
- Create: `server/src/analytics.js`, `server/src/analytics.test.js`

**Interfaces:**
- Consumes: `scoreSubmission` dari `scoring.js`; konstanta threshold dari `config.js`.
- Produces (semuanya murni; argumen berupa array plain object dengan `_id` yang bisa di-`String()`):
  - `bestSubmissions(subs): Submission[]`: satu per `question_id`, yaitu yang `points_earned`-nya tertinggi. Kalau seri, yang `submitted_at`-nya paling awal.
  - `topicAccuracy(questions, best): Array<{ topic, accuracy, earned, possible, question_count, zero_count }>`. Nilai `accuracy` dibulatkan 2 desimal. Diurutkan menurun berdasarkan `accuracy`; kalau seri, berdasarkan `topic` secara alfabetis. `zero_count` adalah jumlah soal dengan perolehan 0. Poin per soal memakai `best.points_earned`; soal tanpa submission bernilai 0.
  - `bloomBreakdown(questions, best, level): Array<{ level, accuracy, reached, locked?, unlock_hint? }>`. Hasilnya selalu 6 entri berurutan: `remember`, `understand`, `apply`, `analyze`, `evaluate`, `create`.
  - `acceptanceRate(subs): number`, dibulatkan 2 desimal.
  - `narrative(topics, score): { solid: string[], gaps: string[], summary: string }`. `score` adalah keluaran `classify()`.
  - `sessionLabels(sessions): Array<session & { label }>`. Sesi diurutkan berdasarkan `started_at`, lalu diberi label `Diagnostic n` / `Checkpoint n`.
  - `scoreDeltas(sessions): { delta_since_first, delta_since_previous }`. Dihitung dari `result.percentage` sesi yang sudah urut, dibulatkan 1 desimal. Bernilai `null` kalau sesi kurang dari 2.

**Template narasi (copy pasti):**
- solid: `` `Topik ${topic} sudah kokoh — akurasi ${pct}%.` ``
- gaps: `` `Topik ${topic} masih menahan skor — ${question_count - zero_count} dari ${question_count} soal mendapat poin.` ``
- summary, kalau `pointsToNextLevel !== null`: `` `Kamu berada ${pointsToNextLevel} poin dari ${NEXT_LEVEL_LABEL[level]}. Topik terlemah kamu saat ini adalah ${weakest.topic}.` ``, dengan `NEXT_LEVEL_LABEL = { new: 'Beginner', beginner: 'Intermediate' }`.
- summary untuk intermediate: `` `Kamu sudah di level Intermediate. Topik terlemah kamu saat ini adalah ${weakest.topic}.` ``

`pct` = `Math.round(accuracy * 100)`.

- [ ] **Step 1: Tulis test yang gagal — `analytics.test.js`**

  Fixture-nya adalah 15 soal kanonik dengan tag dan Bloom persis seperti tabel di Task 6, ditambah satu submission per soal sesuai kolom "Submission kanonik". Fixture didefinisikan sekali di file ini.

  ```js
  test('topicAccuracy on canonical fixture', () => {
    const t = topicAccuracy(questions, bestSubmissions(subs));
    assert.deepEqual(t.at(-1), { topic: 'async', accuracy: 0, earned: 0, possible: 80, question_count: 3, zero_count: 3 });
    assert.deepEqual(t.find((x) => x.topic === 'javascript'), { topic: 'javascript', accuracy: 0.88, earned: 88, possible: 100, question_count: 6, zero_count: 0 });
    assert.equal(t.find((x) => x.topic === 'rest-api').accuracy, 0.4);
    assert.equal(t.find((x) => x.topic === 'express').accuracy, 0.25);
    assert.equal(t[0].accuracy, 1);
  });
  test('bestSubmissions keeps the highest points per question', () => {
    const b = bestSubmissions([
      { question_id: 'q', points_earned: 8, submitted_at: '2026-01-01T00:00:01Z' },
      { question_id: 'q', points_earned: 20, submitted_at: '2026-01-01T00:00:02Z' },
      { question_id: 'q', points_earned: 20, submitted_at: '2026-01-01T00:00:03Z' },
    ]);
    assert.equal(b.length, 1);
    assert.equal(b[0].submitted_at, '2026-01-01T00:00:02Z');
  });
  test('bloomBreakdown on canonical fixture, beginner', () => {
    const b = bloomBreakdown(questions, bestSubmissions(subs), 'beginner');
    assert.deepEqual(b.map((x) => x.level), ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']);
    assert.deepEqual(b.slice(0, 4).map((x) => [x.accuracy, x.reached]), [[1, true], [0.85, true], [0.4, true], [0.33, true]]);
    assert.equal(b[4].locked, true);
    assert.equal(b[4].unlock_hint, 'Opens at Intermediate');
  });
  test('bloomBreakdown unlocks evaluate/create at intermediate; empty level -> null', () => {
    const b = bloomBreakdown([], [], 'intermediate');
    assert.equal(b[5].locked, undefined);
    assert.deepEqual([b[0].accuracy, b[0].reached], [null, false]);
  });
  test('acceptanceRate', () => {
    assert.equal(acceptanceRate([]), 0);
    assert.equal(acceptanceRate(subs), 0.67); // 10 dari 15 Accepted
  });
  test('narrative names async as the gap and the distance to Intermediate', () => {
    const n = narrative(topicAccuracy(questions, bestSubmissions(subs)), classify(subs, questions));
    assert.ok(n.gaps.includes('Topik async masih menahan skor — 0 dari 3 soal mendapat poin.'));
    assert.ok(n.solid.includes('Topik dom sudah kokoh — akurasi 100%.'));
    assert.equal(n.summary, 'Kamu berada 13.1 poin dari Intermediate. Topik terlemah kamu saat ini adalah async.');
  });
  test('sessionLabels and scoreDeltas on the five seeded sessions', () => {
    // kinds: diagnostic, checkpoint, checkpoint, diagnostic, diagnostic; % 34.2, 41.8, 44.6, 46.5, 57.93
    assert.deepEqual(sessionLabels(five).map((s) => s.label), ['Diagnostic 1', 'Checkpoint 1', 'Checkpoint 2', 'Diagnostic 2', 'Diagnostic 3']);
    assert.deepEqual(scoreDeltas(five), { delta_since_first: 23.7, delta_since_previous: 11.4 });
    assert.deepEqual(scoreDeltas(five.slice(0, 1)), { delta_since_first: null, delta_since_previous: null });
  });
  ```

  Catatan: pada fixture ini `subs` sudah berisi tepat satu submission per soal, sehingga `classify(subs, questions)` boleh dipakai langsung.

- [ ] **Step 2: Jalankan dan pastikan gagal**

  Run: `npm test`
  Expected: `analytics.test.js` FAIL (modul belum ada).

- [ ] **Step 3: Implementasikan `analytics.js`**

- [ ] **Step 4: Jalankan dan pastikan lolos**

  Run: `npm test`
  Expected: semua PASS.

- [ ] **Step 5: Commit**

  ```bash
  git commit -m "feat(server): fungsi analitik murni (topik, Bloom, narasi, delta)"
  ```

---

### Task 4: Auth dan bank soal di atas MongoDB

**Files:**
- Create: `server/src/services/questions.js`, `server/src/test/auth.test.js`, `server/src/test/questions.test.js`
- Modify: `server/src/routes/auth.js`, `server/src/routes/questions.js`, `server/src/middleware/auth.js` (tidak berubah perilakunya, hanya dicek), `server/src/index.js` (hapus pengisian `password_hash`)

**Interfaces:**
- Consumes: `User`, `Question` (Task 2); `setupTestDb`, `login` (Task 1).
- Produces:
  - `toSafeQuestion(q): object`. Menghapus `correct_answer` dan `test_cases` yang `is_hidden`, lalu menambahkan `hidden_case_count`. Perilakunya sama dengan versi di `routes/questions.js` sekarang, dan fungsi ini juga dipakai oleh Task 5.
  - `listPublished(difficulty?: string): Promise<object[]>`. Diurutkan berdasarkan `difficulty` (easy → medium → hard), lalu `_id`.
  - JWT `sub` = `String(user._id)`.
  - `GET /me` memakai `requireAuth`. Kalau user tidak ditemukan → `HttpError(401, 'unknown_user')`.
  - Register: `email_taken` dibalas 409 lewat pengecekan `code 11000`.
  - Login dengan body kosong atau `password` bukan string → 401 `bad_credentials`.

Sampai Task 6 selesai, test di task ini mengisi fixture sendiri lewat model: user hosea (bcrypt `password123`), user kedua, dan 4 soal (1 hidden case pada soal code).

- [ ] **Step 1: Tulis test yang gagal**

  `auth.test.js`:
  - login benar → 200 dengan `token` dan `user.email`;
  - password salah → 401 `bad_credentials`;
  - `{}` → 401 (bukan 500);
  - `{ email: 'hosea@gapcheck.test', password: 123 }` → 401;
  - `/me` tanpa token → 401 `missing_token`;
  - token `abc` → 401 `invalid_token`;
  - `/me` dengan token hosea → `email === 'hosea@gapcheck.test'`, tanpa `password_hash`;
  - token yang valid untuk ObjectId yang tidak ada → 401 `unknown_user`;
  - register email yang sudah ada → 409 `email_taken`;
  - register baru → 201 `user_id`.

  `questions.test.js`:
  - tanpa param → semua soal published;
  - `?difficulty=easy` → semua `difficulty === 'easy'`;
  - `impossible` → 400 `invalid_difficulty` + `allowed`;
  - `?difficulty=` → 400;
  - tidak ada objek di `questions` yang punya `correct_answer`, dan tidak ada `test_cases[].is_hidden === true`;
  - `hidden_case_count === 1` pada soal code fixture.

- [ ] **Step 2: Jalankan dan pastikan gagal**

  Run: `npm test`
  Expected: test baru FAIL (route masih membaca `seed.js`).

- [ ] **Step 3: Implementasikan `services/questions.js`; tulis ulang `routes/auth.js` dan `routes/questions.js` memakai model**

- [ ] **Step 4: Jalankan dan pastikan lolos**

  Run: `npm test`
  Expected: semua PASS.

- [ ] **Step 5: Commit**

  ```bash
  git commit -m "feat(server): auth dan /questions membaca MongoDB; /me memakai requireAuth"
  ```

---

### Task 5: Sesi asesmen dan submission

**Files:**
- Create: `server/src/judge/fakeJudge0.js`, `server/src/services/sessions.js`, `server/src/routes/sessions.js`, `server/src/test/sessions.test.js`
- Modify: `server/src/routes/submissions.js`, `server/src/app.js`

**Interfaces:**
- Consumes: model (Task 2), `toSafeQuestion` (Task 4), `classify` dan `scoreSubmission` (`scoring.js`), `bestSubmissions` (Task 3), `HttpError` (Task 1).
- Produces (semua fungsi menerima `now: Date = new Date()` di argumen terakhir, supaya test dan seed bisa mengatur waktu):
  - `fakeJudge0(question, code): RunResult`. Dipindah tanpa perubahan perilaku.
  - `startSession(userId, kind, now): Promise<{ session, questions, remaining_seconds }>`:
    - `kind` di luar `diagnostic`/`checkpoint` → `HttpError(400, 'invalid_kind')`.
    - Kalau ada sesi `in_progress`: jalankan `expireIfDue`. Kalau sesi masih aktif, kembalikan sesi itu.
    - Kalau tidak ada, buat sesi baru. `question_ids` berisi semua soal published, urut seperti `listPublished()`.
    - Kalau `create` gagal dengan `11000` (permintaan bersamaan), ambil dan kembalikan sesi `in_progress` yang sudah ada.
    - `remaining_seconds = max(0, SESSION_DURATION_SECONDS − floor((now − started_at)/1000))`.
  - `expireIfDue(session, now): Promise<boolean>`. Kalau `now ≥ started_at + SESSION_DURATION_SECONDS`, fungsi ini memanggil `finishSession(session, startedAt + duration)` dan mengembalikan `true`.
  - `recordSubmission(userId, body, now): Promise<Submission>`. Pemeriksaan dilakukan berurutan:
    1. sesi tidak ditemukan → 404 `unknown_session` (`session_id` yang bukan ObjectId otomatis 404 `invalid_id` lewat CastError);
    2. `user_id` berbeda → 403 `forbidden_session`;
    3. `status === 'finished'` → 409 `session_finished`;
    4. `expireIfDue` → 409 `session_expired`;
    5. soal tidak ada di `question_ids` → 400 `question_not_in_session`.

    Setelah itu: MCQ dinilai dari `answer` (verdict `Accepted`/`Wrong Answer`, `runtime_ms: 0`), sedangkan soal code memakai `fakeJudge0`. Field `points_earned` diisi oleh `scoreSubmission`, lalu submission disimpan. Respons tidak mengandung `submitted_code` milik orang lain atau `correct_answer`.
  - `finishSession(session, now): Promise<AssessmentSession>`:
    - Hanya berjalan kalau status masih `in_progress`; kalau tidak → 409 `session_finished`.
    - Mengambil soal lewat `Question.find({ _id: { $in: question_ids } }).select('+correct_answer')` **tanpa** filter `is_published`.
    - Menjalankan `bestSubmissions` atas submission sesi, lalu `classify`.
    - Menyimpan `result = { earned, possible, percentage, level }`, `finished_at = now`, dan `elapsed_seconds = min(floor((now − started_at)/1000), SESSION_DURATION_SECONDS)`.
    - Memperbarui `User`: `level`, dan `diagnostic_status = true` kalau `kind === 'diagnostic'`.
- Route:
  - `POST /sessions` → 201 untuk sesi baru, 200 untuk resume. Body: `{ session, questions, remaining_seconds }`.
  - `POST /sessions/:id/finish` → 200 dengan sesi.
  - `POST /submit` dan `POST /submissions` → 201 dengan submission.
  - `GET /submissions` → submission milik user saja, terbaru di atas, ditambah `verdicts`.

  Semua route di atas memakai `requireAuth`. Lookup sesi di `finish` dibatasi `user_id`; sesi milik user lain → 403 `forbidden_session`.

- [ ] **Step 1: Tulis test yang gagal — `sessions.test.js`**

  Fixture: user hosea dan nadia, plus 15 soal kanonik (impor data seed dari Task 6 kalau sudah ada; kalau belum, fixture lokal dengan bentuk yang sama).

  - `start twice returns the same session` → `_id` sama; status kedua 200.
  - `concurrent starts create one session` → `Promise.all` dua `POST /sessions`, keduanya membalas `session._id` yang sama, dan `AssessmentSession.countDocuments({ status: 'in_progress', user_id })` bernilai 1.
  - `invalid kind` → 400 `invalid_kind`.
  - `canonical answers then finish` → submit sesuai kolom "Submission kanonik" di Task 6, lalu finish. Hasil: `result` = `{ earned: 168, possible: 290, percentage: 57.93, level: 'beginner' }`, `User.level === 'beginner'`, dan `diagnostic_status === true`. Untuk soal code, submission kanonik dimasukkan langsung lewat `Submission.create` (karena `fakeJudge0` tidak deterministik). Soal MCQ lewat `POST /submit`.
  - `best submission counts` → submit MCQ salah lalu benar pada soal yang sama; poin soal itu di result tetap penuh.
  - `submit to another user's session` → 403 `forbidden_session`.
  - `submit with session_id "abc"` → 404 `invalid_id`.
  - `submit after expiry` → `started_at` dimundurkan 3601 detik lewat `updateOne`, submit → 409 `session_expired`, status sesi di DB `finished`, dan `elapsed_seconds === 3600`.
  - `finish twice` → 409 `session_finished`.
  - `question not in session` → 400 `question_not_in_session`.
  - `unpublished mid-session still scored` → start, set `is_published: false` pada satu soal yang sudah dijawab benar, finish → `result.possible === 290` dan poin soal itu tetap terhitung.
  - `responses never leak keys` → respons `POST /sessions` tidak mengandung `correct_answer` dan tidak ada test case `is_hidden: true`.

- [ ] **Step 2: Jalankan dan pastikan gagal**

  Run: `npm test`
  Expected: `sessions.test.js` FAIL (route `/sessions` belum ada).

- [ ] **Step 3: Implementasikan `fakeJudge0.js`, `services/sessions.js`, `routes/sessions.js`; tulis ulang `routes/submissions.js`; pasang di `app.js`**

- [ ] **Step 4: Jalankan dan pastikan lolos**

  Run: `npm test`
  Expected: semua PASS.

- [ ] **Step 5: Commit**

  ```bash
  git commit -m "feat(server): sesi asesmen tersimpan, submit per sesi, finish + auto-expire"
  ```

---

### Task 6: Seed — 15 soal, path, modul, user demo

**Files:**
- Create: `server/src/seed/data/questions.js`, `paths.js`, `modules.js`, `users.js`, `server/src/seed/seed.js`, `server/src/seed/run.js`, `server/src/test/seed.test.js`
- Modify: `server/src/test/auth.test.js`, `questions.test.js`, `sessions.test.js` (fixture lokal diganti `setupTestDb(seed)`)

**Interfaces:**
- Consumes: model (Task 2), `finishSession` (Task 5), `scoreSubmission`.
- Produces:
  - `seed(): Promise<{ users: { hosea, nadia }, questions: Map<slug, doc> }>`. Fungsi ini mengosongkan semua koleksi, menjalankan `Model.init()` untuk setiap model (supaya indeks terbentuk), lalu menyisipkan data.
  - `run.js`: kalau `NODE_ENV === 'production'`, cetak "Seed ditolak di production" dan `exit(1)`. Kalau tidak: `connect(MONGODB_URI)` → `seed()` → cetak ringkasan jumlah dokumen per koleksi → `disconnect()`.

**Bank soal** (urutan = urutan sesi; ★ = sudah ada di `data/seed.js`, isinya disalin):

| # | slug | diff | type | tags | bloom | Submission kanonik |
|---|---|---|---|---|---|---|
| e1 | `var-let-const` ★ | easy | mcq | javascript | remember | answer benar |
| e2 | `dom-query` ★ | easy | mcq | dom | remember | answer benar |
| e3 | `array-map-return` | easy | mcq | javascript, array-methods | understand | answer benar |
| e4 | `strict-equality` | easy | mcq | javascript | remember | answer benar |
| e5 | `event-listener` | easy | mcq | dom | understand | answer benar |
| m1 | `react-props-render` | medium | mcq | react | understand | answer benar |
| m2 | `filter-active-users` | medium | code | javascript, array-methods | apply | Accepted 4/4 |
| m3 | `express-route-params` | medium | mcq | express, rest-api | understand | answer benar |
| m4 | `toggle-class` | medium | code | dom | apply | Accepted 4/4 |
| m5 | `array-utils` ★ | medium | code | javascript, array-methods | understand | Wrong Answer 2/5 → 8 |
| m6 | `promise-all-prices` | medium | code | async | apply | Wrong Answer 0/4 |
| h1 | `group-by-key` | hard | code | javascript | analyze | Accepted 5/5 |
| h2 | `questions-difficulty-filter` ★ | hard | code | express, rest-api | apply | Time Limit Exceeded 1/5 → 0 |
| h3 | `retry-with-backoff` | hard | code | async | analyze | Wrong Answer 0/5 |
| h4 | `async-error-middleware` | hard | code | async, express | analyze | Runtime Error 0/5 |

Aturan tambahan:
- Tag `syntax` dan `validation` dari soal lama dihapus. Kalau dibiarkan, keduanya akan menjadi topik bernilai 0 dan menyaingi `async` sebagai topik terlemah.
- Isi soal baru ditulis dalam bahasa Indonesia mengikuti contoh soal ★:
  - MCQ: 3–4 opsi, satu kunci;
  - code: `description`, 2–4 `requirements`, `sample`, `base_code` CommonJS (`module.exports`), dan test case sejumlah kolom di atas (tepat satu `is_hidden: true`).
- Semua soal `is_published: true`.

**Learning path**

Ada tiga path, masing-masing berisi 3 langkah `{ title, topic, reason }`:
- `beginner`: title `REST API dan React`, langkah topik `async`, `rest-api`, `react`. Teks `reason` disalin dari `data/seed.js`.
- `new`: title `Fondasi JavaScript`, langkah topik `javascript`, `dom`, `array-methods`.
- `intermediate`: title `Arsitektur aplikasi MERN`, langkah topik `async`, `express`, `react`.

Untuk path `new` dan `intermediate`, `reason` ditulis singkat dalam bahasa Indonesia.

**Modul (path `beginner`)**

Ada empat modul: `order` 1, 2, 4, dan 7. Isinya sama dengan `data/seed.js` (judul, `topic`, `bloom_level`, `estimated_minutes`, `unlock_rule`, `unlock_hint`, serta `body` dan `quiz` modul order 4). Field `progress_percent` dan `flagged_by_diagnostic` dihapus. Kalau `module_count` dihitung dari modul-modul ini, hasilnya: langkah `async` 3, `rest-api` 1, `react` 0.

**User**

- `hosea`:
  - Data akun: `username: 'hosea'`, `profile` dan `statistics` (`streak_days: 7`, `bonus_points: 340`) disalin dari `data/seed.js`.
  - Sesi:
    - Empat sesi `finished` berupa snapshot saja (`question_ids: []`), dengan komentar `// DATA DEMO: snapshot tanpa submission`:

      | kind | started_at | % |
      |---|---|---|
      | diagnostic | 2026-08-04 | 34.2 |
      | checkpoint | 2026-08-18 | 41.8 |
      | checkpoint | 2026-09-01 | 44.6 |
      | diagnostic | 2026-09-12 | 46.5 |

      `earned`, `possible`, dan `level` diturunkan dari persentase terhadap 290: `earned = round(290 × pct / 100)`, dan `level` mengikuti `THRESHOLDS`.
    - Sesi kelima: `diagnostic`, `started_at 2026-09-22T09:00:00Z`, berisi 15 submission kanonik, lalu `finishSession(session, new Date('2026-09-22T09:38:14Z'))`. Hasilnya `elapsed_seconds = 2294`.
  - Progres: modul order 1 `completed` 100, modul order 2 `in_progress` 60.
- `nadia`: `username: 'nadia'`, `display_name: 'Nadia Pramesti'`, `level: null`, `diagnostic_status: false`, `statistics` semuanya 0.

Kedua user memakai password `password123`.

- [ ] **Step 1: Tulis test yang gagal — `seed.test.js`**

  ```js
  test('seed produces the canonical latest session', async () => {
    const hosea = await User.findOne({ email: 'hosea@gapcheck.test' });
    const latest = await AssessmentSession.findOne({ user_id: hosea._id }).sort({ started_at: -1 }).lean();
    assert.deepEqual(latest.result, { earned: 168, possible: 290, percentage: 57.93, level: 'beginner' });
    assert.equal(latest.elapsed_seconds, 2294);
    assert.equal(await AssessmentSession.countDocuments({ user_id: hosea._id, status: 'finished' }), 5);
    assert.equal(hosea.level, 'beginner');
  });
  test('seed counts', async () => {
    assert.equal(await Question.countDocuments(), 15);
    assert.equal(await Question.countDocuments({ difficulty: 'easy' }), 5);
    assert.equal(await LearningPath.countDocuments(), 3);
    assert.equal(await Module.countDocuments(), 4);
  });
  test('every code question has exactly one hidden case and bloom levels cover remember..analyze', async () => { /* ... */ });
  test('nadia has no diagnostic', async () => { /* level null, diagnostic_status false, 0 sesi */ });
  test('seed is idempotent', async () => { await seed(); assert.equal(await Question.countDocuments(), 15); });
  ```

- [ ] **Step 2: Jalankan dan pastikan gagal**

  Run: `npm test`
  Expected: `seed.test.js` FAIL.

- [ ] **Step 3: Implementasikan data seed, `seed.js`, `run.js`; ganti fixture lokal di test Task 4–5 dengan `setupTestDb(seed)`**

- [ ] **Step 4: Jalankan dan pastikan lolos**

  Run: `npm test`
  Expected: semua PASS, termasuk test Task 4–5 yang kini memakai data seed.

- [ ] **Step 5: Seed ke Mongo nyata**

  Run (di `server/`): `npm run seed`
  Expected: ringkasan `questions 15, learning_paths 3, modules 4, users 2, assessment_sessions 5, submissions 15, progress 2`. Jalankan kedua kali → ringkasan identik. Lalu `NODE_ENV=production npm run seed` → "Seed ditolak di production", exit 1.

- [ ] **Step 6: Commit**

  ```bash
  git commit -m "feat(server): seed 15 soal, 3 path, user demo dengan sesi kanonik 168/290"
  ```

---

### Task 7: Result, Progress, Overview, Modules dihitung dari data

**Files:**
- Create: `server/src/services/analysis.js`, `server/src/services/views.js`, `server/src/services/modules.js`, `server/src/routes/modules.js`, `server/src/routes/puzzle.js`, `server/src/data/puzzle.static.js`, `server/src/test/views.test.js`, `server/src/test/modules.test.js`
- Modify: `server/src/routes/result.js`, `server/src/routes/progress.js`, `server/src/app.js`
- Delete: `server/src/data/seed.js`

**Interfaces:**
- Consumes: Task 2, 3, 5, 6.
- Produces:
  - `loadLatestAnalysis(userId): Promise<null | { session, questions, best, topics, score }>`.
    - `session` adalah sesi `finished` terakhir dengan `question_ids` tidak kosong. Snapshot data demo disimpan dengan `question_ids: []`, sehingga terlewati karena tidak bisa dianalisis per topik. Sesi asli yang selesai tanpa jawaban tetap terbaca, dengan nilai 0.
    - `score` = `classify(best, questions)`.
  - `pickModuleForTopic(modules, progressByModule, topic): Module | null`. Hasilnya modul pertama (urut `order`) dengan `topic` yang sama dan belum `completed`. Kalau tidak ada, modul pertama dengan `topic` itu; kalau tetap tidak ada, `null`. Fungsi yang sama dipakai untuk *next up* dan untuk callout topik terlemah. Ini sengaja: menunjuk modul yang sudah selesai tidak berguna bagi user.
  - `getResult(userId)`:
    - Belum ada analisis → `{ result: null }`.
    - Ada analisis → `{ ...score, session_id, topic_accuracy, bloom_levels, narrative, learning_path: { ...path, steps: [{ ...step, module_count }] }, user: { level } }`. Path dipilih dari `score.level`.
  - `getProgress(userId)` mengembalikan field yang dipakai `Progress.jsx`:
    - `weighted_score`, `level`, `points_to_next_level`, `intermediate_threshold: 71`
    - `delta_since_first`, `delta_since_previous`
    - `modules_completed`, `modules_total`
    - `acceptance_rate` (dari semua submission user)
    - `sessions` (berlabel, masing-masing `{ _id, kind, label, percentage, taken_at }`)
    - `topic_accuracy`: topik terlemah diberi `callout: { text, module_id }` kalau `accuracy < GAP_TOPIC_THRESHOLD` dan modulnya ada. `text` diambil dari kalimat gaps narasi untuk topik itu.
    - `bloom_levels`
    - `recent_submissions`: 10 terakhir, masing-masing ditambah `question_title` dan `difficulty` hasil populate.

    Kalau user belum punya sesi, angka-angkanya `null` dan semua array kosong.
  - `getOverview(userId)`: `headline`, `weighted_score`, `band: { new: 40, beginner: 41, intermediate: 71 }`, `level`, `next_up: { module, reason } | null`, `in_progress`, `path_steps`, `puzzle`.
    - `headline` untuk user tanpa sesi: `'Mulai dengan asesmen diagnostik.'`.
    - `next_up.reason`: `` `Dipilih karena topik ${topic} adalah topik terlemah di diagnostik terakhir kamu.` ``
  - `getModule(userId, moduleId)`: `{ module, siblings }`.
    - `module` diberi `progress_percent` (dari `progress`, default 0) dan `flagged_by_diagnostic = (module.topic === topik terlemah)`.
    - `quiz[]` dikirim tanpa `correct_answer`.
    - `siblings` berisi modul satu path, urut `order`, masing-masing dengan `progress_percent`.
  - `checkQuizAnswer(moduleId, index, answer): Promise<{ correct: boolean }>`.
    - Endpoint ini stateless. Penilaian kuis dengan nilai yang tersimpan dikerjakan di sub-proyek 2.
    - `index` di luar rentang → 404 `unknown_quiz_item`.
  - Route:
    - `GET /result`, `GET /progress`, `GET /overview`
    - `GET /modules` → `{ modules }` (modul pada path level user; kalau level `null`, `[]`)
    - `GET /modules/:id`
    - `POST /modules/:id/quiz/:index/check` dengan body `{ answer }`
    - `GET /puzzle`

    Semua route di atas memakai `requireAuth`.

- [ ] **Step 1: Tulis test yang gagal**

  `views.test.js` (data seed):
  - `/result` hosea → `percentage 57.93`, `level 'beginner'`, `earnedPoints 168`, `topic_accuracy.at(-1).topic === 'async'`, `learning_path.steps.map(s => s.module_count)` = `[3, 1, 0]`, dan `narrative.summary` sama dengan string di Task 3.
  - `/result` nadia → `{ result: null }`.
  - `/progress` hosea:
    - `sessions.length === 5` dan `sessions.at(-1).label === 'Diagnostic 3'`;
    - `delta_since_first === 23.7`, `delta_since_previous === 11.4`, `acceptance_rate === 0.67`;
    - `modules_completed === 1`, `modules_total === 4`;
    - `callout.module_id` pada topik `async` sama dengan `_id` modul order 2 (modul order 1 sudah `completed`);
    - `recent_submissions[0].question_title` ada;
    - `bloom_levels[4].locked === true`.
  - `/progress` nadia → 200, `weighted_score === null`, `sessions` dan `topic_accuracy` kosong.
  - `/overview` hosea → `next_up.module.order === 2`, `in_progress` berisi modul order 2, dan `puzzle.streak_days === 7`.
  - `/overview` nadia → 200, `next_up === null`, `headline === 'Mulai dengan asesmen diagnostik.'`.

  `modules.test.js`:
  - `/modules/abc` → 404 `invalid_id`;
  - ObjectId acak → 404 `unknown_module`;
  - modul order 4 → `body.length === 4`, `quiz[0]` tanpa `correct_answer`, `flagged_by_diagnostic === true`, `siblings.map(s => s.order)` = `[1, 2, 4, 7]`;
  - cek kuis `answer 'b'` → `{ correct: true }`, `'a'` → `{ correct: false }`, index 5 → 404 `unknown_quiz_item`;
  - `/modules` nadia → `{ modules: [] }`.

- [ ] **Step 2: Jalankan dan pastikan gagal**

  Run: `npm test`
  Expected: test baru FAIL.

- [ ] **Step 3: Implementasikan service dan route; pindahkan objek `puzzle` ke `data/puzzle.static.js` (tambah komentar "statis sampai keputusan A6"); hapus `data/seed.js`**

- [ ] **Step 4: Pastikan tidak ada sisa referensi**

  Run: `grep -rn "data/seed" server/src`
  Expected: tidak ada output.

- [ ] **Step 5: Jalankan dan pastikan lolos**

  Run: `npm test`
  Expected: semua PASS.

- [ ] **Step 6: Commit**

  ```bash
  git commit -m "feat(server): result/progress/overview/modules dihitung dari MongoDB; hapus seed in-memory"
  ```

---

### Task 8: Client mengikuti kontrak baru

**Files:**
- Modify: `client/src/api.js`, `client/src/screens/Assessment.jsx`, `client/src/screens/Result.jsx`, `client/src/screens/Progress.jsx`, `client/src/screens/Overview.jsx`, `client/src/screens/ModuleScreen.jsx`

**Interfaces:**
- Consumes: route dari Task 5 dan Task 7.
- Produces (`api.js`):
  - `startSession(kind = 'diagnostic')`
  - `finishSession(id)`
  - `submit({ session_id, question_id, submitted_code?, answer? })`
  - `checkQuiz(moduleId, index, answer)`

  `api.questions()` tetap ada.

Ketentuan per layar:
- **Assessment:**
  - Memanggil `api.startSession()`.
  - Timer dimulai dari `remaining_seconds`; saat mencapai 0, otomatis memanggil finish lalu `navigate('/result')`.
  - Soal `type === 'mcq'` menampilkan `options` sebagai tombol pilihan, bukan editor. Pilihan yang dipilih dikirim sebagai `answer`.
  - Tombol "Selesai" di footer memanggil `finishSession` lalu `navigate('/result')`.
  - Respons 409 (`session_expired` / `session_finished`) dari submit juga diarahkan ke `/result`.
- **Result:** kalau `data.result === null`, tampilkan blok kosong berisi `<h1>Belum ada hasil diagnostik.</h1>`, satu kalimat penjelasan, dan `<Link className="btn" to="/assessment">Mulai diagnostik</Link>`.
- **Progress:**
  - Kalau `weighted_score === null`, tampilkan empty state yang setara (tautan ke `/assessment`).
  - Caption tile skor memakai `sessions.at(-2)?.label`, bukan teks "Diagnostic 2" yang di-hardcode.
- **Overview:** kalau `next_up === null`, bagian NEXT UP berisi tautan "Mulai diagnostik" ke `/assessment`. `ScoreTrack` hanya dirender kalau `weighted_score !== null`.
- **ModuleScreen:**
  - Kalau tanpa `:id`, ambil `api.overview()` lalu `<Navigate replace to={/modules/${next_up.module._id}}>`. Kalau `next_up` null, `<Navigate to="/assessment">`.
  - Tombol "sebelumnya/berikutnya" dihitung dari posisi modul di `siblings`, hanya menuju modul yang tidak `locked`, dan disembunyikan kalau tidak ada.
  - Kuis memanggil `api.checkQuiz` lalu menampilkan benar/salah dari `correct`.

- [ ] **Step 1: Ubah `api.js` dan kelima layar sesuai ketentuan di atas**

- [ ] **Step 2: Pastikan tidak ada id lama di client**

  Run: `grep -rnE "'m0[0-9]'|m0[0-9]\"|/modules/m0" client/src`
  Expected: tidak ada output.

- [ ] **Step 3: Build**

  Run (di `client/`): `npm run build`
  Expected: build sukses tanpa error.

- [ ] **Step 4: Verifikasi manual (spec Bagian 5)**

  Langkah: `docker compose up -d` → `cd server && npm run seed && npm run dev` → `cd client && npm run dev`.

  Expected:
  - **hosea:** Overview menampilkan next up modul order 2, dan langkah path menampilkan 3 / 1 / 0 modul. Result menampilkan 57.93% BEGINNER 168/290. Progress menampilkan grafik 5 titik dengan label "Diagnostic 3" di ujung, serta callout async yang menautkan modul order 2.
  - **Modul order 4:** jawaban kuis b benar, a salah.
  - **nadia:** Result menampilkan empty state. Diagnostik bisa dikerjakan (MCQ pakai tombol, code pakai editor) sampai Selesai. Result dan Progress terisi dengan 1 titik.
  - Refresh di tengah asesmen tidak mereset timer.

- [ ] **Step 5: Commit**

  ```bash
  git commit -m "feat(client): asesmen berbasis sesi, empty state, navigasi modul tanpa id hardcode"
  ```

---

### Task 9: Dokumentasi

**Files:**
- Modify: `README.md`, `docs/DECISIONS.md`

- [ ] **Step 1: Perbarui README**

  - Judul bagian "prototype": hapus "belum memakai MongoDB".
  - Bagian **Menjalankan**: `docker compose up -d` → `cd server && cp .env.example .env && npm install && npm run seed && npm run dev` → `cd client && npm install && npm run dev`.
  - Login demo: hosea dan nadia, keduanya `password123`.
  - Bagian **Unit test**: jumlah test terbaru dan catatan unduhan binary `mongodb-memory-server` (~70 MB) saat run pertama.
  - Bagian **Struktur**: tambahkan `models/`, `services/`, `analytics.js`, dan `seed/`.
  - Tambahkan paragraf **Data demo**: empat sesi pertama hosea hanya berupa snapshot tanpa submission, sedangkan sesi kelima dihitung dari 15 submission.
  - Tabel fase: Auth "selesai (MongoDB)"; Question bank "selesai — model Mongoose, 15 soal"; Diagnostic session "selesai — sesi tersimpan, auto-expire"; Modules + progress "progres tersimpan, gating belum diberlakukan di server (sub-proyek 2)".

- [ ] **Step 2: Perbarui `docs/DECISIONS.md` bagian D**

  - "Nama koleksi dan field sesuai tabel basis data": kode sudah mengikuti C1–C5; tinggal dokumen.
  - Tambahkan satu butir di A7: aturan auto-finish saat waktu habis sudah diterapkan.
  - Tambahkan satu butir baru: aturan "submission dengan poin tertinggi yang dihitung" perlu masuk narasi penilaian BAB 3.

- [ ] **Step 3: Verifikasi akhir**

  Run (di `server/`): `npm test`
  Expected: semua PASS.

  Run (di `client/`): `npm run build`
  Expected: sukses.

- [ ] **Step 4: Commit**

  ```bash
  git commit -m "docs: README dan DECISIONS untuk lapisan data MongoDB"
  ```
