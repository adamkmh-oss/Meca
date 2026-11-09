import { describe, expect, it } from "vitest";
import { analyze } from "../solver";
import { analyzeBeam, type BeamModel } from "../beam";
import { handCalcBeam, segmentEquations } from "../beam-equations";
import { portalFrame, truss } from "../presets";

/* Formulaires de référence : RDM classique (poutres d'Euler–Bernoulli). */

const E = 210e6; // kN/m² (210 GPa)
const I = 8356e-8; // m⁴ (IPE 300)
const A = 53.8e-4; // m²
const EI = E * I;

const rel = (a: number, b: number, tol = 1e-6) =>
  expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));

function beam(partial: Partial<BeamModel>): BeamModel {
  return { length: 6, E, A, I, supports: [], hinges: [], loads: [], ...partial };
}

describe("Poutre sur deux appuis", () => {
  it("charge uniformément répartie : R = qL/2, Mmax = qL²/8, f = 5qL⁴/384EI", () => {
    const L = 6, q = 10;
    const an = analyzeBeam(
      beam({
        length: L,
        supports: [
          { id: "A", x: 0, type: "pin" },
          { id: "B", x: L, type: "roller" },
        ],
        loads: [{ id: "q", kind: "dist", x1: 0, x2: L, q1: q, q2: q }],
      }),
    );
    expect(an.result.ok).toBe(true);
    if (!an.result.ok) return;
    const R = an.result.reactions;
    rel(R.N0.ry, (q * L) / 2);
    rel(R.N1.ry, (q * L) / 2);
    rel(an.extremes.Mmax.value, (q * L * L) / 8);
    rel(an.extremes.Mmax.x, L / 2);
    rel(an.extremes.vmin.value, (-5 * q * L ** 4) / (384 * EI), 1e-6);
    rel(an.extremes.Vmax.value, (q * L) / 2);
    rel(an.extremes.Vmin.value, (-q * L) / 2);
    expect(an.result.hyperstaticity.degree).toBe(0);
  });

  it("charge ponctuelle excentrée : R_A = Pb/L, M = Pab/L, f(a) = Pa²b²/(3EIL)", () => {
    const L = 8, P = 50, a = 3, b = L - a;
    const an = analyzeBeam(
      beam({
        length: L,
        supports: [
          { id: "A", x: 0, type: "pin" },
          { id: "B", x: L, type: "roller" },
        ],
        loads: [{ id: "P", kind: "point", x: a, F: P, angle: -90 }],
      }),
    );
    if (!an.result.ok) throw new Error(an.result.error);
    rel(an.result.reactions.N0.ry, (P * b) / L);
    rel(an.result.reactions.N1.ry, (P * a) / L);
    rel(an.extremes.Mmax.value, (P * a * b) / L);
    rel(an.extremes.Mmax.x, a);
    rel(an.at(a).v, (-P * a * a * b * b) / (3 * EI * L));
    // saut de l'effort tranchant égal à P
    rel(an.at(a, "left").V - an.at(a, "right").V, P);
  });

  it("charge triangulaire : R_A = qL/6, R_B = qL/3, Mmax = qL²/(9√3) en x = L/√3", () => {
    const L = 6, q = 12;
    const an = analyzeBeam(
      beam({
        length: L,
        supports: [
          { id: "A", x: 0, type: "pin" },
          { id: "B", x: L, type: "roller" },
        ],
        loads: [{ id: "t", kind: "dist", x1: 0, x2: L, q1: 0, q2: q }],
      }),
    );
    if (!an.result.ok) throw new Error(an.result.error);
    rel(an.result.reactions.N0.ry, (q * L) / 6);
    rel(an.result.reactions.N1.ry, (q * L) / 3);
    rel(an.extremes.Mmax.value, (q * L * L) / (9 * Math.sqrt(3)));
    rel(an.extremes.Mmax.x, L / Math.sqrt(3));
  });

  it("couple appliqué : réactions ±C/L et saut de moment C", () => {
    const L = 5, C = 20;
    const an = analyzeBeam(
      beam({
        length: L,
        supports: [
          { id: "A", x: 0, type: "pin" },
          { id: "B", x: L, type: "roller" },
        ],
        loads: [{ id: "c", kind: "moment", x: 2, M: C }],
      }),
    );
    if (!an.result.ok) throw new Error(an.result.error);
    rel(an.result.reactions.N0.ry, C / L);
    rel(an.result.reactions.N1.ry, -C / L);
    rel(an.at(2, "right").M - an.at(2, "left").M, -C);
  });

  it("poutre à porte-à-faux : appui intermédiaire, moment négatif sur appui", () => {
    // A en 0, B en 4, extrémité libre en 6, P = 10 kN en 6
    const an = analyzeBeam(
      beam({
        length: 6,
        supports: [
          { id: "A", x: 0, type: "pin" },
          { id: "B", x: 4, type: "roller" },
        ],
        loads: [{ id: "P", kind: "point", x: 6, F: 10, angle: -90 }],
      }),
    );
    if (!an.result.ok) throw new Error(an.result.error);
    const R = an.result.reactions;
    const nodeA = an.built.nodeIdAt(0)!, nodeB = an.built.nodeIdAt(4)!;
    rel(R[nodeA].ry, -5);
    rel(R[nodeB].ry, 15);
    rel(an.extremes.Mmin.value, -20);
    rel(an.extremes.Mmin.x, 4);
  });
});

describe("Console (poutre encastrée)", () => {
  it("charge en bout : V = P, M_A = −PL, f = PL³/3EI, θ = PL²/2EI", () => {
    const L = 3, P = 20;
    const an = analyzeBeam(
      beam({
        length: L,
        supports: [{ id: "A", x: 0, type: "fixed" }],
        loads: [{ id: "P", kind: "point", x: L, F: P, angle: -90 }],
      }),
    );
    if (!an.result.ok) throw new Error(an.result.error);
    const R = an.result.reactions.N0;
    rel(R.ry, P);
    rel(R.mz, P * L); // moment d'encastrement anti-horaire
    rel(an.at(0, "right").M, -P * L);
    rel(an.at(L).v, (-P * L ** 3) / (3 * EI));
    rel(an.at(L).theta, (-P * L * L) / (2 * EI));
  });

  it("charge répartie : M_A = −qL²/2, f = qL⁴/8EI", () => {
    const L = 4, q = 15;
    const an = analyzeBeam(
      beam({
        length: L,
        supports: [{ id: "A", x: 0, type: "fixed" }],
        loads: [{ id: "q", kind: "dist", x1: 0, x2: L, q1: q, q2: q }],
      }),
    );
    if (!an.result.ok) throw new Error(an.result.error);
    rel(an.at(0, "right").M, (-q * L * L) / 2);
    rel(an.at(L).v, (-q * L ** 4) / (8 * EI));
  });
});

describe("Poutres hyperstatiques", () => {
  it("encastrée–appuyée sous q : R_B = 3qL/8, M_A = −qL²/8", () => {
    const L = 6, q = 10;
    const an = analyzeBeam(
      beam({
        length: L,
        supports: [
          { id: "A", x: 0, type: "fixed" },
          { id: "B", x: L, type: "roller" },
        ],
        loads: [{ id: "q", kind: "dist", x1: 0, x2: L, q1: q, q2: q }],
      }),
    );
    if (!an.result.ok) throw new Error(an.result.error);
    expect(an.result.hyperstaticity.degree).toBe(1);
    rel(an.result.reactions.N1.ry, (3 * q * L) / 8);
    rel(an.at(0, "right").M, (-q * L * L) / 8);
    rel(an.extremes.Mmax.value, (9 * q * L * L) / 128);
  });

  it("bi-encastrée sous q : M appuis = −qL²/12, M travée = qL²/24, f = qL⁴/384EI", () => {
    const L = 6, q = 10;
    const an = analyzeBeam(
      beam({
        length: L,
        supports: [
          { id: "A", x: 0, type: "fixed" },
          { id: "B", x: L, type: "fixed" },
        ],
        loads: [{ id: "q", kind: "dist", x1: 0, x2: L, q1: q, q2: q }],
      }),
    );
    if (!an.result.ok) throw new Error(an.result.error);
    rel(an.at(0, "right").M, (-q * L * L) / 12);
    rel(an.at(L / 2).M, (q * L * L) / 24);
    rel(an.at(L / 2).v, (-q * L ** 4) / (384 * EI));
  });

  it("poutre continue à deux travées égales sous q : 3qL/8, 5qL/4, M = −qL²/8", () => {
    const l = 5, q = 8;
    const an = analyzeBeam(
      beam({
        length: 2 * l,
        supports: [
          { id: "A", x: 0, type: "pin" },
          { id: "B", x: l, type: "roller" },
          { id: "C", x: 2 * l, type: "roller" },
        ],
        loads: [{ id: "q", kind: "dist", x1: 0, x2: 2 * l, q1: q, q2: q }],
      }),
    );
    if (!an.result.ok) throw new Error(an.result.error);
    const R = an.result.reactions;
    rel(R.N0.ry, (3 * q * l) / 8);
    rel(R.N1.ry, (5 * q * l) / 4);
    rel(R.N2.ry, (3 * q * l) / 8);
    rel(an.at(l).M, (-q * l * l) / 8);
  });

  it("poutre Gerber (rotule interne) : isostatique, M nul à la rotule", () => {
    const an = analyzeBeam(
      beam({
        length: 10,
        supports: [
          { id: "A", x: 0, type: "pin" },
          { id: "B", x: 6, type: "roller" },
          { id: "C", x: 10, type: "roller" },
        ],
        hinges: [{ id: "h", x: 7.5 }],
        loads: [{ id: "q", kind: "dist", x1: 0, x2: 10, q1: 10, q2: 10 }],
      }),
    );
    if (!an.result.ok) throw new Error(an.result.error);
    expect(an.result.hyperstaticity.degree).toBe(0);
    rel(an.at(7.5).M, 0, 1e-7);
    // Travée suspendue 7,5 → 10 (l = 2,5) : R_C = q·l/2 = 12,5 kN
    const nC = an.built.nodeIdAt(10)!;
    rel(an.result.reactions[nC].ry, 12.5);
  });
});

describe("Cohérence générale", () => {
  it("équilibre global et continuité de la déformée pour un chargement quelconque", () => {
    const an = analyzeBeam(
      beam({
        length: 9,
        supports: [
          { id: "A", x: 0, type: "fixed" },
          { id: "B", x: 5, type: "roller" },
          { id: "C", x: 9, type: "pin" },
        ],
        loads: [
          { id: "1", kind: "point", x: 2.2, F: 17, angle: -60 },
          { id: "2", kind: "dist", x1: 1, x2: 7.5, q1: 4, q2: 11 },
          { id: "3", kind: "moment", x: 6.1, M: -9 },
        ],
      }),
    );
    if (!an.result.ok) throw new Error(an.result.error);
    const eq = an.result.equilibrium;
    rel(eq.sumFx, 0, 1e-8);
    rel(eq.sumFy, 0, 1e-8);
    rel(eq.sumM, 0, 1e-8);
    // la déformée intégrée retrouve le déplacement nodal en bout de barre
    for (const sg of an.built.segments) {
      const mr = an.result.members[sg.id];
      const dEnd = mr.displacementAt(mr.L);
      rel(dEnd.v, mr.endDisplacements[4], 1e-9);
      rel(dEnd.theta, mr.endDisplacements[5], 1e-9);
    }
  });

  it("calcul « à la main » identique au solveur matriciel (poutre isostatique)", () => {
    const model = beam({
      length: 7,
      supports: [
        { id: "A", x: 1, type: "pin" },
        { id: "B", x: 6, type: "roller" },
      ],
      loads: [
        { id: "1", kind: "point", x: 0, F: 8, angle: -90 },
        { id: "2", kind: "dist", x1: 2, x2: 7, q1: 3, q2: 6 },
        { id: "3", kind: "point", x: 4, F: 10, angle: -45 },
      ],
    });
    const hc = handCalcBeam(model);
    const an = analyzeBeam(model);
    expect(hc.applicable).toBe(true);
    if (!an.result.ok) throw new Error(an.result.error);
    const nA = an.built.nodeIdAt(1)!, nB = an.built.nodeIdAt(6)!;
    for (const r of hc.reactions) {
      const node = r.x === 1 ? nA : nB;
      const val = r.component === "V" ? an.result.reactions[node].ry : an.result.reactions[node].rx;
      rel(r.value, val, 1e-9);
    }
  });

  it("équations polynomiales par tronçon exactes", () => {
    const an = analyzeBeam(
      beam({
        length: 6,
        supports: [
          { id: "A", x: 0, type: "pin" },
          { id: "B", x: 6, type: "roller" },
        ],
        loads: [{ id: "q", kind: "dist", x1: 0, x2: 6, q1: 10, q2: 10 }],
      }),
    );
    const eqs = segmentEquations(an);
    expect(eqs).toHaveLength(1);
    rel(eqs[0].V[0], 30);
    rel(eqs[0].V[1], -10);
    rel(eqs[0].M[1], 30);
    rel(eqs[0].M[2], -5);
  });

  it("deux appuis simples sous charge horizontale : mécanisme détecté", () => {
    const an = analyzeBeam(
      beam({
        length: 4,
        supports: [
          { id: "A", x: 0, type: "roller" },
          { id: "B", x: 4, type: "roller" },
        ],
        loads: [{ id: "1", kind: "point", x: 2, F: 10, angle: 0 }],
      }),
    );
    expect(an.result.ok).toBe(false);
  });
});

describe("Portiques", () => {
  it("portique bi-articulé sous q : H = qL²/(4h(2k+3)), k = (Ib/Ic)(h/L)", () => {
    const L = 8, h = 4, q = 20, Ic = 1e-4, Ib = 2e-4;
    const s = portalFrame({ span: L, height: h, base: "pin", E, Ac: 1e3, Ic, Ab: 1e3, Ib, q, H: 0, P: 0 });
    const r = analyze(s);
    if (!r.ok) throw new Error(r.error);
    const k = (Ib / Ic) * (h / L);
    const H = (q * L * L) / (4 * h * (2 * k + 3));
    rel(r.reactions.A.rx, H, 1e-5);
    rel(r.reactions.D.rx, -H, 1e-5);
    rel(r.reactions.A.ry, (q * L) / 2);
    expect(r.hyperstaticity.degree).toBe(1);
  });

  it("portique bi-articulé symétrique sous charge latérale : H/2 à chaque pied", () => {
    const L = 6, h = 4, P = 30;
    const s = portalFrame({ span: L, height: h, base: "pin", E, Ac: 1e3, Ic: 1e-4, Ab: 1e3, Ib: 1e-4, q: 0, H: P, P: 0 });
    const r = analyze(s);
    if (!r.ok) throw new Error(r.error);
    rel(r.reactions.A.rx, -P / 2, 1e-5);
    rel(r.reactions.D.rx, -P / 2, 1e-5);
    rel(r.reactions.D.ry, (P * h) / L, 1e-6);
    rel(r.reactions.A.ry, (-P * h) / L, 1e-6);
  });
});

describe("Treillis", () => {
  it("treillis triangulaire : N = −P/√2 dans les arbalétriers, +P/2 dans l'entrait", () => {
    const P = 40;
    const r = analyze({
      nodes: [
        { id: "A", x: 0, y: 0, support: "pin" },
        { id: "B", x: 4, y: 0, support: "roller" },
        { id: "C", x: 2, y: 2 },
      ],
      members: [
        { id: "AB", i: "A", j: "B", E, A, I: 1e-6, releaseI: true, releaseJ: true },
        { id: "AC", i: "A", j: "C", E, A, I: 1e-6, releaseI: true, releaseJ: true },
        { id: "BC", i: "B", j: "C", E, A, I: 1e-6, releaseI: true, releaseJ: true },
      ],
      loads: [{ kind: "nodal", node: "C", fx: 0, fy: -P, mz: 0 }],
    });
    if (!r.ok) throw new Error(r.error);
    expect(r.hyperstaticity.degree).toBe(0);
    rel(r.members.AB.forcesAt(2).N, P / 2);
    rel(r.members.AC.forcesAt(1).N, -P / Math.SQRT2);
    rel(r.members.BC.forcesAt(1).N, -P / Math.SQRT2);
    rel(r.members.AC.forcesAt(1).M, 0, 1e-9);
  });

  it("treillis Pratt : isostatique, équilibre et réactions symétriques", () => {
    const s = truss({ type: "pratt", panels: 6, span: 12, height: 2, E, A, P: 10, loadedChord: "top" });
    const r = analyze(s);
    if (!r.ok) throw new Error(r.error);
    expect(r.hyperstaticity.degree).toBe(0);
    rel(r.reactions.B0.ry, 35);
    rel(r.reactions.B6.ry, 35);
    // Méthode de Ritter. Membrure inférieure B2–B3 : moments en T2 (x = 4)
    const M4 = 35 * 4 - 10 * (4 + 2);
    rel(r.members.b2.forcesAt(1).N, M4 / 2, 1e-6);
    // Membrure supérieure T2–T3 : moments en B3 (x = 6), comprimée
    const M6 = 35 * 6 - 10 * (6 + 4 + 2);
    rel(r.members.t2.forcesAt(1).N, -M6 / 2, 1e-6);
  });

  it("treillis Warren : isostatique", () => {
    const s = truss({ type: "warren", panels: 4, span: 8, height: 1.5, E, A, P: 10, loadedChord: "bottom" });
    const r = analyze(s);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.hyperstaticity.degree).toBe(0);
  });
});
