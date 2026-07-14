import json
import logging
import time
from typing import Any

import httpx

from backend.models.schemas import InvestigationReport
from backend.config import settings
from backend.services.prompt_service import PromptService


class AIServiceError(Exception):
    def __init__(self, user_message: str, status_code: int = 502, details: Any = None) -> None:
        super().__init__(user_message)
        self.user_message = user_message
        self.status_code = status_code
        self.details = details


class AIService:
    """
    All LLM interactions must pass through this service.
    Uses OpenAI-compatible chat/completions API with env-driven configuration.
    """

    def __init__(self) -> None:
        self.base_url = settings.llm_base_url
        self.model = settings.llm_model
        self.api_key = settings.llm_api_key
        self.timeout = settings.llm_timeout_seconds
        self.provider = settings.llm_provider
        self.runtime_model = self.model
        self.prompt_service = PromptService()
        self.logger = logging.getLogger("casepilot.ai")
        self._env_errors = self._validate_env()

        self.logger.info(
            "LLM config loaded | provider=%s model=%s endpoint=%s timeout=%ss",
            self.provider,
            self.model,
            self.base_url,
            self.timeout,
        )

    def _validate_env(self) -> list[str]:
        missing: list[str] = []
        if not self.base_url:
            missing.append("LLM_BASE_URL not configured.")
        if not self.model:
            missing.append("LLM_MODEL not configured.")
        if self.api_key == "":
            missing.append("LLM_API_KEY not configured.")
        
        # Check for placeholder API keys for cloud providers
        if self.provider in ("openai", "gemini", "groq"):
            key_strip = (self.api_key or "").strip()
            placeholders = {"none", "non", "noauth", "no_auth", "placeholder_openai_api_key",
                            "your_groq_api_key", "your_free_gemini_api_key", "your_api_key"}
            if not key_strip or key_strip.lower() in placeholders:
                missing.append(f"LLM_API_KEY contains a placeholder. Please set a real {self.provider.upper()} API key.")
        return missing

    def _ensure_env(self) -> None:
        if self._env_errors:
            raise AIServiceError(
                "Backend LLM environment is not configured.",
                status_code=500,
                details=self._env_errors,
            )

    async def startup_health_check(self) -> None:
        try:
            self._ensure_env()
            await self._verify_model_server()
            provider_label = self.provider.upper()
            print("====================================")
            print("")
            print("Backend Started")
            print("")
            print("Backend URL")
            print("")
            print("http://localhost:5001")
            print("")
            print("Frontend Allowed")
            print("")
            print("http://localhost:5173")
            print("")
            print(f"{provider_label} Status")
            print("")
            print("Connected")
            print("")
            print("Model")
            print("")
            print(self.runtime_model)
            print("")
            print("====================================")
        except AIServiceError as exc:
            provider_label = self.provider.upper()
            print("WARNING")
            print("")
            print(f"Unable to connect to {provider_label} API server")
            print("")
            print("Reason")
            print("")
            print(exc.details or "Connection Refused")
            print("")
            print("Expected Endpoint")
            print("")
            print(self.base_url)


    def _auth_headers(self) -> dict[str, str]:
        key = (self.api_key or "").strip()
        if not key or key.lower() in {"none", "non", "noauth", "no_auth"}:
            return {}
        return {"Authorization": f"Bearer {key}"}

    async def generate_followup_questions(self, incident_description: str, extracted_text: str) -> list[str]:
        self._ensure_env()
        system_prompt, user_prompt = self.prompt_service.followup_prompt(
            incident_description=incident_description,
            extracted_text=extracted_text,
        )
        payload = await self._chat_completion(system_prompt, user_prompt, temperature=0.2)
        questions = payload.get("questions", [])
        clean = [str(q).strip() for q in questions if str(q).strip()]
        return clean[:7] if clean else ["When exactly did the incident happen?"]

    async def analyze_case(
        self,
        incident_description: str,
        extracted_text: str,
        answers: dict[str, str],
        evidence_names: list[str],
    ) -> InvestigationReport:
        self._ensure_env()
        system_prompt, user_prompt = self.prompt_service.analysis_prompt(
            incident_description=incident_description,
            extracted_text=extracted_text,
            answers_json=json.dumps(answers, ensure_ascii=True),
            evidence_json=json.dumps(evidence_names, ensure_ascii=True),
        )

        payload = await self._chat_completion(system_prompt, user_prompt, temperature=0.1)

        # ── Post-process LLM output to conform to strict Pydantic schema ──
        # Normalize evidence statuses: LLMs often return "Available", "Provided", etc.
        if isinstance(payload.get("evidence"), list):
            for item in payload["evidence"]:
                if isinstance(item, dict) and "status" in item:
                    raw_status = str(item["status"]).strip().lower()
                    if raw_status in ("missing", "not provided", "unavailable", "not uploaded", "absent"):
                        item["status"] = "Missing"
                    else:
                        item["status"] = "Uploaded"
        else:
            payload["evidence"] = [{"evidence": name, "status": "Uploaded"} for name in evidence_names]

        # Normalize confidence values
        if isinstance(payload.get("confidence"), str):
            conf = payload["confidence"].strip().lower()
            if "high" in conf:
                payload["confidence"] = "High"
            elif "low" in conf:
                payload["confidence"] = "Low"
            else:
                payload["confidence"] = "Medium"

        # Normalize legal_provisions confidence
        if isinstance(payload.get("legal_provisions"), list):
            for prov in payload["legal_provisions"]:
                if isinstance(prov, dict) and "confidence" in prov:
                    conf = str(prov["confidence"]).strip().lower()
                    if "high" in conf:
                        prov["confidence"] = "High"
                    elif "low" in conf:
                        prov["confidence"] = "Low"
                    else:
                        prov["confidence"] = "Medium"

        # Normalize complaint_sections
        if not isinstance(payload.get("complaint_sections"), list):
            payload["complaint_sections"] = []

        # Normalize written_complaint_draft
        if not isinstance(payload.get("written_complaint_draft"), str):
            payload["written_complaint_draft"] = str(payload.get("written_complaint_draft") or "")

        if not payload.get("disclaimer"):
            payload["disclaimer"] = (
                "This report is an AI-generated investigation aid, not legal advice. "
                "Consult a qualified lawyer for legal strategy."
            )
        return InvestigationReport.model_validate(payload)

    async def health_check(self) -> dict[str, Any]:
        if self._env_errors:
            return {
                "status": "online",
                "backend": "running",
                "llm": "offline",
                "model": self.model or "unknown",
                "backend_status": "Backend Running",
                "llm_connected": False,
                "model_name": self.model or "unknown",
                "endpoint": self.base_url or "not-configured",
                "latency_ms": None,
                "reason": "; ".join(self._env_errors),
                "ready": False,
            }

        if self.provider in ("openai", "gemini", "groq"):
            return {
                "status": "online",
                "backend": "running",
                "llm": "connected",
                "model": self.runtime_model,
                "backend_status": "Backend Running",
                "llm_connected": True,
                "model_name": self.runtime_model,
                "endpoint": self.base_url,
                "latency_ms": 0,
                "reason": None,
                "ready": True,
            }

        start = time.perf_counter()
        models_endpoint = f"{self.base_url}/models"
        headers = self._auth_headers()
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(models_endpoint, headers=headers)
            latency_ms = int((time.perf_counter() - start) * 1000)
            response.raise_for_status()
            payload = response.json()
            available_models = [item.get("id", "") for item in payload.get("data", []) if isinstance(item, dict)]
            
            connected = self.runtime_model in available_models or not available_models

            return {
                "status": "online",
                "backend": "running",
                "llm": "connected" if connected else "offline",
                "model": self.runtime_model,
                "backend_status": "Backend Running",
                "llm_connected": connected,
                "model_name": self.runtime_model,
                "endpoint": self.base_url,
                "latency_ms": latency_ms,
                "reason": None if connected else "Model not present in /models response.",
                "ready": connected,
            }
        except Exception as exc:
            return {
                "status": "online",
                "backend": "running",
                "llm": "offline",
                "model": self.runtime_model or "unknown",
                "backend_status": "Backend Running",
                "llm_connected": False,
                "model_name": self.runtime_model or "unknown",
                "endpoint": self.base_url,
                "latency_ms": None,
                "reason": str(exc),
                "ready": False,
            }

    async def _verify_model_server(self) -> None:
        if self.provider in ("openai", "gemini", "groq"):
            self.runtime_model = self.model
            return

        models_endpoint = f"{self.base_url}/models"
        headers = self._auth_headers()
        start = time.perf_counter()
        provider_label = self.provider.upper() + " API"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(models_endpoint, headers=headers)
            latency_ms = int((time.perf_counter() - start) * 1000)
            self.logger.info("LLM preflight /models | status=%s latency=%sms", response.status_code, latency_ms)
            if response.status_code >= 400:
                raise AIServiceError(
                    f"Unable to connect to {provider_label} server.",
                    status_code=502,
                    details=f"Status code {response.status_code} at {self.base_url}",
                )
            data = response.json()
            available_models = [item.get("id", "") for item in data.get("data", []) if isinstance(item, dict)]
            if self.provider == "local" and available_models and self.model not in available_models:
                raise AIServiceError(
                    "Configured model is not available on the inference server.",
                    status_code=503,
                    details=f"Model '{self.model}' not found. Available models: {available_models}",
                )
            self.runtime_model = self.model
        except httpx.TimeoutException:
            self.logger.error("LLM preflight timeout | endpoint=%s", models_endpoint)
            raise AIServiceError(
                f"Unable to connect to {provider_label}.",
                status_code=504,
                details=f"Timeout while reaching {models_endpoint}",
            ) from None
        except httpx.ConnectError:
            self.logger.error("LLM preflight connection refused | endpoint=%s", models_endpoint)
            raise AIServiceError(
                f"Unable to connect to {provider_label}.",
                status_code=502,
                details=f"Connection refused at {self.base_url}",
            ) from None
        except httpx.HTTPError as exc:
            self.logger.error("LLM preflight HTTP error | endpoint=%s error=%s", models_endpoint, exc)
            raise AIServiceError(
                f"Unable to connect to {provider_label}.",
                status_code=502,
                details=str(exc),
            ) from None

    async def _chat_completion(self, system_prompt: str, user_prompt: str, temperature: float) -> dict[str, Any]:
        # Latency optimization: Skip pre-flight server verification on every call.
        headers = {"Content-Type": "application/json", **self._auth_headers()}
        chat_endpoint = f"{self.base_url}/chat/completions"

        chat_body = {
            "model": self.runtime_model,
            "temperature": temperature,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }

        prompt_tokens_estimate = max(1, (len(system_prompt) + len(user_prompt)) // 4)
        self.logger.info("Sending request...")
        self.logger.info("Model: %s", self.runtime_model)
        self.logger.info("Endpoint: %s", self.base_url)
        self.logger.info("Prompt Tokens: %s", prompt_tokens_estimate)

        last_error: AIServiceError | None = None
        for attempt in range(1, 3):
            start = time.perf_counter()
            try:
                self.logger.info("Waiting... | endpoint=chat attempt=%s", attempt)
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(chat_endpoint, headers=headers, json=chat_body)
                elapsed = round(time.perf_counter() - start, 2)
                self.logger.info("Response received | status=%s", response.status_code)
                self.logger.info("%s seconds", elapsed)

                if response.status_code == 404:
                    raise AIServiceError("LLM endpoint not found (404). Verify LLM_BASE_URL.", status_code=502)
                if response.status_code == 401:
                    raise AIServiceError("Invalid API Key. Please verify your OpenAI credentials.", status_code=401)
                if response.status_code == 429:
                    raise AIServiceError("OpenAI API rate limit or quota exceeded. Please check your billing status or API limits.", status_code=429)
                if response.status_code >= 500:
                    raise AIServiceError("LLM API server returned an internal error.", status_code=502)
                response.raise_for_status()

                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content")
                
                if not content:
                    raise AIServiceError("The LLM API returned an empty response.", status_code=502)
                if isinstance(content, str):
                    try:
                        return json.loads(content)
                    except json.JSONDecodeError:
                        self.logger.error("Invalid JSON response from model.")
                        raise AIServiceError(
                            "The LLM API returned invalid JSON.",
                            status_code=502,
                            details=f"Endpoint: {chat_endpoint}",
                        ) from None
                if isinstance(content, dict):
                    return content
                raise AIServiceError(
                    "Unexpected response payload format from LLM API.",
                    status_code=502,
                    details=f"Endpoint: {chat_endpoint}",
                )
            except AIServiceError as exc:
                last_error = exc
                if attempt == 2 or exc.status_code in (401, 429):
                    break
            except httpx.TimeoutException:
                self.logger.error("Timeout while calling model.")
                last_error = AIServiceError(
                    "Request to LLM API timed out.",
                    status_code=504,
                    details=f"Endpoint: {chat_endpoint}",
                )
                if attempt == 2:
                    break
            except httpx.ConnectError:
                self.logger.error("Connection refused for endpoint=%s", chat_endpoint)
                last_error = AIServiceError(
                    "Unable to connect to LLM API.",
                    status_code=502,
                    details=f"Connection refused at {self.base_url}",
                )
                if attempt == 2:
                    break
            except httpx.HTTPStatusError as exc:
                self.logger.error("HTTP status error from model | status=%s", exc.response.status_code)
                try:
                    res_json = exc.response.json()
                    error_msg = res_json.get("error", {}).get("message", exc.response.text)
                except Exception:
                    error_msg = exc.response.text

                if exc.response.status_code == 400:
                    last_error = AIServiceError(f"LLM API returned Bad Request (400): {error_msg}", status_code=502)
                elif exc.response.status_code == 401:
                    last_error = AIServiceError(f"Invalid API Key: {error_msg}", status_code=401)
                elif exc.response.status_code == 404:
                    last_error = AIServiceError("LLM endpoint not found (404). Verify LLM_BASE_URL.", status_code=502)
                elif exc.response.status_code == 429:
                    last_error = AIServiceError(f"API Rate limit or quota exceeded: {error_msg}", status_code=429)
                else:
                    last_error = AIServiceError(
                        f"LLM API request failed: {error_msg}",
                        status_code=502,
                        details=f"HTTP {exc.response.status_code} from {chat_endpoint}",
                    )
                if attempt == 2 or exc.response.status_code in (401, 429):
                    break
            except (ValueError, KeyError):
                self.logger.error("Invalid response schema from LLM API.")
                last_error = AIServiceError(
                    "LLM API returned an invalid response.",
                    status_code=502,
                    details=f"Endpoint: {chat_endpoint}",
                )
                if attempt == 2:
                    break

        if last_error:
            raise last_error
        raise AIServiceError("LLM API request failed.", status_code=502)
