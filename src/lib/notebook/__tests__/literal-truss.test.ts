import { describe, expect, it } from "vitest";
import { analyzeTruss, TRUSS_PRESETS, trussPreset } from "../truss";
import { litTrussMarkdown, litTrussPreset, litTrussToModel, literalTrussFromNumeric, parseTruss, solveLitTruss, type LitTruss } from "../literal-truss";
import { tex } from "../symbolic";

function check(lit: LitTruss) {
  const r = parseTruss(lit);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  const s = solveLitTruss(r.p);
  expect(s.ok, s.reason).toBe(true);
  const an = analyzeTruss(litTrussToModel(lit)!);
  expect(an.error).toBeUndefined();
  const scale = Math.max(1, ...Object.values(an.N).map(Math.abs));
  for (const b of lit.bars) expect(Math.abs(s.N.get(b.id)!.eval(r.p.vals) - an.N[b.id]), b.id).toBeLessThan(1e-6 * scale);
  if (an.result.ok) for (const [k, v] of s.reactions) {
    const node = k.slice(2);
    const ref = an.result.reactions[node];
    expect(Math.abs(v.eval(r.p.vals) - (k.startsWith("H") ? ref.rx : ref.ry))).toBeLessThan(1e-6 * scale);
  }
}

describe("treillis en calcul littéral", () => {
  it("cas types en lettres : concordent avec le solveur", () => {
    for (const { id } of TRUSS_PRESETS) for (const chord of ["top", "bottom"] as const) check(litTrussPreset(id, 4, chord));
    check(litTrussPreset("pratt", 6));
    check(litTrussPreset("warren", 5));
  });

  it("triangle : efforts en P et α", () => {
    const lit = litTrussPreset("triangle");
    const r = parseTruss(lit);
    if (!r.ok) throw new Error();
    const s = solveLitTruss(r.p);
    const byName = (n: string) => tex(s.N.get(lit.bars.find((b) => `${b.i}${b.j}` === n)!.id)!);
    expect(byName("AC")).toBe("-\\dfrac{P}{2 \\sin \\alpha}");
    expect(byName("AB")).toBe("\\dfrac{P}{2 \\tan \\alpha}");
    const md = litTrussMarkdown(lit);
    expect(md).toContain("\\tan \\alpha = \\dfrac{h}{a}");
    expect(md).toContain("V_{B} = \\dfrac{P}{2}");
    expect(md).not.toMatch(/\d+[.,]\d/);
  });

  it("potence : réactions trouvées par les nœuds", () => {
    const lit = litTrussPreset("potence");
    check(lit);
    expect(litTrussMarkdown(lit)).toContain("Nœud C");
  });

  it("conversion d'un treillis saisi en valeurs", () => {
    for (const { id } of TRUSS_PRESETS) check(literalTrussFromNumeric(trussPreset(id, { panels: 4, span: 8, height: 2, P: 10, chord: "top" })));
  });
});
