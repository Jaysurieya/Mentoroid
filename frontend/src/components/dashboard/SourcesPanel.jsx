// src/components/dashboard/SourcesPanel.jsx
// Full upload-capable Sources panel for Mentoroid RAG
// Supports: PDF, images, DOCX, PPTX, TXT files + YouTube/website URLs

import { useState, useRef, useCallback } from "react";
import {
    Plus, Check, FileText, Layers, X, Link, Youtube,
    Globe, Upload, Loader, AlertCircle, ChevronDown, Trash2,
    File, Image, FileSpreadsheet
} from "lucide-react";

// ── API base (Node.js backend) ─────────────────────────────
const API_BASE = "http://localhost:5000/api";

// Demo student ID — replace with real Firebase UID from auth context
const DEMO_STUDENT_ID = "student_demo_001";

// ── File type → icon + color ───────────────────────────────
function SourceIcon({ sourceType, size = 13 }) {
    const iconMap = {
        pdf: { icon: <FileText size={size} />, color: "#ef4444" },
        image: { icon: <Image size={size} />, color: "#8b5cf6" },
        docx: { icon: <FileText size={size} />, color: "#3b82f6" },
        pptx: { icon: <FileSpreadsheet size={size} />, color: "#f97316" },
        txt: { icon: <File size={size} />, color: "#6b7280" },
        youtube: { icon: <Youtube size={size} />, color: "#ef4444" },
        website: { icon: <Globe size={size} />, color: "#22c55e" },
    };
    const entry = iconMap[sourceType] || iconMap.txt;
    return <span style={{ color: entry.color }}>{entry.icon}</span>;
}

// ── Upload state badge ─────────────────────────────────────
function StatusBadge({ status }) {
    if (status === "uploading" || status === "processing") {
        return (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#a78bfa" }}>
                <Loader size={10} className="spin-icon" /> Processing
            </span>
        );
    }
    if (status === "error") {
        return <span style={{ fontSize: 10, color: "#ef4444" }}>Failed</span>;
    }
    if (status === "ready") {
        return <span style={{ fontSize: 10, color: "#22c55e" }}>Ready</span>;
    }
    return null;
}

// ── Add Source Modal ───────────────────────────────────────
function AddSourceModal({ onClose, onAdd }) {
    const [tab, setTab] = useState("file");   // "file" | "url"
    const [url, setUrl] = useState("");
    const [urlTitle, setUrlTitle] = useState("");
    const [urlError, setUrlError] = useState("");
    const [urlLoading, setUrlLoading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileSelect = async (files) => {
        if (!files || files.length === 0) return;
        for (const file of Array.from(files)) {
            await onAdd({ type: "file", file });
        }
        onClose();
    };

    const handleUrlSubmit = async () => {
        if (!url.trim()) { setUrlError("Please enter a URL"); return; }
        setUrlError("");
        setUrlLoading(true);
        await onAdd({ type: "url", url: url.trim(), title: urlTitle.trim() || null });
        setUrlLoading(false);
        onClose();
    };

    return (
        <div className="src-modal-overlay" onClick={onClose}>
            <div className="src-modal" onClick={e => e.stopPropagation()}>
                <div className="src-modal-header">
                    <span>Add Source</span>
                    <button className="src-modal-close" onClick={onClose}><X size={15} /></button>
                </div>

                {/* Tab switcher */}
                <div className="src-modal-tabs">
                    <button className={`src-modal-tab ${tab === "file" ? "active" : ""}`} onClick={() => setTab("file")}>
                        <Upload size={13} /> Upload File
                    </button>
                    <button className={`src-modal-tab ${tab === "url" ? "active" : ""}`} onClick={() => setTab("url")}>
                        <Link size={13} /> Add URL
                    </button>
                </div>

                {/* File upload tab */}
                {tab === "file" && (
                    <div className="src-modal-body">
                        <div
                            className="src-modal-dropzone"
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => { e.preventDefault(); handleFileSelect(e.dataTransfer.files); }}
                        >
                            <Layers size={28} color="#7c3aed" />
                            <div className="src-modal-drop-label">Drag & drop or click to browse</div>
                            <div className="src-modal-drop-sub">PDF • DOCX • PPTX • Images (JPG/PNG) • TXT • MD</div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.md,.jpg,.jpeg,.png,.webp,.bmp,.tiff"
                            style={{ display: "none" }}
                            onChange={e => handleFileSelect(e.target.files)}
                        />
                    </div>
                )}

                {/* URL tab */}
                {tab === "url" && (
                    <div className="src-modal-body">
                        <div className="src-url-type-hints">
                            <span className="src-url-hint"><Youtube size={12} color="#ef4444" /> YouTube</span>
                            <span className="src-url-hint"><Globe size={12} color="#22c55e" /> Website / Docs</span>
                        </div>
                        <input
                            className="src-modal-input"
                            placeholder="https://youtube.com/watch?v=... or https://docs.example.com"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleUrlSubmit(); }}
                        />
                        <input
                            className="src-modal-input"
                            placeholder="Title (optional)"
                            value={urlTitle}
                            onChange={e => setUrlTitle(e.target.value)}
                            style={{ marginTop: 8 }}
                        />
                        {urlError && (
                            <div className="src-modal-error"><AlertCircle size={12} />{urlError}</div>
                        )}
                        <button
                            className="src-modal-submit"
                            onClick={handleUrlSubmit}
                            disabled={urlLoading || !url.trim()}
                        >
                            {urlLoading ? <><Loader size={13} className="spin-icon" /> Processing…</> : "Add URL"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main SourcesPanel ──────────────────────────────────────
export default function SourcesPanel({ onSourcesChange }) {
    const [sources, setSources] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState("");

    const updateSources = useCallback((updater) => {
        setSources(prev => {
            const next = typeof updater === "function" ? updater(prev) : updater;
            onSourcesChange?.(next.filter(s => s.status === "ready"));
            return next;
        });
    }, [onSourcesChange]);

    // ── Upload / ingest a single source ───────────────────────
    const handleAdd = useCallback(async ({ type, file, url, title }) => {
        const tempId = `tmp_${Date.now()}_${Math.random()}`;
        const displayName = type === "file" ? file.name : (title || url);

        // Add placeholder
        updateSources(prev => [
            ...prev,
            {
                id: tempId,
                name: displayName,
                source_type: type === "url" ? (url?.includes("youtube") ? "youtube" : "website") : "pdf",
                status: "processing",
                checked: false,
                chunk_count: 0,
            }
        ]);

        setError("");

        try {
            let result;
            if (type === "file") {
                const form = new FormData();
                form.append("student_id", DEMO_STUDENT_ID);
                form.append("file", file);
                const res = await fetch(`${API_BASE}/materials/upload`, { method: "POST", body: form });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || "Upload failed");
                }
                result = await res.json();
            } else {
                const form = new FormData();
                form.append("student_id", DEMO_STUDENT_ID);
                form.append("url", url);
                if (title) form.append("title", title);
                const res = await fetch(`${API_BASE}/materials/url`, { method: "POST", body: form });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || "URL ingestion failed");
                }
                result = await res.json();
            }

            // Replace placeholder with real data
            updateSources(prev => prev.map(s =>
                s.id === tempId
                    ? {
                        id: result.material_id,
                        name: result.title,
                        source_type: result.source_type,
                        status: "ready",
                        checked: true,
                        chunk_count: result.chunk_count,
                    }
                    : s
            ));
        } catch (err) {
            setError(err.message);
            updateSources(prev => prev.map(s =>
                s.id === tempId ? { ...s, status: "error" } : s
            ));
        }
    }, [updateSources]);

    // ── Toggle checked ─────────────────────────────────────────
    const toggle = useCallback((id) => {
        updateSources(prev => prev.map(s => s.id === id ? { ...s, checked: !s.checked } : s));
    }, [updateSources]);

    // ── Delete source ──────────────────────────────────────────
    const deleteSource = useCallback(async (id, e) => {
        e.stopPropagation();
        updateSources(prev => prev.map(s => s.id === id ? { ...s, status: "deleting" } : s));
        try {
            if (!id.startsWith("tmp_")) {
                // Always send student_id so Python can delete from ChromaDB
                // even after a server restart (when its in-memory registry is empty)
                await fetch(
                    `${API_BASE}/materials/${id}?student_id=${encodeURIComponent(DEMO_STUDENT_ID)}`,
                    { method: "DELETE" }
                );
            }
        } catch (err) {
            console.warn("Delete failed:", err);
        }
        updateSources(prev => prev.filter(s => s.id !== id));
    }, [updateSources]);

    const readyCount = sources.filter(s => s.status === "ready").length;
    const checkedCount = sources.filter(s => s.checked && s.status === "ready").length;

    return (
        <>
            <div className="nb-sources">
                <div className="nb-panel-header">
                    <span className="nb-panel-title">Sources</span>
                    {readyCount > 0 && (
                        <span style={{ fontSize: 10, color: "#6b7280", background: "#1a1a1a", padding: "2px 7px", borderRadius: 10 }}>
                            {checkedCount}/{readyCount} active
                        </span>
                    )}
                </div>

                <div className="nb-sources-body">
                    {/* Add sources button */}
                    <button className="nb-add-source-btn" onClick={() => setShowModal(true)}>
                        <Plus size={14} /> Add sources
                    </button>

                    {/* Error banner */}
                    {error && (
                        <div className="src-error-banner">
                            <AlertCircle size={13} />
                            <span>{error}</span>
                            <button onClick={() => setError("")}><X size={11} /></button>
                        </div>
                    )}

                    {/* Source list */}
                    {sources.map(src => (
                        <div
                            key={src.id}
                            className={`nb-source-item src-item-ext ${src.status === "error" ? "src-item-error" : ""}`}
                            onClick={() => src.status === "ready" && toggle(src.id)}
                        >
                            {/* Checkbox */}
                            <div
                                className="nb-source-check"
                                style={{
                                    background: src.checked && src.status === "ready" ? "#7c3aed" : "transparent",
                                    border: src.checked && src.status === "ready" ? "none" : "1px solid #3f3f46",
                                    opacity: src.status !== "ready" ? 0.4 : 1,
                                }}
                            >
                                {src.checked && src.status === "ready" && <Check size={10} color="#fff" />}
                            </div>

                            {/* Info */}
                            <div className="src-item-info">
                                <span className="nb-source-name">{src.name}</span>
                                <div className="src-item-meta">
                                    <SourceIcon sourceType={src.source_type} size={10} />
                                    <span style={{ fontSize: 10, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                        {src.source_type}
                                    </span>
                                    {src.chunk_count > 0 && (
                                        <span style={{ fontSize: 10, color: "#4b5563" }}>· {src.chunk_count} chunks</span>
                                    )}
                                    <StatusBadge status={src.status} />
                                </div>
                            </div>

                            {/* Delete */}
                            {src.status !== "processing" && (
                                <button
                                    className="src-delete-btn"
                                    onClick={(e) => deleteSource(src.id, e)}
                                    title="Remove source"
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                    ))}

                    {/* Drop zone (when no sources) */}
                    {sources.length === 0 && (
                        <div
                            className="nb-drop-zone"
                            onClick={() => setShowModal(true)}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => {
                                e.preventDefault();
                                if (e.dataTransfer.files.length > 0) {
                                    Array.from(e.dataTransfer.files).forEach(f =>
                                        handleAdd({ type: "file", file: f })
                                    );
                                }
                            }}
                        >
                            <Layers size={20} color="#4b5563" />
                            <span className="nb-drop-zone-label">Drop files here or click to add</span>
                            <span className="nb-drop-zone-sub">PDF • DOCX • Images • YouTube • Docs URLs</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <AddSourceModal
                    onClose={() => setShowModal(false)}
                    onAdd={handleAdd}
                />
            )}
        </>
    );
}
