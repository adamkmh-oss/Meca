/** Formats de page, papiers et palettes du cahier. */
import type { Orientation, PaperColor, PaperKind } from "./types";

/** 1 mm en pixels CSS (96 ppp). */
export const MM = 96 / 25.4;
export const A4_W = Math.round(210 * MM); // 794
export const A4_H = Math.round(297 * MM); // 1123

export function pageSize(o: Orientation): { w: number; h: number } {
  return o === "paysage" ? { w: A4_H, h: A4_W } : { w: A4_W, h: A4_H };
}

export const PAPERS: { id: PaperKind; label: string; group: "Papier" | "Mécanique" }[] = [
  { id: "blanc", label: "Blanc", group: "Papier" },
  { id: "ligne", label: "Ligné", group: "Papier" },
  { id: "carreaux", label: "Petits carreaux", group: "Papier" },
  { id: "seyes", label: "Seyès", group: "Papier" },
  { id: "points", label: "Pointillés", group: "Papier" },
  { id: "millimetre", label: "Millimétré", group: "Papier" },
  { id: "etude-poutre", label: "Étude de poutre", group: "Mécanique" },
  { id: "diagrammes", label: "Diagrammes N, T, M", group: "Mécanique" },
  { id: "exercice", label: "Fiche exercice", group: "Mécanique" },
];

export interface PaperTheme {
  bg: string;
  /** Lignes du quadrillage. */
  line: string;
  strong: string;
  margin: string;
  /** Texte imprimé du modèle (titres de zones). */
  print: string;
  dark: boolean;
}

export const PAPER_COLORS: Record<PaperColor, { label: string; theme: PaperTheme }> = {
  blanc: { label: "Blanc", theme: { bg: "#ffffff", line: "#dfe5f0", strong: "#b9c4dc", margin: "#f2a3a3", print: "#7a86a3", dark: false } },
  creme: { label: "Crème", theme: { bg: "#fbf7ec", line: "#e6dfcb", strong: "#cfc4a6", margin: "#e9a08f", print: "#8a7f63", dark: false } },
  ardoise: { label: "Ardoise", theme: { bg: "#1c2233", line: "#2c3550", strong: "#3d4867", margin: "#7a3f4a", print: "#8b97b8", dark: true } },
};

/** Variables CSS appliquées à la page pour les composants de schéma (indépendantes du thème de l'interface). */
export function paperCssVars(color: PaperColor): Record<string, string> {
  const t = PAPER_COLORS[color].theme;
  if (t.dark) {
    return {
      "--ink": "#e6ebf8",
      "--card": t.bg,
      "--border": "#3a4562",
      "--muted-foreground": "#9aa6c6",
      "--foreground": "#e6ebf8",
      "--primary": "#6e9bff",
      "--diag-pos": "#6e9bff",
      "--diag-pos-fill": "rgba(110,155,255,0.22)",
      "--diag-neg": "#ff7a73",
      "--diag-neg-fill": "rgba(255,122,115,0.2)",
      "--load": "#fb923c",
      "--reaction": "#34c27c",
      "--deformed": "#b392ff",
    };
  }
  return {
    "--ink": "#0f1a35",
    "--card": t.bg,
    "--border": "#d5dceb",
    "--muted-foreground": "#56627f",
    "--foreground": "#0b1530",
    "--primary": "#1f5eff",
    "--diag-pos": "#1f5eff",
    "--diag-pos-fill": "rgba(31,94,255,0.14)",
    "--diag-neg": "#d9322b",
    "--diag-neg-fill": "rgba(217,50,43,0.12)",
    "--load": "#c2410c",
    "--reaction": "#0f9f58",
    "--deformed": "#7c3aed",
  };
}

/** Couleurs du stylo (la première est « encre » : noire sur papier clair, blanche sur ardoise). */
export const PEN_COLORS = ["#111827", "#1f5eff", "#d9322b", "#0f9f58", "#c2410c", "#7c3aed", "#0891b2", "#6b7280"];
export const HIGHLIGHT_COLORS = ["#fde047", "#86efac", "#f9a8d4", "#93c5fd", "#fdba74"];
export const PEN_SIZES = [1.6, 2.6, 4, 6.5];
export const HIGHLIGHT_SIZES = [12, 20, 30];
export const ERASER_SIZES = [8, 18, 36];

export const COVERS = ["#1f5eff", "#0b1530", "#0f9f58", "#c2410c", "#7c3aed", "#d9322b", "#0891b2", "#a16207"];

/** Couleur d'encre affichée : l'encre noire devient claire sur papier ardoise. */
export function displayColor(color: string, dark: boolean): string {
  if (!dark) return color;
  if (color === "#111827") return "#eef2fb";
  return color;
}
