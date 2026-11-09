/**
 * Boucle de conversation du tuteur : streaming, outils, historique en ajout
 * seul (les blocs de réflexion et d'outils sont renvoyés tels quels au tour
 * suivant).
 */
import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaMessage,
  BetaMessageParam,
  BetaMessageStreamParams,
  BetaToolResultBlockParam,
  BetaToolUseBlock,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { buildSystem } from "./prompt";
import { runTool, TOOLS } from "./tools";
import { describeToolCall } from "./tool-labels";
import type { TutorEvent } from "./transport-types";

export const TUTOR_MODEL = "claude-opus-5-5";
export const TUTOR_BETAS = ["server-side-fallback-2026-07-01", "thinking-binding-controls-2026-08-01"];
const MAX_ITERATIONS = 8;

export type { TutorEvent };

/** Sous-ensemble du flux du SDK utilisé ici (facilite les tests). */
export interface StreamLike {
  on(event: "text", listener: (delta: string) => void): unknown;
  finalMessage(): Promise<BetaMessage>;
}
export interface TutorClient {
  stream(params: BetaMessageStreamParams): StreamLike;
}

export function anthropicTutorClient(client: Anthropic): TutorClient {
  return { stream: (params) => client.beta.messages.stream(params) };
}

export function requestParams(messages: BetaMessageParam[]): BetaMessageStreamParams {
  return {
    model: TUTOR_MODEL,
    max_tokens: 64000,
    betas: TUTOR_BETAS,
    fallbacks: "default",
    thinking: { type: "adaptive", block_binding: { prefix_mismatch_behavior: "drop_block" } },
    output_config: { effort: "medium" },
    system: buildSystem(),
    tools: TOOLS,
    messages,
  };
}

/**
 * Joue un tour : `turn` contient les messages ajoutés par ce tour (question et
 * contexte). Retourne tous les messages à ajouter à l'historique.
 */
export async function runTutorTurn(
  client: TutorClient,
  history: BetaMessageParam[],
  turn: BetaMessageParam[],
  emit: (e: TutorEvent) => void,
): Promise<BetaMessageParam[]> {
  const added: BetaMessageParam[] = [...turn];
  const messages: BetaMessageParam[] = [...history, ...turn];
  let jsonRetries = 0;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const stream = client.stream(requestParams(messages));
    stream.on("text", (delta) => emit({ type: "text", text: delta }));

    let message: BetaMessage;
    try {
      message = await stream.finalMessage();
      jsonRetries = 0;
    } catch (err) {
      // Seul le cas d'une entrée d'outil illisible est rejoué ; les erreurs d'API remontent.
      if (err instanceof Anthropic.APIError || jsonRetries++ >= 2) throw err;
      continue;
    }

    if (message.content.length > 0) {
      const assistant: BetaMessageParam = { role: "assistant", content: message.content };
      messages.push(assistant);
      added.push(assistant);
    }

    if (message.stop_reason === "refusal") {
      emit({ type: "text", text: "\n\n*Je ne peux pas répondre à cette demande.*" });
      break;
    }
    if (message.stop_reason === "pause_turn") continue;

    const toolUses = message.content.filter((b): b is BetaToolUseBlock => b.type === "tool_use");
    if (toolUses.length === 0) break;

    const results: BetaToolResultBlockParam[] = [];
    if (message.stop_reason === "max_tokens") {
      // Entrée d'outil tronquée : on referme proprement chaque appel pour garder un historique valide.
      for (const t of toolUses) results.push({ type: "tool_result", tool_use_id: t.id, is_error: true, content: "Réponse tronquée : appel non exécuté." });
      const user: BetaMessageParam = { role: "user", content: results };
      messages.push(user);
      added.push(user);
      emit({ type: "error", message: "La réponse a été tronquée. Reformulez ou découpez la question." });
      break;
    }

    for (const t of toolUses) {
      emit({ type: "tool", id: t.id, name: t.name, label: describeToolCall(t.name, t.input) });
      const out = runTool(t.name, t.input);
      results.push({ type: "tool_result", tool_use_id: t.id, content: out.content, ...(out.ok ? {} : { is_error: true }) });
      emit({ type: "tool_result", id: t.id, ok: out.ok });
    }
    const user: BetaMessageParam = { role: "user", content: results };
    messages.push(user);
    added.push(user);
  }

  // Un message système doit être suivi d'une réponse assistant : on en garantit une.
  if (!added.some((m) => m.role === "assistant")) {
    const fallback: BetaMessageParam = { role: "assistant", content: "Je ne peux pas répondre à cette demande." };
    added.push(fallback);
  }
  emit({ type: "done", messages: added });
  return added;
}
