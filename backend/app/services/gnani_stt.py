"""Gnani Prisma REST transcription.

Contract verified from https://docs.gnani.ai/api/STT/speech-to-text on 5 Nov 2026:
POST https://api.vachana.ai/stt/v3
Header X-API-Key-ID
multipart fields audio_file, model, language_code
"""

import httpx
from fastapi import HTTPException

from app.config import settings

LANGUAGE_CODES = {
    "hi": "hi-IN",
    "hinglish": "hi-IN,en-IN",
    "en": "en-IN",
    "ta": "ta-IN",
    "te": "te-IN",
    "bn": "bn-IN",
    "mr": "mr-IN",
    "gu": "gu-IN",
    "kn": "kn-IN",
}

DEMO_NOTICE = (
    "DEMO mode: no Gnani API key is configured, so this is not a Prisma transcript. "
    "Type or edit your words below. Add GNANI_API_KEY to backend/.env to use live speech-to-text."
)


async def transcribe(audio: bytes, filename: str, content_type: str, language: str) -> dict:
    if not settings.live_speech_enabled:
        return {
            "mode": "demo",
            "transcript": "",
            "detected_language_code": None,
            "model": None,
            "notice": DEMO_NOTICE,
        }

    language_code = LANGUAGE_CODES.get(language, "hi-IN,en-IN")
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                settings.gnani_stt_url,
                headers={"X-API-Key-ID": settings.gnani_api_key},
                files={"audio_file": (filename or "audio.wav", audio, content_type or "audio/wav")},
                data={"model": settings.gnani_stt_model, "language_code": language_code},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Speech-to-text request failed. Please try again.") from exc

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=_provider_error(response))

    body = response.json()
    if body.get("success") is False:
        error = body.get("error") or {}
        message = error.get("message") or "Speech-to-text was not successful."
        raise HTTPException(status_code=502, detail=message)

    transcript = body.get("transcript") or ""
    notice = None
    if transcript == "":
        notice = "No speech was detected. Please try again with a short, clear recording."
    return {
        "mode": "live",
        "transcript": transcript,
        "detected_language_code": body.get("detected_language_code"),
        "model": body.get("model"),
        "notice": notice,
    }


def _provider_error(response: httpx.Response) -> str:
    try:
        body = response.json()
    except ValueError:
        return "Speech-to-text provider returned an error."
    if isinstance(body, dict):
        detail = body.get("detail")
        if isinstance(detail, dict) and detail.get("message"):
            return str(detail["message"])
        error = body.get("error")
        if isinstance(error, dict) and error.get("message"):
            return str(error["message"])
    return "Speech-to-text provider returned an error."
