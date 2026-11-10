import { describe, expect, it } from "vitest";
import { buildExamItems, examSpec, gradeExam, gradeGenerator, gradeQuiz, SUBJECT_OF_MODULE } from "../builtin";
import { streakFromDays } from "../stats";
import { GENERATORS } from "@/lib/exercises/generators";
import { CHAPTER_CONTENT } from "@/content/chapters";
import { MODULES } from "@/content/modules";

describe("correction côté serveur du cursus intégré", () => {
  it("chaque module est rattaché à une matière", () => {
    for (const m of MODULES) expect(SUBJECT_OF_MODULE[m.slug], m.slug).toBeTruthy();
  });

  it("exercices générés : les bonnes réponses valent tous les points, les autres aucun", () => {
    for (const g of GENERATORS) {
      const ex = g.generate(4242);
      const right = Object.fromEntries(ex.questions.map((q) => [q.key, q.answer]));
      const wrong = Object.fromEntries(ex.questions.map((q) => [q.key, q.answer * 3 + 17]));
      expect(gradeGenerator(g.id, 4242, right)!.score, g.id).toBe(ex.questions.length);
      expect(gradeGenerator(g.id, 4242, wrong)!.score, g.id).toBe(0);
      expect(gradeGenerator(g.id, 4242, {})!.score).toBe(0);
    }
    expect(gradeGenerator("inconnu", 1, {})).toBeNull();
    expect(gradeGenerator(GENERATORS[0].id, -5, {})).toBeNull();
  });

  it("quiz : la note est recalculée à partir des choix", () => {
    const [id, content] = Object.entries(CHAPTER_CONTENT).find(([, c]) => c.quiz.length > 0)!;
    const good = content.quiz.map((q) => q.answer);
    expect(gradeQuiz(id, good)!.score).toBe(content.quiz.length);
    expect(gradeQuiz(id, good.map((a) => (a + 1) % 4))!.score).toBe(0);
    expect(gradeQuiz(id, [0])).toBeNull(); // nombre de réponses incohérent
  });

  it("examen : tirage identique côté serveur et navigateur, note recalculée", () => {
    const m = MODULES.find((x) => examSpec(x.id)!.pool.length >= 8)!;
    const spec = examSpec(m.id)!;
    const items = buildExamItems(spec.pool, spec.generators, 777);
    expect(buildExamItems(spec.pool, spec.generators, 777)).toEqual(items);
    const quiz: Record<string, number> = {};
    const exercises: Record<string, Record<string, number>> = {};
    items.forEach((it, i) => {
      if (it.kind === "quiz") quiz[String(i)] = it.q.answer;
      else exercises[String(i)] = Object.fromEntries(GENERATORS.find((g) => g.id === it.gen)!.generate(it.seed).questions.map((q) => [q.key, q.answer]));
    });
    const r = gradeExam(m.id, 777, quiz, exercises)!;
    expect(r.score).toBe(r.max);
    expect(r.passed).toBe(true);
    expect(gradeExam(m.id, 777, {}, {})!.score).toBe(0);
  });

  it("série de jours d'activité", () => {
    const today = new Date("2026-11-10T10:00:00Z");
    expect(streakFromDays(["2026-11-08", "2026-11-09", "2026-11-10"], today)).toEqual({ current: 3, activeToday: true });
    expect(streakFromDays(["2026-11-08", "2026-11-09"], today)).toEqual({ current: 2, activeToday: false });
    expect(streakFromDays(["2026-11-01"], today).current).toBe(0);
  });
});
