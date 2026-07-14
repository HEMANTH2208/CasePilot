from fastapi import APIRouter

from backend.models.schemas import LLMHealthResponse
from backend.services.ai_service import AIService

router = APIRouter(tags=["health"])
ai_service = AIService()


@router.get("/health", response_model=LLMHealthResponse)
async def api_health() -> LLMHealthResponse:
    return LLMHealthResponse.model_validate(await ai_service.health_check())
