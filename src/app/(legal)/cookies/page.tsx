import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/layout/app-shell";

export const metadata: Metadata = { title: "Cookies" };

export default function CookiesPage() {
  return (
    <Container className="max-w-3xl">
      <PageHeader title="Cookies et stockage local" description="Uniquement ce qui est strictement nécessaire au fonctionnement : aucun bandeau de consentement n'est donc requis." />
      <article className="prose-structura">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Type</th>
              <th>Rôle</th>
              <th>Durée</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>sb-…-auth-token</td>
              <td>Cookie HttpOnly, SameSite=Lax, Secure</td>
              <td>Session de connexion (jeton Supabase Auth)</td>
              <td>Jusqu&apos;à la déconnexion (renouvelé automatiquement)</td>
            </tr>
            <tr>
              <td>structura:theme</td>
              <td>Stockage local du navigateur</td>
              <td>Mémorise le mode clair ou sombre</td>
              <td>Jusqu&apos;à effacement par vous</td>
            </tr>
            <tr>
              <td>structura:progress:v1, structura:tuteur:v1</td>
              <td>Stockage local du navigateur</td>
              <td>Progression hors connexion et conversation du tuteur, conservées sur votre appareil</td>
              <td>Jusqu&apos;à effacement par vous</td>
            </tr>
          </tbody>
        </table>
        <p>Aucun cookie publicitaire, de réseau social ou de mesure d&apos;audience n&apos;est utilisé. Si un outil de mesure d&apos;audience était ajouté, il ne serait activé qu&apos;après votre consentement.</p>
      </article>
    </Container>
  );
}
