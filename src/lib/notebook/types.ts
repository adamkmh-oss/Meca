/**
 * Cahier de mécanique — modèle de données.
 *
 * Coordonnées en pixels CSS « page » : une page A4 portrait mesure
 * 794 × 1123 (96 ppp, 1 mm = 3,7795 px), origine en haut à gauche, y vers le bas.
 * Tous les éléments sont immuables : chaque modification produit un nouvel
 * objet (historique d'annulation par simple copie des tableaux).
 */
import type { BeamModel } from "@/lib/mechanics/beam";
import type { TrussModel } from "./truss";
import type { LitBeam } from "./literal-beam";
import type { LitTruss } from "./literal-truss";

export type PaperKind =
  | "blanc"
  | "ligne"
  | "carreaux"
  | "seyes"
  | "points"
  | "millimetre"
  | "etude-poutre"
  | "diagrammes"
  | "exercice";

export type PaperColor = "blanc" | "creme" | "ardoise";
export type Orientation = "portrait" | "paysage";

export interface Page {
  id: string;
  title?: string;
  paper: PaperKind;
  color: PaperColor;
  orientation: Orientation;
  elements: NoteElement[];
  /** Image de fond (page d'un PDF importé), occupe toute la page. */
  background?: string;
}

export interface Notebook {
  version: 1;
  id: string;
  title: string;
  /** Couleur de couverture (hex). */
  cover: string;
  createdAt: number;
  updatedAt: number;
  pages: Page[];
}

export interface NotebookMeta {
  id: string;
  title: string;
  cover: string;
  createdAt: number;
  updatedAt: number;
  pageCount: number;
  /** Texte saisi (titres, zones de texte, formules) pour la recherche. */
  searchText: string;
}

/* ------------------------------------------------------------------ */
/*                             Éléments                                */
/* ------------------------------------------------------------------ */
interface Base {
  id: string;
  /** Groupe d'éléments générés ensemble (poutre calculée et ses blocs). */
  group?: string;
}

/** Trait manuscrit. `pts` = triplets x, y, pression (0..1). */
export interface StrokeEl extends Base {
  type: "stroke";
  tool: "pen" | "highlighter";
  color: string;
  size: number;
  pts: number[];
  /** Pression réelle (stylet) ; sinon elle est simulée d'après la vitesse. */
  pressure: boolean;
  /** Type de pointe : bille (épaisseur régulière, par défaut) ou plume (pleins et déliés). */
  pen?: "ball" | "fountain";
}

export type ShapeKind = "line" | "arrow" | "darrow" | "rect" | "ellipse" | "triangle" | "polygon" | "polyline" | "dim";

/** Forme géométrique. `pts` = couples x, y (2 points pour line/arrow/rect/ellipse/dim). */
export interface ShapeEl extends Base {
  type: "shape";
  shape: ShapeKind;
  pts: number[];
  color: string;
  size: number;
  dash?: boolean;
  fill?: boolean;
  /** Texte de la cote. */
  label?: string;
}

/** Zone de texte (Markdown + LaTeX entre $…$). */
export interface TextEl extends Base {
  type: "text";
  x: number;
  y: number;
  w: number;
  text: string;
  size: number;
  color: string;
  font?: "sans" | "serif" | "mono";
  /** Encadré (résultat, définition). */
  boxed?: boolean;
  /** Texte généré par une poutre calculée (régénéré quand on la modifie). */
  role?: "pfs" | "cuts" | "truss";
}

/** Formule(s) LaTeX en mode équation, une par ligne. */
export interface MathEl extends Base {
  type: "math";
  x: number;
  y: number;
  tex: string;
  size: number;
  color: string;
  boxed?: boolean;
}

export interface ImageEl extends Base {
  type: "image";
  x: number;
  y: number;
  w: number;
  h: number;
  src: string;
}

/** Symbole mécanique préfabriqué (appui, charge, coupure, section…). */
export interface SymbolEl extends Base {
  type: "symbol";
  kind: string;
  /** Point d'accroche (page). */
  x: number;
  y: number;
  /** Rotation (degrés, sens horaire à l'écran) autour du point d'accroche. */
  rot: number;
  scale: number;
  color: string;
  /** Étiquettes (F, q, A, B, L…). */
  label?: string;
  label2?: string;
  /** Longueur paramétrable (px, avant mise à l'échelle). */
  len?: number;
  /** Hauteur paramétrable (charges réparties, sections). */
  h?: number;
  h2?: number;
}

export interface BeamShow {
  schema: boolean;
  reactions: boolean;
  N: boolean;
  T: boolean;
  M: boolean;
  deformee: boolean;
}

/** Poutre calculée par le moteur : schéma et diagrammes, rééditable. */
export interface BeamEl extends Base {
  type: "beam";
  x: number;
  y: number;
  w: number;
  title?: string;
  model: BeamModel;
  show: BeamShow;
  /** Données littérales (lettres) ; `model` en est la traduction aux valeurs de dessin. */
  lit?: LitBeam;
}

/** Coupure préfaite d'une poutre calculée : partie gauche isolée sur un tronçon. */
export interface CutEl extends Base {
  type: "cut";
  x: number;
  y: number;
  w: number;
  model: BeamModel;
  /** Indice du tronçon. */
  seg: number;
  lit?: LitBeam;
}

export interface TrussShow {
  /** Barres colorées et efforts N affichés. */
  efforts: boolean;
  reactions: boolean;
  labels: boolean;
}

/** Treillis calculé par le moteur (efforts dans les barres), rééditable. */
export interface TrussEl extends Base {
  type: "truss";
  x: number;
  y: number;
  w: number;
  title?: string;
  model: TrussModel;
  show: TrussShow;
  lit?: LitTruss;
}

export type NoteElement = StrokeEl | ShapeEl | TextEl | MathEl | ImageEl | SymbolEl | BeamEl | CutEl | TrussEl;
export type ElementType = NoteElement["type"];

/** Éléments rendus en HTML (au-dessus des dessins, sous l'encre du stylo). */
export type HtmlElement = TextEl | MathEl | BeamEl | CutEl | TrussEl;

export function isHtmlElement(e: NoteElement): e is HtmlElement {
  return e.type === "text" || e.type === "math" || e.type === "beam" || e.type === "cut" || e.type === "truss";
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
