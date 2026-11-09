import { describe, expect, it } from "vitest";
import { GENERATORS, checkAnswer } from "../generators";

describe("Générateurs d'exercices", () => {
  for (const g of GENERATORS) {
    it(`${g.id} : réponses finies et contrôle solveur concordant (200 tirages)`, () => {
      for (let seed = 1; seed <= 200; seed++) {
        const ex = g.generate(seed);
        expect(ex.questions.length).toBeGreaterThan(0);
        for (const q of ex.questions) {
          expect(Number.isFinite(q.answer), `${g.id}#${seed} ${q.key}`).toBe(true);
          expect(checkAnswer(q.answer, q.answer, q.rel, q.abs)).toBe(true);
        }
        const all = Object.values(ex.solution).join("\n");
        expect(all, `${g.id}#${seed}`).not.toContain("écart avec le solveur");
        expect(all).not.toMatch(/NaN|Infinity|undefined/);
        // reproductibilité
        expect(g.generate(seed).questions.map((q) => q.answer)).toEqual(ex.questions.map((q) => q.answer));
      }
    });
  }
  it("tolérance : 1 % accepté, 3 % refusé, signe exigé", () => {
    expect(checkAnswer(100.9, 100)).toBe(true);
    expect(checkAnswer(103, 100)).toBe(false);
    expect(checkAnswer(-100, 100)).toBe(false);
  });
});
