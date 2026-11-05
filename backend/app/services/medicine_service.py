"""Medicine Service: Verified drug information lookup via openFDA and RxNorm APIs.

Official APIs:
- openFDA Drug Label API:
    Endpoint: https://api.fda.gov/drug/label.json
    Params: search=openfda.generic_name:"{name}"+OR+openfda.brand_name:"{name}"
    Optional Key: api_key query param for elevated rate limits.
- RxNorm API (National Library of Medicine / NIH):
    Endpoint: https://rxnav.nlm.nih.gov/REST/drugs.json?name={name}
    Public REST service for standardized clinical drug forms and concepts.

Critical Safety Guardrails:
- Never provide dosages or prescription guidance.
- Distinguish regulatory label facts from medical advice.
- Always attach standard medical disclaimer.
"""

import logging
import re
from typing import Any, Dict, List, Optional
import httpx

from app.config import settings

logger = logging.getLogger(__name__)

DRUG_DISCLAIMER = (
    "MEDICINE LABEL INFORMATION ONLY: This information is sourced directly from regulatory drug labels "
    "(openFDA / DailyMed / RxNorm). It is for educational and reference purposes only. "
    "It is NOT medical advice, NOT a prescription, and NOT a dosage recommendation. "
    "Always consult a qualified healthcare professional or pharmacist before taking or modifying any medication."
)


def _clean_query(term: str) -> str:
    """Sanitize search term removing special lucene characters."""
    sanitized = re.sub(r'[^\w\s-]', '', term)
    return sanitized.strip()


class MedicineService:
    """Drug information lookup using openFDA and NIH RxNorm services."""

    def __init__(self):
        self.openfda_base = settings.openfda_api_url.rstrip("/")
        self.rxnorm_base = settings.rxnorm_api_url.rstrip("/")
        self.api_key = settings.openfda_api_key
        self.timeout = 10.0

    @property
    def is_configured(self) -> bool:
        # openFDA works without a key (with rate limits) and with a key for elevated limits
        return True

    def status(self) -> Dict[str, Any]:
        """Return status of medicine lookup providers."""
        return {
            "openfda": {
                "configured": bool(self.openfda_base),
                "has_api_key": bool(self.api_key.strip()),
                "endpoint": f"{self.openfda_base}/label.json",
            },
            "rxnorm": {
                "configured": bool(self.rxnorm_base),
                "endpoint": f"{self.rxnorm_base}/drugs.json",
            },
        }

    async def lookup_drug_label(self, drug_name: str) -> Dict[str, Any]:
        """Search openFDA drug product labels for verified regulatory label information."""
        clean = _clean_query(drug_name)
        if not clean or len(clean) < 2:
            return {
                "found": False,
                "term": drug_name,
                "message": "Please enter a valid medicine or ingredient name.",
                "disclaimer": DRUG_DISCLAIMER,
            }

        # Search both generic name and brand name
        search_query = f'openfda.generic_name:"{clean}"+openfda.brand_name:"{clean}"'
        url = f"{self.openfda_base}/label.json?search={search_query}&limit=1"
        if self.api_key.strip():
            url += f"&api_key={self.api_key.strip()}"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url)
                if response.status_code == 404:
                    # Try a wildcard or broader brand search if exact phrase not found
                    alt_url = f"{self.openfda_base}/label.json?search={clean}&limit=1"
                    if self.api_key.strip():
                        alt_url += f"&api_key={self.api_key.strip()}"
                    alt_res = await client.get(alt_url)
                    if alt_res.status_code == 404:
                        return {
                            "found": False,
                            "term": clean,
                            "message": f"No openFDA label found matching '{clean}'.",
                            "disclaimer": DRUG_DISCLAIMER,
                        }
                    response = alt_res

                response.raise_for_status()
                data = response.json()
                results = data.get("results", [])
                if not results:
                    return {
                        "found": False,
                        "term": clean,
                        "message": f"No label results for '{clean}'.",
                        "disclaimer": DRUG_DISCLAIMER,
                    }

                record = results[0]
                openfda_block = record.get("openfda", {})

                # Extract verified label sections safely without fabricating details
                generic_names = openfda_block.get("generic_name", [])
                brand_names = openfda_block.get("brand_name", [])
                substance_names = openfda_block.get("substance_name", [])
                manufacturers = openfda_block.get("manufacturer_name", [])

                indications = record.get("indications_and_usage", [])
                purpose = record.get("purpose", [])
                warnings = record.get("warnings", []) or record.get("warnings_and_cautions", [])
                boxed_warning = record.get("boxed_warning", [])

                return {
                    "found": True,
                    "term": clean,
                    "source": "openFDA Human Drug Label",
                    "generic_name": generic_names[0] if generic_names else None,
                    "brand_names": brand_names[:5],
                    "substances": substance_names[:5],
                    "manufacturers": manufacturers[:3],
                    "purpose": purpose[0] if purpose else (indications[0] if indications else None),
                    "warnings_summary": warnings[0][:600] + "..." if warnings and len(warnings[0]) > 600 else (warnings[0] if warnings else None),
                    "has_boxed_warning": bool(boxed_warning),
                    "disclaimer": DRUG_DISCLAIMER,
                }
        except httpx.HTTPError as exc:
            logger.error("openFDA lookup error: %s", exc)
            return {
                "found": False,
                "term": clean,
                "message": f"Unable to retrieve openFDA label: {type(exc).__name__}",
                "disclaimer": DRUG_DISCLAIMER,
            }

    async def lookup_rxnorm(self, drug_name: str) -> Dict[str, Any]:
        """Query NLM RxNorm for standardized clinical drug forms and concepts."""
        clean = _clean_query(drug_name)
        if not clean or len(clean) < 2:
            return {"found": False, "term": drug_name, "concepts": []}

        url = f"{self.rxnorm_base}/drugs.json?name={clean}"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url)
                if response.status_code != 200:
                    return {"found": False, "term": clean, "concepts": []}

                data = response.json()
                drug_group = data.get("drugGroup", {})
                concept_group = drug_group.get("conceptGroup", [])

                concepts: List[Dict[str, str]] = []
                for group in concept_group:
                    concept_properties = group.get("conceptProperties", [])
                    for prop in concept_properties:
                        concepts.append({
                            "rxcui": prop.get("rxcui", ""),
                            "name": prop.get("name", ""),
                            "tty": prop.get("tty", ""),  # Term type (e.g. IN=ingredient, BN=brand name)
                        })

                return {
                    "found": bool(concepts),
                    "term": clean,
                    "source": "NIH RxNorm",
                    "concepts": concepts[:8],  # limit to top relevant concepts
                    "disclaimer": DRUG_DISCLAIMER,
                }
        except httpx.HTTPError as exc:
            logger.warning("RxNorm lookup error: %s", exc)
            return {"found": False, "term": clean, "concepts": [], "error": type(exc).__name__}

    async def get_drug_overview(self, drug_name: str) -> Dict[str, Any]:
        """Combined query across openFDA and RxNorm."""
        fda_res = await self.lookup_drug_label(drug_name)
        rx_res = await self.lookup_rxnorm(drug_name)

        return {
            "query": drug_name,
            "openfda": fda_res,
            "rxnorm": rx_res,
            "disclaimer": DRUG_DISCLAIMER,
        }


medicine_service = MedicineService()

