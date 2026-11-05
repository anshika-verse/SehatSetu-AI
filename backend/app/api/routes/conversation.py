from fastapi import APIRouter

from app.agents.safety_agent import safety_agent
from app.schemas.models import (
    IntakeTurnRequest,
    IntakeTurnResponse,
    KnowledgeAskRequest,
    KnowledgeAskResponse,
    SafetyCheckRequest,
    SafetyCheckResponse,
    SummaryRequest,
    SummaryResponse,
    TriageEvaluateRequest,
    TriageEvaluateResponse,
)
from app.services.intake import DISCLAIMER, process_turn
from app.services.rag import search_knowledge
from app.services.safety_rules import LIMITATION, emergency_copy
from app.services.summary import build_summary
from app.services.triage_service import TRIAGE_DISCLAIMER, triage_service

router = APIRouter()


@router.post("/intake/turn", response_model=IntakeTurnResponse)
def intake_turn(body: IntakeTurnRequest) -> IntakeTurnResponse:
    state, message, citations = process_turn(body.state, body.message)
    notice = emergency_copy(state.language) if state.emergency else None
    return IntakeTurnResponse(
        state=state,
        assistant_message=message,
        emergency=state.emergency,
        emergency_flags=state.emergency_flags,
        emergency_notice=notice,
        citations=citations,
        disclaimer=DISCLAIMER,
    )


@router.post("/safety/check", response_model=SafetyCheckResponse)
def safety_check(body: SafetyCheckRequest) -> SafetyCheckResponse:
    check = safety_agent.check_input_safety(body.text)
    return SafetyCheckResponse(
        emergency=check["emergency"],
        flags=check["flags"],
        message=check["message"],
        limitation=check["limitation"],
        crisis=check.get("crisis", False),
    )


@router.post("/triage/evaluate", response_model=TriageEvaluateResponse)
async def triage_evaluate(body: TriageEvaluateRequest) -> TriageEvaluateResponse:
    # First priority: Emergency red-flag safety check via SafetyAgent
    safety = safety_agent.check_input_safety(body.text, body.language)
    if safety["emergency"]:
        return TriageEvaluateResponse(
            available=True,
            status="emergency_detected",
            extracted_concepts=[],
            triage={
                "triage_level": "emergency_ambulance",
                "urgent": True,
                "flags": safety["flags"],
                "message": safety["message"],
            },
            notice=safety["message"],
            disclaimer=TRIAGE_DISCLAIMER,
        )

    # Symptom information -> verified triage service
    result = await triage_service.evaluate_user_symptoms(body.text, age=body.age, sex=body.sex)
    return TriageEvaluateResponse(
        available=result.get("available", False),
        status=result.get("status", "unknown"),
        extracted_concepts=result.get("extracted_concepts", []),
        triage=result.get("triage"),
        notice=result.get("notice"),
        disclaimer=result.get("disclaimer", TRIAGE_DISCLAIMER),
    )


@router.post("/knowledge/ask", response_model=KnowledgeAskResponse)
def knowledge_ask(body: KnowledgeAskRequest) -> KnowledgeAskResponse:
    safety = safety_agent.check_input_safety(body.question, body.language)
    if safety["emergency"]:
        return KnowledgeAskResponse(
            found=False,
            answer=safety["message"] or emergency_copy(body.language),
            citations=[],
            disclaimer=DISCLAIMER,
        )
    found, answer, citations = search_knowledge(body.question, body.language)
    if not found:
        if body.language == "hi":
            answer = "Is sawal ke liye verified source nahi mila. Kripya ek qualified health professional se poochhein."
        else:
            answer = "No verified source in this knowledge set matched that question. Please ask a qualified healthcare professional."
    return KnowledgeAskResponse(found=found, answer=answer, citations=citations, disclaimer=DISCLAIMER)


@router.post("/summary/generate", response_model=SummaryResponse)
def summary_generate(body: SummaryRequest) -> SummaryResponse:
    return build_summary(body.state, body.citations)
