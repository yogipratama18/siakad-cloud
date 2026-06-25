const mongoose = require('mongoose');

const BackupSchema = new mongoose.Schema({
  nama: String,
  waktu: String,
  ukuran: String,
  status: String,
  tipe: String,
  file: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Backup', BackupSchema);