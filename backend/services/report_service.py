from backend.models.schemas import ExtractionResult, InvestigationReport


class ReportService:
    def merge_evidence(self, report: InvestigationReport, extraction: ExtractionResult) -> InvestigationReport:
        if not report.evidence and extraction.evidence:
            report.evidence = extraction.evidence
        return report
