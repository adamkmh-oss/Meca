# STRUCTURA — architecture

## Pile technique

- **Next.js 16** (App Router, TypeScript), pages pré-rendues statiquement (`generateStaticParams`).
- **Tailwind CSS 4** ; composants d'interface au style shadcn/ui (`src/components/ui`), Radix Slot, class-variance-authority.
- **KaTeX** + react-markdown / remark-math pour les formules.
- **SVG** pour toutes les représentations mécaniques (pas de bibliothèque de graphiques : les diagrammes sont tracés à partir des stations du solveur).
- **Vitest** pour les tests.

## Organisation

```
src/
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
  app/                routes : /, /cours, /cours/[module], /cours/[module]/[chapitre], /cours/[module]/examen,
                      /simulateur, /exercices, /exercices/[id], /tableau-de-bord, /tuteur, /api/tuteur
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
| 6 | Comptes et progression partagée | à faire : Supabase Auth + PostgreSQL derrière `ProgressBackend`, classement facultatif |
| 7 | Tests, optimisation | en continu |

Pistes pour le simulateur : édition libre des nœuds et barres pour les portiques, charges sur portiques inclinés, tassements d'appui, combinaisons d'actions ELU / ELS.

## Tuteur IA

- Route `POST /api/tuteur` (Node) : valide la requête (zod), limite le débit par adresse, puis joue un tour avec `claude-opus-5-5` en streaming et renvoie un flux NDJSON (`text`, `tool`, `tool_result`, `done`, `error`). `GET /api/tuteur` indique si la clé est configurée.
- Prompt système = consignes + base documentaire (~66 000 caractères), mise en cache 1 h (`cache_control`) : seules les questions sont facturées au tarif plein après le premier appel.
- Historique en ajout seul : le serveur renvoie les messages produits (réflexion, appels et résultats d'outils compris), le navigateur les conserve tels quels et les renvoie au tour suivant. Le contexte de chaque tour (mode, page, profil) est un message `role: "system"` ajouté après la question.
- Fiabilité : outils obligatoires pour toute valeur numérique ; entrées d'outils validées ; `fallbacks: "default"` en cas de refus ; `prefix_mismatch_behavior: "drop_block"` si l'historique a été altéré.
- Production : la progression étant locale, la route est publique ; la limite de débit est indicative (mémoire d'instance). Avec les comptes (phase 6), réserver l'accès aux utilisateurs connectés.
