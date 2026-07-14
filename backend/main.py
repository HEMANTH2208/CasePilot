import logging
import time

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.routes.analyze import router as analyze_router
from backend.routes.followup import router as followup_router
from backend.routes.health import router as health_router
from backend.services.ai_service import AIService, AIServiceError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

logger = logging.getLogger("casepilot.main")
ai_service = AIService()

app = FastAPI(title=settings.app_name, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.app_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    client_ip = request.client.host if request.client else "unknown"
    logger.info("Incoming Request")
    logger.info("%s %s", request.method, request.url.path)
    logger.info("Client")
    logger.info("%s", client_ip)

    response = await call_next(request)
    elapsed = round(time.perf_counter() - start, 2)
    logger.info("Response sent")
    logger.info("Time")
    logger.info("%s sec", elapsed)
    return response


@app.exception_handler(AIServiceError)
async def ai_error_handler(_: Request, exc: AIServiceError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.user_message,
            "details": exc.details,
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": "Request validation failed.",
            "details": exc.errors(),
        },
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled backend exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Unexpected backend error.",
            "details": str(exc),
        },
    )


@app.on_event("startup")
async def on_startup() -> None:
    await ai_service.startup_health_check()


app.include_router(health_router, prefix="/api")
app.include_router(followup_router, prefix="/api")
app.include_router(analyze_router, prefix="/api")
