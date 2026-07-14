import axios from "axios";
import type { AnalyzeResponse, ApiHealthResponse, InvestigationReport } from "../types";

const rawUrl = import.meta.env.VITE_API_URL ?? "http://localhost:5001/api";
const cleanUrl = rawUrl.endsWith("/api") ? rawUrl : `${rawUrl.replace(/\/$/, "")}/api`;

const api = axios.create({
  baseURL: cleanUrl,
  timeout: 120000
});

export function extractApiError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data;
    const err = typeof payload?.error === "string" ? payload.error : "";
    const details =
      typeof payload?.details === "string"
        ? payload.details
        : Array.isArray(payload?.details)
          ? payload.details.join(" ")
          : "";
    if (err) {
      return details ? `${err} ${details}` : err;
    }

    const detail = error.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    if (error.code === "ECONNABORTED") {
      return "Request timed out while contacting backend.";
    }
  }
  return fallback;
}

export async function getApiHealth(): Promise<ApiHealthResponse> {
  const response = await api.get("/health");
  const payload = response.data ?? {};

  const backendStatus = String(payload.backend_status ?? payload.backend ?? "Unknown");
  const llmConnected = Boolean(payload.llm_connected ?? payload.llm === "connected");
  const modelName = String(payload.model_name ?? payload.model ?? "unknown");
  const endpoint = String(payload.endpoint ?? "unknown");
  const latencyMs =
    typeof payload.latency_ms === "number" ? payload.latency_ms : payload.latency_ms === null ? null : null;
  const reason = typeof payload.reason === "string" ? payload.reason : null;

  return {
    status: String(payload.status ?? "online"),
    backend:
      typeof payload.backend === "string"
        ? payload.backend
        : backendStatus.toLowerCase().includes("running")
          ? "running"
          : "offline",
    llm: typeof payload.llm === "string" ? payload.llm : llmConnected ? "connected" : "offline",
    model: String(payload.model ?? modelName),
    backend_status: backendStatus,
    llm_connected: llmConnected,
    model_name: modelName,
    endpoint,
    latency_ms: latencyMs,
    reason,
    ready: Boolean(payload.ready ?? llmConnected)
  };
}

export async function generateFollowups(incidentDescription: string, files: File[]): Promise<string[]> {
  const form = new FormData();
  form.append("incident_description", incidentDescription);
  files.forEach((file) => form.append("files", file));
  const response = await api.post<{ questions: string[] }>("/followup", form);
  return response.data.questions;
}

export async function analyzeCase(
  incidentDescription: string,
  files: File[],
  answers: Record<string, string>
): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.append("incident_description", incidentDescription);
  form.append("answers_json", JSON.stringify(answers));
  files.forEach((file) => form.append("files", file));
  const response = await api.post<AnalyzeResponse>("/analyze", form);
  return response.data;
}

export async function downloadReportPdf(report: InvestigationReport): Promise<Blob> {
  const response = await api.post("/report/pdf", report, {
    responseType: "blob"
  });
  return response.data as Blob;
}
