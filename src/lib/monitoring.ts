/**
 * Suivi des erreurs serveur. Si SENTRY_DSN est défini, l'erreur est envoyée
 * à Sentry (protocole « envelope », sans SDK supplémentaire) ; sinon elle est
 * seulement journalisée. Aucune donnée personnelle n'est transmise : ni
 * cookies, ni en-têtes, ni paramètres d'URL, ni corps de requête.
 */
import { randomUUID } from "node:crypto";

interface ErrorContext {
  path?: string;
  method?: string;
  routeType?: string;
  routePath?: string;
}

export function parseDsn(dsn: string) {
  const m = /^https:\/\/([^@]+)@([^/]+)\/(\d+)$/.exec(dsn.trim());
  return m ? { key: m[1], host: m[2], project: m[3] } : null;
}

export async function reportServerError(err: unknown, ctx: ErrorContext = {}) {
  const message = err instanceof Error ? err.message : String(err);
  const digest = typeof err === "object" && err && "digest" in err ? String((err as { digest: unknown }).digest) : undefined;
  console.error("[erreur serveur]", { message, digest, path: ctx.path?.split("?")[0], route: ctx.routePath });
  const dsn = parseDsn(process.env.SENTRY_DSN ?? "");
  if (!dsn) return;
  const eventId = randomUUID().replace(/-/g, "");
  const event = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: "node",
    level: "error",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    transaction: ctx.routePath,
    tags: { method: ctx.method, route_type: ctx.routeType, digest },
    exception: { values: [{ type: err instanceof Error ? err.name : "Error", value: message.slice(0, 1000), stacktrace: undefined }] },
    request: { url: ctx.path?.split("?")[0], method: ctx.method },
  };
  const body = `${JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() })}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify(event)}`;
  try {
    await fetch(`https://${dsn.host}/api/${dsn.project}/envelope/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope", "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${dsn.key}, sentry_client=structura/1.0` },
      body,
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    /* le suivi d'erreurs ne doit jamais casser la réponse */
  }
}
