// routes/backup.js
//
// Versi lama menulis file JSON ke folder data/ lewat fs.writeFileSync, lalu
// menyimpan NAMA file itu ke MongoDB. Ini gagal di Vercel karena filesystem
// deployment bersifat read-only — request backup akan error setiap kali.
// Sekarang seluruh ISI snapshot disimpan langsung sebagai dokumen Mongo
// (field `snapshot` di model Backup), jadi tidak butuh akses filesystem
// sama sekali.

const express = require('express');
const Mahasiswa = require('../models/mahasiswa');
const Matakuliah = require('../models/matakuliah');
const Nilai = require('../models/nilai');
const Backup = require('../models/backup');
const { requireAuth, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  // jangan kirim isi snapshot yang besar ke daftar — cukup metadata
  const backups = await Backup.find().select('-snapshot').sort({ createdAt: -1 });
  res.json(backups);
}));

router.post('/', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const [mahasiswa, matakuliah, nilai] = await Promise.all([
    Mahasiswa.find(),
    Matakuliah.find(),
    Nilai.find(),
  ]);

  const snapshot = { mahasiswa, matakuliah, nilai };
  const sizeKb = (Buffer.byteLength(JSON.stringify(snapshot)) / 1024).toFixed(1);
  const tipe = req.body.tipe === 'otomatis' ? 'otomatis' : 'manual';

  const backup = await Backup.create({
    nama: tipe === 'manual' ? 'Backup Manual' : 'Backup Otomatis',
    waktu: new Date().toLocaleString('id-ID'),
    ukuran: `${sizeKb} KB`,
    status: 'sukses',
    tipe,
    snapshot,
  });

  const { snapshot: _omit, ...publicBackup } = backup.toObject();
  res.json({ success: true, backup: publicBackup });
}));

router.post('/:id/restore', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const backup = await Backup.findById(req.params.id);
  if (!backup) return res.status(404).json({ error: 'Backup tidak ditemukan' });

  const { mahasiswa, matakuliah, nilai } = backup.snapshot;

  await Promise.all([
    Mahasiswa.deleteMany({}),
    Matakuliah.deleteMany({}),
    Nilai.deleteMany({}),
  ]);
  await Promise.all([
    mahasiswa.length ? Mahasiswa.insertMany(mahasiswa) : Promise.resolve(),
    matakuliah.length ? Matakuliah.insertMany(matakuliah) : Promise.resolve(),
    nilai.length ? Nilai.insertMany(nilai) : Promise.resolve(),
  ]);

  res.json({ success: true, message: 'Restore berhasil dijalankan' });
}));

router.delete('/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const backup = await Backup.findById(req.params.id);
  if (!backup) return res.status(404).json({ error: 'Backup tidak ditemukan' });
  await Backup.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

module.exports = router;
