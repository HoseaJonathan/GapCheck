/** Tiga learning path, satu per level. module_count tiap langkah dihitung dari koleksi modules. */
export const paths = [
  {
    level: 'beginner',
    title: 'REST API dan React',
    description: 'Lanjutan dari fondasi JavaScript menuju integrasi klien-server. Kamu belajar menulis kode asinkron yang benar, membangun REST API dengan Express, lalu menampilkan datanya di React.',
    overview: 'Jalur ini untuk kamu yang sudah menguasai dasar JavaScript tetapi belum bisa menghubungkan klien dengan server. Kamu mulai dari kode asinkron, karena request ke server selalu asinkron, lalu membangun REST API dengan Express, dan terakhir menampilkan data dari API itu di React. Setiap modul dibuka setelah kuis modul sebelumnya lulus.',
    outcomes: [
      'Menjelaskan perbedaan callback, Promise, dan async/await, serta menangani error asinkron.',
      'Membuat rute Express yang membaca parameter, memvalidasi input, dan membalas status code yang tepat.',
      'Mengambil data dari API di komponen React dengan state loading, error, dan cleanup.',
    ],
    steps: [
      { title: 'JavaScript asinkron', topic: 'async', reason: 'Tiga soal async gagal seluruhnya — ini yang paling menahan skor.' },
      { title: 'REST API dengan Express', topic: 'rest-api', reason: 'Soal GET /questions gagal di validasi parameter, bukan di routing.' },
      { title: 'React state dan data fetching', topic: 'react', reason: 'Belum diuji pada diagnostik; dibuka setelah dua langkah di atas.' },
    ],
  },
  {
    level: 'new',
    title: 'Fondasi JavaScript',
    description: 'Membangun dasar bahasa dan DOM sebelum masuk ke aplikasi web. Kamu belajar variabel, tipe data, dan fungsi, lalu memakainya untuk membuat halaman yang merespons pengguna dan mengolah data array.',
    overview: 'Jalur ini untuk kamu yang baru mulai belajar pemrograman web. Kamu mulai dari mengingat istilah dan bentuk penulisan dasar JavaScript, yaitu variabel, tipe data, operator, dan fungsi. Setelah itu kamu memahami cara JavaScript membandingkan nilai, lalu memakai semuanya untuk membuat halaman yang merespons klik dan menampilkan data dari array. Setiap modul dibuka setelah kuis modul sebelumnya lulus.',
    outcomes: [
      'Menyebutkan tipe data JavaScript dan memilih const atau let dengan tepat.',
      'Menulis fungsi dan arrow function yang mengembalikan nilai yang benar.',
      'Memilih elemen DOM, menangani event, dan menampilkan hasil map, filter, dan reduce di halaman.',
    ],
    steps: [
      { title: 'Dasar JavaScript', topic: 'javascript', reason: 'Variabel, operator, dan fungsi adalah dasar bagi semua topik berikutnya.' },
      { title: 'Manipulasi DOM', topic: 'dom', reason: 'Memahami DOM membuat kamu bisa membuat halaman yang merespons pengguna.' },
      { title: 'Method array', topic: 'array-methods', reason: 'map, filter, dan reduce dipakai di hampir setiap kode JavaScript modern.' },
    ],
  },
  {
    level: 'intermediate',
    title: 'Arsitektur aplikasi MERN',
    description: 'Menyatukan kode asinkron, server Express, dan antarmuka React. Kamu belajar membuat aplikasi tetap andal saat gagal sementara dan menyusun server yang mudah dirawat.',
    overview: 'Jalur ini untuk kamu yang sudah bisa membuat API dan antarmuka secara terpisah, dan sekarang perlu membuat keduanya andal saat digabung. Kamu belajar menangani kegagalan sementara dengan retry, menyusun middleware Express agar server mudah dirawat, dan menghubungkan komponen React dengan data server.',
    outcomes: [
      'Menerapkan retry dengan exponential backoff dan jitter pada request yang gagal sementara.',
      'Menyusun middleware Express dalam urutan yang benar, termasuk middleware 404 dan error.',
    ],
    steps: [
      { title: 'Pola asinkron lanjutan', topic: 'async', reason: 'Retry, paralelisme, dan penanganan error menentukan keandalan aplikasi.' },
      { title: 'Arsitektur Express', topic: 'express', reason: 'Middleware dan pemisahan lapisan menjaga server tetap mudah dirawat.' },
      { title: 'React dan data server', topic: 'react', reason: 'Menghubungkan komponen dengan API adalah langkah terakhir menuju aplikasi utuh.' },
    ],
  },
];
