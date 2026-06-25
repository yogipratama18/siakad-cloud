// routes/matakuliah.js
const express = require('express');
const Matakuliah = require('../models/matakuliah');
const { requireAuth, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const data = await Matakuliah.find();
  res.json(data);
}));

router.post('/', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const { kode, nama } = req.body;
  if (!kode || !nama) return res.status(400).json({ error: 'Kode dan Nama wajib diisi' });

  const exist = await Matakuliah.findOne({ kode });
  if (exist) return res.status(400).json({ error: 'Kode sudah ada' });

  const mk = await Matakuliah.create({
    ...req.body,
    sks: Number(req.body.sks),
    semester: Number(req.body.semester),
  });
  res.json({ success: true, data: mk });
}));

router.put('/:kode', requireAuth, requireRole('admin', 'dosen'), asyncHandler(async (req, res) => {
  const update = { ...req.body };
  delete update._id;
  delete update.kode;

  const mk = await Matakuliah.findOneAndUpdate({ kode: req.params.kode }, update, { new: true });
  if (!mk) return res.status(404).json({ error: 'Tidak ditemukan' });
  res.json({ success: true, data: mk });
}));

router.delete('/:kode', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const result = await Matakuliah.deleteOne({ kode: req.params.kode });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Tidak ditemukan' });
  res.json({ success: true });
}));

module.exports = router;
