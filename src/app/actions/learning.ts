"use server";
/**
 * Enregistrement de l'apprentissage (personne connectée uniquement).
 * Les notes sont recalculées ici à partir des réponses brutes ; le
 * navigateur n'envoie jamais de score. Toutes les entrées sont validées.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { actionUser, ActionError, dbErrorMessage, type ActionResult } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { builtinChapter, gradeExam, gradeGenerator, gradeQuiz, subjectOfModule } from "@/lib/learning/builtin";

const num = z.number().finite().nullable();
const values = z.record(z.string().max(40), num).refine((o) => Object.keys(o).length <= 20);

async function guard<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, error: e.message };
    if (e instanceof z.ZodError) return { ok: false, error: "Données invalides." };
    console.error("[learning]", e);
    return { ok: false, error: "Enregistrement impossible pour le moment." };
  }
}

async function recordGraded(userId: string, row: Record<string, unknown>) {
  const admin = createAdminClient();
  if (!admin) throw new ActionError("Enregistrement indisponible (configuration serveur incomplète).");
  const { error } = await admin.rpc("record_graded_attempt", { p_user: userId, ...row });
  if (error) throw new ActionError(dbErrorMessage(error));
}

export async function saveGeneratorAttempt(input: { generatorId: string; seed: number; values: Record<string, number | null>; durationSeconds?: number }) {
  return guard(async () => {
    const p = z.object({ generatorId: z.string().regex(/^[a-z0-9-]{1,60}$/), seed: z.number().int().min(1).max(1e9), values, durationSeconds: z.number().int().min(0).max(86400).optional() }).parse(input);
    const { session } = await actionUser("learning.track");
    const g = gradeGenerator(p.generatorId, p.seed, p.values);
    if (!g) throw new ActionError("Exercice inconnu.");
    await recordGraded(session.id, {
      p_source: "generator",
      p_item_key: `generator:${g.generator.id}`,
      p_subject_slug: g.subjectSlug,
      p_chapter_key: g.chapterKey,
      p_title: g.generator.title,
      p_difficulty: g.generator.level,
      p_score: g.score,
      p_max: g.max,
      p_responses: p.values,
      p_results: g.results,
      p_duration_seconds: p.durationSeconds ?? null,
      p_seed: p.seed,
    });
    return { ok: true, data: { score: g.score, max: g.max } };
  });
}

export async function saveQuizAttempt(input: { chapterId: string; answers: number[] }) {
  return guard(async () => {
    const p = z.object({ chapterId: z.string().regex(/^[a-z0-9-]{1,60}$/), answers: z.array(z.number().int().min(0).max(10)).max(30) }).parse(input);
    const { session } = await actionUser("learning.track");
    const g = gradeQuiz(p.chapterId, p.answers);
    if (!g) throw new ActionError("Quiz inconnu.");
    await recordGraded(session.id, {
      p_source: "quiz",
      p_item_key: `quiz:${p.chapterId}`,
      p_subject_slug: g.chapter.subjectSlug,
      p_chapter_key: `chapter:${p.chapterId}`,
      p_title: `Quiz — ${g.chapter.chapter.title}`,
      p_difficulty: g.chapter.chapter.level,
      p_score: g.score,
      p_max: g.max,
      p_responses: { answers: p.answers },
      p_results: g.results,
      p_duration_seconds: null,
      p_seed: null,
    });
    return { ok: true, data: { score: g.score, max: g.max } };
  });
}

export async function saveExamAttempt(input: {
  moduleId: string;
  seed: number;
  quizAnswers: Record<string, number>;
  exerciseValues: Record<string, Record<string, number | null>>;
  durationSeconds?: number;
}) {
  return guard(async () => {
    const p = z
      .object({
        moduleId: z.string().regex(/^m[0-9]{1,2}$/),
        seed: z.number().int().min(1).max(1e9),
        quizAnswers: z.record(z.string().regex(/^\d{1,2}$/), z.number().int().min(0).max(10)),
        exerciseValues: z.record(z.string().regex(/^\d{1,2}$/), values),
        durationSeconds: z.number().int().min(0).max(86400).optional(),
      })
      .parse(input);
    const { session } = await actionUser("learning.track");
    const g = gradeExam(p.moduleId, p.seed, p.quizAnswers, p.exerciseValues);
    if (!g || g.max === 0) throw new ActionError("Examen inconnu.");
    await recordGraded(session.id, {
      p_source: "exam",
      p_item_key: `exam:${p.moduleId}`,
      p_subject_slug: subjectOfModule(p.moduleId),
      p_chapter_key: null,
      p_title: `Examen — ${g.module.title}`,
      p_difficulty: null,
      p_score: g.score,
      p_max: g.max,
      p_responses: { quiz: p.quizAnswers, exercises: p.exerciseValues },
      p_results: g.results,
      p_duration_seconds: p.durationSeconds ?? null,
      p_seed: p.seed,
    });
    return { ok: true, data: { score: g.score, max: g.max, passed: g.passed } };
  });
}

/** Ouverture d'un chapitre du cursus intégré (reprise automatique, progression). */
export async function trackChapterView(chapterId: string) {
  return guard(async () => {
    const ch = builtinChapter(z.string().regex(/^[a-z0-9-]{1,60}$/).parse(chapterId));
    if (!ch) throw new ActionError("Chapitre inconnu.");
    const { supabase } = await actionUser("learning.track");
    const { error } = await supabase.rpc("track_view", { p_item_key: `chapter:${chapterId}`, p_subject_slug: ch.subjectSlug, p_title: ch.chapter.title, p_href: ch.href });
    if (error) throw new ActionError(dbErrorMessage(error));
    return { ok: true };
  });
}

export async function markChapterDone(chapterId: string) {
  return guard(async () => {
    const ch = builtinChapter(z.string().regex(/^[a-z0-9-]{1,60}$/).parse(chapterId));
    if (!ch) throw new ActionError("Chapitre inconnu.");
    const { supabase } = await actionUser("learning.track");
    await supabase.rpc("track_view", { p_item_key: `chapter:${chapterId}`, p_subject_slug: ch.subjectSlug, p_title: ch.chapter.title, p_href: ch.href });
    const { error } = await supabase.rpc("mark_completed", { p_item_key: `chapter:${chapterId}` });
    if (error) throw new ActionError(dbErrorMessage(error));
    return { ok: true };
  });
}

export async function trackLessonView(lessonId: string, completed = false) {
  return guard(async () => {
    const id = z.uuid().parse(lessonId);
    const { supabase } = await actionUser("learning.track");
    const { error } = await supabase.rpc("track_view", { p_item_key: `lesson:${id}` });
    if (error) throw new ActionError(dbErrorMessage(error));
    if (completed) await supabase.rpc("mark_completed", { p_item_key: `lesson:${id}` });
    return { ok: true };
  });
}

const favoriteSchema = z.object({
  itemKey: z.string().regex(/^(chapter|lesson|fiche|exercise|generator|document|page):[A-Za-z0-9_/-]{1,120}$/),
  kind: z.enum(["cours", "fiche", "exercice", "document", "outil"]),
  title: z.string().trim().min(1).max(200),
  href: z.string().regex(/^\/[A-Za-z0-9/_.?=&%-]{0,255}$/),
});

export async function toggleFavorite(input: z.input<typeof favoriteSchema>): Promise<ActionResult<{ favorite: boolean }>> {
  return guard<{ favorite: boolean }>(async () => {
    const p = favoriteSchema.parse(input);
    const { supabase, session } = await actionUser("learning.track");
    const { data: existing } = await supabase.from("favorites").select("item_key").eq("item_key", p.itemKey).maybeSingle();
    if (existing) {
      const { error } = await supabase.from("favorites").delete().eq("user_id", session.id).eq("item_key", p.itemKey);
      if (error) throw new ActionError(dbErrorMessage(error));
      revalidatePath("/espace/favoris");
      return { ok: true, data: { favorite: false } };
    }
    const { error } = await supabase.from("favorites").insert({ item_key: p.itemKey, kind: p.kind, title: p.title, href: p.href });
    if (error) throw new ActionError(dbErrorMessage(error));
    revalidatePath("/espace/favoris");
    return { ok: true, data: { favorite: true } };
  });
}

const reportSchema = z.object({
  targetType: z.enum(["lesson", "exercise", "question", "document", "chapter", "generator", "page"]),
  targetKey: z.string().regex(/^[A-Za-z0-9_:/-]{1,160}$/),
  targetTitle: z.string().trim().max(200),
  targetHref: z.string().regex(/^\/[A-Za-z0-9/_.?=&%-]{0,255}$/),
  reason: z.enum(["erreur", "incomprehensible", "inapproprie", "technique", "autre"]),
  message: z.string().trim().max(2000),
});

export async function createReport(input: z.input<typeof reportSchema>): Promise<ActionResult> {
  return guard(async () => {
    const p = reportSchema.parse(input);
    const { supabase } = await actionUser("reports.create");
    const { error } = await supabase.from("reports").insert({
      target_type: p.targetType,
      target_key: p.targetKey,
      target_title: p.targetTitle,
      target_href: p.targetHref,
      reason: p.reason,
      message: p.message,
    });
    if (error) throw new ActionError(dbErrorMessage(error));
    return { ok: true, message: "Merci : votre signalement a été transmis à l'équipe pédagogique." };
  });
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  return guard(async () => {
    const { supabase } = await actionUser();
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    revalidatePath("/", "layout");
    return { ok: true };
  });
}
