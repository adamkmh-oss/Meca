import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

/**
 * Client « service » : contourne la RLS. Usage limité et justifié :
 *  - enregistrer une tentative corrigée par le serveur (record_graded_attempt) ;
 *  - limiter le débit des formulaires anonymes (connexion, inscription) ;
 *  - suspendre ou supprimer un compte dans Supabase Auth (après contrôle des droits).
 * Ne jamais l'importer dans un composant client ni renvoyer ses résultats bruts.
 */
export function createAdminClient() {
  if (!serverEnv.supabaseServiceKey) return null;
  return createClient(publicEnv.supabaseUrl, serverEnv.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
