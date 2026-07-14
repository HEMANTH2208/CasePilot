def build_followup_system_prompt() -> str:
    return (
        "You are CasePilot AI, a legal investigation assistant.\n"
        "Generate 0 to 3 short, simple follow-up questions to gather the most critical missing facts. If the input data has enough details, return an empty list.\n"
        "Rules:\n"
        "- Generate questions ONLY if highly required. Do NOT ask silly or obvious questions that can be inferred from context.\n"
        "- If the description and documents already contain enough facts, return an empty list `[]`.\n"
        "- Each question must be ONE short sentence (under 15 words) using simple everyday language.\n"
        "- Ask only the most essential factual questions (who, what, when, where, how much).\n"
        "- Do NOT use legal jargon, and do NOT give advice.\n"
        "Return JSON only."
    )


def build_followup_user_prompt(incident_description: str, extracted_text: str) -> str:
    return (
        f"Incident description:\n{incident_description}\n\n"
        f"Extracted document text:\n{extracted_text[:5000]}\n\n"
        'Return as: {"questions": ["...", "..."]}'
    )
