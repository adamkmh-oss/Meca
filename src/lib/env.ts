/**
 * Variables d'environnement publiques (exposées au navigateur : URL et clé
 * publique Supabase uniquement — jamais de secret ici).
 */
export const publicEnv = {
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

/** Comptes et base configurés ? Sinon le site fonctionne en mode « sans compte ». */
export const supabaseConfigured = Boolean(publicEnv.supabaseUrl && publicEnv.supabaseKey);
