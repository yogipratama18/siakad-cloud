const mongoose = require("mongoose");

const BackupSchema = new mongoose.Schema({
  id: String,
  nama: String,
  waktu: String,
  ukuran: String,
  status: String,
  tipe: String,
  file: String
});

module.exports = mongoose.model("Backup", BackupSchema);