const User = require("../Models/MongooseSchema");
const FriendRequest = require("../Models/FriendRequest");
const Group = require("../Models/Group");
const Message = require("../Models/Message");

// ─── Helper: generate private chatId from two user ObjectIds ─────────────────
function getPrivateChatId(id1, id2) {
  return [id1.toString(), id2.toString()].sort().join("_");
}

// ─── Send friend request (by chatId) ─────────────────────────────────────────
exports.sendFriendRequest = async (req, res) => {
  try {
    const { chatId } = req.body;
    if (!chatId) {
      return res.status(400).json({ success: false, message: "chatId is required" });
    }

    const targetUser = await User.findOne({ chatId });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found with that Chat ID" });
    }

    if (targetUser._id.toString() === req.user.id) {
      return res.status(400).json({ success: false, message: "You can't add yourself" });
    }

    // Check if already friends
    const currentUser = await User.findById(req.user.id);
    if (currentUser.friends.includes(targetUser._id)) {
      return res.status(400).json({ success: false, message: "Already friends" });
    }

    // Check for existing request in either direction
    const existing = await FriendRequest.findOne({
      $or: [
        { from: req.user.id, to: targetUser._id, status: "pending" },
        { from: targetUser._id, to: req.user.id, status: "pending" },
      ],
    });
    if (existing) {
      return res.status(400).json({ success: false, message: "Friend request already pending" });
    }

    const request = await FriendRequest.create({
      from: req.user.id,
      to: targetUser._id,
    });

    // Populate the sender info before returning
    await request.populate("from", "name email photoURL chatId");

    // Notify via Socket.IO if the target is online
    const io = req.app.get("io");
    if (io) {
      io.to(`user_${targetUser._id}`).emit("friendRequestReceived", {
        _id: request._id,
        from: request.from,
        status: request.status,
        createdAt: request.createdAt,
      });
    }

    return res.status(201).json({ success: true, request });
  } catch (error) {
    console.error("Send friend request error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Friend request already exists" });
    }
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Get pending incoming friend requests ────────────────────────────────────
exports.getFriendRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      to: req.user.id,
      status: "pending",
    }).populate("from", "name email photoURL chatId");

    return res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error("Get friend requests error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Accept friend request ───────────────────────────────────────────────────
exports.acceptFriendRequest = async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    if (request.to.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ success: false, message: "Request already processed" });
    }

    request.status = "accepted";
    await request.save();

    // Add each other to friends list
    await User.findByIdAndUpdate(request.from, { $addToSet: { friends: request.to } });
    await User.findByIdAndUpdate(request.to, { $addToSet: { friends: request.from } });

    // Fetch both users' info to emit via socket
    const fromUser = await User.findById(request.from).select("name email photoURL chatId");
    const toUser = await User.findById(request.to).select("name email photoURL chatId");

    const io = req.app.get("io");
    if (io) {
      // Notify the sender that their request was accepted
      io.to(`user_${request.from}`).emit("friendRequestAccepted", {
        friend: { _id: toUser._id, name: toUser.name, email: toUser.email, photoURL: toUser.photoURL, chatId: toUser.chatId },
      });
      // Notify the acceptor (refresh their friend list too)
      io.to(`user_${request.to}`).emit("friendRequestAccepted", {
        friend: { _id: fromUser._id, name: fromUser.name, email: fromUser.email, photoURL: fromUser.photoURL, chatId: fromUser.chatId },
      });
    }

    return res.status(200).json({ success: true, message: "Friend request accepted" });
  } catch (error) {
    console.error("Accept friend request error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Reject friend request ──────────────────────────────────────────────────
exports.rejectFriendRequest = async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    if (request.to.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    request.status = "rejected";
    await request.save();

    return res.status(200).json({ success: true, message: "Friend request rejected" });
  } catch (error) {
    console.error("Reject friend request error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Get friends list ────────────────────────────────────────────────────────
exports.getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate(
      "friends",
      "name email photoURL chatId"
    );
    return res.status(200).json({ success: true, friends: user.friends });
  } catch (error) {
    console.error("Get friends error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Remove friend ──────────────────────────────────────────────────────────
exports.removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    await User.findByIdAndUpdate(req.user.id, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: req.user.id } });

    // Also remove any friend request records between them
    await FriendRequest.deleteMany({
      $or: [
        { from: req.user.id, to: friendId },
        { from: friendId, to: req.user.id },
      ],
    });

    return res.status(200).json({ success: true, message: "Friend removed" });
  } catch (error) {
    console.error("Remove friend error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Create group ────────────────────────────────────────────────────────────
exports.createGroup = async (req, res) => {
  try {
    const { name, memberIds } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Group name is required" });
    }

    // Ensure admin is in members
    const members = [...new Set([req.user.id, ...(memberIds || [])])];

    const group = await Group.create({
      name,
      admin: req.user.id,
      members,
    });

    await group.populate("members", "name email photoURL chatId");

    // Notify members via socket
    const io = req.app.get("io");
    if (io) {
      members.forEach((memberId) => {
        if (memberId.toString() !== req.user.id) {
          io.to(`user_${memberId}`).emit("addedToGroup", {
            group: {
              _id: group._id,
              name: group.name,
              admin: group.admin,
              members: group.members,
            },
          });
        }
      });
    }

    return res.status(201).json({ success: true, group });
  } catch (error) {
    console.error("Create group error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Get user's groups ──────────────────────────────────────────────────────
exports.getGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.id })
      .populate("members", "name email photoURL chatId")
      .populate("admin", "name email");

    return res.status(200).json({ success: true, groups });
  } catch (error) {
    console.error("Get groups error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Add member to group ────────────────────────────────────────────────────
exports.addGroupMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }
    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Only admin can add members" });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    if (group.members.includes(userId)) {
      return res.status(400).json({ success: false, message: "User already in group" });
    }

    group.members.push(userId);
    await group.save();
    await group.populate("members", "name email photoURL chatId");

    // Notify the new member
    const io = req.app.get("io");
    if (io) {
      io.to(`user_${userId}`).emit("addedToGroup", {
        group: { _id: group._id, name: group.name, admin: group.admin, members: group.members },
      });
    }

    return res.status(200).json({ success: true, group });
  } catch (error) {
    console.error("Add group member error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Get message history ────────────────────────────────────────────────────
exports.getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ chatId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "name email photoURL chatId");

    const total = await Message.countDocuments({ chatId });

    return res.status(200).json({
      success: true,
      messages,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get messages error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Export helper for socket use
exports.getPrivateChatId = getPrivateChatId;
