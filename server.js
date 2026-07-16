const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const db = require('./database');

const app = express();
const PORT = 3000;

// Ensure uploads directory exists
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads', { recursive: true });
if (!fs.existsSync('./uploads/berita')) fs.mkdirSync('./uploads/berita', { recursive: true });
if (!fs.existsSync('./uploads/galeri')) fs.mkdirSync('./uploads/galeri', { recursive: true });
if (!fs.existsSync('./uploads/aparatur')) fs.mkdirSync('./uploads/aparatur', { recursive: true });

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.uploadFolder || 'uploads';
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));
app.use('/uploads', express.static('uploads'));
app.use(session({
  secret: 'desa-persiapan-kiera-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Auth middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.admin) return next();
  res.status(401).json({ error: 'Unauthorized' });
};

// ============= AUTH ROUTES =============
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin) return res.status(401).json({ error: 'Username atau password salah' });
  const valid = bcrypt.compareSync(password, admin.password);
  if (!valid) return res.status(401).json({ error: 'Username atau password salah' });
  req.session.admin = { id: admin.id, username: admin.username, nama: admin.nama };
  res.json({ success: true, admin: { username: admin.username, nama: admin.nama } });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  if (req.session && req.session.admin) {
    res.json({ admin: req.session.admin });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// ============= BERITA ROUTES =============
app.get('/api/berita', (req, res) => {
  const { page = 1, limit = 8, kategori = '', search = '' } = req.query;
  const offset = (page - 1) * limit;
  let where = "WHERE status = 'published'";
  const params = [];
  if (kategori) { where += ' AND kategori = ?'; params.push(kategori); }
  if (search) { where += ' AND (judul LIKE ? OR konten LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  const berita = db.prepare(`SELECT id, judul, ringkasan, gambar, kategori, tanggal, penulis, views FROM berita ${where} ORDER BY tanggal DESC LIMIT ? OFFSET ?`).all(...params, parseInt(limit), parseInt(offset));
  const total = db.prepare(`SELECT COUNT(*) as count FROM berita ${where}`).get(...params).count;
  res.json({ data: berita, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
});

app.get('/api/berita/:id', (req, res) => {
  const berita = db.prepare('SELECT * FROM berita WHERE id = ?').get(req.params.id);
  if (!berita) return res.status(404).json({ error: 'Tidak ditemukan' });
  db.prepare('UPDATE berita SET views = views + 1 WHERE id = ?').run(req.params.id);
  const terkait = db.prepare("SELECT id, judul, gambar, tanggal FROM berita WHERE id != ? AND kategori = ? AND status = 'published' LIMIT 4").all(req.params.id, berita.kategori);
  res.json({ ...berita, terkait });
});

app.get('/api/berita/populer/list', (req, res) => {
  const data = db.prepare("SELECT id, judul, gambar, tanggal, views FROM berita WHERE status = 'published' ORDER BY views DESC LIMIT 5").all();
  res.json(data);
});

app.post('/api/admin/berita', requireAuth, (req, res) => {
  req.uploadFolder = './uploads/berita';
  upload.single('gambar')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    const { judul, ringkasan, konten, kategori, status } = req.body;
    const gambar = req.file ? `/uploads/berita/${req.file.filename}` : null;
    const result = db.prepare("INSERT INTO berita (judul, ringkasan, konten, gambar, kategori, status, penulis, tanggal) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))").run(judul, ringkasan, konten, gambar, kategori, status || 'published', req.session.admin.nama);
    res.json({ success: true, id: result.lastInsertRowid });
  });
});

app.put('/api/admin/berita/:id', requireAuth, (req, res) => {
  req.uploadFolder = './uploads/berita';
  upload.single('gambar')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    const { judul, ringkasan, konten, kategori, status } = req.body;
    const existing = db.prepare('SELECT gambar FROM berita WHERE id = ?').get(req.params.id);
    const gambar = req.file ? `/uploads/berita/${req.file.filename}` : existing?.gambar;
    db.prepare('UPDATE berita SET judul=?, ringkasan=?, konten=?, gambar=?, kategori=?, status=? WHERE id=?').run(judul, ringkasan, konten, gambar, kategori, status, req.params.id);
    res.json({ success: true });
  });
});

app.delete('/api/admin/berita/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM berita WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/admin/berita', requireAuth, (req, res) => {
  const data = db.prepare('SELECT * FROM berita ORDER BY tanggal DESC').all();
  res.json(data);
});

// ============= GALERI ROUTES =============
app.get('/api/galeri', (req, res) => {
  const data = db.prepare('SELECT * FROM galeri ORDER BY tanggal DESC').all();
  res.json(data);
});

app.post('/api/admin/galeri', requireAuth, (req, res) => {
  req.uploadFolder = './uploads/galeri';
  upload.single('gambar')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    const { judul, deskripsi } = req.body;
    const gambar = req.file ? `/uploads/galeri/${req.file.filename}` : null;
    db.prepare('INSERT INTO galeri (judul, deskripsi, gambar, tanggal) VALUES (?, ?, ?, datetime("now"))').run(judul, deskripsi, gambar);
    res.json({ success: true });
  });
});

app.delete('/api/admin/galeri/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM galeri WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.put('/api/admin/galeri/:id', requireAuth, (req, res) => {
  req.uploadFolder = './uploads/galeri';
  upload.single('gambar')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    const { judul, deskripsi } = req.body;
    const existing = db.prepare('SELECT gambar FROM galeri WHERE id = ?').get(req.params.id);
    const gambar = req.file ? `/uploads/galeri/${req.file.filename}` : existing?.gambar;
    db.prepare('UPDATE galeri SET judul=?, deskripsi=?, gambar=? WHERE id=?').run(judul, deskripsi, gambar, req.params.id);
    res.json({ success: true });
  });
});


// ============= PENGUMUMAN ROUTES =============
app.get('/api/pengumuman', (req, res) => {
  const data = db.prepare('SELECT * FROM pengumuman ORDER BY tanggal DESC').all();
  res.json(data);
});

app.post('/api/admin/pengumuman', requireAuth, (req, res) => {
  const { judul, konten, tanggal_acara, lokasi } = req.body;
  db.prepare('INSERT INTO pengumuman (judul, konten, tanggal_acara, lokasi, tanggal) VALUES (?, ?, ?, ?, datetime("now"))').run(judul, konten, tanggal_acara, lokasi);
  res.json({ success: true });
});

app.put('/api/admin/pengumuman/:id', requireAuth, (req, res) => {
  const { judul, konten, tanggal_acara, lokasi } = req.body;
  db.prepare('UPDATE pengumuman SET judul=?, konten=?, tanggal_acara=?, lokasi=? WHERE id=?').run(judul, konten, tanggal_acara, lokasi, req.params.id);
  res.json({ success: true });
});

app.delete('/api/admin/pengumuman/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM pengumuman WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ============= APARATUR ROUTES =============
app.get('/api/aparatur', (req, res) => {
  const data = db.prepare('SELECT * FROM aparatur ORDER BY urutan ASC').all();
  res.json(data);
});

app.post('/api/admin/aparatur', requireAuth, (req, res) => {
  req.uploadFolder = './uploads/aparatur';
  upload.single('foto')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    const { nama, jabatan, nip, urutan } = req.body;
    const foto = req.file ? `/uploads/aparatur/${req.file.filename}` : null;
    db.prepare('INSERT INTO aparatur (nama, jabatan, nip, foto, urutan) VALUES (?, ?, ?, ?, ?)').run(nama, jabatan, nip, foto, urutan || 99);
    res.json({ success: true });
  });
});

app.put('/api/admin/aparatur/:id', requireAuth, (req, res) => {
  req.uploadFolder = './uploads/aparatur';
  upload.single('foto')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    const { nama, jabatan, nip, urutan } = req.body;
    const existing = db.prepare('SELECT foto FROM aparatur WHERE id = ?').get(req.params.id);
    const foto = req.file ? `/uploads/aparatur/${req.file.filename}` : existing?.foto;
    db.prepare('UPDATE aparatur SET nama=?, jabatan=?, nip=?, foto=?, urutan=? WHERE id=?').run(nama, jabatan, nip, foto, urutan, req.params.id);
    res.json({ success: true });
  });
});

app.delete('/api/admin/aparatur/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM aparatur WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ============= STATISTIK ROUTES =============
app.get('/api/statistik', (req, res) => {
  const stats = db.prepare('SELECT * FROM statistik_desa ORDER BY id DESC LIMIT 1').get() || {};
  const demografiRaw = db.prepare('SELECT kategori, label, pria, wanita, total FROM demografi_desa ORDER BY id ASC').all();
  
  // Group demographics by category
  const demografi = {};
  demografiRaw.forEach(row => {
    if (!demografi[row.kategori]) {
      demografi[row.kategori] = [];
    }
    demografi[row.kategori].push(row);
  });
  
  stats.demografi = demografi;
  res.json(stats);
});

app.put('/api/admin/statistik', requireAuth, (req, res) => {
  const { jumlah_penduduk, jumlah_kk, laki_laki, perempuan, jumlah_dusun, luas_wilayah } = req.body;
  const existing = db.prepare('SELECT id FROM statistik_desa LIMIT 1').get();
  if (existing) {
    db.prepare('UPDATE statistik_desa SET jumlah_penduduk=?, jumlah_kk=?, laki_laki=?, perempuan=?, jumlah_dusun=?, luas_wilayah=? WHERE id=?').run(jumlah_penduduk, jumlah_kk, laki_laki, perempuan, jumlah_dusun, luas_wilayah, existing.id);
  } else {
    db.prepare('INSERT INTO statistik_desa (jumlah_penduduk, jumlah_kk, laki_laki, perempuan, jumlah_dusun, luas_wilayah) VALUES (?,?,?,?,?,?)').run(jumlah_penduduk, jumlah_kk, laki_laki, perempuan, jumlah_dusun, luas_wilayah);
  }
  res.json({ success: true });
});

app.put('/api/admin/demografi', requireAuth, (req, res) => {
  const data = req.body; // Expects array: [{ kategori, label, pria, wanita, total }, ...]
  if (!Array.isArray(data)) {
    return res.status(400).json({ error: 'Data demografi harus berupa array' });
  }
  
  try {
    const deleteOld = db.prepare('DELETE FROM demografi_desa');
    const insert = db.prepare('INSERT INTO demografi_desa (kategori, label, pria, wanita, total) VALUES (?, ?, ?, ?, ?)');
    
    const transaction = db.transaction((rows) => {
      deleteOld.run();
      for (const row of rows) {
        insert.run(row.kategori, row.label, row.pria || 0, row.wanita || 0, row.total || 0);
      }
    });
    
    transaction(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memperbarui data demografi: ' + err.message });
  }
});

// ============= PENGADUAN ROUTES =============
app.get('/api/admin/pengaduan', requireAuth, (req, res) => {
  const data = db.prepare('SELECT * FROM pengaduan ORDER BY tanggal DESC').all();
  res.json(data);
});

app.post('/api/pengaduan', (req, res) => {
  const { nama, email, subjek, pesan, no_hp } = req.body;
  db.prepare("INSERT INTO pengaduan (nama, email, no_hp, subjek, pesan, tanggal, status) VALUES (?,?,?,?,?,datetime('now'),'baru')").run(nama, email, no_hp, subjek, pesan);
  res.json({ success: true });
});

app.put('/api/admin/pengaduan/:id', requireAuth, (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE pengaduan SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ success: true });
});

// ============= DASHBOARD STATS =============
app.get('/api/admin/dashboard', requireAuth, (req, res) => {
  const totalBerita = db.prepare('SELECT COUNT(*) as c FROM berita').get().c;
  const totalGaleri = db.prepare('SELECT COUNT(*) as c FROM galeri').get().c;
  const totalPengumuman = db.prepare('SELECT COUNT(*) as c FROM pengumuman').get().c;
  const totalPengaduan = db.prepare("SELECT COUNT(*) as c FROM pengaduan WHERE status = 'baru'").get().c;
  const beritaTerbaru = db.prepare('SELECT id, judul, tanggal, kategori FROM berita ORDER BY tanggal DESC LIMIT 5').all();
  const pengaduanTerbaru = db.prepare('SELECT * FROM pengaduan ORDER BY tanggal DESC LIMIT 5').all();
  res.json({ totalBerita, totalGaleri, totalPengumuman, totalPengaduan, beritaTerbaru, pengaduanTerbaru });
});

// ============= PEMBANGUNAN ROUTES =============
app.get('/api/pembangunan', (req, res) => {
  const data = db.prepare('SELECT * FROM pembangunan ORDER BY tahun DESC').all();
  res.json(data);
});

app.post('/api/admin/pembangunan', requireAuth, (req, res) => {
  const { nama, deskripsi, anggaran, sumber_dana, status, tahun, lokasi } = req.body;
  db.prepare('INSERT INTO pembangunan (nama, deskripsi, anggaran, sumber_dana, status, tahun, lokasi) VALUES (?,?,?,?,?,?,?)').run(nama, deskripsi, anggaran, sumber_dana, status, tahun, lokasi);
  res.json({ success: true });
});

app.delete('/api/admin/pembangunan/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM pembangunan WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.put('/api/admin/pembangunan/:id', requireAuth, (req, res) => {
  const { nama, deskripsi, anggaran, sumber_dana, status, tahun, lokasi } = req.body;
  db.prepare('UPDATE pembangunan SET nama=?, deskripsi=?, anggaran=?, sumber_dana=?, status=?, tahun=?, lokasi=? WHERE id=?')
    .run(nama, deskripsi, anggaran, sumber_dana, status, tahun, lokasi, req.params.id);
  res.json({ success: true });
});


// ============= DATABASE VIEW ROUTES =============
app.get('/api/admin/database/tables/:table', requireAuth, (req, res) => {
  const allowedTables = ['admins', 'berita', 'galeri', 'pengumuman', 'aparatur', 'statistik_desa', 'pengaduan', 'pembangunan'];
  const table = req.params.table;
  if (!allowedTables.includes(table)) {
    return res.status(400).json({ error: 'Tabel tidak valid atau tidak diizinkan' });
  }
  try {
    const records = db.prepare(`SELECT * FROM ${table} ORDER BY id DESC`).all();
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    res.json({ table, columns, records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend pages
app.get('/admin', (req, res) => res.redirect('/admin/login.html'));
app.get('/admin/', (req, res) => res.redirect('/admin/login.html'));

app.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://localhost:${PORT}`);
  console.log(`📊 Admin Panel: http://localhost:${PORT}/admin/login.html`);
  console.log(`🔑 Login: admin / admin123`);
});
