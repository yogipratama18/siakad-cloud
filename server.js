require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./db");

const User = require("./models/user");
const Mahasiswa = require("./models/mahasiswa");
const Matakuliah = require("./models/matakuliah");
const Nilai = require("./models/nilai");
const Backup = require("./models/backup");

const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/debug-mahasiswa', async (req, res) => {
  const data = await Mahasiswa.find();
  res.json(data);
});

// ===== SECURITY MIDDLEWARE =====
app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({ 
  // Masukkan URL domain Vercel Anda di sini
  origin: 'https://siakad-cloud-rho.vercel.app', 
  credentials: true // Wajib true agar browser mau mengirim cookie/session lintas domain
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Tambahkan baris ini sebelum session untuk mendeteksi apakah aplikasi berjalan di Vercel atau Lokal
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

// 2. Jika di Vercel (Production), aktifkan trust proxy
if (isProduction) {
  app.enable('trust proxy');
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'siakad-secret-key-2024-ganti-ini',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    // JIKA DI LOKAL = false (karena http biasa)
    // JIKA DI VERCEL = true (karena https)
    secure: isProduction, 
    
    httpOnly: true,
    
    // JIKA DI LOKAL = 'lax' (standar browser agar cookie bisa disimpan)
    // JIKA DI VERCEL = 'none' (agar bisa cross-domain jika front-end terpisah)
    sameSite: isProduction ? 'none' : 'lax', 
    
    maxAge: 8 * 60 * 60 * 1000 // 8 jam
  }
}));

// ===== AUTH MIDDLEWARE =====
app.get('/api/auth/me', async (req, res) => {
  try {

    await connectDB();

    if (!req.session.user) {
      return res.status(401).json({
        error: 'Silakan login terlebih dahulu'
      });
    }

    res.json(req.session.user);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role)) {
      return res.status(403).json({ error: 'Akses ditolak' });
    }
    next();
  };
}

// ===== AUTH ROUTES =====
console.log(
  "MONGODB_URI exists:",
  !!process.env.MONGODB_URI
);
app.post('/api/auth/login', async (req, res) => {
  try {

    await connectDB();

    console.log(
      "readyState:",
      mongoose.connection.readyState
    );

    const { username, password } = req.body;

    const user = await User.findOne({
      username
    });

    if (!user) {
      return res.status(401).json({
        error: 'Username atau password salah'
      });
    }

    const valid = await bcrypt.compare(
      password,
      user.password
    );

    if (!valid) {
      return res.status(401).json({
        error: 'Username atau password salah'
      });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      nama: user.nama,
      nim: user.nim,
      nidn: user.nidn,
      color: user.color
    };

    res.json({
      success: true,
      user: req.session.user
    });

  } catch (err) {

    console.error("LOGIN ERROR:", err);

    res.status(500).json({
      error: err.message
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json(req.session.user);

  console.log("LOGIN SESSION ID:", req.sessionID);
console.log("LOGIN USER:", req.session.user);
});

// ===== MAHASISWA ROUTES =====
app.get('/api/mahasiswa', requireAuth, async (req, res) => {
  try {

    console.log("=== CREATE MAHASISWA ===");
    if (req.session.user.role === 'mahasiswa') {
      const mhs = await Mahasiswa.findOne({
        nim: req.session.user.nim
      });

      return res.json(mhs ? [mhs] : []);
    }

    const mahasiswa = await Mahasiswa.find();
    res.json(mahasiswa);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/mahasiswa', requireAuth, requireRole('admin'), async (req, res) => {
  try {

    const existing = await Mahasiswa.findOne({
      nim: req.body.nim
    });

    if (existing) {
      return res.status(400).json({
        error: 'NIM sudah terdaftar'
      });
    }

    const mahasiswa = await Mahasiswa.create({
      ...req.body,
      semester: Number(req.body.semester || 1),
      angkatan: Number(req.body.angkatan),
      ipk: 0,
      status: 'aktif'
    });

    res.json({
      success: true,
      data: mahasiswa
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/mahasiswa/:nim', requireAuth, requireRole('admin','dosen'), async (req,res)=>{
  try {

    const mahasiswa = await Mahasiswa.findOneAndUpdate(
      { nim: req.params.nim },
      req.body,
      { new:true }
    );

    if (!mahasiswa) {
      return res.status(404).json({
        error:'Mahasiswa tidak ditemukan'
      });
    }

    res.json({
      success:true,
      data: mahasiswa
    });

  } catch(err){
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/mahasiswa/:nim', requireAuth, requireRole('admin'), async (req,res)=>{
  try {

    await Mahasiswa.deleteOne({
      nim:req.params.nim
    });

    res.json({ success:true });

  } catch(err){
    res.status(500).json({ error: err.message });
  }
});

// ===== MATAKULIAH ROUTES =====
app.get('/api/matakuliah', requireAuth, async (req, res) => {
  try {

    const data = await Matakuliah.find();

    res.json(data);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

app.post('/api/matakuliah',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {

    try {

      const exist = await Matakuliah.findOne({
        kode: req.body.kode
      });

      if (exist) {
        return res.status(400).json({
          error: 'Kode sudah ada'
        });
      }

      const mk = await Matakuliah.create({
        ...req.body,
        sks: Number(req.body.sks),
        semester: Number(req.body.semester)
      });

      res.json({
        success: true,
        data: mk
      });

    } catch (err) {
      res.status(500).json({
        error: err.message
      });
    }
});

app.put('/api/matakuliah/:kode',
  requireAuth,
  requireRole('admin','dosen'),
  async (req, res) => {

    try {

      const mk = await Matakuliah.findOneAndUpdate(
        { kode: req.params.kode },
        req.body,
        { new: true }
      );

      if (!mk) {
        return res.status(404).json({
          error: 'Tidak ditemukan'
        });
      }

      res.json({
        success: true,
        data: mk
      });

    } catch (err) {
      res.status(500).json({
        error: err.message
      });
    }
});

app.delete('/api/matakuliah/:kode',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {

    try {

      await Matakuliah.deleteOne({
        kode: req.params.kode
      });

      res.json({
        success: true
      });

    } catch (err) {
      res.status(500).json({
        error: err.message
      });
    }
});

// ===== NILAI ROUTES =====
app.get('/api/nilai', requireAuth, async (req, res) => {
  try {

    if (req.session.user.role === 'mahasiswa') {

      const nilai = await Nilai.find({
        nim: req.session.user.nim
      });

      return res.json(nilai);
    }

    const nilai = await Nilai.find();

    res.json(nilai);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

app.post('/api/nilai',
  requireAuth,
  requireRole('admin','dosen'),
  async (req,res)=>{

    try {

      const { nim, kode, uts, uas, tugas, hadir } = req.body;

      const exist = await Nilai.findOne({
        nim,
        kode
      });

      if (exist) {
        return res.status(400).json({
          error:'Nilai sudah ada'
        });
      }

      const na =
        Math.round(
          (+uts * 0.3) +
          (+uas * 0.4) +
          (+tugas * 0.2) +
          (+hadir * 0.1)
        );

      const nilai = await Nilai.create({
        nim,
        kode,
        uts:+uts,
        uas:+uas,
        tugas:+tugas,
        hadir:+hadir,
        nilai_akhir:na,
        grade:calcGrade(na)
      });

      res.json({
        success:true,
        data:nilai
      });

    } catch(err){
      res.status(500).json({
        error:err.message
      });
    }
});

app.put('/api/nilai/:nim/:kode',
  requireAuth,
  requireRole('admin','dosen'),
  async (req,res)=>{

    try {

      const { uts, uas, tugas, hadir } = req.body;

      const na =
        Math.round(
          (+uts * 0.3) +
          (+uas * 0.4) +
          (+tugas * 0.2) +
          (+hadir * 0.1)
        );

      const nilai = await Nilai.findOneAndUpdate(
        {
          nim:req.params.nim,
          kode:req.params.kode
        },
        {
          uts:+uts,
          uas:+uas,
          tugas:+tugas,
          hadir:+hadir,
          nilai_akhir:na,
          grade:calcGrade(na)
        },
        {
          new:true
        }
      );

      res.json({
        success:true,
        data:nilai
      });

    } catch(err){
      res.status(500).json({
        error:err.message
      });
    }
});

app.delete('/api/nilai/:nim/:kode',
  requireAuth,
  requireRole('admin','dosen'),
  async (req,res)=>{

    try {

      await Nilai.deleteOne({
        nim:req.params.nim,
        kode:req.params.kode
      });

      res.json({
        success:true
      });

    } catch(err){
      res.status(500).json({
        error:err.message
      });
    }
});

// // ===== BACKUP ROUTES =====
// app.get('/api/backup', requireAuth, requireRole('admin'), (req, res) => {
//   const db = readDB();
//   res.json(db.backups || []);
// });

// app.post('/api/backup', requireAuth, requireRole('admin'), (req, res) => {
//   const db = readDB();
//   const backupData = { mahasiswa: db.mahasiswa, matakuliah: db.matakuliah, nilai: db.nilai };
//   const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//   const filename = `backup-${timestamp}.json`;
//   const backupPath = path.join(__dirname, 'data', filename);
  
//   fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  
//   const entry = {
//     id: 'bk' + Date.now(),
//     nama: req.body.tipe === 'manual' ? 'Backup Manual' : 'Backup Otomatis',
//     waktu: new Date().toLocaleString('id-ID'),
//     ukuran: (fs.statSync(backupPath).size / 1024).toFixed(1) + ' KB',
//     status: 'sukses',
//     tipe: req.body.tipe || 'manual',
//     file: filename
//   };
  
//   if (!db.backups) db.backups = [];
//   db.backups.unshift(entry);
//   writeDB(db);
//   res.json({ success: true, backup: entry });
// });

// app.delete('/api/backup/:id', requireAuth, requireRole('admin'), (req, res) => {
//   const db = readDB();
//   const idx = (db.backups||[]).findIndex(b => b.id === req.params.id);
//   if (idx !== -1) {
//     const b = db.backups[idx];
//     const filePath = path.join(__dirname, 'data', b.file);
//     if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
//     db.backups.splice(idx, 1);
//     writeDB(db);
//   }
//   res.json({ success: true });
// });

app.get('/api/backup',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {

    try {

      const backups = await Backup.find()
        .sort({ createdAt: -1 });

      res.json(backups);

    } catch (err) {

      res.status(500).json({
        error: err.message
      });

    }
});

app.post('/api/backup',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {

    try {

      const mahasiswa = await Mahasiswa.find();
      const matakuliah = await Matakuliah.find();
      const nilai = await Nilai.find();

      const backupData = {
        mahasiswa,
        matakuliah,
        nilai
      };

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-');

      const filename = `backup-${timestamp}.json`;

      const backupPath = path.join(
        __dirname,
        'data',
        filename
      );

      fs.writeFileSync(
        backupPath,
        JSON.stringify(backupData, null, 2)
      );

      const backup = await Backup.create({
        nama:
          req.body.tipe === 'manual'
            ? 'Backup Manual'
            : 'Backup Otomatis',

        waktu: new Date().toLocaleString('id-ID'),

        ukuran:
          (
            fs.statSync(backupPath).size / 1024
          ).toFixed(1) + ' KB',

        status: 'sukses',

        tipe: req.body.tipe || 'manual',

        file: filename
      });

      res.json({
        success: true,
        backup
      });

    } catch (err) {

      res.status(500).json({
        error: err.message
      });

    }
});

app.delete('/api/backup/:id',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {

    try {

      const backup = await Backup.findById(
        req.params.id
      );

      if (!backup) {
        return res.status(404).json({
          error: 'Backup tidak ditemukan'
        });
      }

      const filePath = path.join(
        __dirname,
        'data',
        backup.file
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await Backup.findByIdAndDelete(
        req.params.id
      );

      res.json({
        success: true
      });

    } catch (err) {

      res.status(500).json({
        error: err.message
      });

    }
});

// ===== STATS (DASHBOARD) =====
app.get('/api/stats', requireAuth, async (req,res)=>{

  const mahasiswa = await Mahasiswa.find();
  const matakuliah = await Matakuliah.find();
  const nilai = await Nilai.find();

  const gradeCount = {
    A:0,
    B:0,
    C:0,
    D:0,
    E:0
  };

  nilai.forEach(n => {
    const g = n.grade[0];

    if (gradeCount[g] !== undefined) {
      gradeCount[g]++;
    }
  });

  const prodiCount = {};

  mahasiswa.forEach(m => {
    prodiCount[m.prodi] =
      (prodiCount[m.prodi] || 0) + 1;
  });

  const rataIPK =
    mahasiswa.length
      ? (
          mahasiswa.reduce(
            (s,m)=>s+m.ipk,
            0
          ) / mahasiswa.length
        ).toFixed(2)
      : 0;

  res.json({
    totalMahasiswa: mahasiswa.length,
    totalAktif:
      mahasiswa.filter(
        m=>m.status==='aktif'
      ).length,
    totalMatakuliah: matakuliah.length,
    totalNilai: nilai.length,
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

module.exports = app;