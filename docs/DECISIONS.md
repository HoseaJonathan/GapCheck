# Keputusan yang harus diambil sebelum implementasi penuh

Dokumen ini memuat setiap titik di mana **mockup Figma** dan **BAB 3 proposal**
tidak sejalan. Setiap butir harus berakhir sebagai salah satu dari dua hal:
perubahan kode, atau revisi dokumen. Tidak boleh dibiarkan menggantung — penguji
yang membandingkan aplikasi berjalan dengan dokumen akan menemukannya.

Format tiap butir: **apa yang berubah / apa saja tugasnya / siapa lagi yang
terpengaruh**.

---

## A. Kontradiksi

### A1. Partial credit per test case

- **Apa yang berubah.** Layar hasil menampilkan "PARTIAL CREDIT PER TEST CASE"
  dan memberi 88 dari 120 untuk 4 dari 6 soal medium. Flowchart Diagnostic Test
  di BAB 3 bersifat biner: *poin ditambahkan atau tidak*.
- **Tugasnya.** (1) Putuskan biner atau proporsional. (2) Jika proporsional:
  gambar ulang flowchart Diagnostic Test dengan cabang perhitungan rasio test
  case. (3) Tulis ulang narasi penilaian di BAB 3. (4) Set `PARTIAL_CREDIT` di
  `server/src/scoring.js`.
- **Terpengaruh.** Fungsi `classify()`, tabel `submissions` (butuh
  `passed_cases` dan `total_cases`), flowchart, narasi BAB 3, dan seluruh angka
  contoh di BAB 4.
- **Rekomendasi.** Pertahankan partial credit. Fixture kanonik 168/290 hanya
  konsisten dengan partial credit, dan secara pedagogis lebih tepat: mahasiswa
  yang lolos 4 dari 5 kasus memang tidak setara dengan yang lolos nol.
  Prototipe sudah memakai mode ini.
- **Catatan implementasi.** Partial credit hanya berlaku untuk eksekusi yang
  selesai tetapi keluarannya salah (*Wrong Answer*). *Time Limit Exceeded* dan
  *Runtime Error* bernilai nol, sesuai tabel submission di mockup yang
  menampilkan TLE pada 5.00 s dengan 0 poin.

### A2. Bonus point Daily Puzzle terhadap rumus klasifikasi

**Ini kontradiksi paling sensitif saat sidang.**

- **Apa yang berubah.** Halaman Puzzle menyatakan bonus menaikkan skor
  tertimbang dan tidak pernah menurunkan level. Tetapi hasil kanonik tepat
  168/290 tanpa bonus apa pun. Jadi: bonus berada di luar klasifikasi, atau
  rumus di BAB 3 tidak lengkap.
- **Tugasnya.** (1) Tetapkan bahwa bonus **tidak** masuk ke
  `earnedPoints` / `possiblePoints`. (2) Tambahkan satu paragraf di BAB 3 yang
  menyatakan level hanya ditentukan oleh sesi asesmen terukur. (3) Pindahkan
  bonus ke `users.statistics.bonus_points` sebagai metrik motivasi.
- **Terpengaruh.** Rumus di BAB 3, `classify()`, koleksi `puzzles`, validitas
  konstruk instrumen.
- **Rekomendasi.** Bonus di luar klasifikasi. Jika bonus bisa menaikkan level,
  level tidak lagi mengukur kompetensi melainkan ketekunan harian, dan penguji
  akan langsung menanyakan itu. Prototipe sudah memisahkannya.

### A3. Batas waktu eksekusi: 5 detik atau 10 detik

- BAB 3 menyebut ≤10 detik. Modul 04 menyebut "inside the 5-second ceiling" dan
  tabel submission menampilkan verdict Time limit tepat pada 5.00 s.
- **Tugasnya.** Pilih satu angka, jadikan konstanta bernama, samakan di
  konfigurasi Judge0 (`cpu_time_limit`), di teks modul, dan di BAB 3.
- **Terpengaruh.** `server/src/config.js` (`EXECUTION_CEILING_MS`),
  konfigurasi Judge0, kasus uji black box untuk verdict TLE.
- **Rekomendasi.** 5 detik. Lebih ketat, lebih cepat memberi umpan balik, dan
  cukup longgar untuk soal setingkat Intermediate. Prototipe memakai 5000 ms.

### A4. Retake dan checkpoint

- Mockup punya tombol Retake assessment, Checkpoint challenge yang menilai
  ulang, dan riwayat skor lima sesi. Proposal memodelkan satu diagnostik sekali
  saja sebagai boolean `diagnostic_status`.
- **Tugasnya.** Tambah koleksi `assessment_sessions`; ubah `diagnostic_status`
  menjadi turunan (ada tidaknya sesi diagnostik pertama); tambahkan use case
  "Mengulang asesmen" pada use case diagram; tulis aturan kapan retake boleh
  dilakukan (misalnya setelah menyelesaikan minimal satu modul).
- **Terpengaruh.** Use case diagram, class diagram, tabel `users`, halaman
  Progress (grafik lima titik mustahil tanpa koleksi ini).

### A5. Gating modul

- "Locked · pass the module 07 quiz to open", kuis modul lulus pada 70%, satu
  percobaan per soal. Tidak ada dalam enam fungsi perangkat lunak di BAB 3.
- **Tugasnya.** Tambah `modules.unlock_rule` dan koleksi `progress`; tambahkan
  fungsi ketujuh "Mengelola penguncian modul" atau perluas fungsi
  "Menyajikan learning path"; buat activity diagram untuk alur kuis modul.
- **Terpengaruh.** Daftar fungsi perangkat lunak, class diagram, koleksi baru.

### A6. Daily Puzzle sebagai fitur penuh

- Di mockup: streak, 340 poin bonus, bonus per topik, soal diambil dari dua
  topik terlemah, melewatkan satu hari mereset streak tetapi poin tetap.
  Di BAB 3: item nomor 5 pada flowchart, tanpa narasi sama sekali.
- **Tugasnya.** Tulis satu subbab utuh (tujuan, algoritma pemilihan topik,
  aturan streak, kedudukan bonus terhadap klasifikasi) **atau** keluarkan fitur
  ini dari scope.
- **Rekomendasi.** Keputusan tim. Jika waktu terbatas, keluarkan dari scope —
  fitur ini tidak menyumbang apa pun pada pertanyaan penelitian tentang deteksi
  skill gap, dan menambah dua koleksi (`puzzles`, `puzzle_attempts`) yang harus
  ikut diuji. Prototipe tetap menampilkannya agar tim bisa menilai bobotnya.

### A7. Sesi berbatas waktu

- Layar asesmen menjalankan hitung mundur (41:26 tersisa, 38:14 berlalu saat
  selesai). Tidak ada batas waktu dalam proposal.
- **Tugasnya.** Tetapkan durasi, simpan `started_at` dan `elapsed_seconds` pada
  `assessment_sessions`, tambahkan aturan apa yang terjadi saat waktu habis
  (submit otomatis atau sesi hangus), tambahkan kasus uji boundary value pada
  batas waktu.
- **Terpengaruh.** Activity diagram Diagnostic Test, koleksi
  `assessment_sessions`, validitas skor (sesi tak berbatas waktu dan berbatas
  waktu tidak sebanding).
- **Sudah diterapkan di kode.** Saat waktu habis, sesi di-*finish* otomatis oleh
  server dan dinilai dari submission yang sudah masuk; submit setelah batas
  waktu ditolak dengan 409. Aturan ini tinggal ditulis ke activity diagram dan
  narasi BAB 3, beserta kasus uji boundary value pada batas waktu.

---

## B. Dua kesalahan aritmetika pada mockup sendiri

1. **Delta skor.** Tile menampilkan "▲ 11.4 SINCE FIRST TEST", padahal titik
   pertama grafik 34.2 dan hari ini 57.9 — selisihnya 23.7. Angka 11.4 adalah
   kenaikan sejak **Diagnostic 2**. Labelnya yang salah, bukan angkanya.
   API prototipe mengembalikan `delta_since_first` dan `delta_since_previous`
   terpisah agar UI melabeli keduanya dengan benar.
2. **Jumlah modul.** Langkah jalur belajar berisi 6 + 9 + 7 = 22 modul, tetapi
   header dan tile Progress menulis 24. Prototipe menghitung dari langkahnya
   (22) dan mengabaikan angka 24.

---

## C. Usulan revisi tabel basis data (untuk BAB 3)

Baris berikut ditulis dalam gaya tabel BAB 3 yang sudah ada dan siap disalin.

### C1. Tambahan pada tabel `questions`

| Nama Field | Tipe Data | Keterangan |
|---|---|---|
| `type` | String | Jenis soal, bernilai `code` atau `mcq`. Menentukan percabangan pada activity diagram Diagnostic Test. |
| `points` | Number | Bobot poin soal (Easy 10, Medium 20, Hard 30). Menggantikan `weight_score` yang sebelumnya bertipe String padahal digunakan dalam operasi aritmetika. |
| `bloom_level` | String | Tingkat kognitif soal menurut Taksonomi Bloom revisi, ditampilkan sebagai penanda pada layar asesmen dan diagregasi pada panel tingkat kognitif. |
| `tags` | Array of String | Topik yang diukur soal. Bersifat **wajib**, karena panel akurasi per topik dan pemilihan topik puzzle bergantung padanya. |
| `test_cases` | Array of Object | Kumpulan kasus uji `{ stdin, expected_output, is_hidden }`. Menjadi dasar seluruh alur eksekusi Judge0 dan perhitungan partial credit. |
| `options` | Array of Object | Pilihan jawaban `{ key, text }` untuk soal bertipe `mcq`. |
| `correct_answer` | String | Kunci jawaban soal bertipe `mcq`. Tidak pernah dikirim ke klien. |
| `requirements` | Array of String | Daftar ketentuan yang ditampilkan pada panel kiri layar asesmen. |
| `sample` | Object | Contoh `{ request, expected }` yang ditampilkan di bawah daftar ketentuan. |

### C2. Tambahan pada tabel `submissions`

| Nama Field | Tipe Data | Keterangan |
|---|---|---|
| `runtime_ms` | Number | Waktu eksekusi yang dilaporkan Judge0, ditampilkan pada tabel submission terakhir. |
| `memory_kb` | Number | Penggunaan memori yang dilaporkan Judge0. |
| `passed_cases` | Number | Jumlah kasus uji yang lolos, dasar perhitungan partial credit. |
| `total_cases` | Number | Jumlah seluruh kasus uji pada soal terkait. |
| `points_earned` | Number | Poin yang diperoleh submission ini setelah perhitungan partial credit. |

Nilai `verdict` diperluas menjadi empat: `Accepted`, `Wrong Answer`,
`Runtime Error`, dan `Time Limit Exceeded`.

### C3. Tabel baru `modules`

| Nama Field | Tipe Data | Keterangan |
|---|---|---|
| `_id` | ObjectId | Kunci utama modul. |
| `path_id` | ObjectId | Referensi ke `learning_paths`. |
| `order` | Number | Urutan modul di dalam jalur belajar. |
| `title` | String | Judul modul. |
| `topic` | String | Topik modul, sejajar dengan `questions.tags`. |
| `bloom_level` | String | Tingkat kognitif materi modul. |
| `body` | Array of Object | Isi materi berupa blok teks, blok kode, dan kotak penjelasan. |
| `quiz` | Array of Object | Soal pemahaman di akhir modul beserta kunci jawabannya. |
| `estimated_minutes` | Number | Perkiraan waktu penyelesaian. |
| `unlock_rule` | String | Aturan pembukaan modul, bernilai `open` atau `locked` beserta prasyaratnya. |

### C4. Tabel baru `progress`

| Nama Field | Tipe Data | Keterangan |
|---|---|---|
| `_id` | ObjectId | Kunci utama. |
| `user_id` | ObjectId | Referensi ke `users`. |
| `module_id` | ObjectId | Referensi ke `modules`. |
| `percent_complete` | Number | Persentase penyelesaian modul. |
| `state` | String | Status modul: `locked`, `in_progress`, atau `completed`. |
| `last_position` | String | Posisi terakhir pengguna di dalam modul. |
| `updated_at` | Date | Waktu pembaruan terakhir. |

### C5. Tabel baru `assessment_sessions`

| Nama Field | Tipe Data | Keterangan |
|---|---|---|
| `_id` | ObjectId | Kunci utama sesi asesmen. |
| `user_id` | ObjectId | Referensi ke `users`. |
| `kind` | String | Jenis sesi: `diagnostic` atau `checkpoint`. |
| `percentage` | Number | Persentase skor tertimbang pada sesi tersebut. |
| `level` | String | Level hasil klasifikasi pada sesi tersebut. |
| `started_at` | Date | Waktu sesi dimulai. |
| `elapsed_seconds` | Number | Durasi pengerjaan sesi. |

Dengan adanya tabel ini, field `users.diagnostic_status` menjadi turunan dan
dapat dihapus, atau dipertahankan sebagai penanda cepat bahwa sesi diagnostik
pertama telah dilakukan.

### C6. Tabel baru `puzzles` dan `puzzle_attempts`

Hanya ditambahkan apabila keputusan pada butir A6 adalah mempertahankan fitur
Daily Puzzle dalam scope.

---

## D. Yang masih belum memenuhi defense-readiness check

| Butir pemeriksaan | Status |
|---|---|
| Kode sesuai diagram UML | Belum — A4, A5, A7 belum punya diagram. |
| Nama koleksi dan field sesuai tabel basis data | Kode sudah mengikuti C1–C5 (model Mongoose di `server/src/models`); tinggal memasukkan bagian C ke dokumen BAB 3. |
| UI sesuai mockup | Sebagian — enam layar utama sudah dibuat; editor kode masih textarea biasa, belum ada syntax highlighting. |
| Tidak ada perilaku mockup tanpa bagian proposal | Belum — Puzzle, gating modul, timer, dan retake belum punya narasi. |
| Setiap kebutuhan punya kasus uji black box | Sebagian — validasi `?difficulty=` dan 401 sudah diuji; matriks equivalence partitioning dan boundary value analysis belum ditulis. |

### Aturan penilaian yang harus masuk narasi BAB 3

Jika satu soal dikirim lebih dari sekali dalam satu sesi, yang dihitung adalah
**submission dengan poin tertinggi** untuk soal itu, bukan submission terakhir.
Aturan ini sudah dipakai oleh perhitungan skor di server, tetapi belum tertulis
di narasi penilaian maupun flowchart Diagnostic Test BAB 3. Fixture kanonik
168/290 tidak bergantung padanya, karena sesi kanonik hanya berisi satu
submission per soal; aturan ini baru menentukan skor pada sesi nyata ketika
peserta mengirim ulang jawaban. Tulis bersama keputusan A1.
