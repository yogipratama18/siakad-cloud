// routes/nilai.js
const express = require('express');
const Nilai = require('../models/nilai');
const { requireAuth, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

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

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  if (req.user.role === 'mahasiswa') {
    const nilai = await Nilai.find({ nim: req.user.nim });
    return res.json(nilai);
  }
  const nilai = await Nilai.find();
  res.json(nilai);
}));

router.post('/', requireAuth, requireRole('admin', 'dosen'), asyncHandler(async (req, res) => {
  const { nim, kode, uts, uas, tugas, hadir } = req.body;
  if (!nim || !kode) return res.status(400).json({ error: 'Mahasiswa dan Mata Kuliah wajib dipilih' });

  const exist = await Nilai.findOne({ nim, kode });
  if (exist) return res.status(400).json({ error: 'Nilai sudah ada, gunakan Edit' });

  const na = Math.round(+uts * 0.3 + +uas * 0.4 + +tugas * 0.2 + +hadir * 0.1);
  const nilai = await Nilai.create({
    nim, kode, uts: +uts, uas: +uas, tugas: +tugas, hadir: +hadir,
    nilai_akhir: na, grade: calcGrade(na),
  });
  res.json({ success: true, data: nilai });
}));

router.put('/:nim/:kode', requireAuth, requireRole('admin', 'dosen'), asyncHandler(async (req, res) => {
  const { uts, uas, tugas, hadir } = req.body;
  const na = Math.round(+uts * 0.3 + +uas * 0.4 + +tugas * 0.2 + +hadir * 0.1);

  const nilai = await Nilai.findOneAndUpdate(
    { nim: req.params.nim, kode: req.params.kode },
    { uts: +uts, uas: +uas, tugas: +tugas, hadir: +hadir, nilai_akhir: na, grade: calcGrade(na) },
    { new: true }
  );
  if (!nilai) return res.status(404).json({ error: 'Tidak ditemukan' });
  res.json({ success: true, data: nilai });
}));

router.delete('/:nim/:kode', requireAuth, requireRole('admin', 'dosen'), asyncHandler(async (req, res) => {
  const result = await Nilai.deleteOne({ nim: req.params.nim, kode: req.params.kode });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Tidak ditemukan' });
  res.json({ success: true });
}));

module.exports = router;
