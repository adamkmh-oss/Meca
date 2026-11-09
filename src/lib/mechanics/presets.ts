/** Générateurs de structures paramétrées : portiques et treillis. */
import type { Load, Structure, StructMember, StructNode } from "./types";

export interface PortalParams {
  /** Portée (m) */
  span: number;
  /** Hauteur des poteaux (m) */
  height: number;
  base: "fixed" | "pin";
  /** kN/m² */
  E: number;
  /** Poteaux : A (m²), I (m⁴) */
  Ac: number;
  Ic: number;
  /** Traverse : A (m²), I (m⁴) */
  Ab: number;
  Ib: number;
  /** Charge uniformément répartie sur la traverse (kN/m, vers le bas). */
  q: number;
  /** Force horizontale en tête de poteau gauche (kN, vers la droite). */
  H: number;
  /** Force verticale au milieu de la traverse (kN, vers le bas). */
  P: number;
}

/**
 * Portique simple : A (pied gauche), B (tête gauche), C (tête droite),
 * D (pied droit). Barres : AB (poteau gauche, de bas en haut), BC (traverse),
 * DC (poteau droit, de bas en haut).
 */
export function portalFrame(p: PortalParams): Structure {
  const nodes: StructNode[] = [
    { id: "A", x: 0, y: 0, support: p.base },
    { id: "B", x: 0, y: p.height },
    { id: "C", x: p.span, y: p.height },
    { id: "D", x: p.span, y: 0, support: p.base },
  ];
  const members: StructMember[] = [
    { id: "AB", i: "A", j: "B", E: p.E, A: p.Ac, I: p.Ic },
    { id: "BC", i: "B", j: "C", E: p.E, A: p.Ab, I: p.Ib },
    { id: "DC", i: "D", j: "C", E: p.E, A: p.Ac, I: p.Ic },
  ];
  const loads: Load[] = [];
  if (p.q !== 0) loads.push({ kind: "dist", member: "BC", a: 0, b: p.span, q1: -p.q, q2: -p.q, dir: "gy" });
  if (p.H !== 0) loads.push({ kind: "nodal", node: "B", fx: p.H, fy: 0, mz: 0 });
  if (p.P !== 0) loads.push({ kind: "point", member: "BC", a: p.span / 2, fx: 0, fy: -p.P });
  return { nodes, members, loads };
}

export type TrussType = "pratt" | "howe" | "warren";

export interface TrussParams {
  type: TrussType;
  /** Nombre de panneaux (≥ 2) */
  panels: number;
  span: number;
  height: number;
  /** kN/m² */
  E: number;
  /** m² */
  A: number;
  /** Charge verticale (kN, vers le bas) appliquée à chaque nœud chargé. */
  P: number;
  /** Nœuds chargés : membrure supérieure ou inférieure. */
  loadedChord: "top" | "bottom";
}

/** Treillis plan articulé (toutes les barres bi-articulées). */
export function truss(p: TrussParams): Structure {
  const n = Math.max(2, Math.round(p.panels));
  const d = p.span / n;
  const nodes: StructNode[] = [];
  const members: StructMember[] = [];
  const I = 1e-6; // sans influence : barres bi-articulées
  const bar = (id: string, i: string, j: string): StructMember => ({
    id,
    i,
    j,
    E: p.E,
    A: p.A,
    I,
    releaseI: true,
    releaseJ: true,
  });
  for (let k = 0; k <= n; k++) {
    nodes.push({ id: `B${k}`, x: k * d, y: 0, support: k === 0 ? "pin" : k === n ? "roller" : undefined });
  }
  for (let k = 0; k < n; k++) members.push(bar(`b${k}`, `B${k}`, `B${k + 1}`));

  if (p.type === "warren") {
    for (let k = 0; k < n; k++) nodes.push({ id: `T${k}`, x: (k + 0.5) * d, y: p.height });
    for (let k = 0; k < n - 1; k++) members.push(bar(`t${k}`, `T${k}`, `T${k + 1}`));
    for (let k = 0; k < n; k++) {
      members.push(bar(`dl${k}`, `B${k}`, `T${k}`));
      members.push(bar(`dr${k}`, `T${k}`, `B${k + 1}`));
    }
  } else {
    for (let k = 0; k <= n; k++) nodes.push({ id: `T${k}`, x: k * d, y: p.height });
    for (let k = 0; k < n; k++) members.push(bar(`t${k}`, `T${k}`, `T${k + 1}`));
    for (let k = 0; k <= n; k++) members.push(bar(`v${k}`, `B${k}`, `T${k}`));
    for (let k = 0; k < n; k++) {
      const leftHalf = k + 0.5 < n / 2;
      // Pratt : diagonales descendant vers le milieu (tendues sous charges gravitaires)
      // Howe : diagonales montant vers le milieu (comprimées)
      const descendToCenter = p.type === "pratt";
      if (leftHalf === descendToCenter) members.push(bar(`d${k}`, `T${k}`, `B${k + 1}`));
      else members.push(bar(`d${k}`, `B${k}`, `T${k + 1}`));
    }
  }

  const loads: Load[] = [];
  if (p.P !== 0) {
    const targets = nodes.filter((nd) => (p.loadedChord === "top" ? nd.id.startsWith("T") : nd.id.startsWith("B")));
    for (const nd of targets) loads.push({ kind: "nodal", node: nd.id, fx: 0, fy: -p.P, mz: 0 });
  }
  return { nodes, members, loads };
}
