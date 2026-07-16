const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'database.sqlite'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nama TEXT NOT NULL,
    created_at DATETIME DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS berita (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    judul TEXT NOT NULL,
    ringkasan TEXT,
    konten TEXT,
    gambar TEXT,
    kategori TEXT DEFAULT 'berita-desa',
    status TEXT DEFAULT 'published',
    penulis TEXT DEFAULT 'Admin',
    views INTEGER DEFAULT 0,
    tanggal DATETIME DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS galeri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    judul TEXT NOT NULL,
    deskripsi TEXT,
    gambar TEXT,
    tanggal DATETIME DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pengumuman (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    judul TEXT NOT NULL,
    konten TEXT,
    tanggal_acara TEXT,
    lokasi TEXT,
    tanggal DATETIME DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS aparatur (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    jabatan TEXT NOT NULL,
    nip TEXT,
    foto TEXT,
    urutan INTEGER DEFAULT 99
  );

  CREATE TABLE IF NOT EXISTS statistik_desa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jumlah_penduduk INTEGER DEFAULT 0,
    jumlah_kk INTEGER DEFAULT 0,
    laki_laki INTEGER DEFAULT 0,
    perempuan INTEGER DEFAULT 0,
    jumlah_dusun INTEGER DEFAULT 0,
    luas_wilayah TEXT DEFAULT '0 Ha',
    google_sheet_url TEXT,
    updated_at DATETIME DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pengaduan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    email TEXT,
    no_hp TEXT,
    subjek TEXT NOT NULL,
    pesan TEXT NOT NULL,
    status TEXT DEFAULT 'baru',
    tanggal DATETIME DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pembangunan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    deskripsi TEXT,
    anggaran TEXT,
    sumber_dana TEXT,
    status TEXT DEFAULT 'selesai',
    tahun INTEGER,
    lokasi TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS demografi_desa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kategori TEXT NOT NULL,
    label TEXT NOT NULL,
    pria INTEGER DEFAULT 0,
    wanita INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0
  );
`);

// Migration: Add google_sheet_url to statistik_desa if not exists in older database files
try {
  db.exec("ALTER TABLE statistik_desa ADD COLUMN google_sheet_url TEXT;");
  console.log("✅ Database Migration: Added google_sheet_url column to statistik_desa.");
} catch (e) {
  // Column already exists, ignore error
}

// Seed default admin if not exists
const adminExists = db.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
if (!adminExists) {
  const hashed = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO admins (username, password, nama) VALUES (?, ?, ?)').run('admin', hashed, 'Administrator Desa');
  console.log('✅ Admin default dibuat: admin / admin123');
}

// Seed default statistik
const statsExist = db.prepare('SELECT id FROM statistik_desa LIMIT 1').get();
if (!statsExist) {
  db.prepare('INSERT INTO statistik_desa (jumlah_penduduk, jumlah_kk, laki_laki, perempuan, jumlah_dusun, luas_wilayah) VALUES (?, ?, ?, ?, ?, ?)').run(1250, 312, 635, 615, 3, '245 Ha');
}// Seed sample berita
// Disabled by request to keep news empty at startup
const beritaCount = db.prepare('SELECT COUNT(*) as c FROM berita').get().c;
if (beritaCount > 0) {
  db.prepare('DELETE FROM berita').run();
  console.log('🧹 Berita dikosongkan sesuai permintaan.');
}


// Seed sample aparatur
const aparaturCount = db.prepare('SELECT COUNT(*) as c FROM aparatur').get().c;
if (aparaturCount === 0) {
  const aparatur = [
    { nama: 'YOHANES KEWA BOLI', jabatan: 'Kepala Desa', nip: '-', urutan: 1 },
    { nama: 'MARIA GORETI KEWA', jabatan: 'Sekretaris Desa', nip: '-', urutan: 2 },
    { nama: 'ALBERTUS TENA', jabatan: 'Kaur Umum', nip: '-', urutan: 3 },
    { nama: 'KRISTOFORUS BURA', jabatan: 'Kaur Keuangan', nip: '-', urutan: 4 },
    { nama: 'MARGARETA NONA', jabatan: 'Kaur Pemerintahan', nip: '-', urutan: 5 },
    { nama: 'STEFANUS KORO', jabatan: 'Kaur Pembangunan', nip: '-', urutan: 6 },
    { nama: 'BERNADETA SARE', jabatan: 'Kasi Pelayanan', nip: '-', urutan: 7 },
    { nama: 'MARKUS DOSI', jabatan: 'Kepala Dusun I', nip: '-', urutan: 8 },
    { nama: 'BENEDIKTUS LELO', jabatan: 'Kepala Dusun II', nip: '-', urutan: 9 },
    { nama: 'ANASTASIA WUKA', jabatan: 'Operator Desa', nip: '-', urutan: 10 },
  ];
  const insertAparatur = db.prepare('INSERT INTO aparatur (nama, jabatan, nip, urutan) VALUES (?, ?, ?, ?)');
  aparatur.forEach(a => insertAparatur.run(a.nama, a.jabatan, a.nip, a.urutan));
}

// Seed sample pengumuman
const pengumumanCount = db.prepare('SELECT COUNT(*) as c FROM pengumuman').get().c;
if (pengumumanCount === 0) {
  const pengumuman = [
    {
      judul: 'Jadwal Pelayanan Kantor Desa Persiapan Kiera',
      konten: 'Kantor Desa Persiapan Kiera melayani masyarakat setiap hari kerja Senin - Jumat pukul 08.00 - 14.00 WITA. Sabtu dan Minggu kantor tutup.',
      tanggal_acara: '2025-01-01',
      lokasi: 'Kantor Desa Persiapan Kiera'
    },
    {
      judul: 'Pengumuman: Pendaftaran Peserta BLT Dana Desa',
      konten: 'Kepada seluruh warga Desa Persiapan Kiera yang membutuhkan bantuan, harap mendaftarkan diri ke Kantor Desa dengan membawa KTP dan KK. Pendaftaran dibuka hingga akhir bulan.',
      tanggal_acara: '2025-07-31',
      lokasi: 'Kantor Desa Persiapan Kiera'
    },
    {
      judul: 'Agenda Musyawarah Desa Penyusunan RKPDes 2026',
      konten: 'Pemerintah Desa mengundang seluruh elemen masyarakat untuk hadir dalam Musyawarah Desa (MUSDES) penyusunan Rencana Kerja Pemerintah Desa (RKPDes) tahun 2026.',
      tanggal_acara: '2025-08-15',
      lokasi: 'Balai Desa Persiapan Kiera'
    }
  ];
  const insertPengumuman = db.prepare('INSERT INTO pengumuman (judul, konten, tanggal_acara, lokasi) VALUES (?, ?, ?, ?)');
  pengumuman.forEach(p => insertPengumuman.run(p.judul, p.konten, p.tanggal_acara, p.lokasi));
}

// Seed sample pembangunan
const pembangunanCount = db.prepare('SELECT COUNT(*) as c FROM pembangunan').get().c;
if (pembangunanCount === 0) {
  const pembangunan = [
    { nama: 'Pembangunan Jalan Desa Dusun I - Dusun II', deskripsi: 'Pengaspalan jalan penghubung antar dusun sepanjang 500 meter', anggaran: 'Rp. 250.000.000', sumber_dana: 'Dana Desa', status: 'selesai', tahun: 2024, lokasi: 'Dusun I - Dusun II' },
    { nama: 'Renovasi Balai Desa Persiapan Kiera', deskripsi: 'Renovasi total balai desa termasuk atap, dinding, dan lantai', anggaran: 'Rp. 180.000.000', sumber_dana: 'ADD', status: 'selesai', tahun: 2024, lokasi: 'Pusat Desa' },
    { nama: 'Pembangunan Saluran Irigasi Persawahan', deskripsi: 'Pembangunan saluran irigasi untuk mendukung pertanian warga', anggaran: 'Rp. 320.000.000', sumber_dana: 'Dana Desa', status: 'proses', tahun: 2025, lokasi: 'Kawasan Persawahan' },
    { nama: 'Pengadaan Sarana Air Bersih', deskripsi: 'Pemasangan pipa dan bak penampungan air bersih untuk 3 dusun', anggaran: 'Rp. 150.000.000', sumber_dana: 'Dana Desa + Bantuan Provinsi', status: 'rencana', tahun: 2025, lokasi: 'Seluruh Dusun' },
  ];
  const insertPembangunan = db.prepare('INSERT INTO pembangunan (nama, deskripsi, anggaran, sumber_dana, status, tahun, lokasi) VALUES (?,?,?,?,?,?,?)');
  pembangunan.forEach(p => insertPembangunan.run(p.nama, p.deskripsi, p.anggaran, p.sumber_dana, p.status, p.tahun, p.lokasi));
}

// Seed sample demografi
const demografiCount = db.prepare('SELECT COUNT(*) as c FROM demografi_desa').get().c;
if (demografiCount === 0) {
  const sampleDemografi = [
    // Umur (18 groups)
    { kategori: 'umur', label: '0-4', pria: 45, wanita: 42, total: 87 },
    { kategori: 'umur', label: '5-9', pria: 52, wanita: 48, total: 100 },
    { kategori: 'umur', label: '10-14', pria: 58, wanita: 55, total: 113 },
    { kategori: 'umur', label: '15-19', pria: 60, wanita: 58, total: 118 },
    { kategori: 'umur', label: '20-24', pria: 65, wanita: 62, total: 127 },
    { kategori: 'umur', label: '25-29', pria: 70, wanita: 68, total: 138 },
    { kategori: 'umur', label: '30-34', pria: 75, wanita: 72, total: 147 },
    { kategori: 'umur', label: '35-39', pria: 80, wanita: 78, total: 158 },
    { kategori: 'umur', label: '40-44', pria: 82, wanita: 80, total: 162 },
    { kategori: 'umur', label: '45-49', pria: 75, wanita: 74, total: 149 },
    { kategori: 'umur', label: '50-54', pria: 68, wanita: 66, total: 134 },
    { kategori: 'umur', label: '55-59', pria: 55, wanita: 53, total: 108 },
    { kategori: 'umur', label: '60-64', pria: 45, wanita: 42, total: 87 },
    { kategori: 'umur', label: '65-69', pria: 35, wanita: 32, total: 67 },
    { kategori: 'umur', label: '70-74', pria: 25, wanita: 22, total: 47 },
    { kategori: 'umur', label: '75-79', pria: 15, wanita: 12, total: 27 },
    { kategori: 'umur', label: '80-84', pria: 8, wanita: 6, total: 14 },
    { kategori: 'umur', label: '85+', pria: 4, wanita: 2, total: 6 },
    
    // Pendidikan
    { kategori: 'pendidikan', label: 'Tidak/Belum Sekolah', pria: 0, wanita: 0, total: 120 },
    { kategori: 'pendidikan', label: 'Belum Tamat SD/Sederajat', pria: 0, wanita: 0, total: 150 },
    { kategori: 'pendidikan', label: 'Tamat SD/Sederajat', pria: 0, wanita: 0, total: 350 },
    { kategori: 'pendidikan', label: 'SLTP/Sederajat', pria: 0, wanita: 0, total: 280 },
    { kategori: 'pendidikan', label: 'SLTA/Sederajat', pria: 0, wanita: 0, total: 420 },
    { kategori: 'pendidikan', label: 'Diploma I/II', pria: 0, wanita: 0, total: 35 },
    { kategori: 'pendidikan', label: 'Akademi/Diploma III', pria: 0, wanita: 0, total: 45 },
    { kategori: 'pendidikan', label: 'Diploma IV/Strata I', pria: 0, wanita: 0, total: 110 },
    { kategori: 'pendidikan', label: 'Strata II', pria: 0, wanita: 0, total: 15 },
    { kategori: 'pendidikan', label: 'Strata III', pria: 0, wanita: 0, total: 5 },

    // Pekerjaan
    { kategori: 'pekerjaan', label: 'Belum/Tidak Bekerja', pria: 0, wanita: 0, total: 210 },
    { kategori: 'pekerjaan', label: 'Mengurus Rumah Tangga', pria: 0, wanita: 0, total: 340 },
    { kategori: 'pekerjaan', label: 'Pelajar/Mahasiswa', pria: 0, wanita: 0, total: 250 },
    { kategori: 'pekerjaan', label: 'Pensiunan', pria: 0, wanita: 0, total: 20 },
    { kategori: 'pekerjaan', label: 'Pegawai Negeri Sipil (PNS)', pria: 0, wanita: 0, total: 45 },
    { kategori: 'pekerjaan', label: 'Karyawan Swasta', pria: 0, wanita: 0, total: 180 },
    { kategori: 'pekerjaan', label: 'Petani/Pekebun', pria: 0, wanita: 0, total: 420 },
    { kategori: 'pekerjaan', label: 'Nelayan', pria: 0, wanita: 0, total: 15 },
    { kategori: 'pekerjaan', label: 'Wiraswasta', pria: 0, wanita: 0, total: 90 },
    { kategori: 'pekerjaan', label: 'Buruh Harian Lepas', pria: 0, wanita: 0, total: 75 },
    { kategori: 'pekerjaan', label: 'Perangkat Desa', pria: 0, wanita: 0, total: 10 },

    // Wajib Pilih
    { kategori: 'wajib_pilih', label: 'Sudah Wajib Pilih', pria: 0, wanita: 0, total: 1120 },
    { kategori: 'wajib_pilih', label: 'Belum Wajib Pilih', pria: 0, wanita: 0, total: 430 },

    // Perkawinan
    { kategori: 'perkawinan', label: 'Belum Kawin', pria: 0, wanita: 0, total: 620 },
    { kategori: 'perkawinan', label: 'Kawin', pria: 0, wanita: 0, total: 820 },
    { kategori: 'perkawinan', label: 'Cerai Hidup', pria: 0, wanita: 0, total: 45 },
    { kategori: 'perkawinan', label: 'Cerai Mati', pria: 0, wanita: 0, total: 65 },

    // Agama
    { kategori: 'agama', label: 'Islam', pria: 0, wanita: 0, total: 950 },
    { kategori: 'agama', label: 'Kristen (Protestan)', pria: 0, wanita: 0, total: 320 },
    { kategori: 'agama', label: 'Katolik', pria: 0, wanita: 0, total: 230 },
    { kategori: 'agama', label: 'Hindu', pria: 0, wanita: 0, total: 15 },
    { kategori: 'agama', label: 'Buddha', pria: 0, wanita: 0, total: 25 },
    { kategori: 'agama', label: 'Konghucu', pria: 0, wanita: 0, total: 5 },
    { kategori: 'agama', label: 'Lainnya', pria: 0, wanita: 0, total: 5 }
  ];
  
  const insertDemografi = db.prepare('INSERT INTO demografi_desa (kategori, label, pria, wanita, total) VALUES (?, ?, ?, ?, ?)');
  const transaction = db.transaction((rows) => {
    for (const r of rows) {
      insertDemografi.run(r.kategori, r.label, r.pria, r.wanita, r.total);
    }
  });
  transaction(sampleDemografi);
  console.log('✅ Data demografi awal berhasil ditanam.');
}

module.exports = db;
