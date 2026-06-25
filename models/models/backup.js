const mongoose = require('mongoose');

const BackupSchema = new mongoose.Schema({
  nama: String,
  waktu: String,
  ukuran: String,
  status: String,
  tipe: String,
  // Sebelumnya backup hanya mencatat nama file hasil fs.writeFileSync ke
  // folder data/ — itu TIDAK akan berhasil di Vercel (filesystem read-only).
  // Sekarang isi snapshot-nya disimpan langsung sebagai dokumen di Mongo.
  snapshot: {
    mahasiswa: Array,
    matakuliah: Array,
    nilai: Array,
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('Backup', BackupSchema);