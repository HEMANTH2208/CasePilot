import { CheckCircle2, Circle, LoaderCircle } from "lucide-react";

const stages = [
  "Understanding Incident",
  "Reading Documents",
  "Preparing Questions",
  "Legal Analysis",
  "Report Generation"
];

type Props = {
  activeStage: number;
  loading: boolean;
};

export function ProgressPipeline({ activeStage, loading }: Props) {
  return (
    <section className="rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5 shadow-lg shadow-black/10">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Investigation Workflow</h2>
      <div className="mt-4 space-y-2">
        {stages.map((stage, index) => {
          const done = index < activeStage;
          const current = index === activeStage;
          return (
            <article
              key={stage}
              className={`flex items-center gap-3 rounded-xl border p-3 transition-all duration-500 ${
                done
                  ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400"
                  : current
                    ? "border-cyan-500/20 bg-cyan-500/[0.06] text-cyan-300 shadow-sm shadow-cyan-500/5 animate-pulse-glow"
                    : "border-white/[0.04] bg-transparent text-slate-600"
              }`}
            >
              {done ? (
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-400" />
              ) : current && loading ? (
                <LoaderCircle className="h-4.5 w-4.5 shrink-0 animate-spin text-cyan-400" />
              ) : (
                <Circle className="h-4.5 w-4.5 shrink-0 text-slate-700" />
              )}
              <div className="flex flex-col">
                <span className={`text-xs font-semibold ${done ? "text-emerald-300" : current ? "text-white" : "text-slate-600"}`}>
                  {stage}
                </span>
                {current && loading && (
                  <span className="text-[10px] text-cyan-400 animate-pulse mt-0.5">Processing...</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
