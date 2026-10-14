import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { CategoryBadge, Panel, PageHeader, ResponsibleNotice, StatCard, CATEGORY_COLOR } from "@/components/common";
import { CATEGORY_ORDER, DEFAULT_THRESHOLDS } from "@/lib/analysis";
import { actions as store, useAnalyses, useAppState } from "@/lib/store";
import type { Category, Thresholds } from "@/lib/types";

export const Route = createFileRoute("/analysis")({
  head: () => ({
    meta: [
      { title: "AI Analysis — EduSupport AI" },
      { name: "description", content: "Run and configure the transparent rule-based support-review analysis." },
      { property: "og:title", content: "AI Analysis — EduSupport AI" },
      { property: "og:description", content: "Configurable, explainable support-review analysis of anonymised records." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalysisPage,
});

const FIELDS: { key: keyof Thresholds; label: string; min: number; max: number; help: string }[] = [
  { key: "attendanceConcern", label: "Attendance concern below (%)", min: 60, max: 100, help: "+1 point" },
  { key: "attendanceStrong", label: "Attendance strong concern below (%)", min: 50, max: 95, help: "+2 points" },
  { key: "completionConcern", label: "Completion concern below (%)", min: 50, max: 100, help: "+1 point" },
  { key: "completionStrong", label: "Completion strong concern below (%)", min: 30, max: 90, help: "+2 points" },
  { key: "declinePoints", label: "Decline of at least (points)", min: 2, max: 25, help: "+2 points" },
  { key: "lowAverage", label: "Current average reference (%)", min: 30, max: 70, help: "+1 point" },
  { key: "improvePoints", label: "Improving if average rises by (points)", min: 1, max: 20, help: "Positive signal" },
  { key: "reviewScore", label: "'Review suggested' at score", min: 1, max: 6, help: "Category boundary" },
  { key: "priorityScore", label: "'Priority review' at score", min: 2, max: 9, help: "Category boundary" },
];

function AnalysisPage() {
  const state = useAppState();
  const { analyses } = useAnalyses();
  const [draft, setDraft] = useState<Thresholds>(state.thresholds);
  const [filter, setFilter] = useState<Category | "all">("Priority review");
  const [running, setRunning] = useState(false);

  const run = () => {
    if (draft.reviewScore >= draft.priorityScore) return toast.error("'Review suggested' score must be lower than 'Priority review' score.");
    setRunning(true);
    setTimeout(() => {
      store.setThresholds(draft);
      setRunning(false);
      toast.success(`Analysed ${state.students.length} records`);
    }, 400);
  };

  const list = analyses.filter((a) => filter === "all" || a.category === filter).sort((a, b) => b.score - a.score);

  return (
    <>
      <PageHeader
        title="AI analysis engine"
        description="A transparent, points-based demonstration method. Each indicator outside a configurable reference range adds points; categories follow the total. This is not a trained or validated machine-learning model."
        actions={
          <>
            <Button variant="outline" onClick={() => setDraft(DEFAULT_THRESHOLDS)}><RotateCcw className="h-4 w-4" />Default settings</Button>
            <Button onClick={run} disabled={running}><Play className="h-4 w-4" />{running ? "Analysing…" : "Run analysis"}</Button>
          </>
        }
      />
      <ResponsibleNotice className="mb-4" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {CATEGORY_ORDER.map((c) => (
          <button key={c} onClick={() => setFilter(c)} className="text-left">
            <StatCard label={c} value={analyses.filter((a) => a.category === c).length} accent={CATEGORY_COLOR[c]} hint={filter === c ? "Showing below" : "Click to filter"} />
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Last analysed: {state.analysedAt ? new Date(state.analysedAt).toLocaleString("en-GB") : "on load (default settings)"}</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Panel title="Rule settings" description="Adjust, then run the analysis again." className="lg:col-span-2">
          <div className="space-y-5">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <div className="mb-2 flex justify-between text-sm"><span>{f.label}</span><span className="font-semibold">{draft[f.key]}</span></div>
                <Slider min={f.min} max={f.max} step={1} value={[draft[f.key]]} onValueChange={([v]) => setDraft({ ...draft, [f.key]: v })} aria-label={f.label} />
                <p className="mt-1 text-xs text-muted-foreground">{f.help}</p>
              </div>
            ))}
            <p className="rounded bg-muted p-3 text-xs text-muted-foreground">
              Low engagement adds +1 point. Text explanations and recommendations are generated deterministically from templates in the browser; no external AI service is called, and no data leaves this device.
            </p>
          </div>
        </Panel>
        <Panel title={`Findings: ${filter === "all" ? "all records" : filter}`} className="lg:col-span-3" right={<Button size="sm" variant="ghost" onClick={() => setFilter("all")}>Show all</Button>}>
          <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
            {list.length === 0 && <p className="text-sm text-muted-foreground">No records in this category.</p>}
            {list.map((a) => (
              <Link key={a.studentId} to="/students/$id" params={{ id: a.studentId }} className="block rounded-md border p-3 hover:bg-muted">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{a.studentId}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">Score {a.score} · Uncertainty {a.uncertainty} <CategoryBadge category={a.category} /></span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.factors.map((f) => f.label).join(" · ") || "No indicators outside reference ranges"}</p>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
