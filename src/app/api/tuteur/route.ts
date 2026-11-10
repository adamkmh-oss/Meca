/**
 * Tuteur IA — point d'entrée HTTP (côté serveur uniquement : la clé d'API
 * n'est jamais exposée au navigateur).
 * POST : joue un tour de conversation et renvoie un flux NDJSON d'évènements.
 * GET  : indique si le tuteur est utilisable par la personne connectée.
 *
 * Accès : compte connecté avec la permission ai.use ; quotas par compte en
 * base (ai_begin) pour éviter les abus et maîtriser les coûts. Seules des
 * données pédagogiques minimales sont transmises au fournisseur d'IA (mode,
 * page, niveau et maîtrise) : ni nom, ni e-mail, ni identifiant.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";
import { buildTurnContext, CONTEXT_MARKER, TurnContextSchema, TutorModeSchema } from "@/lib/tutor/prompt";
import { anthropicTutorClient, runTutorTurn, type ExtraTools, type TutorEvent } from "@/lib/tutor/run";
import { SEARCH_TOOL, SearchInput } from "@/lib/tutor/tools";
import { supabaseConfigured } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { getSession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { sameOrigin } from "@/lib/security/request";

export const runtime = "nodejs";
export const maxDuration = 300;

const configured = () => Boolean(serverEnv.anthropicKey);

const BodySchema = z.object({
  history: z.array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.unknown() })).max(240),
  message: z.string().trim().min(1).max(4000),
  mode: TutorModeSchema,
  context: TurnContextSchema.default({}),
});

const json = (status: number, body: unknown) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  if (!configured()) return json(200, { configured: false, reason: "not_configured" });
  if (supabaseConfigured) {
    const s = await getSession();
    if (!s) return json(200, { configured: false, reason: "login_required" });
    if (!s.permissions.includes("ai.use")) return json(200, { configured: false, reason: "forbidden" });
  }
  return json(200, { configured: true });
}

export async function POST(req: Request) {
  if (!configured()) {
    return json(503, { error: "not_configured", message: "Le tuteur n'est pas configuré : ajoutez la variable d'environnement ANTHROPIC_API_KEY sur le serveur." });
  }
  if (!sameOrigin(req)) return json(403, { error: "forbidden", message: "Origine refusée." });

  // Contrôle d'accès : compte connecté, actif, autorisé.
  const supabase = supabaseConfigured ? await createClient() : null;
  if (supabaseConfigured) {
    const s = await getSession();
    if (!s || s.mfaPending || s.status !== "active") return json(401, { error: "login_required", message: "Connectez-vous pour utiliser le tuteur." });
    if (!s.permissions.includes("ai.use")) return json(403, { error: "forbidden", message: "Votre compte n'a pas accès au tuteur." });
  }

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

  // Quotas par compte (minute et jour), comptés en base pour toutes les instances.
  let usageId: number | null = null;
  if (supabase) {
    const { data, error } = await supabase.rpc("ai_begin", { p_mode: mode, p_prompt_chars: message.length });
    if (error) {
      if (error.code === "PT429") return json(429, { error: "rate_limited", message: "Quota de questions atteint : réessayez dans quelques minutes (ou demain si le quota journalier est épuisé)." });
      return json(403, { error: "forbidden", message: "Accès au tuteur refusé." });
    }
    usageId = data as number;
  }

  // Recherche dans les ressources publiées, avec la session de l'étudiant (RLS).
  const extra: ExtraTools | undefined = supabase
    ? {
        definitions: [SEARCH_TOOL],
        async run(name, input) {
          if (name !== SEARCH_TOOL.name) return null;
          const p = SearchInput.safeParse(input);
          if (!p.success) return { ok: false, content: "Entrée invalide : précisez une requête de 2 à 300 caractères." };
          const { data, error } = await supabase.rpc("search_content", { p_query: p.data.requete, p_limit: 6 });
          if (error) return { ok: false, content: "Recherche indisponible." };
          const results = (data ?? []) as { kind: string; title: string; href: string; snippet: string }[];
          return {
            ok: true,
            content: JSON.stringify({
              resultats: results.map((r) => ({ type: r.kind === "lesson" ? "leçon" : "exercice", titre: r.title, lien: r.href, extrait: r.snippet.slice(0, 1200) })),
              note: results.length ? "Contenus validés par l'équipe pédagogique." : "Aucune ressource publiée ne correspond.",
            }),
          };
        },
      }
    : undefined;

  const turn: BetaMessageParam[] = [
    { role: "user", content: message },
    { role: "system", content: buildTurnContext(mode, context) },
  ];
  const client = anthropicTutorClient(new Anthropic({ apiKey: serverEnv.anthropicKey }));
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let outputChars = 0;
      let toolCalls = 0;
      const emit = (e: TutorEvent) => {
        if (e.type === "text") outputChars += e.text.length;
        if (e.type === "tool") toolCalls++;
        controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
      };
      try {
        await runTutorTurn(client, history as BetaMessageParam[], turn, emit, extra);
      } catch (err) {
        let msg = "Le tuteur n'a pas pu répondre. Réessayez dans un instant.";
        if (err instanceof Anthropic.AuthenticationError) msg = "Le service d'IA a refusé la clé du serveur : contactez l'administrateur.";
        else if (err instanceof Anthropic.RateLimitError) msg = "Le service est très sollicité : réessayez dans une minute.";
        else if (err instanceof Anthropic.BadRequestError) msg = "Requête refusée par le service. Démarrez une nouvelle conversation si le problème persiste.";
        else if (err instanceof Anthropic.APIConnectionError) msg = "Connexion au service impossible.";
        console.error("[tuteur]", err instanceof Error ? err.message : err);
        emit({ type: "error", message: msg });
      } finally {
        if (supabase && usageId !== null) await supabase.rpc("ai_end", { p_id: usageId, p_output_chars: outputChars, p_tool_calls: toolCalls });
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
