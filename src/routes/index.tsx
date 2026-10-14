import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORY_COLOR, Panel, PageHeader, ResponsibleNotice, StatCard, SyntheticNotice, avg } from "@/components/common";
import { CATEGORY_ORDER } from "@/lib/analysis";
import { actions as store, useAnalyses, useAppState } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — EduSupport AI" },
      { name: "description", content: "Overview of student support indicators, review findings and outstanding support actions." },
      { property: "og:title", content: "EduSupport AI Dashboard" },
      { property: "og:description", content: "Early-intervention dashboard built on synthetic student data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const state = useAppState();
  const { analyses, byId } = useAnalyses();
  const [cohort, setCohort] = useState("all");
  const cohorts = useMemo(() => [...new Set(state.students.map((s) => s.cohort))].sort(), [state.students]);
  const students = state.students.filter((s) => cohort === "all" || s.cohort === cohort);
  const list = students.map((s) => byId.get(s.id)!).filter(Boolean);

  const review = list.filter((a) => a.category === "Priority review" || a.category === "Review suggested").length;
  const improving = list.filter((a) => a.trend != null && a.trend >= state.thresholds.improvePoints).length;
  const outstanding = state.actions.filter((a) => a.status === "Accepted" || a.status === "In progress" || a.status === "Deferred").length;

  const catData = CATEGORY_ORDER.map((c) => ({ name: c, value: list.filter((a) => a.category === c).length }));
  const bands = ["<60", "60–69", "70–79", "80–89", "90+"];
  const band = (v: number) => (v < 60 ? 0 : v < 70 ? 1 : v < 80 ? 2 : v < 90 ? 3 : 4);
  const distData = bands.map((b, i) => ({
    band: b,
    Attendance: students.filter((s) => s.attendance != null && band(s.attendance) === i).length,
    Completion: students.filter((s) => s.completion != null && band(s.completion) === i).length,
  }));
  const trendData = CATEGORY_ORDER.map((c) => ({
    name: c,
    points: students.filter((s) => byId.get(s.id)?.category === c && s.prevAvg != null && s.currAvg != null)
      .map((s) => ({ x: s.attendance ?? 0, y: (s.currAvg ?? 0) - (s.prevAvg ?? 0), id: s.id })),
  }));

  return (
    <>
      <PageHeader
        title="Executive dashboard"
        description="A summary of the loaded dataset analysed with the current rule-based settings. Figures update whenever the data or settings change."
        actions={
          <>
            <Select value={cohort} onValueChange={setCohort}>
              <SelectTrigger className="w-40" aria-label="Filter by cohort"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cohorts</SelectItem>
                {cohorts.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { store.loadSynthetic(); toast.success("Synthetic dataset loaded and analysed"); }}>Reload synthetic data</Button>
          </>
        }
      />
      <div className="space-y-4">
        <SyntheticNotice source={state.source} />
        <ResponsibleNotice />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Students in dataset" value={students.length} hint={cohort === "all" ? "All cohorts" : cohort} />
          <StatCard label="Suggested for review" value={review} hint="Priority or review suggested" accent="var(--priority)" />
          <StatCard label="Improving trends" value={improving} hint={`Average up ≥ ${state.thresholds.improvePoints} points`} accent="var(--improving)" />
          <StatCard label="Outstanding actions" value={outstanding} hint="Accepted, in progress or deferred" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Mean attendance" value={`${avg(students.map((s) => s.attendance)) ?? "—"}%`} />
          <StatCard label="Mean assignment completion" value={`${avg(students.map((s) => s.completion)) ?? "—"}%`} />
          <StatCard label="Mean current average" value={`${avg(students.map((s) => s.currAvg)) ?? "—"}%`} />
          <StatCard label="Records with missing data" value={list.filter((a) => a.missing.length).length} hint="May affect interpretation" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Support-review categories" description="Count of records per category">
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={catData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                    {catData.map((d) => <Cell key={d.name} fill={CATEGORY_COLOR[d.name]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel title="Attendance and completion distribution" description="Number of students per percentage band" className="lg:col-span-2">
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={distData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="band" fontSize={12} label={{ value: "Percentage band", position: "insideBottom", offset: -2, fontSize: 11 }} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Attendance" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Completion" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
        <Panel title="Academic trend vs attendance" description="Each dot is a student: change in assessment average (current − previous) against attendance. Hover for the record ID.">
          <div className="h-80">
            <ResponsiveContainer>
              <ScatterChart margin={{ bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" dataKey="x" name="Attendance" unit="%" domain={[50, 100]} fontSize={12} />
                <YAxis type="number" dataKey="y" name="Change in average" unit=" pts" fontSize={12} />
                <ZAxis range={[40, 40]} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(v) => String(v)} labelFormatter={() => ""} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {trendData.map((t) => <Scatter key={t.name} name={t.name} data={t.points} fill={CATEGORY_COLOR[t.name]} />)}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link to="/analysis">Review analysis findings</Link></Button>
          <Button asChild variant="outline"><Link to="/actions">Open support actions</Link></Button>
        </div>
        {analyses.length === 0 && <p className="text-sm text-muted-foreground">No records loaded.</p>}
      </div>
    </>
  );
}
