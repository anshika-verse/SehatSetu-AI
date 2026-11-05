"""Triage Service: Infermedica clinical symptom assessment and care navigation.

Official Contract:
- API Base: https://api.infermedica.com/v3
- Authentication Headers:
    App-Id: <INFERMEDICA_APP_ID>
    App-Key: <INFERMEDICA_APP_KEY>
- Endpoints:
    POST /v3/parse      -> Natural language symptom extraction
    POST /v3/triage     -> Evaluates evidence to determine urgency level

Safety Rules:
- Never diagnose or prescribe medication/dosage.
- Never hardcode symptom IDs, age, or patient demographics.
- If credentials are not configured, return clear integration status instead of mock/fake results.
"""

import logging
from typing import Any, Dict, List, Optional
import httpx

from app.config import settings

logger = logging.getLogger(__name__)

TRIAGE_DISCLAIMER = (
    "Infermedica triage provides preliminary care navigation guidance only. "
    "It is NOT a medical diagnosis, clinical assessment, or treatment plan. "
    "Always consult a qualified healthcare professional."
)


class TriageService:
    """Infermedica clinical intelligence and care-level assessment service."""

    def __init__(self):
        self.api_url = settings.infermedica_api_url.rstrip("/")
        self.app_id = settings.infermedica_app_id
        self.app_key = settings.infermedica_app_key
        self.timeout = 15.0

    @property
    def is_configured(self) -> bool:
        return bool(self.app_id.strip() and self.app_key.strip())

    def _headers(self) -> Dict[str, str]:
        return {
            "App-Id": self.app_id.strip(),
            "App-Key": self.app_key.strip(),
            "Content-Type": "application/json",
            "Model": "infermedica-en",
        }

    def status(self) -> Dict[str, Any]:
        """Return integration availability without exposing secret keys."""
        configured = self.is_configured
        return {
            "provider": "Infermedica",
            "api_version": "v3",
            "endpoint": self.api_url,
            "available": configured,
            "configured": configured,
            "status": "ready" if configured else "credentials_missing",
            "notice": (
                "Infermedica integration active for clinical triage navigation."
                if configured
                else "INFERMEDICA_APP_ID and INFERMEDICA_APP_KEY not set in backend/.env. "
                     "Triage symptom assessment is disabled until valid credentials are provided."
            ),
        }

    async def parse_symptoms(self, text: str) -> Dict[str, Any]:
        """Parse natural language text into standardized medical concepts using Infermedica NLP.
        
        Never uses hardcoded IDs; extracts mentions dynamically from user text.
        """
        if not self.is_configured:
            return {
                "available": False,
                "status": "credentials_missing",
                "mentions": [],
                "notice": "Infermedica credentials not configured. Symptom NLP disabled.",
            }

        clean_text = text.strip()
        if not clean_text:
            return {"available": True, "mentions": [], "notice": "No text provided for analysis."}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.api_url}/parse",
                    headers=self._headers(),
                    json={"text": clean_text},
                )
                if response.status_code == 401 or response.status_code == 403:
                    logger.warning("Infermedica authentication failed.")
                    return {
                        "available": False,
                        "status": "authentication_failed",
                        "mentions": [],
                        "notice": "Infermedica authentication failed. Check INFERMEDICA_APP_ID and INFERMEDICA_APP_KEY.",
                    }
                response.raise_for_status()
                data = response.json()
                mentions = data.get("mentions", [])
                return {
                    "available": True,
                    "status": "success",
                    "mentions": mentions,
                    "obvious": data.get("obvious", False),
                }
        except httpx.HTTPError as exc:
            logger.error("Infermedica parse error: %s", exc)
            return {
                "available": False,
                "status": "upstream_error",
                "mentions": [],
                "notice": f"Infermedica service temporarily unavailable: {type(exc).__name__}",
            }

    async def assess_triage(
        self,
        evidence: List[Dict[str, Any]],
        age: Optional[int] = None,
        sex: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Evaluate evidence to determine urgency care level (e.g. self-care, consultation, emergency).
        
        Only runs with user-reported data, never with hardcoded patient demographics or symptom IDs.
        """
        if not self.is_configured:
            return {
                "available": False,
                "status": "credentials_missing",
                "triage_level": None,
                "notice": "Infermedica credentials not configured. Automated triage disabled.",
                "disclaimer": TRIAGE_DISCLAIMER,
            }

        if not evidence:
            return {
                "available": True,
                "status": "insufficient_evidence",
                "triage_level": None,
                "notice": "No clinical evidence available to perform triage evaluation.",
                "disclaimer": TRIAGE_DISCLAIMER,
            }

        payload: Dict[str, Any] = {"evidence": evidence}
        if age is not None and 0 <= age <= 120:
            payload["age"] = {"value": age, "unit": "year"}
        if sex in {"male", "female"}:
            payload["sex"] = sex

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.api_url}/triage",
                    headers=self._headers(),
                    json=payload,
                )
                if response.status_code in {401, 403}:
                    return {
                        "available": False,
                        "status": "authentication_failed",
                        "notice": "Infermedica authentication failed. Check credentials.",
                        "disclaimer": TRIAGE_DISCLAIMER,
                    }
                response.raise_for_status()
                data = response.json()
                return {
                    "available": True,
                    "status": "success",
                    "triage_level": data.get("triage_level"),
                    "serious": data.get("serious", []),
                    "description": data.get("description"),
                    "label": data.get("label"),
                    "disclaimer": TRIAGE_DISCLAIMER,
                }
        except httpx.HTTPError as exc:
            logger.error("Infermedica triage error: %s", exc)
            return {
                "available": False,
                "status": "upstream_error",
                "notice": f"Infermedica triage service unavailable: {type(exc).__name__}",
                "disclaimer": TRIAGE_DISCLAIMER,
            }

    async def evaluate_user_symptoms(
        self,
        text: str,
        age: Optional[int] = None,
        sex: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Convenience method: parse free-text symptoms and assess care level if possible."""
        if not self.is_configured:
            return self.status()

        parsed = await self.parse_symptoms(text)
        if not parsed.get("available") or not parsed.get("mentions"):
            return {
                "available": parsed.get("available", False),
                "status": parsed.get("status", "no_symptoms_detected"),
                "mentions": parsed.get("mentions", []),
                "triage": None,
                "disclaimer": TRIAGE_DISCLAIMER,
            }

        # Dynamically build evidence from parsed mentions
        evidence = [
            {
                "id": m["id"],
                "choice_id": m.get("choice_id", "present"),
                "source": "initial",
            }
            for m in parsed["mentions"]
            if "id" in m
        ]

        triage_result = await self.assess_triage(evidence, age=age, sex=sex)
        return {
            "available": True,
            "status": "completed",
            "extracted_concepts": [
                {"id": m["id"], "name": m.get("name"), "common_name": m.get("common_name")}
                for m in parsed["mentions"]
            ],
            "triage": triage_result,
            "disclaimer": TRIAGE_DISCLAIMER,
        }


triage_service = TriageService()
