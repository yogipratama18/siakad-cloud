const mongoose = require("mongoose");

const NilaiSchema = new mongoose.Schema({
  nim: { type: String, required: true },
  kode: { type: String, required: true },
  uts: Number,
  uas: Number,
  tugas: Number,
  hadir: Number,
  nilai_akhir: Number,
  grade: String
});

NilaiSchema.index({ nim: 1, kode: 1 }, { unique: true });

module.exports = mongoose.model("Nilai", NilaiSchema);