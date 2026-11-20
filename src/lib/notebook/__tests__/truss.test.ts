import { describe, expect, it } from "vitest";
import { makeExport, newNotebook, parseExport } from "../model";
import { analyzeTruss, jointEquations, trussMarkdown, trussPreset, TRUSS_PRESETS, type TrussModel } from "../truss";

const P = { panels: 4, span: 8, height: 2, P: 10, chord: "top" as const };

function N(m: TrussModel, a: string, b: string) {
  const an = analyzeTruss(m);
  const bar = m.bars.find((x) => (x.i === a && x.j === b) || (x.i === b && x.j === a));
  if (!bar) throw new Error(`barre ${a}${b} absente`);
  return an.N[bar.id];
}

describe("treillis calculé", () => {
  it("cas types : isostatiques, calculables, méthode des nœuds complète et vérifiée", () => {
    for (const { id } of TRUSS_PRESETS) {
      for (const chord of ["top", "bottom"] as const) {
        const m = trussPreset(id, { ...P, chord });
        const an = analyzeTruss(m);
        expect(an.error, id).toBeUndefined();
        expect(an.degree, id).toBe(0);
        const { steps, complete } = jointEquations(m, an);
        expect(complete, id).toBe(true);
        // chaque équation écrite est vérifiée par les efforts calculés
        for (const st of steps) {
          let sx = st.extX;
          let sy = st.extY;
          for (const [bar, c] of Object.entries(st.cx)) sx += c * an.N[bar];
          for (const [bar, c] of Object.entries(st.cy)) sy += c * an.N[bar];
          expect(Math.abs(sx), `${id} nœud ${st.node} ΣFx`).toBeLessThan(1e-6);
          expect(Math.abs(sy), `${id} nœud ${st.node} ΣFy`).toBeLessThan(1e-6);
        }
      }
    }
  });

  it("triangle à 45° : arbalétriers comprimés, entrait tendu", () => {
    const m = trussPreset("triangle", { ...P, span: 4, height: 2, P: 10 });
    expect(N(m, "A", "C")).toBeCloseTo(-5 * Math.SQRT2, 6);
    expect(N(m, "B", "C")).toBeCloseTo(-5 * Math.SQRT2, 6);
    expect(N(m, "A", "B")).toBeCloseTo(5, 6);
  });

  it("potence : tirant tendu PL/h, bracon comprimé", () => {
    const m = trussPreset("potence", { ...P, span: 2, height: 1, P: 10 });
    expect(N(m, "A", "C")).toBeCloseTo(20, 6);
    expect(N(m, "B", "C")).toBeCloseTo(-10 * Math.sqrt(5), 6);
  });

  it("Pratt chargé en haut : membrure haute comprimée, basse tendue, diagonales tendues", () => {
    const m = trussPreset("pratt", { ...P, panels: 6, span: 12, height: 2 });
    const an = analyzeTruss(m);
    const top = new Set(m.nodes.filter((n) => n.y > 0).map((n) => n.id));
    for (const b of m.bars) {
      const v = an.N[b.id];
      const both = top.has(b.i) && top.has(b.j);
      const none = !top.has(b.i) && !top.has(b.j);
      if (both) expect(v).toBeLessThanOrEqual(1e-9);
      else if (none) expect(v).toBeGreaterThanOrEqual(-1e-9);
      else {
        const a = m.nodes.find((n) => n.id === b.i)!;
        const c = m.nodes.find((n) => n.id === b.j)!;
        if (Math.abs(a.x - c.x) > 1e-9) expect(v).toBeGreaterThanOrEqual(-1e-9); // diagonale
      }
    }
  });

  it("rédaction : réactions, nœuds, tableau ; erreurs signalées", () => {
    const m = trussPreset("warren", P);
    const md = trussMarkdown(m);
    expect(md).toContain("b + r - 2n = 15 + 3 - 2 \\times 9 = 0");
    expect(md).toContain("Méthode des nœuds");
    expect(md).toContain("| Barre | Longueur (m) | N (kN) | Nature |");
    expect(md).toContain("V_A = 20");
    const broken: TrussModel = { ...m, bars: m.bars.slice(0, 3) };
    expect(analyzeTruss(broken).error).toBeTruthy();
    expect(trussMarkdown(broken)).toContain("Calcul impossible");
  });

  it("le treillis est sauvegardé et réimporté", () => {
    const nb = newNotebook("T", "#000");
    nb.pages[0].elements.push({ id: "t", type: "truss", x: 10, y: 10, w: 600, model: trussPreset("ferme", P), show: { efforts: true, reactions: true, labels: true } });
    const back = parseExport(makeExport([nb]));
    expect(back.ok).toBe(true);
  });
});
