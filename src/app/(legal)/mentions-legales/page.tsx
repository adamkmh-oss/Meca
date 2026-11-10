import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/layout/app-shell";
import { legal, TODO } from "@/lib/legal";

export const metadata: Metadata = { title: "Mentions légales" };

export default function LegalPage() {
  return (
    <Container className="max-w-3xl">
      <PageHeader title="Mentions légales" />
      <article className="prose-structura">
        <h2 className="text-lg font-semibold">Éditeur</h2>
        <p>
          {legal.publisher || TODO}
          <br />
          {legal.address || TODO}
          <br />
          Contact : {legal.contact || TODO}
        </p>
        <h2 className="text-lg font-semibold">Directeur de la publication</h2>
        <p>{legal.director || TODO}</p>
        <h2 className="text-lg font-semibold">Hébergement</h2>
        <p>
          Application : {legal.host}.
          <br />
          Données : Supabase, {legal.dataRegion}.
        </p>
        <h2 className="text-lg font-semibold">Propriété intellectuelle</h2>
        <p>Les contenus pédagogiques sont la propriété de leurs auteurs. Toute reproduction hors usage pédagogique personnel nécessite leur accord.</p>
        <h2 className="text-lg font-semibold">Données personnelles</h2>
        <p>Voir la politique de confidentialité.</p>
      </article>
    </Container>
  );
}
