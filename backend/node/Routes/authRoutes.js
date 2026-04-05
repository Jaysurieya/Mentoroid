const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');
const authMiddleware = require('../Middleware/authMiddleware');

router.post("/google", authController.googleLogin);
router.post("/email-auth", authController.emailAuth);
router.get("/profile", authMiddleware, authController.getProfile);
router.put("/profile", authMiddleware, authController.updateProfile);
router.post("/profile/photo", authMiddleware, authController.uploadProfile.single('photo'), authController.uploadProfilePhoto);
router.post("/profile/cover", authMiddleware, authController.uploadCover.single('cover'), authController.uploadCoverPhoto);

module.exports = router;