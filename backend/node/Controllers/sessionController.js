const Session = require("../Models/SessionSchema");
const axios = require("axios");

const RAG_SERVICE = process.env.RAG_SERVICE_URL || "http://localhost:8000";

// Helper: composite student_id for ChromaDB isolation
function compositeId(userId, sessionId) {
  return `${userId}_${sessionId}`;
}

// ─── Create Session ──────────────────────────────────────────────────────────
exports.createSession = async (req, res) => {
  try {
    const { title } = req.body;
    const session = await Session.create({
      userId: req.user.id,
      title: title || "Untitled Session",
    });

    return res.status(201).json({
      success: true,
      session: {
        id: session._id,
        title: session.title,
        materialCount: 0,
        messageCount: 0,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    });
  } catch (error) {
    console.error("Create session error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── List Sessions ───────────────────────────────────────────────────────────
exports.listSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user.id })
      .select("title materials chatHistory createdAt updatedAt")
      .sort({ updatedAt: -1 });

    const list = sessions.map(s => ({
      id: s._id,
      title: s.title,
      materialCount: s.materials.length,
      messageCount: s.chatHistory.length,
      lastMessage: s.chatHistory.length > 0
        ? s.chatHistory[s.chatHistory.length - 1].content.slice(0, 60)
        : null,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    return res.status(200).json({ success: true, sessions: list });
  } catch (error) {
    console.error("List sessions error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Get Session (full detail) ───────────────────────────────────────────────
exports.getSession = async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    return res.status(200).json({
      success: true,
      session: {
        id: session._id,
        title: session.title,
        materials: session.materials,
        chatHistory: session.chatHistory,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get session error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Update Session Title ────────────────────────────────────────────────────
exports.updateSession = async (req, res) => {
  try {
    const { title } = req.body;
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { title },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    return res.status(200).json({
      success: true,
      session: {
        id: session._id,
        title: session.title,
        updatedAt: session.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update session error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Delete Session ──────────────────────────────────────────────────────────
exports.deleteSession = async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    // Delete all materials from ChromaDB for this session
    const studentId = compositeId(req.user.id, session._id);
    for (const mat of session.materials) {
      try {
        await axios.delete(
          `${RAG_SERVICE}/ingest/${mat.materialId}?student_id=${encodeURIComponent(studentId)}`
        );
      } catch (err) {
        console.warn(`Failed to delete material ${mat.materialId} from ChromaDB:`, err.message);
      }
    }

    await Session.deleteOne({ _id: session._id });

    return res.status(200).json({
      success: true,
      message: "Session deleted successfully",
    });
  } catch (error) {
    console.error("Delete session error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Save Chat Messages ─────────────────────────────────────────────────────
exports.saveChatMessages = async (req, res) => {
  try {
    const { messages } = req.body; // array of { role, content, sources }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: "messages array required" });
    }

    const session = await Session.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    for (const msg of messages) {
      session.chatHistory.push({
        role: msg.role,
        content: msg.content,
        sources: msg.sources || [],
        timestamp: msg.timestamp || new Date(),
      });
    }

    await session.save();

    return res.status(200).json({
      success: true,
      messageCount: session.chatHistory.length,
    });
  } catch (error) {
    console.error("Save chat error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
