const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== SECURITY MIDDLEWARE =====
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'siakad-secret-key-2024-ganti-ini',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // set true jika pakai HTTPS
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000 // 8 jam
  }
}));

// ===== DATABASE HELPER =====
const DB_PATH = path.join(__dirname, 'data', 'db.json');

function readDB() {
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ===== AUTH MIDDLEWARE =====
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Silakan login terlebih dahulu' });
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role)) {
      return res.status(403).json({ error: 'Akses ditolak' });
    }
    next();
  };
}

// ===== AUTH ROUTES =====
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.username === username);
  
  if (!user) return res.status(401).json({ error: 'Username atau password salah' });
  
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Username atau password salah' });
  
  req.session.user = { id: user.id, username: user.username, role: user.role, nama: user.nama, nim: user.nim, nidn: user.nidn, color: user.color };
  res.json({ success: true, user: req.session.user });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json(req.session.user);
});

// ===== MAHASISWA ROUTES =====
app.get('/api/mahasiswa', requireAuth, (req, res) => {
  const db = readDB();
  if (req.session.user.role === 'mahasiswa') {
    const mhs = db.mahasiswa.find(m => m.nim === req.session.user.nim);
    return res.json(mhs ? [mhs] : []);
  }
  res.json(db.mahasiswa);
});

app.post('/api/mahasiswa', requireAuth, requireRole('admin'), (req, res) => {
  const db = readDB();
  const { nim, nama, prodi, angkatan, semester, email, telp, alamat } = req.body;
  if (!nim || !nama) return res.status(400).json({ error: 'NIM dan Nama wajib diisi' });
  if (db.mahasiswa.find(m => m.nim === nim)) return res.status(400).json({ error: 'NIM sudah terdaftar' });
  
  const newMhs = { nim, nama, prodi, angkatan: +angkatan, semester: +(semester||1), email, telp, alamat, ipk: 0, status: 'aktif' };
  db.mahasiswa.push(newMhs);
  writeDB(db);
  res.json({ success: true, data: newMhs });
});

app.put('/api/mahasiswa/:nim', requireAuth, requireRole('admin', 'dosen'), (req, res) => {
  const db = readDB();
  const idx = db.mahasiswa.findIndex(m => m.nim === req.params.nim);
  if (idx === -1) return res.status(404).json({ error: 'Mahasiswa tidak ditemukan' });
  db.mahasiswa[idx] = { ...db.mahasiswa[idx], ...req.body };
  writeDB(db);
  res.json({ success: true, data: db.mahasiswa[idx] });
});

app.delete('/api/mahasiswa/:nim', requireAuth, requireRole('admin'), (req, res) => {
  const db = readDB();
  const idx = db.mahasiswa.findIndex(m => m.nim === req.params.nim);
  if (idx === -1) return res.status(404).json({ error: 'Tidak ditemukan' });
  db.mahasiswa.splice(idx, 1);
  writeDB(db);
  res.json({ success: true });
});

// ===== MATAKULIAH ROUTES =====
app.get('/api/matakuliah', requireAuth, (req, res) => {
  const db = readDB();
  res.json(db.matakuliah);
});

app.post('/api/matakuliah', requireAuth, requireRole('admin'), (req, res) => {
  const db = readDB();
  const { kode, nama } = req.body;
  if (!kode || !nama) return res.status(400).json({ error: 'Kode dan Nama wajib diisi' });
  if (db.matakuliah.find(m => m.kode === kode)) return res.status(400).json({ error: 'Kode sudah ada' });
  db.matakuliah.push({ ...req.body, sks: +req.body.sks, semester: +req.body.semester });
  writeDB(db);
  res.json({ success: true });
});

app.put('/api/matakuliah/:kode', requireAuth, requireRole('admin', 'dosen'), (req, res) => {
  const db = readDB();
  const idx = db.matakuliah.findIndex(m => m.kode === req.params.kode);
  if (idx === -1) return res.status(404).json({ error: 'Tidak ditemukan' });
  db.matakuliah[idx] = { ...db.matakuliah[idx], ...req.body };
  writeDB(db);
  res.json({ success: true, data: db.matakuliah[idx] });
});

app.delete('/api/matakuliah/:kode', requireAuth, requireRole('admin'), (req, res) => {
  const db = readDB();
  const idx = db.matakuliah.findIndex(m => m.kode === req.params.kode);
  if (idx === -1) return res.status(404).json({ error: 'Tidak ditemukan' });
  db.matakuliah.splice(idx, 1);
  writeDB(db);
  res.json({ success: true });
});

// ===== NILAI ROUTES =====
app.get('/api/nilai', requireAuth, (req, res) => {
  const db = readDB();
  if (req.session.user.role === 'mahasiswa') {
    return res.json(db.nilai.filter(n => n.nim === req.session.user.nim));
  }
  res.json(db.nilai);
});

app.post('/api/nilai', requireAuth, requireRole('admin', 'dosen'), (req, res) => {
  const db = readDB();
  const { nim, kode, uts, uas, tugas, hadir } = req.body;
  if (db.nilai.find(n => n.nim === nim && n.kode === kode)) {
    return res.status(400).json({ error: 'Nilai sudah ada, gunakan Edit' });
  }
  const na = Math.round(+uts*0.3 + +uas*0.4 + +tugas*0.2 + +hadir*0.1);
  const grade = calcGrade(na);
  db.nilai.push({ nim, kode, uts:+uts, uas:+uas, tugas:+tugas, hadir:+hadir, nilai_akhir:na, grade });
  writeDB(db);
  res.json({ success: true });
});

app.put('/api/nilai/:nim/:kode', requireAuth, requireRole('admin', 'dosen'), (req, res) => {
  const db = readDB();
  const idx = db.nilai.findIndex(n => n.nim===req.params.nim && n.kode===req.params.kode);
  if (idx === -1) return res.status(404).json({ error: 'Tidak ditemukan' });
  const { uts, uas, tugas, hadir } = req.body;
  const na = Math.round(+uts*0.3 + +uas*0.4 + +tugas*0.2 + +hadir*0.1);
  db.nilai[idx] = { ...db.nilai[idx], uts:+uts, uas:+uas, tugas:+tugas, hadir:+hadir, nilai_akhir:na, grade:calcGrade(na) };
  writeDB(db);
  res.json({ success: true, data: db.nilai[idx] });
});

app.delete('/api/nilai/:nim/:kode', requireAuth, requireRole('admin', 'dosen'), (req, res) => {
  const db = readDB();
  const idx = db.nilai.findIndex(n => n.nim===req.params.nim && n.kode===req.params.kode);
  if (idx === -1) return res.status(404).json({ error: 'Tidak ditemukan' });
  db.nilai.splice(idx, 1);
  writeDB(db);
  res.json({ success: true });
});

// ===== BACKUP ROUTES =====
app.get('/api/backup', requireAuth, requireRole('admin'), (req, res) => {
  const db = readDB();
  res.json(db.backups || []);
});

app.post('/api/backup', requireAuth, requireRole('admin'), (req, res) => {
  const db = readDB();
  const backupData = { mahasiswa: db.mahasiswa, matakuliah: db.matakuliah, nilai: db.nilai };
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.json`;
  const backupPath = path.join(__dirname, 'data', filename);
  
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  
  const entry = {
    id: 'bk' + Date.now(),
    nama: req.body.tipe === 'manual' ? 'Backup Manual' : 'Backup Otomatis',
    waktu: new Date().toLocaleString('id-ID'),
    ukuran: (fs.statSync(backupPath).size / 1024).toFixed(1) + ' KB',
    status: 'sukses',
    tipe: req.body.tipe || 'manual',
    file: filename
  };
  
  if (!db.backups) db.backups = [];
  db.backups.unshift(entry);
  writeDB(db);
  res.json({ success: true, backup: entry });
});

app.delete('/api/backup/:id', requireAuth, requireRole('admin'), (req, res) => {
  const db = readDB();
  const idx = (db.backups||[]).findIndex(b => b.id === req.params.id);
  if (idx !== -1) {
    const b = db.backups[idx];
    const filePath = path.join(__dirname, 'data', b.file);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.backups.splice(idx, 1);
    writeDB(db);
  }
  res.json({ success: true });
});

// ===== STATS (DASHBOARD) =====
app.get('/api/stats', requireAuth, (req, res) => {
  const db = readDB();
  const gradeCount = { A:0, B:0, C:0, D:0, E:0 };
  db.nilai.forEach(n => { const g = n.grade[0]; if (gradeCount[g] !== undefined) gradeCount[g]++; });
  const prodiCount = {};
  db.mahasiswa.forEach(m => { prodiCount[m.prodi] = (prodiCount[m.prodi]||0)+1; });
  const rataIPK = db.mahasiswa.length ? (db.mahasiswa.reduce((s,m) => s+m.ipk, 0) / db.mahasiswa.length).toFixed(2) : 0;
  
  res.json({
    totalMahasiswa: db.mahasiswa.length,
    totalAktif: db.mahasiswa.filter(m=>m.status==='aktif').length,
    totalMatakuliah: db.matakuliah.length,
    totalNilai: db.nilai.length,
    rataIPK,
    gradeCount,
    prodiCount
  });
});

// ===== HELPER =====
function calcGrade(na) {
  if (na >= 85) return 'A';
  if (na >= 80) return 'A-';
  if (na >= 75) return 'B+';
  if (na >= 70) return 'B';
  if (na >= 65) return 'B-';
  if (na >= 60) return 'C+';
  if (na >= 55) return 'C';
  if (na >= 50) return 'D';
  return 'E';
}

// ===== SERVE FRONTEND =====
app.use(express.static(path.join(__dirname, 'public')));
app.get('*any', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`✅ SIAKAD berjalan di http://localhost:${PORT}`);
  console.log(`👤 Login: admin / admin123`);
});