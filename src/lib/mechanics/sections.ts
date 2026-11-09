/**
 * Caractéristiques géométriques des sections et matériaux courants.
 *
 * Unités de sortie : A en m², I en m⁴, v (distance à la fibre extrême) en m,
 * W = I / v en m³.
 */

export interface SectionProps {
  A: number;
  I: number;
  /** Distance de l'axe neutre à la fibre la plus éloignée (m). */
  v: number;
  /** Module de flexion élastique I/v (m³). */
  W: number;
  /** Hauteur totale (m), pour le dessin. */
  h: number;
  label: string;
}

export function rectangle(b: number, h: number): SectionProps {
  const A = b * h;
  const I = (b * h ** 3) / 12;
  return { A, I, v: h / 2, W: I / (h / 2), h, label: `Rectangle ${b * 100}×${h * 100} cm` };
}

export function circle(d: number): SectionProps {
  const A = (Math.PI * d * d) / 4;
  const I = (Math.PI * d ** 4) / 64;
  return { A, I, v: d / 2, W: I / (d / 2), h: d, label: `Disque Ø${d * 1000} mm` };
}

export function tube(D: number, t: number): SectionProps {
  const d = D - 2 * t;
  const A = (Math.PI * (D * D - d * d)) / 4;
  const I = (Math.PI * (D ** 4 - d ** 4)) / 64;
  return { A, I, v: D / 2, W: I / (D / 2), h: D, label: `Tube Ø${D * 1000}×${t * 1000} mm` };
}

/**
 * Profilés IPE (axe fort y-y). Valeurs des catalogues de profilés laminés
 * européens : h, b (mm) ; A (cm²) ; Iy (cm⁴) ; Wel,y (cm³).
 */
export const IPE_TABLE: { name: string; h: number; b: number; A: number; Iy: number; Wel: number }[] = [
  { name: "IPE 100", h: 100, b: 55, A: 10.3, Iy: 171, Wel: 34.2 },
  { name: "IPE 120", h: 120, b: 64, A: 13.2, Iy: 318, Wel: 53.0 },
  { name: "IPE 140", h: 140, b: 73, A: 16.4, Iy: 541, Wel: 77.3 },
  { name: "IPE 160", h: 160, b: 82, A: 20.1, Iy: 869, Wel: 109 },
  { name: "IPE 180", h: 180, b: 91, A: 23.9, Iy: 1317, Wel: 146 },
  { name: "IPE 200", h: 200, b: 100, A: 28.5, Iy: 1943, Wel: 194 },
  { name: "IPE 220", h: 220, b: 110, A: 33.4, Iy: 2772, Wel: 252 },
  { name: "IPE 240", h: 240, b: 120, A: 39.1, Iy: 3892, Wel: 324 },
  { name: "IPE 270", h: 270, b: 135, A: 45.9, Iy: 5790, Wel: 429 },
  { name: "IPE 300", h: 300, b: 150, A: 53.8, Iy: 8356, Wel: 557 },
  { name: "IPE 330", h: 330, b: 160, A: 62.6, Iy: 11770, Wel: 713 },
  { name: "IPE 360", h: 360, b: 170, A: 72.7, Iy: 16270, Wel: 904 },
  { name: "IPE 400", h: 400, b: 180, A: 84.5, Iy: 23130, Wel: 1156 },
  { name: "IPE 450", h: 450, b: 190, A: 98.8, Iy: 33740, Wel: 1500 },
  { name: "IPE 500", h: 500, b: 200, A: 116, Iy: 48200, Wel: 1928 },
];

export function ipe(name: string): SectionProps {
  const p = IPE_TABLE.find((r) => r.name === name) ?? IPE_TABLE[5];
  return {
    A: p.A * 1e-4,
    I: p.Iy * 1e-8,
    v: p.h / 2000,
    W: p.Wel * 1e-6,
    h: p.h / 1000,
    label: p.name,
  };
}

export interface Material {
  id: string;
  name: string;
  /** Module d'Young (GPa). */
  E: number;
  /** Résistance caractéristique indicative (MPa) et sa signification. */
  strength: number;
  strengthLabel: string;
  /** Poids volumique (kN/m³). */
  gamma: number;
}

export const MATERIALS: Material[] = [
  { id: "S235", name: "Acier S235", E: 210, strength: 235, strengthLabel: "f_y", gamma: 78.5 },
  { id: "S355", name: "Acier S355", E: 210, strength: 355, strengthLabel: "f_y", gamma: 78.5 },
  { id: "C25", name: "Béton C25/30", E: 31, strength: 25, strengthLabel: "f_ck", gamma: 25 },
  { id: "C30", name: "Béton C30/37", E: 33, strength: 30, strengthLabel: "f_ck", gamma: 25 },
  { id: "C24", name: "Bois massif C24", E: 11, strength: 24, strengthLabel: "f_m,k", gamma: 4.2 },
  { id: "GL24h", name: "Bois lamellé-collé GL24h", E: 11.5, strength: 24, strengthLabel: "f_m,k", gamma: 4.2 },
  { id: "ALU", name: "Aluminium (alliage 6061)", E: 70, strength: 240, strengthLabel: "f_0,2", gamma: 27 },
];

/** Conversions d'unités vers les unités internes du moteur. */
export const units = {
  /** GPa → kN/m² */
  GPa: (v: number) => v * 1e6,
  /** MPa → kN/m² */
  MPa: (v: number) => v * 1e3,
  /** cm² → m² */
  cm2: (v: number) => v * 1e-4,
  /** cm⁴ → m⁴ */
  cm4: (v: number) => v * 1e-8,
  /** kN/m² → MPa */
  toMPa: (v: number) => v / 1e3,
  /** m → mm */
  toMm: (v: number) => v * 1e3,
};
