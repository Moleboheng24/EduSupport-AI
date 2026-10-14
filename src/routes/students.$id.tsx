import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Clock, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CategoryBadge, EmptyState, Panel, PageHeader, ResponsibleNotice, SourceTag, fmt } from "@/components/common";
import { actions as store, useAnalyses, useAppState } from "@/lib/store";
import type { ActionStatus, Recommendation, SupportAction } from "@/lib/types";

export const Route = createFileRoute("/students/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Record ${params.id} — EduSupport AI` },
      { name: "description", content: "Indicators, explanation and suggested support actions for an anonymised record." },
      { property: "og:title", content: `Record ${params.id} — EduSupport AI` },
      { property: "og:description", content: "Explainable support-review analysis for one anonymised record." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudentDetail,
});

const inTwoWeeks = () => new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);

function StudentDetail() {
  const { id } = Route.useParams();
  const state = useAppState();
  const { byId } = useAnalyses();
  const s = state.students.find((x) => x.id === id);
  const a = byId.get(id);
  const [editing, setEditing] = useState<{ rec: Recommendation; status: ActionStatus } | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState(inTwoWeeks());

  if (!s || !a) return <EmptyState title="Record not found"><Link to="/students" className="text-primary underline">Back to student records</Link></EmptyState>;

  const existing = state.actions.filter((x) => x.studentId === id);
  const decisionFor = (r: Recommendation) => existing.find((x) => x.recType === r.type);

  const record = (rec: Recommendation, status: ActionStatus, t = rec.title, n = "", f = inTwoWeeks()) => {
    const prev = decisionFor(rec);
    const now = new Date().toISOString();
    const act: SupportAction = { id: prev?.id ?? crypto.randomUUID(), studentId: id, recType: rec.type, title: t, notes: n, status, followUp: f, createdAt: prev?.createdAt ?? now, updatedAt: now, basedOn: rec.basedOn };
    store.upsertAction(act);
    toast.success(`Recommendation ${status.toLowerCase()} and recorded`);
  };

  const open = (rec: Recommendation, status: ActionStatus) => {
    const prev = decisionFor(rec);
    setTitle(prev?.title ?? rec.title);
    setNotes(prev?.notes ?? "");
    setFollowUp(prev?.followUp ?? inTwoWeeks());
    setEditing({ rec, status });
  };

  return (
    <>
      <Link to="/students" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Student records</Link>
      <PageHeader title={`Record ${s.id}`} description={`${s.cohort} · Existing support status: ${s.supportStatus}`} actions={<CategoryBadge category={a.category} />} />
      <ResponsibleNotice className="mb-4" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Observed indicators" right={<SourceTag kind="measured" />}>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Attendance", fmt(s.attendance)],
              ["Assignment completion", fmt(s.completion)],
              ["Previous average", fmt(s.prevAvg)],
              ["Current average", fmt(s.currAvg)],
              ["Change", a.trend == null ? "—" : `${a.trend > 0 ? "+" : ""}${a.trend} pts`],
              ["Engagement", s.engagement ?? "—"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md bg-muted p-2"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-display text-lg font-semibold">{v}</dd></div>
            ))}
          </dl>
        </Panel>
        <Panel title="Why this category?" right={<SourceTag kind="interpretation" />} className="lg:col-span-2">
          <p className="text-sm leading-relaxed">{a.explanation}</p>
          <h3 className="mt-4 text-sm font-semibold">Contributing factors (demonstration score: {a.score})</h3>
          {a.factors.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : (
            <ul className="mt-2 space-y-1 text-sm">
              {a.factors.map((f) => (
                <li key={f.key} className="flex justify-between gap-2 rounded border px-3 py-2"><span><strong>{f.label}</strong> — {f.observed}</span><span className="shrink-0 text-muted-foreground">+{f.points}</span></li>
              ))}
            </ul>
          )}
          <div className="mt-4 rounded-md bg-muted p-3 text-sm">
            <strong>Uncertainty: {a.uncertainty}.</strong>{" "}
            {a.uncertaintyReasons.length ? a.uncertaintyReasons.join(". ") + "." : "All indicators present and clear of thresholds."}{" "}
            <span className="text-muted-foreground">This is a qualitative rating of data completeness and threshold proximity, not a statistical confidence.</span>
          </div>
        </Panel>
      </div>

      <Panel title="Suggested support actions" description="Each suggestion requires educator approval. Accept, edit, defer or dismiss to record your decision." right={<SourceTag kind="suggestion" />} className="mt-4">
        {a.recommendations.length === 0 ? <EmptyState title="No support actions suggested under current settings" /> : (
          <div className="grid gap-3 md:grid-cols-2">
            {a.recommendations.map((r) => {
              const d = decisionFor(r);
              return (
                <div key={r.type} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{d?.title ?? r.title}</h3>
                    {d && <span className="rounded bg-secondary px-2 py-0.5 text-xs">{d.status}</span>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{r.rationale}</p>
                  <p className="mt-2 text-xs font-medium">Informed by:</p>
                  <ul className="list-disc pl-5 text-xs text-muted-foreground">{r.basedOn.map((b) => <li key={b}>{b}</li>)}</ul>
                  {d?.notes && <p className="mt-2 text-xs"><strong>Notes:</strong> {d.notes}</p>}
                  {d && d.status !== "Dismissed" && <p className="mt-1 text-xs"><strong>Follow-up:</strong> {d.followUp}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => open(r, "Accepted")}><Check className="h-3.5 w-3.5" />Accept</Button>
                    <Button size="sm" variant="outline" onClick={() => open(r, d?.status ?? "Accepted")}><Pencil className="h-3.5 w-3.5" />Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => record(r, "Deferred", d?.title, d?.notes, d?.followUp)}><Clock className="h-3.5 w-3.5" />Defer</Button>
                    <Button size="sm" variant="ghost" onClick={() => record(r, "Dismissed", d?.title, d?.notes, d?.followUp)}><X className="h-3.5 w-3.5" />Dismiss</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record support action</DialogTitle>
            <DialogDescription>Adjust the wording, add notes and set a follow-up date.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label htmlFor="t">Action</Label><Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><Label htmlFor="n">Notes (avoid sensitive personal details)</Label><Textarea id="n" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></div>
            <div><Label htmlFor="f">Follow-up date</Label><Input id="f" type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button disabled={!title.trim() || !followUp} onClick={() => { record(editing!.rec, editing!.status, title.trim(), notes.trim(), followUp); setEditing(null); }}>Save action</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
