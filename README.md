# Gap Check — prototype (frontend + Express + MongoDB)

Prototipe untuk skripsi *Pengembangan Aplikasi Web-Based Assessment Untuk
Mendeteksi Skill Gap Pemrograman Dalam Web Development*.

Tahap ini memakai MongoDB (Mongoose) untuk seluruh data, tetapi **belum** memakai
Judge0: eksekusi kode masih disimulasikan oleh `fakeJudge0()`. Bentuk endpoint,
nama koleksi, nama field, dan fungsi klasifikasi sudah final — sehingga fase
berikutnya hanya mengganti lapisan eksekusi, bukan kontrak API atau UI.

Kunci jawaban MCQ dan test case tersembunyi (*hidden*) tidak pernah dikirim ke
klien. Kuis modul diperiksa lewat `POST /modules/:id/quiz/:index/check` (tanpa
status; kuis bernilai adalah sub-proyek 2).

## Menjalankan

Tiga langkah (MongoDB, server, klien):

```bash
docker compose up -d                                                   # MongoDB 7 di localhost:27017
cd server && cp .env.example .env && npm install && npm run seed && npm run dev   # http://localhost:4000
cd client && npm install && npm run dev                                # http://localhost:5173
```

Login demo (keduanya `password123`):

- `hosea@gapcheck.test` — level beginner, 5 sesi asesmen (otomatis dipakai klien).
- `nadia@gapcheck.test` — belum pernah mengerjakan diagnostik.

`npm run seed` mengosongkan lalu mengisi ulang database, jadi aman dijalankan
berulang kali.

## Data demo

Bank soal berisi 15 soal (puzzle masih statis; keputusan A6 belum diambil).
Empat sesi pertama milik hosea hanyalah snapshot skor tanpa submission, supaya
grafik riwayat punya lima titik. Sesi kelima adalah sesi nyata yang dihitung dari
15 submission: 168/290 = 57,93% → beginner.

## Unit test (bukti untuk BAB 4)

```bash
cd server && npm test
```

90 test: fixture kanonik 168/290 = 57.93% → beginner, boundary value 40/41/70/71,
partisi ekuivalensi 0 dan 100, sesi kosong, soal MCQ, run yang tidak selesai,
model Mongoose, seed, auth, sesi asesmen (termasuk auto-finish saat waktu habis),
modul, dan view hasil/progres. Test memakai `mongodb-memory-server`, sehingga
**run pertama mengunduh binary MongoDB (~70 MB)**; run berikutnya memakai cache.

## Struktur

```
server/src/scoring.js       classify() — murni, tanpa akses database
server/src/analytics.js     fungsi analitik murni (akurasi per topik/Bloom, delta, dll.)
server/src/config.js        EXECUTION_CEILING_MS, SESSION_DURATION_SECONDS
server/src/models/          model Mongoose: User, Question, Submission, AssessmentSession,
                            LearningPath, Module, Progress
server/src/services/        logika bisnis: sesi, soal, modul, analisis, view
server/src/routes/          /auth, /questions, /sessions, /submissions, /result, /progress, /modules, /puzzle
server/src/judge/           fakeJudge0.js — stub Judge0
server/src/seed/            data contoh dan skrip `npm run seed`; field EXTRA ditandai komentar
client/src/styles/tokens.css  design token (warna, skala tipografi, split sans/mono)
client/src/screens/         Overview, Progress, Result, Module, Assessment, Puzzle
docs/DECISIONS.md           kontradiksi mockup vs BAB 3 + usulan revisi tabel
```

## Status per fase

| Fase                 | Status                                                                          |
| -------------------- | ------------------------------------------------------------------------------- |
| 0 Scaffold           | sebagian — docker-compose baru berisi MongoDB; Judge0 belum ditambahkan        |
| 1 Design token       | selesai                                                                         |
| 2 Auth               | selesai (MongoDB) — JWT + bcrypt                                                |
| 3 Question bank      | selesai — model Mongoose, 15 soal                                               |
| 4 Diagnostic session | selesai — sesi tersimpan, auto-expire                                           |
| 5 Judge0             | **stub** — `fakeJudge0()` meniru bentuk respons Judge0                  |
| 6 Classification     | selesai dan teruji                                                              |
| 7 Learning path      | penugasan otomatis dari level, path ter-seed                                    |
| 8 Modules + progress | progres tersimpan, gating belum diberlakukan di server (sub-proyek 2)           |
| 9 Puzzle             | tampil, data statis —**belum disetujui masuk scope** (lihat DECISIONS.md) |
| 10 Testing           | unit test selesai; matriks black box belum ditulis                              |
