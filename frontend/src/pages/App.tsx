import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { 
  CircleAlert, 
  FileText, 
  Scale, 
  Sparkles, 
  Upload, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  File, 
  Activity,
  ArrowRight,
  Info,
  Zap,
  Shield,
  Brain
} from "lucide-react";

import { ProgressPipeline } from "../components/ProgressPipeline";
import { ReportView } from "../components/ReportView";
import { analyzeCase, downloadReportPdf, extractApiError, generateFollowups, getApiHealth } from "../services/api";
import type { AnalyzeResponse, ApiHealthResponse } from "../types";

type FormValues = {
  incidentDescription: string;
};

const loadingMessages = [
  "Structuring incident fact tree...",
  "Running vector search across uploaded evidence...",
  "Aligning incident chronologies...",
  "Generating targeted follow-up queries...",
  "Synthesizing legal case vectors...",
  "Drafting executive summary and risk ratings..."
];

export function App() {
  const { register, handleSubmit, formState } = useForm<FormValues>({
    defaultValues: { incidentDescription: "" }
  });

  const [files, setFiles] = useState<File[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("");
  const [incidentDescription, setIncidentDescription] = useState("");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState("");
  const [health, setHealth] = useState<ApiHealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"description" | "questions" | "report">("description");
  const [isHealthDropdownOpen, setIsHealthDropdownOpen] = useState(false);

  // Poll system health
  useEffect(() => {
    let active = true;
    const pullHealth = async () => {
      try {
        const next = await getApiHealth();
        if (!active) return;
        setHealth(next);
        setHealthError(null);
      } catch (err) {
        if (!active) return;
        setHealth(null);
        setHealthError(extractApiError(err, "Backend server unreachable"));
      }
    };

    pullHealth();
    const timer = setInterval(pullHealth, 8000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  // Map active workflow step
  const activeStage = useMemo(() => {
    if (phase === "description" && !loading) return 0;
    if (phase === "questions" && !loading) return 2;
    if (loading && phase === "description") return 2;
    if (loading && phase === "questions") return 4;
    return 5;
  }, [loading, phase]);

  // Loading label cycle animation
  useEffect(() => {
    if (!loading) return;
    let idx = 0;
    setLoadingLabel(loadingMessages[idx]);
    const timer = setInterval(() => {
      idx = (idx + 1) % loadingMessages.length;
      setLoadingLabel(loadingMessages[idx]);
    }, 1500);
    return () => clearInterval(timer);
  }, [loading]);

  // Sync typed text when jumping questions
  useEffect(() => {
    if (questions.length > 0 && questions[questionIndex]) {
      setCurrentAnswer(answers[questions[questionIndex]] || "");
    }
  }, [questionIndex, questions]);

  // File management
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []);
    setFiles((prev) => [...prev, ...nextFiles]);
  };

  const removeFile = (idxToRemove: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  // Step 1: Submit description
  async function onStart(values: FormValues) {
    setError("");
    setLoading(true);
    setIncidentDescription(values.incidentDescription);
    try {
      const responseQuestions = await generateFollowups(values.incidentDescription, files);
      setQuestions(responseQuestions);
      setQuestionIndex(0);
      setAnswers({});
      setCurrentAnswer("");
      setPhase("questions");
    } catch (err) {
      setError(
        extractApiError(
          err,
          "LLM service connection failed. Please ensure the backend is running and your API credentials are set."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  // Interactive Q&A Navigation
  const jumpToQuestion = (targetIndex: number) => {
    const activeQuestion = questions[questionIndex];
    if (activeQuestion) {
      setAnswers((prev) => {
        const next = { ...prev };
        if (currentAnswer.trim()) {
          next[activeQuestion] = currentAnswer.trim();
        } else {
          delete next[activeQuestion];
        }
        return next;
      });
    }
    setQuestionIndex(targetIndex);
  };

  const handleNext = () => {
    const activeQuestion = questions[questionIndex];
    if (activeQuestion) {
      setAnswers((prev) => {
        const next = { ...prev };
        if (currentAnswer.trim()) {
          next[activeQuestion] = currentAnswer.trim();
        } else {
          delete next[activeQuestion];
        }
        return next;
      });
    }
    if (questionIndex < questions.length - 1) {
      setQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    const activeQuestion = questions[questionIndex];
    if (activeQuestion) {
      setAnswers((prev) => {
        const next = { ...prev };
        if (currentAnswer.trim()) {
          next[activeQuestion] = currentAnswer.trim();
        } else {
          delete next[activeQuestion];
        }
        return next;
      });
    }
    if (questionIndex > 0) {
      setQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    const activeQuestion = questions[questionIndex];
    if (activeQuestion) {
      setAnswers((prev) => {
        const next = { ...prev };
        delete next[activeQuestion];
        return next;
      });
    }
    setCurrentAnswer("");
    if (questionIndex < questions.length - 1) {
      setQuestionIndex((prev) => prev + 1);
    }
  };

  // Submit all answers & trigger report analysis
  async function onSubmitReport() {
    const activeQuestion = questions[questionIndex];
    const finalAnswers = { ...answers };
    if (activeQuestion) {
      if (currentAnswer.trim()) {
        finalAnswers[activeQuestion] = currentAnswer.trim();
      } else {
        delete finalAnswers[activeQuestion];
      }
      setAnswers(finalAnswers);
    }

    setLoading(true);
    setError("");
    try {
      const response = await analyzeCase(incidentDescription, files, finalAnswers);
      setResult(response);
      setPhase("report");
    } catch (err) {
      setError(extractApiError(err, "Failed to analyze legal case. Please check credentials and try again."));
    } finally {
      setLoading(false);
    }
  }

  // Reset helper
  const handleReset = () => {
    setResult(null);
    setPhase("description");
    setIncidentDescription("");
    setAnswers({});
    setQuestions([]);
    setQuestionIndex(0);
    setFiles([]);
    setError("");
  };

  async function onDownloadPdf() {
    if (!result) return;
    const blob = await downloadReportPdf(result.report);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "casepilot-report.pdf";
    link.click();
    URL.revokeObjectURL(url);
  }

  const answeredCount = useMemo(() => {
    return Object.keys(answers).filter(q => answers[q] && answers[q].trim()).length;
  }, [answers]);

  const questionsProgressPercent = useMemo(() => {
    if (questions.length === 0) return 0;
    return Math.round((answeredCount / questions.length) * 100);
  }, [answeredCount, questions]);

  return (
    <div className="relative min-h-screen bg-[#0a0f1e] overflow-hidden">
      {/* Ambient Background Orbs */}
      <div className="ambient-orb" style={{ width: 500, height: 500, top: '-10%', right: '-5%', background: 'rgba(56, 189, 248, 0.08)' }} />
      <div className="ambient-orb" style={{ width: 400, height: 400, bottom: '5%', left: '-8%', background: 'rgba(168, 85, 247, 0.06)', animationDelay: '5s' }} />
      <div className="ambient-orb" style={{ width: 300, height: 300, top: '40%', right: '30%', background: 'rgba(236, 72, 153, 0.04)', animationDelay: '10s' }} />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8">
        
        {/* ──── Navbar ──── */}
        <header className="mb-8 flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-2xl p-5 shadow-lg shadow-black/20">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 shadow-lg shadow-cyan-500/20">
              <Scale className="h-5.5 w-5.5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">CasePilot</h1>
                <span className="text-shine text-lg font-bold">AI</span>
              </div>
              <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500">Legal Investigation Co-Counsel</p>
            </div>
          </div>

          {/* Health Pill Badge */}
          <div className="relative">
            <button
              onClick={() => setIsHealthDropdownOpen(!isHealthDropdownOpen)}
              className="flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs text-slate-300 hover:bg-white/[0.08] transition-all duration-300 backdrop-blur-xl"
            >
              <span className="relative flex h-2 w-2">
                {health?.llm_connected ? (
                  <>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
                  </>
                ) : (
                  <>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-60"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400"></span>
                  </>
                )}
              </span>
              <span className="font-medium">{health?.model_name || health?.model || "Checking..."}</span>
              <Activity className="h-3.5 w-3.5 text-slate-500" />
            </button>

            {/* Health Info Dropdown overlay */}
            {isHealthDropdownOpen && (
              <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-white/[0.08] bg-[#111827]/95 backdrop-blur-2xl p-5 shadow-2xl shadow-black/40 z-50">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-3">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">System Diagnostics</span>
                  <button onClick={() => setIsHealthDropdownOpen(false)} className="text-slate-500 hover:text-white transition">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Backend API</span>
                    <span className="font-semibold text-emerald-400 flex items-center gap-1.5"><Zap className="h-3 w-3" /> Online</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">LLM Provider</span>
                    <span className="font-semibold text-cyan-300 capitalize">{health?.llm || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Model</span>
                    <span className="font-semibold text-white truncate max-w-[160px]">{health?.model_name || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Endpoint</span>
                    <span className="font-mono text-[10px] text-slate-400 truncate max-w-[160px]" title={health?.endpoint}>{health?.endpoint || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Latency</span>
                    <span className="font-semibold text-white">{health?.latency_ms ? `${health.latency_ms}ms` : "—"}</span>
                  </div>
                  {healthError && (
                    <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-[11px] text-rose-300 mt-2">
                      <strong>Error:</strong> {healthError}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <section className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/[0.08] backdrop-blur-xl p-4 shadow-lg shadow-rose-500/5">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-rose-300">Processing Interruption</h4>
                <p className="text-xs text-rose-200/80 leading-relaxed">{error}</p>
              </div>
              <button onClick={() => setError("")} className="ml-auto text-rose-400/60 hover:text-rose-300 transition">
                <X className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr,300px]">
          
          {/* Main workspace */}
          <main className="space-y-6">
            
            {/* ──── Step 1: Input ──── */}
            {phase === "description" && (
              <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-2xl p-7 shadow-lg shadow-black/20 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-cyan-400" />
                    <h2 className="text-lg font-bold tracking-tight text-white">Initiate Case Investigation</h2>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">Describe the legal grievance or incident and upload backing evidence files to generate AI-powered analysis questions.</p>
                </div>

                <form onSubmit={handleSubmit(onStart)} className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">Incident Description</label>
                    <textarea
                      {...register("incidentDescription", { required: true, minLength: 20 })}
                      rows={6}
                      placeholder="Describe the transaction, dispute, date of occurrence, parties involved, and timeline of the incident in detail..."
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/10 focus:bg-white/[0.05] transition-all duration-300 resize-y"
                    />
                    {formState.errors.incidentDescription && (
                      <p className="text-[11px] font-medium text-rose-400">Please describe the incident in at least 20 characters.</p>
                    )}
                  </div>

                  {/* Dropzone File Upload */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">Evidence Documentation</label>
                    <div className="group relative flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] p-8 text-center hover:bg-white/[0.04] hover:border-cyan-500/30 transition-all duration-300 cursor-pointer">
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="rounded-xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-white/[0.06] p-3 text-cyan-400 group-hover:text-cyan-300 transition-colors">
                        <Upload className="h-6 w-6" />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-300">Click or Drag & Drop Documents</p>
                      <p className="text-xs text-slate-600 mt-1">Accepts PDF, JPG, PNG, JPEG</p>
                    </div>

                    {/* Selected Files */}
                    {files.length > 0 && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {files.map((file, idx) => (
                          <div key={`${file.name}-${idx}`} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-xs">
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="h-4 w-4 text-cyan-400 shrink-0" />
                              <span className="truncate text-slate-300">{file.name}</span>
                              <span className="text-[10px] text-slate-600 font-medium shrink-0">
                                ({(file.size / 1024).toFixed(0)} KB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(idx)}
                              className="rounded p-1 text-slate-600 hover:bg-white/[0.06] hover:text-rose-400 transition"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 transition-all duration-300 active:scale-[0.97]"
                    >
                      Start Investigation
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* ──── Step 2: Q&A ──── */}
            {phase === "questions" && (
              <section className="space-y-5">
                
                {/* Progress Bar */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5 shadow-lg shadow-black/10">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-3">
                    <span className="text-slate-500">Follow-up Questionnaire</span>
                    <span className="text-cyan-400">{questionsProgressPercent}% Complete ({answeredCount}/{questions.length})</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-700 ease-out shadow-sm shadow-cyan-400/30" 
                      style={{ width: `${questionsProgressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Split panel workspace */}
                <div className="grid gap-5 lg:grid-cols-[240px,1fr]">
                  
                  {/* Question Nav */}
                  <div className="space-y-1.5 lg:max-h-[440px] overflow-y-auto pr-1">
                    {questions.map((q, idx) => {
                      const isActive = idx === questionIndex;
                      const hasAnswer = answers[q] && answers[q].trim().length > 0;
                      return (
                        <button
                          key={idx}
                          onClick={() => jumpToQuestion(idx)}
                          className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 outline-none ${
                            isActive
                              ? "border-cyan-500/30 bg-cyan-500/[0.08] text-cyan-300 font-semibold shadow-sm shadow-cyan-500/5"
                              : hasAnswer
                                ? "border-white/[0.06] bg-white/[0.03] text-slate-400 hover:bg-white/[0.05]"
                                : "border-white/[0.04] bg-transparent text-slate-600 hover:bg-white/[0.03]"
                          }`}
                        >
                          <span className="shrink-0">
                            {hasAnswer ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            ) : isActive ? (
                              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-cyan-400 bg-cyan-400/10">
                                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                              </span>
                            ) : (
                              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-700 text-[10px] font-bold text-slate-600">
                                {idx + 1}
                              </span>
                            )}
                          </span>
                          <span className="truncate text-xs">
                            Question {idx + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Question Panel */}
                  <div className="flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-6 shadow-lg shadow-black/10 min-h-[320px]">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                        <span className="text-[10px] uppercase font-extrabold tracking-[0.15em] text-cyan-400">
                          Question {questionIndex + 1} of {questions.length}
                        </span>
                        
                        {/* Draft status */}
                        {answers[questions[questionIndex]] === currentAnswer.trim() ? (
                          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Saved
                          </span>
                        ) : currentAnswer.trim() ? (
                          <span className="text-[10px] text-amber-400 font-semibold animate-pulse">
                            Editing...
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-600">
                            Unanswered
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-base font-bold text-white leading-relaxed">
                        {questions[questionIndex]}
                      </h3>

                      <textarea
                        value={currentAnswer}
                        onChange={(e) => setCurrentAnswer(e.target.value)}
                        rows={6}
                        placeholder="Type your detailed response here..."
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/10 transition-all duration-300"
                      />
                    </div>

                    {/* Actions */}
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
                      <div className="flex gap-2">
                        <button
                          onClick={handlePrev}
                          disabled={questionIndex === 0}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-slate-400 hover:bg-white/[0.06] hover:text-white disabled:opacity-25 transition"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Back
                        </button>
                        <button
                          onClick={handleSkip}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 transition"
                        >
                          Skip
                        </button>
                      </div>

                      <div className="flex gap-2">
                        {questionIndex < questions.length - 1 ? (
                          <button
                            onClick={handleNext}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] px-4 py-2 text-xs font-bold text-white transition"
                          >
                            Save & Next
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={onSubmitReport}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 active:scale-95 transition-all"
                          >
                            Submit Questionnaire
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Early submit button */}
                {questions.length > 0 && answeredCount > 0 && (
                  <div className="flex justify-end">
                    <button
                      onClick={onSubmitReport}
                      disabled={loading}
                      className="inline-flex items-center gap-2 rounded-lg bg-purple-500/10 border border-purple-500/20 px-4 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/15 transition"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                      Generate Report with {answeredCount} Answers
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* ──── Loading Spinner ──── */}
            {loading && (
              <section className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] backdrop-blur-xl p-10 flex flex-col items-center justify-center space-y-5 shadow-lg shadow-cyan-500/5">
                <div className="relative flex items-center justify-center">
                  <div className="h-14 w-14 rounded-full border-[3px] border-cyan-500/20 border-t-cyan-400 animate-spin" />
                  <Sparkles className="absolute h-5 w-5 text-cyan-400 animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm font-semibold text-cyan-300 animate-pulse">{loadingLabel}</p>
                  <p className="text-xs text-slate-500">Generating contextual legal assessments. Please do not close this window.</p>
                </div>
              </section>
            )}

            {/* ──── Step 3: Report ──── */}
            {result && !loading && (
              <ReportView 
                report={result.report} 
                onDownloadPdf={onDownloadPdf} 
                onStartNew={handleReset} 
              />
            )}
          </main>

          {/* ──── Right Sidebar ──── */}
          <aside className="space-y-5">
            <ProgressPipeline activeStage={activeStage} loading={loading} />
            
            {/* Guidelines Panel */}
            <section className="rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5 shadow-lg shadow-black/10 space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Investigation Guidelines</h3>
              </div>
              <div className="text-xs text-slate-500 space-y-3 leading-relaxed">
                <p>
                  <strong className="text-slate-300 font-semibold block mb-0.5">1. Structured Fact-Finding</strong>
                  Provide specific dates, financial amounts, and communication channels when answering.
                </p>
                <p>
                  <strong className="text-slate-300 font-semibold block mb-0.5">2. Evidence Verification</strong>
                  Verify metadata and cross-referenced claims in uploaded documents vs. statements.
                </p>
                <p>
                  <strong className="text-slate-300 font-semibold block mb-0.5">3. Informational Gaps</strong>
                  Address all generated questions. The system highlights missing information in the final report.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}


