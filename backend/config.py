import os
from dataclasses import dataclass, field

from pathlib import Path

from dotenv import load_dotenv

# Load the backend/.env relative to this config file
current_dir = Path(__file__).parent.resolve()
load_dotenv(current_dir / ".env")



def _csv_env(key: str, default: str) -> list[str]:
    raw = os.getenv(key, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "CasePilot AI Backend")
    app_host: str = os.getenv("APP_HOST", "0.0.0.0")
    app_port: int = int(os.getenv("APP_PORT", "5001"))
    app_cors_origins: list[str] = field(
        default_factory=lambda: _csv_env(
            "APP_CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        )
    )

    llm_provider: str = os.getenv("LLM_PROVIDER", "local")
    llm_base_url: str = os.getenv("LLM_BASE_URL", "").rstrip("/")
    llm_api_key: str = os.getenv("LLM_API_KEY", "")
    llm_model: str = os.getenv("LLM_MODEL", "")
    llm_timeout_seconds: int = int(os.getenv("LLM_TIMEOUT_SECONDS", "120"))

    def __post_init__(self) -> None:
        if self.llm_provider == "openai":
            if not self.llm_base_url:
                object.__setattr__(self, "llm_base_url", "https://api.openai.com/v1")
            if not self.llm_model:
                object.__setattr__(self, "llm_model", "gpt-4o-mini")
        elif self.llm_provider == "gemini":
            if not self.llm_base_url:
                object.__setattr__(self, "llm_base_url", "https://generativelanguage.googleapis.com/v1beta/openai")
            if not self.llm_model:
                object.__setattr__(self, "llm_model", "gemini-1.5-flash")
        elif self.llm_provider == "groq":
            if not self.llm_base_url:
                object.__setattr__(self, "llm_base_url", "https://api.groq.com/openai/v1")
            if not self.llm_model:
                object.__setattr__(self, "llm_model", "llama-3.1-8b-instant")


settings = Settings()

