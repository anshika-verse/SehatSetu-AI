"""Speciality Service: Maps patient-reported symptoms to relevant medical specialities.

Critical Safety Rule:
- Speciality recommendations assist in finding the right clinic department.
- Never make diagnostic statements or prescribe treatments.
"""

from typing import Any, Dict, List

SPECIALITY_MAPPINGS: List[Dict[str, Any]] = [
    {
        "keywords": ["chest pain", "seene me dard", "seene mein dard", "heart", "palpitation", "dharkan"],
        "speciality": "Cardiology / Emergency Medicine",
        "description": "Heart, chest discomfort, and cardiovascular health (Requires urgent care if severe)",
        "urgent": True,
    },
    {
        "keywords": ["breathing", "saans", "cough", "khansi", "asthma", "wheezing", "phaphde", "lungs"],
        "speciality": "Pulmonology / Respiratory Medicine",
        "description": "Lungs, airways, and respiratory health",
        "urgent": False,
    },
    {
        "keywords": ["fever", "bukhar", "body ache", "badan dard", "chills", "fatigue", "kamzori", "weakness"],
        "speciality": "General Medicine / Internal Medicine",
        "description": "Comprehensive evaluation of acute illnesses, fevers, and general health",
        "urgent": False,
    },
    {
        "keywords": ["stomach", "pet dard", "abdominal", "vomiting", "ulti", "dast", "diarrhea", "gas", "acidity"],
        "speciality": "Gastroenterology",
        "description": "Digestive tract, stomach, liver, and intestines",
        "urgent": False,
    },
    {
        "keywords": ["joint", "ghutne", "bone", "haddi", "fracture", "back pain", "kamar dard", "arthritis"],
        "speciality": "Orthopaedics",
        "description": "Bones, joints, ligaments, spine, and musculoskeletal system",
        "urgent": False,
    },
    {
        "keywords": ["skin", "rash", "khujli", "itching", "allergy", "dana", "boils", "eczema"],
        "speciality": "Dermatology",
        "description": "Skin, hair, nails, and cutaneous allergic reactions",
        "urgent": False,
    },
    {
        "keywords": ["headache", "sir dard", "sirdard", "migraine", "dizziness", "chakkar", "seizure", "nerves"],
        "speciality": "Neurology / General Physician",
        "description": "Brain, nervous system, and recurring headaches",
        "urgent": False,
    },
    {
        "keywords": ["ear", "kaan", "nose", "naak", "throat", "gala", "tonsil", "sinus"],
        "speciality": "ENT (Otolaryngology)",
        "description": "Ear, nose, throat, and sinus conditions",
        "urgent": False,
    },
    {
        "keywords": ["eye", "aankh", "vision", "dhundhla", "redness", "aankhein"],
        "speciality": "Ophthalmology",
        "description": "Eye care, vision health, and ocular conditions",
        "urgent": False,
    },
    {
        "keywords": ["tooth", "daant", "teeth", "gum", "masude", "cavity"],
        "speciality": "Dentistry",
        "description": "Oral health, teeth, and dental care",
        "urgent": False,
    },
    {
        "keywords": ["stress", "tanav", "depression", "anxiety", "ghabrahat", "sleep", "neend", "sad"],
        "speciality": "Psychiatry / Clinical Psychology",
        "description": "Mental well-being, emotional distress, and counselling (Tele-MANAS: 14416)",
        "urgent": False,
    },
    {
        "keywords": ["child", "bacha", "baby", "infant", "toddler"],
        "speciality": "Paediatrics",
        "description": "Infant, child, and adolescent healthcare",
        "urgent": False,
    },
]

SPECIALITY_DISCLAIMER = (
    "Department and speciality suggestions are intended solely to help you navigate to the "
    "most relevant clinic or doctor. They do NOT constitute a medical diagnosis or treatment plan."
)


def suggest_specialities(symptoms_text: str) -> List[Dict[str, Any]]:
    """Analyze symptoms text to suggest matching clinical specialities."""
    if not symptoms_text or not symptoms_text.strip():
        return []

    lowered = symptoms_text.lower()
    matches: List[Dict[str, Any]] = []

    for item in SPECIALITY_MAPPINGS:
        if any(kw in lowered for kw in item["keywords"]):
            matches.append({
                "speciality": item["speciality"],
                "description": item["description"],
                "urgent_sign": item["urgent"],
            })

    # Default fallback to General Medicine if no specific organ matched
    if not matches and len(lowered) > 2:
        matches.append({
            "speciality": "General Medicine / Family Physician",
            "description": "Initial primary care evaluation and clinical assessment",
            "urgent_sign": False,
        })

    return matches

