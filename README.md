# Gap Check — prototype (frontend + Express stub)

Prototipe untuk skripsi *Pengembangan Aplikasi Web-Based Assessment Untuk
Mendeteksi Skill Gap Pemrograman Dalam Web Development*.

Tahap ini **belum** memakai MongoDB dan Judge0. Data disimpan di memori dan
eksekusi kode disimulasikan, tetapi bentuk endpoint, nama koleksi, nama field,
dan fungsi klasifikasi sudah final — sehingga fase berikutnya hanya mengganti
lapisan penyimpanan dan eksekusi, bukan kontrak API atau UI.

## Menjalankan

Dua terminal:

```bash
cd server && npm install && npm run dev     # http://localhost:4000
cd client && npm install && npm run dev     # http://localhost:5173
```

Login demo: `hosea@gapcheck.test` / `password123` (otomatis dipakai klien).

## Unit test (bukti untuk BAB 4)

```bash
cd server && npm test
```

9 test: fixture kanonik 168/290 = 57.93% → beginner, boundary value 40/41/70/71,
partisi ekuivalensi 0 dan 100, sesi kosong, soal MCQ, dan run yang tidak selesai.

## Struktur

```
server/src/scoring.js       classify() — murni, tanpa akses database
server/src/config.js        EXECUTION_CEILING_MS, SESSION_DURATION_SECONDS
server/src/routes/          /auth, /questions, /submit, /submissions, /result, /progress
server/src/data/seed.js     data contoh; field EXTRA ditandai komentar
client/src/styles/tokens.css  design token (warna, skala tipografi, split sans/mono)
client/src/screens/         Overview, Progress, Result, Module, Assessment, Puzzle
docs/DECISIONS.md           kontradiksi mockup vs BAB 3 + usulan revisi tabel
```

## Status per fase

| Fase | Status |
|---|---|
| 0 Scaffold | sebagian — docker-compose Judge0 belum dibuat |
| 1 Design token | selesai |
| 2 Auth | JWT + bcrypt jalan, penyimpanan masih in-memory |
| 3 Question bank | schema lengkap di seed, belum jadi model Mongoose |
| 4 Diagnostic session | UI jalan, timer jalan, sesi belum dipersistensi |
| 5 Judge0 | **stub** — `fakeJudge0()` meniru bentuk respons Judge0 |
| 6 Classification | selesai dan teruji |
| 7 Learning path | penugasan otomatis dari level, path ter-seed |
| 8 Modules + progress | tampil, gating belum diberlakukan di server |
| 9 Puzzle | tampil — **belum disetujui masuk scope** (lihat DECISIONS.md) |
| 10 Testing | unit test selesai; matriks black box belum ditulis |
