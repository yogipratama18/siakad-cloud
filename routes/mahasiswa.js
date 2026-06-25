// routes/mahasiswa.js
const express = require('express');
const Mahasiswa = require('../models/mahasiswa');
const { requireAuth, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  if (req.user.role === 'mahasiswa') {
    const mhs = await Mahasiswa.findOne({ nim: req.user.nim });
    return res.json(mhs ? [mhs] : []);
  }
  const mahasiswa = await Mahasiswa.find();
  res.json(mahasiswa);
}));

router.post('/', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const { nim, nama } = req.body;
  if (!nim || !nama) return res.status(400).json({ error: 'NIM dan Nama wajib diisi' });

  const existing = await Mahasiswa.findOne({ nim });
  if (existing) return res.status(400).json({ error: 'NIM sudah terdaftar' });

  const mahasiswa = await Mahasiswa.create({
    ...req.body,
    semester: Number(req.body.semester || 1),
    angkatan: Number(req.body.angkatan),
    ipk: 0,
    status: 'aktif',
  });

  res.json({ success: true, data: mahasiswa });
}));

router.put('/:nim', requireAuth, requireRole('admin', 'dosen'), asyncHandler(async (req, res) => {
  const update = { ...req.body };
  delete update._id;
  delete update.nim; // NIM kunci utama, tidak boleh diubah lewat update biasa

  const mahasiswa = await Mahasiswa.findOneAndUpdate(
    { nim: req.params.nim },
    update,
    { new: true }
  );
  if (!mahasiswa) return res.status(404).json({ error: 'Mahasiswa tidak ditemukan' });
  res.json({ success: true, data: mahasiswa });
}));

router.delete('/:nim', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const result = await Mahasiswa.deleteOne({ nim: req.params.nim });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Tidak ditemukan' });
  res.json({ success: true });
}));

module.exports = router;
