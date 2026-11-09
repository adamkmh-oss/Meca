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
                      /simulateur, /exercices, /exercices/[id], /tableau-de-bord
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
| 5 | Tuteur IA | à faire : route serveur Claude, outils branchés sur le moteur pour ne présenter que des résultats calculés |
| 6 | Comptes et progression partagée | à faire : Supabase Auth + PostgreSQL derrière `ProgressBackend`, classement facultatif |
| 7 | Tests, optimisation | en continu |

Pistes pour le simulateur : édition libre des nœuds et barres pour les portiques, charges sur portiques inclinés, tassements d'appui, combinaisons d'actions ELU / ELS.
