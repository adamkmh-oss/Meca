/**
 * Politique de sécurité du contenu (CSP) et en-têtes HTTP de sécurité.
 * La CSP utilise un nonce par requête (scripts) ; les styles inline restent
 * permis car KaTeX et les schémas SVG posent des attributs style (risque
 * faible : aucun script ne peut s'exécuter par un attribut style).
 */
export function buildCsp(nonce: string, opts: { dev: boolean; supabaseUrl: string; https: boolean }): string {
  const supabase = opts.supabaseUrl ? new URL(opts.supabaseUrl).origin : "";
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(opts.dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", ...(supabase ? [supabase] : [])],
    "font-src": ["'self'", "data:"],
    // dépôt direct des documents vers Supabase Storage (URL signée)
    "connect-src": ["'self'", ...(supabase ? [supabase] : []), ...(opts.dev ? ["ws:"] : [])],
    "media-src": ["'self'"],
    "frame-src": ["'none'"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "manifest-src": ["'self'"],
  };
  const parts = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (opts.https) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

/** En-têtes fixes, appliqués à toutes les réponses (next.config.ts). */
export const SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];
