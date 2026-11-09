import { describe, expect, it } from "vitest";
import { analyze } from "../solver";
import type { Structure } from "../types";

// Structure (S4) du TD : poteau AB articulé en A, poutre CD (C libre, D appui simple)
// Convention du cours : T = −(Σ F_y à gauche) = −V_moteur ; N et M identiques.
describe("Structure S4 — vérification des expressions du corrigé", () => {
  const L = 2, H = 3.2, F = 20, alpha = (30 * Math.PI) / 180;
  const Fx = F * Math.sin(alpha), Fy = F * Math.cos(alpha);
  const E = 2.1e8, A = 1e3, I = 1e-4; // A très grand : déformations axiales négligeables (sans effet en isostatique)
  const s: Structure = {
    nodes: [
      { id: "A", x: 0, y: 0, support: "pin" },
      { id: "B", x: 0, y: H },
      { id: "C", x: -L, y: H },
      { id: "D", x: 2 * L, y: H, support: "roller" },
    ],
    members: [
      { id: "CB", i: "C", j: "B", E, A, I },
      { id: "BD", i: "B", j: "D", E, A, I },
      { id: "AB", i: "A", j: "B", E, A, I },
    ],
    loads: [{ kind: "nodal", node: "C", fx: Fx, fy: Fy, mz: 0 }],
  };
  const r = analyze(s);
  if (!r.ok) throw new Error(r.error);
  const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);
  const Dy = Fy / 2 + (H * Fx) / (2 * L);

  it("réactions", () => {
    expect(r.hyperstaticity.degree).toBe(0);
    close(r.reactions.A.rx, -Fx);
    close(r.reactions.A.ry, -(1.5 * Fy + (H * Fx) / (2 * L)));
    close(r.reactions.D.ry, Dy);
  });
  it("torseurs par barre", () => {
    for (const x of [0.1, 0.5 * L, 0.99 * L]) {
      const f = r.members.CB.forcesAt(x);
      close(f.N, -Fx); close(-f.V, -Fy); close(f.M, Fy * x);
    }
    for (const x of [0.1, L, 1.9 * L]) {
      const f = r.members.BD.forcesAt(x);
      close(f.N, 0); close(-f.V, Dy); close(f.M, ((L * Fy + H * Fx) * (2 * L - x)) / (2 * L));
    }
    for (const x of [0.1, H / 2, 0.99 * H]) {
      const f = r.members.AB.forcesAt(x);
      close(f.N, 1.5 * Fy + (H * Fx) / (2 * L)); close(-f.V, -Fx); close(f.M, Fx * x);
    }
  });
  it("nœud B", () => {
    const Mcb = r.members.CB.forcesAt(L).M, Mbd = r.members.BD.forcesAt(0, "right").M, Mab = r.members.AB.forcesAt(H).M;
    close(-Mcb + Mbd - Mab, 0);
    close(Mbd, L * Fy + H * Fx);
  });
});
