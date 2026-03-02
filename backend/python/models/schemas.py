from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class SourceType(str, Enum):
    pdf = "pdf"
    image = "image"
    docx = "docx"
    pptx = "pptx"
    txt = "txt"
    youtube = "youtube"
    website = "website"


class IngestURLRequest(BaseModel):
    student_id: str
    url: str
    title: Optional[str] = None


class IngestResponse(BaseModel):
    material_id: str
    student_id: str
    title: str
    source_type: str
    chunk_count: int
    status: str
    message: str


class QueryRequest(BaseModel):
    student_id: str
    question: str
    material_ids: Optional[List[str]] = None   # None = search all student's materials
    top_k: int = 5


class SourceCitation(BaseModel):
    material_id: str
    title: str
    source_type: str
    chunk_text: str
    page: Optional[int] = None


class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceCitation]


class DeleteResponse(BaseModel):
    material_id: str
    deleted_chunks: int
    message: str


class MaterialInfo(BaseModel):
    material_id: str
    student_id: str
    title: str
    source_type: str
    chunk_count: int
    status: str
