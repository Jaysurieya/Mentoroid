"""
services/llm.py
RAG answer generation — supports:
  - Ollama Cloud  (Llama 3.2 90B Vision via api.ollama.com)
  - Ollama Local  (any locally running model)
  - Google Gemini (text generation)

Controlled by LLM_BACKEND in .env:  "ollama_cloud" | "ollama_local" | "gemini"
"""

import os

LLM_BACKEND          = os.getenv("LLM_BACKEND", "ollama_cloud")
OLLAMA_API_KEY       = os.getenv("OLLAMA_API_KEY", "")
OLLAMA_CLOUD_BASE_URL= os.getenv("OLLAMA_CLOUD_BASE_URL", "https://api.ollama.com")
OLLAMA_CLOUD_MODEL   = os.getenv("OLLAMA_CLOUD_MODEL", "llama3.2-vision:90b-instruct")
OLLAMA_LOCAL_URL     = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_LOCAL_MODEL   = os.getenv("OLLAMA_MODEL", "llama3.2")
GEMINI_API_KEY       = os.getenv("GEMINI_API_KEY", "")


# ── System prompt ─────────────────────────────────────────────
SYSTEM_PROMPT = """You are Mentoroid AI, a helpful and friendly study assistant.
Your job is to answer the student's question STRICTLY based on the provided context excerpts from their study materials.

Rules:
1. Answer ONLY from the context. Do not add external knowledge.
2. If the answer is NOT in the context, say: "I couldn't find this in your uploaded materials. Try uploading more relevant sources."
3. Be clear, concise, and student-friendly. Use bullet points when listing multiple points.
4. When quoting specific facts, mention the source title (e.g. "According to [Source 1: ...]").
5. Never hallucinate or guess beyond the provided context.
"""


def _build_prompt(question: str, chunks: list[dict]) -> str:
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        meta   = chunk.get("metadata", {})
        title  = meta.get("title", "Unknown Source")
        page   = meta.get("page", "")
        loc    = f" (Page {page})" if page else ""
        context_parts.append(f"[Source {i}: {title}{loc}]\n{chunk['text']}")
    context = "\n\n---\n\n".join(context_parts)
    return f"CONTEXT:\n{context}\n\nQUESTION: {question}\n\nANSWER:"


# ── Ollama Cloud ──────────────────────────────────────────────
def _answer_ollama_cloud(question: str, chunks: list[dict]) -> str:
    from ollama import Client
    client = Client(
        host=OLLAMA_CLOUD_BASE_URL,
        headers={"Authorization": f"Bearer {OLLAMA_API_KEY}"},
    )
    user_prompt = _build_prompt(question, chunks)
    response = client.chat(
        model=OLLAMA_CLOUD_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_prompt},
        ],
    )
    return response.message.content.strip()


# ── Ollama Local ──────────────────────────────────────────────
def _answer_ollama_local(question: str, chunks: list[dict]) -> str:
    from ollama import Client
    client = Client(host=OLLAMA_LOCAL_URL)
    user_prompt = _build_prompt(question, chunks)
    response = client.chat(
        model=OLLAMA_LOCAL_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_prompt},
        ],
    )
    return response.message.content.strip()


# ── Gemini ────────────────────────────────────────────────────
def _answer_gemini(question: str, chunks: list[dict]) -> str:
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)
    model  = genai.GenerativeModel("gemini-1.5-flash")
    prompt = f"{SYSTEM_PROMPT}\n\n{_build_prompt(question, chunks)}"
    return model.generate_content(prompt).text.strip()


# ── Public API ────────────────────────────────────────────────
def generate_answer(question: str, chunks: list[dict]) -> str:
    if not chunks:
        return "I couldn't find any relevant content in your uploaded materials for this question."

    backend = LLM_BACKEND.lower()

    if backend == "ollama_cloud":
        if not OLLAMA_API_KEY:
            raise ValueError("OLLAMA_API_KEY is not set in .env — required for ollama_cloud backend.")
        return _answer_ollama_cloud(question, chunks)

    if backend == "gemini":
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not set in .env — required for gemini backend.")
        return _answer_gemini(question, chunks)

    # Default: ollama_local
    return _answer_ollama_local(question, chunks)


# ── Query Rewriting ───────────────────────────────────────────
_REWRITE_PROMPT = """You are a search query optimizer for a student study assistant.
The student asks a question in natural language. Your job is to rewrite it into 4-5 short search phrases that would best match relevant text in a document.

Rules:
- Output ONLY the search phrases, one per line. No bullets, no numbering, no explanation.
- Use different synonyms and phrasings of the same concept.
- Keep each phrase short (2-6 words).
- Focus on the KEY INFORMATION being asked, not how it is asked.

Examples:
  Input: "who is the owner of this resume?"
  Output:
  name of person
  full name candidate
  resume owner identity
  person name
  candidate name

  Input: "what is newton's second law?"
  Output:
  newton second law
  force mass acceleration
  F equals ma
  newton law of motion

Now rewrite this question:
"""


def _call_llm_simple(prompt: str) -> str:
    """Call the configured LLM backend with a plain prompt (no system context needed)."""
    backend = LLM_BACKEND.lower()
    if backend == "ollama_cloud" and OLLAMA_API_KEY:
        from ollama import Client
        client = Client(
            host=OLLAMA_CLOUD_BASE_URL,
            headers={"Authorization": f"Bearer {OLLAMA_API_KEY}"},
        )
        resp = client.chat(
            model=OLLAMA_CLOUD_MODEL,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.message.content.strip()
    elif backend == "gemini" and GEMINI_API_KEY:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        return genai.GenerativeModel("gemini-1.5-flash").generate_content(prompt).text.strip()
    else:
        from ollama import Client
        client = Client(host=OLLAMA_LOCAL_URL)
        resp = client.chat(
            model=OLLAMA_LOCAL_MODEL,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.message.content.strip()


def rewrite_query(question: str) -> str:
    """
    Rewrites a natural-language question into expanded search phrases.
    Returns a single string combining original + rephrased terms for embedding.
    Falls back to original question on any error.
    """
    try:
        prompt = _REWRITE_PROMPT + question
        rewritten = _call_llm_simple(prompt)
        # Combine original question with the rewrites for best recall
        combined = question + "\n" + rewritten
        return combined
    except Exception as e:
        print(f"[QueryRewrite] Warning: rewrite failed, using original. Error: {e}")
        return question  # graceful fallback — never break the query pipeline

