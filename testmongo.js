require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/user");

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    const users = await User.find();

    console.log(users);

    process.exit();
})
.catch(console.error);