import type { BeamModel } from "@/lib/mechanics/beam";
import type { Structure } from "@/lib/mechanics/types";
import type { Level } from "@/lib/progress/store";

export type ExerciseFigure =
  | { kind: "beam"; model: BeamModel }
  | { kind: "structure"; structure: Structure }
  | { kind: "lever"; d: number; F: number; alpha: number }
  | { kind: "section"; b: number; h: number }
  | { kind: "column"; L: number; support: "bi-articule" | "encastre-libre" | "encastre-articule" | "bi-encastre"; b: number; h: number }
  | { kind: "trapezoid"; l: number; q1: number; q2: number };

export interface ExerciseQuestion {
  key: string;
  /** Intitulé (Markdown + LaTeX). */
  label: string;
  unit: string;
  answer: number;
  /** Tolérance relative (défaut 1 %) et absolue minimale. */
  rel?: number;
  abs?: number;
  /** Indice qui oriente sans donner la réponse. */
  hint: string;
}

export interface ExerciseSolution {
  donnees: string;
  schema: string;
  equations: string;
  calculs: string;
  resultat: string;
  verification: string;
}

export interface GeneratedExercise {
  generatorId: string;
  seed: number;
  title: string;
  statement: string;
  figure?: ExerciseFigure;
  questions: ExerciseQuestion[];
  solution: ExerciseSolution;
}

export interface ExerciseGenerator {
  id: string;
  title: string;
  description: string;
  chapterId: string;
  level: Level;
  /** Type de calcul (filtre de la banque). */
  calc: "réactions" | "efforts internes" | "contraintes" | "déformations" | "statique" | "unités" | "stabilité" | "treillis" | "charges";
  /** Compétence visée. */
  skill: string;
  generate: (seed: number) => GeneratedExercise;
}
