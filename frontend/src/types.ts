export type TimelineItem = {
  date: string;
  event: string;
};

export type EvidenceItem = {
  evidence: string;
  status: "Uploaded" | "Missing";
};

export type LegalProvision = {
  provision: string;
  explanation: string;
  why_it_may_apply: string;
  confidence: "Low" | "Medium" | "High";
};

export type ComplaintSection = {
  section: string;
  explanation: string;
};

export type InvestigationReport = {
  summary: string;
  category: string;
  timeline: TimelineItem[];
  evidence: EvidenceItem[];
  legal_provisions: LegalProvision[];
  complaint_sections: ComplaintSection[];
  written_complaint_draft: string;
  missing_information: string[];
  next_steps: string[];
  confidence: "Low" | "Medium" | "High";
  disclaimer: string;
};

export type ExtractionEntitySet = {
  names: string[];
  dates: string[];
  money: string[];
  addresses: string[];
};

export type AnalyzeResponse = {
  extraction: {
    files: string[];
    combined_text: string;
    extracted_entities: ExtractionEntitySet;
    evidence: EvidenceItem[];
  };
  report: InvestigationReport;
};

export type ApiHealthResponse = {
  status: string;
  backend: string;
  llm: string;
  model: string;
  backend_status: string;
  llm_connected: boolean;
  model_name: string;
  endpoint: string;
  latency_ms: number | null;
  reason: string | null;
  ready: boolean;
};
