/** Outils de l'éditeur et réglages mémorisés. */
import { HIGHLIGHT_COLORS, PEN_COLORS } from "@/lib/notebook/paper";
import type { ShapeKind } from "@/lib/notebook/types";

export type Tool = "pen" | "highlighter" | "eraser" | "lasso" | "shape" | "text" | "math" | "hand";

export type DrawShape = Extract<ShapeKind, "line" | "arrow" | "darrow" | "rect" | "ellipse" | "triangle" | "dim">;

export interface ToolSettings {
  penColor: string;
  penSize: number;
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
  /** Dessiner au doigt : auto (jusqu'au premier stylet détecté), oui, non. */
  finger: "auto" | "on" | "off";
}

export const DEFAULT_SETTINGS: ToolSettings = {
  penColor: PEN_COLORS[0],
  penSize: 2.6,
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
