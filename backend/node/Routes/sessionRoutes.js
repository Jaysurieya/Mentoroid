const express = require("express");
const router = express.Router();
const sessionController = require("../Controllers/sessionController");
const authMiddleware = require("../Middleware/authMiddleware");

router.post("/", authMiddleware, sessionController.createSession);
router.get("/", authMiddleware, sessionController.listSessions);
router.get("/:id", authMiddleware, sessionController.getSession);
router.put("/:id", authMiddleware, sessionController.updateSession);
router.delete("/:id", authMiddleware, sessionController.deleteSession);
router.post("/:id/chat", authMiddleware, sessionController.saveChatMessages);

module.exports = router;
