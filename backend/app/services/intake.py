"""Controlled symptom intake. Values are stored only as the user stated them."""

from app.agents.safety_agent import safety_agent
from app.schemas.models import Citation, IntakeState
from app.services.rag import search_knowledge
from app.services.safety_rules import detect_red_flags, emergency_copy
from app.services.summary import is_unspecified

DISCLAIMER = (
    "SehatSetu AI is a healthcare navigation assistant. It does not diagnose, "
    "prescribe medicines, or recommend dosages."
)

GREETINGS = {"hi", "hello", "hey", "namaste", "namaskar", "hola"}

PROMPTS = {
    "hi": {
        "concern": "Aapki mukhya pareshani kya hai? Apne shabdon mein bataiye. Yahan diagnosis nahi hoga.",
        "duration": "Yeh kab se ho raha hai? Jaise: 2 din, ya kal shaam se.",
        "severity": "Aap is takleef ko kaise mehsoos karte hain? Apne shabdon mein bataiye. Yeh koi medical score nahi hai.",
        "associated": "Kya iske saath koi aur lakshan bhi hain? Agar nahi, to 'nahi' likhein.",
        "age": "Mareez ki umar kitni hai? Jaise: 25 saal, ya 60 saal. Agar nahi batana chahte, to 'nahi' likhein.",
        "history": "Kya pehle se koi bimari (jaise diabetes, BP, asthma) ya dawa se allergy hai? Agar nahi, to 'nahi' likhein.",
        "complete": "Aapki batayi hui jaankari ka saaransh taiyar hai. Yeh diagnosis nahi hai.",
        "unsure_note": "Theek hai. Jo aapne nahi bataya, use summary mein 'not provided' dikhaya jayega.",
        "info_prefix": "Neeche wali baat sirf is srot se hai. Yeh aapke liye personal salah nahi hai.",
        "not_found": "Is sawal ke liye verified source nahi mila. Kripya ek qualified health professional se poochhein.",
        "repeat": "Agle sawal par wapas aate hain.",
    },
    "hinglish": {
        "concern": "Aapki main health problem kya hai? Example: sir dard ya bukhar. Yahan diagnosis nahi hoga.",
        "duration": "Yeh kab se ho raha hai? Example: 2 days, ya kal evening se.",
        "severity": "Aap is problem ko kaise feel karte hain? Apne words mein bataiye, jaise mild, medium, ya bahut zyada. Yeh medical score nahi hai.",
        "associated": "Koi aur symptom bhi hai? Agar nahi, to 'nahi' likhein.",
        "age": "Patient ki age kitni hai? Example: 28 years ya 50 years. Agar share nahi karna, to 'nahi' bol sakte hain.",
        "history": "Kya pehle se koi chronic condition (jaise BP, sugar, asthma) ya medicine allergy hai? Agar nahi, to 'nahi' likhein.",
        "complete": "Aapka patient-reported summary ready hai. Yeh diagnosis nahi hai.",
        "unsure_note": "Theek hai. Jo detail aapne nahi di, summary mein 'not provided' rahegi.",
        "info_prefix": "Yeh general information sirf neeche diye source se hai. Yeh personal medical advice nahi hai.",
        "not_found": "Is question ke liye koi verified source nahi mila. Please ek qualified healthcare professional se poochhein.",
        "repeat": "Ab next intake question par wapas aate hain.",
    },
    "en": {
        "concern": "What is your main health concern? Please describe your symptoms in your own words. This is not a diagnosis.",
        "duration": "How long have you been experiencing this? For example: 2 days, or since yesterday morning.",
        "severity": "How severe does this discomfort feel to you? In your own words, e.g. mild, moderate, or severe.",
        "associated": "Are you experiencing any other symptoms along with this? If none, please say 'none'.",
        "age": "What is the patient's age? For example: 35 years. If you prefer not to say, you can skip.",
        "history": "Do you have any existing medical conditions (e.g. hypertension, diabetes, asthma) or drug allergies? If none, say 'none'.",
        "complete": "Your patient-reported summary is ready. It will help your healthcare provider understand your situation.",
        "unsure_note": "Understood. Any detail not provided will be recorded as 'not provided' in the clinical summary.",
        "info_prefix": "The information below is retrieved strictly from verified clinical references, not personal medical advice.",
        "not_found": "No verified clinical reference matched that question. Please consult a qualified healthcare professional.",
        "repeat": "Returning to the next consultation question.",
    },
}

NEXT_FIELD = {
    "concern": "duration",
    "duration": "severity",
    "severity": "associated",
    "associated": "age",
    "age": "history",
    "history": "complete",
}

FIELD_ATTR = {
    "concern": "main_concern",
    "duration": "duration",
    "severity": "severity",
    "associated": "associated_symptoms",
    "age": "age",
    "history": "relevant_history",
}


def process_turn(state: IntakeState, message: str) -> tuple[IntakeState, str, list[Citation]]:
    text = message.strip()
    updated = state.model_copy(deep=True)
    safety = safety_agent.check_input_safety(text, updated.language)
    if safety["emergency"]:
        updated.emergency = True
        for flag in safety["flags"]:
            if flag not in updated.emergency_flags:
                updated.emergency_flags.append(flag)
        return updated, safety["message"], []

    if updated.emergency:
        return updated, emergency_copy(updated.language), []

    copy = PROMPTS.get(updated.language, PROMPTS.get("en", PROMPTS["hinglish"]))
    if _is_info_question(text):
        found, answer, citations = search_knowledge(text, updated.language)
        body = answer if found else copy["not_found"]
        if updated.awaiting != "complete":
            body = f"{body}\n\n{copy['repeat']} {copy[updated.awaiting]}"
        guarded = safety_agent.apply_response_guardrails(body, updated.language)
        return updated, guarded["sanitized_text"], citations

    if updated.awaiting == "complete":
        guarded = safety_agent.apply_response_guardrails(copy["complete"], updated.language)
        return updated, guarded["sanitized_text"], []

    if updated.awaiting == "concern" and _is_greeting(text):
        return updated, copy["concern"], []

    attr = FIELD_ATTR[updated.awaiting]
    setattr(updated, attr, text)
    unsure = is_unspecified(text)
    updated.awaiting = NEXT_FIELD[updated.awaiting]
    follow = copy[updated.awaiting]
    if unsure:
        follow = f"{copy['unsure_note']} {follow}"
    guarded = safety_agent.apply_response_guardrails(follow, updated.language)
    return updated, guarded["sanitized_text"], []


def _is_greeting(text: str) -> bool:
    return text.lower().strip(" !.?,") in GREETINGS


def _is_info_question(text: str) -> bool:
    lowered = text.lower()
    markers = (
        "what is",
        "what are",
        "how do",
        "how can",
        "tell me about",
        "kya hai",
        "kya hota",
        "kaise",
        "scheme",
        "pmjay",
        "ayushman",
    )
    return "?" in text or any(marker in lowered for marker in markers)
