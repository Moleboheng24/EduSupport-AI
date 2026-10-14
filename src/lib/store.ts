import { useMemo, useSyncExternalStore } from "react";
import { analyseAll, DEFAULT_THRESHOLDS } from "./analysis";
import { generateSyntheticStudents } from "./synthetic";
import type { Analysis, Student, SupportAction, Thresholds } from "./types";

/**
 * Browser-local store (localStorage). NOT a secure multi-user database —
 * suitable only for a single-user demonstration with synthetic data.
 */
export interface AppState {
  students: Student[];
  source: "synthetic" | "upload";
  actions: SupportAction[];
  thresholds: Thresholds;
  analysedAt: string | null;
}

const KEY = "edusupport-ai-v1";
const initial = (): AppState => ({
  students: generateSyntheticStudents(),
  source: "synthetic",
  actions: [],
  thresholds: DEFAULT_THRESHOLDS,
  analysedAt: null,
});

const serverState = initial();
let state: AppState = serverState;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable */
    }
  }
  listeners.forEach((l) => l());
}

export function hydrateStore() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      state = { ...initial(), ...parsed, thresholds: { ...DEFAULT_THRESHOLDS, ...parsed.thresholds } };
      listeners.forEach((l) => l());
    }
  } catch {
    /* ignore corrupt storage */
  }
}

export function setState(fn: (s: AppState) => AppState) {
  state = fn(state);
  emit();
}

export function useAppState(): AppState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => serverState,
  );
}

export function useAnalyses(): { analyses: Analysis[]; byId: Map<string, Analysis> } {
  const { students, thresholds } = useAppState();
  return useMemo(() => {
    const analyses = analyseAll(students, thresholds);
    return { analyses, byId: new Map(analyses.map((a) => [a.studentId, a])) };
  }, [students, thresholds]);
}

export const actions = {
  loadSynthetic() {
    setState((s) => ({ ...s, students: generateSyntheticStudents(), source: "synthetic", actions: [], analysedAt: new Date().toISOString() }));
  },
  loadUploaded(students: Student[]) {
    setState((s) => ({ ...s, students, source: "upload", actions: [], analysedAt: new Date().toISOString() }));
  },
  markAnalysed() {
    setState((s) => ({ ...s, analysedAt: new Date().toISOString() }));
  },
  setThresholds(t: Thresholds) {
    setState((s) => ({ ...s, thresholds: t, analysedAt: new Date().toISOString() }));
  },
  upsertAction(a: SupportAction) {
    setState((s) => {
      const exists = s.actions.some((x) => x.id === a.id);
      return { ...s, actions: exists ? s.actions.map((x) => (x.id === a.id ? a : x)) : [a, ...s.actions] };
    });
  },
  deleteAction(id: string) {
    setState((s) => ({ ...s, actions: s.actions.filter((x) => x.id !== id) }));
  },
  updateStudent(st: Student) {
    setState((s) => ({ ...s, students: s.students.map((x) => (x.id === st.id ? st : x)) }));
  },
  resetAll() {
    if (typeof window !== "undefined") localStorage.removeItem(KEY);
    state = initial();
    emit();
  },
};
