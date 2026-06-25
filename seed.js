require("dotenv").config();
const mongoose = require("mongoose");

const User = require("./models/user");

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {

  await User.deleteMany();

  await User.insertMany([
    {
      id: "1",
      username: "admin",
      password: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
      role: "admin",
      nama: "Administrator",
      color: "#1a56db"
    },
    {
      id: "2",
      username: "dosen",
      password: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
      role: "dosen",
      nama: "Dr. Hendra Wijaya",
      nidn: "0123456789",
      color: "#16a34a"
    },
    {
      id: "3",
      username: "mahasiswa",
      password: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
      role: "mahasiswa",
      nama: "Ahmad Rizal Pratama",
      nim: "2024001",
      color: "#7c3aed"
    }
  ]);

  console.log("Seed selesai");
  process.exit();
});