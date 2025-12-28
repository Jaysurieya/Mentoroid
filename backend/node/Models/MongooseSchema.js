const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  // Email is still important
  email: {
    type: String,
    required: true,
    unique: true,
  },

  // Password only for email/password users
  password: {
    type: String,
    required: false, // 🔑 Google users won’t have password
  },

  // 🔥 Firebase permanent user identity
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true, // allows null for non-google users
  },

  // How user signed up
  provider: {
    type: String,
    enum: ["local", "google"],
    default: "local",
  },

  rememberMe: {
    type: Boolean,
    default: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  lastLogin: {
    type: Date,
  },
});

module.exports = mongoose.model("User", userSchema);
