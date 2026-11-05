"""Gnani Service: Unified interface for Gnani Prisma STT and Gnani Timbre TTS.

Official endpoints:
- Prisma STT: POST https://api.vachana.ai/stt/v3
- Timbre TTS: POST https://api.vachana.ai/api/v1/tts/inference
Authentication: Header X-API-Key-ID
"""

import logging
from typing import Tuple

from app.config import settings
from app.services.audio_checks import validate_audio
from app.services.gnani_stt import transcribe as _stt_transcribe
from app.services.gnani_tts import synthesize as _tts_synthesize, demo_wav

logger = logging.getLogger(__name__)


class GnaniService:
    """Manages voice input transcription and speech output synthesis."""

    def __init__(self):
        self.api_key = settings.gnani_api_key
        self.stt_url = settings.gnani_stt_url
        self.stt_model = settings.gnani_stt_model
        self.tts_url = settings.gnani_tts_url
        self.tts_model = settings.gnani_tts_model

    @property
    def is_live(self) -> bool:
        return settings.live_speech_enabled

    async def transcribe_audio(
        self,
        audio: bytes,
        filename: str = "speech.wav",
        content_type: str = "audio/wav",
        language: str = "hinglish",
    ) -> dict:
        """Transcribe audio bytes to text using Gnani Prisma v3 or demo fallback."""
        validate_audio(audio, settings.max_audio_bytes)
        return await _stt_transcribe(audio, filename, content_type, language)

    async def synthesize_speech(
        self,
        text: str,
        language: str = "hinglish",
        gender: str = "female",
        custom_voice: str | None = None,
    ) -> Tuple[bytes, str]:
        """Synthesize text into WAV audio using Gnani Timbre or demo tone fallback."""
        if not text or not text.strip():
            return demo_wav(), "demo"
        return await _tts_synthesize(text, language, gender=gender, custom_voice=custom_voice)

    def status(self) -> dict:
        """Return the current integration status without exposing secrets."""
        return {
            "configured": bool(settings.gnani_api_key.strip()),
            "mode": "live" if settings.live_speech_enabled else "demo",
            "stt": {
                "model": settings.gnani_stt_model,
                "url": settings.gnani_stt_url,
                "languages": ["hi", "hinglish"],
            },
            "tts": {
                "model": settings.gnani_tts_model,
                "url": settings.gnani_tts_url,
                "voices": {
                    "hi": settings.gnani_tts_voice_hi,
                    "hinglish": settings.gnani_tts_voice_hinglish,
                },
            },
        }


gnani_service = GnaniService()


async def transcribe(audio: bytes, filename: str = "speech.wav", content_type: str = "audio/wav", language: str = "hinglish") -> dict:
    return await gnani_service.transcribe_audio(audio, filename, content_type, language)


async def synthesize(text: str, language: str = "hinglish") -> Tuple[bytes, str]:
    return await gnani_service.synthesize_speech(text, language)

