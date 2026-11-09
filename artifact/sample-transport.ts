/**
 * Transport du tuteur pour la version publiée sur claude.ai : Claude est
 * appelé depuis la page par la capacité `sample` (compte Claude de la
 * personne qui consulte, aucune clé d'API). Remplace src/lib/tutor/transport.ts
 * par alias de build ; même contrat (checkTutor, sendTutor).
 *
 * Les outils de calcul (moteur STRUCTURA) s'exécutent dans la page.
 */
import type { BetaContentBlockParam, BetaMessageParam, BetaToolResultBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { buildKnowledge } from "@/lib/tutor/knowledge";
import { buildTurnContext, TUTOR_INSTRUCTIONS } from "@/lib/tutor/prompt";
import { describeToolCall } from "@/lib/tutor/tool-labels";
import { runTool, TOOLS } from "@/lib/tutor/tools";
import { TutorError, type TutorAvailability, type TutorEvent, type TutorRequest } from "@/lib/tutor/transport-types";

/* ------------------------- Capacité `sample` ------------------------- */
interface SampleTurn {
  role: "user" | "assistant";
  content: string;
}
interface SampleTool {
  name: string;
  description: string;
  inputSchema?: { type: "object"; [k: string]: unknown };
  execute(input: Record<string, unknown>, ctx: { signal: AbortSignal }): unknown;
}
interface SampleOptions {
  onText?: (u: { text: string; delta: string }) => void;
  signal?: AbortSignal;
  tools?: SampleTool[];
  modelTier?: "default" | "complex" | "quick";
  cache?: boolean;
}
interface SampleLimits {
  maxPromptBytes: number;
  tools?: { maxCount: number };
}
type Sample = ((input: string | SampleTurn[], options?: SampleOptions) => Promise<{ text: string; truncated: boolean }>) & {
  limits(): Promise<SampleLimits>;
};
interface SampleError {
  code: string;
  message: string;
  text?: string;
}

/** La plateforme mémorise `claude.use()` : on peut l'appeler à chaque tour. */
async function getSample(): Promise<Sample | null> {
  const claude = (globalThis as { claude?: { use(name: string): Promise<unknown> } }).claude;
  if (!claude?.use) return null;
  try {
    const s = await claude.use("sample");
    return typeof s === "function" ? (s as Sample) : null;
  } catch {
    return null;
  }
}

const UNAVAILABLE =
  "Le tuteur répond avec votre compte Claude : ouvrez cette page dans claude.ai ou dans l'application Claude, connecté(e), puis autorisez la page à utiliser Claude quand elle le demande.";

export async function checkTutor(): Promise<TutorAvailability> {
  const sample = await getSample();
  return sample ? { ok: true } : { ok: false, title: "Tuteur disponible dans Claude", message: UNAVAILABLE };
}

/* ------------------------------ Prompt ------------------------------- */
const ADAPTATION = `# Fonctionnement dans cette version
Le bloc « [Contexte STRUCTURA] » (mode, page consultée, profil) figure au début du dernier message de l'étudiant au lieu d'un message système. Les liens vers le site restent des chemins relatifs comme /cours/rdm/fleche : la page les ouvre elle-même.`;

const NO_TOOLS = `# Outils indisponibles
Les outils de calcul ne sont pas disponibles pour cette conversation. Donne la méthode et les expressions littérales ; si tu donnes une valeur numérique, indique clairement qu'elle n'a pas été vérifiée par le moteur de calcul et invite l'étudiant à la contrôler dans le simulateur (/simulateur).`;

let knowledge: string | null = null;
function preamble(withTools: boolean): string {
  knowledge ??= buildKnowledge();
  return [TUTOR_INSTRUCTIONS, ADAPTATION, withTools ? null : NO_TOOLS, knowledge].filter(Boolean).join("\n\n");
}

function textOf(m: BetaMessageParam): string {
  const c = m.content;
  if (!c) return "";
  if (typeof c === "string") return c;
  return c
    .map((b) => (b.type === "text" ? (b as { text: string }).text : ""))
    .join("")
    .trim();
}

/** Historique de l'interface → tours texte (les blocs d'outils restent côté page). */
function toSampleTurns(history: BetaMessageParam[]): SampleTurn[] {
  const turns: SampleTurn[] = [];
  for (const m of history) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    if (m.role === "user" && typeof m.content !== "string") continue; // résultats d'outils
    const content = textOf(m);
    if (content) turns.push({ role: m.role, content });
  }
  return turns;
}

const bytes = (s: string) => new TextEncoder().encode(s).length;

/** Garde les échanges les plus récents qui tiennent dans la limite de taille. */
function fit(head: string, past: SampleTurn[], last: string, maxBytes: number): SampleTurn[] {
  const budget = maxBytes - 8_000 - bytes(head) - bytes(last);
  let kept = past;
  let size = kept.reduce((n, t) => n + bytes(t.content), 0);
  while (kept.length > 0 && size > budget) {
    size -= bytes(kept[0].content);
    kept = kept.slice(1);
  }
  while (kept[0]?.role === "assistant") kept = kept.slice(1);
  return [{ role: "user", content: head }, ...kept, { role: "user", content: last }];
}

/* ------------------------------- Erreurs ------------------------------ */
function toTutorError(e: SampleError): Error {
  switch (e.code) {
    case "cancelled":
      return new DOMException("Réponse interrompue.", "AbortError");
    case "not_granted":
    case "sampling_disabled":
    case "not_declared":
    case "capability_disabled":
    case "capability_removed":
      return new TutorError("Cette page n'est pas autorisée à utiliser Claude pour vous. Rechargez-la et acceptez la demande d'autorisation pour activer le tuteur.", true);
    case "rate_limited":
      return new TutorError("Limite d'utilisation de Claude atteinte pour le moment. Réessayez dans quelques minutes.");
    case "session_expired":
      return new TutorError("Votre session Claude a expiré : reconnectez-vous à claude.ai, puis réessayez.");
    case "refused":
      return new TutorError("Claude n'a pas répondu à cette demande. Reformulez la question.");
    case "prompt_too_large":
      return new TutorError("La conversation est trop longue : commencez une nouvelle conversation.");
    case "empty_completion":
      return new TutorError("Aucune réponse reçue. Reformulez ou simplifiez la question.");
    case "tools_unavailable":
      return new TutorError("Les outils de calcul ne sont pas disponibles ici. Rechargez la page puis réessayez.");
    default:
      return new TutorError("Le tuteur est momentanément indisponible. Réessayez dans un instant.");
  }
}

/* -------------------------------- Tour -------------------------------- */
export async function sendTutor(req: TutorRequest, emit: (e: TutorEvent) => void, signal: AbortSignal): Promise<void> {
  const sample = await getSample();
  if (!sample) throw new TutorError(UNAVAILABLE, true);
  const limits = await sample.limits().catch(() => null);
  const withTools = (limits?.tools?.maxCount ?? 0) >= TOOLS.length;

  const head = preamble(withTools);
  const last = `${buildTurnContext(req.mode, req.context)}\n\n${req.message}`;
  const input = fit(head, toSampleTurns(req.history), last, limits?.maxPromptBytes ?? 262_144);

  // Réponse reconstituée au format de l'historique (texte, appels d'outils, résultats).
  const blocks: BetaContentBlockParam[] = [];
  const results: BetaToolResultBlockParam[] = [];
  let n = 0;

  const tools: SampleTool[] = TOOLS.map((t) => ({
    name: t.name,
    description: t.description ?? t.name,
    inputSchema: t.input_schema as SampleTool["inputSchema"],
    execute(raw) {
      const id = `outil_${++n}`;
      blocks.push({ type: "tool_use", id, name: t.name, input: raw });
      emit({ type: "tool", id, name: t.name, label: describeToolCall(t.name, raw) });
      const out = runTool(t.name, raw);
      results.push({ type: "tool_result", tool_use_id: id, content: out.content, ...(out.ok ? {} : { is_error: true }) });
      emit({ type: "tool_result", id, ok: out.ok });
      if (!out.ok) throw new Error(out.content);
      return out.content;
    },
  }));

  let result: { text: string; truncated: boolean };
  try {
    result = await sample(input, {
      signal,
      cache: false,
      modelTier: "default",
      ...(withTools ? { tools } : {}),
      onText: ({ delta }) => {
        const lastBlock = blocks[blocks.length - 1];
        if (lastBlock?.type === "text") lastBlock.text += delta;
        else blocks.push({ type: "text", text: delta });
        emit({ type: "text", text: delta });
      },
    });
  } catch (e) {
    throw toTutorError(e as SampleError);
  }

  if (!blocks.some((b) => b.type === "text")) blocks.push({ type: "text", text: result.text });
  if (result.truncated) emit({ type: "error", message: "La réponse a été coupée (trop longue). Demandez la suite ou découpez la question." });
  const messages: BetaMessageParam[] = [
    { role: "user", content: req.message },
    { role: "assistant", content: blocks },
    ...(results.length ? [{ role: "user" as const, content: results }] : []),
  ];
  emit({ type: "done", messages });
}
