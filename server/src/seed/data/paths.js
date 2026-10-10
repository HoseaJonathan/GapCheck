/** Tiga learning path, satu per level. module_count tiap langkah dihitung dari koleksi modules. */
export const paths = [
  {
    level: 'beginner',
    title: 'REST API dan React',
    description: 'Lanjutan dari fondasi JavaScript menuju integrasi klien-server.',
    steps: [
      { title: 'JavaScript asinkron', topic: 'async', reason: 'Tiga soal async gagal seluruhnya — ini yang paling menahan skor.' },
      { title: 'REST API dengan Express', topic: 'rest-api', reason: 'Soal GET /questions gagal di validasi parameter, bukan di routing.' },
      { title: 'React state dan data fetching', topic: 'react', reason: 'Belum diuji pada diagnostik; dibuka setelah dua langkah di atas.' },
    ],
  },
  {
    level: 'new',
    title: 'Fondasi JavaScript',
    description: 'Membangun dasar bahasa dan DOM sebelum masuk ke aplikasi web.',
    steps: [
      { title: 'Dasar JavaScript', topic: 'javascript', reason: 'Variabel, operator, dan fungsi adalah dasar bagi semua topik berikutnya.' },
      { title: 'Manipulasi DOM', topic: 'dom', reason: 'Memahami DOM membuat kamu bisa membuat halaman yang merespons pengguna.' },
      { title: 'Method array', topic: 'array-methods', reason: 'map, filter, dan reduce dipakai di hampir setiap kode JavaScript modern.' },
    ],
  },
  {
    level: 'intermediate',
    title: 'Arsitektur aplikasi MERN',
    description: 'Menyatukan kode asinkron, server Express, dan antarmuka React.',
    steps: [
      { title: 'Pola asinkron lanjutan', topic: 'async', reason: 'Retry, paralelisme, dan penanganan error menentukan keandalan aplikasi.' },
      { title: 'Arsitektur Express', topic: 'express', reason: 'Middleware dan pemisahan lapisan menjaga server tetap mudah dirawat.' },
      { title: 'React dan data server', topic: 'react', reason: 'Menghubungkan komponen dengan API adalah langkah terakhir menuju aplikasi utuh.' },
    ],
  },
];
