from backend.routes.analyze import router as analyze_router
from backend.routes.followup import router as followup_router
from backend.routes.health import router as health_router

__all__ = ["analyze_router", "followup_router", "health_router"]
