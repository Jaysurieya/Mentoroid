// Routes/materialRoutes.js
// Proxy routes: Node.js ↔ Python RAG Service
// Now with auth + session-based isolation

const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
const router = express.Router();
const authMiddleware = require('../Middleware/authMiddleware');
const Session = require('../Models/SessionSchema');

const RAG_SERVICE = process.env.RAG_SERVICE_URL || 'http://localhost:8000';

// multer: store in memory so we can forward to Python
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50 MB

// Helper: composite student_id for ChromaDB
function compositeId(userId, sessionId) {
    return `${userId}_${sessionId}`;
}

// ─────────────────────────────────────────────────────────────
// POST /api/materials/upload  — upload a file for ingestion
// ─────────────────────────────────────────────────────────────
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        const { session_id, title } = req.body;
        if (!session_id) return res.status(400).json({ error: 'session_id is required' });
        if (!req.file) return res.status(400).json({ error: 'No file provided' });

        // Verify session belongs to user
        const session = await Session.findOne({ _id: session_id, userId: req.user.id });
        if (!session) return res.status(404).json({ error: 'Session not found' });

        const studentId = compositeId(req.user.id, session_id);

        const form = new FormData();
        form.append('student_id', studentId);
        if (title) form.append('title', title);
        form.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        const response = await axios.post(`${RAG_SERVICE}/ingest/file`, form, {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        });

        const result = response.data;

        // Save material metadata to session in MongoDB
        session.materials.push({
            materialId: result.material_id,
            title: result.title,
            sourceType: result.source_type,
            chunkCount: result.chunk_count,
            status: result.status || "ready",
        });
        await session.save();

        return res.status(200).json(result);
    } catch (err) {
        const detail = err.response?.data?.detail || err.message;
        return res.status(err.response?.status || 500).json({ error: detail });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/materials/url  — ingest a YouTube or website URL
// ─────────────────────────────────────────────────────────────
router.post('/url', authMiddleware, upload.none(), async (req, res) => {
    try {
        const { session_id, url, title } = req.body;
        if (!session_id) return res.status(400).json({ error: 'session_id is required' });
        if (!url) return res.status(400).json({ error: 'url is required' });

        const session = await Session.findOne({ _id: session_id, userId: req.user.id });
        if (!session) return res.status(404).json({ error: 'Session not found' });

        const studentId = compositeId(req.user.id, session_id);

        const form = new FormData();
        form.append('student_id', studentId);
        form.append('url', url);
        if (title) form.append('title', title);

        const response = await axios.post(`${RAG_SERVICE}/ingest/url`, form, {
            headers: form.getHeaders(),
        });

        const result = response.data;

        // Save material metadata to session
        session.materials.push({
            materialId: result.material_id,
            title: result.title,
            sourceType: result.source_type,
            chunkCount: result.chunk_count,
            status: result.status || "ready",
            url: url,
        });
        await session.save();

        return res.status(200).json(result);
    } catch (err) {
        const detail = err.response?.data?.detail || err.message;
        return res.status(err.response?.status || 500).json({ error: detail });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/materials/session/:sessionId  — list materials for a session
// ─────────────────────────────────────────────────────────────
router.get('/session/:sessionId', authMiddleware, async (req, res) => {
    try {
        const session = await Session.findOne({
            _id: req.params.sessionId,
            userId: req.user.id,
        });
        if (!session) return res.status(404).json({ error: 'Session not found' });

        return res.status(200).json({
            session_id: session._id,
            materials: session.materials,
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/materials/:materialId  — delete a material
// ─────────────────────────────────────────────────────────────
router.delete('/:materialId', authMiddleware, async (req, res) => {
    try {
        const { materialId } = req.params;
        const { session_id } = req.query;

        if (!session_id) return res.status(400).json({ error: 'session_id query param is required' });

        const session = await Session.findOne({ _id: session_id, userId: req.user.id });
        if (!session) return res.status(404).json({ error: 'Session not found' });

        const studentId = compositeId(req.user.id, session_id);

        // Delete from ChromaDB via Python
        try {
            await axios.delete(
                `${RAG_SERVICE}/ingest/${materialId}?student_id=${encodeURIComponent(studentId)}`
            );
        } catch (err) {
            console.warn("ChromaDB delete failed:", err.message);
        }

        // Remove from session's material list
        session.materials = session.materials.filter(m => m.materialId !== materialId);
        await session.save();

        return res.status(200).json({
            material_id: materialId,
            message: "Material deleted successfully",
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/rag/query  — ask a question (RAG)
// ─────────────────────────────────────────────────────────────
router.post('/query', authMiddleware, async (req, res) => {
    try {
        const { session_id, question, material_ids, top_k } = req.body;
        if (!session_id) return res.status(400).json({ error: 'session_id is required' });
        if (!question) return res.status(400).json({ error: 'question is required' });

        // Verify session
        const session = await Session.findOne({ _id: session_id, userId: req.user.id });
        if (!session) return res.status(404).json({ error: 'Session not found' });

        const studentId = compositeId(req.user.id, session_id);

        const response = await axios.post(`${RAG_SERVICE}/query/`, {
            student_id: studentId,
            question,
            material_ids: material_ids || null,
            top_k: top_k || 5,
        });

        const data = response.data;

        // Save chat exchange to session
        session.chatHistory.push(
            { role: "user", content: question, sources: [] },
            { role: "assistant", content: data.answer, sources: data.sources || [] }
        );
        await session.save();

        return res.status(200).json(data);
    } catch (err) {
        const detail = err.response?.data?.detail || err.message;
        return res.status(err.response?.status || 500).json({ error: detail });
    }
});

module.exports = router;
