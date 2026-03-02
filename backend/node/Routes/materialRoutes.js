// Routes/materialRoutes.js
// Proxy routes: Node.js ↔ Python RAG Service
// Handles file uploads, URL ingestion, Q&A, and material management

const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs');
const router = express.Router();

const RAG_SERVICE = process.env.RAG_SERVICE_URL || 'http://localhost:8000';

// multer: store in memory so we can forward to Python
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50 MB

// ─────────────────────────────────────────────────────────────
// POST /api/materials/upload  — upload a file for ingestion
// ─────────────────────────────────────────────────────────────
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const { student_id, title } = req.body;
        if (!student_id) return res.status(400).json({ error: 'student_id is required' });
        if (!req.file) return res.status(400).json({ error: 'No file provided' });

        const form = new FormData();
        form.append('student_id', student_id);
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

        return res.status(200).json(response.data);
    } catch (err) {
        const detail = err.response?.data?.detail || err.message;
        return res.status(err.response?.status || 500).json({ error: detail });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/materials/url  — ingest a YouTube or website URL
// ─────────────────────────────────────────────────────────────
router.post('/url', async (req, res) => {
    try {
        const { student_id, url, title } = req.body;
        if (!student_id) return res.status(400).json({ error: 'student_id is required' });
        if (!url) return res.status(400).json({ error: 'url is required' });

        const form = new FormData();
        form.append('student_id', student_id);
        form.append('url', url);
        if (title) form.append('title', title);

        const response = await axios.post(`${RAG_SERVICE}/ingest/url`, form, {
            headers: form.getHeaders(),
        });

        return res.status(200).json(response.data);
    } catch (err) {
        const detail = err.response?.data?.detail || err.message;
        return res.status(err.response?.status || 500).json({ error: detail });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/materials/:studentId  — list all materials
// ─────────────────────────────────────────────────────────────
router.get('/:studentId', async (req, res) => {
    try {
        const response = await axios.get(`${RAG_SERVICE}/ingest/list/${req.params.studentId}`);
        return res.status(200).json(response.data);
    } catch (err) {
        const detail = err.response?.data?.detail || err.message;
        return res.status(err.response?.status || 500).json({ error: detail });
    }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/materials/:materialId?student_id=...  — delete a material
// ─────────────────────────────────────────────────────────────
router.delete('/:materialId', async (req, res) => {
    try {
        const { materialId } = req.params;
        // Accept student_id from query param or body
        const student_id = req.query.student_id || req.body.student_id;

        // Always send student_id so Python can delete from ChromaDB
        // even if its in-memory registry was wiped by a server restart
        const url = student_id
            ? `${RAG_SERVICE}/ingest/${materialId}?student_id=${encodeURIComponent(student_id)}`
            : `${RAG_SERVICE}/ingest/${materialId}`;

        const response = await axios.delete(url);
        return res.status(200).json(response.data);
    } catch (err) {
        const detail = err.response?.data?.detail || err.message;
        return res.status(err.response?.status || 500).json({ error: detail });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/rag/query  — ask a question (RAG)
// ─────────────────────────────────────────────────────────────
router.post('/query', async (req, res) => {
    try {
        const { student_id, question, material_ids, top_k } = req.body;
        if (!student_id) return res.status(400).json({ error: 'student_id is required' });
        if (!question) return res.status(400).json({ error: 'question is required' });

        const response = await axios.post(`${RAG_SERVICE}/query/`, {
            student_id,
            question,
            material_ids: material_ids || null,
            top_k: top_k || 5,
        });

        return res.status(200).json(response.data);
    } catch (err) {
        const detail = err.response?.data?.detail || err.message;
        return res.status(err.response?.status || 500).json({ error: detail });
    }
});

module.exports = router;
