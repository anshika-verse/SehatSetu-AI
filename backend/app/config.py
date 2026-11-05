from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ENV_FILE = _BACKEND_DIR / ".env"

if _ENV_FILE.exists():
    load_dotenv(_ENV_FILE, override=True)


class Settings(BaseSettings):
    """Runtime settings. Secrets stay in the backend environment."""

    gnani_api_key: str = ""
    gnani_stt_url: str = "https://api.vachana.ai/stt/v3"
    gnani_stt_model: str = "prisma-v3.0"
    gnani_tts_url: str = "https://api.vachana.ai/api/v1/tts/inference"
    gnani_tts_model: str = "timbre-v2.5"
    gnani_tts_voice_hi: str = "Nalini"
    gnani_tts_voice_hinglish: str = "Poorvi"
    gnani_tts_voice_male_hi: str = "Deepak"
    gnani_tts_voice_male_hinglish: str = "Deepak"
    gnani_tts_voice_female_hi: str = "Nalini"
    gnani_tts_voice_female_hinglish: str = "Poorvi"
    database_url: str = "sqlite:///./sehatsetu.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    max_audio_bytes: int = 8_000_000
    speech_mode: str = "auto"

    # Infermedica Triage Settings
    infermedica_app_id: str = ""
    infermedica_app_key: str = ""
    infermedica_api_url: str = "https://api.infermedica.com/v3"

    # openFDA & RxNorm Drug Information Settings
    openfda_api_key: str = ""
    openfda_api_url: str = "https://api.fda.gov/drug"
    rxnorm_api_url: str = "https://rxnav.nlm.nih.gov/REST"

    # Google Maps Platform / Places API Settings
    google_maps_api_key: str = ""
    google_places_api_url: str = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

    model_config = SettingsConfigDict(
        env_file=(".env", _ENV_FILE),
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    @property
    def live_speech_enabled(self) -> bool:
        if self.speech_mode == "demo":
            return False
        return bool(self.gnani_api_key.strip())

    @property
    def infermedica_enabled(self) -> bool:
        return bool(self.infermedica_app_id.strip() and self.infermedica_app_key.strip())

    @property
    def google_maps_enabled(self) -> bool:
        return bool(self.google_maps_api_key.strip())


settings = Settings()
