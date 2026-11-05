"""Gnani Timbre REST synthesis.

Contract verified from https://docs.gnani.ai/api/TTS/tts-inference on 5 Nov 2026:
POST https://api.vachana.ai/api/v1/tts/inference
Header X-API-Key-ID
JSON text, voice, model, language, speed, audio_config
Success body is binary audio.
"""

import io
import math
import struct

import httpx
from fastapi import HTTPException

from app.config import settings

VOICE_BY_LANGUAGE = {
    "hi": ("hi-IN", "gnani_tts_voice_hi"),
    "hinglish": ("hi-en", "gnani_tts_voice_hinglish"),
    "en": ("en-IN", "gnani_tts_voice_hi"),
    "ta": ("ta-IN", "gnani_tts_voice_hi"),
    "te": ("te-IN", "gnani_tts_voice_hi"),
    "bn": ("bn-IN", "gnani_tts_voice_hi"),
    "mr": ("mr-IN", "gnani_tts_voice_hi"),
    "gu": ("gu-IN", "gnani_tts_voice_hi"),
    "kn": ("kn-IN", "gnani_tts_voice_hi"),
}


async def synthesize(
    text: str,
    language: str,
    gender: str = "female",
    custom_voice: str | None = None,
) -> tuple[bytes, str]:
    if not settings.live_speech_enabled:
        return demo_wav(), "demo"

    locale, fallback_attr = VOICE_BY_LANGUAGE.get(language, VOICE_BY_LANGUAGE["hinglish"])

    if custom_voice and custom_voice.strip():
        voice = custom_voice.strip()
    elif gender.lower() == "male":
        voice = (
            settings.gnani_tts_voice_male_hi
            if language == "hi"
            else settings.gnani_tts_voice_male_hinglish
        )
    else:
        voice = (
            settings.gnani_tts_voice_female_hi
            if language == "hi"
            else settings.gnani_tts_voice_female_hinglish
        )

    payload = {
        "text": text,
        "voice": voice,
        "model": settings.gnani_tts_model,
        "language": locale,
        "speed": 1.0,
        "audio_config": {
            "sample_rate": 16000,
            "num_channels": 1,
            "sample_width": 2,
            "encoding": "linear_pcm",
            "container": "wav",
        },
    }
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                settings.gnani_tts_url,
                headers={
                    "X-API-Key-ID": settings.gnani_api_key,
                    "Content-Type": "application/json",
                },
                json=payload,
            )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail="Text-to-speech request failed. The written answer is still available.",
        ) from exc

    if response.status_code != 200 or not response.content:
        raise HTTPException(
            status_code=502,
            detail="Text-to-speech did not return audio. The written answer is still available.",
        )
    return response.content, "live"


def demo_wav() -> bytes:
    """Short labelled tone so the player can be tested without a Gnani key."""
    sample_rate = 16000
    duration = 0.35
    count = int(sample_rate * duration)
    samples = bytearray()
    for index in range(count):
        value = int(1200 * math.sin(2 * math.pi * 440 * index / sample_rate))
        samples += struct.pack("<h", value)
    return _wav(sample_rate, bytes(samples))


def _wav(sample_rate: int, pcm: bytes) -> bytes:
    header = io.BytesIO()
    data_size = len(pcm)
    header.write(b"RIFF")
    header.write(struct.pack("<I", 36 + data_size))
    header.write(b"WAVEfmt ")
    header.write(struct.pack("<IHHIIHH", 16, 1, 1, sample_rate, sample_rate * 2, 2, 16))
    header.write(b"data")
    header.write(struct.pack("<I", data_size))
    header.write(pcm)
    return header.getvalue()
