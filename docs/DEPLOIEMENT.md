# Déploiement en production

Cible : **Vercel** (application) + **Supabase** (base, authentification, fichiers), région européenne.

## Ce que vous devez fournir

| Élément | Où l'obtenir | Variable |
|---|---|---|
| Projet Supabase (région UE, ex. Paris `eu-west-3`) | supabase.com | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Projet Vercel relié au dépôt GitHub | vercel.com | — |
| Nom de domaine | registrar | `NEXT_PUBLIC_SITE_URL` |
| Clé API Anthropic (tuteur, facultatif) | console.anthropic.com | `ANTHROPIC_API_KEY` |
| Compte Resend + domaine vérifié (e-mails) | resend.com | SMTP dans Supabase ; `RESEND_API_KEY`, `EMAIL_FROM` |
| Sentry (facultatif) | sentry.io | `SENTRY_DSN` |
| Identité de l'éditeur (mentions légales) | — | `LEGAL_*`, `CONTACT_EMAIL` |

## 1. Supabase

1. Créer le projet (région UE), noter l'URL et les clés (Project Settings > API).
2. Appliquer les migrations :
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
   ou exécuter les fichiers `supabase/migrations/*.sql` dans l'ordre (SQL Editor).
3. **Authentication > Providers > Email** : confirmation d'e-mail activée, « secure email change » activé, longueur minimale 10, exigences « minuscules, majuscules, chiffres ». Activer la protection contre les mots de passe divulgués (offre Pro).
4. **Authentication > URL Configuration** : Site URL = `https://votre-domaine.fr` ; Redirect URLs = `https://votre-domaine.fr/**`.
5. **Authentication > Email Templates** : copier `supabase/templates/confirmation.html`, `recovery.html`, `email-change.html` (liens vers `/auth/confirm?token_hash=…`).
6. **Authentication > SMTP** : Resend (`smtp.resend.com`, port 465, utilisateur `resend`, mot de passe = clé API Resend), expéditeur du domaine vérifié.
7. **Authentication > Multi-Factor** : TOTP activé.
8. **Authentication > Rate Limits** : la connexion passe par le serveur Next.js, donc Supabase voit l'adresse IP de Vercel pour **tous** les étudiants. Relevez la limite « sign-ups and sign-ins » à la hauteur des pics attendus (ex. 300 par 5 min pour une promotion qui se connecte en début de TD). La protection individuelle reste assurée par l'application, qui limite selon l'IP réelle de l'étudiant (30 essais / 10 min) et par compte (8 essais / 15 min). Facultatif : CAPTCHA (hCaptcha / Turnstile) sur l'inscription.
9. Contenu initial : `NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run content:load`.
10. Tâche planifiée de conservation (Database > Extensions : activer `pg_cron`) :
    ```sql
    select cron.schedule('structura-retention', '17 3 * * *', $$select public.retention_cleanup()$$);
    ```

## 2. Vercel

1. Importer le dépôt GitHub, framework Next.js, Node 22.
2. Variables d'environnement (Production et Preview) : voir `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` et `ANTHROPIC_API_KEY` en « Sensitive ».
3. Région des fonctions : `cdg1` (Paris) pour être proche de la base.
4. Domaine : ajouter `votre-domaine.fr` (Settings > Domains), suivre les enregistrements DNS. HTTPS est automatique (certificat Let's Encrypt) ; HTTP redirige vers HTTPS ; l'en-tête HSTS est envoyé par l'application.
5. Déployer, puis créer votre compte sur le site et lancer :
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run admin:promote -- vous@exemple.fr admin
   ```

## 3. Vérifications après déploiement

- `curl -sI https://votre-domaine.fr` : `content-security-policy` avec nonce, `strict-transport-security`, `x-content-type-options`, `x-frame-options`.
- Inscription → e-mail reçu → lien → espace personnel.
- Compte étudiant : `/admin` renvoie 403.
- Dépôt d'un PDF depuis `/admin/documents`, publication, ouverture par un étudiant.
- Tuteur : une question depuis un compte étudiant.
- Lancer les tests de bout en bout contre la préproduction : `E2E_BASE_URL=https://preprod… npm run test:e2e` (sur une base de préproduction, jamais la production : les tests créent des comptes).

## 4. Sauvegardes et restauration

- **Supabase** : sauvegardes quotidiennes automatiques (7 jours en offre Pro, 30 en Team) ; activer la **restauration à un instant donné (PITR)** pour un RPO de quelques minutes.
- **Sauvegarde logique supplémentaire** (hebdomadaire, conservée hors Supabase, chiffrée) :
  ```bash
  pg_dump "$DATABASE_URL" --format=custom --no-owner --file=structura-$(date +%F).dump
  ```
  et des fichiers du seau `documents` (`supabase storage cp -r ss:///documents ./documents-backup` ou script avec la clé de service).
- **Restauration** : Dashboard > Database > Backups (ou PITR) vers un nouveau projet ; vérifier ; basculer les variables Vercel. Pour un dump : `pg_restore --clean --no-owner -d "$NOUVELLE_BASE" structura-AAAA-MM-JJ.dump`, puis réappliquer les éventuelles migrations postérieures.
- Tester une restauration au moins une fois par semestre.

## 5. Maintenance

| Fréquence | Tâche |
|---|---|
| Continue | Alertes Sentry ; journaux Vercel ; signalements dans `/admin/signalements` |
| Hebdomadaire | Revue du journal d'audit (`/admin/journal`) ; mises à jour de sécurité (`npm audit`, Dependabot) |
| Mensuelle | Comptes inactifs (`docs/RGPD.md`) ; quotas et coût du tuteur (`/admin`) |
| Semestrielle | Test de restauration ; revue des rôles administrateur ; rotation de la clé de service et de la clé Anthropic |

Nouvelle migration : ajouter un fichier `supabase/migrations/AAAAMMJJhhmmss_nom.sql`, le tester en local (`npm run stack:reset`, `npm test`, `npm run test:e2e`), puis `npx supabase db push`.

## 6. Développement et CI

`.github/workflows/ci.yml` : vérification TypeScript, tests unitaires, build, puis pile Supabase locale (docker compose) pour les tests d'intégration et de bout en bout.
