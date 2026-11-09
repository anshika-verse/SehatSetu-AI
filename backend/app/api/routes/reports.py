"""Routes for Medical Report Upload, OCR, Automated Extraction, and File Storage."""

import os
import re
import time
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.services.report_service import REPORT_DISCLAIMER, report_service

router = APIRouter()

# Ensure uploads directory exists
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)


class ReportParseTextRequest(BaseModel):
    text: str = Field(min_length=5, max_length=25000)
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
    difference_from_range: Optional[str] = None
    is_critical: Optional[bool] = False
    confidence: Optional[str] = "high"
    description: str
    doctor_question: Optional[str] = None


class ReportAnalysisResponse(BaseModel):
    filename: Optional[str] = None
    file_type: Optional[str] = None
    file_url: Optional[str] = None
    report_date: Optional[str] = None
    total_found: int
    out_of_range_count: int
    critical_count: int = 0
    has_critical: bool = False
    parameters: List[LabParameterItem]
    summary: str
    disclaimer: str
    upload_date: Optional[str] = None


class RecalculateRequest(BaseModel):
    parameters: List[LabParameterItem]
    language: str = "hinglish"
    report_date: Optional[str] = None


@router.post("/reports/analyze", response_model=ReportAnalysisResponse)
async def analyze_report_file(
    file: UploadFile = File(...),
    language: str = Form("hinglish"),
    consent: bool = Form(True),
) -> ReportAnalysisResponse:
    """Analyze uploaded medical report (PDF, PNG, JPG) with explicit patient consent."""
    if not consent:
        raise HTTPException(
            status_code=400,
            detail="Patient consent is required before processing or storing sensitive medical reports.",
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file appears to be empty.")
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds the 15MB limit.")

    original_filename = file.filename or "medical_report"
    content_type = file.content_type or "application/octet-stream"

    # Save original uploaded file safely with timestamp prefix
    safe_name = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", original_filename)
    stored_filename = f"{int(time.time())}_{safe_name}"
    file_dest_path = os.path.join(UPLOAD_DIR, stored_filename)
    try:
        with open(file_dest_path, "wb") as f:
            f.write(content)
        file_url = f"/api/reports/files/{stored_filename}"
    except Exception:
        file_url = None

    # Extract text from PDF, OCR scan, or image
    extracted_text = report_service.extract_text_from_file(content, original_filename, content_type)

    if not extracted_text.strip():
        # Cleanly communicate that OCR could not read readable text
        return ReportAnalysisResponse(
            filename=original_filename,
            file_type=content_type,
            file_url=file_url,
            report_date=None,
            total_found=0,
            out_of_range_count=0,
            critical_count=0,
            has_critical=False,
            parameters=[],
            summary=(
                "The uploaded document does not contain readable printed text, or the image resolution is too low. "
                "Please upload a clear scanned copy or paste the laboratory test text directly."
            ),
            disclaimer=REPORT_DISCLAIMER,
            upload_date=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        )

    # Parse clinical parameters and assess ranges
    analysis = report_service.parse_report_parameters(extracted_text, user_language=language)

    return ReportAnalysisResponse(
        filename=original_filename,
        file_type=content_type,
        file_url=file_url,
        report_date=analysis.get("report_date"),
        total_found=analysis["total_found"],
        out_of_range_count=analysis["out_of_range_count"],
        critical_count=analysis.get("critical_count", 0),
        has_critical=analysis.get("has_critical", False),
        parameters=analysis["parameters"],
        summary=analysis["summary"],
        disclaimer=analysis.get("disclaimer", REPORT_DISCLAIMER),
        upload_date=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
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
        file_url=None,
        report_date=analysis.get("report_date"),
        total_found=analysis["total_found"],
        out_of_range_count=analysis["out_of_range_count"],
        critical_count=analysis.get("critical_count", 0),
        has_critical=analysis.get("has_critical", False),
        parameters=analysis["parameters"],
        summary=analysis["summary"],
        disclaimer=analysis.get("disclaimer", REPORT_DISCLAIMER),
        upload_date=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    )


@router.post("/reports/recalculate", response_model=ReportAnalysisResponse)
async def recalculate_report_parameters(body: RecalculateRequest) -> ReportAnalysisResponse:
    """Recalculate differences, statuses, and patient summary after manual patient edits."""
    recalculated_params: List[LabParameterItem] = []
    raw_dicts = []

    for item in body.parameters:
        val = item.value
        low = item.reference_low
        high = item.reference_high

        is_low = val < low
        is_high = val > high
        is_out = is_low or is_high

        status = "normal"
        status_label = "Within Stated Range"
        if is_low:
            status = "low"
            status_label = "Below Stated Range"
        elif is_high:
            status = "high"
            status_label = "Above Stated Range"

        diff = report_service._format_difference(val, low, high, item.unit)

        # Check critical
        is_critical = False
        from app.services.report_service import CRITICAL_THRESHOLDS
        crit = CRITICAL_THRESHOLDS.get(item.parameter_id)
        if crit:
            if val <= crit.get("critical_low", -1e9) or val >= crit.get("critical_high", 1e9):
                is_critical = True

        updated_dict = item.model_dump()
        updated_dict["status"] = status
        updated_dict["status_label"] = status_label
        updated_dict["is_out_of_range"] = is_out
        updated_dict["difference_from_range"] = diff
        updated_dict["is_critical"] = is_critical
        recalculated_params.append(LabParameterItem(**updated_dict))
        raw_dicts.append(updated_dict)

    has_crit = any(p.is_critical for p in recalculated_params)
    summary = report_service._build_intelligent_patient_summary(
        raw_dicts,
        user_language=body.language,
        report_date=body.report_date,
        has_critical=has_crit,
    )

    return ReportAnalysisResponse(
        filename="User Corrected Report",
        file_type="text/plain",
        file_url=None,
        report_date=body.report_date,
        total_found=len(recalculated_params),
        out_of_range_count=sum(1 for p in recalculated_params if p.is_out_of_range),
        critical_count=sum(1 for p in recalculated_params if p.is_critical),
        has_critical=has_crit,
        parameters=recalculated_params,
        summary=summary,
        disclaimer=REPORT_DISCLAIMER,
        upload_date=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    )


@router.get("/reports/files/{filename}")
async def get_report_file(filename: str):
    """Retrieve original uploaded medical report document."""
    safe_name = os.path.basename(filename)
    path = os.path.join(UPLOAD_DIR, safe_name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Requested report file was not found.")
    return FileResponse(path, filename=safe_name)
