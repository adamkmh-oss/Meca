import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, Field, SubmitButton } from "@/components/forms/form-kit";
import { AuthCard } from "../auth-card";
import { requestPasswordReset } from "../actions";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Mot de passe oublié"
      subtitle="Saisissez l'adresse de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe."
      footer={
        <Link href="/connexion" className="font-medium text-primary hover:underline">
          Retour à la connexion
        </Link>
      }
    >
      <ActionForm action={requestPasswordReset}>
        <Field name="email" label="Adresse e-mail" type="email" autoComplete="email" required inputMode="email" />
        <SubmitButton className="h-10 w-full">Envoyer le lien</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
