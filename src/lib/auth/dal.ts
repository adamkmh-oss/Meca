import "server-only";
/**
 * Couche d'accès aux données d'authentification (DAL). Toute page ou action
 * privée passe par requireUser / requirePermission : la vérification est
 * faite côté serveur à chaque requête (jeton validé par Supabase Auth).
 */
import { cache } from "react";
import { forbidden, redirect } from "next/navigation";
import { supabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, Permission, StudyYear } from "./permissions";

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: AppRole;
  status: "active" | "suspended";
  studyYear: StudyYear | null;
  weeklyGoal: number;
  permissions: Permission[];
  /** Un facteur MFA existe mais la session n'est pas encore vérifiée (aal1 → aal2). */
  mfaPending: boolean;
  mfaEnabled: boolean;
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
  if (!supabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: perms }, { data: aal }] = await Promise.all([
    supabase.from("profiles").select("display_name, role, status, study_year, weekly_goal").eq("id", user.id).maybeSingle(),
    supabase.rpc("my_permissions"),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if (!profile) return null;
  const mfaEnabled = aal?.nextLevel === "aal2";
  return {
    id: user.id,
    email: user.email ?? "",
    displayName: profile.display_name || (user.email ?? "").split("@")[0],
    role: profile.role,
    status: profile.status,
    studyYear: profile.study_year,
    weeklyGoal: profile.weekly_goal,
    permissions: (perms ?? []) as Permission[],
    mfaPending: mfaEnabled && aal?.currentLevel !== "aal2",
    mfaEnabled,
  };
});

/** Page privée : redirige vers la connexion (ou la vérification MFA, ou la page de compte suspendu). */
export async function requireUser(next = "/espace"): Promise<SessionUser> {
  const s = await getSession();
  if (!s) redirect(`/connexion?next=${encodeURIComponent(next)}`);
  if (s.mfaPending) redirect(`/connexion/verification?next=${encodeURIComponent(next)}`);
  if (s.status !== "active") redirect("/compte/suspendu");
  return s;
}

/** Page réservée : 403 si la permission manque (vérifiée en base, pas seulement dans l'interface). */
export async function requirePermission(permission: Permission, next = "/admin"): Promise<SessionUser> {
  const s = await requireUser(next);
  if (!s.permissions.includes(permission)) forbidden();
  return s;
}

export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string; fields?: Record<string, string> };

export class ActionError extends Error {}

/** Pour les actions serveur : utilisateur actif (et permission), sinon erreur. */
export async function actionUser(permission?: Permission) {
  const s = await getSession();
  if (!s || s.mfaPending || s.status !== "active") throw new ActionError("Session expirée : reconnectez-vous.");
  if (permission && !s.permissions.includes(permission)) throw new ActionError("Action non autorisée.");
  return { session: s, supabase: await createClient() };
}

/** Traduit une erreur PostgREST / Postgres en message sans détail technique. */
export function dbErrorMessage(error: { code?: string; message?: string } | null | undefined, fallback = "L'opération n'a pas abouti."): string {
  if (!error) return fallback;
  switch (error.code) {
    case "42501":
      return "Action non autorisée.";
    case "PT429":
    case "429":
      return "Trop de demandes en peu de temps : réessayez dans un instant.";
    case "23505":
      return "Cet élément existe déjà (identifiant déjà utilisé).";
    case "23514":
    case "22023":
    case "22P02":
      return "Données invalides : vérifiez le formulaire.";
    case "P0002":
      return "Élément introuvable.";
    case "23503":
      return "Élément lié introuvable ou encore utilisé.";
    default:
      return fallback;
  }
}
