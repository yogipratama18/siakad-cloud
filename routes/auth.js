// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const { signToken, requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi' });
  }

  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ error: 'Username atau password salah' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Username atau password salah' });

  const token = signToken(user);
  const safeUser = {
    id: user.id, username: user.username, role: user.role,
    nama: user.nama, nim: user.nim, nidn: user.nidn, color: user.color,
  };
  res.json({ success: true, token, user: safeUser });
}));

// Dengan JWT tidak ada session server-side yang perlu dihapus — logout
// cukup menghapus token di localStorage sisi klien. Endpoint ini disisakan
// untuk kompatibilitas dengan frontend yang sudah memanggilnya.
router.post('/logout', (req, res) => {
  res.json({ success: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

module.exports = router;
