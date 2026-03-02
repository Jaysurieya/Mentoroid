"""
services/embedder.py

Embedding priority (checked in order):
  1. Ollama (nomic-embed-text) — if OLLAMA_EMBED_MODEL is set or Ollama is reachable
  2. Google Gemini (text-embedding-004) — if GEMINI_API_KEY is set
  3. sentence-transformers (all-MiniLM-L6-v2) — local CPU fallback, always works

Set EMBED_BACKEND in .env to force: "ollama" | "gemini" | "local"
"""

import os
from functools import lru_cache

GEMINI_API_KEY      = os.getenv("GEMINI_API_KEY", "")
OLLAMA_BASE_URL     = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_EMBED_MODEL  = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
EMBED_BACKEND       = os.getenv("EMBED_BACKEND", "ollama")   # ollama | gemini | local


# ── Ollama embedder ──────────────────────────────────────────
def _embed_ollama(texts: list[str]) -> list[list[float]]:
    """Batch embed using Ollama's /api/embed endpoint."""
    import requests
    url = f"{OLLAMA_BASE_URL}/api/embed"
    results = []
    # Ollama embed can handle batches directly
    resp = requests.post(url, json={"model": OLLAMA_EMBED_MODEL, "input": texts}, timeout=120)
    resp.raise_for_status()
    data = resp.json()
    # Ollama returns {"embeddings": [[...], [...]]}
    results = data.get("embeddings", [])
    if not results:
        raise ValueError(f"Ollama embed returned empty result. Check that '{OLLAMA_EMBED_MODEL}' is pulled.")
    return results


def _embed_ollama_single(text: str) -> list[float]:
    return _embed_ollama([text])[0]


# ── Gemini embedder ──────────────────────────────────────────
def _embed_gemini(texts: list[str]) -> list[list[float]]:
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)
    results = []
    for i in range(0, len(texts), 100):
        batch = texts[i:i + 100]
        response = genai.embed_content(
            model="models/text-embedding-004",
            content=batch,
            task_type="retrieval_document",
        )
        results.extend(response["embedding"])
    return results


def _embed_gemini_single(text: str) -> list[float]:
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)
    response = genai.embed_content(
        model="models/text-embedding-004",
        content=text,
        task_type="retrieval_query",
    )
    return response["embedding"]


# ── Local sentence-transformers embedder ─────────────────────
@lru_cache(maxsize=1)
def _get_local_model():
    from sentence_transformers import SentenceTransformer
    print("[Embedder] Loading local model: all-MiniLM-L6-v2 ...")
    return SentenceTransformer("all-MiniLM-L6-v2")


def _embed_local(texts: list[str]) -> list[list[float]]:
    return _get_local_model().encode(texts, show_progress_bar=False).tolist()


def _embed_local_single(text: str) -> list[float]:
    return _get_local_model().encode([text], show_progress_bar=False)[0].tolist()


# ── Backend selector ─────────────────────────────────────────
def _get_backend() -> str:
    b = EMBED_BACKEND.lower()
    if b == "gemini" and GEMINI_API_KEY:
        return "gemini"
    if b == "local":
        return "local"
    return "ollama"   # default


# ── Public API ───────────────────────────────────────────────
def embed_documents(texts: list[str]) -> list[list[float]]:
    """Embed a batch of document chunks."""
    backend = _get_backend()
    if backend == "gemini":
        return _embed_gemini(texts)
    if backend == "local":
        return _embed_local(texts)
    return _embed_ollama(texts)


def embed_query(text: str) -> list[float]:
    """Embed a single search query (may use task_type=retrieval_query for Gemini)."""
    backend = _get_backend()
    if backend == "gemini":
        return _embed_gemini_single(text)
    if backend == "local":
        return _embed_local_single(text)
    return _embed_ollama_single(text)
