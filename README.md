# Gap Check — prototype (frontend + Express + MongoDB)

Prototipe untuk skripsi *Pengembangan Aplikasi Web-Based Assessment Untuk
Mendeteksi Skill Gap Pemrograman Dalam Web Development*.

Tahap ini memakai MongoDB (Mongoose) untuk seluruh data, tetapi **belum** memakai
Judge0: eksekusi kode masih disimulasikan oleh `fakeJudge0()`. Bentuk endpoint,
nama koleksi, nama field, dan fungsi klasifikasi sudah final — sehingga fase
berikutnya hanya mengganti lapisan eksekusi, bukan kontrak API atau UI.

Kunci jawaban MCQ dan test case tersembunyi (*hidden*) tidak pernah dikirim ke
klien. Kuis modul dinilai di server lewat `POST /modules/:id/quiz/attempts`;
kunci dan penjelasan baru dikirim setelah percobaan lulus (≥ 70%).

## Mulai cepat

Untuk anggota kelompok yang ingin langsung membuka web-nya. Rinciannya ada di
bagian [Menjalankan](#menjalankan) di bawah.

1. Pasang **Git**, **Node.js ≥ 22.9**, dan **Docker Desktop**, lalu buka Docker Desktop.
2. Ambil kode dan pindah ke branch terbaru:
   ```bash
   git clone https://github.com/HoseaJonathan/GapCheck.git
   cd GapCheck
   git checkout feat/mongodb-data-layer
   docker compose up -d
   ```
3. Terminal kedua, dari folder `GapCheck`:
   ```bash
   cd server
   copy .env.example .env
   npm install
   npm run seed
   npm run dev
   ```
4. Terminal ketiga, dari folder `GapCheck`:
   ```bash
   cd client
   npm install
   npm run dev
   ```
5. Buka **http://localhost:5173**, login dengan `hosea@gapcheck.test` atau
   `nadia@gapcheck.test` (password `password123`), lalu ikuti
   [Yang bisa dicoba](#yang-bisa-dicoba).

## Menjalankan

### Prasyarat

| Alat | Versi | Cek |
| --- | --- | --- |
| Git | apa saja | `git --version` |
| Node.js | **≥ 22.9** (skrip npm memakai `--env-file-if-exists`) | `node -v` |
| Docker Desktop | apa saja, **harus sudah dibuka** sebelum langkah 2 | `docker info` |

### Pertama kali

Perintah di bawah ditulis satu per baris, jadi bisa dijalankan di PowerShell,
CMD, maupun Git Bash. Butuh **tiga jendela terminal**: satu untuk perintah
sekali jalan, satu untuk server, satu untuk klien.

**1. Ambil kode**

```bash
git clone https://github.com/HoseaJonathan/GapCheck.git
cd GapCheck
git checkout feat/mongodb-data-layer
```

Versi dengan MongoDB dan fitur belajar ada di branch `feat/mongodb-data-layer`
selama Pull Request-nya belum di-merge ke `main`. Setelah di-merge, baris
`git checkout` tidak diperlukan lagi.

**Sudah pernah clone sebelumnya?** Tidak perlu clone ulang. Dari folder
`GapCheck`:

```bash
git fetch
git checkout feat/mongodb-data-layer
git pull
```

Lalu lanjutkan langkah 2–4 di bawah, termasuk `npm install` dan `npm run seed`,
karena dependency dan data contohnya berubah.

**2. Nyalakan MongoDB** (dari folder root repo, Docker Desktop harus sudah jalan)

```bash
docker compose up -d
```

MongoDB 7 berjalan di `localhost:27017` (container `gapcheck-mongo-1`). Datanya
disimpan di volume Docker `gapcheck_gapcheck-mongo`, jadi tidak hilang saat komputer
dimatikan. Nama proyek dikunci di `docker-compose.yml` (`name: gapcheck`), sehingga
salinan repo di folder mana pun memakai database yang sama.

**3. Siapkan server dan isi data contoh** (terminal 2, dari folder root repo)

```bash
cd server
copy .env.example .env
npm install
npm run seed
npm run dev
```

`copy` untuk PowerShell/CMD; di Git Bash pakai `cp .env.example .env`. Server
siap kalau muncul `API on http://localhost:4000`. Biarkan terminal ini terbuka.

**4. Jalankan klien** (terminal 3, dari folder root repo)

```bash
cd client
npm install
npm run dev
```

Buka **http://localhost:5173**. Klien meneruskan `/api/*` ke server di port
4000, jadi server dari langkah 3 harus tetap jalan.

### Hari berikutnya

Langkah 1 dan `npm install` tidak perlu diulang. Cukup:

1. buka Docker Desktop, lalu `docker compose up -d` di root repo;
2. `npm run dev` di `server/`;
3. `npm run dev` di `client/`.

Setelah `git pull` yang mengubah `package.json`, jalankan `npm install` lagi di
folder yang berubah. Setelah `git pull` yang mengubah `server/src/seed/`,
jalankan `npm run seed` lagi.

### Login demo

Keduanya memakai password `password123`. Tombol "Isi akun demo" di halaman
login mengisi akun hosea.

- `hosea@gapcheck.test` — level beginner, 5 sesi asesmen; untuk melihat
  Overview, Result, Progress, dan modul. Modul 1 sudah lulus dan modul 2 baru
  dibuka (progres 50%), jadi modul berikutnya adalah modul 2. Asesmen ulangnya
  terkunci sampai langkah async (modul 2–4) selesai; setelah modul 4 lulus,
  tombol asesmen ulang aktif.
- `nadia@gapcheck.test` — belum pernah mengerjakan diagnostik; untuk mencoba
  asesmen dari awal. Setelah diagnostik selesai, asesmen ulangnya terkunci
  sampai satu langkah path selesai.

`npm run seed` mengosongkan lalu mengisi ulang database, jadi aman dijalankan
berulang kali — pakai juga untuk mengembalikan data demo ke kondisi awal.

### Yang bisa dicoba

**Sebagai hosea** (sudah punya hasil diagnostik):

1. **Overview** menunjukkan modul berikutnya (modul 2) dan tombol "Asesmen ulang"
   yang masih terkunci beserta alasannya.
2. **Result** dan **Progress** menampilkan skor 168/290 = 57,93%, akurasi per
   topik (async paling lemah), dan grafik lima sesi.
3. Buka **modul 3**: modul ini terkunci dan isinya tidak ditampilkan.
4. Buka **modul 2**, kerjakan kuis dengan jawaban salah: hanya skor yang muncul.
   Tekan "Coba lagi", jawab dengan benar: pembahasan muncul dan modul 3 terbuka.
5. Luluskan modul 3 dan 4: tombol "Asesmen ulang" di Overview menjadi aktif.

**Sebagai nadia** (belum pernah tes):

1. Overview mengajak mulai diagnostik.
2. Kerjakan diagnostik sampai tekan "Selesai", lalu lihat Result.
3. Kembali ke Overview: jalur belajar sesuai level sudah muncul, dan asesmen ulang
   terkunci sampai satu langkah jalur selesai.

Setelah selesai mencoba, jalankan `npm run seed` di `server/` untuk
mengembalikan semua data ke kondisi awal.

**Mematikan aplikasi:** tekan Ctrl+C di terminal server dan terminal klien, lalu
`docker compose down` di root repo (data tetap tersimpan).

### Kalau ada masalah

| Gejala | Penyebab dan solusi |
| --- | --- |
| `MongoDB tidak terjangkau di mongodb://localhost:27017/gapcheck` | Docker Desktop belum dibuka atau container belum jalan. Buka Docker Desktop, lalu `docker compose up -d` di root repo. |
| `docker: error during connect ... dockerDesktopLinuxEngine` | Docker Desktop belum selesai menyala. Tunggu sampai statusnya *running*, lalu ulangi. |
| `bad option: --env-file-if-exists` | Node terlalu lama. Pasang Node.js 22.9 atau lebih baru. |
| `EADDRINUSE` / `Port 5173 is in use` / port 4000 dipakai | Ada server lain (mungkin salinan repo lain) di port itu. Hentikan dengan Ctrl+C di terminalnya, lalu jalankan ulang. |
| Halaman terbuka tetapi data kosong / login gagal | Database belum diisi. Jalankan `npm run seed` di `server/`. |
| Hasil hosea berubah dari 168/290 | Ada sesi asesmen baru yang dibuka sebagai hosea. Jalankan `npm run seed` untuk mengembalikannya. |

Untuk mematikan MongoDB: `docker compose down` (data tetap ada). Untuk
menghapus datanya juga: `docker compose down -v`, lalu `npm run seed` lagi
setelah dinyalakan.

### Sebelum sidang

- [ ] Jalankan ulang `npm run seed` (di `server/`) tepat sebelum demo, supaya
      data hosea kembali ke sesi kanonik 168/290.
- [ ] Jangan membuka layar Assessment sebagai hosea sebelum atau saat demo hasil.
      Setiap kunjungan membuka sesi baru; sesi itu bisa kedaluwarsa, selesai
      otomatis, lalu menggantikan hasil kanonik di Result, Progress, dan Overview.
      Untuk mendemokan asesmen, pakai akun nadia.

## Data demo

Bank soal berisi 15 soal (puzzle masih statis; keputusan A6 belum diambil).
Path beginner berisi 9 modul lengkap dengan kuis; path new dan intermediate
masing-masing 2 modul contoh.
Empat sesi pertama milik hosea hanyalah snapshot skor tanpa submission, supaya
grafik riwayat punya lima titik. Sesi kelima adalah sesi nyata yang dihitung dari
15 submission: 168/290 = 57,93% → beginner.

## Unit test (bukti untuk BAB 4)

```bash
cd server && npm test
```

137 test: fixture kanonik 168/290 = 57.93% → beginner, boundary value 40/41/70/71,
partisi ekuivalensi 0 dan 100, sesi kosong, soal MCQ, run yang tidak selesai,
model Mongoose, seed, auth, sesi asesmen (termasuk auto-finish saat waktu habis
dan penguncian asesmen ulang), modul, view hasil/progres, aturan belajar murni
(`learning.js`: gating, boundary value kelulusan kuis 70%, kelayakan asesmen
ulang), gating dan kuis bernilai lewat API, serta konten materi (kunci kuis,
rantai `requires`). Test memakai `mongodb-memory-server`, sehingga
**run pertama mengunduh binary MongoDB (~70 MB)**; run berikutnya memakai cache.

## Struktur

```
server/src/scoring.js       classify() — murni, tanpa akses database
server/src/analytics.js     fungsi analitik murni (akurasi per topik/Bloom, delta, dll.)
server/src/learning.js      aturan belajar murni: lockStates, nextModule, gradeQuiz, retakeEligibility
server/src/config.js        EXECUTION_CEILING_MS, SESSION_DURATION_SECONDS, QUIZ_PASS_THRESHOLD
server/src/models/          model Mongoose: User, Question, Submission, AssessmentSession,
                            LearningPath, Module, Progress, QuizAttempt
server/src/services/        logika bisnis: sesi, soal, modul (buka/mulai modul, kuis),
                            progression (status modul, kunci, retakeFor), analisis, view
server/src/routes/          /auth, /questions, /sessions, /submissions, /result, /progress, /modules, /puzzle
server/src/judge/           fakeJudge0.js — stub Judge0
server/src/data/            puzzle.static.js — data Daily Puzzle statis (sampai keputusan A6)
server/src/seed/            data contoh dan skrip `npm run seed`
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
| 7 Learning path      | selesai — penugasan otomatis dari level; modul terkunci berurutan (`requires`) dan asesmen ulang diatur server |
| 8 Modules + progress | selesai — progres tersimpan, gating dan kuis bernilai (lulus ≥ 70%, ulang tanpa batas) berjalan di server |
| 9 Puzzle             | tampil, data statis —**belum disetujui masuk scope** (lihat DECISIONS.md) |
| 10 Testing           | unit test selesai; matriks black box belum ditulis                              |
