import "server-only";
import { headers } from "next/headers";
import { publicEnv } from "@/lib/env";

/** Adresse IP du client (première valeur de X-Forwarded-For, posée par la plateforme d'hébergement). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (fwd || h.get("x-real-ip") || "inconnue").slice(0, 64);
}

/** Protection CSRF des routes API qui modifient des données : l'origine doit être le site. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") === "same-origin";
  try {
    const o = new URL(origin);
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return o.host === host || o.origin === new URL(publicEnv.siteUrl).origin;
  } catch {
    return false;
  }
}
