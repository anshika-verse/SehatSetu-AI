"""Deterministic emergency checklist.

This is a limited phrase list for the prototype. It is not clinical triage
and cannot rule an emergency in or out.
"""

import re

LIMITATION = (
    "This checklist is limited. It cannot detect every emergency and it cannot "
    "rule an emergency out. If you feel seriously unwell, seek urgent care."
)

EMERGENCY_MESSAGE = (
    "Urgent medical attention is needed based on a predefined warning sign in "
    "what you described. Call 112 or go to the nearest emergency service now. "
    "This app has not contacted emergency services. "
    + LIMITATION
)

EMERGENCY_MESSAGE_HI = (
    "Aapne jo bataya, usme ek pehle se tai warning sign hai. Turant medical "
    "madad lein. Bharat mein emergency number 112 hai. Is app ne emergency "
    "service ko call nahi kiya. Yeh checklist seemit hai aur emergency ko "
    "rule out nahi karti."
)

# Longer phrases are checked first inside each group.
RULES: list[tuple[str, tuple[str, ...]]] = [
    (
        "breathing",
        (
            "severe breathing difficulty",
            "difficulty breathing",
            "breathing difficulty",
            "shortness of breath",
            "can't breathe",
            "cannot breathe",
            "saans nahi aa",
            "saans nahi le",
            "saans phool",
            "dam ghut",
            "saans lene mein dikkat",
            "saans lene me dikkat",
        ),
    ),
    (
        "chest_pain",
        (
            "severe chest pain",
            "chest pain",
            "chest tightness",
            "seene mein tej dard",
            "seene me tej dard",
            "seene mein dard",
            "seene me dard",
            "sine mein dard",
        ),
    ),
    (
        "unconscious",
        (
            "unconscious",
            "not responding",
            "passed out",
            "behosh",
            "hosh nahi",
            "hosh nahin",
        ),
    ),
    (
        "stroke",
        (
            "face drooping",
            "face droop",
            "slurred speech",
            "one side of the body",
            "muh tedha",
            "lakwa",
        ),
    ),
    (
        "bleeding",
        (
            "severe bleeding",
            "heavy bleeding",
            "bleeding will not stop",
            "bleeding won't stop",
            "khoon bahut",
            "bahut khoon",
        ),
    ),
]

NEGATION_RE = re.compile(
    r"(?:no|not|without|denies|nahi|nahin|nahin hai|koi nahi)\s+$",
    re.IGNORECASE,
)


def _normalize(text: str) -> str:
    lowered = text.lower().replace("’", "'")
    return re.sub(r"\s+", " ", lowered).strip()


def _negated(text: str, start: int) -> bool:
    window = text[max(0, start - 16) : start]
    return NEGATION_RE.search(window) is not None


def detect_red_flags(text: str) -> list[str]:
    normalized = _normalize(text)
    found: list[str] = []
    for flag, phrases in RULES:
        for phrase in phrases:
            start = normalized.find(phrase)
            if start == -1:
                continue
            if _negated(normalized, start):
                continue
            found.append(flag)
            break
    return found


def emergency_copy(language: str) -> str:
    if language == "hi":
        return EMERGENCY_MESSAGE_HI + " " + EMERGENCY_MESSAGE
    return EMERGENCY_MESSAGE
