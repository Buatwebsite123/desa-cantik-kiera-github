/**
 * ============================================================
 *  EXPORT DATA - Website Desa Persiapan Kiera
 * ============================================================
 *  Jalankan script ini setelah mengupdate data via Admin Panel:
 *    node export-data.js
 *
 *  Script ini akan mengekspor semua data dari database SQLite
 *  ke file-file JSON di folder /data, sehingga website statis
 *  bisa membacanya tanpa memerlukan server backend.
 * ============================================================
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const db = new Database(path.join(__dirname, 'database.sqlite'));
const dataDir = path.join(__dirname, 'data');

// Pastikan folder /data ada
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function exportJSON(filename, data) {
  const filePath = path.join(dataDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✅ Exported: data/${filename}`);
}

console.log('\n🚀 Memulai export data ke JSON...\n');

// 1. BERITA
try {
  const berita = db.prepare("SELECT * FROM berita WHERE status = 'published' ORDER BY tanggal DESC").all();
  exportJSON('berita.json', berita);
} catch (e) { console.error('❌ Error berita:', e.message); }

// 2. GALERI
try {
  const galeri = db.prepare('SELECT * FROM galeri ORDER BY tanggal DESC').all();
  exportJSON('galeri.json', galeri);
} catch (e) { console.error('❌ Error galeri:', e.message); }

// 3. PENGUMUMAN
try {
  const pengumuman = db.prepare('SELECT * FROM pengumuman ORDER BY tanggal DESC').all();
  exportJSON('pengumuman.json', pengumuman);
} catch (e) { console.error('❌ Error pengumuman:', e.message); }

// 4. APARATUR
try {
  const aparatur = db.prepare('SELECT * FROM aparatur ORDER BY urutan ASC').all();
  exportJSON('aparatur.json', aparatur);
} catch (e) { console.error('❌ Error aparatur:', e.message); }

// 5. STATISTIK + DEMOGRAFI
try {
  const stats = db.prepare('SELECT * FROM statistik_desa ORDER BY id DESC LIMIT 1').get() || {};
  const demografiRaw = db.prepare('SELECT kategori, label, pria, wanita, total FROM demografi_desa ORDER BY id ASC').all();
  const demografi = {};
  demografiRaw.forEach(row => {
    if (!demografi[row.kategori]) demografi[row.kategori] = [];
    demografi[row.kategori].push(row);
  });
  stats.demografi = demografi;
  exportJSON('statistik.json', stats);
} catch (e) { console.error('❌ Error statistik:', e.message); }

// 6. PEMBANGUNAN
try {
  const pembangunan = db.prepare('SELECT * FROM pembangunan ORDER BY tahun DESC').all();
  exportJSON('pembangunan.json', pembangunan);
} catch (e) { console.error('❌ Error pembangunan:', e.message); }

// 7. PROFIL DESA (data statis, bisa disesuaikan)
try {
  const stats = db.prepare('SELECT * FROM statistik_desa ORDER BY id DESC LIMIT 1').get() || {};
  const profil = {
    nama_desa: 'Desa Persiapan Kiera',
    kecamatan: 'Moa',
    kabupaten: 'Maluku Barat Daya',
    provinsi: 'Maluku',
    jumlah_penduduk: stats.jumlah_penduduk || 1250,
    jumlah_kk: stats.jumlah_kk || 312,
    laki_laki: stats.laki_laki || 635,
    perempuan: stats.perempuan || 615,
    jumlah_dusun: stats.jumlah_dusun || 3,
    luas_wilayah: stats.luas_wilayah || '245 Ha',
  };
  exportJSON('profil.json', profil);
} catch (e) { console.error('❌ Error profil:', e.message); }

console.log('\n✨ Export selesai! Semua data tersimpan di folder /data');
console.log('\n📌 Langkah selanjutnya:');
console.log('   1. git add .');
console.log('   2. git commit -m "Update data website"');
console.log('   3. git push');
console.log('   → Website online otomatis diperbarui!\n');
