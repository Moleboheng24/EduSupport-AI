export type Engagement = "Low" | "Medium" | "High";
export type SupportStatus = "None" | "Monitoring" | "Active support";

/** Anonymised student record. No names, contact details or ID numbers. */
export interface Student {
  id: string;
  cohort: string;
  attendance: number | null;
  completion: number | null;
  prevAvg: number | null;
  currAvg: number | null;
  engagement: Engagement | null;
  supportStatus: SupportStatus;
}

export interface Thresholds {
  attendanceConcern: number;
  attendanceStrong: number;
  completionConcern: number;
  completionStrong: number;
  declinePoints: number;
  improvePoints: number;
  lowAverage: number;
  priorityScore: number;
  reviewScore: number;
}

export type Category = "Priority review" | "Review suggested" | "Improving" | "No current concern";

export interface Factor {
  key: "attendance" | "completion" | "decline" | "lowAverage" | "engagement" | "improving";
  label: string;
  observed: string;
  points: number;
}

export type RecType =
  | "advisor-checkin"
  | "tutoring"
  | "attendance-conversation"
  | "study-plan"
  | "follow-up-assessment"
  | "recognise-progress";

export interface Recommendation {
  type: RecType;
  title: string;
  rationale: string;
  basedOn: string[];
}

export interface Analysis {
  studentId: string;
  category: Category;
  score: number;
  factors: Factor[];
  explanation: string;
  recommendations: Recommendation[];
  uncertainty: "Low" | "Moderate" | "High";
  uncertaintyReasons: string[];
  trend: number | null;
  missing: string[];
}

export type ActionStatus = "Accepted" | "In progress" | "Completed" | "Deferred" | "Dismissed";

export interface SupportAction {
  id: string;
  studentId: string;
  recType: RecType;
  title: string;
  notes: string;
  status: ActionStatus;
  followUp: string; // yyyy-mm-dd
  createdAt: string;
  updatedAt: string;
  basedOn: string[];
}
