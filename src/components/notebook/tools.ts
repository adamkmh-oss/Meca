/** Outils de l'éditeur et réglages mémorisés. */
import { HIGHLIGHT_COLORS, PEN_COLORS } from "@/lib/notebook/paper";
import type { ShapeKind } from "@/lib/notebook/types";

export type Tool = "pen" | "highlighter" | "eraser" | "lasso" | "shape" | "text" | "math" | "hand";

export type DrawShape = Extract<ShapeKind, "line" | "arrow" | "darrow" | "rect" | "ellipse" | "triangle" | "dim">;

export interface ToolSettings {
  penColor: string;
  penSize: number;
  /** Pointe du stylo : bille (régulière) ou plume (pleins et déliés). */
  penType: "ball" | "fountain";
  penColors: string[];
  hlColor: string;
  hlSize: number;
  eraserMode: "stroke" | "precise";
  eraserSize: number;
  eraserHlOnly: boolean;
  shape: DrawShape;
  shapeDash: boolean;
  shapeFill: boolean;
  shapeColor: string;
  shapeSize: number;
  textSize: number;
  textColor: string;
  /** Maintenir le stylet immobile en fin de trait → forme parfaite. */
  autoShape: boolean;
  /** Dessiner au doigt : auto (jamais sur tablette ; sur téléphone jusqu'au premier stylet), oui, non. */
  finger: "auto" | "on" | "off";
  /** Bouton flottant outil ⇄ gomme : à gauche, à droite ou masqué. */
  quickSide: "left" | "right" | "off";
  /** Double-tape d'un doigt sur la page (remplace le double-tap du Pencil, que Safari ne transmet pas). */
  fingerDoubleTap: "eraser" | "previous" | "off";
}

export const DEFAULT_SETTINGS: ToolSettings = {
  penColor: PEN_COLORS[0],
  penSize: 2.6,
  penType: "ball",
  penColors: PEN_COLORS.slice(0, 5),
  hlColor: HIGHLIGHT_COLORS[0],
  hlSize: 20,
  eraserMode: "stroke",
  eraserSize: 18,
  eraserHlOnly: false,
  shape: "line",
  shapeDash: false,
  shapeFill: false,
  shapeColor: PEN_COLORS[0],
  shapeSize: 2,
  textSize: 18,
  textColor: PEN_COLORS[0],
  autoShape: true,
  finger: "auto",
  quickSide: "left",
  fingerDoubleTap: "eraser",
};

export const TOOL_LABEL: Record<Tool, string> = {
  pen: "Stylo",
  highlighter: "Surligneur",
  eraser: "Gomme",
  lasso: "Lasso (sélection)",
  shape: "Formes",
  text: "Texte",
  math: "Formule",
  hand: "Main (déplacer la page)",
};

export const SHAPE_LABEL: Record<DrawShape, string> = {
  line: "Droite",
  arrow: "Flèche",
  darrow: "Double flèche",
  rect: "Rectangle",
  ellipse: "Ellipse",
  triangle: "Triangle",
  dim: "Cote",
};
