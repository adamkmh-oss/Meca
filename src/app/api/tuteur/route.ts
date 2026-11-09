/**
 * Tuteur IA — point d'entrée HTTP.
 * POST : joue un tour de conversation et renvoie un flux NDJSON d'évènements.
 * GET  : indique si le tuteur est configuré (clé API présente).
 */
import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";
import { buildTurnContext, CONTEXT_MARKER, TurnContextSchema, TutorModeSchema } from "@/lib/tutor/prompt";
import { anthropicTutorClient, runTutorTurn, type TutorEvent } from "@/lib/tutor/run";

export const runtime = "nodejs";
export const maxDuration = 300;

const configured = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

const BodySchema = z.object({
  history: z.array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.unknown() })).max(240),
  message: z.string().trim().min(1).max(4000),
  mode: TutorModeSchema,
  context: TurnContextSchema.default({}),
});

/* Limite de débit indicative par adresse (mémoire d'instance). */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 30;
const hits = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > MAX_REQUESTS;
}

const json = (status: number, body: unknown) => Response.json(body, { status });

export function GET() {
  return json(200, { configured: configured() });
}

export async function POST(req: Request) {
  if (!configured()) {
    return json(503, { error: "not_configured", message: "Le tuteur n'est pas configuré : ajoutez la variable d'environnement ANTHROPIC_API_KEY sur le serveur." });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) return json(429, { error: "rate_limited", message: "Trop de questions en peu de temps : patientez quelques minutes." });

  const raw = await req.text();
  if (raw.length > 2_000_000) return json(413, { error: "too_large", message: "Conversation trop longue : démarrez une nouvelle conversation." });
  let parsed;
  try {
    parsed = BodySchema.safeParse(JSON.parse(raw));
  } catch {
    return json(400, { error: "bad_request", message: "Requête illisible." });
  }
  if (!parsed.success) return json(400, { error: "bad_request", message: "Requête invalide." });
  const { history, message, mode, context } = parsed.data;
  // Les seuls messages système acceptés dans l'historique sont les contextes produits par ce serveur.
  if (history.some((m) => m.role === "system" && !(typeof m.content === "string" && m.content.startsWith(CONTEXT_MARKER)))) {
    return json(400, { error: "bad_request", message: "Historique invalide." });
  }

  const turn: BetaMessageParam[] = [
    { role: "user", content: message },
    { role: "system", content: buildTurnContext(mode, context) },
  ];
  const client = anthropicTutorClient(new Anthropic());
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: TutorEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
      try {
        await runTutorTurn(client, history as BetaMessageParam[], turn, emit);
      } catch (err) {
        let msg = "Le tuteur n'a pas pu répondre. Réessayez dans un instant.";
        if (err instanceof Anthropic.AuthenticationError) msg = "Clé API refusée : vérifiez ANTHROPIC_API_KEY.";
        else if (err instanceof Anthropic.RateLimitError) msg = "Le service est très sollicité : réessayez dans une minute.";
        else if (err instanceof Anthropic.BadRequestError) msg = "Requête refusée par le service. Démarrez une nouvelle conversation si le problème persiste.";
        else if (err instanceof Anthropic.APIConnectionError) msg = "Connexion au service impossible.";
        console.error("[tuteur]", err);
        emit({ type: "error", message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
