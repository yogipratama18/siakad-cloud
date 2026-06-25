const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  id: String,
  username: { type: String, required: true, unique: true },
  password: String,
  role: String,
  nama: String,
  nim: String,
  nidn: String,
  color: String
});

module.exports = mongoose.model("User", UserSchema);