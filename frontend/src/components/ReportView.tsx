import { ReactNode, useState } from "react";
import { 
  AlertTriangle, 
  FileSearch, 
  FolderCheck, 
  Gavel, 
  ListChecks, 
  Rocket, 
  ShieldCheck, 
  Timer,
  RefreshCw,
  Download,
  Calendar,
  Layers,
  ArrowRight,
  Copy,
  Check,
  FileText
} from "lucide-react";
import type { InvestigationReport } from "../types";

type Props = {
  report: InvestigationReport;
  onDownloadPdf: () => void;
  onStartNew?: () => void;
};

export function ReportView({ report, onDownloadPdf, onStartNew }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "complaint" | "timeline" | "steps">("overview");
  const [copied, setCopied] = useState(false);

  const handleCopyDraft = async () => {
    if (!report.written_complaint_draft) return;
    try {
      await navigator.clipboard.writeText(report.written_complaint_draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Panel */}
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-2xl p-6 shadow-lg shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-300 border border-cyan-500/20">
                AI Legal Report
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Investigation Report</h2>
            <p className="text-xs text-slate-500">Automated Legal Assessment & Evidence Reconciliation</p>
          </div>
          <div className="flex items-center gap-2">
            {onStartNew && (
              <button
                onClick={onStartNew}
                className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                <RefreshCw className="h-4 w-4" />
                New Case
              </button>
            )}
            <button
              onClick={onDownloadPdf}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:shadow-cyan-500/30 active:scale-95"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="mt-8 flex border-b border-white/[0.06] overflow-x-auto pb-px scrollbar-none">
          <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")} icon={<FileSearch className="h-4 w-4" />} label="Overview" />
          <TabButton active={activeTab === "complaint"} onClick={() => setActiveTab("complaint")} icon={<Gavel className="h-4 w-4" />} label="File a Complaint" />
          <TabButton active={activeTab === "timeline"} onClick={() => setActiveTab("timeline")} icon={<Timer className="h-4 w-4" />} label="Timeline & Evidence" />
          <TabButton active={activeTab === "steps"} onClick={() => setActiveTab("steps")} icon={<ListChecks className="h-4 w-4" />} label="Gaps & Next Steps" />
        </div>
      </section>

      {/* Tab Panels */}
      <main className="space-y-5">
        {activeTab === "overview" && (
          <div className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-[1fr,300px]">
              <Card title="Legal Assessment Overview" icon={<FileSearch className="h-5 w-5 text-cyan-400" />}>
                <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-line">
                  {report.summary}
                </p>
              </Card>
              
              <div className="space-y-5">
                <ConfidenceGauge level={report.confidence} />
                
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 space-y-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-600 block mb-1.5">
                      Report Classification
                    </span>
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {report.category}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-600 block mb-1.5">
                      Evidence Reconciled
                    </span>
                    <span className="text-lg font-bold text-white">
                      {report.evidence.length} File{report.evidence.length !== 1 ? "s" : ""} Checked
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Card title="Legal Disclaimer" icon={<AlertTriangle className="h-5 w-5 text-amber-400" />}>
              <div className="rounded-lg border border-amber-500/15 bg-amber-500/[0.06] p-4 text-xs leading-relaxed text-amber-200/80">
                {report.disclaimer}
              </div>
            </Card>
          </div>
        )}

        {activeTab === "complaint" && (
          <div className="grid gap-5">
            {/* Filing Sections */}
            <Card title="Sections to File Complaint Under" icon={<Gavel className="h-5 w-5 text-cyan-400" />}>
              <p className="text-xs text-slate-500 mb-4">
                You can file a formal complaint against the guilty party under these specific acts, sections, or statutes:
              </p>
              {report.complaint_sections && report.complaint_sections.length > 0 ? (
                <div className="grid gap-4">
                  {report.complaint_sections.map((item, idx) => (
                    <div key={`${item.section}-${idx}`} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
                      <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                        <Layers className="h-4 w-4 text-cyan-400" />
                        {item.section}
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed pl-6">
                        {item.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-600 border border-dashed border-white/[0.06] rounded-lg">
                  <p className="text-sm">No specific filing sections identified.</p>
                </div>
              )}
            </Card>

            {/* Professionally Written Complaint Draft */}
            <section className="rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-6 shadow-lg shadow-black/10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-cyan-400" />
                  <h3 className="text-base font-bold text-white tracking-tight">Written Complaint Content</h3>
                </div>
                {report.written_complaint_draft && (
                  <button
                    onClick={handleCopyDraft}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy Draft
                      </>
                    )}
                  </button>
                )}
              </div>
              <div>
                {report.written_complaint_draft ? (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-5 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-all">
                    {report.written_complaint_draft}
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-600 border border-dashed border-white/[0.06] rounded-lg">
                    <p className="text-sm">No complaint draft generated for this case.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="grid gap-5 md:grid-cols-2">
            <Card title="Incident Timeline" icon={<Calendar className="h-5 w-5 text-cyan-400" />}>
              {report.timeline && report.timeline.length > 0 ? (
                <div className="relative border-l border-white/[0.08] pl-6 ml-3 space-y-6 py-2">
                  {report.timeline.map((item, idx) => (
                    <div key={`${item.date}-${idx}`} className="relative">
                      <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      </span>
                      <time className="text-xs font-bold tracking-wider uppercase text-cyan-400">
                        {item.date}
                      </time>
                      <p className="mt-1 text-sm font-medium text-slate-300">
                        {item.event}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-600 border border-dashed border-white/[0.06] rounded-lg">
                  <Timer className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No timeline events extracted.</p>
                </div>
              )}
            </Card>

            <Card title="Evidence Inventory" icon={<FolderCheck className="h-5 w-5 text-emerald-400" />}>
              {report.evidence && report.evidence.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-white/[0.06]">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06] bg-white/[0.02] text-slate-500 font-semibold">
                        <th className="px-4 py-3">Document</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {report.evidence.map((item, idx) => (
                        <tr key={`${item.evidence}-${idx}`} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3 font-medium text-slate-300 truncate max-w-[200px]">
                            {item.evidence}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                item.status === "Uploaded"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${item.status === "Uploaded" ? "bg-emerald-400" : "bg-amber-400"}`} />
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-600 border border-dashed border-white/[0.06] rounded-lg">
                  <FolderCheck className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No evidence files provided.</p>
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === "steps" && (
          <div className="grid gap-5 md:grid-cols-2">
            <Card title="Missing Information" icon={<ListChecks className="h-5 w-5 text-amber-400" />}>
              <p className="text-xs text-slate-500 mb-4">
                Facts or evidence currently unverified but crucial to establish or disprove liability.
              </p>
              {report.missing_information && report.missing_information.length > 0 ? (
                <ul className="space-y-2">
                  {report.missing_information.map((item, idx) => (
                    <li key={`${item}-${idx}`} className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5 text-sm text-slate-300">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                        !
                      </span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-10 text-slate-600 border border-dashed border-white/[0.06] rounded-lg">
                  <p className="text-sm">No missing information noted.</p>
                </div>
              )}
            </Card>

            <Card title="Recommendations" icon={<Rocket className="h-5 w-5 text-purple-400" />}>
              <p className="text-xs text-slate-500 mb-4">
                Actionable next steps to strengthen the investigation or resolve gaps.
              </p>
              {report.next_steps && report.next_steps.length > 0 ? (
                <ul className="space-y-2">
                  {report.next_steps.map((item, idx) => (
                    <li key={`${item}-${idx}`} className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5 text-sm text-slate-300 group hover:border-cyan-500/15 hover:bg-cyan-500/[0.03] transition">
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-10 text-slate-600 border border-dashed border-white/[0.06] rounded-lg">
                  <p className="text-sm">No recommendations generated.</p>
                </div>
              )}
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-5 py-4 text-sm font-semibold transition shrink-0 outline-none ${
        active
          ? "border-cyan-400 text-cyan-300 font-bold"
          : "border-transparent text-slate-500 hover:border-white/[0.08] hover:text-slate-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Card({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-6 shadow-lg shadow-black/10 space-y-4">
      <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
        {icon}
        <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
      </div>
      <div>{children}</div>
    </section>
  );
}

function ConfidenceGauge({ level }: { level: "Low" | "Medium" | "High" }) {
  const isHigh = level === "High";
  const isMed = level === "Medium";

  const strokeDashoffset = isHigh ? 17.6 : isMed ? 70.4 : 123.1;
  const color = isHigh ? "text-emerald-400" : isMed ? "text-amber-400" : "text-rose-400";
  const dropGlow = isHigh 
    ? "drop-shadow-[0_0_6px_rgba(52,211,153,0.3)]" 
    : isMed 
      ? "drop-shadow-[0_0_6px_rgba(251,191,36,0.3)]" 
      : "drop-shadow-[0_0_6px_rgba(251,113,133,0.3)]";
  const bgColor = isHigh 
    ? "bg-emerald-500/[0.08] border-emerald-500/20" 
    : isMed 
      ? "bg-amber-500/[0.08] border-amber-500/20" 
      : "bg-rose-500/[0.08] border-rose-500/20";
  const percentage = isHigh ? "90%" : isMed ? "60%" : "30%";

  return (
    <div className={`flex items-center gap-4 rounded-xl border p-4.5 ${bgColor}`}>
      <div className="relative flex items-center justify-center w-16 h-16 shrink-0">
        <svg className="w-full h-full transform -rotate-90">
          <circle 
            cx="32" 
            cy="32" 
            r="28" 
            className="stroke-white/[0.06]" 
            strokeWidth="3" 
            fill="none" 
          />
          <circle 
            cx="32" 
            cy="32" 
            r="28" 
            className={`stroke-current ${color} ${dropGlow} transition-all duration-1000`} 
            strokeWidth="3" 
            fill="none" 
            strokeDasharray="175.9" 
            strokeDashoffset={strokeDashoffset} 
            strokeLinecap="round" 
          />
        </svg>
        <span className="absolute text-xs font-bold text-white">{percentage}</span>
      </div>
      <div className="space-y-0.5">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Analysis Confidence
        </h4>
        <p className={`text-base font-extrabold tracking-tight ${color}`}>
          {level}
        </p>
      </div>
    </div>
  );
}
