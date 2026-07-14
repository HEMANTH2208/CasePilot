import re
from dataclasses import dataclass

import fitz
from fastapi import UploadFile

from backend.models.schemas import ExtractedEntitySet, ExtractionResult, UploadedEvidence


ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
}


@dataclass
class RawDocument:
    filename: str
    text: str


class DocumentService:
    async def extract(self, files: list[UploadFile]) -> ExtractionResult:
        docs: list[RawDocument] = []
        for file in files:
            if file.content_type not in ALLOWED_CONTENT_TYPES:
                continue
            content = await file.read()
            text = self._extract_text(file.filename or "unknown", file.content_type or "", content)
            docs.append(RawDocument(filename=file.filename or "unknown", text=text))

        combined = "\n\n".join(doc.text for doc in docs if doc.text.strip())
        entities = self._extract_entities(combined)
        return ExtractionResult(
            files=[doc.filename for doc in docs],
            combined_text=combined,
            extracted_entities=entities,
            evidence=[UploadedEvidence(evidence=doc.filename, status="Uploaded") for doc in docs],
        )

    def _extract_text(self, filename: str, content_type: str, content: bytes) -> str:
        if content_type == "application/pdf" or filename.lower().endswith(".pdf"):
            return self._extract_pdf_text(content)
        # OCR intentionally disabled for this MVP.
        return ""

    def _extract_pdf_text(self, content: bytes) -> str:
        text_parts: list[str] = []
        with fitz.open(stream=content, filetype="pdf") as doc:
            for page in doc:
                text_parts.append(page.get_text())
        return "\n".join(text_parts)

    def _extract_entities(self, text: str) -> ExtractedEntitySet:
        normalized = " ".join(text.split())

        dates = list(
            {
                match
                for match in re.findall(
                    r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b",
                    normalized,
                    flags=re.IGNORECASE,
                )
            }
        )
        money = list(
            {match for match in re.findall(r"\b(?:USD|INR|Rs\.?|₹|\$)\s?\d[\d,]*(?:\.\d{1,2})?\b", normalized)}
        )
        names = list(
            {
                match.strip()
                for match in re.findall(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b", normalized)
                if len(match.strip().split()) <= 3
            }
        )
        addresses = list(
            {
                match.strip()
                for match in re.findall(
                    r"\b\d{1,5}\s+[A-Za-z0-9\s.,-]+(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Nagar|Colony|Layout)\b",
                    normalized,
                    flags=re.IGNORECASE,
                )
            }
        )

        return ExtractedEntitySet(
            names=sorted(names)[:25],
            dates=sorted(dates)[:25],
            money=sorted(money)[:25],
            addresses=sorted(addresses)[:25],
        )
