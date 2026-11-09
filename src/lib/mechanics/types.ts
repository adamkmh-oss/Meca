/**
 * STRUCTURA — Moteur de calcul des structures planes (2D)
 *
 * Unités internes (cohérentes, SI dérivées) :
 *   - longueurs ............ m
 *   - forces ............... kN
 *   - moments .............. kN·m
 *   - charges réparties .... kN/m
 *   - module d'Young E ..... kN/m² (1 GPa = 1e6 kN/m², 1 MPa = 1e3 kN/m²)
 *   - aire A ............... m²
 *   - moment quadratique I . m⁴
 *   - déplacements ......... m, rotations en rad
 *
 * Repère global : X vers la droite, Y vers le haut, rotations positives
 * dans le sens trigonométrique (anti-horaire).
 *
 * Repère local d'une barre i → j : x de i vers j, y obtenu par rotation de
 * +90° de x. Pour une poutre horizontale décrite de gauche à droite, le
 * repère local coïncide avec le repère global.
 */

/** Conditions d'appui disponibles. */
export type SupportType =
  /** Nœud libre (pas d'appui). */
  | "free"
  /** Appui simple (rouleau) sur plan horizontal : bloque uy. 1 réaction. */
  | "roller"
  /** Appui simple (rouleau) sur plan vertical : bloque ux. 1 réaction. */
  | "rollerX"
  /** Articulation (rotule fixe) : bloque ux et uy. 2 réactions. */
  | "pin"
  /** Encastrement : bloque ux, uy et rz. 3 réactions. */
  | "fixed";

export interface StructNode {
  id: string;
  x: number;
  y: number;
  support?: SupportType;
}

export interface StructMember {
  id: string;
  /** Nœud origine. */
  i: string;
  /** Nœud extrémité. */
  j: string;
  /** Module d'Young (kN/m²). */
  E: number;
  /** Aire de la section (m²). */
  A: number;
  /** Moment quadratique (m⁴). */
  I: number;
  /** Rotule (libération du moment) à l'origine de la barre. */
  releaseI?: boolean;
  /** Rotule (libération du moment) à l'extrémité de la barre. */
  releaseJ?: boolean;
}

/** Charge appliquée directement sur un nœud (composantes globales). */
export interface NodalLoad {
  kind: "nodal";
  node: string;
  fx: number;
  fy: number;
  mz: number;
}

/** Force concentrée sur une barre, à la distance `a` (m) du nœud i. */
export interface MemberPointLoad {
  kind: "point";
  member: string;
  a: number;
  /** Composantes globales (kN). */
  fx: number;
  fy: number;
}

/** Couple concentré sur une barre, à la distance `a` (m) du nœud i. */
export interface MemberMomentLoad {
  kind: "moment";
  member: string;
  a: number;
  /** kN·m, positif anti-horaire. */
  m: number;
}

/**
 * Charge répartie à variation linéaire entre `a` et `b` (m, mesurés depuis i
 * le long de la barre). Intensités exprimées par mètre de barre.
 *  - dir "gy" : composante selon Y global (positif vers le haut)
 *  - dir "gx" : composante selon X global
 *  - dir "ly" : perpendiculaire à la barre (y local)
 */
export interface MemberDistLoad {
  kind: "dist";
  member: string;
  a: number;
  b: number;
  q1: number;
  q2: number;
  dir: "gy" | "gx" | "ly";
}

export type Load = NodalLoad | MemberPointLoad | MemberMomentLoad | MemberDistLoad;

export interface Structure {
  nodes: StructNode[];
  members: StructMember[];
  loads: Load[];
}

/* -------------------------------------------------------------------------- */
/*                                  Résultats                                 */
/* -------------------------------------------------------------------------- */

export interface NodeDisplacement {
  ux: number;
  uy: number;
  rz: number;
}

export interface Reaction {
  rx: number;
  ry: number;
  mz: number;
  /** Composantes effectivement bloquées par l'appui. */
  blocked: { x: boolean; y: boolean; rz: boolean };
}

export interface InternalForces {
  /** Effort normal (kN), positif en traction. */
  N: number;
  /**
   * Effort tranchant (kN) : somme des forces (selon y local) appliquées sur
   * la partie gauche (côté nœud i) de la coupure. On a dM/dx = V.
   */
  V: number;
  /**
   * Moment fléchissant (kN·m), positif lorsqu'il tend la fibre située du côté
   * −y local (fibre inférieure pour une poutre horizontale décrite de gauche à
   * droite).
   */
  M: number;
}

export interface Station extends InternalForces {
  /** Abscisse locale (m). */
  x: number;
  /** Déplacement axial local (m). */
  u: number;
  /** Déplacement transversal local (m). */
  v: number;
  /** Rotation (rad). */
  theta: number;
}

export interface Extremum {
  value: number;
  x: number;
}

export interface MemberResult {
  id: string;
  L: number;
  /** cos et sin de l'angle de la barre. */
  c: number;
  s: number;
  /** Efforts d'extrémité exercés SUR la barre, repère local [Ni,Vi,Mi,Nj,Vj,Mj]. */
  endForces: number[];
  /** Déplacements d'extrémité de la barre, repère local. */
  endDisplacements: number[];
  /** Abscisses des discontinuités (charges, bornes de charges réparties). */
  breakpoints: number[];
  /** Efforts internes à l'abscisse x. side = côté de la coupure en cas de discontinuité. */
  forcesAt(x: number, side?: "left" | "right"): InternalForces;
  /** Déplacements à l'abscisse x (repère local). */
  displacementAt(x: number): { u: number; v: number; theta: number };
  /** Échantillonnage (avec doublons aux discontinuités pour représenter les sauts). */
  stations: Station[];
  extremes: {
    Nmax: Extremum;
    Nmin: Extremum;
    Vmax: Extremum;
    Vmin: Extremum;
    Mmax: Extremum;
    Mmin: Extremum;
    /** Déplacement transversal local extrême (m). */
    vmax: Extremum;
    vmin: Extremum;
  };
}

export interface Hyperstaticity {
  /** Degré d'hyperstaticité h (h < 0 : mécanisme, h = 0 : isostatique). */
  degree: number;
  /** Nombre d'inconnues de liaison externes (réactions). */
  reactions: number;
  members: number;
  nodes: number;
  /** Nombre de libérations internes (rotules) effectives. */
  releases: number;
  classification: "hypostatique" | "isostatique" | "hyperstatique";
}

export interface AnalysisSuccess {
  ok: true;
  displacements: Record<string, NodeDisplacement>;
  reactions: Record<string, Reaction>;
  members: Record<string, MemberResult>;
  hyperstaticity: Hyperstaticity;
  /** Contrôle d'équilibre global (doit être ≈ 0). */
  equilibrium: { sumFx: number; sumFy: number; sumM: number };
  /** Nœuds dont la rotation a été bloquée car indéterminée (toutes les barres y sont articulées). */
  autoRestrainedRotations: string[];
  warnings: string[];
}

export interface AnalysisFailure {
  ok: false;
  error: string;
  hyperstaticity?: Hyperstaticity;
}

export type AnalysisResult = AnalysisSuccess | AnalysisFailure;
