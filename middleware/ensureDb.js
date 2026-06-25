// middleware/ensureDb.js
//
// Sebelumnya hanya route /api/auth/login dan satu /api/auth/me yang
// memanggil `await connectDB()`. Route lain (mahasiswa, matakuliah, nilai,
// backup, stats) langsung memakai model Mongoose TANPA memastikan koneksi
// terbentuk dulu. Karena db.js memakai `bufferCommands: false`, query yang
// dijalankan sebelum koneksi siap akan GAGAL/timeout, bukan menunggu.
// Middleware ini dipasang global di server.js supaya SETIAP request,
// lewat route apapun, selalu menunggu koneksi siap dulu.

const connectDB = require('../db');

async function ensureDb(req, res, next) {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Gagal konek MongoDB:', err);
    res.status(503).json({ error: 'Tidak dapat terhubung ke database, coba lagi sebentar.' });
  }
}

module.exports = ensureDb;
