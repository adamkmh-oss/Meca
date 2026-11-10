"use server";
/**
 * Actions d'administration. Chaque action revérifie la permission côté
 * serveur (actionUser) ; la base applique en plus la RLS et les déclencheurs
 * (publication réservée à content.publish, journal d'audit).
 */
import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionUser, ActionError, dbErrorMessage, type ActionResult } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { fieldErrors } from "@/lib/auth/validation";

async function run<T = undefined>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof ActionError) return { ok: false, error: e.message };
    if (e instanceof z.ZodError) {
      if (process.env.NODE_ENV === "development") console.warn("[admin] validation", e.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
      return { ok: false, error: "Vérifiez le formulaire.", fields: fieldErrors(e) };
    }
    console.error("[admin]", e);
    return { ok: false, error: "L'opération n'a pas abouti." };
  }
}

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Minuscules, chiffres et tirets uniquement.").max(80);
const title = z.string().trim().min(2, "Au moins 2 caractères.").max(160);
const text = (max: number) => z.string().max(max, `Au plus ${max} caractères.`).default("");
const status = z.enum(["draft", "published", "archived"]);
const level = z.enum(["debutant", "intermediaire", "avance"]);
const uuid = z.uuid();
const position = z.coerce.number().int().min(0).max(10000).default(0);
const obj = (form: FormData) => Object.fromEntries(form.entries());

/* ------------------------------- Matières ------------------------------ */
const subjectSchema = z.object({
  id: uuid.optional().or(z.literal("")),
  slug,
  title,
  description: text(1000),
  icon: z.string().regex(/^[A-Za-z0-9]{1,40}$/, "Nom d'icône Lucide (ex. Ruler)."),
  position,
});

export async function saveSubject(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const p = subjectSchema.parse(obj(form));
    const { supabase } = await actionUser(p.id ? "content.write" : "subjects.manage");
    const row = { slug: p.slug, title: p.title, description: p.description, icon: p.icon, position: p.position };
    if (p.id) {
      const { error } = await supabase.from("subjects").update(row).eq("id", p.id);
      if (error) return { ok: false, error: dbErrorMessage(error) };
      revalidatePath("/admin/contenus");
      return { ok: true, message: "Matière enregistrée." };
    }
    const { data, error } = await supabase.from("subjects").insert(row).select("id").single();
    if (error) return { ok: false, error: dbErrorMessage(error) };
    redirect(`/admin/matieres/${data.id}`);
  });
}

/* ------------------------------- Chapitres ----------------------------- */
const chapterSchema = z.object({ id: uuid.optional().or(z.literal("")), subject_id: uuid, slug, title, summary: text(1000), level, position });

export async function saveChapter(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const p = chapterSchema.parse(obj(form));
    const { supabase } = await actionUser("content.write");
    const row = { subject_id: p.subject_id, slug: p.slug, title: p.title, summary: p.summary, level: p.level, position: p.position };
    if (p.id) {
      const { error } = await supabase.from("chapters").update(row).eq("id", p.id);
      if (error) return { ok: false, error: dbErrorMessage(error) };
      revalidatePath("/admin/contenus");
      return { ok: true, message: "Chapitre enregistré." };
    }
    const { data, error } = await supabase.from("chapters").insert(row).select("id").single();
    if (error) return { ok: false, error: dbErrorMessage(error) };
    redirect(`/admin/chapitres/${data.id}`);
  });
}

/* -------------------------------- Leçons ------------------------------- */
const lessonSchema = z.object({
  id: uuid.optional().or(z.literal("")),
  chapter_id: uuid,
  slug,
  kind: z.enum(["cours", "fiche"]),
  title,
  summary: text(1000),
  body_md: text(200000),
  estimated_minutes: z.coerce.number().int().min(1).max(240),
  position,
});

export async function saveLesson(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const p = lessonSchema.parse(obj(form));
    const { supabase } = await actionUser("content.write");
    const row = { chapter_id: p.chapter_id, slug: p.slug, kind: p.kind, title: p.title, summary: p.summary, body_md: p.body_md, estimated_minutes: p.estimated_minutes, position: p.position };
    if (p.id) {
      const { error } = await supabase.from("lessons").update(row).eq("id", p.id);
      if (error) return { ok: false, error: dbErrorMessage(error) };
      revalidatePath("/admin/contenus");
      return { ok: true, message: "Leçon enregistrée." };
    }
    const { data, error } = await supabase.from("lessons").insert(row).select("id").single();
    if (error) return { ok: false, error: dbErrorMessage(error) };
    redirect(`/admin/lecons/${data.id}`);
  });
}

/* ------------------------------ Exercices ------------------------------ */
const exerciseSchema = z.object({
  id: uuid.optional().or(z.literal("")),
  chapter_id: uuid,
  title,
  statement_md: text(50000),
  data_md: text(20000),
  difficulty: level,
  position,
  illustration_document_id: uuid.optional().or(z.literal("")),
});

export async function saveExercise(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const p = exerciseSchema.parse(obj(form));
    const { supabase } = await actionUser("content.write");
    const row = {
      chapter_id: p.chapter_id,
      title: p.title,
      statement_md: p.statement_md,
      data_md: p.data_md,
      difficulty: p.difficulty,
      position: p.position,
      illustration_document_id: p.illustration_document_id || null,
    };
    if (p.id) {
      const { error } = await supabase.from("exercises").update(row).eq("id", p.id);
      if (error) return { ok: false, error: dbErrorMessage(error) };
      revalidatePath(`/admin/exercices/${p.id}`);
      return { ok: true, message: "Exercice enregistré." };
    }
    const { data, error } = await supabase.from("exercises").insert(row).select("id").single();
    if (error) return { ok: false, error: dbErrorMessage(error) };
    redirect(`/admin/exercices/${data.id}`);
  });
}

const choiceSchema = z.object({ label_md: z.string().trim().min(1).max(2000), correct: z.boolean() });
const questionSchema = z.object({
  id: uuid.optional(),
  exercise_id: uuid,
  kind: z.enum(["qcm", "numeric", "free"]),
  prompt_md: z.string().trim().min(1, "Énoncé requis.").max(20000),
  points: z.coerce.number().positive().max(100),
  unit: z.string().max(30).default(""),
  multiple: z.boolean().default(false),
  position,
  choices: z.array(choiceSchema).max(10).default([]),
  expected_value: z.number().finite().nullable().default(null),
  tolerance_rel: z.number().min(0).max(0.5).default(0.01),
  tolerance_abs: z.number().min(0).default(0),
  model_answer_md: z.string().max(20000).default(""),
  explanation_md: z.string().max(20000).default(""),
});

/** Enregistre une question complète : énoncé, choix, clé de correction (en une opération logique). */
export async function saveQuestion(input: z.input<typeof questionSchema>): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const p = questionSchema.parse(input);
    if (p.kind === "qcm" && (p.choices.length < 2 || !p.choices.some((c) => c.correct))) throw new ActionError("Un QCM demande au moins 2 choix dont un correct.");
    if (p.kind === "qcm" && !p.multiple && p.choices.filter((c) => c.correct).length > 1) throw new ActionError("Choix unique : une seule bonne réponse (ou cochez « plusieurs réponses »).");
    if (p.kind === "numeric" && p.expected_value === null) throw new ActionError("Indiquez la valeur attendue.");
    const { supabase } = await actionUser("content.write");
    const q = { exercise_id: p.exercise_id, kind: p.kind, prompt_md: p.prompt_md, points: p.points, unit: p.unit, multiple: p.kind === "qcm" && p.multiple, position: p.position };
    let id = p.id;
    if (id) {
      const { error } = await supabase.from("questions").update(q).eq("id", id);
      if (error) throw new ActionError(dbErrorMessage(error));
    } else {
      const { data, error } = await supabase.from("questions").insert(q).select("id").single();
      if (error) throw new ActionError(dbErrorMessage(error));
      id = data.id as string;
    }
    // Choix : remplacés à chaque enregistrement
    await supabase.from("answers").delete().eq("question_id", id);
    let correctIds: string[] = [];
    if (p.kind === "qcm") {
      const { data, error } = await supabase
        .from("answers")
        .insert(p.choices.map((c, i) => ({ question_id: id, label_md: c.label_md, position: i + 1 })))
        .select("id, position");
      if (error) throw new ActionError(dbErrorMessage(error));
      correctIds = (data ?? []).filter((a) => p.choices[a.position - 1]?.correct).map((a) => a.id as string);
    }
    const { error: kErr } = await supabase.from("question_keys").upsert({
      question_id: id,
      correct_answer_ids: correctIds,
      expected_value: p.kind === "numeric" ? p.expected_value : null,
      tolerance_rel: p.tolerance_rel,
      tolerance_abs: p.tolerance_abs,
      model_answer_md: p.model_answer_md,
      explanation_md: p.explanation_md,
    });
    if (kErr) throw new ActionError(dbErrorMessage(kErr));
    revalidatePath(`/admin/exercices/${p.exercise_id}`);
    return { ok: true, data: { id: id! }, message: "Question enregistrée." };
  });
}

export async function deleteQuestion(id: string, exerciseId: string): Promise<ActionResult> {
  return run(async () => {
    const { supabase } = await actionUser("content.write");
    const { error } = await supabase.from("questions").delete().eq("id", uuid.parse(id));
    if (error) throw new ActionError(dbErrorMessage(error));
    revalidatePath(`/admin/exercices/${uuid.parse(exerciseId)}`);
    return { ok: true };
  });
}

const correctionSchema = z.object({
  exercise_id: uuid,
  donnees_md: text(20000),
  schema_md: text(20000),
  equations_md: text(20000),
  calculs_md: text(40000),
  resultat_md: text(20000),
  verification_md: text(20000),
});

export async function saveCorrection(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const p = correctionSchema.parse(obj(form));
    const { supabase } = await actionUser("content.write");
    const { error } = await supabase.from("corrections").upsert(p);
    if (error) return { ok: false, error: dbErrorMessage(error) };
    return { ok: true, message: "Corrigé enregistré." };
  });
}

/* ------------------------ Publication, suppression --------------------- */
const TABLES = { subjects: "subjects", chapters: "chapters", lessons: "lessons", exercises: "exercises", documents: "documents" } as const;
type Table = keyof typeof TABLES;

export async function setStatus(table: Table, id: string, next: "draft" | "published" | "archived"): Promise<ActionResult> {
  return run(async () => {
    const t = z.enum(["subjects", "chapters", "lessons", "exercises", "documents"]).parse(table);
    const s = status.parse(next);
    const { supabase } = await actionUser(t === "documents" ? "documents.manage" : "content.publish");
    const { data, error } = await supabase.from(t).update({ status: s }).eq("id", uuid.parse(id)).select("id");
    if (error) return { ok: false, error: dbErrorMessage(error) };
    if (!data?.length) return { ok: false, error: "Élément introuvable ou non autorisé." };
    revalidatePath("/admin", "layout");
    revalidatePath("/matieres", "layout");
    return { ok: true, message: s === "published" ? "Publié." : s === "draft" ? "Repassé en brouillon." : "Archivé." };
  });
}

export async function deleteEntity(table: Table, id: string, back: string): Promise<ActionResult> {
  return run(async () => {
    const t = z.enum(["subjects", "chapters", "lessons", "exercises", "documents"]).parse(table);
    const { supabase } = await actionUser(t === "subjects" ? "subjects.manage" : t === "documents" ? "documents.manage" : "content.write");
    if (t === "documents") {
      const { data: doc } = await supabase.from("documents").select("storage_path").eq("id", uuid.parse(id)).maybeSingle();
      if (doc) await supabase.storage.from("documents").remove([doc.storage_path]);
    }
    const { data, error } = await supabase.from(t).delete().eq("id", uuid.parse(id)).select("id");
    if (error) return { ok: false, error: dbErrorMessage(error) };
    if (!data?.length) return { ok: false, error: "Élément introuvable ou non autorisé." };
    revalidatePath("/admin", "layout");
    redirect(/^\/admin[A-Za-z0-9/_-]*$/.test(back) ? back : "/admin/contenus");
  });
}

/* ------------------------------ Signalements ---------------------------- */
export async function moderateReport(id: string, next: "in_review" | "resolved" | "rejected", note: string): Promise<ActionResult> {
  return run(async () => {
    const { supabase } = await actionUser("reports.moderate");
    const { error } = await supabase
      .from("reports")
      .update({ status: z.enum(["in_review", "resolved", "rejected"]).parse(next), resolution_note: z.string().max(2000).parse(note) })
      .eq("id", uuid.parse(id));
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath("/admin/signalements");
    return { ok: true };
  });
}

/* ------------------------------- Comptes -------------------------------- */
export async function setUserRole(userId: string, role: "student" | "teacher" | "admin"): Promise<ActionResult> {
  return run(async () => {
    const { supabase } = await actionUser("users.manage");
    const { error } = await supabase.rpc("admin_set_role", { p_user: uuid.parse(userId), p_role: z.enum(["student", "teacher", "admin"]).parse(role) });
    if (error) return { ok: false, error: error.message === "last admin" ? "Impossible : c'est le dernier administrateur." : dbErrorMessage(error) };
    revalidatePath("/admin/utilisateurs");
    return { ok: true, message: "Rôle modifié." };
  });
}

export async function setUserStatus(userId: string, next: "active" | "suspended"): Promise<ActionResult> {
  return run(async () => {
    const { supabase } = await actionUser("users.manage");
    const id = uuid.parse(userId);
    const st = z.enum(["active", "suspended"]).parse(next);
    const { error } = await supabase.rpc("admin_set_status", { p_user: id, p_status: st });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    // Bloque aussi la connexion côté Supabase Auth (et donc le renouvellement des sessions).
    const admin = createAdminClient();
    if (admin) await admin.auth.admin.updateUserById(id, { ban_duration: st === "suspended" ? "876000h" : "none" });
    revalidatePath("/admin/utilisateurs");
    return { ok: true, message: st === "suspended" ? "Compte suspendu." : "Compte réactivé." };
  });
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  return run(async () => {
    const { supabase, session } = await actionUser("users.manage");
    const id = uuid.parse(userId);
    if (id === session.id) return { ok: false, error: "Supprimez votre propre compte depuis « Mon compte »." };
    const { data: target } = await supabase.from("profiles").select("role").eq("id", id).maybeSingle();
    if (!target) return { ok: false, error: "Compte introuvable." };
    if (target.role === "admin") return { ok: false, error: "Retirez d'abord le rôle administrateur." };
    const admin = createAdminClient();
    if (!admin) return { ok: false, error: "Suppression indisponible (clé de service non configurée)." };
    await supabase.rpc("log_admin_action", { p_action: "users.delete", p_target: id, p_details: {} });
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return { ok: false, error: "La suppression n'a pas abouti." };
    revalidatePath("/admin/utilisateurs");
    return { ok: true, message: "Compte supprimé avec ses données." };
  });
}
