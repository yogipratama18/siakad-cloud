const mongoose = require("mongoose");

const MahasiswaSchema = new mongoose.Schema({
  nim: String,
  nama: String,
  prodi: String,
  angkatan: Number,
  semester: Number,
  email: String,
  telp: String,
  alamat: String,
  ipk: Number,
  status: String
});

module.exports = mongoose.model("Mahasiswa", MahasiswaSchema);