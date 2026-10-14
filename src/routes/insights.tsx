import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryBadge, Panel, PageHeader, SourceTag, avg } from "@/components/common";
import { downloadFile, toCsv } from "@/lib/csv";
import { useAnalyses, useAppState } from "@/lib/store";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Insights and Reports — EduSupport AI" },
      { name: "description", content: "Patterns, data quality and an exportable insights report." },
      { property: "og:title", content: "Insights and Reports — EduSupport AI" },
      { property: "og:description", content: "Student support patterns and an exportable report." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InsightsPage,
});

function pearson(xs: number[], ys: number[]) {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); dx += (xs[i] - mx) ** 2; dy += (ys[i] - my) ** 2; }
  return dx && dy ? Math.round((num / Math.sqrt(dx * dy)) * 100) / 100 : null;
}
const strength = (r: number | null) => r == null ? "not computable" : Math.abs(r) < 0.2 ? "weak" : Math.abs(r) < 0.5 ? "moderate" : "strong";

function InsightsPage() {
  const state = useAppState();
  const { analyses, byId } = useAnalyses();
  const [cohort, setCohort] = useState("all");
  const cohorts = [...new Set(state.students.map((s) => s.cohort))].sort();
  const students = state.students.filter((s) => cohort === "all" || s.cohort === cohort);
  const list = students.map((s) => byId.get(s.id)!);
  const flagged = list.filter((a) => a.category === "Priority review" || a.category === "Review suggested");
  const improving = list.filter((a) => a.trend != null && a.trend >= state.thresholds.improvePoints).sort((a, b) => b.trend! - a.trend!);
  const needsHuman = list.filter((a) => a.uncertainty !== "Low" && a.category !== "No current concern");

  const stats = useMemo(() => {
    const pairs = (f: (s: (typeof students)[number]) => [number | null, number | null]) => {
      const p = students.map(f).filter((x): x is [number, number] => x[0] != null && x[1] != null);
      return pearson(p.map((x) => x[0]), p.map((x) => x[1]));
    };
    return {
      attComp: pairs((s) => [s.attendance, s.completion]),
      attTrend: pairs((s) => [s.attendance, s.prevAvg != null && s.currAvg != null ? s.currAvg - s.prevAvg : null]),
      compCurr: pairs((s) => [s.completion, s.currAvg]),
    };
  }, [students]);

  const factorCounts = ["attendance", "completion", "decline", "lowAverage", "engagement"].map((k) => ({
    factor: { attendance: "Attendance", completion: "Completion", decline: "Declining average", lowAverage: "Low current average", engagement: "Low engagement" }[k]!,
    Records: flagged.filter((a) => a.factors.some((f) => f.key === k)).length,
  }));
  const missingCounts = ["attendance", "assignment completion", "previous average", "current average", "engagement"].map((m) => ({ field: m, n: list.filter((a) => a.missing.includes(m)).length }));
  const totalMissing = list.filter((a) => a.missing.length).length;
  const topFactor = [...factorCounts].sort((a, b) => b.Records - a.Records)[0];
  const actionCounts = state.actions.reduce<Record<string, number>>((acc, a) => ({ ...acc, [a.status]: (acc[a.status] ?? 0) + 1 }), {});
  const recCounts = flagged.flatMap((a) => a.recommendations.map((r) => r.title)).reduce<Record<string, number>>((acc, t) => ({ ...acc, [t]: (acc[t] ?? 0) + 1 }), {});

  const exportCsv = () => {
    const rows = [["student_id", "cohort", "attendance_pct", "assignment_completion_pct", "previous_avg", "current_avg", "trend", "engagement", "category", "score", "uncertainty", "factors", "suggested_actions", "recorded_actions"]];
    students.forEach((s) => {
      const a = byId.get(s.id)!;
      rows.push([s.id, s.cohort, s.attendance, s.completion, s.prevAvg, s.currAvg, a.trend, s.engagement, a.category, a.score, a.uncertainty, a.factors.map((f) => f.label).join("; "), a.recommendations.map((r) => r.title).join("; "), state.actions.filter((x) => x.studentId === s.id).map((x) => `${x.title} [${x.status}]`).join("; ")] as never);
    });
    downloadFile(`edusupport-summary-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  };

  return (
    <>
      <PageHeader
        title="Insights and reports"
        description="Patterns across the loaded dataset. Correlations describe association only — they do not show that one indicator causes another."
        actions={
          <>
            <Select value={cohort} onValueChange={setCohort}>
              <SelectTrigger className="w-40" aria-label="Cohort"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All cohorts</SelectItem>{cohorts.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" />CSV summary</Button>
            <Button onClick={() => window.print()}><Printer className="h-4 w-4" />Print / save report as PDF</Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2 print:hidden">
        <Panel title="Common patterns among records suggested for review" description={`${flagged.length} records · number showing each factor`}>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={factorCounts} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" allowDecimals={false} fontSize={12} />
                <YAxis type="category" dataKey="factor" width={120} fontSize={12} />
                <Tooltip />
                <Bar dataKey="Records" fill="var(--chart-4)" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Relationships between indicators" description="Pearson correlation (r) on records with both values present">
          <ul className="space-y-3 text-sm">
            {[["Attendance ↔ assignment completion", stats.attComp], ["Attendance ↔ change in average", stats.attTrend], ["Completion ↔ current average", stats.compCurr]].map(([l, r]) => (
              <li key={l as string} className="rounded border p-3">
                <div className="flex justify-between"><span>{l}</span><strong>r = {r ?? "—"}</strong></div>
                <p className="text-xs text-muted-foreground">A {strength(r as number | null)} {r != null && (r as number) < 0 ? "negative" : "positive"} association. Other factors (e.g. health, caring duties, course difficulty) may explain both.</p>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Data quality" description="Missing values per field">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={missingCounts}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="field" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="n" name="Missing values" fill="var(--chart-5)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Improving academic trends" description={`${improving.length} records with average up ≥ ${state.thresholds.improvePoints} points`}>
          <div className="max-h-56 space-y-1 overflow-y-auto text-sm">
            {improving.slice(0, 30).map((a) => (
              <Link key={a.studentId} to="/students/$id" params={{ id: a.studentId }} className="flex justify-between rounded px-2 py-1 hover:bg-muted"><span>{a.studentId}</span><span className="text-improving">+{a.trend} pts</span></Link>
            ))}
            {improving.length === 0 && <p className="text-muted-foreground">None under current settings.</p>}
          </div>
        </Panel>
        <Panel title="Records needing careful human review" description="Suggested for review but with moderate or high uncertainty" className="lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            {needsHuman.map((a) => (
              <Link key={a.studentId} to="/students/$id" params={{ id: a.studentId }} className="flex items-center gap-2 rounded border px-2 py-1 text-xs hover:bg-muted">{a.studentId} <CategoryBadge category={a.category} /> {a.uncertainty}</Link>
            ))}
            {needsHuman.length === 0 && <p className="text-sm text-muted-foreground">None.</p>}
          </div>
        </Panel>
      </div>

      {/* Printable report */}
      <article className="mt-6 rounded-lg border bg-card p-6 sm:p-10 print:mt-0 print:border-0 print:p-0">
        <header className="border-b pb-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">EduSupport AI · Insights report</p>
          <h2 className="mt-1 text-2xl font-semibold">Student support review summary</h2>
          <p className="text-sm text-muted-foreground">Generated {new Date().toLocaleString("en-GB")} · {cohort === "all" ? "All cohorts" : cohort} · {state.source === "synthetic" ? "Synthetic demonstration data" : "Uploaded CSV data"}</p>
        </header>
        <section className="mt-5">
          <div className="flex items-center gap-2"><h3 className="font-semibold">1. Measured statistics</h3><SourceTag kind="measured" /></div>
          <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            <li>Records analysed: <strong>{students.length}</strong></li>
            <li>Records with missing values: <strong>{totalMissing}</strong> ({students.length ? Math.round((totalMissing / students.length) * 100) : 0}%)</li>
            <li>Mean attendance: <strong>{avg(students.map((s) => s.attendance))}%</strong></li>
            <li>Mean assignment completion: <strong>{avg(students.map((s) => s.completion))}%</strong></li>
            <li>Mean previous / current average: <strong>{avg(students.map((s) => s.prevAvg))}% / {avg(students.map((s) => s.currAvg))}%</strong></li>
            <li>Improving trends: <strong>{improving.length}</strong></li>
            <li>Correlation attendance ↔ completion: <strong>r = {stats.attComp ?? "—"}</strong></li>
            <li>Support actions recorded: <strong>{state.actions.length}</strong> {Object.entries(actionCounts).map(([k, v]) => `· ${k} ${v}`).join(" ")}</li>
          </ul>
        </section>
        <section className="mt-5">
          <div className="flex items-center gap-2"><h3 className="font-semibold">2. Rule-based interpretation</h3><SourceTag kind="interpretation" /></div>
          <p className="mt-2 text-sm">
            Under the current demonstration settings, <strong>{flagged.length}</strong> records ({list.filter((a) => a.category === "Priority review").length} priority, {list.filter((a) => a.category === "Review suggested").length} review suggested) would benefit from an educator review.
            {topFactor && topFactor.Records > 0 && <> The most common contributing indicator is <strong>{topFactor.factor.toLowerCase()}</strong> ({topFactor.Records} of {flagged.length} records).</>}
            {" "}{needsHuman.length} of these have moderate or high uncertainty and should be checked against other information before any conclusions are drawn.
          </p>
        </section>
        <section className="mt-5">
          <div className="flex items-center gap-2"><h3 className="font-semibold">3. Suggested interventions (awaiting approval)</h3><SourceTag kind="suggestion" /></div>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {Object.entries(recCounts).sort((a, b) => b[1] - a[1]).map(([t, n]) => <li key={t}>{t} — suggested for {n} records</li>)}
          </ul>
        </section>
        <section className="mt-5">
          <h3 className="font-semibold">4. Limitations and responsible use</h3>
          <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
            <li>Categories come from configurable rule thresholds, not a trained or validated model. No accuracy is claimed.</li>
            <li>Indicators can reflect circumstances outside a student's control; correlation does not imply causation.</li>
            <li>Missing or inaccurate data can produce misleading conclusions.</li>
            <li>All suggestions require educator review; no student should be penalised based on this output.</li>
          </ul>
        </section>
      </article>
    </>
  );
}
