/**
 * Proxy (ex-middleware) : exécuté avant chaque page.
 *  1. Nonce CSP par requête.
 *  2. Rafraîchissement de la session Supabase (cookies HttpOnly).
 *  3. Redirection rapide des pages privées vers /connexion.
 * Ce n'est PAS le contrôle d'accès : chaque page et action revérifie les
 * droits côté serveur (src/lib/auth/dal.ts) et la base applique la RLS.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { publicEnv, supabaseConfigured } from "@/lib/env";
import { buildCsp } from "@/lib/security/headers";

const PRIVATE = [/^\/espace(\/|$)/, /^\/compte(\/|$)/, /^\/admin(\/|$)/];

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, {
    dev: process.env.NODE_ENV === "development",
    supabaseUrl: publicEnv.supabaseUrl,
    https: publicEnv.siteUrl.startsWith("https://"),
  });

  let refreshed: { name: string; value: string; options: Record<string, unknown> }[] = [];
  let signedIn = false;
  if (supabaseConfigured) {
    const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          for (const { name, value } of list) request.cookies.set(name, value);
          refreshed = list;
        },
      },
    });
    try {
      const { data } = await supabase.auth.getClaims();
      signedIn = Boolean(data?.claims?.sub);
    } catch {
      signedIn = false;
    }
  }

  const { pathname, search } = request.nextUrl;
  let response: NextResponse;
  if (!signedIn && PRIVATE.some((r) => r.test(pathname))) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    response = NextResponse.redirect(url);
  } else {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", csp);
    response = NextResponse.next({ request: { headers } });
  }
  for (const { name, value, options } of refreshed) response.cookies.set(name, value, options);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|svg|webp|ico|woff2?)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
