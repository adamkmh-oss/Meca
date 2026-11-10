import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageHeader } from "@/components/layout/app-shell";
import { legal, TODO } from "@/lib/legal";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function PrivacyPage() {
  return (
    <Container className="max-w-3xl">
      <PageHeader eyebrow="RGPD" title="Politique de confidentialité" description="Quelles données sont traitées, pourquoi, combien de temps, et comment exercer vos droits." />
      <article className="prose-structura">
        <h2 className="text-lg font-semibold">1. Responsable du traitement</h2>
        <p>
          {legal.publisher || TODO}, {legal.address || TODO}. Contact pour les données personnelles : <strong>{legal.dpo || TODO}</strong>.
        </p>

        <h2 className="text-lg font-semibold">2. Données traitées et finalités</h2>
        <table>
          <thead>
            <tr>
              <th>Finalité</th>
              <th>Données</th>
              <th>Base légale</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Créer et sécuriser votre compte</td>
              <td>Adresse e-mail, mot de passe (stocké uniquement sous forme hachée par Supabase Auth), pseudonyme, année d&apos;étude, facteur de double authentification s&apos;il est activé</td>
              <td>Exécution du service demandé (art. 6.1.b RGPD)</td>
            </tr>
            <tr>
              <td>Suivre votre apprentissage</td>
              <td>Leçons consultées, temps d&apos;étude, tentatives et réponses aux exercices, scores, favoris, objectif hebdomadaire</td>
              <td>Exécution du service (art. 6.1.b)</td>
            </tr>
            <tr>
              <td>Tuteur IA</td>
              <td>Texte de vos questions, mode choisi, page consultée et indicateurs de progression (niveau, maîtrise par chapitre). Aucun nom, e-mail ni identifiant n&apos;est transmis au fournisseur d&apos;IA. Seul un compteur d&apos;utilisation est conservé dans la base.</td>
              <td>Exécution du service (art. 6.1.b)</td>
            </tr>
            <tr>
              <td>Qualité des contenus</td>
              <td>Signalements que vous envoyez</td>
              <td>Intérêt légitime (art. 6.1.f)</td>
            </tr>
            <tr>
              <td>Sécurité et prévention des abus</td>
              <td>Journal des opérations sensibles, compteurs anti-abus (adresse IP et e-mail hachés, jamais en clair)</td>
              <td>Intérêt légitime (art. 6.1.f)</td>
            </tr>
          </tbody>
        </table>
        <p>Aucune donnée n&apos;est vendue, aucune publicité n&apos;est affichée, aucun profilage commercial n&apos;est réalisé.</p>

        <h2 className="text-lg font-semibold">3. Destinataires et sous-traitants</h2>
        <ul>
          <li>Supabase (base de données, authentification, stockage des documents) — données hébergées : {legal.dataRegion}.</li>
          <li>Hébergement de l&apos;application : {legal.host}.</li>
          <li>Anthropic (modèle d&apos;IA du tuteur, États-Unis) — uniquement le contenu des questions et le contexte pédagogique décrit ci-dessus, si vous utilisez le tuteur.</li>
          <li>Envoi des e-mails (confirmation, réinitialisation) : prestataire SMTP configuré par l&apos;éditeur (par exemple Resend).</li>
        </ul>
        <p>Les transferts hors de l&apos;Union européenne sont encadrés par les clauses contractuelles types de la Commission européenne ou un mécanisme équivalent prévu par les contrats de ces prestataires.</p>
        <p>L&apos;équipe pédagogique n&apos;accède qu&apos;à des statistiques agrégées. Les administrateurs voient la liste des comptes (e-mail, pseudonyme, rôle) pour la gestion de la plateforme ; ils n&apos;ont pas accès à vos réponses individuelles.</p>

        <h2 className="text-lg font-semibold">4. Durées de conservation</h2>
        <ul>
          <li>Compte et données d&apos;apprentissage : jusqu&apos;à la suppression du compte ; un compte étudiant inactif depuis 3 ans est supprimé après un avertissement par e-mail.</li>
          <li>Compteurs d&apos;utilisation du tuteur : 12 mois. Notifications : 6 mois après lecture (12 mois au plus).</li>
          <li>Signalements traités : 2 ans. Journal des opérations sensibles : 1 an. Compteurs anti-abus : 48 heures.</li>
          <li>La suppression du compte efface immédiatement toutes les données associées ; les sauvegardes de la base sont écrasées selon leur cycle de rotation (7 jours par défaut chez Supabase).</li>
        </ul>

        <h2 className="text-lg font-semibold">5. Vos droits</h2>
        <p>Vous disposez des droits d&apos;accès, de rectification, d&apos;effacement, de limitation, d&apos;opposition et de portabilité. Depuis la page <Link href="/compte">Mon compte</Link> vous pouvez directement :</p>
        <ul>
          <li>modifier vos informations (rectification) ;</li>
          <li>télécharger toutes vos données au format JSON (accès et portabilité) ;</li>
          <li>supprimer définitivement votre compte (effacement).</li>
        </ul>
        <p>
          Pour toute autre demande : {legal.dpo || TODO} (réponse sous un mois). Vous pouvez aussi introduire une réclamation auprès de la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noopener">cnil.fr</a>).
        </p>

        <h2 className="text-lg font-semibold">6. Cookies</h2>
        <p>
          Seuls des cookies strictement nécessaires (session de connexion) sont utilisés : aucun consentement n&apos;est requis et aucun traceur publicitaire ou de mesure d&apos;audience n&apos;est déposé. Détail : <Link href="/cookies">politique cookies</Link>.
        </p>

        <h2 className="text-lg font-semibold">7. Sécurité</h2>
        <p>
          Connexions chiffrées (HTTPS), mots de passe hachés, double authentification possible, cloisonnement des données de chaque compte au niveau de la base (règles d&apos;accès par ligne), journalisation des opérations sensibles, fichiers privés servis par liens temporaires.
        </p>
      </article>
    </Container>
  );
}
