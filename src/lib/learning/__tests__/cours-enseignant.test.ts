/**
 * Contenus chargés en base (supabase/content/*.mjs) : structure conforme aux
 * contraintes du schéma, formules KaTeX valides, et valeurs attendues des
 * exercices tirés des cours MS1–MS3 recalculées par le moteur de calcul ou
 * par les formules du cours.
 */
import { describe, expect, it } from "vitest";
import katex from "katex";
import { analyze } from "@/lib/mechanics/solver";
import { analyzeBeam } from "@/lib/mechanics/beam";
import { truss } from "@/lib/mechanics/presets";
import { CONTENT as INITIAL } from "../../../../supabase/content/initial-content.mjs";
import { COURS_ENSEIGNANT } from "../../../../supabase/content/cours-enseignant.mjs";

type Question = { kind: string; prompt: string; unit?: string; expected?: number; tol?: number; choices?: { label: string; correct: boolean }[]; explanation?: string; model?: string };
type Exercise = { title: string; difficulty: string; statement: string; data: string; questions: Question[]; correction: Record<string, string> };
type Item = {
  subject: string;
  chapter: { slug: string; title: string; summary: string; level: string; position?: number };
  lessons: { slug: string; kind: string; title: string; summary: string; minutes: number; body: string }[];
  exercise?: Exercise;
  exercises?: Exercise[];
};

const ALL = [...(INITIAL as Item[]), ...(COURS_ENSEIGNANT as Item[])];
const SUBJECTS = ["mecanique-structures", "rdm", "statique", "beton-arme", "geotechnique", "materiaux", "topographie", "thermique", "construction-durable", "lecture-plans"];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const LEVELS = ["debutant", "intermediaire", "avance"];
const exercisesOf = (i: Item) => i.exercises ?? (i.exercise ? [i.exercise] : []);

/** Segments mathématiques ($…$ et $$…$$) d'un texte Markdown. */
function mathSegments(md: string): { tex: string; display: boolean }[] {
  const out: { tex: string; display: boolean }[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  for (let m; (m = re.exec(md)); ) out.push(m[1] !== undefined ? { tex: m[1], display: true } : { tex: m[2], display: false });
  return out;
}

function allTexts(i: Item): string[] {
  const t = [i.chapter.title, i.chapter.summary, ...i.lessons.flatMap((l) => [l.title, l.summary, l.body])];
  for (const e of exercisesOf(i)) {
    t.push(e.statement, e.data, ...Object.values(e.correction));
    for (const q of e.questions) t.push(q.prompt, q.explanation ?? "", q.model ?? "", ...(q.choices ?? []).map((c) => c.label));
  }
  return t;
}

describe("Contenus chargés en base : conformité au schéma", () => {
  it("matières, slugs, niveaux et longueurs respectent les contraintes", () => {
    for (const i of ALL) {
      expect(SUBJECTS).toContain(i.subject);
      expect(i.chapter.slug).toMatch(SLUG);
      expect(i.chapter.slug.length).toBeLessThanOrEqual(80);
      expect(i.chapter.title.length).toBeGreaterThanOrEqual(2);
      expect(i.chapter.title.length).toBeLessThanOrEqual(160);
      expect(i.chapter.summary.length).toBeLessThanOrEqual(1000);
      expect(LEVELS).toContain(i.chapter.level);
      for (const l of i.lessons) {
        expect(l.slug).toMatch(SLUG);
        expect(["cours", "fiche"]).toContain(l.kind);
        expect(l.title.length).toBeLessThanOrEqual(160);
        expect(l.summary.length).toBeLessThanOrEqual(1000);
        expect(l.body.length).toBeLessThanOrEqual(200_000);
        expect(l.minutes).toBeGreaterThanOrEqual(1);
        expect(l.minutes).toBeLessThanOrEqual(240);
      }
      for (const e of exercisesOf(i)) {
        expect(LEVELS).toContain(e.difficulty);
        expect(e.title.length).toBeLessThanOrEqual(160);
        expect(e.statement.length).toBeLessThanOrEqual(50_000);
        expect(e.data.length).toBeLessThanOrEqual(20_000);
        expect(Object.keys(e.correction).sort()).toEqual(["calculs", "donnees", "equations", "resultat", "schema", "verification"]);
        for (const v of Object.values(e.correction)) expect(v.trim().length).toBeGreaterThan(0);
        for (const q of e.questions) {
          expect(["qcm", "numeric", "free"]).toContain(q.kind);
          expect((q.unit ?? "").length).toBeLessThanOrEqual(30);
          if (q.kind === "numeric") {
            expect(Number.isFinite(q.expected)).toBe(true);
            expect(q.tol ?? 0.01).toBeGreaterThanOrEqual(0);
            expect(q.tol ?? 0.01).toBeLessThanOrEqual(0.5);
          }
          if (q.kind === "qcm") {
            expect(q.choices!.length).toBeGreaterThanOrEqual(2);
            expect(q.choices!.filter((c) => c.correct).length).toBe(1);
          }
        }
      }
    }
  });

  it("identifiants uniques (chapitre par matière, leçon et exercice par chapitre)", () => {
    const chapters = ALL.map((i) => `${i.subject}/${i.chapter.slug}`);
    expect(new Set(chapters).size).toBe(chapters.length);
    for (const i of ALL) {
      const slugs = i.lessons.map((l) => l.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
      const titles = exercisesOf(i).map((e) => e.title);
      expect(new Set(titles).size).toBe(titles.length);
    }
  });

  it("toutes les formules se compilent avec KaTeX", () => {
    const errors: string[] = [];
    let count = 0;
    for (const i of ALL) {
      for (const text of allTexts(i)) {
        for (const s of mathSegments(text)) {
          count++;
          try {
            katex.renderToString(s.tex, { displayMode: s.display, throwOnError: true, strict: "ignore" });
          } catch (e) {
            errors.push(`${i.chapter.slug} : ${s.tex.slice(0, 60)} → ${(e as Error).message.slice(0, 80)}`);
          }
        }
        expect(text).not.toContain("undefined");
      }
    }
    expect(errors).toEqual([]);
    expect(count).toBeGreaterThan(500);
  });
});

/* ------------------------------------------------------------------ */

function exercise(title: string): Exercise {
  for (const i of COURS_ENSEIGNANT as Item[]) for (const e of exercisesOf(i)) if (e.title === title) return e;
  throw new Error(`exercice introuvable : ${title}`);
}
/** Valeurs attendues des questions numériques, dans l'ordre. */
const expected = (title: string) => exercise(title).questions.filter((q) => q.kind === "numeric").map((q) => q.expected!);
const close = (a: number, b: number, tol = 1e-3) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));

describe("Cours MS1 — statique", () => {
  it("Varignon : M_B = M_A + BA ∧ R", () => {
    const BA = [1.5, 0], R = [0, -600];
    const MBz = BA[0] * R[1] - BA[1] * R[0];
    const [m, degree] = expected("Torseurs et liaisons (MS1)");
    close(MBz, -900);
    close(m, MBz);
    // encastrement (3) + appui simple glissant (1) − 3 équations
    expect(degree).toBe(3 + 1 - 3);
    // exemple de la leçon : 400 N à 2 m
    close(2 * -400, -800);
  });

  it("console sous une force en bout : réactions et torseur de cohésion (moteur de calcul)", () => {
    const L = 3, F = 10;
    const an = analyzeBeam({ length: L, E: 210e6, A: 1e-2, I: 1e-4, supports: [{ id: "A", x: 0, type: "fixed" }], hinges: [], loads: [{ id: "F", kind: "point", x: L, F, angle: -90 }] });
    expect(an.result.ok).toBe(true);
    if (!an.result.ok) return;
    const rA = an.result.reactions[an.built.nodeIdAt(0)!];
    const [YA, MA, Ty, Mf1] = expected("Torseur de cohésion d'une console (MS1)");
    close(rA.ry, YA);
    close(rA.mz, MA);
    // Ty (cours) = −Σ forces sur le tronçon gauche = −V (moteur)
    close(-an.at(1.5).V, Ty);
    close(an.at(1).M, Mf1);
    close(an.at(0.0001).M, -F * L, 1e-3);
  });

  it("application du polycopié : console ABC, charge p et forces F en B et C (moteur de calcul)", () => {
    const L = 2, p = 5, F = 8;
    const an = analyzeBeam({
      length: 2 * L, E: 210e6, A: 1e-2, I: 1e-4,
      supports: [{ id: "A", x: 0, type: "fixed" }],
      hinges: [],
      loads: [
        { id: "p", kind: "dist", x1: 0, x2: 2 * L, q1: p, q2: p },
        { id: "FB", kind: "point", x: L, F, angle: -90 },
        { id: "FC", kind: "point", x: 2 * L, F, angle: -90 },
      ],
    });
    expect(an.result.ok).toBe(true);
    if (!an.result.ok) return;
    const Mf = (x: number) => (x > L ? -p * (2 * L - x) ** 2 / 2 - F * (2 * L - x) : -p * (2 * L - x) ** 2 / 2 - F * (2 * L - x) - F * (L - x));
    const Ty = (x: number) => (x > L ? -p * (2 * L - x) - F : -p * (2 * L - x) - 2 * F);
    for (const x of [0.3, 1, 1.7, 2.5, 3.2, 3.9]) {
      close(an.at(x).M, Mf(x));
      close(-an.at(x).V, Ty(x));
    }
    const rA = an.result.reactions[an.built.nodeIdAt(0)!];
    close(rA.ry, 2 * p * L + 2 * F);
    close(rA.mz, 2 * p * L * L + 3 * F * L);
  });
});

describe("Cours MS1 — systèmes réticulés (poutre Warren)", () => {
  const F = 12, L = 3, h = (L * Math.sqrt(3)) / 2;
  const st = truss({ type: "warren", panels: 3, span: 3 * L, height: h, E: 210e6, A: 1e-3, P: F, loadedChord: "top" });
  const res = analyze(st);
  if (!res.ok) throw new Error(res.error);
  /** Effort normal (moteur : N > 0 en traction). */
  const N = (id: string) => res.members[id].forcesAt(res.members[id].L / 2).N;
  // numérotation du cours : 1 = AC, 2 = AD, 3 = CD, 4 = CE, 5 = DE, 6 = DF
  const bar = { 1: "dl0", 2: "b0", 3: "dr0", 4: "t0", 5: "dl1", 6: "b1" } as const;

  it("géométrie et isostaticité : n = 7, b = 11 = 2n − 3", () => {
    expect(st.nodes.length).toBe(7);
    expect(st.members.length).toBe(11);
    expect(st.members.length).toBe(2 * st.nodes.length - 3);
    expect(res.hyperstaticity.classification).toBe("isostatique");
    for (const m of st.members) {
      const a = st.nodes.find((n) => n.id === m.i)!, b = st.nodes.find((n) => n.id === m.j)!;
      close(Math.hypot(b.x - a.x, b.y - a.y), L); // triangles équilatéraux
    }
  });

  it("efforts du moteur = formules du cours = valeurs attendues de l'exercice", () => {
    const [YA, n1, n2, n4, n5, n6] = expected("Treillis Warren : nœuds et coupure de Ritter (MS1)");
    close(res.reactions.B0.ry, YA);
    close(YA, (3 * F) / 2);
    // compression < 0 dans le moteur
    close(N(bar[1]), -F * Math.sqrt(3));
    close(N(bar[2]), (F * Math.sqrt(3)) / 2);
    close(N(bar[3]), F / Math.sqrt(3));
    close(N(bar[4]), (-2 * F) / Math.sqrt(3));
    close(N(bar[5]), -F / Math.sqrt(3));
    close(N(bar[6]), (5 * F) / (2 * Math.sqrt(3)));
    close(Math.abs(N(bar[1])), n1);
    close(Math.abs(N(bar[2])), n2);
    close(Math.abs(N(bar[4])), n4);
    close(Math.abs(N(bar[5])), n5);
    close(Math.abs(N(bar[6])), n6);
  });

  it("écart du polycopié : F5 = −F et F6 = (3 + 4√3)F/6 ne vérifient pas l'équilibre de la coupure", () => {
    const sin60 = Math.sqrt(3) / 2;
    const sumFy = (F5: number) => (3 * F) / 2 - F + F5 * sin60;
    expect(Math.abs(sumFy(-F))).toBeGreaterThan(1); // valeur du polycopié
    close(sumFy(-F / Math.sqrt(3)), 0, 1e-9); // valeur corrigée
    close(N(bar[6]), (5 * Math.sqrt(3) * F) / 6);
    expect(Math.abs(N(bar[6]) - ((3 + 4 * Math.sqrt(3)) * F) / 6)).toBeGreaterThan(1);
  });
});

describe("Cours MS3 — flambement", () => {
  const E = 210_000, fe = 235, L = 4000, A = 2850, I = 142.4e4; // MPa, mm, mm², mm⁴
  it("IPE 200 bi-articulé : N_E, i, λ, σ_E, λk et poteau console", () => {
    const NE = (Math.PI ** 2 * E * I) / L ** 2;
    const i = Math.sqrt(I / A);
    const lambda = L / i;
    const sigma = (Math.PI ** 2 * E) / lambda ** 2;
    const lk = Math.PI * Math.sqrt(E / fe);
    const NconsoleCr = (Math.PI ** 2 * E * I) / (2 * L) ** 2;
    const [eNE, ei, el, es, elk, ec] = expected("Flambement d'un poteau IPE 200 (MS3)");
    close(NE / 1000, eNE);
    close(i, ei);
    close(lambda, el);
    close(sigma, es);
    close(NE / A, sigma, 1e-9);
    close(lk, elk);
    close(NconsoleCr / 1000, ec);
    expect(lambda).toBeGreaterThan(lk);
    expect(lk).toBeGreaterThan(93.5); // le polycopié indique « ≅ 93 »
  });

  it("longueurs de flambement : l_f = L/√m", () => {
    close(1 / Math.sqrt(4), 0.5);
    close(1 / Math.sqrt(1 / 4), 2);
    // articulée–encastrée : m = (4,4934/π)² ≈ 2,046 ; l_f ≈ 0,6992 L (0,7 L à 0,12 % près)
    const m = (4.493409 / Math.PI) ** 2;
    close(1 / Math.sqrt(m), 0.7, 0.0015);
  });
});

describe("Cours MS2 — sections et contraintes", () => {
  it("section en T : A, S_Oz, y_G, I_Gz (Huygens) et contrôle par I_Oz − A·y_G²", () => {
    const parts = [
      { b: 40, h: 160, y: 80 },
      { b: 200, h: 40, y: 180 },
    ];
    const A = parts.reduce((s, p) => s + p.b * p.h, 0);
    const S = parts.reduce((s, p) => s + p.b * p.h * p.y, 0);
    const yG = S / A;
    const IG = parts.reduce((s, p) => s + (p.b * p.h ** 3) / 12 + p.b * p.h * (p.y - yG) ** 2, 0);
    const IO = parts.reduce((s, p) => s + (p.b * p.h ** 3) / 12 + p.b * p.h * p.y ** 2, 0);
    close(IO - A * yG ** 2, IG, 1e-9);
    const [eA, eS, eyG, eI] = expected("Section en T : centre de gravité et moment quadratique (MS2)");
    close(A, eA);
    close(S, eS);
    close(yG, eyG);
    close(IG / 1e4, eI); // mm⁴ → cm⁴
    // exemple de la leçon : rectangle 100 × 200, Huygens vers la base = bh³/3
    close((100 * 200 ** 3) / 12 + 100 * 200 * 100 ** 2, (100 * 200 ** 3) / 3, 1e-12);
  });

  it("contrainte moyenne et vecteur contrainte sur une facette inclinée", () => {
    const [eSig, eKpa, eCx, eCy, eSn] = expected("Contrainte moyenne et vecteur contrainte (MS2)");
    close(50_000 / 400, eSig);
    close((50_000 / 400) * 1000, eKpa);
    const sxx = 120, syy = 0, txy = 40, t = Math.PI / 6;
    const n = [Math.cos(t), Math.sin(t)];
    const C = [sxx * n[0] + txy * n[1], txy * n[0] + syy * n[1]];
    close(C[0], eCx);
    close(C[1], eCy);
    const sn = C[0] * n[0] + C[1] * n[1];
    close(sn, eSn);
    close(sn, sxx * Math.cos(t) ** 2 + syy * Math.sin(t) ** 2 + 2 * txy * Math.sin(t) * Math.cos(t), 1e-12);
    close(60_000 / 500, 120); // exemple de la leçon
  });
});
