/**
 * Contrat entre l'interface du tuteur et son « transport » : la route
 * /api/tuteur (site Next.js) ou Claude intégré à la page (version publiée sur
 * claude.ai). Types seuls : importable côté navigateur.
 */
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { TurnContext, TutorMode } from "./prompt";

export type TutorEvent =
  | { type: "text"; text: string }
  | { type: "tool"; id: string; name: string; label: string }
  | { type: "tool_result"; id: string; ok: boolean }
  | { type: "done"; messages: BetaMessageParam[] }
  | { type: "error"; message: string };

export interface TutorRequest {
  history: BetaMessageParam[];
  message: string;
  mode: TutorMode;
  context: TurnContext;
}

export interface TutorAvailability {
  ok: boolean;
  /** Titre et explication affichés quand le tuteur n'est pas utilisable. */
  title?: string;
  message?: string;
}

/** Erreur à afficher telle quelle ; `permanent` désactive le tuteur pour la session. */
export class TutorError extends Error {
  constructor(
    message: string,
    readonly permanent = false,
  ) {
    super(message);
    this.name = "TutorError";
  }
}
