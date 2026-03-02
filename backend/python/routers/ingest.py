"""
routers/ingest.py
POST /ingest/file  — upload and ingest a file (PDF, image, DOCX, PPTX, TXT)
POST /ingest/url   — ingest a YouTube link or website URL
DELETE /ingest/{material_id} — remove material from vector DB
GET /ingest/list/{student_id} — list all materials for a student
"""

import uuid, os, shutil, tempfile
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse

from models.schemas import IngestResponse, DeleteResponse, MaterialInfo
from services.parser import parse_file, parse_url, detect_source_type
from services.chunker import chunk_pages
from services.embedder import embed_documents
from services import vector_store

router = APIRouter()

# Temp upload directory
UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# In-memory registry: material_id → MaterialInfo dict
# In Phase 5 this will be replaced with MongoDB
_material_registry: dict[str, dict] = {}


# ──────────────────────────────────────────────
# POST /ingest/file
# ──────────────────────────────────────────────
@router.post("/file", response_model=IngestResponse)
async def ingest_file(
    student_id: str = Form(...),
    title: str = Form(None),
    file: UploadFile = File(...),
):
    material_id = str(uuid.uuid4())
    original_filename = file.filename or "upload"
    display_title = title or original_filename

    # Detect source type from extension
    source_type = detect_source_type(original_filename)

    # Save upload to temp path
    suffix = Path(original_filename).suffix
    tmp_path = UPLOAD_DIR / f"{material_id}{suffix}"
    try:
        with open(tmp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # 1. Parse
        pages = parse_file(str(tmp_path), source_type)
        if not pages:
            raise HTTPException(status_code=422, detail="Could not extract any text from the file.")

        # 2. Chunk
        chunks = chunk_pages(
            pages=pages,
            material_id=material_id,
            student_id=student_id,
            title=display_title,
            source_type=source_type.value,
        )
        if not chunks:
            raise HTTPException(status_code=422, detail="File contained no processable text chunks.")

        # 3. Embed
        texts = [c["text"] for c in chunks]
        embeddings = embed_documents(texts)

        # 4. Store in ChromaDB
        vector_store.add_chunks(student_id, chunks, embeddings)

        # Register in memory
        info = {
            "material_id": material_id,
            "student_id": student_id,
            "title": display_title,
            "source_type": source_type.value,
            "chunk_count": len(chunks),
            "status": "ready",
            "file_path": str(tmp_path),
        }
        _material_registry[material_id] = info

        return IngestResponse(
            material_id=material_id,
            student_id=student_id,
            title=display_title,
            source_type=source_type.value,
            chunk_count=len(chunks),
            status="ready",
            message=f"Successfully ingested '{display_title}' — {len(chunks)} chunks stored.",
        )

    except HTTPException:
        raise
    except Exception as e:
        # Clean up on failure
        if tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")


# ──────────────────────────────────────────────
# POST /ingest/url
# ──────────────────────────────────────────────
@router.post("/url", response_model=IngestResponse)
async def ingest_url(
    student_id: str = Form(...),
    url: str = Form(...),
    title: str = Form(None),
):
    material_id = str(uuid.uuid4())
    source_type = detect_source_type("", url=url)
    display_title = title or url[:80]

    try:
        # 1. Parse
        pages = parse_url(url, source_type)
        if not pages:
            raise HTTPException(status_code=422, detail="Could not extract any content from the URL.")

        # 2. Chunk
        chunks = chunk_pages(
            pages=pages,
            material_id=material_id,
            student_id=student_id,
            title=display_title,
            source_type=source_type.value,
        )
        if not chunks:
            raise HTTPException(status_code=422, detail="URL content produced no processable chunks.")

        # 3. Embed
        texts = [c["text"] for c in chunks]
        embeddings = embed_documents(texts)

        # 4. Store
        vector_store.add_chunks(student_id, chunks, embeddings)

        info = {
            "material_id": material_id,
            "student_id": student_id,
            "title": display_title,
            "source_type": source_type.value,
            "chunk_count": len(chunks),
            "status": "ready",
            "url": url,
        }
        _material_registry[material_id] = info

        return IngestResponse(
            material_id=material_id,
            student_id=student_id,
            title=display_title,
            source_type=source_type.value,
            chunk_count=len(chunks),
            status="ready",
            message=f"Successfully ingested URL '{display_title}' — {len(chunks)} chunks stored.",
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"URL ingestion failed: {str(e)}")


# ──────────────────────────────────────────────
# DELETE /ingest/{material_id}?student_id=...
# ──────────────────────────────────────────────
@router.delete("/{material_id}", response_model=DeleteResponse)
def delete_material_endpoint(
    material_id: str,
    student_id: str = None,   # query param: ?student_id=xxx
):
    # Resolve student_id:
    # Priority 1 — query param (always works, even after server restart)
    # Priority 2 — in-memory registry (only valid within same server session)
    info = _material_registry.get(material_id)

    if not student_id:
        if not info:
            raise HTTPException(
                status_code=404,
                detail=f"Material '{material_id}' not found and student_id not provided. "
                       "Pass ?student_id=... to force-delete from vector DB."
            )
        student_id = info["student_id"]

    # Always delete from ChromaDB (works regardless of in-memory state)
    deleted = vector_store.delete_material(student_id, material_id)

    # Clean up uploaded file if we have its path
    if info:
        file_path = info.get("file_path")
        if file_path and Path(file_path).exists():
            Path(file_path).unlink(missing_ok=True)
        del _material_registry[material_id]

    title = info["title"] if info else material_id
    return DeleteResponse(
        material_id=material_id,
        deleted_chunks=deleted,
        message=f"Deleted '{title}' — {deleted} chunks removed from vector DB.",
    )


# ──────────────────────────────────────────────
# GET /ingest/list/{student_id}
# ──────────────────────────────────────────────
@router.get("/list/{student_id}")
def list_materials(student_id: str):
    materials = [
        v for v in _material_registry.values()
        if v["student_id"] == student_id
    ]
    return {"student_id": student_id, "materials": materials}
