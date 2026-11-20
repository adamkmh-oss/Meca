import { describe, expect, it } from "vitest";
import { analyzeBeam, type BeamLoad, type BeamModel } from "@/lib/mechanics/beam";
import { BEAM_PRESETS } from "@/components/simulator/beam-presets";
import { literalFromNumeric, litCuts, litCutsMarkdown, litKeyValues, litPfsMarkdown, litReactions, litToModel, parseBeam, solveStatics, type LitBeam } from "../literal-beam";
import { tex } from "../symbolic";

const STEEL = { E: 210e6, A: 53.8e-4, I: 8356e-8 };

/** Le littéral évalué avec les valeurs de dessin doit redonner le calcul numérique. */
function check(model: BeamModel) {
  const lit = literalFromNumeric(model);
  const r = parseBeam(lit);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  const st = solveStatics(r.p);
  expect(st.ok, st.reason).toBe(true);
  const an = analyzeBeam(litToModel(lit, STEEL)!);
  expect(an.result.ok).toBe(true);
  if (!an.result.ok) return;
  const scale = Math.max(1, ...an.points.map((p) => Math.max(Math.abs(p.M), Math.abs(p.V), Math.abs(p.N))));
  // réactions
  for (const s of r.p.supports) {
    const id = an.built.nodeIdAt(s.xv)!;
    const ref = an.result.reactions[id];
    const V = st.values.get(`V_${s.letter}`);
    const H = st.values.get(`H_${s.letter}`);
    const M = st.values.get(`M_${s.letter}`);
    if (V) expect(Math.abs(V.eval(r.p.vals) - ref.ry)).toBeLessThan(1e-6 * scale);
    if (H) expect(Math.abs(H.eval(r.p.vals) - ref.rx)).toBeLessThan(1e-6 * scale);
    if (M) expect(Math.abs(M.eval(r.p.vals) - ref.mz)).toBeLessThan(1e-6 * scale);
  }
  // efforts internes
  for (const c of litCuts(r.p, st)) {
    for (const t of [0.2, 0.5, 0.8]) {
      const x = c.x0v + t * (c.x1v - c.x0v);
      const ref = an.at(x);
      const v = { ...r.p.vals, x };
      expect(Math.abs(c.N.eval(v) - ref.N)).toBeLessThan(1e-6 * scale);
      expect(Math.abs(c.T.eval(v) + ref.V)).toBeLessThan(1e-6 * scale);
      expect(Math.abs(c.M.eval(v) - ref.M)).toBeLessThan(1e-6 * scale);
    }
  }
}

describe("poutre en calcul littéral", () => {
  it("cas du cours : résultats en lettres", () => {
    const lit: LitBeam = {
      vars: [],
      length: "L",
      supports: [
        { id: "A", x: "0", type: "pin" },
        { id: "B", x: "L", type: "roller" },
      ],
      hinges: [],
      loads: [{ id: "q", kind: "dist", x1: "0", x2: "L", q1: "q", q2: "q" }],
    };
    expect(litReactions(lit).map((r) => `${r.sym}=${r.tex}`)).toEqual(["H_A=0", "V_A=\\dfrac{q L}{2}", "V_B=\\dfrac{q L}{2}"]);
    const pfs = litPfsMarkdown(lit);
    expect(pfs).toContain("V_{B} \\times L - q L \\times \\dfrac{L}{2} = 0");
    const cuts = litCutsMarkdown(lit);
    expect(cuts).toContain("T(x) = -\\dfrac{q L}{2} + q x");
    expect(cuts).toContain("M(x) = \\dfrac{q L x}{2} - \\dfrac{q x^{2}}{2}");
    expect(cuts).toContain("M_{max} = M(x_0) = \\dfrac{q L^{2}}{8}");
    expect(litKeyValues(lit, "M").map((k) => k.tex)).toContain("\\dfrac{q L^{2}}{8}");
    // aucune valeur numérique de dessin dans la rédaction
    expect(pfs + cuts).not.toMatch(/\d+[.,]\d/);
  });

  it("force en x = a : V_B = Fa/L, M sous la charge = Fa(L − a)/L", () => {
    const lit: LitBeam = {
      vars: [],
      length: "L",
      supports: [
        { id: "A", x: "0", type: "pin" },
        { id: "B", x: "L", type: "roller" },
      ],
      hinges: [],
      loads: [{ id: "F", kind: "point", x: "a", F: "F", angle: -90 }],
    };
    const r = parseBeam(lit);
    if (!r.ok) throw new Error();
    const st = solveStatics(r.p);
    expect(tex(st.values.get("V_B")!)).toBe("\\dfrac{F a}{L}");
    expect(tex(st.values.get("V_A")!)).toBe("F - \\dfrac{F a}{L}");
    const [c1] = litCuts(r.p, st);
    expect(tex(c1.M.subst("x", r.p.loads[0].kind === "point" ? r.p.loads[0].x : r.p.L))).toBe("F a - \\dfrac{F a^{2}}{L}");
  });

  it("poutre hyperstatique : signalée, sans valeurs", () => {
    const lit: LitBeam = {
      vars: [],
      length: "L",
      supports: [
        { id: "A", x: "0", type: "fixed" },
        { id: "B", x: "L", type: "roller" },
      ],
      hinges: [],
      loads: [{ id: "q", kind: "dist", x1: "0", x2: "L", q1: "q", q2: "q" }],
    };
    expect(litPfsMarkdown(lit)).toContain("hyperstatique");
  });

  it("console : réactions d'encastrement", () => {
    const lit: LitBeam = { vars: [], length: "L", supports: [{ id: "A", x: "0", type: "fixed" }], hinges: [], loads: [{ id: "F", kind: "point", x: "L", F: "F", angle: -90 }] };
    expect(litReactions(lit).map((r) => `${r.sym}=${r.tex}`)).toEqual(["H_A=0", "V_A=F", "M_A=F L"]);
  });

  it("concorde avec le solveur : cas types, Gerber, charges inclinées et triangulaires", () => {
    for (const p of BEAM_PRESETS) {
      const an = analyzeBeam({ ...STEEL, ...p.draft });
      // les cas hyperstatiques ne relèvent pas du calcul littéral par la statique
      if (an.result.ok && an.result.hyperstaticity.degree === 0) check({ ...STEEL, ...p.draft });
    }
    check({
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
    });
    check({
      ...STEEL,
      length: 9,
      hinges: [],
      supports: [
        { id: "A", x: 1, type: "pin" },
        { id: "B", x: 7, type: "roller" },
      ],
      loads: [
        { id: "q", kind: "dist", x1: 0, x2: 9, q1: 6, q2: 2 },
        { id: "F", kind: "point", x: 9, F: 15, angle: -60 },
        { id: "C", kind: "moment", x: 3, M: 12 },
      ],
    });
  });

  it("concorde avec le solveur sur des poutres aléatoires", () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (let k = 0; k < 50; k++) {
      const L = 2 + Math.round(rnd() * 16) / 2;
      const loads: BeamLoad[] = [];
      const n = 1 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) {
        const kind = rnd();
        const x = Math.round(rnd() * L * 4) / 4;
        if (kind < 0.4) loads.push({ id: `F${i}`, kind: "point", x, F: 1 + Math.round(rnd() * 40), angle: rnd() < 0.7 ? -90 : -45 });
        else if (kind < 0.8) {
          const x2 = Math.round((x + rnd() * (L - x)) * 4) / 4;
          if (x2 - x > 0.2) loads.push({ id: `q${i}`, kind: "dist", x1: x, x2, q1: Math.round(rnd() * 20), q2: Math.round(rnd() * 20) });
        } else loads.push({ id: `C${i}`, kind: "moment", x, M: Math.round((rnd() - 0.5) * 40) || 5 });
      }
      const fixed = rnd() < 0.35;
      const supports: BeamModel["supports"] = fixed
        ? [{ id: "A", x: rnd() < 0.5 ? 0 : L, type: "fixed" }]
        : [
            { id: "A", x: Math.round(rnd() * L * 0.3 * 4) / 4, type: "pin" },
            { id: "B", x: L - Math.round(rnd() * L * 0.3 * 4) / 4, type: "roller" },
          ];
      if (supports.length === 2 && supports[1].x - supports[0].x < 0.5) continue;
      check({ ...STEEL, length: L, hinges: [], supports, loads });
    }
  });
});
