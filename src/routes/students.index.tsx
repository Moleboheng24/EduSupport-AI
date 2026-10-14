import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ArrowUpDown, Download, Upload, Database } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CategoryBadge, EmptyState, PageHeader, SyntheticNotice, fmt } from "@/components/common";
import { CATEGORY_ORDER } from "@/lib/analysis";
import { parseStudentsCsv, sampleTemplate, downloadFile, type CsvResult } from "@/lib/csv";
import { actions as store, useAnalyses, useAppState } from "@/lib/store";
import type { Student } from "@/lib/types";

export const Route = createFileRoute("/students/")({
  head: () => ({
    meta: [
      { title: "Student Records — EduSupport AI" },
      { name: "description", content: "Search, filter and upload anonymised student indicator records." },
      { property: "og:title", content: "Student Records — EduSupport AI" },
      { property: "og:description", content: "Manage anonymised demonstration student records with CSV validation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentsPage,
});

type SortKey = "id" | "attendance" | "completion" | "prevAvg" | "currAvg" | "trend";

function StudentsPage() {
  const { students, source } = useAppState();
  const { byId } = useAnalyses();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [eng, setEng] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "id", dir: 1 });
  const [preview, setPreview] = useState<CsvResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => {
    const val = (s: Student, k: SortKey): number | string => {
      if (k === "id") return s.id;
      if (k === "trend") return byId.get(s.id)?.trend ?? -999;
      return (s[k] as number | null) ?? -1;
    };
    return students
      .filter((s) => !q || s.id.toLowerCase().includes(q.toLowerCase()) || s.cohort.toLowerCase().includes(q.toLowerCase()))
      .filter((s) => cat === "all" || byId.get(s.id)?.category === cat)
      .filter((s) => eng === "all" || (s.engagement ?? "Missing") === eng)
      .filter((s) => status === "all" || s.supportStatus === status)
      .sort((a, b) => {
        const x = val(a, sort.key), y = val(b, sort.key);
        return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
      });
  }, [students, byId, q, cat, eng, status, sort]);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) return toast.error("Please choose a .csv file.");
    if (f.size > 2_000_000) return toast.error("File is larger than 2 MB.");
    const text = await f.text();
    setPreview(parseStudentsCsv(text));
    if (fileRef.current) fileRef.current.value = "";
  };

  const SortHead = ({ k, label }: { k: SortKey; label: string }) => (
    <TableHead>
      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : 1 }))}>
        {label} <ArrowUpDown className="h-3 w-3" />
      </button>
    </TableHead>
  );

  return (
    <>
      <PageHeader
        title="Student records"
        description="Anonymised indicator records only. Names, contact details and identity numbers are never required or accepted."
        actions={
          <>
            <Button variant="outline" onClick={() => downloadFile("edusupport-template.csv", sampleTemplate())}><Download className="h-4 w-4" />Sample CSV template</Button>
            <Button variant="outline" onClick={() => { store.loadSynthetic(); toast.success("Built-in synthetic dataset loaded (120 records)"); }}><Database className="h-4 w-4" />Load synthetic dataset</Button>
            <Button onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" />Upload CSV</Button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </>
        }
      />
      <SyntheticNotice source={source} />
      <div className="mt-4 flex flex-wrap gap-2">
        <Input placeholder="Search by ID or cohort…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-64" />
        <Filter value={cat} onChange={setCat} label="Category" options={CATEGORY_ORDER} />
        <Filter value={eng} onChange={setEng} label="Engagement" options={["Low", "Medium", "High", "Missing"]} />
        <Filter value={status} onChange={setStatus} label="Support status" options={["None", "Monitoring", "Active support"]} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{rows.length} of {students.length} records</p>
      <div className="mt-2 overflow-x-auto rounded-lg border bg-card">
        {rows.length === 0 ? (
          <div className="p-4"><EmptyState title="No records match these filters">Try clearing the search or filters.</EmptyState></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead k="id" label="Student ID" />
                <TableHead>Cohort</TableHead>
                <SortHead k="attendance" label="Attendance" />
                <SortHead k="completion" label="Completion" />
                <SortHead k="prevAvg" label="Prev. avg" />
                <SortHead k="currAvg" label="Curr. avg" />
                <SortHead k="trend" label="Trend" />
                <TableHead>Engagement</TableHead>
                <TableHead>Support status</TableHead>
                <TableHead>Review category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => {
                const a = byId.get(s.id);
                return (
                  <TableRow key={s.id}>
                    <TableCell><Link to="/students/$id" params={{ id: s.id }} className="font-medium text-primary underline-offset-2 hover:underline">{s.id}</Link></TableCell>
                    <TableCell>{s.cohort}</TableCell>
                    <TableCell>{fmt(s.attendance)}</TableCell>
                    <TableCell>{fmt(s.completion)}</TableCell>
                    <TableCell>{fmt(s.prevAvg)}</TableCell>
                    <TableCell>{fmt(s.currAvg)}</TableCell>
                    <TableCell>{a?.trend == null ? "—" : a.trend > 0 ? `+${a.trend}` : a.trend}</TableCell>
                    <TableCell>{s.engagement ?? "—"}</TableCell>
                    <TableCell>{s.supportStatus}</TableCell>
                    <TableCell>{a && <CategoryBadge category={a.category} />}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>CSV validation preview</DialogTitle>
            <DialogDescription>Check the results before replacing the current dataset. Existing support actions will be cleared.</DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="max-h-[60vh] space-y-3 overflow-y-auto text-sm">
              <p><strong>{preview.students.length}</strong> rows parsed · <strong className="text-destructive">{preview.errors.length}</strong> errors · <strong>{preview.warnings.length}</strong> warnings</p>
              {preview.errors.length > 0 && (
                <div className="rounded border border-destructive/40 bg-destructive/5 p-3">
                  <p className="font-medium text-destructive">Errors (must be fixed before processing)</p>
                  <ul className="mt-1 list-disc pl-5">{preview.errors.slice(0, 20).map((e) => <li key={e}>{e}</li>)}</ul>
                  {preview.errors.length > 20 && <p className="mt-1">…and {preview.errors.length - 20} more.</p>}
                </div>
              )}
              {preview.warnings.length > 0 && (
                <div className="rounded border border-review/40 bg-accent p-3">
                  <p className="font-medium">Warnings</p>
                  <ul className="mt-1 list-disc pl-5">{preview.warnings.slice(0, 10).map((e) => <li key={e}>{e}</li>)}</ul>
                  {preview.warnings.length > 10 && <p className="mt-1">…and {preview.warnings.length - 10} more.</p>}
                </div>
              )}
              {preview.students.length > 0 && (
                <Table>
                  <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Cohort</TableHead><TableHead>Att.</TableHead><TableHead>Comp.</TableHead><TableHead>Prev</TableHead><TableHead>Curr</TableHead><TableHead>Eng.</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {preview.students.slice(0, 8).map((s) => (
                      <TableRow key={s.id}><TableCell>{s.id}</TableCell><TableCell>{s.cohort}</TableCell><TableCell>{fmt(s.attendance)}</TableCell><TableCell>{fmt(s.completion)}</TableCell><TableCell>{fmt(s.prevAvg)}</TableCell><TableCell>{fmt(s.currAvg)}</TableCell><TableCell>{s.engagement ?? "—"}</TableCell><TableCell>{s.supportStatus}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>Cancel</Button>
            <Button
              disabled={!preview || preview.errors.length > 0 || preview.students.length === 0}
              onClick={() => { store.loadUploaded(preview!.students); toast.success(`${preview!.students.length} records loaded and analysed`); setPreview(null); }}
            >Process and analyse</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Filter({ value, onChange, label, options }: { value: string; onChange: (v: string) => void; label: string; options: readonly string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-48" aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{label}: all</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
