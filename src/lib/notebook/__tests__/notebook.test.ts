import { describe, expect, it } from "vitest";
import { analyzeBeam, type BeamLoad, type BeamModel } from "@/lib/mechanics/beam";
import { BEAM_PRESETS } from "@/components/simulator/beam-presets";
import { cutEquations, cutsMarkdown, namedReactions, pevalAt, pfsMarkdown, polyTexN, segmentBounds, texn } from "../beam-notes";
import { demoNotebook } from "../demo";
import { eraseFromStroke, elementBounds, hitElement, insideLasso, scaleElement, translateElement } from "../geometry";
import { makeExport, newNotebook, parseExport } from "../model";
import { recognizeShape } from "../recognize";
import { SNIPPETS } from "../formulas";
import { SYMBOLS, symbolDef } from "../symbols";
import type { StrokeEl, SymbolEl } from "../types";

const STEEL = { E: 210e6, A: 53.8e-4, I: 8356e-8 };

/** Compare N, T = −V et M des équations de coupure au solveur, à l'intérieur de chaque tronçon. */
function checkAgainstSolver(model: BeamModel) {
  const an = analyzeBeam(model);
  expect(an.result.ok).toBe(true);
  const cuts = cutEquations(model, an);
  expect(cuts.length).toBe(segmentBounds(model).length - 1);
  const scale = Math.max(1, ...an.points.map((p) => Math.max(Math.abs(p.M), Math.abs(p.V), Math.abs(p.N))));
  for (const c of cuts) {
    for (const t of [0.13, 0.5, 0.87]) {
      const x = c.x0 + t * (c.x1 - c.x0);
      const ref = an.at(x);
      expect(pevalAt(c.N, x)).toBeCloseTo(ref.N, 6);
      expect(Math.abs(pevalAt(c.T, x) - -ref.V)).toBeLessThan(1e-6 * scale);
      expect(Math.abs(pevalAt(c.M, x) - ref.M)).toBeLessThan(1e-6 * scale);
    }
  }
}

describe("coupures générées (beam-notes)", () => {
  it("concordent avec le solveur sur les cas types du simulateur", () => {
    for (const p of BEAM_PRESETS) checkAgainstSolver({ ...STEEL, ...p.draft });
  });

  it("concordent sur des cas variés : console, porte-à-faux, force inclinée, couple, charge triangulaire", () => {
    const cases: BeamModel[] = [
      {
        ...STEEL,
        length: 4,
        hinges: [],
        supports: [{ id: "A", x: 0, type: "fixed" }],
        loads: [
          { id: "q", kind: "dist", x1: 0, x2: 4, q1: 0, q2: 12 },
          { id: "F", kind: "point", x: 4, F: 10, angle: -60 },
          { id: "C", kind: "moment", x: 2, M: -8 },
        ],
      },
      {
        ...STEEL,
        length: 9,
        hinges: [],
        supports: [
          { id: "A", x: 1, type: "pin" },
          { id: "B", x: 7, type: "roller" },
        ],
        loads: [
          { id: "q", kind: "dist", x1: 0, x2: 9, q1: 6, q2: 2 },
          { id: "F", kind: "point", x: 9, F: 15, angle: -90 },
          { id: "H", kind: "point", x: 4, F: 5, angle: 180 },
          { id: "C", kind: "moment", x: 3, M: 12 },
        ],
      },
      {
        // poutre continue sur 3 appuis (hyperstatique)
        ...STEEL,
        length: 10,
        hinges: [],
        supports: [
          { id: "A", x: 0, type: "pin" },
          { id: "B", x: 5, type: "roller" },
          { id: "C", x: 10, type: "roller" },
        ],
        loads: [{ id: "q", kind: "dist", x1: 0, x2: 10, q1: 8, q2: 8 }],
      },
      {
        // poutre Gerber : encastrement, rotule, appui simple
        ...STEEL,
        length: 8,
        hinges: [{ id: "R", x: 3 }],
        supports: [
          { id: "A", x: 0, type: "fixed" },
          { id: "B", x: 8, type: "roller" },
        ],
        loads: [
          { id: "q", kind: "dist", x1: 2, x2: 8, q1: 5, q2: 5 },
          { id: "F", kind: "point", x: 5, F: 20, angle: -90 },
        ],
      },
    ];
    for (const m of cases) checkAgainstSolver(m);
  });

  it("concordent sur des poutres aléatoires", () => {
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (let k = 0; k < 60; k++) {
      const L = 2 + Math.round(rnd() * 16) / 2;
      const loads: BeamLoad[] = [];
      const n = 1 + Math.floor(rnd() * 4);
      for (let i = 0; i < n; i++) {
        const kind = rnd();
        const x = Math.round(rnd() * L * 4) / 4;
        if (kind < 0.4) loads.push({ id: `F${i}`, kind: "point", x, F: 1 + Math.round(rnd() * 40), angle: rnd() < 0.7 ? -90 : -30 - Math.round(rnd() * 120) });
        else if (kind < 0.8) {
          const x2 = Math.round((x + rnd() * (L - x)) * 4) / 4;
          if (x2 - x > 0.2) loads.push({ id: `q${i}`, kind: "dist", x1: x, x2, q1: Math.round(rnd() * 20), q2: Math.round(rnd() * 20) });
        } else loads.push({ id: `C${i}`, kind: "moment", x, M: Math.round((rnd() - 0.5) * 40) });
      }
      const type = rnd();
      const supports: BeamModel["supports"] =
        type < 0.5
          ? [
              { id: "A", x: 0, type: "pin" },
              { id: "B", x: L, type: "roller" },
            ]
          : type < 0.75
            ? [{ id: "A", x: rnd() < 0.5 ? 0 : L, type: "fixed" }]
            : [
                { id: "A", x: Math.round(rnd() * L * 0.3 * 4) / 4, type: "pin" },
                { id: "B", x: L - Math.round(rnd() * L * 0.3 * 4) / 4, type: "roller" },
              ];
      if (supports.length === 2 && supports[1].x - supports[0].x < 0.5) continue;
      checkAgainstSolver({ ...STEEL, length: L, hinges: [], supports, loads });
    }
  });

  it("rédige l'équilibre de la partie gauche comme au tableau", () => {
    const model: BeamModel = {
      ...STEEL,
      length: 8,
      hinges: [],
      supports: [
        { id: "A", x: 0, type: "pin" },
        { id: "B", x: 8, type: "roller" },
      ],
      loads: [
        { id: "q", kind: "dist", x1: 0, x2: 8, q1: 5, q2: 5 },
        { id: "P", kind: "point", x: 5, F: 20, angle: -90 },
      ],
    };
    const an = analyzeBeam(model);
    const r = namedReactions(an);
    expect(r.map((x) => x.letter)).toEqual(["A", "B"]);
    expect(r[0].V).toBeCloseTo(27.5, 9);
    const [c1, c2] = cutEquations(model, an);
    expect(c1.eqT).toBe("T(x) + V_A - 5\\,x = 0");
    expect(c1.eqM).toBe("M(x) - V_A\\,x + 5\\,\\dfrac{x^{2}}{2} = 0");
    expect(polyTexN(c1.T)).toBe("-27{,}5 + 5\\,x");
    // exemple du cours (chapitre torseur de cohésion) : T(3) = −12,5 kN ; M(3) = 60 kN·m
    expect(pevalAt(c1.T, 3)).toBeCloseTo(-12.5, 9);
    expect(pevalAt(c1.M, 3)).toBeCloseTo(60, 9);
    expect(c2.eqT).toBe("T(x) + V_A - 5\\,x - 20 = 0");
    expect(c2.eqM).toContain("+ 20\\,(x - 5)");
    const md = cutsMarkdown(model, an);
    expect(md).toContain("Tronçon 2");
    expect(pfsMarkdown(model, an)).toContain("V_A = 27{,}5");
  });

  it("formate les nombres à la française sans zéros inutiles", () => {
    expect(texn(27.5)).toBe("27{,}5");
    expect(texn(20)).toBe("20");
    expect(texn(-0.0000001)).toBe("0");
    expect(texn(1234.5)).toBe("1\\,234{,}5");
  });
});

describe("géométrie", () => {
  const stroke: StrokeEl = { id: "s", type: "stroke", tool: "pen", color: "#000", size: 2, pressure: false, pts: [0, 0, 0.5, 50, 0, 0.5, 100, 0, 0.5] };

  it("la gomme précise coupe un trait en deux morceaux", () => {
    const runs = eraseFromStroke(stroke, 50, -10, 50, 10, 5);
    expect(runs).not.toBeNull();
    expect(runs!.length).toBe(2);
    expect(Math.max(...runs![0].filter((_, i) => i % 3 === 0))).toBeLessThan(50);
    expect(Math.min(...runs![1].filter((_, i) => i % 3 === 0))).toBeGreaterThan(50);
    expect(eraseFromStroke(stroke, 50, 40, 60, 40, 5)).toBeNull();
  });

  it("lasso, déplacement et mise à l'échelle", () => {
    expect(insideLasso(stroke, [-10, -10, 110, -10, 110, 10, -10, 10])).toBe(true);
    expect(insideLasso(stroke, [60, -10, 110, -10, 110, 10, 60, 10])).toBe(false);
    const moved = translateElement(stroke, 10, 5);
    expect(moved.pts.slice(0, 2)).toEqual([10, 5]);
    const big = scaleElement(stroke, 2, 0, 0);
    expect(big.pts[6]).toBe(200);
    expect(big.size).toBe(4);
  });

  it("toucher un symbole pivoté", () => {
    const s: SymbolEl = { id: "f", type: "symbol", kind: "force", x: 100, y: 100, rot: 90, scale: 1, color: "#000", len: 60 };
    // force vers le bas pivotée de 90° (sens horaire à l'écran) : la flèche part de la droite
    expect(hitElement(s, 130, 100, 2)).toBe(true);
    expect(hitElement(s, 100, 70, 2)).toBe(false);
    const b = elementBounds(s);
    expect(b.x).toBeGreaterThanOrEqual(99);
    expect(b.x + b.w).toBeGreaterThan(155);
  });
});

describe("reconnaissance de formes", () => {
  const sample = (fn: (t: number) => [number, number], n = 60) => Array.from({ length: n + 1 }, (_, i) => [...fn(i / n), 0.5]).flat();
  it("droite", () => {
    expect(recognizeShape(sample((t) => [t * 200, 100 + Math.sin(t * 30) * 1.5]))?.shape).toBe("line");
  });
  it("cercle", () => {
    const r = recognizeShape(sample((t) => [100 + 50 * Math.cos(t * 2 * Math.PI), 100 + 50 * Math.sin(t * 2 * Math.PI)]));
    expect(r?.shape).toBe("ellipse");
  });
  it("rectangle et triangle", () => {
    const rect = (t: number): [number, number] => {
      const p = t * 4;
      if (p < 1) return [p * 200, 0];
      if (p < 2) return [200, (p - 1) * 100];
      if (p < 3) return [200 - (p - 2) * 200, 100];
      return [0, 100 - (p - 3) * 100];
    };
    expect(recognizeShape(sample(rect, 80))?.shape).toBe("rect");
    const tri = (t: number): [number, number] => {
      const p = t * 3;
      if (p < 1) return [p * 100, 100 - p * 100];
      if (p < 2) return [100 + (p - 1) * 100, (p - 1) * 100];
      return [200 - (p - 2) * 200, 100];
    };
    expect(recognizeShape(sample(tri, 90))?.shape).toBe("triangle");
  });
  it("gribouillis : pas de forme", () => {
    expect(recognizeShape(sample((t) => [t * 100 + Math.sin(t * 40) * 30, Math.cos(t * 23) * 40 + t * 20]))).toBeNull();
  });
});

describe("cahiers : sauvegarde et contenus", () => {
  it("export puis import d'un cahier (nouveaux identifiants)", () => {
    const nb = demoNotebook();
    const back = parseExport(makeExport([nb, newNotebook("Vide", "#000")]));
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.notebooks).toHaveLength(2);
    expect(back.notebooks[0].id).not.toBe(nb.id);
    expect(back.notebooks[0].pages).toHaveLength(nb.pages.length);
  });

  it("refuse les fichiers étrangers ou corrompus", () => {
    expect(parseExport("pas du json").ok).toBe(false);
    expect(parseExport(JSON.stringify({ app: "autre", version: 1, notebooks: [] })).ok).toBe(false);
    const nb = newNotebook("x", "#000");
    nb.pages[0].elements.push({ id: "i", type: "image", x: 0, y: 0, w: 10, h: 10, src: "javascript:alert(1)" });
    expect(parseExport(makeExport([nb])).ok).toBe(false);
  });

  it("symboles : identifiants uniques, boîtes finies", () => {
    expect(new Set(SYMBOLS.map((s) => s.kind)).size).toBe(SYMBOLS.length);
    for (const d of SYMBOLS) {
      const b = d.box({ id: "x", type: "symbol", kind: d.kind, x: 0, y: 0, rot: 0, scale: 1, ...d.defaults });
      expect(Number.isFinite(b.x + b.y + b.w + b.h)).toBe(true);
      expect(b.w).toBeGreaterThan(0);
      expect(b.h).toBeGreaterThan(0);
      expect(symbolDef(d.kind)).toBe(d);
    }
    expect(new Set(SNIPPETS.map((s) => s.id)).size).toBe(SNIPPETS.length);
  });
});
