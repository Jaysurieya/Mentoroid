const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },

  // Password only for email/password users
  password: {
    type: String,
    required: false,
  },

  // Firebase permanent user identity
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true,
  },

  // Profile info (populated from Firebase token or set manually)
  name: {
    type: String,
    default: "",
  },
  photoURL: {
    type: String,
    default: "",
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
