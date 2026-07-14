import json
import logging
import time

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import Response

from backend.models.schemas import AnalyzeResponse, InvestigationReport
from backend.services.ai_service import AIService, AIServiceError
from backend.services.document_service import DocumentService
from backend.services.pdf_service import PDFService
from backend.services.report_service import ReportService


router = APIRouter(tags=["analyze"])
document_service = DocumentService()
ai_service = AIService()
report_service = ReportService()
pdf_service = PDFService()
logger = logging.getLogger("casepilot.routes.analyze")


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_case(
    incident_description: str = Form(...),
    answers_json: str = Form(default="{}"),
    files: list[UploadFile] = File(default=[]),
) -> AnalyzeResponse:
    start = time.perf_counter()
    try:
        answers = json.loads(answers_json) if answers_json else {}
        if not isinstance(answers, dict):
            raise ValueError("answers_json must be a JSON object.")

        logger.info("Received")
        logger.info("Description")
        logger.info("Documents")
        logger.info("%s", len(files))
        logger.info("Question Count")
        logger.info("%s", len(answers))
        logger.info("Calling LLM API...")

        extraction = await document_service.extract(files)
        report = await ai_service.analyze_case(
            incident_description=incident_description,
            extracted_text=extraction.combined_text,
            answers={str(k): str(v) for k, v in answers.items()},
            evidence_names=extraction.files,
        )
        report = report_service.merge_evidence(report=report, extraction=extraction)
        elapsed = round(time.perf_counter() - start, 2)
        logger.info("Response received")
        logger.info("Time")
        logger.info("%s sec", elapsed)
        return AnalyzeResponse(extraction=extraction, report=report)
    except AIServiceError:
        raise
    except json.JSONDecodeError as exc:
        raise AIServiceError("Invalid answers_json payload.", status_code=400, details=str(exc)) from None
    except Exception as exc:
        raise AIServiceError("Failed to analyze case.", status_code=400, details=str(exc)) from None


@router.post("/report/pdf")
async def generate_pdf(report: InvestigationReport) -> Response:
    try:
        pdf_bytes = pdf_service.render_report_pdf(report)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=casepilot-report.pdf"},
        )
    except Exception as exc:
        raise AIServiceError("Failed to generate PDF.", status_code=400, details=str(exc)) from None
