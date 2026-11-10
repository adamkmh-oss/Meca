#!/usr/bin/env node
/**
 * Charge le contenu initial (supabase/content/initial-content.mjs) et les cours
 * de l'enseignant (supabase/content/cours-enseignant.mjs) dans la base :
 *   npm run content:load
 * Variables : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (lues dans
 * l'environnement ou .env.local). N'insère que ce qui manque.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { CONTENT as INITIAL } from "../supabase/content/initial-content.mjs";
import { COURS_ENSEIGNANT } from "../supabase/content/cours-enseignant.mjs";

const CONTENT = [...INITIAL, ...COURS_ENSEIGNANT];

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(root, ".env.local");
if (existsSync(envFile)) {
  for (const l of readFileSync(envFile, "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(l);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const must = (r, what) => {
  if (r.error) throw new Error(`${what} : ${r.error.message}`);
  return r.data;
};

async function insertExercise(chapterId, e, position) {
  const ex = must(
    await db.from("exercises").insert({ chapter_id: chapterId, title: e.title, statement_md: e.statement, data_md: e.data, difficulty: e.difficulty, position, status: "published" }).select("id").single(),
    "exercice",
  );
  try {
    await insertQuestions(ex.id, e);
  } catch (err) {
    // Pas d'exercice à moitié chargé : il serait ignoré au prochain lancement.
    await db.from("exercises").delete().eq("id", ex.id);
    throw err;
  }
}

async function insertQuestions(exerciseId, e) {
  for (const [k, q] of e.questions.entries()) {
    const row = must(
      await db.from("questions").insert({ exercise_id: exerciseId, position: k + 1, kind: q.kind, prompt_md: q.prompt, unit: q.unit ?? "", points: q.points ?? 1, multiple: false }).select("id").single(),
      "question",
    );
    let correct = [];
    if (q.kind === "qcm") {
      const answers = must(await db.from("answers").insert(q.choices.map((c, j) => ({ question_id: row.id, position: j + 1, label_md: c.label }))).select("id, position"), "choix");
      correct = answers.filter((a) => q.choices[a.position - 1].correct).map((a) => a.id);
    }
    must(
      await db.from("question_keys").insert({
        question_id: row.id,
        correct_answer_ids: correct,
        expected_value: q.kind === "numeric" ? q.expected : null,
        tolerance_rel: q.tol ?? 0.01,
        tolerance_abs: 0,
        model_answer_md: q.model ?? "",
        explanation_md: q.explanation ?? "",
      }),
      "clé",
    );
  }
  const c = e.correction;
  must(
    await db.from("corrections").insert({ exercise_id: exerciseId, donnees_md: c.donnees, schema_md: c.schema, equations_md: c.equations, calculs_md: c.calculs, resultat_md: c.resultat, verification_md: c.verification }),
    "corrigé",
  );
}

let added = 0;
for (const item of CONTENT) {
  const subject = must(await db.from("subjects").select("id").eq("slug", item.subject).maybeSingle(), "matière");
  if (!subject) {
    console.warn(`matière absente : ${item.subject} (ignorée)`);
    continue;
  }
  let chapter = must(await db.from("chapters").select("id").eq("subject_id", subject.id).eq("slug", item.chapter.slug).maybeSingle(), "chapitre");
  if (!chapter) {
    chapter = must(
      await db.from("chapters").insert({ subject_id: subject.id, slug: item.chapter.slug, title: item.chapter.title, summary: item.chapter.summary, level: item.chapter.level, position: item.chapter.position ?? 1, status: "published" }).select("id").single(),
      "chapitre",
    );
    added++;
  }
  for (const [i, l] of item.lessons.entries()) {
    const exists = must(await db.from("lessons").select("id").eq("chapter_id", chapter.id).eq("slug", l.slug).maybeSingle(), "leçon");
    if (exists) continue;
    must(
      await db.from("lessons").insert({ chapter_id: chapter.id, slug: l.slug, kind: l.kind, title: l.title, summary: l.summary, body_md: l.body, estimated_minutes: l.minutes, position: i + 1, status: "published" }),
      "leçon",
    );
    added++;
  }
  const exercises = item.exercises ?? (item.exercise ? [item.exercise] : []);
  for (const [position, e] of exercises.entries()) {
    const existsEx = must(await db.from("exercises").select("id").eq("chapter_id", chapter.id).eq("title", e.title).maybeSingle(), "exercice");
    if (existsEx) continue;
    await insertExercise(chapter.id, e, position + 1);
    added++;
  }
}
console.log(`Contenu : ${added} élément(s) ajouté(s).`);
