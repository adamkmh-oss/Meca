/**
 * Modèle « poutre droite horizontale » utilisé par le simulateur et les
 * exercices, et sa conversion en structure (nœuds + barres) pour le solveur.
 *
 * Conventions de saisie (orientées étudiant) :
 *  - force ponctuelle : intensité F > 0 (kN) et direction `angle` en degrés
 *    mesurée depuis l'axe +X dans le sens trigonométrique (−90° = vers le bas) ;
 *  - charge répartie : q1, q2 en kN/m, POSITIVES VERS LE BAS ;
 *  - couple : M en kN·m, positif dans le sens anti-horaire.
 */
import { analyze } from "./solver";
import type { AnalysisResult, Load, Structure, StructMember, StructNode, SupportType } from "./types";

export interface BeamSupport {
  id: string;
  x: number;
  type: Exclude<SupportType, "free">;
}

export interface BeamHinge {
  id: string;
  x: number;
}

export type BeamLoad =
  | { id: string; kind: "point"; x: number; F: number; angle: number }
  | { id: string; kind: "dist"; x1: number; x2: number; q1: number; q2: number }
  | { id: string; kind: "moment"; x: number; M: number };

export interface BeamModel {
  length: number;
  /** kN/m² */
  E: number;
  /** m² */
  A: number;
  /** m⁴ */
  I: number;
  supports: BeamSupport[];
  hinges: BeamHinge[];
  loads: BeamLoad[];
}

const TOL = 1e-9;

export function pointLoadComponents(F: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  const fx = F * Math.cos(a);
  const fy = F * Math.sin(a);
  return { fx: Math.abs(fx) < 1e-12 * Math.abs(F) ? 0 : fx, fy: Math.abs(fy) < 1e-12 * Math.abs(F) ? 0 : fy };
}

export interface BeamStructure {
  structure: Structure;
  /** Abscisses des nœuds (dans l'ordre). */
  xs: number[];
  nodeIdAt: (x: number) => string | undefined;
  /** Barres dans l'ordre, avec leur abscisse d'origine. */
  segments: { id: string; x0: number; x1: number }[];
}

export function beamToStructure(model: BeamModel): BeamStructure {
  const L = model.length;
  const raw = [0, L, ...model.supports.map((s) => s.x), ...model.hinges.map((h) => h.x)]
    .map((x) => Math.min(Math.max(x, 0), L))
    .sort((a, b) => a - b);
  const xs: number[] = [];
  for (const x of raw) if (xs.length === 0 || x - xs[xs.length - 1] > TOL) xs.push(x);

  const nodes: StructNode[] = xs.map((x, k) => ({ id: `N${k}`, x, y: 0 }));
  const nodeIdAt = (x: number) => {
    const k = xs.findIndex((v) => Math.abs(v - x) <= 1e-7);
    return k >= 0 ? nodes[k].id : undefined;
  };
  // Appuis (si deux appuis au même endroit, on garde le plus contraignant)
  const rank: Record<string, number> = { roller: 1, rollerX: 1, pin: 2, fixed: 3 };
  for (const s of model.supports) {
    const id = nodeIdAt(Math.min(Math.max(s.x, 0), L));
    const n = nodes.find((nn) => nn.id === id);
    if (!n) continue;
    if (!n.support || n.support === "free" || rank[s.type] > rank[n.support]) n.support = s.type;
  }
  const segments = xs.slice(0, -1).map((x0, k) => ({ id: `B${k}`, x0, x1: xs[k + 1] }));
  const hingeXs = model.hinges.map((h) => h.x).filter((x) => x > TOL && x < L - TOL);
  const members: StructMember[] = segments.map((sg, k) => ({
    id: sg.id,
    i: nodes[k].id,
    j: nodes[k + 1].id,
    E: model.E,
    A: model.A,
    I: model.I,
    releaseJ: hingeXs.some((x) => Math.abs(x - sg.x1) <= 1e-7),
  }));

  const findSeg = (x: number) =>
    segments.find((sg) => x >= sg.x0 - TOL && x <= sg.x1 + TOL) ?? segments[segments.length - 1];

  const loads: Load[] = [];
  for (const ld of model.loads) {
    if (ld.kind === "point") {
      const x = Math.min(Math.max(ld.x, 0), L);
      const sg = findSeg(x);
      const { fx, fy } = pointLoadComponents(ld.F, ld.angle);
      loads.push({ kind: "point", member: sg.id, a: Math.min(Math.max(x - sg.x0, 0), sg.x1 - sg.x0), fx, fy });
    } else if (ld.kind === "moment") {
      const x = Math.min(Math.max(ld.x, 0), L);
      const sg = findSeg(x);
      loads.push({ kind: "moment", member: sg.id, a: Math.min(Math.max(x - sg.x0, 0), sg.x1 - sg.x0), m: ld.M });
    } else {
      const l1 = Math.max(Math.min(ld.x1, ld.x2), 0);
      const l2 = Math.min(Math.max(ld.x1, ld.x2), L);
      if (l2 - l1 <= TOL) continue;
      const [qa, qb] = ld.x1 <= ld.x2 ? [ld.q1, ld.q2] : [ld.q2, ld.q1];
      const q = (x: number) => qa + ((qb - qa) * (x - l1)) / (l2 - l1);
      for (const sg of segments) {
        const a = Math.max(sg.x0, l1);
        const b = Math.min(sg.x1, l2);
        if (b - a <= TOL) continue;
        // charges vers le bas → composante Y globale négative
        loads.push({ kind: "dist", member: sg.id, a: a - sg.x0, b: b - sg.x0, q1: -q(a), q2: -q(b), dir: "gy" });
      }
    }
  }
  return { structure: { nodes, members, loads }, xs, nodeIdAt, segments };
}

export interface BeamPoint {
  x: number;
  N: number;
  V: number;
  M: number;
  /** Flèche (m), positive vers le haut. */
  v: number;
  theta: number;
}

export interface BeamAnalysis {
  model: BeamModel;
  built: BeamStructure;
  result: AnalysisResult;
  /** Diagrammes le long de la poutre (abscisse globale). */
  points: BeamPoint[];
  /** Valeurs aux abscisses demandées (côté gauche/droit). */
  at: (x: number, side?: "left" | "right") => BeamPoint;
  extremes: {
    Mmax: { value: number; x: number };
    Mmin: { value: number; x: number };
    Vmax: { value: number; x: number };
    Vmin: { value: number; x: number };
    Nmax: { value: number; x: number };
    Nmin: { value: number; x: number };
    vmin: { value: number; x: number };
    vmax: { value: number; x: number };
  };
}

export function analyzeBeam(model: BeamModel): BeamAnalysis {
  const built = beamToStructure(model);
  const result = analyze(built.structure);
  const points: BeamPoint[] = [];
  const empty = { value: 0, x: 0 };
  const extremes = {
    Mmax: { ...empty },
    Mmin: { ...empty },
    Vmax: { ...empty },
    Vmin: { ...empty },
    Nmax: { ...empty },
    Nmin: { ...empty },
    vmin: { ...empty },
    vmax: { ...empty },
  };
  if (result.ok) {
    let first = true;
    for (const sg of built.segments) {
      const mr = result.members[sg.id];
      for (const st of mr.stations) {
        points.push({ x: sg.x0 + st.x, N: st.N, V: st.V, M: st.M, v: st.v, theta: st.theta });
      }
      const e = mr.extremes;
      const upd = (key: keyof typeof extremes, cand: { value: number; x: number }, max: boolean) => {
        const cur = extremes[key];
        if (first || (max ? cand.value > cur.value : cand.value < cur.value)) {
          extremes[key] = { value: cand.value, x: sg.x0 + cand.x };
        }
      };
      upd("Mmax", e.Mmax, true);
      upd("Mmin", e.Mmin, false);
      upd("Vmax", e.Vmax, true);
      upd("Vmin", e.Vmin, false);
      upd("Nmax", e.Nmax, true);
      upd("Nmin", e.Nmin, false);
      upd("vmax", e.vmax, true);
      upd("vmin", e.vmin, false);
      first = false;
    }
  }
  const at = (x: number, side: "left" | "right" = "left"): BeamPoint => {
    if (!result.ok) return { x, N: 0, V: 0, M: 0, v: 0, theta: 0 };
    const segs = built.segments;
    let sg = segs.find((s) => x > s.x0 + TOL && x < s.x1 - TOL);
    if (!sg) {
      // x sur un nœud : côté gauche → barre qui se termine en x, côté droit → barre qui commence en x
      if (side === "left") sg = segs.find((s) => Math.abs(s.x1 - x) <= TOL) ?? segs[0];
      else sg = segs.find((s) => Math.abs(s.x0 - x) <= TOL) ?? segs[segs.length - 1];
    }
    const mr = result.members[sg.id];
    const xl = Math.min(Math.max(x - sg.x0, 0), sg.x1 - sg.x0);
    const f = mr.forcesAt(xl, side);
    const d = mr.displacementAt(xl);
    return { x, ...f, v: d.v, theta: d.theta };
  };
  return { model, built, result, points, at, extremes };
}

/** Somme des charges verticales (positives vers le bas, kN) d'un modèle de poutre. */
export function totalDownwardLoad(model: BeamModel): number {
  let s = 0;
  for (const ld of model.loads) {
    if (ld.kind === "point") s -= pointLoadComponents(ld.F, ld.angle).fy;
    else if (ld.kind === "dist") s += ((ld.q1 + ld.q2) / 2) * Math.abs(ld.x2 - ld.x1);
  }
  return s;
}
