import type { Metadata } from "next";
import Link from "next/link";
import { Download, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { Container, PageHeader } from "@/components/layout/app-shell";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { ROLE_LABEL, STUDY_YEARS } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { ActionForm, Field, SelectField, SubmitButton } from "@/components/forms/form-kit";
import { updatePassword } from "@/app/(auth)/actions";
import { changeEmail, deleteAccount, updateProfile } from "./actions";
import { MfaPanel, SessionsPanel } from "./security-panels";

export const metadata: Metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const s = await requireUser("/compte");
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verified = (factors?.totp ?? []).filter((f) => f.status === "verified").map((f) => ({ id: f.id, name: f.friendly_name ?? "Application", created: f.created_at }));

  return (
    <Container className="max-w-3xl">
      <PageHeader eyebrow={ROLE_LABEL[s.role]} title="Mon compte" description={`Connecté(e) en tant que ${s.email}.`} />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="size-4" /> Profil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={updateProfile}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="displayName" label="Prénom ou pseudonyme" defaultValue={s.displayName} maxLength={60} required />
                <SelectField name="studyYear" label="Année d'étude" options={STUDY_YEARS} defaultValue={s.studyYear ?? "BUT1"} />
                <Field name="weeklyGoal" label="Objectif hebdomadaire (exercices)" type="number" min={1} max={100} defaultValue={s.weeklyGoal} />
              </div>
              <SubmitButton>Enregistrer</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4" /> Adresse e-mail et mot de passe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ActionForm action={changeEmail}>
              <Field name="email" label="Nouvelle adresse e-mail" type="email" autoComplete="email" placeholder={s.email} required />
              <SubmitButton variant="outline">Changer d&apos;adresse</SubmitButton>
            </ActionForm>
            <ActionForm action={updatePassword}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="password" label="Nouveau mot de passe" type="password" autoComplete="new-password" required />
                <Field name="confirm" label="Confirmation" type="password" autoComplete="new-password" required />
              </div>
              <SubmitButton variant="outline">Changer le mot de passe</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" /> Sécurité
              {s.mfaEnabled ? <Badge variant="success">double authentification active</Badge> : <Badge variant="muted">double authentification inactive</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <MfaPanel factors={verified} />
            <SessionsPanel />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="size-4" /> Mes données
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            <p className="text-muted-foreground">
              Vous pouvez télécharger à tout moment l&apos;ensemble de vos données (profil, tentatives, progression, favoris, signalements) au format JSON. Voir la{" "}
              <Link href="/confidentialite" className="text-primary underline">
                politique de confidentialité
              </Link>
              .
            </p>
            <a href="/api/compte/export" className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 font-medium hover:bg-muted">
              <Download className="size-4" /> Télécharger mes données
            </a>
            <div className="rounded-xl border border-danger/40 p-4">
              <h3 className="mb-1 font-semibold text-danger">Supprimer mon compte</h3>
              <p className="mb-3 text-muted-foreground">Suppression définitive et immédiate du compte et de toutes les données associées. Cette action est irréversible.</p>
              <ActionForm action={deleteAccount}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field name="confirm" label="Tapez SUPPRIMER" autoComplete="off" required />
                  <Field name="password" label="Mot de passe actuel" type="password" autoComplete="current-password" required />
                </div>
                <SubmitButton variant="danger">Supprimer définitivement</SubmitButton>
              </ActionForm>
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
