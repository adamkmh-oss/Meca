/**
 * Cursus intégré (code vérifié) : rattachement aux matières, composition
 * des examens et correction côté serveur à partir des mêmes générateurs que
 * l'interface. Aucune note n'est acceptée du navigateur : le serveur
 * recalcule tout à partir des réponses brutes.
 */
import { CHAPTER_CONTENT } from "@/content/chapters";
import { chapterById, MODULES } from "@/content/modules";
import type { QuizQuestion } from "@/content/types";
import { checkAnswer, findGenerator, GENERATORS, mulberry32 } from "@/lib/exercises/generators";

/** Matière de la plateforme à laquelle appartient chaque module du cursus intégré. */
export const SUBJECT_OF_MODULE: Record<string, string> = {
  fondamentaux: "statique",
  "reactions-appui": "statique",
  sollicitations: "mecanique-structures",
  structures: "mecanique-structures",
  rdm: "rdm",
  approfondissement: "mecanique-structures",
};

export function builtinChapter(chapterId: string) {
  const found = chapterById(chapterId);
  if (!found || !found.chapter.available) return null;
  return {
    ...found,
    subjectSlug: SUBJECT_OF_MODULE[found.module.slug] ?? "mecanique-structures",
    href: `/cours/${found.module.slug}/${found.chapter.slug}`,
  };
}

export function moduleById(moduleId: string) {
  return MODULES.find((m) => m.id === moduleId);
}

export function subjectOfModule(moduleId: string): string {
  const m = moduleById(moduleId);
  return (m && SUBJECT_OF_MODULE[m.slug]) || "mecanique-structures";
}

/* ------------------------------ Exercices ------------------------------ */
export type NumericValues = Record<string, number | null>;

export function gradeGenerator(generatorId: string, seed: number, values: NumericValues) {
  const gen = findGenerator(generatorId);
  if (!gen || !Number.isInteger(seed) || seed < 1 || seed > 1_000_000_000) return null;
  const ex = gen.generate(seed);
  const results = ex.questions.map((q) => {
    const v = values[q.key];
    const ok = typeof v === "number" && Number.isFinite(v) && checkAnswer(v, q.answer, q.rel, q.abs);
    return { key: q.key, given: typeof v === "number" && Number.isFinite(v) ? v : null, expected: q.answer, unit: q.unit ?? "", ok };
  });
  const ch = builtinChapter(gen.chapterId);
  return {
    generator: gen,
    score: results.filter((r) => r.ok).length,
    max: results.length,
    results,
    subjectSlug: ch?.subjectSlug ?? "mecanique-structures",
    chapterKey: `chapter:${gen.chapterId}`,
  };
}

/* -------------------------------- Quiz --------------------------------- */
export function gradeQuiz(chapterId: string, answers: number[]) {
  const ch = builtinChapter(chapterId);
  const quiz = CHAPTER_CONTENT[chapterId]?.quiz;
  if (!ch || !quiz?.length || answers.length !== quiz.length) return null;
  const results = quiz.map((q, i) => ({ index: i, given: answers[i], expected: q.answer, ok: answers[i] === q.answer }));
  return { chapter: ch, score: results.filter((r) => r.ok).length, max: quiz.length, results };
}

/* ------------------------------- Examens ------------------------------- */
export interface ExamQuizItem {
  kind: "quiz";
  q: QuizQuestion;
  chapter: string;
}
export interface ExamExerciseItem {
  kind: "exercise";
  gen: string;
  seed: number;
}
export type ExamItem = ExamQuizItem | ExamExerciseItem;

export function examSpec(moduleId: string) {
  const m = moduleById(moduleId);
  if (!m) return null;
  const pool = m.chapters.flatMap((c) => (CHAPTER_CONTENT[c.id]?.quiz ?? []).map((q) => ({ chapter: c.id, q })));
  const generators = GENERATORS.filter((g) => m.chapters.some((c) => c.id === g.chapterId)).map((g) => g.id);
  return { module: m, pool, generators };
}

/** Tirage déterministe : même graine → mêmes questions, côté navigateur comme côté serveur. */
export function buildExamItems(pool: { chapter: string; q: QuizQuestion }[], generators: string[], seed: number): ExamItem[] {
  const r = mulberry32(seed);
  const shuffled = [...pool].sort(() => r() - 0.5).slice(0, 8);
  const ex = [...generators].sort(() => r() - 0.5).slice(0, 2);
  return [
    ...shuffled.map((p) => ({ kind: "quiz" as const, q: p.q, chapter: p.chapter })),
    ...ex.map((g, k) => ({ kind: "exercise" as const, gen: g, seed: Math.floor(r() * 900000) + 1 + k })),
  ];
}

export function gradeExam(moduleId: string, seed: number, quizAnswers: Record<string, number>, exerciseValues: Record<string, NumericValues>) {
  const spec = examSpec(moduleId);
  if (!spec || !Number.isInteger(seed) || seed < 1 || seed > 1_000_000_000) return null;
  const items = buildExamItems(spec.pool, spec.generators, seed);
  let score = 0;
  let max = 0;
  const results = items.map((it, i) => {
    if (it.kind === "quiz") {
      max += 1;
      const ok = quizAnswers[String(i)] === it.q.answer;
      if (ok) score += 1;
      return { index: i, kind: "quiz", ok };
    }
    const g = gradeGenerator(it.gen, it.seed, exerciseValues[String(i)] ?? {});
    max += g?.max ?? 0;
    score += g?.score ?? 0;
    return { index: i, kind: "exercise", score: g?.score ?? 0, max: g?.max ?? 0 };
  });
  return { module: spec.module, score, max, results, passed: max > 0 && score / max >= 0.7 };
}
