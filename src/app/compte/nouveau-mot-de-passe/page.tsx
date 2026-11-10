import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { ActionForm, Field, SubmitButton } from "@/components/forms/form-kit";
import { AuthCard } from "@/app/(auth)/auth-card";
import { updatePassword } from "@/app/(auth)/actions";
import { PASSWORD_MIN } from "@/lib/auth/validation";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default async function NewPasswordPage() {
  await requireUser("/compte/nouveau-mot-de-passe");
  return (
    <AuthCard title="Choisir un nouveau mot de passe" subtitle="Les autres sessions ouvertes seront déconnectées.">
      <ActionForm action={updatePassword}>
        <Field name="password" label="Nouveau mot de passe" type="password" autoComplete="new-password" required hint={`${PASSWORD_MIN} caractères minimum, avec une majuscule, une minuscule et un chiffre.`} />
        <Field name="confirm" label="Confirmation" type="password" autoComplete="new-password" required />
        <SubmitButton className="h-10 w-full">Enregistrer</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
