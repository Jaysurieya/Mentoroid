"""
services/vector_store.py
ChromaDB vector store — per-student isolated collections.
ChromaDB 1.5.2 confirmed working on Python 3.14.
"""

import chromadb
import os
from pathlib import Path

CHROMA_DIR = os.getenv("CHROMA_DIR", str(Path(__file__).parent.parent / "chroma_store"))
_client = chromadb.PersistentClient(path=CHROMA_DIR)


def _collection_name(student_id: str) -> str:
    """One ChromaDB collection per student for full data isolation."""
    safe = student_id.replace("-", "_").replace(".", "_")[:50]
    return f"student_{safe}"


def get_or_create_collection(student_id: str):
    return _client.get_or_create_collection(
        name=_collection_name(student_id),
        metadata={"hnsw:space": "cosine"},
    )


def add_chunks(student_id: str, chunks: list[dict], embeddings: list[list[float]]) -> int:
    """Store chunks + embeddings. Returns count stored."""
    if not chunks:
        return 0
    collection = get_or_create_collection(student_id)
    collection.add(
        ids=[c["chunk_id"] for c in chunks],
        embeddings=embeddings,
        documents=[c["text"] for c in chunks],
        metadatas=[
            {
                "material_id": c["material_id"],
                "student_id":  c["student_id"],
                "title":       c["title"],
                "source_type": c["source_type"],
                "page":        str(c["page"]) if c["page"] is not None else "",
            }
            for c in chunks
        ],
    )
    return len(chunks)


def query_chunks(
    student_id: str,
    query_embedding: list[float],
    top_k: int = 5,
    material_ids: list[str] | None = None,
) -> list[dict]:
    """Return top_k most similar chunks, optionally filtered by material_ids."""
    collection = get_or_create_collection(student_id)
    total = collection.count()
    if total == 0:
        return []

    where = None
    if material_ids and len(material_ids) == 1:
        where = {"material_id": material_ids[0]}
    elif material_ids and len(material_ids) > 1:
        where = {"material_id": {"$in": material_ids}}

    kwargs = dict(
        query_embeddings=[query_embedding],
        n_results=min(top_k, total),
        include=["documents", "metadatas", "distances"],
    )
    if where:
        kwargs["where"] = where

    results = collection.query(**kwargs)
    hits = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        hits.append({"text": doc, "metadata": meta, "distance": dist})
    return hits


def delete_material(student_id: str, material_id: str) -> int:
    """Delete all chunks for a material. Returns count deleted."""
    collection = get_or_create_collection(student_id)
    results = collection.get(where={"material_id": material_id}, include=[])
    ids = results.get("ids", [])
    if ids:
        collection.delete(ids=ids)
    return len(ids)


def count_chunks(student_id: str, material_id: str) -> int:
    collection = get_or_create_collection(student_id)
    results = collection.get(where={"material_id": material_id}, include=[])
    return len(results.get("ids", []))
