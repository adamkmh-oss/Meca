/**
 * Analyse linéaire élastique des structures planes par la méthode des
 * déplacements (méthode de rigidité directe).
 *
 * Hypothèses : petits déplacements, matériau élastique linéaire, poutres
 * d'Euler–Bernoulli (déformations d'effort tranchant négligées), liaisons
 * parfaites.
 */
import {
  condense,
  displacementAlong,
  fixedEndForces,
  internalForcesAt,
  loadBreakpoints,
  localStiffness,
  type LocalLoads,
} from "./member";
import { SingularMatrixError, solve, zeros } from "./linalg";
import type {
  AnalysisResult,
  Extremum,
  Hyperstaticity,
  MemberResult,
  NodeDisplacement,
  Reaction,
  Station,
  Structure,
  SupportType,
} from "./types";

const EPS = 1e-9;

export function supportDofs(s: SupportType | undefined): [boolean, boolean, boolean] {
  switch (s) {
    case "roller":
      return [false, true, false];
    case "rollerX":
      return [true, false, false];
    case "pin":
      return [true, true, false];
    case "fixed":
      return [true, true, true];
    default:
      return [false, false, false];
  }
}

interface Geo {
  L: number;
  c: number;
  s: number;
}

function memberLocalLoads(structure: Structure, memberId: string, geo: Geo): LocalLoads {
  const { c, s, L } = geo;
  const out: LocalLoads = { points: [], moments: [], dists: [] };
  const clamp = (v: number) => Math.min(Math.max(v, 0), L);
  for (const ld of structure.loads) {
    if (ld.kind === "nodal" || ld.member !== memberId) continue;
    if (ld.kind === "point") {
      out.points.push({ a: clamp(ld.a), px: c * ld.fx + s * ld.fy, py: -s * ld.fx + c * ld.fy });
    } else if (ld.kind === "moment") {
      out.moments.push({ a: clamp(ld.a), m: ld.m });
    } else {
      const a = clamp(Math.min(ld.a, ld.b));
      const b = clamp(Math.max(ld.a, ld.b));
      if (b - a < EPS) continue;
      const [q1, q2] = ld.a <= ld.b ? [ld.q1, ld.q2] : [ld.q2, ld.q1];
      let kx = 0;
      let ky = 0;
      if (ld.dir === "gy") {
        kx = s;
        ky = c;
      } else if (ld.dir === "gx") {
        kx = c;
        ky = -s;
      } else {
        kx = 0;
        ky = 1;
      }
      out.dists.push({ a, b, qx1: kx * q1, qx2: kx * q2, qy1: ky * q1, qy2: ky * q2 });
    }
  }
  return out;
}

function quadraticRoots(f: (x: number) => number, x0: number, x1: number): number[] {
  // Interpolation de f (polynôme de degré ≤ 2) par 3 points puis racines.
  const xm = (x0 + x1) / 2;
  const h = (x1 - x0) / 2;
  const f0 = f(x0 + 1e-12 * (x1 - x0));
  const fm = f(xm);
  const f1 = f(x1 - 1e-12 * (x1 - x0));
  // f(t) = A t² + B t + C, t ∈ [−1, 1]
  const C = fm;
  const B = (f1 - f0) / 2;
  const A = (f1 + f0) / 2 - fm;
  const roots: number[] = [];
  const scale = Math.max(Math.abs(A), Math.abs(B), Math.abs(C), 1e-30);
  if (Math.abs(A) < 1e-12 * scale) {
    if (Math.abs(B) > 1e-12 * scale) roots.push(-C / B);
  } else {
    const disc = B * B - 4 * A * C;
    if (disc >= 0) {
      const sq = Math.sqrt(disc);
      roots.push((-B + sq) / (2 * A), (-B - sq) / (2 * A));
    }
  }
  return roots.filter((t) => t > -1 && t < 1).map((t) => xm + h * t);
}

export function computeHyperstaticity(structure: Structure): {
  h: Hyperstaticity;
  autoNodes: Set<string>;
} {
  const autoNodes = new Set<string>();
  let releases = 0;
  for (const m of structure.members) {
    if (m.releaseI) releases++;
    if (m.releaseJ) releases++;
  }
  for (const n of structure.nodes) {
    const ends = structure.members.flatMap((m) => {
      const r: boolean[] = [];
      if (m.i === n.id) r.push(!!m.releaseI);
      if (m.j === n.id) r.push(!!m.releaseJ);
      return r;
    });
    if (ends.length > 0 && ends.every((rel) => rel)) autoNodes.add(n.id);
  }
  let r = 0;
  for (const n of structure.nodes) {
    const [bx, by, br] = supportDofs(n.support);
    r += (bx ? 1 : 0) + (by ? 1 : 0) + (br && !autoNodes.has(n.id) ? 1 : 0);
  }
  const m = structure.members.length;
  const nn = structure.nodes.length;
  const degree = 3 * m - releases + r - 3 * nn + autoNodes.size;
  return {
    autoNodes,
    h: {
      degree,
      reactions: r,
      members: m,
      nodes: nn,
      releases,
      classification: degree < 0 ? "hypostatique" : degree === 0 ? "isostatique" : "hyperstatique",
    },
  };
}

export function analyze(structure: Structure): AnalysisResult {
  const nodeIndex = new Map<string, number>();
  structure.nodes.forEach((n, k) => nodeIndex.set(n.id, k));
  if (nodeIndex.size !== structure.nodes.length) {
    return { ok: false, error: "Identifiants de nœuds en double." };
  }
  if (structure.members.length === 0) {
    return { ok: false, error: "La structure ne comporte aucune barre." };
  }

  const { h: hyper, autoNodes } = computeHyperstaticity(structure);

  // Géométrie
  const geos = new Map<string, Geo>();
  for (const m of structure.members) {
    const ni = structure.nodes[nodeIndex.get(m.i) ?? -1];
    const nj = structure.nodes[nodeIndex.get(m.j) ?? -1];
    if (!ni || !nj) return { ok: false, error: `Barre ${m.id} : nœud inconnu.` };
    const dx = nj.x - ni.x;
    const dy = nj.y - ni.y;
    const L = Math.hypot(dx, dy);
    if (L < EPS) return { ok: false, error: `Barre ${m.id} de longueur nulle.` };
    if (!(m.E > 0) || !(m.A > 0) || !(m.I > 0)) {
      return { ok: false, error: `Barre ${m.id} : E, A et I doivent être strictement positifs.` };
    }
    geos.set(m.id, { L, c: dx / L, s: dy / L });
  }

  // Nœuds isolés
  for (const n of structure.nodes) {
    if (!structure.members.some((m) => m.i === n.id || m.j === n.id)) {
      return { ok: false, error: `Le nœud ${n.id} n'est relié à aucune barre.` };
    }
  }

  const ndof = 3 * structure.nodes.length;
  const K = zeros(ndof);
  const P = new Array<number>(ndof).fill(0);

  for (const ld of structure.loads) {
    if (ld.kind !== "nodal") continue;
    const k = nodeIndex.get(ld.node);
    if (k === undefined) return { ok: false, error: `Charge sur un nœud inconnu (${ld.node}).` };
    P[3 * k] += ld.fx;
    P[3 * k + 1] += ld.fy;
    P[3 * k + 2] += ld.mz;
  }

  interface MemberData {
    k: number[][]; // locale complète
    fef: number[]; // locale complète
    recover: (d: number[]) => number[];
    loads: LocalLoads;
    dofs: number[];
  }
  const mdata = new Map<string, MemberData>();

  for (const m of structure.members) {
    const geo = geos.get(m.id)!;
    const { L, c, s } = geo;
    const loads = memberLocalLoads(structure, m.id, geo);
    const kFull = localStiffness(m.E, m.A, m.I, L);
    const fefFull = fixedEndForces(L, loads);
    const released: number[] = [];
    if (m.releaseI) released.push(2);
    if (m.releaseJ) released.push(5);
    const cond = condense(kFull, fefFull, released);
    const ii = nodeIndex.get(m.i)!;
    const jj = nodeIndex.get(m.j)!;
    const dofs = [3 * ii, 3 * ii + 1, 3 * ii + 2, 3 * jj, 3 * jj + 1, 3 * jj + 2];
    // T (6×6), K_g = Tᵀ k T, F_g = Tᵀ f
    const T = zeros(6);
    for (const o of [0, 3]) {
      T[o][o] = c;
      T[o][o + 1] = s;
      T[o + 1][o] = -s;
      T[o + 1][o + 1] = c;
      T[o + 2][o + 2] = 1;
    }
    const kc = cond.k;
    // kT = kc · T
    const kT = zeros(6);
    for (let p = 0; p < 6; p++)
      for (let q = 0; q < 6; q++) {
        let acc = 0;
        for (let r = 0; r < 6; r++) acc += kc[p][r] * T[r][q];
        kT[p][q] = acc;
      }
    for (let p = 0; p < 6; p++)
      for (let q = 0; q < 6; q++) {
        let acc = 0;
        for (let r = 0; r < 6; r++) acc += T[r][p] * kT[r][q];
        K[dofs[p]][dofs[q]] += acc;
      }
    for (let p = 0; p < 6; p++) {
      let acc = 0;
      for (let r = 0; r < 6; r++) acc += T[r][p] * cond.fef[r];
      P[dofs[p]] -= acc; // charges nodales équivalentes = −efforts d'encastrement
    }
    mdata.set(m.id, { k: kFull, fef: fefFull, recover: cond.recover, loads, dofs });
  }

  // Degrés de liberté bloqués
  const restrained = new Array<boolean>(ndof).fill(false);
  structure.nodes.forEach((n, k) => {
    const [bx, by, br] = supportDofs(n.support);
    restrained[3 * k] = bx;
    restrained[3 * k + 1] = by;
    restrained[3 * k + 2] = br;
  });
  const autoRestrained: string[] = [];
  for (const id of autoNodes) {
    const k = nodeIndex.get(id)!;
    if (Math.abs(P[3 * k + 2]) > EPS && !restrained[3 * k + 2]) {
      return {
        ok: false,
        error: `Un couple est appliqué au nœud ${id} alors que toutes les barres y sont articulées : il ne peut pas être équilibré.`,
        hyperstaticity: hyper,
      };
    }
    restrained[3 * k + 2] = true;
    autoRestrained.push(id);
  }

  const free: number[] = [];
  for (let k = 0; k < ndof; k++) if (!restrained[k]) free.push(k);

  const D = new Array<number>(ndof).fill(0);
  if (free.length > 0) {
    const Kff = free.map((p) => free.map((q) => K[p][q]));
    const Pf = free.map((p) => P[p]);
    try {
      const Df = solve(Kff, Pf);
      free.forEach((p, k) => (D[p] = Df[k]));
    } catch (e) {
      if (e instanceof SingularMatrixError) {
        return {
          ok: false,
          error:
            "La structure est un mécanisme (hypostatique) : elle peut se déplacer sans se déformer. Ajoutez ou modifiez des appuis.",
          hyperstaticity: hyper,
        };
      }
      throw e;
    }
  }

  // Post-traitement des barres
  const members: Record<string, MemberResult> = {};
  const nodalFromMembers = new Array<number>(ndof).fill(0);
  for (const m of structure.members) {
    const geo = geos.get(m.id)!;
    const md = mdata.get(m.id)!;
    const { c, s, L } = geo;
    const dg = md.dofs.map((p) => D[p]);
    const dl0 = [
      c * dg[0] + s * dg[1],
      -s * dg[0] + c * dg[1],
      dg[2],
      c * dg[3] + s * dg[4],
      -s * dg[3] + c * dg[4],
      dg[5],
    ];
    const dl = md.recover(dl0);
    const f = md.k.map((row, p) => row.reduce((acc, kv, q) => acc + kv * dl[q], 0) + md.fef[p]);
    if (m.releaseI) f[2] = 0;
    if (m.releaseJ) f[5] = 0;
    // forces globales d'extrémité
    const fg = [c * f[0] - s * f[1], s * f[0] + c * f[1], f[2], c * f[3] - s * f[4], s * f[3] + c * f[4], f[5]];
    md.dofs.forEach((p, k) => (nodalFromMembers[p] += fg[k]));
    members[m.id] = buildMemberResult(m.id, geo, f, dl, md.loads, m.E, m.A, m.I);
  }

  // Réactions : R = Σ f_barres − P_nodal
  const Pnodal = new Array<number>(ndof).fill(0);
  for (const ld of structure.loads) {
    if (ld.kind !== "nodal") continue;
    const k = nodeIndex.get(ld.node)!;
    Pnodal[3 * k] += ld.fx;
    Pnodal[3 * k + 1] += ld.fy;
    Pnodal[3 * k + 2] += ld.mz;
  }
  const reactions: Record<string, Reaction> = {};
  const displacements: Record<string, NodeDisplacement> = {};
  structure.nodes.forEach((n, k) => {
    displacements[n.id] = { ux: D[3 * k], uy: D[3 * k + 1], rz: D[3 * k + 2] };
    const [bx, by, br0] = supportDofs(n.support);
    const br = br0 && !autoNodes.has(n.id);
    if (bx || by || br) {
      const R = [0, 1, 2].map((q) => nodalFromMembers[3 * k + q] - Pnodal[3 * k + q]);
      reactions[n.id] = {
        rx: bx ? R[0] : 0,
        ry: by ? R[1] : 0,
        mz: br ? R[2] : 0,
        blocked: { x: bx, y: by, rz: br },
      };
    }
  });

  // Contrôle d'équilibre global (moments par rapport à l'origine)
  let sumFx = 0;
  let sumFy = 0;
  let sumM = 0;
  structure.nodes.forEach((n) => {
    const r = reactions[n.id];
    if (!r) return;
    sumFx += r.rx;
    sumFy += r.ry;
    sumM += r.mz + n.x * r.ry - n.y * r.rx;
  });
  for (const ld of structure.loads) {
    if (ld.kind === "nodal") {
      const n = structure.nodes[nodeIndex.get(ld.node)!];
      sumFx += ld.fx;
      sumFy += ld.fy;
      sumM += ld.mz + n.x * ld.fy - n.y * ld.fx;
    }
  }
  for (const m of structure.members) {
    const geo = geos.get(m.id)!;
    const md = mdata.get(m.id)!;
    const ni = structure.nodes[nodeIndex.get(m.i)!];
    // résultantes locales des charges de barre, ramenées en i puis en global
    const loads = md.loads;
    let Fx = 0;
    let Fy = 0;
    let Mi = 0;
    for (const p of loads.points) {
      Fx += p.px;
      Fy += p.py;
      Mi += p.a * p.py;
    }
    for (const cm of loads.moments) Mi += cm.m;
    for (const d of loads.dists) {
      const len = d.b - d.a;
      const Rx = ((d.qx1 + d.qx2) / 2) * len;
      const Ry = ((d.qy1 + d.qy2) / 2) * len;
      Fx += Rx;
      Fy += Ry;
      // ∫ q(ξ)·ξ dξ pour q linéaire
      const mom = len * (d.a * (d.qy1 + d.qy2) / 2 + (len * (d.qy1 + 2 * d.qy2)) / 6);
      Mi += mom;
    }
    const { c, s } = geo;
    const gx = c * Fx - s * Fy;
    const gy = s * Fx + c * Fy;
    sumFx += gx;
    sumFy += gy;
    sumM += Mi + ni.x * gy - ni.y * gx;
  }

  const warnings: string[] = [];
  if (hyper.degree < 0) {
    warnings.push(
      "Le décompte des liaisons indique une structure hypostatique ; l'équilibre n'est possible que pour ce chargement particulier.",
    );
  }

  return {
    ok: true,
    displacements,
    reactions,
    members,
    hyperstaticity: hyper,
    equilibrium: { sumFx, sumFy, sumM },
    autoRestrainedRotations: autoRestrained,
    warnings,
  };
}

function buildMemberResult(
  id: string,
  geo: Geo,
  f: number[],
  d: number[],
  loads: LocalLoads,
  E: number,
  A: number,
  I: number,
): MemberResult {
  const { L, c, s } = geo;
  const bps = loadBreakpoints(L, loads);
  const forcesAt = (x: number, side: "left" | "right" = "left") =>
    internalForcesAt(f[0], f[1], f[2], loads, x, side);
  const Nf = (x: number) => forcesAt(x).N;
  const Mf = (x: number) => forcesAt(x).M;
  const displacementAt = (x: number) => displacementAlong(x, d, E, A, I, Nf, Mf, bps);

  // Échantillonnage
  const segs = [0, ...bps, L];
  const stations: Station[] = [];
  const pushStation = (x: number, side: "left" | "right") => {
    const fo = forcesAt(x, side);
    const dp = displacementAt(x);
    stations.push({ x, ...fo, ...dp });
  };
  for (let k = 0; k < segs.length - 1; k++) {
    const x0 = segs[k];
    const x1 = segs[k + 1];
    const n = Math.max(6, Math.ceil((48 * (x1 - x0)) / L));
    for (let q = 0; q <= n; q++) {
      const x = x0 + ((x1 - x0) * q) / n;
      // à x0 on se place juste à droite de la discontinuité, à x1 juste à gauche
      pushStation(x, q === 0 ? "right" : "left");
    }
  }

  const ext = (key: "N" | "V" | "M" | "v", better: (a: number, b: number) => boolean): Extremum => {
    let best: Extremum = { value: stations[0][key], x: stations[0].x };
    for (const st of stations) if (better(st[key], best.value)) best = { value: st[key], x: st.x };
    return best;
  };
  const gt = (a: number, b: number) => a > b + 1e-12;
  const lt = (a: number, b: number) => a < b - 1e-12;

  // Moment : extremums exacts aux points où V = 0
  let Mmax = ext("M", gt);
  let Mmin = ext("M", lt);
  for (let k = 0; k < segs.length - 1; k++) {
    for (const xr of quadraticRoots((x) => forcesAt(x).V, segs[k], segs[k + 1])) {
      const Mv = Mf(xr);
      if (Mv > Mmax.value + 1e-12) Mmax = { value: Mv, x: xr };
      if (Mv < Mmin.value - 1e-12) Mmin = { value: Mv, x: xr };
    }
  }

  // Flèche : extremums affinés là où θ change de signe
  let vmax = ext("v", gt);
  let vmin = ext("v", lt);
  for (let k = 0; k < stations.length - 1; k++) {
    const a = stations[k];
    const b = stations[k + 1];
    if (b.x - a.x < 1e-12) continue;
    if (a.theta === 0 || a.theta * b.theta < 0) {
      let lo = a.x;
      let hi = b.x;
      let tlo = a.theta;
      for (let it = 0; it < 60; it++) {
        const mid = (lo + hi) / 2;
        const tm = displacementAt(mid).theta;
        if (tlo * tm <= 0) hi = mid;
        else {
          lo = mid;
          tlo = tm;
        }
      }
      const xr = (lo + hi) / 2;
      const vv = displacementAt(xr).v;
      if (vv > vmax.value) vmax = { value: vv, x: xr };
      if (vv < vmin.value) vmin = { value: vv, x: xr };
    }
  }

  return {
    id,
    L,
    c,
    s,
    endForces: f,
    endDisplacements: d,
    breakpoints: bps,
    forcesAt,
    displacementAt,
    stations,
    extremes: {
      Nmax: ext("N", gt),
      Nmin: ext("N", lt),
      Vmax: ext("V", gt),
      Vmin: ext("V", lt),
      Mmax,
      Mmin,
      vmax,
      vmin,
    },
  };
}
