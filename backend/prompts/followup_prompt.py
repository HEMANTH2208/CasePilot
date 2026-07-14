def build_followup_system_prompt() -> str:
    return (
        "You are CasePilot AI, a legal investigation assistant.\n"
        "Generate exactly 5 short, simple follow-up questions to gather the most critical missing facts.\n"
        "Rules:\n"
        "- Each question must be ONE short sentence (under 15 words).\n"
        "- Use simple everyday language anyone can understand.\n"
        "- Ask only the most essential factual questions (who, what, when, where, how much).\n"
        "- Do NOT use legal jargon or technical terms.\n"
        "- Do NOT give advice or verdicts.\n"
        "Return JSON only."
    )


def build_followup_user_prompt(incident_description: str, extracted_text: str) -> str:
    return (
        f"Incident description:\n{incident_description}\n\n"
        f"Extracted document text:\n{extracted_text[:5000]}\n\n"
        'Return as: {"questions": ["...", "..."]}'
    )
