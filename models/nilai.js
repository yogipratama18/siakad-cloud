const mongoose = require("mongoose");

const NilaiSchema = new mongoose.Schema({
  nim: String,
  kode: String,
  uts: Number,
  uas: Number,
  tugas: Number,
  hadir: Number,
  nilai_akhir: Number,
  grade: String
});

module.exports = mongoose.model("Nilai", NilaiSchema);