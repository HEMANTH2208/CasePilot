import logging
import time

from fastapi import APIRouter, File, Form, UploadFile

from backend.models.schemas import FollowupQuestionResponse
from backend.services.ai_service import AIService, AIServiceError
from backend.services.document_service import DocumentService

router = APIRouter(tags=["followup"])
document_service = DocumentService()
ai_service = AIService()
logger = logging.getLogger("casepilot.routes.followup")


@router.post("/followup", response_model=FollowupQuestionResponse)
async def generate_followups(
    incident_description: str = Form(...),
    files: list[UploadFile] = File(default=[]),
) -> FollowupQuestionResponse:
    start = time.perf_counter()
    try:
        logger.info("Received")
        logger.info("Description")
        logger.info("Documents")
        logger.info("%s", len(files))
        logger.info("Question Count")
        logger.info("0")
        logger.info("Calling LLM API...")

        extraction = await document_service.extract(files)
        questions = await ai_service.generate_followup_questions(
            incident_description=incident_description,
            extracted_text=extraction.combined_text,
        )
        elapsed = round(time.perf_counter() - start, 2)
        logger.info("Response received")
        logger.info("Time")
        logger.info("%s sec", elapsed)
        return FollowupQuestionResponse(questions=questions)
    except AIServiceError:
        raise
    except Exception as exc:
        raise AIServiceError("Failed to generate follow-up questions.", status_code=400, details=str(exc)) from None
