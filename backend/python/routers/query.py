"""
routers/query.py
POST /query/  — RAG Q&A with query rewriting for better retrieval
"""

from fastapi import APIRouter, HTTPException
from models.schemas import QueryRequest, QueryResponse, SourceCitation
from services.embedder import embed_query
from services import vector_store
from services.llm import generate_answer, rewrite_query

router = APIRouter()


@router.post("/", response_model=QueryResponse)
def ask_question(req: QueryRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        original_question = req.question.strip()

        # 1. Rewrite/expand question for better semantic retrieval
        #    e.g. "who owns this?" → "name, full name, owner, person, candidate name"
        expanded_query = rewrite_query(original_question)
        print(f"[Query] Original : {original_question}")
        print(f"[Query] Expanded : {expanded_query[:120]}...")

        # 2. Embed the EXPANDED query (better vector match)
        q_embedding = embed_query(expanded_query)

        # 3. Retrieve top-k relevant chunks from ChromaDB
        hits = vector_store.query_chunks(
            student_id=req.student_id,
            query_embedding=q_embedding,
            top_k=req.top_k,
            material_ids=req.material_ids,
        )

        if not hits:
            return QueryResponse(
                answer="I couldn't find any relevant content in your uploaded materials. Please upload study materials first.",
                sources=[],
            )

        # 4. Generate answer using the ORIGINAL question (natural phrasing)
        #    but grounded in the retrieved chunks
        answer = generate_answer(original_question, hits)

        # 5. Build source citations
        sources = []
        for h in hits:
            meta = h.get("metadata", {})
            sources.append(
                SourceCitation(
                    material_id=meta.get("material_id", ""),
                    title=meta.get("title", "Unknown Source"),
                    source_type=meta.get("source_type", ""),
                    chunk_text=h["text"][:300] + ("…" if len(h["text"]) > 300 else ""),
                    page=int(meta["page"]) if meta.get("page") else None,
                )
            )

        return QueryResponse(answer=answer, sources=sources)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
