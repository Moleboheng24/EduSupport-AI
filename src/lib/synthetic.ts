import type { Engagement, Student, SupportStatus } from "./types";

// Deterministic seeded PRNG so the demonstration dataset is identical on every load.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export function generateSyntheticStudents(count = 120): Student[] {
  const r = mulberry32(20261014);
  const cohorts = ["Year 10", "Year 11", "Year 12"];
  const out: Student[] = [];
  for (let i = 0; i < count; i++) {
    // latent "circumstance" factor drives correlated indicators (synthetic only)
    const base = r();
    const attendance = clamp(62 + base * 36 + (r() - 0.5) * 12);
    const completion = clamp(50 + base * 45 + (r() - 0.5) * 20);
    const prevAvg = clamp(40 + base * 45 + (r() - 0.5) * 18);
    const drift = (r() - 0.55) * 22 + (attendance < 75 ? -5 : 0);
    const currAvg = clamp(prevAvg + drift);
    const e = base + (r() - 0.5) * 0.4;
    const engagement: Engagement = e < 0.33 ? "Low" : e < 0.7 ? "Medium" : "High";
    const s = r();
    const supportStatus: SupportStatus =
      s < 0.1 ? "Active support" : s < 0.22 ? "Monitoring" : "None";
    const st: Student = {
      id: `STU-${1001 + i}`,
      cohort: cohorts[i % 3]!,
      attendance,
      completion,
      prevAvg,
      currAvg,
      engagement,
      supportStatus,
    };
    // deliberately introduce a few data-quality gaps for demonstration
    if (i % 29 === 7) st.prevAvg = null;
    if (i % 37 === 11) st.engagement = null;
    if (i % 41 === 3) st.attendance = null;
    out.push(st);
  }
  return out;
}
