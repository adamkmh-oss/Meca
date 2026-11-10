import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/dal";
import { safeNext } from "@/lib/auth/validation";
import { ActionForm, Field, SubmitButton } from "@/components/forms/form-kit";
import { AuthCard } from "../../auth-card";
import { signOut, verifyMfa } from "../../actions";

export const metadata: Metadata = { title: "Double authentification" };

export default async function MfaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const next = safeNext((await searchParams).next);
  const s = await getSession();
  if (!s) redirect("/connexion");
  if (!s.mfaPending) redirect(next);
  return (
    <AuthCard title="Double authentification" subtitle="Saisissez le code à 6 chiffres affiché par votre application d'authentification.">
      <ActionForm action={verifyMfa}>
        <input type="hidden" name="next" value={next} />
        <Field name="code" label="Code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus />
        <SubmitButton className="h-10 w-full">Vérifier</SubmitButton>
      </ActionForm>
      <form action={signOut} className="mt-3">
        <button type="submit" className="w-full text-center text-sm text-muted-foreground hover:text-foreground cursor-pointer">
          Annuler et se déconnecter
        </button>
      </form>
    </AuthCard>
  );
}
