const mongoose = require("mongoose");

const MatakuliahSchema = new mongoose.Schema({
  kode: { type: String, required: true, unique: true },
  nama: String,
  sks: Number,
  semester: Number,
  dosen: String,
  prodi: String,
  hari: String,
  jam: String,
  ruang: String
});

module.exports = mongoose.model("Matakuliah", MatakuliahSchema);