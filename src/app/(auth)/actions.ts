"use server";
/**
 * Actions d'authentification. Supabase Auth gère le hachage des mots de
 * passe (bcrypt), la vérification d'e-mail, les jetons et la MFA ; ces
 * actions valident les entrées, limitent le débit et ne révèlent jamais si
 * une adresse existe (pas d'énumération de comptes).
 */
import { redirect } from "next/navigation";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { clientIp } from "@/lib/security/request";
import { throttle } from "@/lib/security/rate-limit";
import { fieldErrors, newPasswordSchema, safeNext, signInSchema, signUpSchema, emailSchema } from "@/lib/auth/validation";
import type { ActionResult } from "@/lib/auth/dal";

const GENERIC_LOGIN_ERROR = "Adresse e-mail ou mot de passe incorrect.";
const TOO_MANY = "Trop de tentatives. Patientez quelques minutes avant de réessayer.";

export async function signIn(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { ok: false, error: "Vérifiez le formulaire.", fields: fieldErrors(parsed.error) };
  const ip = await clientIp();
  // Force brute et bourrage d'identifiants : limite par adresse IP et par compte visé.
  const [byIp, byEmail] = await Promise.all([
    throttle("login-ip", ip, Number(process.env.AUTH_LOGIN_LIMIT_PER_IP ?? 30), 600),
    throttle("login-email", parsed.data.email, 8, 900),
  ]);
  if (!byIp || !byEmail) return { ok: false, error: TOO_MANY };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { ok: false, error: "Adresse e-mail non confirmée : ouvrez le lien reçu à l'inscription (pensez aux indésirables)." };
    }
    if (error.status === 429) return { ok: false, error: TOO_MANY };
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }
  const next = safeNext(form.get("next"));
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") redirect(`/connexion/verification?next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function signUp(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
    displayName: form.get("displayName"),
    studyYear: form.get("studyYear"),
    consent: form.get("consent"),
  });
  if (!parsed.success) return { ok: false, error: "Vérifiez le formulaire.", fields: fieldErrors(parsed.error) };
  const ip = await clientIp();
  if (!(await throttle("signup-ip", ip, 10, 3600))) return { ok: false, error: TOO_MANY };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${publicEnv.siteUrl}/auth/confirm?next=/espace`,
      data: { display_name: parsed.data.displayName, study_year: parsed.data.studyYear },
    },
  });
  if (error) {
    if (error.code === "weak_password") return { ok: false, error: "Mot de passe trop faible.", fields: { password: "Choisissez un mot de passe plus robuste." } };
    if (error.status === 429) return { ok: false, error: TOO_MANY };
    if (error.code !== "user_already_exists" && error.code !== "email_exists") {
      return { ok: false, error: "L'inscription n'a pas abouti. Réessayez plus tard." };
    }
  }
  // Même réponse qu'il s'agisse d'une nouvelle adresse ou d'une adresse déjà inscrite.
  return { ok: true, message: `Si l'adresse ${parsed.data.email} peut être inscrite, un e-mail de confirmation vient d'y être envoyé. Ouvrez le lien pour activer le compte.` };
}

export async function requestPasswordReset(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(form.get("email"));
  if (!parsed.success) return { ok: false, error: "Adresse e-mail invalide.", fields: { email: "Adresse e-mail invalide." } };
  const ip = await clientIp();
  const [byIp, byEmail] = await Promise.all([throttle("reset-ip", ip, 10, 3600), throttle("reset-email", parsed.data, 3, 3600)]);
  if (byIp && byEmail) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: `${publicEnv.siteUrl}/auth/confirm?next=/compte/nouveau-mot-de-passe` });
  }
  return { ok: true, message: "Si un compte correspond à cette adresse, un lien de réinitialisation vient d'être envoyé. Il est valable une heure." };
}

export async function updatePassword(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = newPasswordSchema.safeParse({ password: form.get("password"), confirm: form.get("confirm") });
  if (!parsed.success) return { ok: false, error: "Vérifiez le formulaire.", fields: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, error: "Lien expiré : refaites une demande de réinitialisation." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { ok: false, error: "Choisissez un mot de passe différent de l'ancien." };
    if (error.code === "insufficient_aal") return { ok: false, error: "Validez d'abord votre code de double authentification." };
    return { ok: false, error: "Le mot de passe n'a pas pu être changé." };
  }
  // Révoque les autres sessions : un mot de passe compromis ne laisse aucun accès ouvert.
  await supabase.auth.signOut({ scope: "others" });
  return { ok: true, message: "Mot de passe modifié. Les autres sessions ont été déconnectées." };
}

export async function verifyMfa(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const code = String(form.get("code") ?? "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) return { ok: false, error: "Saisissez les 6 chiffres affichés par votre application.", fields: { code: "Code à 6 chiffres." } };
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) redirect("/connexion");
  if (!(await throttle("mfa", user.user.id, 10, 600))) return { ok: false, error: TOO_MANY };
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp?.find((f) => f.status === "verified");
  if (!factor) redirect(safeNext(form.get("next")));
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) return { ok: false, error: "Code incorrect ou expiré." };
  redirect(safeNext(form.get("next")));
}

export async function signOut(form: FormData) {
  const supabase = await createClient();
  const scope = form.get("scope") === "global" ? "global" : "local";
  await supabase.auth.signOut({ scope });
  redirect("/connexion?deconnecte=1");
}
