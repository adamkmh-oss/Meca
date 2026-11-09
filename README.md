# Meca

Deux projets dans ce dépôt :

- **`corrections/`** — corrigés PDF de Mécanique des Structures 3 (torseur de cohésion des portiques plans isostatiques), au format des corrigés de référence. Voir `corrections/S4/README.md`.
- **STRUCTURA** (racine) — plateforme web d'apprentissage de la mécanique des structures pour le BUT Génie Civil – Construction Durable.

## STRUCTURA

Plateforme interactive : cours, simulateur 2D, exercices corrigés à données variables, quiz, examens de module et suivi de progression.

### Démarrer

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # tests unitaires (moteur, générateurs, contenus)
npm run typecheck
npm run build      # build de production (pages statiques)
npm run build:artifact  # version page unique à publier sur claude.ai (artifact/dist/structura.html)
```

Accès en ligne : le site est publié en lien privé sur claude.ai (version page unique, voir [`artifact/README.md`](artifact/README.md)). Le tuteur y répond avec le compte Claude de la personne connectée : aucune clé d'API à fournir.

Déploiement : projet Next.js standard, déployable tel quel sur Vercel. Le tuteur IA nécessite la variable d'environnement `ANTHROPIC_API_KEY` (voir `.env.example`) ; sans elle, tout le reste du site fonctionne et le tuteur s'affiche « non configuré ».

### Ce qui fonctionne

| Fonction | Contenu |
|---|---|
| **Simulateur 2D** | Poutre éditable (appuis, rotules, charges ponctuelles inclinées, réparties trapézoïdales, couples, glisser-déposer), portique paramétré, treillis Pratt / Howe / Warren. Réactions, diagrammes N, T, M, déformée, contraintes, flèche, calculs détaillés (PFS pas à pas, équations par tronçon, contrôle d'équilibre). |
| **Cours** | 6 modules, 32 chapitres au programme dont 12 rédigés et interactifs : objectif, cours, formules expliquées variable par variable, schémas interactifs, exemple de génie civil, exercices, quiz. |
| **Exercices** | 18 générateurs à données variables (débutant → avancé), filtres par module, difficulté et type de calcul ; indices, détection des erreurs de signe et d'unité, correction en 6 étapes (données, schéma, équations, calculs, résultat, vérification) recoupée par le solveur. |
| **Évaluation** | Quiz par chapitre, examen final par module (tirage aléatoire, sans aide, validation à 70 %). |
| **Progression** | XP et niveaux, série quotidienne, objectif hebdomadaire, maîtrise par chapitre et par module, historique, badges, calendrier d'activité. Stockage local (navigateur). |
| **Tuteur IA** | Bulle de chat sur toutes les pages et page /tuteur. Base documentaire : tous les chapitres, le programme, la banque d'exercices, les conventions et corrigés de TD (S4, S6, fiche barre inclinée). Modes « expliquer », « indices seulement » (sans révéler la solution), « vérifier mon calcul ». Chaque valeur numérique passe par des outils branchés sur le moteur (poutre, portique, treillis, sections, calculatrice exacte). Niveau adapté à la progression de l'étudiant et à la page consultée. |
| **Interface** | Thème clair / sombre, responsive (mobile, tablette, ordinateur). |

### Fiabilité des calculs

- Moteur : méthode des déplacements (Euler–Bernoulli, élasticité linéaire), condensation des rotules, efforts internes exacts par équilibre de tronçon, déformée par intégration exacte (Gauss–Legendre sur polynômes par morceaux).
- **69 tests** : cas de référence analytiques (poutres isostatiques et hyperstatiques, Gerber, portique bi-articulé — formule de Kleinlogel —, treillis par la méthode de Ritter), cohérence calcul « à la main » / solveur, 3 600 exercices générés tous recoupés par le solveur, cohérence des contenus, outils et boucle du tuteur (client simulé, historique en ajout seul), version publiée (adresses, transport du tuteur par Claude intégré).
- Convention du cours : torseur de cohésion appliqué à la partie gauche, **dM/dx = −T**, M > 0 fibre inférieure tendue ; diagrammes reportés selon le y local.

Voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) pour l'organisation du code et la feuille de route.
