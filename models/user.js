const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  id: String,
  username: String,
  password: String,
  role: String,
  nama: String,
  nim: String,
  nidn: String,
  color: String
});

module.exports = mongoose.model("User", UserSchema);