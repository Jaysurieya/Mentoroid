const jwt = require("jsonwebtoken");
const Message = require("./Models/Message");
const User = require("./Models/MongooseSchema");
const { getPrivateChatId } = require("./Controllers/chatController");

// Track online users: userId -> Set of socketIds
const onlineUsers = new Map();

module.exports = function socketHandler(io) {
  // ─── Auth middleware ────────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.userId;
    console.log(`🔌 User connected: ${userId} (socket: ${socket.id})`);

    // ─── Join personal room ──────────────────────────────────────────────────
    socket.join(`user_${userId}`);

    // ─── Track online status ────────────────────────────────────────────────
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Notify friends that this user is online
    try {
      const user = await User.findById(userId).select("friends");
      if (user?.friends) {
        user.friends.forEach((friendId) => {
          io.to(`user_${friendId}`).emit("userOnline", { userId });
        });
      }
    } catch (e) {
      console.error("Error notifying friends of online status:", e);
    }

    // ─── Send current online users list to the connecting user ──────────────
    socket.emit("onlineUsers", Array.from(onlineUsers.keys()));

    // ─── Join chat room ─────────────────────────────────────────────────────
    socket.on("joinRoom", (chatId) => {
      socket.join(`chat_${chatId}`);
      console.log(`📌 User ${userId} joined room: ${chatId}`);
    });

    // ─── Leave chat room ────────────────────────────────────────────────────
    socket.on("leaveRoom", (chatId) => {
      socket.leave(`chat_${chatId}`);
    });

    // ─── Send message ───────────────────────────────────────────────────────
    socket.on("sendMessage", async ({ chatId, content, messageType }) => {
      try {
        const message = await Message.create({
          chatId,
          sender: userId,
          content,
          messageType: messageType || "text",
        });

        await message.populate("sender", "name email photoURL chatId");

        // Emit to everyone in the room (including sender for confirmation)
        io.to(`chat_${chatId}`).emit("receiveMessage", {
          _id: message._id,
          chatId: message.chatId,
          sender: message.sender,
          content: message.content,
          messageType: message.messageType,
          createdAt: message.createdAt,
        });

        // Also emit to individual user rooms for users not in the room
        // (they'll see it when they open the chat, as a notification)
        const parts = chatId.split("_");
        if (parts.length === 2) {
          // Private chat — notify both users
          parts.forEach((uid) => {
            io.to(`user_${uid}`).emit("newMessageNotification", {
              chatId,
              message: {
                _id: message._id,
                sender: message.sender,
                content: message.content,
                createdAt: message.createdAt,
              },
            });
          });
        }
      } catch (err) {
        console.error("sendMessage error:", err);
        socket.emit("messageError", { error: "Failed to send message" });
      }
    });

    // ─── Typing indicators ──────────────────────────────────────────────────
    socket.on("typing", ({ chatId }) => {
      socket.to(`chat_${chatId}`).emit("userTyping", { userId, chatId });
    });

    socket.on("stopTyping", ({ chatId }) => {
      socket.to(`chat_${chatId}`).emit("userStopTyping", { userId, chatId });
    });

    // ─── Disconnect ─────────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      console.log(`🔌 User disconnected: ${userId} (socket: ${socket.id})`);

      // Remove this socket from tracking
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);

          // Notify friends that user went offline
          try {
            const user = await User.findById(userId).select("friends");
            if (user?.friends) {
              user.friends.forEach((friendId) => {
                io.to(`user_${friendId}`).emit("userOffline", { userId });
              });
            }
          } catch (e) {
            console.error("Error notifying friends of offline status:", e);
          }
        }
      }
    });
  });
};
