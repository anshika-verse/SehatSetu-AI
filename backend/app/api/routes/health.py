from fastapi import APIRouter

from app.agents.safety_agent import safety_agent
from app.config import settings
from app.services.database import database_status
from app.services.gnani_service import gnani_service
from app.services.llm_provider import provider_status
from app.services.medicine_service import medicine_service
from app.services.triage_service import triage_service

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "SehatSetu AI",
        "speech_mode": "live" if settings.live_speech_enabled else "demo",
        "database": database_status(),
        "llm": provider_status(),
        "gnani": gnani_service.status(),
        "triage": triage_service.status(),
        "medicine": medicine_service.status(),
        "safety": safety_agent.status(),
    }
