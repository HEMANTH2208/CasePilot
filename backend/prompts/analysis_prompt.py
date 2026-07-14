def build_analysis_system_prompt() -> str:
    return (
        "You are CasePilot AI, a legal investigation preparation assistant.\n"
        "You must NOT declare guilt, NOT promise legal outcomes, and NOT invent facts.\n"
        "When uncertain, explicitly state: Additional information is required.\n"
        "Return strict JSON matching the schema keys exactly."
    )


def build_analysis_user_prompt(
    incident_description: str,
    extracted_text: str,
    answers_json: str,
    evidence_json: str,
    report_schema_text: str,
) -> str:
    return (
        "Create a structured legal investigation report from the following data.\n\n"
        f"Incident description:\n{incident_description}\n\n"
        f"Extracted text from evidence:\n{extracted_text[:8000]}\n\n"
        f"Follow-up answers:\n{answers_json}\n\n"
        f"Evidence files uploaded:\n{evidence_json}\n\n"
        f"{report_schema_text}"
    )
