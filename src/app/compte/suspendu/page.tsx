import type { Metadata } from "next";
import { AuthCard } from "@/app/(auth)/auth-card";

export const metadata: Metadata = { title: "Compte suspendu" };

export default function SuspendedPage() {
  return (
    <AuthCard title="Compte suspendu" subtitle="Votre compte a été suspendu par un administrateur. Vos données sont conservées.">
      <p className="text-sm text-muted-foreground">Pour toute question, contactez l&apos;équipe pédagogique ou l&apos;administrateur de la plateforme.</p>
      <form action="/auth/deconnexion" method="post" className="mt-4">
        <button type="submit" className="text-sm text-primary underline cursor-pointer">
          Se déconnecter
        </button>
      </form>
    </AuthCard>
  );
}
