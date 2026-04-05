const mongoose = require("mongoose");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },

  // Unique chat ID for sharing (8-char hex)
  chatId: {
    type: String,
    unique: true,
    sparse: true,
  },

  // Friends list
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],

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

  phone: {
    type: String,
    default: "",
  },

  bio: {
    type: String,
    default: "",
  },

  location: {
    type: String,
    default: "",
  },

  coverPhoto: {
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

// Auto-generate chatId before saving if not set
userSchema.pre("save", async function () {
  if (!this.chatId) {
    let id;
    let exists = true;
    while (exists) {
      id = crypto.randomBytes(4).toString("hex"); // 8-char hex
      exists = await mongoose.models.User.findOne({ chatId: id });
    }
    this.chatId = id;
  }
});

module.exports = mongoose.model("User", userSchema);
