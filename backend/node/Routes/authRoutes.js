const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');

router.post("/google", authController.googleLogin);
router.post("/email-auth", authController.emailAuth);

module.exports = router;