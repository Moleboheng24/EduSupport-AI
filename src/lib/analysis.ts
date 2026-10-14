import type { Analysis, Category, Factor, Recommendation, Student, Thresholds } from "./types";

/**
 * Transparent, rule-based DEMONSTRATION scoring method.
 * Thresholds are configurable and NOT derived from a trained or validated model.
 */
export const DEFAULT_THRESHOLDS: Thresholds = {
  attendanceConcern: 85,
  attendanceStrong: 75,
  completionConcern: 75,
  completionStrong: 60,
  declinePoints: 8,
  improvePoints: 5,
  lowAverage: 50,
  priorityScore: 4,
  reviewScore: 2,
};

export function analyseStudent(s: Student, t: Thresholds): Analysis {
  const factors: Factor[] = [];
  const missing: string[] = [];
  if (s.attendance == null) missing.push("attendance");
  if (s.completion == null) missing.push("assignment completion");
  if (s.prevAvg == null) missing.push("previous average");
  if (s.currAvg == null) missing.push("current average");
  if (s.engagement == null) missing.push("engagement");

  const nearMiss: string[] = [];
  const near = (v: number, th: number) => Math.abs(v - th) <= 2;

  if (s.attendance != null) {
    if (s.attendance < t.attendanceStrong)
      factors.push({ key: "attendance", label: "Attendance well below threshold", observed: `Attendance ${s.attendance}% (threshold ${t.attendanceStrong}%)`, points: 2 });
    else if (s.attendance < t.attendanceConcern)
      factors.push({ key: "attendance", label: "Attendance below threshold", observed: `Attendance ${s.attendance}% (threshold ${t.attendanceConcern}%)`, points: 1 });
    if (near(s.attendance, t.attendanceConcern) || near(s.attendance, t.attendanceStrong)) nearMiss.push("attendance");
  }
  if (s.completion != null) {
    if (s.completion < t.completionStrong)
      factors.push({ key: "completion", label: "Assignment completion well below threshold", observed: `Completion ${s.completion}% (threshold ${t.completionStrong}%)`, points: 2 });
    else if (s.completion < t.completionConcern)
      factors.push({ key: "completion", label: "Assignment completion below threshold", observed: `Completion ${s.completion}% (threshold ${t.completionConcern}%)`, points: 1 });
    if (near(s.completion, t.completionConcern) || near(s.completion, t.completionStrong)) nearMiss.push("completion");
  }
  const trend = s.prevAvg != null && s.currAvg != null ? s.currAvg - s.prevAvg : null;
  if (trend != null && trend <= -t.declinePoints)
    factors.push({ key: "decline", label: "Assessment average has declined", observed: `Average changed ${s.prevAvg}% → ${s.currAvg}% (${trend} points)`, points: 2 });
  if (s.currAvg != null && s.currAvg < t.lowAverage)
    factors.push({ key: "lowAverage", label: "Current average below reference level", observed: `Current average ${s.currAvg}% (reference ${t.lowAverage}%)`, points: 1 });
  if (s.engagement === "Low")
    factors.push({ key: "engagement", label: "Low recorded engagement", observed: "Engagement indicator recorded as Low", points: 1 });

  const score = factors.reduce((a, f) => a + f.points, 0);
  const improving = trend != null && trend >= t.improvePoints;
  if (improving)
    factors.push({ key: "improving", label: "Assessment average is improving", observed: `Average changed ${s.prevAvg}% → ${s.currAvg}% (+${trend} points)`, points: 0 });

  let category: Category;
  if (score >= t.priorityScore) category = "Priority review";
  else if (score >= t.reviewScore) category = "Review suggested";
  else if (improving) category = "Improving";
  else category = "No current concern";

  const uncertaintyReasons: string[] = [];
  if (missing.length) uncertaintyReasons.push(`Missing data: ${missing.join(", ")}`);
  if (nearMiss.length) uncertaintyReasons.push(`Values close to a threshold: ${nearMiss.join(", ")}`);
  if (Math.abs(score - t.reviewScore) <= 0 || Math.abs(score - t.priorityScore) <= 0)
    uncertaintyReasons.push("Score sits exactly on a category boundary");
  const uncertainty = missing.length >= 2 ? "High" : uncertaintyReasons.length ? "Moderate" : "Low";

  return {
    studentId: s.id,
    category,
    score,
    factors,
    explanation: explain(s, category, factors, missing),
    recommendations: recommend(factors, category),
    uncertainty,
    uncertaintyReasons,
    trend,
    missing,
  };
}

function explain(s: Student, c: Category, factors: Factor[], missing: string[]): string {
  const concerns = factors.filter((f) => f.points > 0);
  let text = "";
  if (c === "Priority review" || c === "Review suggested") {
    text = `This record has been suggested for an educator review because ${concerns
      .map((f) => f.label.toLowerCase())
      .join("; ")}. These indicators may reflect circumstances outside the student's control, so a supportive conversation is the recommended starting point.`;
  } else if (c === "Improving") {
    text = "Assessment results are trending upward. Recognising this progress may help sustain it.";
  } else {
    text = concerns.length
      ? `One indicator is outside the reference range (${concerns[0].label.toLowerCase()}), but not enough to suggest a review under the current settings.`
      : "No indicators are outside the configured reference ranges.";
  }
  if (missing.length) text += ` Note: ${missing.join(", ")} ${missing.length > 1 ? "are" : "is"} missing, so this interpretation is incomplete.`;
  if (s.supportStatus !== "None") text += ` The student already has a recorded support status of "${s.supportStatus}".`;
  return text;
}

function recommend(factors: Factor[], c: Category): Recommendation[] {
  const has = (k: Factor["key"]) => factors.find((f) => f.key === k);
  const recs: Recommendation[] = [];
  const att = has("attendance");
  const comp = has("completion");
  const dec = has("decline");
  const low = has("lowAverage");
  const eng = has("engagement");
  if (c === "Priority review" || c === "Review suggested") {
    recs.push({ type: "advisor-checkin", title: "Offer a check-in with an academic advisor", rationale: "A supportive conversation helps understand context before any further steps.", basedOn: factors.filter((f) => f.points > 0).map((f) => f.observed) });
  }
  if (att) recs.push({ type: "attendance-conversation", title: "Discuss possible attendance barriers privately", rationale: "Attendance can be affected by transport, health, caring duties or other circumstances.", basedOn: [att.observed] });
  if (comp || eng) recs.push({ type: "study-plan", title: "Co-create a study plan", rationale: "A structured plan can help with workload and re-engagement.", basedOn: [comp?.observed, eng?.observed].filter(Boolean) as string[] });
  if (dec || low) recs.push({ type: "tutoring", title: "Offer tutoring or additional learning resources", rationale: "Targeted support may help address gaps in recent assessments.", basedOn: [dec?.observed, low?.observed].filter(Boolean) as string[] });
  if (dec) recs.push({ type: "follow-up-assessment", title: "Schedule a follow-up assessment", rationale: "Checks whether the decline persists and whether support is helping.", basedOn: [dec!.observed] });
  const imp = has("improving");
  if (imp && recs.length === 0) recs.push({ type: "recognise-progress", title: "Recognise and encourage recent progress", rationale: "Positive feedback can reinforce improvement.", basedOn: [imp.observed] });
  return recs;
}

export function analyseAll(students: Student[], t: Thresholds) {
  return students.map((s) => analyseStudent(s, t));
}

export const CATEGORY_ORDER: Category[] = ["Priority review", "Review suggested", "Improving", "No current concern"];
