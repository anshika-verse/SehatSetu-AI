from fastapi import APIRouter, HTTPException

from app.agents.safety_agent import safety_agent
from app.schemas.models import AppointmentRequest, MedicineLookupRequest, MedicineLookupResponse, ReportExplainRequest
from app.services.appointments import DEMO_FACILITIES, demo_appointment
from app.services.medicine_service import DRUG_DISCLAIMER, medicine_service
from app.services.rag import explain_term, list_schemes
from app.services.safety_rules import detect_red_flags, emergency_copy

router = APIRouter()


@router.get("/resources/schemes")
def schemes() -> dict:
    items = []
    for scheme in list_schemes():
        items.append(
            {
                "title": scheme["title"],
                "publisher": scheme["publisher"],
                "url": scheme["url"],
                "last_checked": scheme["last_checked"],
                "summary": scheme["text"],
                "eligibility_guaranteed": False,
            }
        )
    return {
        "notice": "Check eligibility and documents with the official authority. This app does not guarantee any benefit.",
        "schemes": items,
    }


@router.get("/resources/facilities")
def facilities() -> dict:
    return DEMO_FACILITIES


@router.post("/appointments/request")
def appointment_request(body: AppointmentRequest) -> dict:
    return demo_appointment(body.facility_name, body.preferred_time, body.consent)


@router.post("/report/explain")
def report_explain(body: ReportExplainRequest) -> dict:
    if detect_red_flags(body.term):
        raise HTTPException(status_code=409, detail=emergency_copy(body.language))
    document = explain_term(body.term)
    if document is None:
        return {
            "found": False,
            "answer": "That term is not in the approved glossary. Unreadable or missing report values are not guessed.",
            "citation": None,
            "disclaimer": "Explaining a word is not an interpretation of your result and not a diagnosis.",
        }
    return {
        "found": True,
        "answer": document["text"],
        "citation": {
            "title": document["title"],
            "publisher": document["publisher"],
            "url": document["url"],
            "last_checked": document["last_checked"],
        },
        "disclaimer": "Explaining a word is not an interpretation of your result and not a diagnosis.",
    }


@router.post("/medicine/lookup", response_model=MedicineLookupResponse)
async def medicine_lookup(body: MedicineLookupRequest) -> MedicineLookupResponse:
    # Check for emergency signs in the drug query (e.g. overdose, poisoning)
    safety = safety_agent.check_input_safety(body.term, body.language)
    if safety["emergency"]:
        raise HTTPException(status_code=409, detail=safety["message"])

    overview = await medicine_service.get_drug_overview(body.term)
    return MedicineLookupResponse(
        query=overview["query"],
        openfda=overview["openfda"],
        rxnorm=overview["rxnorm"],
        disclaimer=DRUG_DISCLAIMER,
    )
