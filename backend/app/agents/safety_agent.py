"""Safety Agent: Clinician-reviewed emergency safety checks and response guardrails.

Critical Core Principles:
- Deterministic, clinician-vetted emergency red flag checklist (never rely on an LLM for safety).
- Strict non-diagnostic, non-prescriptive guardrails.
- Clear, prominent emergency instructions (112 India emergency dispatch).
- Distinguishes regulatory facts from medical advice.
"""

import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from app.services.safety_rules import (
    LIMITATION,
    _negated,
    detect_red_flags,
    emergency_copy,
)

logger = logging.getLogger(__name__)

# Expanded clinician-reviewed red-flag rules (checked alongside existing base rules)
ADDITIONAL_RED_FLAGS: List[Tuple[str, Tuple[str, ...]]] = [
    (
        "anaphylaxis",
        (
            "throat is swelling",
            "throat swelling",
            "tongue is swelling",
            "tongue swelling",
            "lips swelling",
            "cannot swallow",
            "can't swallow",
            "unable to swallow",
            "throat closing",
            "gala band ho raha hai",
            "gale me sujan",
            "saans ruk rahi hai",
        ),
    ),
    (
        "crisis_self_harm",
        (
            "want to die",
            "commit suicide",
            "kill myself",
            "end my life",
            "mar jaana chahta",
            "khudkushi",
            "jaan dena chahta",
        ),
    ),
    (
        "seizure",
        (
            "continuous seizure",
            "active seizure",
            "daura pad raha hai",
            "mirgi ka daura",
            "convulsions",
        ),
    ),
]

# Diagnostic & prescriptive phrases that the model or system MUST NOT emit
GUARDRAIL_DIAGNOSTIC_PATTERNS = [
    r"\b(?:you\s+have|diagnosed\s+with|you\s+suffer\s+from|you\s+are\s+suffering\s+from)\s+[a-z]+",
    r"\baapko\s+[a-z\s]+\s+ki\s+bimari\s+hai\b",
    r"\baapko\s+[a-z\s]+\s+hua\s+hai\b",
]

GUARDRAIL_PRESCRIPTION_PATTERNS = [
    r"\b(?:take|prescribe|administer|consume)\s+\d+\s*(?:mg|ml|tablets?|capsules?|g)\b",
    r"\b\d+\s*(?:mg|ml)\s+(?:le\s+lein|khaa\s+lein|dose)\b",
    r"\b(?:take\s+this\s+medicine|yeh\s+dawa\s+le\s+lein)\b",
]

CRISIS_HELPLINE_MESSAGE = (
    "If you or someone you know is struggling or in distress, help is available. "
    "In India, you can call Tele-MANAS at 14416 or 1800-891-4416 (toll-free, 24/7) for mental health support. "
    "For immediate emergencies, call 112."
)

CRISIS_HELPLINE_MESSAGE_HI = (
    "Agar aap ya koi pareshani mein hai, toh madad uplabdh hai. "
    "Bharat mein Tele-MANAS helpline 14416 ya 1800-891-4416 (toll-free, 24/7) par call karein. "
    "Aapatkaal ke liye 112 par call karein."
)


class SafetyAgent:
    """Oversees user input safety (emergency detection) and output guardrails."""

    def __init__(self):
        self.limitation = LIMITATION

    def check_input_safety(self, text: str, language: str = "hinglish") -> Dict[str, Any]:
        """Inspect user input against clinician-reviewed emergency red-flag checklists."""
        normalized = text.lower().strip()
        flags = detect_red_flags(text)

        # Check additional critical rules with negation awareness
        for flag, phrases in ADDITIONAL_RED_FLAGS:
            for phrase in phrases:
                start = normalized.find(phrase)
                if start == -1:
                    continue
                if _negated(normalized, start):
                    continue
                if flag not in flags:
                    flags.append(flag)
                break

        is_emergency = bool(flags)
        is_crisis = "crisis_self_harm" in flags

        message = None
        if is_crisis:
            message = CRISIS_HELPLINE_MESSAGE_HI if language == "hi" else CRISIS_HELPLINE_MESSAGE
        elif is_emergency:
            message = emergency_copy(language)

        return {
            "emergency": is_emergency,
            "flags": flags,
            "message": message,
            "limitation": self.limitation,
            "crisis": is_crisis,
        }

    def apply_response_guardrails(self, response_text: str, language: str = "hinglish") -> Dict[str, Any]:
        """Validate that an outgoing message never diagnoses, prescribes, or claims clinical certainty."""
        violations: List[str] = []
        cleaned_text = response_text

        # Check diagnostic guardrail
        for pattern in GUARDRAIL_DIAGNOSTIC_PATTERNS:
            if re.search(pattern, cleaned_text, re.IGNORECASE):
                violations.append("diagnostic_claim_detected")
                cleaned_text = re.sub(
                    pattern,
                    "[Medical assessment requires a licensed clinician]",
                    cleaned_text,
                    flags=re.IGNORECASE,
                )

        # Check prescription guardrail
        for pattern in GUARDRAIL_PRESCRIPTION_PATTERNS:
            if re.search(pattern, cleaned_text, re.IGNORECASE):
                violations.append("dosage_or_prescription_detected")
                cleaned_text = re.sub(
                    pattern,
                    "[Prescriptions and dosages must be determined by a qualified doctor]",
                    cleaned_text,
                    flags=re.IGNORECASE,
                )

        if violations:
            logger.warning("Safety guardrails triggered on response text: %s", violations)
            # Append non-diagnostic disclaimer
            notice = (
                "\n\n[Dhyan dein: SehatSetu AI dawa ya dosage recommend nahi karta. Kripya doctor se sampark karein.]"
                if language == "hi"
                else "\n\n[Notice: SehatSetu AI does not prescribe medicines or dosages. Consult a doctor.]"
            )
            cleaned_text += notice

        return {
            "safe": len(violations) == 0,
            "violations": violations,
            "sanitized_text": cleaned_text,
        }

    def status(self) -> Dict[str, Any]:
        """Return the active safety rules and guardrail configuration."""
        return {
            "agent": "SafetyAgent",
            "rule_engine": "deterministic_clinician_reviewed",
            "categories_monitored": [
                "breathing",
                "chest_pain",
                "stroke",
                "unconscious",
                "severe_bleeding",
                "anaphylaxis",
                "crisis_self_harm",
                "seizure",
            ],
            "guardrails": [
                "zero_diagnosis_enforcement",
                "zero_prescription_enforcement",
                "mandatory_disclaimer_injection",
            ],
            "emergency_number": "112",
            "tele_manas_crisis_line": "14416",
        }


safety_agent = SafetyAgent()


def check_emergency(text: str, language: str = "hinglish") -> Dict[str, Any]:
    return safety_agent.check_input_safety(text, language)


def guard_response(text: str, language: str = "hinglish") -> Dict[str, Any]:
    return safety_agent.apply_response_guardrails(text, language)
