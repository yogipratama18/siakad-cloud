const mongoose = require("mongoose");

const MatakuliahSchema = new mongoose.Schema({
  kode: String,
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