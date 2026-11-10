import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

/**
 * Client Supabase côté serveur, au nom de l'utilisateur connecté (jeton de
 * session dans des cookies HttpOnly). Toutes les requêtes passent par la RLS.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // appelé depuis un composant serveur : le proxy rafraîchit la session
        }
      },
    },
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: publicEnv.siteUrl.startsWith("https://"), path: "/" },
  });
}
