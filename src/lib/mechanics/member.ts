/**
 * Calculs au niveau d'une barre (repère local) :
 *  - charges exprimées en repère local,
 *  - efforts internes N, V, M exacts à toute abscisse (équilibre d'un tronçon),
 *  - efforts d'encastrement parfait (barre bi-encastrée) obtenus par
 *    intégration exacte de l'équation de la déformée EI·v'' = M,
 *  - déformée exacte v(x) = v0 + θ0·x + (1/EI)∫₀ˣ (x−ξ)·M(ξ) dξ.
 *
 * Toutes les intégrales portent sur des polynômes par morceaux de degré ≤ 4 et
 * sont évaluées par Gauss–Legendre 3 points entre discontinuités (exact).
 */
import { integratePiecewise } from "./linalg";

export interface LocalPointLoad {
  a: number;
  px: number;
  py: number;
}
export interface LocalMomentLoad {
  a: number;
  m: number;
}
export interface LocalDistLoad {
  a: number;
  b: number;
  qx1: number;
  qx2: number;
  qy1: number;
  qy2: number;
}
export interface LocalLoads {
  points: LocalPointLoad[];
  moments: LocalMomentLoad[];
  dists: LocalDistLoad[];
}

export function emptyLocalLoads(): LocalLoads {
  return { points: [], moments: [], dists: [] };
}

export function loadBreakpoints(L: number, loads: LocalLoads): number[] {
  const set = new Set<number>();
  for (const p of loads.points) set.add(p.a);
  for (const m of loads.moments) set.add(m.a);
  for (const d of loads.dists) {
    set.add(d.a);
    set.add(d.b);
  }
  return [...set].filter((v) => v > 1e-12 && v < L - 1e-12).sort((u, v) => u - v);
}

const includes = (a: number, x: number, side: "left" | "right") =>
  side === "left" ? a < x - 1e-12 : a <= x + 1e-12;

/**
 * Résultantes des charges situées à gauche de la coupure x :
 *   Fx = Σ composantes axiales, Fy = Σ composantes transversales,
 *   Mo = Σ moments par rapport à la coupure (anti-horaire positif) des charges
 *        situées à gauche, couples compris.
 */
export function leftLoadResultants(
  loads: LocalLoads,
  x: number,
  side: "left" | "right" = "left",
): { Fx: number; Fy: number; Mo: number } {
  let Fx = 0;
  let Fy = 0;
  let Mo = 0;
  for (const p of loads.points) {
    if (includes(p.a, x, side)) {
      Fx += p.px;
      Fy += p.py;
      // moment de py appliqué en a par rapport au point x : (a − x)·py
      Mo += (p.a - x) * p.py;
    }
  }
  for (const c of loads.moments) {
    if (includes(c.a, x, side)) Mo += c.m;
  }
  for (const d of loads.dists) {
    if (x <= d.a || d.b <= d.a) continue;
    const e = Math.min(x, d.b);
    const t = e - d.a;
    const span = d.b - d.a;
    const dd = x - d.a;
    // q(u) = q1 + s·u, u ∈ [0, t]
    const sx = (d.qx2 - d.qx1) / span;
    const sy = (d.qy2 - d.qy1) / span;
    Fx += d.qx1 * t + (sx * t * t) / 2;
    Fy += d.qy1 * t + (sy * t * t) / 2;
    // ∫ q(u)·(dd − u) du  = moment (horaire) → moment anti-horaire = −∫ q·(x−ξ)
    const momCW = d.qy1 * (dd * t - (t * t) / 2) + sy * ((dd * t * t) / 2 - (t * t * t) / 3);
    Mo -= momCW;
  }
  return { Fx, Fy, Mo };
}

/**
 * Efforts internes à l'abscisse x à partir des efforts d'extrémité en i
 * (fxi, fyi, mi : actions exercées SUR la barre en i) et des charges.
 *
 * Équilibre du tronçon [0, x] (partie gauche) :
 *   N(x) = −(fxi + ΣFx_gauche)            (traction positive)
 *   V(x) =   fyi + ΣFy_gauche              (convention dM/dx = V)
 *   M(x) = −mi + x·fyi − Mo_gauche          (M > 0 : fibre −y tendue)
 */
export function internalForcesAt(
  fxi: number,
  fyi: number,
  mi: number,
  loads: LocalLoads,
  x: number,
  side: "left" | "right" = "left",
) {
  const r = leftLoadResultants(loads, x, side);
  return {
    N: -(fxi + r.Fx),
    V: fyi + r.Fy,
    M: -mi + x * fyi - r.Mo,
  };
}

/**
 * Efforts d'encastrement parfait : efforts exercés SUR la barre bi-encastrée
 * (déplacements d'extrémités nuls) par ses appuis, repère local
 * [fxi, fyi, mi, fxj, fyj, mj].
 */
export function fixedEndForces(L: number, loads: LocalLoads): number[] {
  const bps = loadBreakpoints(L, loads);
  const hasLoads = loads.points.length + loads.moments.length + loads.dists.length > 0;
  if (!hasLoads) return [0, 0, 0, 0, 0, 0];

  // M_load(x) : moment dû aux seules charges (fyi = mi = 0)
  const Mload = (x: number) => -leftLoadResultants(loads, x).Mo;
  const Nload = (x: number) => -leftLoadResultants(loads, x).Fx;

  const I0 = integratePiecewise(Mload, 0, L, bps);
  const I1 = integratePiecewise((x) => (L - x) * Mload(x), 0, L, bps);
  // Conditions θ(L) = 0 et v(L) = 0 avec v(0) = θ(0) = 0 :
  //   −mi·L + fyi·L²/2 + I0 = 0
  //   −mi·L²/2 + fyi·L³/6 + I1 = 0
  const fyi = (12 * (I1 - (I0 * L) / 2)) / L ** 3;
  const mi = (fyi * L * L) / 2 / L + I0 / L;

  // Axial : u(L) = 0 → ∫N = 0 avec N = −fxi + Nload
  const J0 = integratePiecewise(Nload, 0, L, bps);
  const fxi = J0 / L;

  // Équilibre global de la barre pour l'extrémité j
  const tot = leftLoadResultants(loads, L, "right");
  const fxj = -(fxi + tot.Fx);
  const fyj = -(fyi + tot.Fy);
  // Σ M/i = 0 : mi + mj + L·fyj + Σ(moments des charges par rapport à i) = 0
  // Moment des charges / i = Mo(L) + L·Fy  (translation du point de réduction)
  const momLoadsAboutI = tot.Mo + L * tot.Fy;
  const mj = -(mi + L * fyj + momLoadsAboutI);
  return [fxi, fyi, mi, fxj, fyj, mj];
}

/** Matrice de rigidité locale 6×6 d'une barre de portique (Euler–Bernoulli). */
export function localStiffness(E: number, A: number, I: number, L: number): number[][] {
  const a = (E * A) / L;
  const b = (12 * E * I) / L ** 3;
  const c = (6 * E * I) / L ** 2;
  const d = (4 * E * I) / L;
  const e = (2 * E * I) / L;
  return [
    [a, 0, 0, -a, 0, 0],
    [0, b, c, 0, -b, c],
    [0, c, d, 0, -c, e],
    [-a, 0, 0, a, 0, 0],
    [0, -b, -c, 0, b, -c],
    [0, c, e, 0, -c, d],
  ];
}

/**
 * Condensation statique des degrés de liberté libérés (rotules d'extrémité).
 * Retourne la matrice et le vecteur d'efforts d'encastrement condensés
 * (lignes/colonnes libérées mises à zéro) ainsi que la fonction de
 * reconstruction des rotations libérées.
 */
export function condense(
  k: number[][],
  fef: number[],
  released: number[],
): {
  k: number[][];
  fef: number[];
  recover: (d: number[]) => number[];
} {
  if (released.length === 0) {
    return { k, fef, recover: (d) => d.slice() };
  }
  const all = [0, 1, 2, 3, 4, 5];
  const kept = all.filter((p) => !released.includes(p));
  const r = released;
  // K_rr inverse (1×1 ou 2×2)
  let inv: number[][];
  if (r.length === 1) {
    inv = [[1 / k[r[0]][r[0]]]];
  } else {
    const a = k[r[0]][r[0]];
    const b = k[r[0]][r[1]];
    const c = k[r[1]][r[0]];
    const d = k[r[1]][r[1]];
    const det = a * d - b * c;
    inv = [
      [d / det, -b / det],
      [-c / det, a / det],
    ];
  }
  const kc = all.map(() => new Array<number>(6).fill(0));
  const fc = new Array<number>(6).fill(0);
  for (const p of kept) {
    // K_pr · K_rr⁻¹
    const w = r.map((_, s) => r.reduce((acc, rr, t) => acc + k[p][rr] * inv[t][s], 0));
    for (const q of kept) {
      kc[p][q] = k[p][q] - r.reduce((acc, rr, s) => acc + w[s] * k[rr][q], 0);
    }
    fc[p] = fef[p] - r.reduce((acc, rr, s) => acc + w[s] * fef[rr], 0);
  }
  const recover = (d: number[]) => {
    const out = d.slice();
    // d_r = −K_rr⁻¹ (fef_r + K_rk d_k)
    const rhs = r.map((rr) => fef[rr] + kept.reduce((acc, q) => acc + k[rr][q] * d[q], 0));
    r.forEach((rr, s) => {
      out[rr] = -r.reduce((acc, _, t) => acc + inv[s][t] * rhs[t], 0);
    });
    return out;
  };
  return { k: kc, fef: fc, recover };
}

/**
 * Déplacements locaux le long de la barre à partir des déplacements
 * d'extrémité (u0, v0, θ0 en i) et des efforts internes :
 *   u(x) = u0 + (1/EA)∫₀ˣ N
 *   θ(x) = θ0 + (1/EI)∫₀ˣ M
 *   v(x) = v0 + θ0·x + (1/EI)∫₀ˣ (x−ξ)·M(ξ) dξ
 */
export function displacementAlong(
  x: number,
  d: number[],
  E: number,
  A: number,
  I: number,
  N: (x: number) => number,
  M: (x: number) => number,
  breakpoints: number[],
) {
  const [u0, v0, t0] = d;
  const EA = E * A;
  const EI = E * I;
  const intN = integratePiecewise(N, 0, x, breakpoints);
  const intM = integratePiecewise(M, 0, x, breakpoints);
  const intXM = integratePiecewise((xi) => (x - xi) * M(xi), 0, x, breakpoints);
  return {
    u: u0 + intN / EA,
    v: v0 + t0 * x + intXM / EI,
    theta: t0 + intM / EI,
  };
}
