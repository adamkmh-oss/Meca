import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseConfigured } from "@/lib/env";
import { getSession } from "@/lib/auth/dal";
import { safeNext } from "@/lib/auth/validation";
import { Callout } from "@/components/ui";
import { ActionForm, Field, SubmitButton } from "@/components/forms/form-kit";
import { AuthCard } from "../auth-card";
import { signIn } from "../actions";

export const metadata: Metadata = { title: "Connexion" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getSession()) redirect(next);
  return (
    <AuthCard
      title="Connexion"
      subtitle="Retrouvez votre progression, vos favoris et votre historique."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="font-medium text-primary hover:underline">
            Créer un compte
          </Link>
        </>
      }
    >
      {!supabaseConfigured && <Callout tone="warning">Les comptes ne sont pas encore configurés sur ce serveur (variables Supabase manquantes).</Callout>}
      {sp.lien === "invalide" && <Callout tone="warning">Ce lien est invalide ou a expiré. Recommencez la démarche.</Callout>}
      {sp.deconnecte && <Callout tone="success">Vous êtes déconnecté(e).</Callout>}
      <ActionForm action={signIn} className="mt-4">
        <input type="hidden" name="next" value={next} />
        <Field name="email" label="Adresse e-mail" type="email" autoComplete="email" required inputMode="email" />
        <Field name="password" label="Mot de passe" type="password" autoComplete="current-password" required />
        <div className="flex items-center justify-between">
          <Link href="/mot-de-passe-oublie" className="text-sm text-primary hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>
        <SubmitButton className="h-10 w-full">Se connecter</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
