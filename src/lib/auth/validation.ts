/**
 * Validation des formulaires d'authentification et de profil (zod),
 * partagée entre client (retour immédiat) et serveur (seule validation
 * qui fasse foi). Les mêmes règles de mot de passe sont imposées par
 * Supabase Auth (voir supabase/config.toml).
 */
import { z } from "zod";

export const PASSWORD_MIN = 10;

export function passwordProblems(password: string, email = ""): string[] {
  const p: string[] = [];
  if (password.length < PASSWORD_MIN) p.push(`au moins ${PASSWORD_MIN} caractères`);
  if (password.length > 128) p.push("au plus 128 caractères");
  if (!/[a-z]/.test(password)) p.push("une minuscule");
  if (!/[A-Z]/.test(password)) p.push("une majuscule");
  if (!/[0-9]/.test(password)) p.push("un chiffre");
  const local = email.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && password.toLowerCase().includes(local)) p.push("ne pas contenir votre identifiant e-mail");
  if (/^(.)\1+$/.test(password) || /(?:password|motdepasse|azerty|qwerty|123456)/i.test(password)) p.push("ne pas être un mot de passe courant");
  return p;
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Adresse trop longue.")
  .pipe(z.email("Adresse e-mail invalide."));

const studyYear = z.enum(["BUT1", "BUT2", "BUT3", "autre"], { message: "Choisissez votre année." });
export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Au moins 2 caractères.")
  .max(60, "Au plus 60 caractères.")
  .regex(/^[^<>{}\u0000-\u001f]+$/, "Caractères non autorisés.");

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: z.string(),
    displayName: displayNameSchema,
    studyYear,
    consent: z.literal("on", { message: "Vous devez accepter la politique de confidentialité." }),
  })
  .superRefine((v, ctx) => {
    const p = passwordProblems(v.password, v.email);
    if (p.length) ctx.addIssue({ code: "custom", path: ["password"], message: `Le mot de passe doit contenir ${p.join(", ")}.` });
  });

export const signInSchema = z.object({ email: emailSchema, password: z.string().min(1, "Mot de passe requis.").max(128) });

export const newPasswordSchema = z
  .object({ password: z.string(), confirm: z.string() })
  .superRefine((v, ctx) => {
    const p = passwordProblems(v.password);
    if (p.length) ctx.addIssue({ code: "custom", path: ["password"], message: `Le mot de passe doit contenir ${p.join(", ")}.` });
    if (v.password !== v.confirm) ctx.addIssue({ code: "custom", path: ["confirm"], message: "Les deux mots de passe diffèrent." });
  });

export const profileSchema = z.object({
  displayName: displayNameSchema,
  studyYear,
  weeklyGoal: z.coerce.number().int().min(1).max(100),
});

/** Chemin de redirection interne sûr (pas de redirection ouverte vers un autre site). */
export function safeNext(next: unknown, fallback = "/espace"): string {
  if (typeof next !== "string") return fallback;
  if (!/^\/(?!\/)[A-Za-z0-9/_.?=&%-]{0,255}$/.test(next)) return fallback;
  if (next.startsWith("/auth/") || next.startsWith("/connexion")) return fallback;
  return next;
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const k = String(issue.path[0] ?? "form");
    out[k] ??= issue.message;
  }
  return out;
}
