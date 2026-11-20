/**
 * Catalogue des symboles mécaniques préfabriqués : appuis, charges,
 * réactions, coupures et torseurs, éléments, sections, structures types,
 * axes de diagrammes.
 *
 * Chaque symbole est dessiné dans un repère local dont l'origine est le
 * point d'accroche (contact de l'appui, pointe de la force, extrémité
 * gauche de la poutre…). Rotation et échelle s'appliquent autour de ce point.
 * La boîte locale ci-dessous doit rester cohérente avec le dessin
 * (src/components/notebook/symbol-art.tsx).
 */
import type { Rect, SymbolEl } from "./types";

export type SymbolCategory = "Structures types" | "Appuis" | "Charges" | "Réactions" | "Coupures" | "Éléments" | "Sections" | "Diagrammes";

export const SYMBOL_CATEGORIES: SymbolCategory[] = ["Structures types", "Appuis", "Charges", "Réactions", "Coupures", "Éléments", "Sections", "Diagrammes"];

export type SymbolParam = "label" | "label2" | "len" | "h" | "h2";

export interface SymbolDef {
  kind: string;
  name: string;
  category: SymbolCategory;
  defaults: { color: string; label?: string; label2?: string; len?: number; h?: number; h2?: number };
  params: Partial<Record<SymbolParam, string>>;
  /** Boîte locale (avant échelle et rotation). */
  box: (s: SymbolEl) => Rect;
  /** Explication courte (inconnues de liaison, convention). */
  hint?: string;
}

export const INK = "#111827";
export const LOAD = "#c2410c";
export const REACTION = "#0f9f58";
export const CUT = "#1f5eff";

const r = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
const L = (s: SymbolEl, d: number) => s.len ?? d;
const H = (s: SymbolEl, d: number) => s.h ?? d;
const H2 = (s: SymbolEl, d: number) => s.h2 ?? d;

export const SYMBOLS: SymbolDef[] = [
  /* ----------------------------- Structures types ----------------------------- */
  {
    kind: "poutre-2-appuis",
    name: "Poutre sur 2 appuis",
    category: "Structures types",
    defaults: { color: INK, label: "A", label2: "B", len: 320 },
    params: { label: "Appui gauche", label2: "Appui droit", len: "Portée (px)" },
    box: (s) => r(-24, -24, L(s, 320) + 48, 70),
    hint: "Articulation en A (2 inconnues), appui simple en B (1 inconnue) : isostatique.",
  },
  {
    kind: "console",
    name: "Console (encastrée)",
    category: "Structures types",
    defaults: { color: INK, label: "A", label2: "B", len: 240 },
    params: { label: "Encastrement", label2: "Extrémité libre", len: "Longueur (px)" },
    box: (s) => r(-14, -32, L(s, 240) + 26, 64),
    hint: "Encastrement en A : 3 inconnues (H_A, V_A, M_A).",
  },
  {
    kind: "poutre-porte-a-faux",
    name: "Poutre avec porte-à-faux",
    category: "Structures types",
    defaults: { color: INK, label: "A", label2: "B", len: 320 },
    params: { label: "Appui gauche", label2: "Appui intermédiaire", len: "Longueur totale (px)" },
    box: (s) => r(-24, -24, L(s, 320) + 48, 70),
  },
  {
    kind: "portique",
    name: "Portique",
    category: "Structures types",
    defaults: { color: INK, label: "A", label2: "D", len: 240, h: 160 },
    params: { label: "Pied gauche", label2: "Pied droit", len: "Portée (px)", h: "Hauteur (px)" },
    box: (s) => r(-30, -H(s, 160) - 22, L(s, 240) + 60, H(s, 160) + 40),
  },
  {
    kind: "treillis",
    name: "Treillis (Warren)",
    category: "Structures types",
    defaults: { color: INK, label: "A", label2: "B", len: 320, h: 80 },
    params: { label: "Appui gauche", label2: "Appui droit", len: "Portée (px)", h: "Hauteur (px)" },
    box: (s) => r(-26, -H(s, 80) - 20, L(s, 320) + 52, H(s, 80) + 66),
  },
  {
    kind: "poutre",
    name: "Poutre",
    category: "Structures types",
    defaults: { color: INK, label: "A", label2: "B", len: 320 },
    params: { label: "Extrémité gauche", label2: "Extrémité droite", len: "Longueur (px)" },
    box: (s) => r(-10, -24, L(s, 320) + 20, 30),
  },

  /* ---------------------------------- Appuis ---------------------------------- */
  {
    kind: "appui-simple",
    name: "Appui simple (glissant)",
    category: "Appuis",
    defaults: { color: INK },
    params: {},
    box: () => r(-22, -4, 44, 46),
    hint: "1 inconnue : réaction perpendiculaire au plan de glissement.",
  },
  {
    kind: "articulation",
    name: "Articulation (pivot)",
    category: "Appuis",
    defaults: { color: INK },
    params: {},
    box: () => r(-22, -5, 44, 38),
    hint: "2 inconnues : H et V. Le moment est nul.",
  },
  {
    kind: "encastrement",
    name: "Encastrement",
    category: "Appuis",
    defaults: { color: INK },
    params: {},
    box: () => r(-14, -30, 17, 60),
    hint: "3 inconnues : H, V et M. Pivoter de 180° pour l'extrémité droite.",
  },
  {
    kind: "encastrement-sol",
    name: "Encastrement (pied de poteau)",
    category: "Appuis",
    defaults: { color: INK },
    params: {},
    box: () => r(-30, -3, 60, 17),
    hint: "3 inconnues : H, V et M.",
  },
  {
    kind: "glissiere",
    name: "Encastrement glissant",
    category: "Appuis",
    defaults: { color: INK },
    params: {},
    box: () => r(-32, -26, 36, 52),
    hint: "2 inconnues : bloque la rotation et une translation.",
  },
  {
    kind: "rotule",
    name: "Rotule interne",
    category: "Appuis",
    defaults: { color: INK },
    params: {},
    box: () => r(-7, -7, 14, 14),
    hint: "Libère la rotation : M = 0 au droit de la rotule.",
  },
  {
    kind: "ressort",
    name: "Appui élastique (ressort)",
    category: "Appuis",
    defaults: { color: INK, label: "k" },
    params: { label: "Raideur" },
    box: () => r(-22, -2, 44, 52),
  },
  {
    kind: "bielle",
    name: "Bielle (appui pendulaire)",
    category: "Appuis",
    defaults: { color: INK },
    params: {},
    box: () => r(-22, -5, 44, 56),
    hint: "1 inconnue : effort selon l'axe de la bielle.",
  },

  /* --------------------------------- Charges --------------------------------- */
  {
    kind: "force",
    name: "Force ponctuelle",
    category: "Charges",
    defaults: { color: LOAD, label: "F", len: 64 },
    params: { label: "Nom", len: "Longueur (px)" },
    box: (s) => r(-8, -L(s, 64) - 4, 16, L(s, 64) + 4),
    hint: "La pointe est le point d'application. Pivoter pour une force inclinée.",
  },
  {
    kind: "force-composantes",
    name: "Force inclinée + composantes",
    category: "Charges",
    defaults: { color: LOAD, label: "F", len: 80, h: 45 },
    params: { label: "Nom", len: "Longueur (px)", h: "Angle α (°)" },
    box: (s) => {
      const a = (H(s, 45) * Math.PI) / 180;
      const l = L(s, 80);
      return r(-l * Math.cos(a) - 4, -l * Math.sin(a) - 4, l * Math.cos(a) + 8, l * Math.sin(a) + 8);
    },
    hint: "F_x = F cos α, F_y = F sin α.",
  },
  {
    kind: "couple-ah",
    name: "Couple (anti-horaire)",
    category: "Charges",
    defaults: { color: LOAD, label: "C" },
    params: { label: "Nom" },
    box: () => r(-22, -22, 44, 44),
    hint: "Positif dans le sens trigonométrique.",
  },
  {
    kind: "couple-h",
    name: "Couple (horaire)",
    category: "Charges",
    defaults: { color: LOAD, label: "C" },
    params: { label: "Nom" },
    box: () => r(-22, -22, 44, 44),
  },
  {
    kind: "charge-uniforme",
    name: "Charge répartie uniforme",
    category: "Charges",
    defaults: { color: LOAD, label: "q", len: 200, h: 30 },
    params: { label: "Nom", len: "Longueur (px)", h: "Hauteur (px)" },
    box: (s) => r(0, -H(s, 30) - 2, L(s, 200), H(s, 30) + 2),
    hint: "Résultante q·l appliquée au milieu.",
  },
  {
    kind: "charge-triangle",
    name: "Charge triangulaire croissante",
    category: "Charges",
    defaults: { color: LOAD, label: "q", len: 200, h: 40 },
    params: { label: "Nom", len: "Longueur (px)", h: "Hauteur (px)" },
    box: (s) => r(0, -H(s, 40) - 2, L(s, 200), H(s, 40) + 2),
    hint: "Résultante q·l/2 appliquée aux 2/3 depuis le zéro.",
  },
  {
    kind: "charge-triangle-dec",
    name: "Charge triangulaire décroissante",
    category: "Charges",
    defaults: { color: LOAD, label: "q", len: 200, h: 40 },
    params: { label: "Nom", len: "Longueur (px)", h: "Hauteur (px)" },
    box: (s) => r(0, -H(s, 40) - 2, L(s, 200), H(s, 40) + 2),
  },
  {
    kind: "charge-trapeze",
    name: "Charge trapézoïdale",
    category: "Charges",
    defaults: { color: LOAD, label: "q₁", label2: "q₂", len: 200, h: 18, h2: 40 },
    params: { label: "Nom à gauche", label2: "Nom à droite", len: "Longueur (px)", h: "Hauteur gauche (px)", h2: "Hauteur droite (px)" },
    box: (s) => r(0, -Math.max(H(s, 18), H2(s, 40)) - 2, L(s, 200), Math.max(H(s, 18), H2(s, 40)) + 2),
  },

  /* -------------------------------- Réactions -------------------------------- */
  {
    kind: "reaction-v",
    name: "Réaction verticale",
    category: "Réactions",
    defaults: { color: REACTION, label: "V_A", len: 56 },
    params: { label: "Nom", len: "Longueur (px)" },
    box: (s) => r(-8, 0, 16, L(s, 56) + 4),
  },
  {
    kind: "reaction-h",
    name: "Réaction horizontale",
    category: "Réactions",
    defaults: { color: REACTION, label: "H_A", len: 56 },
    params: { label: "Nom", len: "Longueur (px)" },
    box: (s) => r(-L(s, 56) - 4, -8, L(s, 56) + 4, 16),
  },
  {
    kind: "reaction-m",
    name: "Moment d'encastrement",
    category: "Réactions",
    defaults: { color: REACTION, label: "M_A" },
    params: { label: "Nom" },
    box: () => r(-30, -30, 60, 60),
  },

  /* --------------------------------- Coupures --------------------------------- */
  {
    kind: "coupure",
    name: "Coupure (section S)",
    category: "Coupures",
    defaults: { color: CUT, label: "S", label2: "x", h: 44 },
    params: { label: "Section", label2: "Abscisse", h: "Demi-hauteur (px)" },
    box: (s) => r(-10, -H(s, 44) - 4, 20, 2 * H(s, 44) + 8),
  },
  {
    kind: "torseur-gauche",
    name: "Torseur de cohésion (partie gauche)",
    category: "Coupures",
    defaults: { color: CUT },
    params: {},
    box: () => r(-72, -62, 140, 98),
    hint: "Partie gauche isolée : +N, +T, +M dans le sens positif du repère local.",
  },
  {
    kind: "torseur-droite",
    name: "Torseur de cohésion (partie droite)",
    category: "Coupures",
    defaults: { color: CUT },
    params: {},
    box: () => r(-68, -62, 140, 98),
    hint: "Partie droite isolée : −N, −T, −M, flèches inchangées.",
  },
  {
    kind: "troncon-gauche",
    name: "Partie gauche isolée",
    category: "Coupures",
    defaults: { color: CUT, label: "A", len: 220 },
    params: { label: "Appui", len: "Longueur x (px)" },
    box: (s) => r(-60, -62, L(s, 220) + 128, 140),
    hint: "Réactions en A, efforts de cohésion N, T, M sur la coupure.",
  },
  {
    kind: "troncon-droit",
    name: "Partie droite isolée",
    category: "Coupures",
    defaults: { color: CUT, label: "B", len: 220 },
    params: { label: "Appui", len: "Longueur (px)" },
    box: (s) => r(-62, -62, L(s, 220) + 124, 140),
  },

  /* --------------------------------- Éléments --------------------------------- */
  {
    kind: "barre",
    name: "Barre bi-articulée",
    category: "Éléments",
    defaults: { color: INK, label: "1", len: 160 },
    params: { label: "Numéro", len: "Longueur (px)" },
    box: (s) => r(-6, -18, L(s, 160) + 12, 24),
  },
  {
    kind: "noeud",
    name: "Nœud / point",
    category: "Éléments",
    defaults: { color: INK, label: "A" },
    params: { label: "Nom" },
    box: () => r(-6, -24, 30, 30),
  },
  {
    kind: "repere",
    name: "Repère (x, y)",
    category: "Éléments",
    defaults: { color: INK, label: "x", label2: "y", len: 64 },
    params: { label: "Axe horizontal", label2: "Axe vertical", len: "Longueur (px)" },
    box: (s) => r(-18, -L(s, 64) - 16, L(s, 64) + 34, L(s, 64) + 32),
  },
  {
    kind: "cote",
    name: "Cote",
    category: "Éléments",
    defaults: { color: INK, label: "L", len: 200 },
    params: { label: "Valeur", len: "Longueur (px)" },
    box: (s) => r(-2, -22, L(s, 200) + 4, 32),
  },
  {
    kind: "angle",
    name: "Angle",
    category: "Éléments",
    defaults: { color: INK, label: "α", h: 35 },
    params: { label: "Nom", h: "Angle (°)" },
    box: () => r(-4, -64, 70, 68),
  },
  {
    kind: "centre-gravite",
    name: "Centre de gravité G",
    category: "Éléments",
    defaults: { color: INK, label: "G" },
    params: { label: "Nom" },
    box: () => r(-9, -24, 34, 33),
  },

  /* --------------------------------- Sections --------------------------------- */
  {
    kind: "section-rect",
    name: "Section rectangulaire",
    category: "Sections",
    defaults: { color: INK, label: "b", label2: "h", len: 60, h: 100 },
    params: { label: "Largeur", label2: "Hauteur", len: "Largeur (px)", h: "Hauteur (px)" },
    box: (s) => r(-L(s, 60) / 2 - 22, -H(s, 100) / 2 - 22, L(s, 60) + 62, H(s, 100) + 54),
    hint: "I = b h³ / 12",
  },
  {
    kind: "section-i",
    name: "Profilé en I (IPE)",
    category: "Sections",
    defaults: { color: INK, label: "b", label2: "h", len: 70, h: 120 },
    params: { label: "Largeur", label2: "Hauteur", len: "Largeur (px)", h: "Hauteur (px)" },
    box: (s) => r(-L(s, 70) / 2 - 22, -H(s, 120) / 2 - 22, L(s, 70) + 62, H(s, 120) + 54),
  },
  {
    kind: "section-t",
    name: "Section en T",
    category: "Sections",
    defaults: { color: INK, label: "b", label2: "h", len: 90, h: 100 },
    params: { label: "Largeur", label2: "Hauteur", len: "Largeur (px)", h: "Hauteur (px)" },
    box: (s) => r(-L(s, 90) / 2 - 22, -H(s, 100) / 2 - 22, L(s, 90) + 62, H(s, 100) + 54),
  },
  {
    kind: "section-circ",
    name: "Section circulaire",
    category: "Sections",
    defaults: { color: INK, label: "D", len: 80 },
    params: { label: "Diamètre", len: "Diamètre (px)" },
    box: (s) => r(-L(s, 80) / 2 - 22, -L(s, 80) / 2 - 22, L(s, 80) + 44, L(s, 80) + 54),
    hint: "I = π D⁴ / 64",
  },
  {
    kind: "section-tube",
    name: "Tube",
    category: "Sections",
    defaults: { color: INK, label: "D", label2: "d", len: 84, h: 62 },
    params: { label: "Diamètre ext.", label2: "Diamètre int.", len: "Diamètre ext. (px)", h: "Diamètre int. (px)" },
    box: (s) => r(-L(s, 84) / 2 - 22, -L(s, 84) / 2 - 22, L(s, 84) + 44, L(s, 84) + 54),
  },
  {
    kind: "section-caisson",
    name: "Caisson (rectangle creux)",
    category: "Sections",
    defaults: { color: INK, label: "b", label2: "h", len: 70, h: 100 },
    params: { label: "Largeur", label2: "Hauteur", len: "Largeur (px)", h: "Hauteur (px)" },
    box: (s) => r(-L(s, 70) / 2 - 22, -H(s, 100) / 2 - 22, L(s, 70) + 62, H(s, 100) + 54),
  },

  /* -------------------------------- Diagrammes -------------------------------- */
  {
    kind: "axes-ntm",
    name: "Axes N(x), T(x), M(x)",
    category: "Diagrammes",
    defaults: { color: INK, len: 320, h: 96 },
    params: { len: "Longueur (px)", h: "Écart entre axes (px)" },
    box: (s) => r(-46, -40, L(s, 320) + 70, 2 * H(s, 96) + 80),
  },
  {
    kind: "axe",
    name: "Axe de diagramme",
    category: "Diagrammes",
    defaults: { color: INK, label: "M(x)", len: 320 },
    params: { label: "Grandeur", len: "Longueur (px)" },
    box: (s) => r(-46, -40, L(s, 320) + 70, 80),
  },
  {
    kind: "diagramme-parabole",
    name: "Allure parabolique (q uniforme)",
    category: "Diagrammes",
    defaults: { color: CUT, label: "qL²/8", len: 320, h: 60 },
    params: { label: "Valeur max", len: "Longueur (px)", h: "Amplitude (px)" },
    box: (s) => r(-4, -H(s, 60) - 22, L(s, 320) + 8, H(s, 60) + 26),
  },
  {
    kind: "diagramme-triangle",
    name: "Allure triangulaire (force P)",
    category: "Diagrammes",
    defaults: { color: CUT, label: "PL/4", len: 320, h: 60 },
    params: { label: "Valeur max", len: "Longueur (px)", h: "Amplitude (px)" },
    box: (s) => r(-4, -H(s, 60) - 22, L(s, 320) + 8, H(s, 60) + 26),
  },
  {
    kind: "diagramme-rectangle",
    name: "Allure constante",
    category: "Diagrammes",
    defaults: { color: CUT, label: "P/2", len: 320, h: 34 },
    params: { label: "Valeur", len: "Longueur (px)", h: "Amplitude (px)" },
    box: (s) => r(-4, -H(s, 34) - 22, L(s, 320) + 8, H(s, 34) + 26),
  },
];

export const SYMBOL_BY_KIND: Record<string, SymbolDef> = Object.fromEntries(SYMBOLS.map((d) => [d.kind, d]));

export function symbolDef(kind: string): SymbolDef {
  return SYMBOL_BY_KIND[kind] ?? SYMBOLS[0];
}
