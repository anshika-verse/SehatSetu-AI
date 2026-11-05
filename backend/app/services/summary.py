import re

from app.schemas.models import Citation, IntakeState, SummaryField, SummaryResponse

UNSURE_PHRASES = {
    "nahi pata",
    "pata nahi",
    "malum nahi",
    "dont know",
    "do not know",
    "not sure",
    "unsure",
    "i dont know",
    "i do not know",
}

TITLE = "Patient-reported summary — not a diagnosis."
DISCLAIMER = (
    "This summary only organises what the user reported. It is not a diagnosis, "
    "prescription, or clinical assessment. A qualified healthcare professional must review it."
)


def build_summary(state: IntakeState, citations: list[Citation]) -> SummaryResponse:
    fields = [
        _field("Main concern", state.main_concern),
        _field("Duration", state.duration),
        _field("User-reported severity", state.severity),
        _field("Associated symptoms", state.associated_symptoms),
        _field("Patient age", getattr(state, "age", None)),
        _field("Relevant medical history", getattr(state, "relevant_history", None)),
        SummaryField(
            label="Emergency warning triggered",
            value=", ".join(state.emergency_flags) if state.emergency_flags else "None detected by the limited checklist",
            source="system",
        ),
        SummaryField(
            label="Sources shown",
            value=_citation_text(citations),
            source="system" if citations else "not_provided",
        ),
    ]
    lines = [TITLE, ""]
    for field in fields:
        lines.append(f"{field.label}: {field.value} [{field.source}]")
    if state.emergency:
        lines.append("")
        lines.append("Urgent care was advised. The app did not contact emergency services.")
    lines.extend(["", DISCLAIMER])
    return SummaryResponse(title=TITLE, fields=fields, text="\n".join(lines), disclaimer=DISCLAIMER)


def is_unspecified(value: str | None) -> bool:
    if value is None or not value.strip():
        return True
    compact = re.sub(r"[^a-z\s]", "", value.lower())
    compact = re.sub(r"\s+", " ", compact).strip()
    return compact in UNSURE_PHRASES


def _field(label: str, value: str | None) -> SummaryField:
    if is_unspecified(value):
        return SummaryField(label=label, value="Not provided", source="not_provided")
    return SummaryField(label=label, value=value.strip(), source="reported_by_user")


def _citation_text(citations: list[Citation]) -> str:
    if not citations:
        return "None"
    return "; ".join(f"{item.title} — {item.publisher} ({item.url})" for item in citations)
