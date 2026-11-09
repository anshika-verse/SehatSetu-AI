"""Routes for Medical Report Upload and Automated Extraction."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.services.report_service import REPORT_DISCLAIMER, report_service

router = APIRouter()


class ReportParseTextRequest(BaseModel):
    text: str = Field(min_length=5, max_length=15000)
    language: str = "hinglish"
    consent: bool = True


class LabParameterItem(BaseModel):
    parameter_id: str
    name: str
    category: str
    value: float
    unit: str
    reference_range: str
    reference_low: float
    reference_high: float
    status: str
    status_label: str
    is_out_of_range: bool
    description: str


class ReportAnalysisResponse(BaseModel):
    filename: Optional[str] = None
    file_type: Optional[str] = None
    total_found: int
    out_of_range_count: int
    parameters: List[LabParameterItem]
    summary: str
    disclaimer: str


@router.post("/reports/analyze", response_model=ReportAnalysisResponse)
async def analyze_report_file(
    file: UploadFile = File(...),
    language: str = Form("hinglish"),
    consent: bool = Form(True),
) -> ReportAnalysisResponse:
    """Analyze uploaded medical report (PDF, PNG, JPG) with explicit user consent."""
    if not consent:
        raise HTTPException(
            status_code=400,
            detail="Patient consent is required before processing or storing sensitive medical reports.",
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file appears to be empty.")
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds the 10MB limit.")

    filename = file.filename or "medical_report"
    content_type = file.content_type or "application/octet-stream"

    # Extract text from PDF or raw content
    extracted_text = report_service.extract_text_from_file(content, filename, content_type)

    # Parse clinical parameters
    analysis = report_service.parse_report_parameters(extracted_text, user_language=language)

    return ReportAnalysisResponse(
        filename=filename,
        file_type=content_type,
        total_found=analysis["total_found"],
        out_of_range_count=analysis["out_of_range_count"],
        parameters=analysis["parameters"],
        summary=analysis["summary"],
        disclaimer=analysis.get("disclaimer", REPORT_DISCLAIMER),
    )


@router.post("/reports/parse-text", response_model=ReportAnalysisResponse)
async def parse_report_text(body: ReportParseTextRequest) -> ReportAnalysisResponse:
    """Analyze manually entered or copied lab report text."""
    if not body.consent:
        raise HTTPException(
            status_code=400,
            detail="Patient consent is required before processing sensitive health information.",
        )

    analysis = report_service.parse_report_parameters(body.text, user_language=body.language)

    return ReportAnalysisResponse(
        filename="Manual Text Input",
        file_type="text/plain",
        total_found=analysis["total_found"],
        out_of_range_count=analysis["out_of_range_count"],
        parameters=analysis["parameters"],
        summary=analysis["summary"],
        disclaimer=analysis.get("disclaimer", REPORT_DISCLAIMER),
    )

