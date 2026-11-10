"use server";
/** Actions du compte : profil, adresse, mot de passe, MFA, sessions, suppression. */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { z } from "zod";
import { actionUser, ActionError, dbErrorMessage, type ActionResult } from "@/lib/auth/dal";
import { emailSchema, fieldErrors, profileSchema } from "@/lib/auth/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { throttle } from "@/lib/security/rate-limit";
import { sendEmail } from "@/lib/email/send";

async function wrap<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, error: e.message };
    console.error("[compte]", e);
    return { ok: false, error: "L'opération n'a pas abouti." };
  }
}

export async function updateProfile(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return wrap(async () => {
    const parsed = profileSchema.safeParse({ displayName: form.get("displayName"), studyYear: form.get("studyYear"), weeklyGoal: form.get("weeklyGoal") });
    if (!parsed.success) return { ok: false, error: "Vérifiez le formulaire.", fields: fieldErrors(parsed.error) };
    const { supabase, session } = await actionUser();
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: parsed.data.displayName, study_year: parsed.data.studyYear, weekly_goal: parsed.data.weeklyGoal })
      .eq("id", session.id);
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath("/", "layout");
    return { ok: true, message: "Profil enregistré." };
  });
}

export async function changeEmail(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return wrap(async () => {
    const parsed = emailSchema.safeParse(form.get("email"));
    if (!parsed.success) return { ok: false, error: "Adresse invalide.", fields: { email: "Adresse invalide." } };
    const { supabase, session } = await actionUser();
    if (!(await throttle("email-change", session.id, 3, 3600))) return { ok: false, error: "Trop de demandes : réessayez plus tard." };
    const { error } = await supabase.auth.updateUser({ email: parsed.data }, { emailRedirectTo: `${publicEnv.siteUrl}/auth/confirm?next=/compte` });
    if (error) return { ok: false, error: error.code === "email_exists" ? "Cette adresse ne peut pas être utilisée." : "Le changement d'adresse n'a pas abouti." };
    return { ok: true, message: "Un lien de confirmation a été envoyé à la nouvelle adresse (et à l'ancienne). Le changement prend effet après confirmation." };
  });
}

export async function startMfaEnroll(): Promise<ActionResult<{ factorId: string; qr: string; secret: string }>> {
  return wrap(async () => {
    const { supabase } = await actionUser();
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `STRUCTURA ${new Date().toISOString().slice(0, 16)}`, issuer: "STRUCTURA" });
    if (error || !data) return { ok: false, error: "Activation impossible pour le moment." };
    return { ok: true, data: { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret } };
  });
}

export async function confirmMfaEnroll(factorId: string, code: string): Promise<ActionResult> {
  return wrap(async () => {
    if (!/^\d{6}$/.test(code) || !z.uuid().safeParse(factorId).success) return { ok: false, error: "Code à 6 chiffres attendu." };
    const { supabase, session } = await actionUser();
    if (!(await throttle("mfa", session.id, 10, 600))) return { ok: false, error: "Trop de tentatives : patientez." };
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) return { ok: false, error: "Code incorrect : vérifiez l'heure de votre téléphone et réessayez." };
    revalidatePath("/compte");
    return { ok: true, message: "Double authentification activée." };
  });
}

export async function removeMfa(factorId: string): Promise<ActionResult> {
  return wrap(async () => {
    if (!z.uuid().safeParse(factorId).success) return { ok: false, error: "Facteur invalide." };
    const { supabase } = await actionUser();
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) return { ok: false, error: "Désactivation impossible (reconnectez-vous avec votre code)." };
    revalidatePath("/compte");
    return { ok: true, message: "Double authentification désactivée." };
  });
}

export async function signOutEverywhere(scope: "others" | "global"): Promise<ActionResult> {
  return wrap(async () => {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope });
    if (scope === "global") redirect("/connexion?deconnecte=1");
    return { ok: true, message: "Les autres sessions ont été fermées." };
  });
}

/** Suppression définitive : confirmation écrite + mot de passe, puis effacement en cascade. */
export async function deleteAccount(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return wrap(async (): Promise<ActionResult> => {
    if (form.get("confirm") !== "SUPPRIMER") return { ok: false, error: "Tapez SUPPRIMER pour confirmer.", fields: { confirm: "Tapez SUPPRIMER." } };
    const password = String(form.get("password") ?? "");
    const { session } = await actionUser();
    if (session.role === "admin") return { ok: false, error: "Un administrateur doit d'abord transférer son rôle avant de supprimer son compte." };
    if (!(await throttle("delete-account", session.id, 5, 3600))) return { ok: false, error: "Trop de tentatives." };
    // Vérifie le mot de passe sans toucher à la session en cours.
    const probe = createPlainClient(publicEnv.supabaseUrl, publicEnv.supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: pwError } = await probe.auth.signInWithPassword({ email: session.email, password });
    if (pwError) return { ok: false, error: "Mot de passe incorrect.", fields: { password: "Mot de passe incorrect." } };
    await probe.auth.signOut({ scope: "local" });
    const admin = createAdminClient();
    if (!admin) return { ok: false, error: "Suppression indisponible : contactez l'administrateur (configuration serveur)." };
    await admin.from("audit_logs").insert({ actor_id: session.id, action: "users.self_delete", target_table: "auth.users", target_id: session.id, details: {} });
    const { error } = await admin.auth.admin.deleteUser(session.id);
    if (error) return { ok: false, error: "La suppression n'a pas abouti. Réessayez ou contactez l'administrateur." };
    await sendEmail(session.email, "Votre compte STRUCTURA a été supprimé", "Votre compte et toutes les données associées (progression, tentatives, favoris) ont été supprimés définitivement.");
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
    redirect("/?compte=supprime");
  });
}
