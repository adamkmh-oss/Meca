import "server-only";
/**
 * E-mails transactionnels de l'application (hors e-mails d'authentification,
 * envoyés par Supabase Auth via le SMTP configuré, par ex. Resend).
 * Sans RESEND_API_KEY, l'envoi est ignoré (journalisé sans le contenu).
 */
import { serverEnv } from "@/lib/env.server";

export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!serverEnv.resendKey) {
    console.info(`[email] non envoyé (RESEND_API_KEY absent) : « ${subject} »`);
    return false;
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${serverEnv.resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: serverEnv.emailFrom, to: [to], subject, text }),
      signal: AbortSignal.timeout(8000),
    });
    return r.ok;
  } catch {
    return false;
  }
}
