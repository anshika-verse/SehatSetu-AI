"""Routes for Multilingual Language Support & Detection."""

from typing import List
from fastapi import APIRouter

from app.schemas.models import LanguageDetectRequest, LanguageDetectResponse
from app.services.language_service import language_service

router = APIRouter()


@router.get("/language/supported")
def get_supported_languages() -> List[dict]:
    """Return catalog of verified languages with their active STT and TTS capabilities."""
    return language_service.get_supported_languages()


@router.post("/language/detect", response_model=LanguageDetectResponse)
def detect_user_language(body: LanguageDetectRequest) -> LanguageDetectResponse:
    """Detect language and code-mixed patterns from user speech or text."""
    res = language_service.detect_language(body.text)
    return LanguageDetectResponse(
        detected_language=res["detected_language"],
        language_name=res["language_name"],
        confidence=res["confidence"],
        provider=res["provider"],
        is_code_mixed=res.get("is_code_mixed", False),
    )

