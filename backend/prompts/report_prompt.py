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
        "- Do NOT repeat details the user already knows in the 'summary'. Keep summary brief and focused on the legal standing.\n"
        "- The 'written_complaint_draft' MUST be a highly detailed, formal, and comprehensive legal complaint. Follow this exact structure:\n"
        "  1. HEADER: Date, Place, and formal Addressee block (e.g., 'TO, THE COMPETENT AUTHORITY / STATION HOUSE OFFICER...').\n"
        "  2. SUBJECT: A precise, formal subject line citing the specific acts and sections violated (e.g., 'SUBJECT: Formal Complaint for Fraud and Breach of Contract under Section...').\n"
        "  3. PARTIES: Clear placeholders/details for Complainant and Accused (Guilty Party) name, contact, and address.\n"
        "  4. STATEMENT OF FACTS: A chronological, professional description of the incident, contract breach, or fraud. Use legal vocabulary (e.g., 'deceptive intent', 'willful negligence', 'breach of terms').\n"
        "  5. SPECIFIC CHARGES & SECTIONS: List each section/statute violated by the Accused and explain how the facts establish their violation.\n"
        "  6. EVIDENCE RECONCILIATION: Reference specific uploaded files as exhibits/evidence of the violation.\n"
        "  7. PRAYER FOR RELIEF: A formal closing prayer requesting immediate investigation, registration of complaint, and recovery of damages.\n"
        "  8. SIGNATURE: Complainant signature block.\n"
        "- Do NOT make the draft short or generic. Ensure it uses rigorous legal phraseology and is completely ready to file.\n"
        "- Do NOT invent or hallucinate facts."
    )
