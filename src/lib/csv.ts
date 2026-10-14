import type { Engagement, Student, SupportStatus } from "./types";

export const CSV_COLUMNS = [
  "student_id",
  "cohort",
  "attendance_pct",
  "assignment_completion_pct",
  "previous_avg",
  "current_avg",
  "engagement",
  "support_status",
] as const;

const FORBIDDEN = ["name", "first_name", "last_name", "surname", "email", "phone", "id_number", "address", "dob", "date_of_birth"];

export interface CsvResult {
  students: Student[];
  errors: string[];
  warnings: string[];
}

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === "," && !q) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

export function parseStudentsCsv(text: string): CsvResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 2) return { students: [], errors: ["The file has no data rows."], warnings };
  const header = splitLine(lines[0]).map((h) => h.toLowerCase());
  const pii = header.filter((h) => FORBIDDEN.includes(h));
  if (pii.length) errors.push(`Remove personally identifiable columns before uploading: ${pii.join(", ")}.`);
  const missingCols = CSV_COLUMNS.filter((c) => !header.includes(c));
  if (missingCols.length) errors.push(`Missing required columns: ${missingCols.join(", ")}.`);
  const unknown = header.filter((h) => !(CSV_COLUMNS as readonly string[]).includes(h) && !FORBIDDEN.includes(h));
  if (unknown.length) warnings.push(`Unrecognised columns will be ignored: ${unknown.join(", ")}.`);
  if (errors.length) return { students: [], errors, warnings };

  const idx = (c: string) => header.indexOf(c);
  const seen = new Set<string>();
  const students: Student[] = [];
  lines.slice(1).forEach((line, i) => {
    const row = i + 2;
    const cells = splitLine(line);
    const get = (c: string) => cells[idx(c)] ?? "";
    const id = get("student_id");
    if (!id) return errors.push(`Row ${row}: student_id is empty.`);
    if (seen.has(id)) return errors.push(`Row ${row}: duplicate student_id "${id}".`);
    seen.add(id);
    const num = (c: string, label: string): number | null => {
      const v = get(c);
      if (v === "") {
        warnings.push(`Row ${row}: ${label} is missing (record kept, flagged as incomplete).`);
        return null;
      }
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        errors.push(`Row ${row}: ${label} must be a number between 0 and 100 (got "${v}").`);
        return null;
      }
      return n;
    };
    const eng = get("engagement");
    let engagement: Engagement | null = null;
    if (eng === "") warnings.push(`Row ${row}: engagement is missing.`);
    else if (["Low", "Medium", "High"].includes(cap(eng))) engagement = cap(eng) as Engagement;
    else errors.push(`Row ${row}: engagement must be Low, Medium or High (got "${eng}").`);
    const ss = get("support_status");
    const statuses: SupportStatus[] = ["None", "Monitoring", "Active support"];
    const supportStatus = statuses.find((s) => s.toLowerCase() === ss.toLowerCase());
    if (ss && !supportStatus) errors.push(`Row ${row}: support_status must be None, Monitoring or Active support.`);
    students.push({
      id,
      cohort: get("cohort") || "Unspecified",
      attendance: num("attendance_pct", "attendance_pct"),
      completion: num("assignment_completion_pct", "assignment_completion_pct"),
      prevAvg: num("previous_avg", "previous_avg"),
      currAvg: num("current_avg", "current_avg"),
      engagement,
      supportStatus: supportStatus ?? "None",
    });
  });
  return { students, errors, warnings };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

export function toCsv(rows: (string | number | null)[][]): string {
  return rows
    .map((r) => r.map((v) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","))
    .join("\n");
}

export function downloadFile(name: string, content: string, type = "text/csv") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function sampleTemplate(): string {
  return toCsv([
    [...CSV_COLUMNS],
    ["DEMO-001", "Year 10", 92, 88, 67, 71, "High", "None"],
    ["DEMO-002", "Year 10", 71, 58, 62, 50, "Low", "Monitoring"],
    ["DEMO-003", "Year 11", 84, 79, 55, 63, "Medium", "None"],
  ]);
}
