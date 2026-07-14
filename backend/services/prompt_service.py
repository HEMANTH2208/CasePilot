from backend.prompts.analysis_prompt import build_analysis_system_prompt, build_analysis_user_prompt
from backend.prompts.followup_prompt import build_followup_system_prompt, build_followup_user_prompt
from backend.prompts.report_prompt import build_report_schema_prompt


class PromptService:
    def followup_prompt(self, incident_description: str, extracted_text: str) -> tuple[str, str]:
        return (
            build_followup_system_prompt(),
            build_followup_user_prompt(incident_description=incident_description, extracted_text=extracted_text),
        )

    def analysis_prompt(
        self,
        incident_description: str,
        extracted_text: str,
        answers_json: str,
        evidence_json: str,
    ) -> tuple[str, str]:
        return (
            build_analysis_system_prompt(),
            build_analysis_user_prompt(
                incident_description=incident_description,
                extracted_text=extracted_text,
                answers_json=answers_json,
                evidence_json=evidence_json,
                report_schema_text=build_report_schema_prompt(),
            ),
        )
