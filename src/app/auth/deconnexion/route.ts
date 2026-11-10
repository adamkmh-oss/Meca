/** Déconnexion (POST uniquement, même origine) : révoque la session côté Supabase Auth. */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sameOrigin } from "@/lib/security/request";
import { supabaseConfigured } from "@/lib/env";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new NextResponse("Origine refusée", { status: 403 });
  if (supabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  }
  return NextResponse.redirect(new URL("/connexion?deconnecte=1", request.url), { status: 303 });
}
