// routes/stats.js
const express = require('express');
const Mahasiswa = require('../models/mahasiswa');
const Matakuliah = require('../models/matakuliah');
const Nilai = require('../models/nilai');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const [mahasiswa, matakuliah, nilai] = await Promise.all([
    Mahasiswa.find(),
    Matakuliah.find(),
    Nilai.find(),
  ]);

  const gradeCount = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  nilai.forEach((n) => { const g = n.grade[0]; if (gradeCount[g] !== undefined) gradeCount[g]++; });

  const prodiCount = {};
  mahasiswa.forEach((m) => { prodiCount[m.prodi] = (prodiCount[m.prodi] || 0) + 1; });

  const rataIPK = mahasiswa.length
    ? (mahasiswa.reduce((s, m) => s + (m.ipk || 0), 0) / mahasiswa.length).toFixed(2)
    : 0;

  res.json({
    totalMahasiswa: mahasiswa.length,
    totalAktif: mahasiswa.filter((m) => m.status === 'aktif').length,
    totalMatakuliah: matakuliah.length,
    totalNilai: nilai.length,
    rataIPK,
    gradeCount,
    prodiCount,
  });
}));

module.exports = router;
