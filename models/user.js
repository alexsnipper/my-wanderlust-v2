const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
});

// Adds username, hash, salt fields and authentication methods
userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("user", userSchema);
