/**
 * Contenus des cours de l'enseignant chargés en base (npm run content:load) :
 * visibles des visiteurs, corrigés par `submit_attempt` avec les valeurs
 * attendues du fichier source, signe et tolérance respectés.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { anonClient, createUser, deleteUsers, SERVICE_KEY, stackAvailable, SUPABASE_URL, type TestUser } from "./helpers";
import { COURS_ENSEIGNANT } from "../../supabase/content/cours-enseignant.mjs";

const available = await stackAvailable();
const d = available ? describe : describe.skip;

type Q = { kind: string; expected?: number; choices?: { label: string; correct: boolean }[] };
type Ex = { title: string; questions: Q[] };
const EXERCISES = COURS_ENSEIGNANT.flatMap((i) => i.exercises.map((e) => ({ subject: i.subject, chapter: i.chapter.slug, ...(e as Ex) })));

let student: TestUser;

beforeAll(async () => {
  if (!available) return;
  // Idempotent : n'insère que ce qui manque.
  execFileSync(process.execPath, [path.resolve(__dirname, "../../scripts/content-load.mjs")], {
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY },
    stdio: "pipe",
  });
  student = await createUser("cours-ens");
});

afterAll(async () => {
  if (student) await deleteUsers([student]);
});

/** Questions de l'exercice en base, dans l'ordre, avec les identifiants des choix. */
async function loadExercise(title: string) {
  const { data, error } = await student.client
    .from("exercises")
    .select("id, questions(id, position, kind, answers(id, position))")
    .eq("title", title)
    .single();
  if (error) throw error;
  const questions = [...data.questions].sort((a, b) => a.position - b.position);
  return { id: data.id as string, questions: questions.map((q) => ({ ...q, answers: [...q.answers].sort((a, b) => a.position - b.position) })) };
}

function responses(src: Ex, db: Awaited<ReturnType<typeof loadExercise>>, tweak?: (q: Q, k: number) => number | undefined) {
  const out: Record<string, unknown> = {};
  src.questions.forEach((q, k) => {
    const row = db.questions[k];
    if (q.kind === "numeric") out[row.id] = { value: tweak?.(q, k) ?? q.expected };
    if (q.kind === "qcm") out[row.id] = { choices: [row.answers[q.choices!.findIndex((c) => c.correct)].id] };
  });
  return out;
}

d("cours de l'enseignant en base", () => {
  it("chapitres, leçons et exercices publiés, lisibles par un visiteur", async () => {
    const anon = anonClient();
    for (const item of COURS_ENSEIGNANT) {
      const { data, error } = await anon
        .from("chapters")
        .select("slug, status, subjects!inner(slug), lessons(slug, kind), exercises(title)")
        .eq("slug", item.chapter.slug)
        .eq("subjects.slug", item.subject)
        .single();
      expect(error).toBeNull();
      expect(data!.status).toBe("published");
      expect(data!.lessons.map((l: { slug: string }) => l.slug).sort()).toEqual(item.lessons.map((l) => l.slug).sort());
      expect(data!.exercises.map((e: { title: string }) => e.title).sort()).toEqual(item.exercises.map((e) => e.title).sort());
    }
    // les clés de correction restent invisibles
    const keys = await anon.from("question_keys").select("expected_value").limit(1);
    expect(keys.data ?? []).toEqual([]);
  });

  it.each(EXERCISES.map((e) => [e.title, e] as const))("%s : les réponses attendues obtiennent la note maximale", async (_t, src) => {
    const ex = await loadExercise(src.title);
    expect(ex.questions.map((q) => q.kind)).toEqual(src.questions.map((q) => q.kind));
    const { data, error } = await student.client.rpc("submit_attempt", { p_exercise_id: ex.id, p_responses: responses(src, ex) });
    expect(error).toBeNull();
    expect(data.max).toBe(src.questions.length);
    expect(data.score).toBe(data.max);
    expect(data.correction.resultat_md.length).toBeGreaterThan(10);
  });

  it("signe et tolérance : −900 N·m attendu, +900 et un écart de 3 % refusés", async () => {
    const src = EXERCISES.find((e) => e.title === "Torseurs et liaisons (MS1)")!;
    const ex = await loadExercise(src.title);
    const flipped = await student.client.rpc("submit_attempt", { p_exercise_id: ex.id, p_responses: responses(src, ex, (q, k) => (k === 0 ? 900 : undefined)) });
    expect(flipped.data.score).toBe(src.questions.length - 1);
    const warren = EXERCISES.find((e) => e.title.startsWith("Treillis Warren"))!;
    const exW = await loadExercise(warren.title);
    const off = await student.client.rpc("submit_attempt", { p_exercise_id: exW.id, p_responses: responses(warren, exW, (q) => (q.kind === "numeric" ? q.expected! * 1.03 : undefined)) });
    const numeric = warren.questions.filter((q) => q.kind === "numeric").length;
    expect(off.data.score).toBe(warren.questions.length - numeric);
  });
});
