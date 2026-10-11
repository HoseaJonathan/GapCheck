# Fitur Belajar Inti — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membuat bagian belajar Gap Check benar-benar berfungsi: modul berurutan dengan gating di server, kuis bernilai yang bisa diulang (lulus ≥ 70%), progres per user, dan aturan asesmen ulang. Path beginner diisi lengkap.

**Architecture:** Aturan berupa fungsi murni di `server/src/learning.js`, sejajar dengan `scoring.js` dan `analytics.js`. Riwayat percobaan kuis disimpan di koleksi `quiz_attempts`. Status kunci tidak pernah disimpan; nilainya dihitung dari `modules.requires` dan progres `completed`. Service merakit status per user untuk route; client hanya menampilkan.

**Tech Stack:** Node 22 (ESM), Express 5, Mongoose 8, MongoDB 7, `node:test` + `supertest` + `mongodb-memory-server`, React 19 + Vite.

**Spec:** `docs/superpowers/specs/2026-10-11-learning-core-design.md` — baca lebih dulu. Plan ini hanya mencatat keputusan, alasannya ada di spec.

## Global Constraints

- Dibangun di branch `feat/learning-core` (worktree `.worktrees/learning-core`) di atas `feat/mongodb-data-layer`.
- `QUIZ_PASS_THRESHOLD = 0.7` di `server/src/config.js`. Lulus kalau `correct_count / total ≥ 0.7`, dibandingkan dengan rasio mentah, bukan skor yang sudah dibulatkan.
- `quiz[].correct_answer` dan `quiz[].explanation` tidak pernah muncul di respons API mana pun, kecuali dalam `review` pada respons percobaan yang lulus.
- Status `locked` tidak pernah disimpan. `progress.state` hanya `in_progress` atau `completed`. `percent_complete` hanya 50 atau 100.
- `completed_at` ditulis sekali, pada kelulusan pertama, dan tidak pernah ditimpa.
- `kind` sesi ditentukan server; nilai `kind` dari client diabaikan.
- Error berbentuk `{ error, reason }`. Kode baru: 403 `module_locked`, 400 `incomplete_answers`, 403 `retake_locked`, 404 `no_quiz`.
- Nama field respons lama tidak diganti (`unlock_rule`, `unlock_hint`, `progress_percent`, `next_up`, dan seterusnya). Field baru boleh ditambahkan.
- `scoring.js`, `fakeJudge0.js`, dan test `scoring.test.js` tidak diubah.
- Teks ke user bahasa Indonesia, sama persis dengan copy di spec. Kode dan identifier bahasa Inggris. Komentar menjelaskan *kenapa*.
- Test lama yang perilakunya sengaja berubah diperbarui, tidak dihapus.
- Commit tanpa baris atribusi.

## Review Focus

1. **`requires` menunjuk modul yang sudah tidak ada atau berada di path lain.** User tidak boleh terkunci selamanya, jadi prasyarat yang hilang dianggap terpenuhi. Test di Task 2.
2. **Modul tanpa soal kuis.** `POST .../quiz/attempts` harus membalas 404 `no_quiz`, bukan pembagian dengan nol atau 500. Test di Task 4.
3. **Dua `POST /start` pertama datang bersamaan.** Keduanya 200 dan hanya ada satu baris progres; error 11000 dari upsert yang kalah ditangkap. Test di Task 4.
4. **Sesi `in_progress` saat retake terkunci.** Sesi itu tetap dikembalikan (resume, 200), bukan 403. Test di Task 5.
5. **Path tamat.** Setelah hosea meluluskan kesembilan modul, `next_up` bernilai `null` dan `retake.allowed === true` (aturan b). Test di Task 5.

---

## File Structure

```
server/src/config.js                    + QUIZ_PASS_THRESHOLD
server/src/models/Module.js             + requires, quiz[].explanation (select:false); − unlock_rule, unlock_hint (Task 4)
server/src/models/Progress.js           state enum [in_progress, completed], + completed_at
server/src/models/QuizAttempt.js        koleksi quiz_attempts (baru)
server/src/learning.js                  lockStates, nextModule, gradeQuiz, retakeEligibility (murni)
server/src/learning.test.js
server/src/seed/data/modules.js         modul tiga path (ditulis ulang)
server/src/seed/seed.js                 requires berantai, modul per path, progres + percobaan hosea
server/src/services/progression.js      learnerState(userId), retakeFor(userId) (baru)
server/src/services/modules.js          listModules, getModule, startModule, submitQuizAttempt, listQuizAttempts
server/src/services/analysis.js         − pickModuleForTopic, − firstOpenModule (diganti; Task 5)
server/src/services/views.js            next_up = nextModule, callout, retake
server/src/services/sessions.js         startSession(userId, now) memakai retakeFor
server/src/routes/modules.js, routes/sessions.js
server/src/test/{models,seed,modules,views,sessions,analysis}.test.js
client/src/api.js, screens/{ModuleScreen,Overview,Assessment}.jsx
README.md, docs/DECISIONS.md
```

---

### Task 1: Perubahan model dan konstanta

**Files:**
- Create: `server/src/models/QuizAttempt.js`
- Modify: `server/src/models/Module.js`, `server/src/models/Progress.js`, `server/src/config.js`
- Test: `server/src/test/models.test.js`

**Interfaces:**
- Produces:
  - `QUIZ_PASS_THRESHOLD = 0.7` (export dari `config.js`).
  - Model `QuizAttempt` di koleksi `quiz_attempts` dengan field `{ user_id, module_id, answers: [String], correct_count, total, score, passed, submitted_at }` (semua wajib) dan indeks `(user_id:1, module_id:1, submitted_at:1)`.
  - `Module.requires`: `{ type: ObjectId, ref: 'Module', default: null }`.
  - `Module.quiz[].explanation`: `{ type: String, select: false }`.
  - `Progress.state`: enum `['in_progress', 'completed']`, default `'in_progress'`.
  - `Progress.completed_at`: `Date`, default tidak ada.
  - `unlock_rule` dan `unlock_hint` **tetap** di skema Module sampai Task 4.

- [ ] **Step 1: Tulis test yang gagal di `models.test.js`**

  ```js
  it('quiz_attempts collection and required fields', async () => {
    assert.equal(QuizAttempt.collection.name, 'quiz_attempts');
    await assert.rejects(QuizAttempt.create({ user_id: uid }), { name: 'ValidationError' });
  });
  it('quiz explanation is not selected by default', async () => {
    const m = await Module.create({ ...validModule, quiz: [{ question: 'q', options: [{ key: 'a', text: 'A' }], correct_answer: 'a', explanation: 'why' }] });
    const plain = await Module.findById(m._id).lean();
    assert.equal('explanation' in plain.quiz[0], false);
    const full = await Module.findById(m._id).select('+quiz.explanation +quiz.correct_answer').lean();
    assert.equal(full.quiz[0].explanation, 'why');
  });
  it('module requires defaults to null', async () => {
    assert.equal((await Module.create(validModule)).requires, null);
  });
  it('progress state no longer accepts locked; completed_at is stored', async () => {
    await assert.rejects(Progress.create({ user_id: uid, module_id: mid, state: 'locked' }), { name: 'ValidationError' });
    const p = await Progress.create({ user_id: uid, module_id: mid2, state: 'completed', percent_complete: 100, completed_at: new Date('2026-09-10T10:00:00Z') });
    assert.equal(p.completed_at.toISOString(), '2026-09-10T10:00:00.000Z');
  });
  ```

  Pakai fixture `validModule` yang sudah ada di file test itu, atau buat yang setara.

- [ ] **Step 2: Jalankan dan pastikan gagal**

  Run: `cd server && npm test`
  Expected: test baru FAIL.

- [ ] **Step 3: Implementasikan perubahan model dan konstanta.** Kalau seed lama memakai `state: 'locked'`, perbarui seed seperlunya supaya suite tetap hijau.

- [ ] **Step 4: Jalankan dan pastikan lolos**

  Run: `cd server && npm test`
  Expected: semua PASS.

- [ ] **Step 5: Commit**

  ```bash
  git commit -m "feat(server): model quiz_attempts, modules.requires, progress.completed_at"
  ```

---

### Task 2: Aturan murni — `learning.js`

**Files:**
- Create: `server/src/learning.js`, `server/src/learning.test.js`

**Interfaces:**
- Consumes: `QUIZ_PASS_THRESHOLD` (Task 1).
- Produces (semuanya murni, id dibandingkan dengan `String()`, dan `progress` = `Map<String(module_id), { state, completed_at? }>`):
  - `lockStates(modules, progress) → Map<String(_id), { locked, unlock_rule: 'open'|'locked', unlock_hint: string|null }>`.
    - Modul terbuka kalau `requires == null`, **atau prasyaratnya tidak ada di `modules`** (prasyarat yang hilang dianggap terpenuhi), atau progres prasyaratnya `completed`.
    - Hint modul terkunci: `` `Lulus kuis modul ${String(prereq.order).padStart(2, '0')} untuk membuka` ``.
  - `nextModule(modules, locks, progress) → module | null`: modul pertama (urut `order`) yang terbuka dan belum `completed`.
  - `gradeQuiz(items, answers) → { correct_count, total, score, passed } | null`.
    - Mengembalikan `null` kalau `answers` bukan array, panjangnya tidak sama dengan `items.length`, ada elemen bukan string, atau `items` kosong.
    - `score = Number((correct_count / total).toFixed(2))`.
    - `passed = correct_count / total >= QUIZ_PASS_THRESHOLD`.
    - `items[i].correct_answer` dibandingkan persis (`===`) dengan `answers[i]`.
  - `retakeEligibility({ sessions, modules, progress, steps }) → { allowed, kind, reason }`.
    - `sessions` = sesi finished (dengan `finished_at`).
    - `steps` = `learning_paths.steps` (`{ title, topic }`).
    - Aturannya persis spec Bagian 2: (1) belum ada sesi → diagnostic; (2a) ada langkah yang semua modulnya `completed` dan `max(completed_at) > last`; (2b) path tamat; (3) selain itu terkunci, dengan `reason` yang menunjuk langkah paling awal yang masih punya modul belum completed.
    - Langkah = kelompok modul dengan `topic` sama, diurutkan menurut posisi topik di `steps`.
    - `reason` untuk path tanpa modul: `'Belum ada modul untuk jalur kamu.'`.

- [ ] **Step 1: Tulis test yang gagal**

  Fixture: tiga modul `a(order 1, requires null, topic 'async')`, `b(order 2, requires a)`, `c(order 3, requires b, topic 'react')`, dan `steps = [{ title: 'JavaScript asinkron', topic: 'async' }, { title: 'React', topic: 'react' }]`, dengan topik b = `'async'`.

  ```js
  test('lockStates: first open, chain locked until prerequisite completed', () => {
    const l = lockStates(mods, new Map());
    assert.deepEqual([l.get('a').locked, l.get('b').locked, l.get('c').locked], [false, true, true]);
    assert.equal(l.get('b').unlock_hint, 'Lulus kuis modul 01 untuk membuka');
    assert.equal(l.get('a').unlock_rule, 'open');
    const l2 = lockStates(mods, new Map([['a', { state: 'in_progress' }]]));
    assert.equal(l2.get('b').locked, true);
    const l3 = lockStates(mods, new Map([['a', { state: 'completed' }]]));
    assert.equal(l3.get('b').locked, false);
  });
  test('lockStates: a missing prerequisite counts as met', () => {
    const l = lockStates([{ ...b, requires: 'gone' }], new Map());
    assert.equal(l.get('b').locked, false);
  });
  test('nextModule is the first open, not completed module', () => { /* a completed → b; semua completed → null */ });
  test('gradeQuiz boundary at 70%', () => {
    const ten = Array.from({ length: 10 }, () => ({ correct_answer: 'a' }));
    const ans = (n) => Array.from({ length: 10 }, (_, i) => (i < n ? 'a' : 'b'));
    assert.deepEqual(gradeQuiz(ten, ans(6)), { correct_count: 6, total: 10, score: 0.6, passed: false });
    assert.deepEqual(gradeQuiz(ten, ans(7)), { correct_count: 7, total: 10, score: 0.7, passed: true });
    // 2/3 gagal (0.67), 4/5 lulus, 0/3, 3/3
  });
  test('gradeQuiz rejects malformed answers', () => {
    // kurang, lebih, bukan array, berisi null/angka, items kosong → null
  });
  test('retakeEligibility', () => {
    // no sessions → { allowed: true, kind: 'diagnostic', reason: null }
    // a completed before last, b in_progress →
    //   { allowed: false, kind: 'checkpoint', reason: 'Selesaikan 1 modul lagi di langkah JavaScript asinkron untuk membuka asesmen ulang.' }
    // a completed before last, b completed after last → allowed checkpoint (2a)
    // a & b completed before last, c not → not allowed; reason names React (1 modul) — langkah async bukan kandidat
    // all completed (all before last) → allowed (2b)
    // modules [] → { allowed: false, kind: 'checkpoint', reason: 'Belum ada modul untuk jalur kamu.' }
  });
  ```

- [ ] **Step 2: Jalankan dan pastikan gagal**

  Run: `cd server && npm test`
  Expected: `learning.test.js` FAIL (modul belum ada).

- [ ] **Step 3: Implementasikan `learning.js`**

- [ ] **Step 4: Jalankan dan pastikan lolos**

  Run: `cd server && npm test`
  Expected: semua PASS.

- [ ] **Step 5: Commit**

  ```bash
  git commit -m "feat(server): aturan murni gating, kuis, dan asesmen ulang"
  ```

---

### Task 3: Isi materi dan seed

**Files:**
- Modify: `server/src/seed/data/modules.js` (ditulis ulang), `server/src/seed/seed.js`, `server/src/test/seed.test.js`
- Modify (sebatas ekspektasi yang bergantung pada data seed): `server/src/test/views.test.js`, `server/src/test/modules.test.js`

**Interfaces:**
- Consumes: model dari Task 1.
- Produces:
  - `seed/data/modules.js` mengekspor `modulesByLevel = { beginner: [...9], new: [...2], intermediate: [...2] }`. Setiap modul: `{ order, title, topic, bloom_level, estimated_minutes, body, quiz }`, **tanpa** `unlock_rule`/`unlock_hint`/`requires`.
  - `seed()` menyisipkan modul per path dengan `path_id` yang benar dan `requires` = `_id` modul `order - 1` di path yang sama (`null` untuk order 1).
  - Progres dan percobaan hosea:
    - modul beginner 1: `completed`, 100, `completed_at = 2026-09-10T10:00:00Z`, ditambah satu `QuizAttempt` lulus dengan semua jawaban benar dan `submitted_at` yang sama;
    - modul beginner 2: `in_progress`, 50.

**Konten** (judul, topic, dan urutan persis seperti spec Bagian 4):
- Setiap modul berisi satu blok `lead` dan 3–6 blok `text`/`code`/`callout`. Tipe `text` adalah paragraf baru.
- Setiap modul punya kuis 3–5 soal pilihan ganda (3–4 opsi, satu `correct_answer`, `explanation` tidak kosong).
- Bahasa Indonesia. Kode contoh harus benar.
- Modul ★ mempertahankan judulnya. Isi `body`/`quiz` modul order 3 (dulu order 4) dipertahankan lalu diperluas.
- `bloom_level` sesuai sifat materi (`understand` atau `apply`).
- Modul yang menutup soal diagnostik (spec Bagian 4, kolom terakhir) membahas konsep yang diuji soal itu.

- [ ] **Step 1: Tulis test konten yang gagal di `seed.test.js`**

  ```js
  it('each path has contiguous orders and an unbroken requires chain', async () => {
    for (const level of ['beginner', 'new', 'intermediate']) {
      const path = await LearningPath.findOne({ level });
      const mods = await Module.find({ path_id: path._id }).sort({ order: 1 }).lean();
      assert.deepEqual(mods.map((m) => m.order), mods.map((_, i) => i + 1));
      assert.equal(mods[0].requires, null);
      mods.slice(1).forEach((m, i) => assert.equal(String(m.requires), String(mods[i]._id)));
    }
  });
  it('beginner path has 9 modules with the spec titles and step counts 4/3/2', async () => { /* judul persis spec; topic async×4, rest-api×3, react×2 */ });
  it('every quiz has 3–5 items, 3–4 options, a key among the options and an explanation', async () => { /* select +quiz.correct_answer +quiz.explanation */ });
  it('pins every quiz answer key', async () => {
    // Map eksplisit judul modul → array kunci, untuk semua 13 modul
  });
  it('every beginner module topic is a step of the path', async () => {});
  it('hosea: module 1 completed with one passing attempt, module 2 in progress at 50', async () => {});
  ```

- [ ] **Step 2: Jalankan dan pastikan gagal**

  Run: `cd server && npm test`
  Expected: test baru FAIL.

- [ ] **Step 3: Tulis konten dan perbarui seed**

- [ ] **Step 4: Perbarui ekspektasi test lama yang hanya bergantung pada data seed**

  Yang perlu diubah:
  - urutan modul `[1,2,4,7]` → `[1..9]`;
  - `module_count` `[3,1,0]` → `[4,3,2]`;
  - progres modul 2: 60 → 50;
  - referensi ke "modul order 4" atau "order 7" → modul dengan judul yang sama di urutan barunya;
  - jumlah modul = 9 untuk path beginner.

  Assertion perilaku (next_up, `/check`) **tidak** diubah di task ini. Task 4 dan Task 5 yang mengubahnya. Saat ini tidak ada test yang memeriksa `unlock_rule`/`unlock_hint`, jadi berhentinya seed menyimpan kedua field itu tidak memecahkan test.

- [ ] **Step 5: Jalankan dan pastikan lolos**

  Run: `cd server && npm test`
  Expected: semua PASS.

- [ ] **Step 6: Commit**

  ```bash
  git commit -m "feat(server): materi path beginner lengkap, contoh path new/intermediate, rantai requires"
  ```

---

### Task 4: Endpoint modul — status, kunci, start, kuis

**Files:**
- Create: `server/src/services/progression.js`
- Modify: `server/src/services/modules.js`, `server/src/routes/modules.js`, `server/src/models/Module.js` (hapus `unlock_rule` dan `unlock_hint`)
- Test: `server/src/test/modules.test.js` (test `/check` diganti dengan test 404)

**Interfaces:**
- Consumes: `lockStates`, `nextModule`, `gradeQuiz` (Task 2); `QuizAttempt` (Task 1); `loadPath`, `progressMap` (`services/modules.js`).
- Produces (`services/progression.js`):
  - `moduleStatuses(userId, modules) → Promise<Map<String(_id), { locked, unlock_rule, unlock_hint, state, progress_percent, quiz_status: { attempts, best_score, passed } }>>`.
    - `state` bernilai `null` kalau belum ada progres.
    - `best_score` bernilai `null` kalau belum ada percobaan.
  - `OUTLINE` di `services/modules.js` ditambah `requires`.
- Produces (`services/modules.js`):
  - `listModules(userId)`: modul di path user, masing-masing digabung dengan statusnya.
  - `getModule(userId, id)` → `{ module, siblings }`.
    - Modul terkunci **tidak** membawa `body`/`quiz`.
    - Modul terbuka membawa `body` dan `quiz` tanpa `correct_answer` dan `explanation`.
    - Lock modul dihitung terhadap modul-modul **di path modul itu** (`siblings`), bukan path user.
  - `startModule(userId, id)` → `{ state, progress_percent }`.
    - Upsert `$setOnInsert: { state: 'in_progress', percent_complete: 50 }`.
    - Error 11000 dari upsert yang kalah balapan ditangkap, lalu baris yang ada dibaca ulang.
    - Modul terkunci → `HttpError(403, 'module_locked')`.
  - `submitQuizAttempt(userId, id, answers, now = new Date())` → respons 201 sesuai spec Bagian 3. Urutan pemeriksaan:
    1. modul ada (404 `unknown_module`);
    2. quiz tidak kosong (404 `no_quiz`);
    3. tidak terkunci (403 `module_locked`);
    4. `gradeQuiz` tidak mengembalikan `null` (400 `incomplete_answers`).

    Setelah itu: simpan percobaan, `attempt_no` = jumlah percobaan user di modul itu. Kalau lulus:
    - `Progress.updateOne({ user_id, module_id }, { $set: { state: 'completed', percent_complete: 100 } }, { upsert: true })`;
    - lalu `updateOne({ user_id, module_id, completed_at: { $exists: false } }, { $set: { completed_at: now } })`;
    - `review` = `[{ question, your_answer, correct_answer, explanation }]`;
    - `next_module_id` = `_id` modul yang `requires`-nya modul ini (atau `null`).
  - `listQuizAttempts(userId, id)` → `{ attempts: [{ attempt_no, score, correct_count, total, passed, submitted_at }] }`, terbaru di atas.
  - Route: `POST /modules/:id/start`, `POST /modules/:id/quiz/attempts`, `GET /modules/:id/quiz/attempts`. Route `POST /modules/:id/quiz/:index/check` dan `checkQuizAnswer` dihapus.

- [ ] **Step 1: Tulis test yang gagal di `modules.test.js`** (pakai `setupTestDb(seed)`; modul diambil berdasarkan `order` dari path beginner)

  ```js
  it('GET /modules for hosea: 1 completed, 2 open in progress, 3..9 locked', async () => {
    // locked [false,false,true,...]; state [completed,in_progress,null,...]; progress_percent [100,50,0,...]
    // modul 3: unlock_hint 'Lulus kuis modul 02 untuk membuka'
    // quiz_status modul 1 { attempts: 1, best_score: 1, passed: true }
  });
  it('a locked module is served without body and quiz', async () => {});
  it('an open module is served without keys or explanations', async () => {});
  it('start: 403 on a locked module; 50 on first open; never lowers a completed module', async () => {});
  it('two concurrent first starts leave one progress row', async () => {});
  it('failed attempt: score only, no review, module stays in progress', async () => {
    // modul 2, semua jawaban salah → 201 { passed: false, attempt_no: 1 }, tanpa 'review'
  });
  it('passing attempt: review with keys and explanations, completed, next module unlocked', async () => {
    // jawaban benar diambil dari DB dengan +quiz.correct_answer
    // → passed, review.length === quiz.length, next_module_id === modul 3; GET modul 3 → locked false
  });
  it('a second pass keeps the first completed_at', async () => {});
  it('incomplete answers → 400 incomplete_answers; locked module attempt → 403 module_locked', async () => {});
  it('a module without quiz items → 404 no_quiz', async () => {
    // Module.create sementara tanpa quiz; dihapus di finally
  });
  it('attempt history has no keys', async () => {});
  it('the old /quiz/:index/check route is gone', async () => { /* 404 */ });
  ```

- [ ] **Step 2: Jalankan dan pastikan gagal**

  Run: `cd server && npm test`
  Expected: test baru FAIL.

- [ ] **Step 3: Implementasikan**

- [ ] **Step 4: Jalankan dan pastikan lolos**

  Run: `cd server && npm test`
  Expected: semua PASS.

- [ ] **Step 5: Commit**

  ```bash
  git commit -m "feat(server): gating modul di server, kuis bernilai, start modul"
  ```

---

### Task 5: Next up, callout, dan aturan asesmen ulang

**Files:**
- Modify: `server/src/services/progression.js`, `server/src/services/views.js`, `server/src/services/sessions.js`, `server/src/routes/sessions.js`, `server/src/services/analysis.js`
- Test: `server/src/test/views.test.js`, `server/src/test/sessions.test.js`, `server/src/test/analysis.test.js`

**Interfaces:**
- Consumes: `nextModule`, `retakeEligibility`, `lockStates` (Task 2); `moduleStatuses` (Task 4).
- Produces:
  - `retakeFor(userId) → Promise<{ allowed, kind, reason }>` (`services/progression.js`). Fungsi ini memuat user, sesi finished, path dan modul level user, progres (dengan `completed_at`), dan `path.steps`.
  - `startSession(userId, now = new Date())` — parameter `kind` dihapus.
    - Ada sesi `in_progress` → perilaku lama (resume atau expire).
    - Tidak ada → `retakeFor`. Kalau tidak boleh → `HttpError(403, 'retake_locked', { reason })`; kalau boleh → sesi dengan `kind` hasil fungsi itu.
    - `invalid_kind` dihapus. Route mengabaikan `req.body.kind`.
  - `getOverview` dan `getProgress` ditambah `retake`.
  - `next_up` di `getOverview` = `nextModule(...)` dengan `reason` sesuai spec Bagian 2.
  - Callout di `getProgress`/`getResult` menunjuk modul pertama bertopik terlemah yang terbuka dan belum selesai; kalau tidak ada, modul pertama bertopik itu; kalau tidak ada juga, tanpa callout.
  - `pickModuleForTopic` dan `firstOpenModule` dihapus dari `analysis.js` beserta test-nya, kecuali kalau masih dipakai.

**Catatan fixture:** setelah task ini, hosea **tidak** boleh memulai sesi baru. Test di `sessions.test.js` yang memulai sesi sebagai hosea harus dibuat memenuhi syarat dulu. Caranya: di `beforeEach`/fixture, tandai modul beginner 2–4 `completed` dengan `completed_at` = sekarang lewat model langsung, lalu kembalikan setelahnya. Bisa juga memakai nadia kalau maksud test-nya tidak bergantung pada hosea. Maksud setiap test lama harus tetap terjaga.

- [ ] **Step 1: Tulis test yang gagal**

  `views.test.js`:
  - `/overview` hosea: `next_up.module.order === 2`, `reason` = `'Dipilih karena topik async adalah topik terlemah di diagnostik terakhir kamu.'`, `retake` = `{ allowed: false, kind: 'checkpoint', reason: 'Selesaikan 3 modul lagi di langkah JavaScript asinkron untuk membuka asesmen ulang.' }`.
  - `/progress` hosea punya `retake` yang sama. Callout async menunjuk modul order 2.
  - `/overview` nadia: `retake` = `{ allowed: true, kind: 'diagnostic', reason: null }`, `next_up === null`.
  - **Path tamat:** luluskan kesembilan modul hosea lewat `POST .../quiz/attempts` dengan jawaban benar dari DB, berurutan → `/overview` `next_up === null` dan `retake.allowed === true`. Kembalikan seed sesudahnya (jalankan ulang `seed()` di `after`/`finally`).
  - Ekspektasi lama yang sengaja berubah diperbarui: test `next_up` fallback dari sub-proyek 1 disesuaikan dengan aturan `nextModule`.

  `sessions.test.js`:
  - hosea `POST /sessions` → 403 `retake_locked` dengan `reason` di atas;
  - setelah modul 2–4 diluluskan lewat API → 201 dan `session.kind === 'checkpoint'`;
  - nadia → 201 `kind: 'diagnostic'` meskipun client mengirim `kind: 'checkpoint'`; setelah finish → 403 `retake_locked`;
  - **resume saat terkunci:** buat sesi `in_progress` untuk user yang terkunci lewat model langsung → `POST /sessions` 200 dengan sesi itu.

- [ ] **Step 2: Jalankan dan pastikan gagal**

  Run: `cd server && npm test`
  Expected: test baru FAIL.

- [ ] **Step 3: Implementasikan dan sesuaikan fixture test sesi lama**

- [ ] **Step 4: Jalankan dan pastikan lolos**

  Run: `cd server && npm test`
  Expected: semua PASS.

- [ ] **Step 5: Commit**

  ```bash
  git commit -m "feat(server): next up mengikuti gating, aturan asesmen ulang (A4)"
  ```

---

### Task 6: Client

**Files:**
- Modify: `client/src/api.js`, `client/src/screens/ModuleScreen.jsx`, `client/src/screens/Overview.jsx`, `client/src/screens/Assessment.jsx`

**Interfaces:**
- Consumes: kontrak API dari Task 4 dan Task 5 (spec Bagian 3).
- Produces (`api.js`):
  - `startModule(id)`, `submitQuiz(id, answers)`, `quizAttempts(id)` ditambahkan; `checkQuiz` dihapus.
  - `startSession()` tidak lagi mengirim `kind`.

Ketentuan (copy persis spec Bagian 5; tanpa restyle — pakai kelas CSS dan pola yang sudah ada):
- **ModuleScreen:**
  - **Modul terkunci:** judul, `unlock_hint`, dan tautan "Ke modul berikutnya" ke `next_up` dari `/overview`.
  - **Modul terbuka:**
    - Panggil `startModule` sekali per id (pakai ref, bukan per render).
    - Render blok `text` sebagai `<p>`.
  - **Kuis:**
    - Semua soal ditampilkan, satu pilihan per soal. "Kirim jawaban" nonaktif sampai semua soal dijawab.
    - Gagal: `` `Skor ${correct_count}/${total} (${Math.round(score*100)}%) — butuh 70%. Baca ulang materi lalu coba lagi.` `` dan tombol "Coba lagi" yang mengosongkan pilihan.
    - Lulus: daftar `review` (soal, jawaban kamu, jawaban benar, penjelasan) dan tautan "Lanjut ke modul berikutnya" ke `next_module_id` (disembunyikan kalau `null`). Setelah lulus, data modul dimuat ulang supaya `siblings` dan status terbarui.
    - Tampilkan juga `quiz_status`: "Percobaan: N · Skor terbaik: X%".
    - Error 403 `module_locked` dari start atau kuis → tampilkan tampilan terkunci.
  - **Daftar modul samping:** gembok dan `unlock_hint` dari `siblings`, serta tanda "SELESAI" untuk `state === 'completed'`.
- **Overview:** blok "Asesmen ulang".
  - `retake.allowed` → `<Link className="btn" to="/assessment">`, dengan label "Mulai diagnostik" kalau `kind === 'diagnostic'`, selain itu "Asesmen ulang".
  - Selain itu → tombol nonaktif "Asesmen ulang" dan teks `retake.reason`.
  - Blok "Mulai diagnostik" yang lama untuk `level === null` boleh digabung ke blok ini.
- **Assessment:** kalau `POST /sessions` membalas 403 `retake_locked`, tampilkan `reason` dari body error dan `<Link to="/">Kembali ke Overview</Link>`. Jangan memanggil finish atau redirect.

- [ ] **Step 1: Ubah `api.js` dan ketiga layar sesuai ketentuan**

- [ ] **Step 2: Pastikan endpoint lama tidak dipakai lagi**

  Run: `grep -rn "checkQuiz\|/check\|kind:" client/src`
  Expected: tidak ada pemanggilan `checkQuiz` atau `/check`, dan tidak ada `kind` yang dikirim ke `/sessions`.

- [ ] **Step 3: Build**

  Run: `cd client && npm run build`
  Expected: sukses tanpa error.

- [ ] **Step 4: Verifikasi manual**

  Langkah: `docker compose up -d` → di `server/`: `npm run seed` lalu `npm run dev` → di `client/`: `npm run dev`.

  Alur yang harus berjalan:
  - **hosea:** modul 3 terkunci dengan hint → buka modul 2 → kirim jawaban salah, muncul skor tanpa pembahasan → "Coba lagi" → kirim jawaban benar, muncul pembahasan → modul 3 terbuka. Overview menampilkan "Asesmen ulang" nonaktif beserta alasannya.
  - **nadia:** diagnostik dari Overview → selesai → "Asesmen ulang" nonaktif dengan alasan langkah pertama path-nya.

  Kalau Docker tidak tersedia, catat di report bahwa langkah ini dilewati.

- [ ] **Step 5: Commit**

  ```bash
  git commit -m "feat(client): kuis bernilai, modul terkunci, tombol asesmen ulang"
  ```

---

### Task 7: Dokumentasi

**Files:**
- Modify: `README.md`, `docs/DECISIONS.md`

- [ ] **Step 1: README**
  - Jumlah test dan daftar cakupannya diperbarui.
  - Login demo: hosea sekarang berhenti di modul 2 dan asesmen ulangnya terkunci sampai langkah async selesai.
  - Struktur: tambahkan `learning.js`, `models/QuizAttempt.js`, dan `services/progression.js`.
  - Status fase 7 dan 8: gating dan kuis berjalan di server.
  - Ganti penyebutan endpoint `/check` dengan `/quiz/attempts`.

- [ ] **Step 2: DECISIONS.md**
  - **A4:** tulis aturan asesmen ulang yang diterapkan (spec Bagian 2), sebagai keputusan yang sudah diambil.
  - **A5:** tulis gating berurutan via `modules.requires` dan kuis lulus ≥ 70% dengan percobaan ulang tanpa batas, sebagai keputusan yang sudah diambil.
  - **Bagian C:**
    - tabel C3: `requires` menggantikan `unlock_rule`, dan `quiz[].explanation` ditambahkan;
    - tabel C4: `state` hanya dua nilai, `percent_complete` 50/100, `completed_at` ditambahkan;
    - **tabel baru `quiz_attempts`** dalam format tabel C yang sama.
  - **Bagian D:** baris yang berubah statusnya.

- [ ] **Step 3: Verifikasi akhir**

  Run: `cd server && npm test`
  Expected: semua PASS.

  Run: `cd client && npm run build`
  Expected: sukses.

- [ ] **Step 4: Commit**

  ```bash
  git commit -m "docs: README dan DECISIONS untuk fitur belajar inti"
  ```
