from typing import Literal

from pydantic import BaseModel, Field

Language = str
Awaiting = str
FieldSource = Literal["reported_by_user", "not_provided", "system"]


class IntakeState(BaseModel):
    language: Language = "hinglish"
    main_concern: str | None = None
    duration: str | None = None
    severity: str | None = None
    associated_symptoms: str | None = None
    age: str | None = None
    relevant_history: str | None = None
    awaiting: Awaiting = "concern"
    emergency: bool = False
    emergency_flags: list[str] = Field(default_factory=list)


class Citation(BaseModel):
    title: str
    publisher: str
    url: str
    last_checked: str


class IntakeTurnRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    state: IntakeState = Field(default_factory=IntakeState)


class IntakeTurnResponse(BaseModel):
    state: IntakeState
    assistant_message: str
    emergency: bool
    emergency_flags: list[str]
    emergency_notice: str | None = None
    citations: list[Citation] = Field(default_factory=list)
    disclaimer: str


class SafetyCheckRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


class SafetyCheckResponse(BaseModel):
    emergency: bool
    flags: list[str]
    message: str | None = None
    limitation: str
    crisis: bool = False


class KnowledgeAskRequest(BaseModel):
    question: str = Field(min_length=2, max_length=500)
    language: Language = "hinglish"


class KnowledgeAskResponse(BaseModel):
    found: bool
    answer: str
    citations: list[Citation]
    disclaimer: str


class SummaryField(BaseModel):
    label: str
    value: str
    source: FieldSource


class SummaryRequest(BaseModel):
    state: IntakeState
    citations: list[Citation] = Field(default_factory=list)


class SummaryResponse(BaseModel):
    title: str
    fields: list[SummaryField]
    text: str
    disclaimer: str


class SpeakRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1500)
    language: Language = "hinglish"
    gender: Literal["male", "female"] = "female"
    voice: str | None = None


class ReportExplainRequest(BaseModel):
    term: str = Field(min_length=2, max_length=200)
    language: Language = "hinglish"


class AppointmentRequest(BaseModel):
    facility_name: str = Field(min_length=2, max_length=160)
    preferred_time: str = Field(min_length=2, max_length=120)
    consent: bool


class TriageConcept(BaseModel):
    id: str
    name: str | None = None
    common_name: str | None = None


class TriageEvaluateRequest(BaseModel):
    text: str = Field(min_length=2, max_length=2000)
    age: int | None = Field(default=None, ge=0, le=120)
    sex: Literal["male", "female"] | None = None
    language: Language = "hinglish"


class TriageEvaluateResponse(BaseModel):
    available: bool
    status: str
    extracted_concepts: list[TriageConcept] = Field(default_factory=list)
    triage: dict | None = None
    notice: str | None = None
    disclaimer: str


class MedicineLookupRequest(BaseModel):
    term: str = Field(min_length=2, max_length=200)
    language: Language = "hinglish"


class MedicineLookupResponse(BaseModel):
    query: str
    openfda: dict
    rxnorm: dict
    disclaimer: str


class ReverseGeocodeResponse(BaseModel):
    formatted_address: str
    city: str | None = None
    state: str | None = None
    area: str | None = None
    country: str | None = None
    provider: str


class LanguageDetectRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


class LanguageDetectResponse(BaseModel):
    detected_language: str
    language_name: str
    confidence: float
    provider: str
    is_code_mixed: bool = False

