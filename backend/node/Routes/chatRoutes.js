const express = require("express");
const router = express.Router();
const chatController = require("../Controllers/chatController");
const authMiddleware = require("../Middleware/authMiddleware");

// Friend requests
router.post("/friend-request", authMiddleware, chatController.sendFriendRequest);
router.get("/friend-requests", authMiddleware, chatController.getFriendRequests);
router.put("/friend-request/:id/accept", authMiddleware, chatController.acceptFriendRequest);
router.put("/friend-request/:id/reject", authMiddleware, chatController.rejectFriendRequest);

// Friends
router.get("/friends", authMiddleware, chatController.getFriends);
router.delete("/friends/:friendId", authMiddleware, chatController.removeFriend);

// Groups
router.post("/groups", authMiddleware, chatController.createGroup);
router.get("/groups", authMiddleware, chatController.getGroups);
router.post("/groups/:id/members", authMiddleware, chatController.addGroupMember);

// Messages
router.get("/messages/:chatId", authMiddleware, chatController.getMessages);

module.exports = router;
