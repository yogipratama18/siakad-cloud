// middleware/auth.js
//
// Mengganti express-session (cookie) dengan JWT (Bearer token).
// Alasan: frontend dan backend kamu di-deploy sebagai DUA proyek Vercel
// yang berbeda domain. Cookie session lintas-domain butuh
// `sameSite:'none'; secure:true` DAN browser modern (Safari/Chrome ITP,
// pemblokiran third-party cookie) sering tetap menolaknya. JWT dikirim
// lewat header `Authorization: Bearer <token>`, bukan cookie — sama sekali
// tidak terpengaruh isu cross-domain/third-party-cookie itu.
//
// PENTING: file ini sebelumnya TIDAK ADA. server.js lama memanggil
// `requireAuth` di hampir semua route tapi fungsi itu tidak pernah
// didefinisikan/diimpor — itulah sebabnya server crash (ReferenceError)
// saat startup dan tidak ada satu pun endpoint yang bisa diakses.

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET belum diatur di environment variables (.env lokal atau Vercel Project Settings).');
}

function signToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    nama: user.nama,
    nim: user.nim,
    nidn: user.nidn,
    color: user.color,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Silakan login terlebih dahulu' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesi tidak valid atau sudah berakhir, silakan login kembali' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Akses ditolak' });
    }
    next();
  };
}

module.exports = { signToken, requireAuth, requireRole };
