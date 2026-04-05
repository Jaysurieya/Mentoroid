const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const admin = require("../Config/FirebaseAdmin.js");
const User = require('../Models/MongooseSchema');

// ─── Multer config ───────────────────────────────────────────────────────────
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads', 'profiles')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}_${Date.now()}${ext}`);
  },
});

const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads', 'covers')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}_${Date.now()}${ext}`);
  },
});

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

exports.uploadProfile = multer({ storage: profileStorage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });
exports.uploadCover = multer({ storage: coverStorage, fileFilter: imageFilter, limits: { fileSize: 10 * 1024 * 1024 } });


// ─── Google / Firebase Login ────────────────────────────────────────────────
exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: "Firebase token missing" });
    }

    // 1. Verify Firebase ID token
    const decoded = await admin.auth().verifyIdToken(token);
    const { uid: firebaseUid, email, name: firebaseName, picture: firebasePhoto } = decoded;

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
        name: firebaseName || email.split("@")[0],
        photoURL: firebasePhoto || "",
        provider: "google",
        lastLogin: new Date(),
        createdAt: new Date(),
      });
      isNewUser = true;
    } else {
      // Existing user — update login time and sync profile from Google
      user.lastLogin = new Date();
      if (firebaseName && !user.name) user.name = firebaseName;
      if (firebasePhoto && !user.photoURL) user.photoURL = firebasePhoto;
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
      if (!user.password) {
        return res.status(400).json({ success: false, message: "This account was created via Google. Please log in using Google." });
      }

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
        name: user.name,
        email: user.email,
        chatId: user.chatId,
        photoURL: user.photoURL,
        coverPhoto: user.coverPhoto,
        phone: user.phone,
        bio: user.bio,
        location: user.location,
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


// ─── Update Profile ──────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, bio, location } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Update only allowed fields
    if (name !== undefined) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (location !== undefined) user.location = location.trim();

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        coverPhoto: user.coverPhoto,
        phone: user.phone,
        bio: user.bio,
        location: user.location,
        provider: user.provider,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// ─── Upload Profile Photo ────────────────────────────────────────────────────
exports.uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.photoURL = `/uploads/profiles/${req.file.filename}`;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile photo updated",
      photoURL: user.photoURL,
    });
  } catch (error) {
    console.error("Upload profile photo error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// ─── Upload Cover Photo ──────────────────────────────────────────────────────
exports.uploadCoverPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.coverPhoto = `/uploads/covers/${req.file.filename}`;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Cover photo updated",
      coverPhoto: user.coverPhoto,
    });
  } catch (error) {
    console.error("Upload cover photo error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
