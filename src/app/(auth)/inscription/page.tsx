import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/dal";
import { STUDY_YEARS } from "@/lib/auth/permissions";
import { PASSWORD_MIN } from "@/lib/auth/validation";
import { ActionForm, Field, FieldError, SelectField, SubmitButton } from "@/components/forms/form-kit";
import { AuthCard } from "../auth-card";
import { signUp } from "../actions";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function SignUpPage() {
  if (await getSession()) redirect("/espace");
  return (
    <AuthCard
      title="Créer un compte étudiant"
      subtitle="Gratuit. Vos données servent uniquement à suivre votre progression."
      footer={
        <>
          Déjà inscrit(e) ?{" "}
          <Link href="/connexion" className="font-medium text-primary hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <ActionForm
        action={signUp}
        successTitle="Vérifiez votre boîte mail"
      >
        <Field name="displayName" label="Prénom ou pseudonyme" autoComplete="nickname" required maxLength={60} />
        <Field name="email" label="Adresse e-mail" type="email" autoComplete="email" required inputMode="email" />
        <Field
          name="password"
          label="Mot de passe"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN}
          hint={`${PASSWORD_MIN} caractères minimum, avec une majuscule, une minuscule et un chiffre.`}
        />
        <SelectField name="studyYear" label="Année d'étude" options={[{ value: "", label: "Choisir…" }, ...STUDY_YEARS]} defaultValue="" required />
        <div className="space-y-1">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="consent" className="mt-1 size-4 accent-[var(--primary)]" required />
            <span>
              J&apos;ai lu la{" "}
              <Link href="/confidentialite" className="text-primary underline underline-offset-2">
                politique de confidentialité
              </Link>{" "}
              et j&apos;accepte le traitement de mes données pour le suivi de mon apprentissage.
            </span>
          </label>
          <FieldError name="consent" />
        </div>
        <SubmitButton className="h-10 w-full">Créer mon compte</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
