# Sécurité

## Principes

1. **Le serveur et la base décident, jamais l'interface.** Chaque page privée, action serveur et route API revérifie la session et la permission (`src/lib/auth/dal.ts`) ; la base applique la RLS et des fonctions `security definer` qui vérifient à nouveau les permissions.
2. **Aucun secret côté navigateur.** Seules l'URL Supabase et la clé publique (anon/publishable) sont exposées ; elles ne donnent accès qu'à ce que la RLS autorise. `server-only` empêche d'importer les modules à secrets dans un composant client.
3. **Pas de cryptographie maison.** Mots de passe, jetons, e-mails et MFA : Supabase Auth (bcrypt, JWT, TOTP). Sessions en cookies HttpOnly, SameSite=Lax, Secure en HTTPS.
4. **Moindre privilège.** La clé de service n'est utilisée que pour : enregistrer une note corrigée par le serveur, compter les tentatives de connexion, suspendre/supprimer un compte dans Auth (après contrôle de `users.manage`), supprimer son propre compte (après vérification du mot de passe).

## Correspondance OWASP Top 10 (2021)

| Risque | Mesures | Tests |
|---|---|---|
| A01 Contrôle d'accès | RBAC (3 rôles, 13 permissions) ; RLS sur toutes les tables ; DAL serveur ; `forbidden()` (403) ; colonnes sensibles non modifiables (rôle, statut) ; aucune écriture directe des notes ; identifiants non devinables (UUID) et RLS contre l'IDOR | `tests/integration/security.test.ts`, `tests/e2e/student.spec.ts`, `staff.spec.ts` |
| A02 Défaillances cryptographiques | HTTPS + HSTS (2 ans, preload) ; mots de passe hachés par Supabase Auth ; jetons de confirmation à usage unique (1 h) ; URL signées de 60 s ; clés hachées dans les compteurs | `security.spec.ts` |
| A03 Injection | Requêtes paramétrées (PostgREST, `pg`) ; validation Zod de toutes les entrées ; Markdown rendu sans HTML brut (react-markdown sans rehype-raw), liens `javascript:` neutralisés ; KaTeX sans `\href` ; réponses d'exercice filtrées (UUID, nombres) | intégration (injection), e2e (XSS) |
| A04 Conception non sécurisée | Correction côté serveur ; énumération de comptes impossible (messages identiques) ; dernier admin protégé ; suppression de compte avec mot de passe | intégration, e2e |
| A05 Mauvaise configuration | CSP à nonce (`strict-dynamic`, pas d'`unsafe-eval` en production), `frame-ancestors 'none'`, `object-src 'none'`, nosniff, Referrer-Policy, Permissions-Policy, COOP/CORP ; en-tête `X-Powered-By` retiré ; erreurs sans détail technique ; seau de fichiers privé | `security.spec.ts`, tests unitaires des en-têtes |
| A06 Composants vulnérables | Dépendances minimales ; `npm audit` en CI ; Dependabot recommandé | — |
| A07 Authentification | Vérification d'e-mail obligatoire ; mots de passe ≥ 10 caractères avec majuscule, minuscule, chiffre ; limitation par IP (30/10 min) et par compte (8/15 min) contre la force brute et le bourrage d'identifiants ; MFA TOTP (exigée pour toutes les permissions dès qu'elle est activée : `aal2`) ; rotation des jetons de rafraîchissement ; déconnexion locale, des autres appareils ou globale ; révocation des autres sessions au changement de mot de passe | `auth.spec.ts`, `account.spec.ts` |
| A08 Intégrité | Notes recalculées par le serveur ; journal d'audit en ajout seul ; empreinte SHA-256 des documents ; migrations versionnées | intégration |
| A09 Journalisation | `audit_logs` (publication, suppression, rôles, statuts, signalements, comptes) ; erreurs serveur vers Sentry sans donnée personnelle | e2e (journal) |
| A10 SSRF | Aucune récupération d'URL fournie par l'utilisateur ; le tuteur n'a pas d'outil réseau | — |

## Menaces spécifiques

| Menace | Protection |
|---|---|
| CSRF | Actions serveur : contrôle Origin/Host de Next.js, méthode POST ; routes API modifiantes : `sameOrigin()` ; cookies SameSite=Lax |
| Vol de session | Cookies HttpOnly (inaccessibles au JavaScript), Secure, CSP stricte contre le XSS, expiration 1 h + rotation |
| Upload malveillant | Extensions limitées (PDF, PNG, JPEG, WebP ; pas de SVG ni d'exécutable), type déclaré cohérent, **signature binaire vérifiée** après envoi, PDF avec JavaScript / lancement / pièce jointe refusé, 20 Mo maximum (application + seau), nom généré par le serveur, seau privé, URL signées, antivirus ClamAV si `CLAMAV_HOST` |
| Path traversal | Chemins générés par le serveur et validés par expression régulière en base et dans les politiques du seau |
| Déni de service / coûts | Limites de débit en base (connexion, inscription, réinitialisation, tentatives, signalements, dépôts, temps d'étude, tuteur : 6/min et 80/jour) ; tailles de requêtes bornées ; quotas de Supabase Auth ; protection DDoS de Vercel |
| Fuite de données | RLS ; export limité à ses données ; statistiques enseignantes agrégées ; tuteur sans identité ; journaux sans contenu |
| Abus de l'IA | Réservé aux comptes, quotas, historique validé (seuls les messages système produits par le serveur sont acceptés), outils en lecture seule |

## Checklist avant mise en production

**Secrets et configuration**
- [ ] Aucune clé dans le dépôt (`git log -p | grep -i "sk-\|service_role"` vide) ; `.env*` ignorés.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` et `ANTHROPIC_API_KEY` définies uniquement côté serveur (Vercel, « Sensitive »).
- [ ] `NEXT_PUBLIC_SITE_URL` en `https://`.
- [ ] `AUTH_LOGIN_LIMIT_PER_IP` non défini (ou ≤ 30) en production.

**Supabase**
- [ ] Toutes les migrations appliquées ; la RLS est active sur toutes les tables (`select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity;` ne renvoie rien).
- [ ] Confirmation d'e-mail, changement d'adresse sécurisé, exigences de mot de passe, MFA TOTP activés ; URL de redirection restreintes au domaine.
- [ ] SMTP de production configuré (sinon limite de 2 e-mails/heure de Supabase).
- [ ] Seau `documents` privé.
- [ ] Sauvegardes et PITR activés ; tâche `retention_cleanup` planifiée.
- [ ] Un seul compte administrateur initial, avec MFA activée.

**Application**
- [ ] `npm run typecheck`, `npm test`, `npm run test:e2e` (préproduction) au vert.
- [ ] En-têtes vérifiés (`curl -sI`) ; note A sur securityheaders.com.
- [ ] Mentions légales et politique de confidentialité complétées (variables `LEGAL_*`).
- [ ] Sentry reçoit une erreur de test.
- [ ] `npm audit --omit=dev` sans vulnérabilité haute.

**Exploitation**
- [ ] Procédure de restauration testée.
- [ ] Rotation des clés planifiée ; liste des administrateurs revue.

## Signaler une vulnérabilité

Écrire à l'adresse `CONTACT_EMAIL` de l'éditeur. Ne pas tester sur la production avec des comptes réels d'étudiants.
