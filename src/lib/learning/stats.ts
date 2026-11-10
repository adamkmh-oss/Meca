import "server-only";
/**
 * Statistiques personnelles : agrège my_stats() (base, RLS) avec le
 * cursus intégré (nombre de chapitres disponibles par matière).
 */
import { MODULES, chapterById } from "@/content/modules";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUBJECT_OF_MODULE } from "./builtin";

export interface SubjectRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  position: number;
  status: string;
  builtin_modules: string[];
}

interface RawStats {
  profile: { display_name: string; weekly_goal: number; last_item_title: string | null; last_item_href: string | null; last_item_at: string | null } | null;
  totals: { attempts: number; exercises: number; distinct_exercises: number; score: number; max: number; attempt_seconds: number; week_exercises: number };
  reading_seconds: number;
  subjects: { slug: string; viewed: number; completed: number; seconds: number; attempts: number; score: number; max: number; db_lessons: number }[];
  chapters: { chapter_key: string; subject_slug: string | null; attempts: number; score: number; max: number; last_at: string }[];
  recent: { id: string; source: string; item_key: string; title: string; subject_slug: string | null; score: number; max_score: number; created_at: string }[];
  active_days: string[];
  completed_items: string[];
}

/** Nombre de chapitres intégrés disponibles par matière. */
export function builtinTotals(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of MODULES) {
    const subject = SUBJECT_OF_MODULE[m.slug];
    if (subject) out[subject] = (out[subject] ?? 0) + m.chapters.filter((c) => c.available).length;
  }
  return out;
}

export function streakFromDays(days: string[], today = new Date()) {
  const set = new Set(days);
  const key = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
  let current = 0;
  const cursor = new Date(today);
  if (!set.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (set.has(key(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { current, activeToday: set.has(key(today)) };
}

export async function loadDashboard(supabase: SupabaseClient) {
  const [{ data: raw, error }, { data: subjects }] = await Promise.all([
    supabase.rpc("my_stats"),
    supabase.from("subjects").select("id, slug, title, description, icon, position, status, builtin_modules").eq("status", "published").order("position"),
  ]);
  if (error || !raw) throw new Error("Statistiques indisponibles");
  const s = raw as RawStats;
  const totals = builtinTotals();
  const bySlug = new Map(s.subjects.map((x) => [x.slug, x]));

  const perSubject = ((subjects ?? []) as SubjectRow[]).map((sub) => {
    const st = bySlug.get(sub.slug);
    const total = (totals[sub.slug] ?? 0) + (st?.db_lessons ?? 0);
    const completed = st?.completed ?? 0;
    return {
      ...sub,
      total,
      completed,
      progress: total > 0 ? Math.min(100, Math.round((100 * completed) / total)) : 0,
      attempts: st?.attempts ?? 0,
      success: st && st.max > 0 ? Math.round((100 * st.score) / st.max) : null,
      seconds: st?.seconds ?? 0,
    };
  });

  // Libellés des chapitres (cursus intégré ou base)
  const dbIds = s.chapters.filter((c) => c.chapter_key.startsWith("dbchapter:")).map((c) => c.chapter_key.slice(10));
  const dbTitles = new Map<string, string>();
  if (dbIds.length) {
    const { data } = await supabase.from("chapters").select("id, title").in("id", dbIds);
    for (const c of data ?? []) dbTitles.set(c.id, c.title);
  }
  const chapters = s.chapters
    .map((c) => {
      const title = c.chapter_key.startsWith("chapter:")
        ? (chapterById(c.chapter_key.slice(8))?.chapter.title ?? c.chapter_key)
        : (dbTitles.get(c.chapter_key.slice(10)) ?? "Chapitre");
      return { ...c, title, rate: c.max > 0 ? Math.round((100 * c.score) / c.max) : 0 };
    })
    .sort((a, b) => b.rate - a.rate);

  const t = s.totals;
  return {
    profile: s.profile,
    totals: {
      attempts: t.attempts,
      exercises: t.exercises,
      distinctExercises: t.distinct_exercises,
      successRate: t.max > 0 ? Math.round((100 * t.score) / t.max) : null,
      studySeconds: s.reading_seconds + t.attempt_seconds,
      weekExercises: t.week_exercises,
    },
    subjects: perSubject,
    strengths: chapters.filter((c) => c.rate >= 80 && c.max >= 2).slice(0, 5),
    weaknesses: chapters.filter((c) => c.rate < 60).sort((a, b) => a.rate - b.rate).slice(0, 5),
    recent: s.recent,
    streak: streakFromDays(s.active_days),
    activeDays: s.active_days,
  };
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${String(m % 60).padStart(2, "0")}`;
}

export const SOURCE_LABEL: Record<string, string> = { exercise: "Exercice", generator: "Exercice généré", quiz: "Quiz", exam: "Examen" };
