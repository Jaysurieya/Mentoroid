"""
services/chunker.py
Splits long page-text into overlapping chunks with metadata.
"""

from langchain_text_splitters import RecursiveCharacterTextSplitter
import uuid


CHUNK_SIZE = 500        # characters
CHUNK_OVERLAP = 80      # characters (~16% overlap)


_splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def chunk_pages(
    pages: list[dict],
    material_id: str,
    student_id: str,
    title: str,
    source_type: str,
) -> list[dict]:
    """
    Takes parser output (list of {page, text}) and returns a flat list of
    chunk dicts ready to be embedded and stored.

    Each chunk dict:
    {
        "chunk_id": str,          # unique uuid
        "material_id": str,
        "student_id": str,
        "title": str,
        "source_type": str,
        "page": int | None,
        "text": str,              # the actual chunk content
    }
    """
    chunks = []
    for page_dict in pages:
        page_num = page_dict.get("page")
        text = page_dict.get("text", "").strip()
        if not text:
            continue
        splits = _splitter.split_text(text)
        for split in splits:
            if not split.strip():
                continue
            chunks.append({
                "chunk_id": str(uuid.uuid4()),
                "material_id": material_id,
                "student_id": student_id,
                "title": title,
                "source_type": source_type,
                "page": page_num,
                "text": split.strip(),
            })
    return chunks
