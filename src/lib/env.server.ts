import "server-only";
/**
 * Secrets serveur : lus uniquement dans les modules serveur (« server-only »
 * fait échouer la compilation si un composant client les importe).
 */
export const serverEnv = {
  supabaseServiceKey: process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_AUTH_TOKEN ?? "",
  resendKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "STRUCTURA <no-reply@structura.example>",
  sentryDsn: process.env.SENTRY_DSN ?? "",
  clamavHost: process.env.CLAMAV_HOST ?? "",
  clamavPort: Number(process.env.CLAMAV_PORT ?? 3310),
  contactEmail: process.env.CONTACT_EMAIL ?? "",
};
