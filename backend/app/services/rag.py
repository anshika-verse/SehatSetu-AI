"""Small keyword retrieval over the curated knowledge files. No generated medical claims."""

import json
import re
from functools import lru_cache
from pathlib import Path

from app.schemas.models import Citation

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "knowledge_base"
STOPWORDS = {
    "a",
    "an",
    "the",
    "is",
    "are",
    "of",
    "to",
    "and",
    "or",
    "in",
    "on",
    "for",
    "me",
    "my",
    "what",
    "how",
    "kya",
    "hai",
    "hota",
    "kaise",
    "about",
    "tell",
    "please",
    "mujhe",
    "batao",
    "bataiye",
}


@lru_cache(maxsize=1)
def _documents() -> tuple[dict, ...]:
    documents: list[dict] = []
    for path in sorted(DATA_DIR.glob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(payload, list):
            documents.extend(payload)
        else:
            documents.append(payload)
    return tuple(documents)


def search_knowledge(question: str, language: str) -> tuple[bool, str, list[Citation]]:
    tokens = [token for token in re.findall(r"[a-zA-Z]{3,}", question.lower()) if token not in STOPWORDS]
    scored: list[tuple[int, dict]] = []
    for document in _documents():
        haystack = " ".join(
            [
                document.get("title", ""),
                " ".join(document.get("keywords", [])),
                document.get("text", ""),
            ]
        ).lower()
        score = sum(1 for token in tokens if token in haystack)
        for keyword in document.get("keywords", []):
            if keyword.lower() in question.lower():
                score += 2
        if score > 0:
            scored.append((score, document))
    scored.sort(key=lambda item: item[0], reverse=True)
    if not scored or scored[0][0] < 2:
        return False, "", []

    chosen = [document for score, document in scored[:2] if score >= 2]
    citations = [
        Citation(
            title=document["title"],
            publisher=document["publisher"],
            url=document["url"],
            last_checked=document["last_checked"],
        )
        for document in chosen
    ]
    if language == "hi":
        prefix = "Yeh saamaanya jaankari niche diye gaye srot se hai. Yeh personal medical advice nahi hai."
    else:
        prefix = "This is general information from the cited source. It is not personal medical advice."
    excerpts = "\n\n".join(document["text"] for document in chosen)
    return True, f"{prefix}\n\n{excerpts}", citations


def list_schemes() -> list[dict]:
    return [document for document in _documents() if document.get("kind") == "scheme"]


def explain_term(term: str) -> dict | None:
    needle = term.lower()
    for document in _documents():
        if document.get("kind") != "term":
            continue
        names = [document["title"].lower(), *[item.lower() for item in document.get("keywords", [])]]
        if any(name in needle or needle in name for name in names):
            return document
    return None
