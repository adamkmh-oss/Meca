# Meca

Deux projets dans ce dépôt :

- **STRUCTURA** (racine) : plateforme web d'apprentissage pour les étudiants du BUT Génie Civil – Construction Durable.
- **`corrections/`** : corrigés PDF de Mécanique des Structures (format des corrigés de référence). Voir `corrections/S4/README.md`.

## STRUCTURA

Cours structurés, simulateurs de mécanique des structures, exercices corrigés côté serveur, QCM, fiches de révision, bibliothèque de documents, suivi de progression individuel, tuteur IA, espace enseignant / administrateur. Comptes sécurisés (Supabase Auth, double authentification), droits par rôle vérifiés côté serveur et dans la base (RLS), conformité RGPD.

| | |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, composants façon shadcn/ui, Lucide, KaTeX |
| Backend | Actions serveur et routes Next.js, Supabase (PostgreSQL 15, Auth, Storage), validation Zod |
| IA | API Claude côté serveur uniquement, outils de calcul vérifiés + recherche dans les ressources publiées (RAG) |
| Qualité | Vitest (unitaires + intégration sur vraie pile Supabase), Playwright (bout en bout) |
| Exploitation | Vercel, Supabase hébergé, Resend (SMTP), Sentry (facultatif), ClamAV (facultatif) |

### Démarrer en local

Prérequis : Node 22, Docker, client `psql`.

```bash
npm install
npm run stack:up        # pile Supabase locale (Postgres, Auth, API, Storage, boîte mail de test)
npm run content:load    # contenu initial des matières + cours de l'enseignant (MS1–MS3)
npm run dev             # http://localhost:3000
```

`stack:up` génère des secrets aléatoires (`infra/local/.env`) et complète `.env.local`. Les e-mails (confirmation, réinitialisation) sont captés localement : http://localhost:54324/messages.

Premier administrateur : créez un compte sur le site, puis

```bash
npm run admin:promote -- vous@exemple.fr admin
```

### Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` / `build` / `start` | Développement, build et serveur de production |
| `npm run typecheck` | Vérification TypeScript |
| `npm run test:unit` | Tests unitaires (moteur de calcul, générateurs, correction serveur, sécurité, tuteur) |
| `npm run test:integration` | Tests de sécurité de la base à travers l'API Supabase réelle (RLS, rôles, stockage) |
| `npm run test:e2e` | Tests de bout en bout dans Chromium (pile locale + serveur Next) |
| `npm test` | Unitaires + intégration |
| `npm run stack:up` / `stack:down` / `stack:reset` | Pile Supabase locale |
| `npm run db:migrate` | Applique les migrations `supabase/migrations` |
| `npm run content:load` | Charge le contenu initial et les cours de l'enseignant (insère seulement ce qui manque, n'écrase jamais une modification) |
| `npm run admin:promote` | Donne un rôle à un compte existant (amorçage) |
| `npm run build:artifact` | Version page unique hors ligne (sans comptes), publiée sur claude.ai |

### Ce qui est livré

| Domaine | Contenu |
|---|---|
| Comptes | Inscription avec vérification d'e-mail, connexion, mot de passe oublié, double authentification TOTP, déconnexion de tous les appareils, protection contre la force brute |
| Espace étudiant | Tableau de bord (progression par matière, exercices réalisés, taux de réussite, temps d'apprentissage, série, points forts et notions à retravailler, reprise du dernier cours), historique détaillé des tentatives, favoris et fiches sauvegardées, notifications, profil et année d'étude |
| Matières | 10 matières ; mécanique des structures, RDM et statique avec cours interactifs (6 modules, 12 chapitres, quiz, examens, 18 générateurs d'exercices) ; un cours, une fiche et un exercice corrigé pour chacune des 7 autres, extensibles depuis l'administration |
| Cours de l'enseignant | Cours MS1 (notions de base, systèmes réticulés), MS2 (sections, notion de contrainte) et MS3 (flambement) reformulés en 5 chapitres : 9 leçons, 4 fiches, 6 exercices corrigés ; valeurs attendues recalculées par les tests ; écarts et conventions signalés dans les leçons et au tuteur |
| Exercices | QCM (choix unique ou multiple), réponses numériques avec tolérance, réponses libres avec réponse attendue, trois niveaux, corrigé en six parties ; correction calculée par la base, réponses jamais envoyées au navigateur avant la tentative ; refaire et consulter ses tentatives |
| Simulateur | Poutres, portiques, treillis : appuis, charges ponctuelles et réparties, réactions, diagrammes N, V, M, déformée, étapes de calcul (méthode des déplacements, vérifiée par tests) |
| Administration | Matières, chapitres, leçons et fiches (éditeur Markdown + LaTeX avec aperçu), exercices, questions, clés et corrigés ; brouillon / publication / archivage ; documents PDF et images (contrôle du format réel, URL signées) ; comptes, rôles, suspension, suppression ; signalements ; statistiques ; journal d'audit |
| Tuteur IA | Explications, indices sans solution, vérification d'un calcul, exercices adaptés ; valeurs calculées par le moteur ; recherche dans les ressources validées ; réservé aux comptes, quotas par compte |
| RGPD | Politique de confidentialité, mentions légales, cookies (strictement nécessaires), export JSON, suppression de compte, durées de conservation appliquées |

### Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) : organisation du code et choix techniques
- [`docs/BASE-DE-DONNEES.md`](docs/BASE-DE-DONNEES.md) : schéma, relations, règles d'accès (RLS), fonctions
- [`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md) : mise en production (Supabase, Vercel, domaine, e-mails, sauvegardes, maintenance)
- [`docs/SECURITE.md`](docs/SECURITE.md) : mesures, correspondance OWASP Top 10, checklist avant mise en production
- [`docs/RGPD.md`](docs/RGPD.md) : registre des traitements, durées de conservation, procédures
- [`artifact/README.md`](artifact/README.md) : version page unique hors ligne

### Cours de l'enseignant (MS1–MS3)

Source : `supabase/content/cours-enseignant.mjs` (reformulation des polycopiés de Y. Pouliquen, IUT di Corsica ; figures non reproduites). Points signalés dans les leçons et au tuteur :

- **MS1 ch. 2, coupure de Ritter** : le polycopié donne $F_5 = -F$ et $F_6 = (3+4\sqrt3)F/6$ ; sa propre équation $\Sigma F_y$ donne $F_5 = -F/\sqrt3$ et $F_6 = 5F/(2\sqrt3)$, confirmés par la méthode des nœuds et par le solveur (`src/lib/learning/__tests__/cours-enseignant.test.ts`). À faire confirmer par l'enseignant.
- **Vocabulaire** : dans MS1, « appui simple » = pivot (2 inconnues) ; la liaison à 1 inconnue est l'« appui simple glissant ».
- **Treillis** : MS1 compte l'effort positif en compression ; le simulateur prend N > 0 en traction.
- **MS3** : $\lambda_k = \pi\sqrt{210000/235} = 93{,}9$ (le polycopié indique ≅ 93).
- **Fichiers incomplets** : MS2 ch. 2 (pages 2 et 6 à 17 absentes de l'export) et MS2 ch. 3 (page de garde seule) ne sont repris que pour la partie disponible.

Une diffusion au-delà de la promotion suppose l'accord de l'auteur des polycopiés.

### Fiabilité des calculs

Moteur : méthode des déplacements (Euler–Bernoulli), condensation des rotules, efforts internes exacts par équilibre de tronçon, déformée par intégration exacte. Convention du cours : torseur de cohésion sur la partie gauche, dM/dx = −T, M > 0 fibre inférieure tendue. Cas de référence analytiques, 3 600 exercices générés recoupés par le solveur ; la correction côté serveur réutilise exactement les mêmes générateurs.
