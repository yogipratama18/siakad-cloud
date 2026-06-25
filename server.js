require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

const ensureDb = require('./middleware/ensureDb');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== SECURITY MIDDLEWARE =====
app.use(helmet({ contentSecurityPolicy: false }));

// CORS: frontend & backend ada di domain Vercel yang berbeda. Dengan JWT
// (bukan cookie), kita TIDAK perlu credentials:true lagi — itu sebabnya
// header Access-Control-Allow-Origin sekarang bisa lebih sederhana & aman.
// Set FRONTEND_URL di environment variables Vercel ke domain frontend kamu,
// contoh: https://siakad-cloud-rho.vercel.app
// Bisa lebih dari satu domain, pisahkan dengan koma.
const allowedOrigins = (process.env.FRONTEND_URL || '*')
  .split(',')
  .map((s) => s.trim());
app.use(cors({
  origin: allowedOrigins.includes('*') ? true : allowedOrigins,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Pastikan koneksi MongoDB siap SEBELUM request menyentuh route manapun.
// (sebelumnya hanya route login yang connectDB() — route lain bisa gagal
// kalau dipanggil duluan di instance/cold-start yang belum pernah konek)
app.use('/api', ensureDb);

// ===== API ROUTES =====
app.use('/api/auth', require('./routes/auth'));
app.use('/api/mahasiswa', require('./routes/mahasiswa'));
app.use('/api/matakuliah', require('./routes/matakuliah'));
app.use('/api/nilai', require('./routes/nilai'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/stats', require('./routes/stats'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ===== ERROR HANDLER TERPUSAT =====
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Terjadi kesalahan pada server' });
});

// ===== SERVE FRONTEND (hanya relevan jika frontend digabung di project ini;
// kalau frontend kamu deploy terpisah sebagai project Vercel sendiri,
// bagian ini tidak akan pernah diakses tapi aman dibiarkan) =====
app.use(express.static(path.join(__dirname, 'public')));
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    if (err) res.status(404).json({ error: 'Not found' });
  });
});

// ===== START SERVER =====
// Lokal: app.listen berjalan normal.
// Di Vercel: file ini diimpor sebagai serverless function lewat
// `module.exports = app`, app.listen() TIDAK dipakai Vercel tapi tetap
// aman ada di sini karena dibungkus `if (require.main === module)`.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ SIAKAD backend berjalan di http://localhost:${PORT}`);
  });
}

module.exports = app;
