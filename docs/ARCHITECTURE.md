# STRUCTURA — architecture

## Vue d'ensemble

```
Navigateur ──HTTPS──▶ Next.js (Vercel)
                       ├─ proxy.ts : nonce CSP, rafraîchissement de session, redirections rapides
                       ├─ pages serveur : lecture via le client Supabase de l'utilisateur (RLS)
                       ├─ actions serveur / routes API : validation Zod, droits revérifiés (DAL)
                       │     └─ clé de service limitée à : notes corrigées par le serveur,
                       │        limitation de débit, suspension / suppression de comptes
                       └─ /api/tuteur ──▶ API Claude (clé côté serveur uniquement)
                    Supabase
                       ├─ Auth (GoTrue) : mots de passe hachés, e-mails, jetons, MFA TOTP
                       ├─ PostgREST + PostgreSQL : RLS sur toutes les tables, fonctions security definer
                       └─ Storage : seau privé « documents », URL signées 60 s
```

Choix structurants :

- **Le navigateur ne parle jamais directement à la base**, sauf pour déposer un fichier sur une URL signée à usage unique. Toutes les lectures et écritures passent par le serveur Next.js avec la session de l'utilisateur (cookies HttpOnly), et la base applique la RLS : un oubli de contrôle côté serveur reste bloqué par la base.
- **Défense en profondeur sur les droits** : permission vérifiée dans l'action (`actionUser`), dans la page (`requirePermission`) et dans la base (`has_permission` dans les politiques RLS et les fonctions). Le rôle n'est jamais lu dans les métadonnées fournies par l'utilisateur.
- **Correction côté serveur** : pour les exercices de la base, la fonction `submit_attempt` corrige à partir des clés stockées dans des tables illisibles par les étudiants ; pour le cursus intégré, le serveur régénère l'exercice avec la même graine et recorrige. Le navigateur n'envoie jamais de note.
- **Toutes les pages sont rendues à la demande** (nonce CSP par requête et contenu dépendant de la session). Les contenus et le moteur restent légers ; la base est indexée pour les requêtes par utilisateur.
- **Contenus mixtes** : le cursus intégré (code relu, interactif : schémas, simulateurs, générateurs) et les contenus de la base (rédigés depuis l'administration, avec cycle de publication). Une matière référence ses modules intégrés (`subjects.builtin_modules`) et ses chapitres en base.

## Pile technique

- **Next.js 16** (App Router, TypeScript), proxy (ex-middleware), actions serveur, `forbidden()` (authInterrupts).
- **Supabase** : `@supabase/ssr` (cookies HttpOnly, SameSite=Lax), `@supabase/supabase-js`. Migrations SQL versionnées dans `supabase/migrations`.
- **Tailwind CSS 4** ; composants d'interface au style shadcn/ui (`src/components/ui`), Radix Slot, class-variance-authority.
- **KaTeX** + react-markdown / remark-math pour les formules.
- **SVG** pour toutes les représentations mécaniques (pas de bibliothèque de graphiques : les diagrammes sont tracés à partir des stations du solveur).
- **Vitest** (unitaires, intégration contre la pile Supabase locale) et **Playwright** (bout en bout).

## Organisation

```
supabase/
  migrations/         schéma SQL, rôles et permissions, RLS, fonctions, stockage, conservation
  templates/          e-mails d'authentification (français)
  content/            contenu initial des matières (chargé par scripts/content-load.mjs)
  config.toml         réglages Auth pour le projet hébergé (CLI Supabase)
infra/local/          pile Supabase locale (docker compose) pour le développement et les tests
scripts/              stack.mjs (pile locale, migrations), content-load.mjs, admin-promote.mjs
tests/integration/    sécurité de la base via l'API réelle (RLS, rôles, stockage)
tests/e2e/            parcours complets dans Chromium
src/
  proxy.ts            nonce CSP, session, redirections des pages privées
  instrumentation.ts  remontée des erreurs serveur (Sentry facultatif)
  lib/
    auth/             DAL (getSession, requireUser, requirePermission, actionUser), permissions, validation
    supabase/         clients serveur (session utilisateur) et service (usage restreint)
    security/         en-têtes et CSP, limitation de débit, contrôle des fichiers, antivirus, origine des requêtes
    learning/         correction serveur du cursus intégré, statistiques, lecture des contenus
    email/, monitoring.ts, legal.ts, env.ts, env.server.ts
  lib/
    mechanics/        Moteur de calcul (aucune dépendance à React)
      solver.ts         méthode des déplacements, réactions, hyperstaticité, équilibre global
      member.ts         barre : efforts d'encastrement, efforts internes, déformée exacte, condensation des rotules
      beam.ts           modèle « poutre droite » du simulateur → structure, analyse le long de la poutre
      beam-equations.ts calcul « à la main » (PFS) et équations polynomiales N(x), T(x), M(x) par tronçon
      presets.ts        portique simple, treillis Pratt / Howe / Warren
      sections.ts       sections (rectangle, disque, tube, IPE) et matériaux
    exercises/        Générateurs d'exercices (données variables, correction en 6 étapes)
    progress/         Suivi de progression (XP, série, badges, maîtrise) — interface ProgressBackend
    tutor/            Tuteur IA
      knowledge/        base documentaire (chapitres, programme, exercices, corrigés de TD), texte déterministe
      prompt.ts         consignes du tuteur + contexte de tour (mode, page, profil)
      tools.ts          outils branchés sur le moteur (poutre, portique, treillis, section, calculatrice sans eval)
      run.ts            boucle streaming + outils, historique en ajout seul
      transport.ts      liaison interface ↔ tuteur (route /api/tuteur) ; remplacé dans la version publiée
  content/            Contenus pédagogiques (indépendants de l'interface)
    modules.ts          programme : 6 modules, chapitres, objectifs, niveaux
    chapters/*.ts       chapitres rédigés : blocs (texte, définition, formule, schéma interactif, exemple), quiz
  components/
    mechanics/        dessins SVG : schéma de poutre (glisser-déposer), diagrammes, portiques et treillis
    simulator/        simulateur (poutre, portique, treillis), saisie, résultats et calculs détaillés
    course/           rendu des chapitres, schémas interactifs, quiz, examen de module
    exercises/        banque, lecteur d'exercice, figures d'énoncé
    dashboard/        tableau de bord
    layout/, ui/, math/
  app/
    (auth)/           connexion, inscription, mot de passe oublié, vérification MFA, actions d'authentification
    auth/             confirmation des liens e-mail, déconnexion
    espace/           tableau de bord, historique, favoris, notifications
    compte/           profil, sécurité, données (export, suppression)
    matieres/         matières, leçons et fiches, exercices de la base
    cours/, simulateur/, exercices/, fiches/, ressources/, tuteur/   cursus intégré et outils
    admin/            vue d'ensemble, contenus, documents, signalements, utilisateurs, journal
    (legal)/          confidentialité, mentions légales, cookies
    api/              tuteur, export RGPD, documents (URL signées), temps d'étude
artifact/             Version page unique publiée sur claude.ai (mêmes pages et composants, build Vite)
```

## Conventions mécaniques

- Unités internes : m, kN, kN·m, kN/m ; E en kN/m², A en m², I en m⁴.
- Repère global X vers la droite, Y vers le haut, moments anti-horaires positifs.
- Repère local de barre : x de i vers j, y = x tourné de +90°.
- Efforts internes (convention du cours) : torseur de cohésion = action de la partie droite sur la partie gauche ; N > 0 en traction ; T = −Σ F_y(gauche) ; dM/dx = −T ; M > 0 tend la fibre côté −y (inférieure pour une poutre horizontale).
- Diagrammes reportés selon +y local pour les valeurs positives, signe ⊕/⊖ indiqué dans chaque zone.

## Feuille de route

| Phase | Objet | État |
|---|---|---|
| 1 | Design, navigation, tableau de bord | fait |
| 2 | Modules et cours | 12 chapitres sur 32 rédigés ; les autres sont listés avec leurs objectifs |
| 3 | Moteur de calcul et simulateur 2D | fait (poutre éditable ; portique et treillis paramétrés) |
| 4 | Exercices et générateurs | 18 générateurs ; à étendre avec les chapitres |
| 5 | Tuteur IA | fait : Claude Opus 5.5, base documentaire en cache, outils sur le moteur, modes explication / indices / vérification |
| 6 | Comptes, base de données, administration, RGPD | fait : Supabase (Auth, RLS, Storage), espace étudiant, espace enseignant / admin |
| 7 | Tests, sécurité, déploiement | fait : tests unitaires, d'intégration et de bout en bout ; voir docs/SECURITE.md et docs/DEPLOIEMENT.md |

Prochaines étapes : compléter les 20 chapitres du cursus intégré listés « en rédaction », enrichir les contenus des 7 matières en base, classement facultatif (avec consentement), import de la progression locale à la création du compte.

Pistes pour le simulateur : édition libre des nœuds et barres pour les portiques, charges sur portiques inclinés, tassements d'appui, combinaisons d'actions ELU / ELS.

## Tuteur IA

- Route `POST /api/tuteur` (Node) : valide la requête (zod), limite le débit par adresse, puis joue un tour avec `claude-opus-5-5` en streaming et renvoie un flux NDJSON (`text`, `tool`, `tool_result`, `done`, `error`). `GET /api/tuteur` indique si la clé est configurée.
- Prompt système = consignes + base documentaire (~66 000 caractères), mise en cache 1 h (`cache_control`) : seules les questions sont facturées au tarif plein après le premier appel.
- Historique en ajout seul : le serveur renvoie les messages produits (réflexion, appels et résultats d'outils compris), le navigateur les conserve tels quels et les renvoie au tour suivant. Le contexte de chaque tour (mode, page, profil) est un message `role: "system"` ajouté après la question.
- Fiabilité : outils obligatoires pour toute valeur numérique ; entrées d'outils validées ; `fallbacks: "default"` en cas de refus ; `prefix_mismatch_behavior: "drop_block"` si l'historique a été altéré.
- Accès réservé aux comptes connectés ayant la permission `ai.use` ; quotas par compte en base (`ai_begin` : 6 questions par minute, 80 par jour), compteurs d'usage sans contenu (`ai_usage`).
- RAG : outil `rechercher_ressources` (recherche plein texte française sur les leçons et exercices publiés, exécutée avec la session de l'étudiant, donc filtrée par la RLS). La consigne impose de distinguer valeurs vérifiées (outils), contenus validés (ressources citées) et explications de l'assistant.
- Données transmises au fournisseur : texte des questions, mode, page, indicateurs de progression ; jamais de nom, d'e-mail ni d'identifiant.

## Version publiée sur claude.ai

- `npm run build:artifact` produit `artifact/dist/structura.html` : une page autonome (JS, CSS et polices KaTeX inclus, polices Inter et JetBrains Mono chargées depuis Google Fonts).
- Les pages de `src/app` sont réutilisées sans copie : `artifact/router.tsx` les appelle comme des fonctions ; `next/link` et `next/navigation` sont remplacés par des équivalents à fragment d'URL (`#cours--rdm--fleche`), seule forme d'adresse transmise par le lecteur d'artefacts.
- Le tuteur passe par la capacité `sample` (Claude intégré à la page, compte de la personne qui consulte) : mêmes consignes, même base documentaire, mêmes outils exécutés dans la page. Pas de prompt système dans ce mode : consignes et documentation forment le premier tour, le contexte (mode, page, profil) ouvre la question.
- La progression reste dans le navigateur (localStorage) de chaque étudiant.
