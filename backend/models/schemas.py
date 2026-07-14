from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ExtractedEntitySet(BaseModel):
    names: list[str] = Field(default_factory=list)
    dates: list[str] = Field(default_factory=list)
    money: list[str] = Field(default_factory=list)
    addresses: list[str] = Field(default_factory=list)


class UploadedEvidence(BaseModel):
    evidence: str
    status: Literal["Uploaded", "Missing"] = "Uploaded"


class LegalProvision(BaseModel):
    provision: str
    explanation: str
    why_it_may_apply: str
    confidence: Literal["Low", "Medium", "High"]


class ComplaintSection(BaseModel):
    section: str
    explanation: str


class TimelineItem(BaseModel):
    date: str
    event: str


class InvestigationReport(BaseModel):
    summary: str
    category: str
    timeline: list[TimelineItem] = Field(default_factory=list)
    evidence: list[UploadedEvidence] = Field(default_factory=list)
    legal_provisions: list[LegalProvision] = Field(default_factory=list)
    complaint_sections: list[ComplaintSection] = Field(default_factory=list)
    written_complaint_draft: str = ""
    missing_information: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)
    confidence: Literal["Low", "Medium", "High"] = "Medium"
    disclaimer: str


class FollowupQuestionResponse(BaseModel):
    questions: list[str] = Field(default_factory=list, min_length=1)


class ExtractionResult(BaseModel):
    files: list[str] = Field(default_factory=list)
    combined_text: str = ""
    extracted_entities: ExtractedEntitySet = Field(default_factory=ExtractedEntitySet)
    evidence: list[UploadedEvidence] = Field(default_factory=list)


class AnalyzeResponse(BaseModel):
    extraction: ExtractionResult
    report: InvestigationReport


class LLMHealthResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    status: str
    backend: str
    llm: str
    model: str
    backend_status: str
    llm_connected: bool
    model_name: str
    endpoint: str
    latency_ms: int | None = None
    reason: str | None = None
    ready: bool = False
