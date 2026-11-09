"use client";
/**
 * Suivi de progression local (navigateur).
 *
 * L'état est conservé dans localStorage. L'interface `ProgressBackend` isole la
 * persistance : la phase « comptes utilisateurs » branchera Supabase sans
 * modifier les composants.
 */
import { useSyncExternalStore } from "react";

export type AttemptKind = "exercise" | "quiz" | "exam";
export type Level = "debutant" | "intermediaire" | "avance";

export interface Attempt {
  kind: AttemptKind;
  ref: string;
  title: string;
  chapter?: string;
  module?: string;
  level?: Level;
  score: number;
  max: number;
  xp: number;
  date: string;
}

export interface ProgressState {
  version: 1;
  name: string;
  xp: number;
  attempts: Attempt[];
  chaptersRead: Record<string, string>;
  quizBest: Record<string, number>;
  exercises: Record<string, { done: number; correct: number }>;
  examsPassed: Record<string, { score: number; date: string }>;
  activeDays: string[];
  weeklyGoal: number;
  badges: Record<string, string>;
  simulatorRuns: number;
}

export const DEFAULT_STATE: ProgressState = {
  version: 1,
  name: "",
  xp: 0,
  attempts: [],
  chaptersRead: {},
  quizBest: {},
  exercises: {},
  examsPassed: {},
  activeDays: [],
  weeklyGoal: 15,
  badges: {},
  simulatorRuns: 0,
};

/* ------------------------------ Persistance ------------------------------ */
export interface ProgressBackend {
  load(): ProgressState | null;
  save(state: ProgressState): void;
}

const KEY = "structura:progress:v1";
const localBackend: ProgressBackend = {
  load() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ProgressState;
      return parsed && parsed.version === 1 ? { ...DEFAULT_STATE, ...parsed } : null;
    } catch {
      return null;
    }
  },
  save(state) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* stockage indisponible : la session continue en mémoire */
    }
  },
};

let state: ProgressState = DEFAULT_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  state = localBackend.load() ?? DEFAULT_STATE;
}

function commit(next: ProgressState) {
  state = withBadges(next);
  localBackend.save(state);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      state = localBackend.load() ?? DEFAULT_STATE;
      listeners.forEach((x) => x());
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  ensureLoaded();
  return state;
}

export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_STATE);
}

/* ------------------------------- Calendrier ------------------------------- */
export function dayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function touchToday(s: ProgressState): string[] {
  const today = dayKey();
  return s.activeDays.includes(today) ? s.activeDays : [...s.activeDays, today].slice(-400);
}

export function streak(s: ProgressState): { current: number; best: number; activeToday: boolean } {
  const set = new Set(s.activeDays);
  const today = new Date();
  const activeToday = set.has(dayKey(today));
  // série courante : jours consécutifs jusqu'à aujourd'hui (ou hier si rien aujourd'hui)
  let current = 0;
  const cursor = new Date(today);
  if (!activeToday) cursor.setDate(cursor.getDate() - 1);
  while (set.has(dayKey(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }
  // meilleure série
  const sorted = [...set].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of sorted) {
    const d = new Date(`${k}T12:00:00`);
    if (prev && Math.round((d.getTime() - prev.getTime()) / 86400000) === 1) run++;
    else run = 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best: Math.max(best, current), activeToday };
}

export function weekExercises(s: ProgressState): number {
  const now = new Date();
  const monday = new Date(now);
  const dow = (now.getDay() + 6) % 7;
  monday.setDate(now.getDate() - dow);
  monday.setHours(0, 0, 0, 0);
  return s.attempts.filter((a) => a.kind === "exercise" && new Date(a.date) >= monday).length;
}

/* ---------------------------------- XP ----------------------------------- */
export const XP_BY_LEVEL: Record<Level, number> = { debutant: 10, intermediaire: 20, avance: 30 };

export function levelFromXp(xp: number) {
  // niveau n atteint pour 100·n·(n−1)/2 XP : 0, 100, 300, 600, 1000…
  let n = 1;
  while (100 * ((n + 1) * n) / 2 <= xp) n++;
  const floor = (100 * n * (n - 1)) / 2;
  const next = (100 * (n + 1) * n) / 2;
  return { level: n, floor, next, ratio: (xp - floor) / (next - floor) };
}

/* -------------------------------- Badges --------------------------------- */
export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  test: (s: ProgressState) => boolean;
}

const nbExercises = (s: ProgressState) => s.attempts.filter((a) => a.kind === "exercise").length;

export const BADGES: BadgeDef[] = [
  { id: "premier-pas", title: "Premier pas", description: "Réaliser un premier exercice", icon: "Footprints", test: (s) => nbExercises(s) >= 1 },
  { id: "dix", title: "Mise en charge", description: "10 exercices réalisés", icon: "Dumbbell", test: (s) => nbExercises(s) >= 10 },
  { id: "cinquante", title: "Charpentier", description: "50 exercices réalisés", icon: "Hammer", test: (s) => nbExercises(s) >= 50 },
  { id: "sans-faute", title: "Sans faute", description: "Un quiz réussi à 100 %", icon: "Target", test: (s) => s.attempts.some((a) => a.kind === "quiz" && a.score === a.max && a.max > 0) },
  { id: "serie-3", title: "Régulier", description: "3 jours d'affilée", icon: "Flame", test: (s) => streak(s).best >= 3 },
  { id: "serie-7", title: "Inébranlable", description: "7 jours d'affilée", icon: "Mountain", test: (s) => streak(s).best >= 7 },
  { id: "simulateur", title: "Ingénieur d'essai", description: "Lancer 10 calculs dans le simulateur", icon: "FlaskConical", test: (s) => s.simulatorRuns >= 10 },
  { id: "avance", title: "Niveau avancé", description: "Réussir un exercice avancé", icon: "Award", test: (s) => s.attempts.some((a) => a.kind === "exercise" && a.level === "avance" && a.score === a.max) },
  { id: "examen", title: "Module validé", description: "Réussir un examen de module", icon: "GraduationCap", test: (s) => Object.keys(s.examsPassed).length >= 1 },
  { id: "xp-1000", title: "1 000 XP", description: "Cumuler 1 000 points d'expérience", icon: "Sparkles", test: (s) => s.xp >= 1000 },
];

function withBadges(s: ProgressState): ProgressState {
  let badges = s.badges;
  for (const b of BADGES) {
    if (!badges[b.id] && b.test(s)) badges = { ...badges, [b.id]: new Date().toISOString() };
  }
  return badges === s.badges ? s : { ...s, badges };
}

/* -------------------------------- Actions -------------------------------- */
export function recordAttempt(a: Omit<Attempt, "date">) {
  ensureLoaded();
  const s = state;
  const next: ProgressState = {
    ...s,
    xp: s.xp + a.xp,
    attempts: [...s.attempts, { ...a, date: new Date().toISOString() }].slice(-500),
    activeDays: touchToday(s),
  };
  if (a.kind === "exercise" && a.chapter) {
    const cur = s.exercises[a.chapter] ?? { done: 0, correct: 0 };
    next.exercises = {
      ...s.exercises,
      [a.chapter]: { done: cur.done + 1, correct: cur.correct + (a.score === a.max ? 1 : 0) },
    };
  }
  if (a.kind === "quiz" && a.chapter) {
    const ratio = a.max > 0 ? a.score / a.max : 0;
    next.quizBest = { ...s.quizBest, [a.chapter]: Math.max(s.quizBest[a.chapter] ?? 0, ratio) };
  }
  if (a.kind === "exam" && a.module && a.max > 0 && a.score / a.max >= 0.7) {
    const prev = s.examsPassed[a.module];
    if (!prev || prev.score < a.score / a.max) {
      next.examsPassed = { ...s.examsPassed, [a.module]: { score: a.score / a.max, date: new Date().toISOString() } };
    }
  }
  commit(next);
}

export function markChapterRead(chapterId: string) {
  ensureLoaded();
  if (state.chaptersRead[chapterId]) return;
  commit({
    ...state,
    xp: state.xp + 5,
    chaptersRead: { ...state.chaptersRead, [chapterId]: new Date().toISOString() },
    activeDays: touchToday(state),
  });
}

export function recordSimulatorRun() {
  ensureLoaded();
  commit({ ...state, simulatorRuns: state.simulatorRuns + 1, activeDays: touchToday(state) });
}

export function setName(name: string) {
  ensureLoaded();
  commit({ ...state, name: name.slice(0, 40) });
}

export function setWeeklyGoal(goal: number) {
  ensureLoaded();
  commit({ ...state, weeklyGoal: Math.max(1, Math.min(100, Math.round(goal))) });
}

export function resetProgress() {
  ensureLoaded();
  commit({ ...DEFAULT_STATE });
}

/* -------------------------------- Maîtrise -------------------------------- */
/** Pourcentage de maîtrise d'un chapitre : lecture 20 %, quiz 40 %, exercices réussis 40 % (3 visés). */
export function chapterMastery(s: ProgressState, chapterId: string): number {
  const read = s.chaptersRead[chapterId] ? 1 : 0;
  const quiz = s.quizBest[chapterId] ?? 0;
  const ex = Math.min(1, (s.exercises[chapterId]?.correct ?? 0) / 3);
  return Math.round(100 * (0.2 * read + 0.4 * quiz + 0.4 * ex));
}
