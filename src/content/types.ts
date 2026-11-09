import type { Level } from "@/lib/progress/store";

export type { Level };

export const LEVEL_LABEL: Record<Level, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
};

export interface ChapterMeta {
  id: string;
  slug: string;
  moduleId: string;
  title: string;
  summary: string;
  level: Level;
  minutes: number;
  /** Chapitre rédigé et interactif disponible. */
  available: boolean;
  objectives: string[];
}

export interface ModuleMeta {
  id: string;
  slug: string;
  number: number;
  title: string;
  description: string;
  icon: string;
  chapters: ChapterMeta[];
}

/** Identifiants des schémas interactifs (voir components/course/widgets). */
export type WidgetId =
  | "unit-converter"
  | "moment-lever"
  | "equilibrium-beam"
  | "supports-gallery"
  | "reactions-beam"
  | "cut-explorer"
  | "beam-diagrams"
  | "distributed-load"
  | "truss-explorer"
  | "section-stress"
  | "deflection-beam"
  | "euler-buckling";

export type Block =
  | { type: "md"; md: string }
  | { type: "definition"; term: string; md: string }
  | {
      type: "formula";
      title?: string;
      tex: string;
      variables: { symbol: string; meaning: string; unit?: string }[];
      note?: string;
    }
  | { type: "callout"; tone: "info" | "warning" | "success" | "danger"; title?: string; md: string }
  | { type: "widget"; widget: WidgetId; caption?: string }
  | {
      type: "example";
      title: string;
      context: string;
      steps: { title: string; md: string }[];
      result: string;
    };

export interface QuizQuestion {
  id: string;
  prompt: string;
  choices: string[];
  answer: number;
  explanation: string;
}

export interface ChapterContent {
  id: string;
  /** Objectif du chapitre (introduction). */
  intro: string;
  sections: { title: string; blocks: Block[] }[];
  keyPoints: string[];
  quiz: QuizQuestion[];
  /** Générateurs d'exercices associés (lib/exercises). */
  exercises: string[];
}
