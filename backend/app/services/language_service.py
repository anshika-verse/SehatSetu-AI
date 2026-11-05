"""Language Service: Multilingual system with verified STT & TTS capabilities,
language auto-detection, and provider adapters.

Supports:
- Regional Indian languages (Hindi, Hinglish, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada) via Gnani Prisma & Timbre.
- English (Indian/Global) via Gnani / standard adapters.
- Deterministic script-based and lexical auto-detection for code-mixed speech.
- Honest capability matrix (never claims capability unless verified).
"""

import logging
import re
from typing import Any, Dict, List, Optional

from app.config import settings

logger = logging.getLogger(__name__)

# Verified language catalog with exact provider mapping
VERIFIED_LANGUAGES: Dict[str, Dict[str, Any]] = {
    "hinglish": {
        "code": "hinglish",
        "name": "Hinglish",
        "native_name": "हिंग्लिश (Hindi + English)",
        "stt_provider": "gnani_prisma",
        "stt_locale": "hi-IN,en-IN",
        "tts_provider": "gnani_timbre",
        "tts_locale": "hi-en",
        "voice_female": "Poorvi",
        "voice_male": "Deepak",
        "code_mixed_support": True,
        "verified": True,
    },
    "hi": {
        "code": "hi",
        "name": "Hindi",
        "native_name": "हिन्दी",
        "stt_provider": "gnani_prisma",
        "stt_locale": "hi-IN",
        "tts_provider": "gnani_timbre",
        "tts_locale": "hi-IN",
        "voice_female": "Nalini",
        "voice_male": "Deepak",
        "code_mixed_support": True,
        "verified": True,
    },
    "en": {
        "code": "en",
        "name": "English",
        "native_name": "English (India / Global)",
        "stt_provider": "gnani_prisma",
        "stt_locale": "en-IN",
        "tts_provider": "gnani_timbre",
        "tts_locale": "en-IN",
        "voice_female": "Nalini",
        "voice_male": "Deepak",
        "code_mixed_support": False,
        "verified": True,
    },
    "ta": {
        "code": "ta",
        "name": "Tamil",
        "native_name": "தமிழ்",
        "stt_provider": "gnani_prisma",
        "stt_locale": "ta-IN",
        "tts_provider": "gnani_timbre",
        "tts_locale": "ta-IN",
        "voice_female": "Nalini",
        "voice_male": "Deepak",
        "code_mixed_support": False,
        "verified": True,
    },
    "te": {
        "code": "te",
        "name": "Telugu",
        "native_name": "తెలుగు",
        "stt_provider": "gnani_prisma",
        "stt_locale": "te-IN",
        "tts_provider": "gnani_timbre",
        "tts_locale": "te-IN",
        "voice_female": "Nalini",
        "voice_male": "Deepak",
        "code_mixed_support": False,
        "verified": True,
    },
    "bn": {
        "code": "bn",
        "name": "Bengali",
        "native_name": "বাংলা",
        "stt_provider": "gnani_prisma",
        "stt_locale": "bn-IN",
        "tts_provider": "gnani_timbre",
        "tts_locale": "bn-IN",
        "voice_female": "Nalini",
        "voice_male": "Deepak",
        "code_mixed_support": False,
        "verified": True,
    },
    "mr": {
        "code": "mr",
        "name": "Marathi",
        "native_name": "मराठी",
        "stt_provider": "gnani_prisma",
        "stt_locale": "mr-IN",
        "tts_provider": "gnani_timbre",
        "tts_locale": "mr-IN",
        "voice_female": "Nalini",
        "voice_male": "Deepak",
        "code_mixed_support": False,
        "verified": True,
    },
    "gu": {
        "code": "gu",
        "name": "Gujarati",
        "native_name": "ગુજરાતી",
        "stt_provider": "gnani_prisma",
        "stt_locale": "gu-IN",
        "tts_provider": "gnani_timbre",
        "tts_locale": "gu-IN",
        "voice_female": "Nalini",
        "voice_male": "Deepak",
        "code_mixed_support": False,
        "verified": True,
    },
    "kn": {
        "code": "kn",
        "name": "Kannada",
        "native_name": "ಕನ್ನಡ",
        "stt_provider": "gnani_prisma",
        "stt_locale": "kn-IN",
        "tts_provider": "gnani_timbre",
        "tts_locale": "kn-IN",
        "voice_female": "Nalini",
        "voice_male": "Deepak",
        "code_mixed_support": False,
        "verified": True,
    },
}

# Common Hinglish lexical markers (romanized Hindi medical & conversational tokens)
HINGLISH_LEXICON = {
    "dard", "bukhar", "khasi", "takleef", "saans", "chakkar", "ulti", "pet", "sir", "gala",
    "se", "hai", "ho", "kya", "aap", "mujhe", "mera", "meri", "hum", "bahut", "zyada", "thoda",
    "din", "raat", "kal", "aaj", "subah", "shaam", "dawa", "goli", "bimari", "doctor", "kamzori",
    "chhati", "jalan", "sujan", "nahi", "kripya", "bataiye", "kaisa", "kaisi", "theek",
}

# Script patterns
UNICODE_SCRIPTS = [
    (re.compile(r"[\u0B80-\u0BFF]"), "ta", "Tamil"),
    (re.compile(r"[\u0C00-\u0C7F]"), "te", "Telugu"),
    (re.compile(r"[\u0C80-\u0CFF]"), "kn", "Kannada"),
    (re.compile(r"[\u0980-\u09FF]"), "bn", "Bengali"),
    (re.compile(r"[\u0A80-\u0AFF]"), "gu", "Gujarati"),
    (re.compile(r"[\u0900-\u097F]"), "hi", "Hindi"),
]


class LanguageService:
    """Manages language detection, verification, and provider routing."""

    def get_supported_languages(self) -> List[Dict[str, Any]]:
        """Return all verified languages with live provider status."""
        gnani_live = settings.live_speech_enabled
        catalog = []
        for code, info in VERIFIED_LANGUAGES.items():
            entry = dict(info)
            entry["stt_active"] = gnani_live
            entry["tts_active"] = gnani_live
            entry["provider_status"] = "live_gnani" if gnani_live else "browser_ready"
            catalog.append(entry)
        return catalog

    def detect_language(self, text: str) -> Dict[str, Any]:
        """Detect language from input text using Unicode script detection and lexical analysis."""
        clean = text.strip()
        if not clean:
            return {
                "detected_language": "hinglish",
                "language_name": "Hinglish",
                "confidence": 0.5,
                "provider": "default_fallback",
                "is_code_mixed": True,
            }

        # 1. Check Indic Unicode Scripts
        for pattern, lang_code, lang_name in UNICODE_SCRIPTS:
            matches = pattern.findall(clean)
            if len(matches) >= 2 or (len(matches) > 0 and len(clean) < 10):
                # For Devanagari, check if Marathi words are dominant
                if lang_code == "hi":
                    marathi_words = {"आहे", "नाही", "मला", "काही", "होते", "फार"}
                    tokens = clean.split()
                    if any(t in marathi_words for t in tokens):
                        return {
                            "detected_language": "mr",
                            "language_name": "Marathi",
                            "confidence": 0.95,
                            "provider": "unicode_script_analyzer",
                            "is_code_mixed": False,
                        }
                return {
                    "detected_language": lang_code,
                    "language_name": lang_name,
                    "confidence": 0.98,
                    "provider": "unicode_script_analyzer",
                    "is_code_mixed": False,
                }

        # 2. Latin script: Distinguish Hinglish vs Standard English
        words = re.findall(r"[a-zA-Z]+", clean.lower())
        if not words:
            return {
                "detected_language": "hinglish",
                "language_name": "Hinglish",
                "confidence": 0.5,
                "provider": "default_fallback",
                "is_code_mixed": True,
            }

        hinglish_count = sum(1 for w in words if w in HINGLISH_LEXICON)
        total_words = len(words)
        hinglish_ratio = hinglish_count / max(total_words, 1)

        if hinglish_count >= 1 or hinglish_ratio >= 0.15:
            return {
                "detected_language": "hinglish",
                "language_name": "Hinglish (Code-Mixed)",
                "confidence": round(min(0.65 + (hinglish_ratio * 0.35), 0.98), 2),
                "provider": "code_mixed_lexical_analyzer",
                "is_code_mixed": True,
            }

        return {
            "detected_language": "en",
            "language_name": "English",
            "confidence": 0.92,
            "provider": "latin_lexical_analyzer",
            "is_code_mixed": False,
        }

    def get_tts_config(self, language: str, gender: str = "female") -> Dict[str, str]:
        """Resolve TTS voice and locale according to language and assistant persona."""
        info = VERIFIED_LANGUAGES.get(language, VERIFIED_LANGUAGES["hinglish"])
        locale = info["tts_locale"]
        is_male = gender.lower() == "male"
        voice = info["voice_male"] if is_male else info["voice_female"]
        return {
            "locale": locale,
            "voice": voice,
            "provider": info["tts_provider"],
        }


language_service = LanguageService()

