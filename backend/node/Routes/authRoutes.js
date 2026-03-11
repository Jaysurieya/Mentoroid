const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');
const authMiddleware = require('../Middleware/authMiddleware');

router.post("/google", authController.googleLogin);
router.post("/email-auth", authController.emailAuth);
router.get("/profile", authMiddleware, authController.getProfile);

module.exports = router;