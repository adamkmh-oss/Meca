import "server-only";
/**
 * Limitation de débit des formulaires publics (connexion, inscription,
 * mot de passe oublié). Compteurs en base (partagés entre instances) via
 * la clé de service ; à défaut, compteur mémoire (une instance).
 * Supabase Auth applique en plus ses propres limites par adresse IP.
 */
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const memory = new Map<string, { count: number; reset: number }>();

function memoryHit(key: string, max: number, windowSeconds: number): boolean {
  const now = Date.now();
  const cur = memory.get(key);
  if (!cur || cur.reset < now) {
    memory.set(key, { count: 1, reset: now + windowSeconds * 1000 });
    if (memory.size > 10_000) for (const [k, v] of memory) if (v.reset < now) memory.delete(k);
    return true;
  }
  cur.count++;
  return cur.count <= max;
}

export const hashKey = (s: string) => createHash("sha256").update(s.toLowerCase()).digest("hex").slice(0, 32);

/** true si l'appel est autorisé. Les clés sont hachées (aucune adresse e-mail ni IP en clair en base). */
export async function throttle(scope: string, rawKey: string, max: number, windowSeconds: number): Promise<boolean> {
  const key = `${scope}:${hashKey(rawKey)}`;
  const admin = createAdminClient();
  if (!admin) return memoryHit(key, max, windowSeconds);
  const { data, error } = await admin.rpc("rate_limit_hit", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
  if (error) return memoryHit(key, max, windowSeconds);
  return data === true;
}
