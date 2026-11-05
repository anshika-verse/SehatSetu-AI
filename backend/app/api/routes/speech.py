from fastapi import APIRouter, File, Form, Response, UploadFile

from app.config import settings
from app.schemas.models import SpeakRequest
from app.services.audio_checks import validate_audio
from app.services.gnani_service import gnani_service
from app.services.language_service import VERIFIED_LANGUAGES

router = APIRouter()


@router.post("/stt/transcribe")
async def stt_transcribe(
    audio: UploadFile = File(...),
    language: str = Form("hinglish"),
) -> dict:
    if language not in VERIFIED_LANGUAGES:
        return {
            "mode": "demo" if not settings.live_speech_enabled else "live",
            "transcript": "",
            "notice": f"Language '{language}' is not in the verified speech catalog. Defaulting to Hinglish/Hindi.",
        }
    payload = await audio.read()
    return await gnani_service.transcribe_audio(
        payload,
        audio.filename or "audio.wav",
        audio.content_type or "audio/wav",
        language,
    )


@router.post("/tts/speak")
async def tts_speak(body: SpeakRequest) -> Response:
    audio, mode = await gnani_service.synthesize_speech(
        body.text,
        body.language,
        gender=body.gender,
        custom_voice=body.voice,
    )
    return Response(
        content=audio,
        media_type="audio/wav",
        headers={
            "X-SehatSetu-Speech-Mode": mode,
            "Cache-Control": "no-store",
        },
    )
