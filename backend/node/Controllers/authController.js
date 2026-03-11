const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const admin = require("../Config/FirebaseAdmin.js");
const User = require('../Models/MongooseSchema');


// ─── Google / Firebase Login ────────────────────────────────────────────────
exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: "Firebase token missing" });
    }

    // 1. Verify Firebase ID token
    const decoded = await admin.auth().verifyIdToken(token);
    const { uid: firebaseUid, email } = decoded;

    if (!firebaseUid || !email) {
      return res.status(400).json({ success: false, message: "Invalid Firebase token data" });
    }

    // 2. Find or create user via firebaseUid
    let user = await User.findOne({ firebaseUid });
    let isNewUser = false;

    if (!user) {
      // Create user using basic email/uid fields 
      user = await User.create({
        email,
        firebaseUid,
        provider: "google",
        lastLogin: new Date(),
        createdAt: new Date(),
      });
      isNewUser = true;
    } else {
      // Existing user — update login time
      user.lastLogin = new Date();
      await user.save();
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, message: "JWT secret not configured" });
    }

    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    return res.status(200).json({
      success: true,
      isNewUser,
      token: jwtToken,
      userId: user._id,
      user: {
        email: user.email,
        provider: user.provider,
        firebaseUid: user.firebaseUid
      },
    });

  } catch (error) {
    console.error("Google login error:", error);
    return res.status(401).json({ success: false, message: "Invalid or expired Firebase token" });
  }
};


// ─── Email / Password Auth ───────────────────────────────────────────────────
exports.emailAuth = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      // Sign up
      const hashedPassword = await bcrypt.hash(password, 12);
      user = await User.create({
        email,
        password: hashedPassword,
        provider: "local",
        name: email.split("@")[0], // use email prefix as default name
        createdAt: new Date(),
      });
      isNewUser = true;
    } else {
      // Login
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }
      user.lastLogin = new Date();
      await user.save();
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, message: "JWT secret not configured" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    return res.status(200).json({
      success: true,
      isNewUser,
      token,
      user: {
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        provider: user.provider,
      },
    });

  } catch (error) {
    console.error("Email auth error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// ─── Get Profile ─────────────────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -__v');

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        provider: user.provider,
        firebaseUid: user.firebaseUid,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
