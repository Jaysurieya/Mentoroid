from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import ingest, query as query_router

app = FastAPI(title="Mentoroid RAG Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router, prefix="/ingest", tags=["Ingest"])
app.include_router(query_router.router, prefix="/query", tags=["Query"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "Mentoroid RAG"}
