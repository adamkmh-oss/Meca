import { describe, expect, it } from "vitest";
import { ALL_CHAPTERS, AVAILABLE_CHAPTERS, MODULES } from "../modules";
import { CHAPTER_CONTENT } from "../chapters";
import { findGenerator } from "@/lib/exercises/generators";
import { GENERATORS } from "@/lib/exercises/generators";

describe("Contenus pédagogiques", () => {
  it("chaque chapitre disponible a un contenu, et réciproquement", () => {
    for (const c of AVAILABLE_CHAPTERS) expect(CHAPTER_CONTENT[c.id], c.id).toBeDefined();
    for (const id of Object.keys(CHAPTER_CONTENT)) expect(AVAILABLE_CHAPTERS.some((c) => c.id === id), id).toBe(true);
  });
  it("6 modules, identifiants de chapitres uniques", () => {
    expect(MODULES).toHaveLength(6);
    expect(new Set(ALL_CHAPTERS.map((c) => c.id)).size).toBe(ALL_CHAPTERS.length);
  });
  it("quiz bien formés (réponse valide, au moins 4 questions)", () => {
    for (const c of Object.values(CHAPTER_CONTENT)) {
      expect(c.quiz.length, c.id).toBeGreaterThanOrEqual(4);
      for (const q of c.quiz) {
        expect(q.answer, `${c.id}/${q.id}`).toBeGreaterThanOrEqual(0);
        expect(q.answer, `${c.id}/${q.id}`).toBeLessThan(q.choices.length);
      }
    }
  });
  it("exercices référencés existants, générateurs rattachés à un chapitre connu", () => {
    for (const c of Object.values(CHAPTER_CONTENT)) for (const e of c.exercises) expect(findGenerator(e), `${c.id} → ${e}`).toBeDefined();
    for (const g of GENERATORS) expect(ALL_CHAPTERS.some((c) => c.id === g.chapterId), g.id).toBe(true);
  });
});
