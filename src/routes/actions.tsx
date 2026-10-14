import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageHeader, StatCard } from "@/components/common";
import { actions as store, useAppState } from "@/lib/store";
import type { ActionStatus } from "@/lib/types";

export const Route = createFileRoute("/actions")({
  head: () => ({
    meta: [
      { title: "Support Actions — EduSupport AI" },
      { name: "description", content: "Track approved support actions, follow-up dates and status." },
      { property: "og:title", content: "Support Actions — EduSupport AI" },
      { property: "og:description", content: "Educator-approved support action tracker." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActionsPage,
});

const STATUSES: ActionStatus[] = ["Accepted", "In progress", "Completed", "Deferred", "Dismissed"];

function ActionsPage() {
  const { actions } = useAppState();
  const [filter, setFilter] = useState<string>("all");
  const today = new Date().toISOString().slice(0, 10);
  const list = actions.filter((a) => filter === "all" || a.status === filter).sort((a, b) => a.followUp.localeCompare(b.followUp));
  const count = (s: ActionStatus) => actions.filter((a) => a.status === s).length;
  const overdue = actions.filter((a) => (a.status === "Accepted" || a.status === "In progress") && a.followUp < today).length;

  return (
    <>
      <PageHeader title="Support actions" description="Every action here was approved by an educator from a suggested recommendation. Update status as work progresses." />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {STATUSES.map((s) => <StatCard key={s} label={s} value={count(s)} />)}
        <StatCard label="Overdue follow-ups" value={overdue} accent={overdue ? "var(--priority)" : undefined} />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="mt-3 overflow-x-auto rounded-lg border bg-card">
        {list.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No support actions recorded yet">
              Open a record from <Link to="/analysis" className="text-primary underline">AI Analysis</Link> and accept a suggested action to start tracking it.
            </EmptyState>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow><TableHead>Student</TableHead><TableHead>Action</TableHead><TableHead>Follow-up</TableHead><TableHead>Status</TableHead><TableHead>Updated</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {list.map((a) => (
                <TableRow key={a.id}>
                  <TableCell><Link to="/students/$id" params={{ id: a.studentId }} className="font-medium text-primary hover:underline">{a.studentId}</Link></TableCell>
                  <TableCell className="max-w-sm"><div>{a.title}</div>{a.notes && <div className="text-xs text-muted-foreground">{a.notes}</div>}</TableCell>
                  <TableCell>
                    <Input type="date" value={a.followUp} className="w-40" aria-label="Follow-up date"
                      onChange={(e) => e.target.value && store.upsertAction({ ...a, followUp: e.target.value, updatedAt: new Date().toISOString() })} />
                    {(a.status === "Accepted" || a.status === "In progress") && a.followUp < today && <span className="text-xs text-priority">Overdue</span>}
                  </TableCell>
                  <TableCell>
                    <Select value={a.status} onValueChange={(v) => { store.upsertAction({ ...a, status: v as ActionStatus, updatedAt: new Date().toISOString() }); toast.success(`Status updated to ${v}`); }}>
                      <SelectTrigger className="w-36" aria-label="Status"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(a.updatedAt).toLocaleDateString("en-GB")}</TableCell>
                  <TableCell><Button size="icon" variant="ghost" aria-label="Delete action" onClick={() => { store.deleteAction(a.id); toast("Action removed"); }}><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}
