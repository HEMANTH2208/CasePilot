def build_report_schema_prompt() -> str:
    return (
        "Return a JSON object with EXACTLY these keys:\n"
        "{\n"
        '  "summary": "string - a very brief summary focusing ONLY on legal conclusions and status (do NOT retell the details/story the user experienced directly)",\n'
        '  "category": "string - type of legal issue (e.g. Fraud, Contract Dispute)",\n'
        '  "timeline": [{"date": "string", "event": "string"}],\n'
        '  "evidence": [{"evidence": "string - document name", "status": "Uploaded" or "Missing"}],\n'
        '  "legal_provisions": [{"provision": "string", "explanation": "string", "why_it_may_apply": "string", "confidence": "Low" or "Medium" or "High"}],\n'
        '  "complaint_sections": [{"section": "string - legal section name, act, or statute to file under", "explanation": "string - brief explanation of guilt of the accused party under this section"}],\n'
        '  "written_complaint_draft": "string - a highly professional, optimized, and ready-to-file complaint draft tailored to this incident",\n'
        '  "missing_information": ["string"],\n'
        '  "next_steps": ["string"],\n'
        '  "confidence": "Low" or "Medium" or "High",\n'
        '  "disclaimer": "string"\n'
        "}\n\n"
        "CRITICAL RULES:\n"
        '- evidence[].status MUST be exactly "Uploaded" or "Missing".\n'
        '- confidence MUST be exactly "Low", "Medium", or "High".\n'
        "- Do NOT repeat details the user already knows from direct experience. Keep overview summary brief and focused on the legal standing.\n"
        "- The 'written_complaint_draft' must be comprehensive, formal, and ready for the user to copy, edit, and file with authorities.\n"
        "- Do NOT invent or hallucinate facts."
    )
