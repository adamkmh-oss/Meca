/**
 * Lien reçu par e-mail (confirmation d'inscription, réinitialisation du mot
 * de passe, changement d'adresse) : échange du jeton à usage unique contre
 * une session, puis redirection interne.
 */
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/validation";

const TYPES: EmailOtpType[] = ["email", "signup", "recovery", "email_change", "invite", "magiclink"];

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(url.searchParams.get("next"));
  const fail = new URL("/connexion?lien=invalide", url.origin);
  if (!tokenHash || !/^[A-Za-z0-9_-]{10,200}$/.test(tokenHash) || !type || !TYPES.includes(type)) return NextResponse.redirect(fail);
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return NextResponse.redirect(fail);
  return NextResponse.redirect(new URL(type === "recovery" ? "/compte/nouveau-mot-de-passe" : next, url.origin));
}
