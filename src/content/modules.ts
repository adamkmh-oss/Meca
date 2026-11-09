import type { ChapterMeta, ModuleMeta } from "./types";

type Ch = Omit<ChapterMeta, "moduleId" | "id"> & { id?: string };

function mod(m: Omit<ModuleMeta, "chapters">, chapters: Ch[]): ModuleMeta {
  return {
    ...m,
    chapters: chapters.map((c) => ({ ...c, id: c.id ?? `${m.id}-${c.slug}`, moduleId: m.id })),
  };
}

export const MODULES: ModuleMeta[] = [
  mod(
    {
      id: "m1",
      slug: "fondamentaux",
      number: 1,
      title: "Les fondamentaux",
      description: "Unités, forces, vecteurs, moments et principe fondamental de la statique : le socle de tout calcul de structure.",
      icon: "Compass",
    },
    [
      { slug: "unites", title: "Unités et conversions", summary: "kN, MPa, cm⁴ : passer d'une unité à l'autre sans erreur.", level: "debutant", minutes: 15, available: true, objectives: ["Utiliser les unités du génie civil (kN, kN/m, kN·m, MPa)", "Convertir sans erreur les longueurs, aires, moments quadratiques et contraintes", "Contrôler l'homogénéité d'une formule"] },
      { slug: "grandeurs", title: "Les grandeurs physiques", summary: "Masse, poids, force, pression : ne plus les confondre.", level: "debutant", minutes: 10, available: false, objectives: ["Distinguer masse et poids", "Passer d'un poids volumique à une charge linéique ou surfacique"] },
      { slug: "forces", title: "Les forces et leurs représentations", summary: "Point d'application, direction, sens, intensité.", level: "debutant", minutes: 15, available: false, objectives: ["Caractériser une force", "Représenter les actions sur un schéma mécanique"] },
      { slug: "vecteurs", title: "Les vecteurs", summary: "Projections, composantes et résultantes.", level: "debutant", minutes: 20, available: false, objectives: ["Projeter une force sur deux axes", "Composer des forces concourantes"] },
      { slug: "moment", title: "Le moment d'une force", summary: "Force × bras de levier : l'effet de rotation.", level: "debutant", minutes: 20, available: true, objectives: ["Calculer le moment d'une force par rapport à un point", "Identifier le bras de levier (distance perpendiculaire)", "Appliquer la convention de signe anti-horaire"] },
      { slug: "couples", title: "Les couples", summary: "Deux forces opposées, un moment pur.", level: "debutant", minutes: 10, available: false, objectives: ["Reconnaître un couple", "Calculer son moment"] },
      { slug: "torseurs", title: "Les torseurs", summary: "Résultante et moment : l'outil de modélisation des actions.", level: "intermediaire", minutes: 25, available: false, objectives: ["Écrire le torseur d'une action mécanique", "Changer le point de réduction"] },
      { slug: "equilibre", title: "Principe fondamental de la statique", summary: "ΣF = 0 et ΣM = 0 : les trois équations du plan.", level: "debutant", minutes: 25, available: true, objectives: ["Isoler un système et faire le bilan des actions", "Écrire les trois équations d'équilibre dans le plan", "Choisir le point de moment qui simplifie le calcul"] },
    ],
  ),
  mod(
    {
      id: "m2",
      slug: "reactions-appui",
      number: 2,
      title: "Les réactions d'appui",
      description: "Modéliser les liaisons, compter les inconnues, calculer les réactions des structures isostatiques.",
      icon: "Anchor",
    },
    [
      { slug: "liaisons", title: "Liaisons et degrés de liberté", summary: "Appui simple, articulation, encastrement — et le degré d'hyperstaticité.", level: "debutant", minutes: 20, available: true, objectives: ["Associer à chaque liaison ses inconnues", "Calculer le degré d'hyperstaticité d'une poutre ou d'un portique", "Distinguer structure hypostatique, isostatique et hyperstatique"] },
      { slug: "modelisation", title: "Modélisation des structures", summary: "Du bâtiment réel au schéma mécanique.", level: "debutant", minutes: 15, available: false, objectives: ["Passer d'un ouvrage réel à un modèle filaire", "Choisir les liaisons représentatives"] },
      { slug: "reactions", title: "Calcul des réactions d'appui", summary: "Isoler, écrire le PFS, résoudre, vérifier.", level: "debutant", minutes: 30, available: true, objectives: ["Calculer les réactions d'une poutre sur deux appuis", "Calculer les réactions d'une console", "Vérifier l'équilibre par une équation indépendante"] },
      { slug: "hyperstatiques", title: "Structures isostatiques et hyperstatiques", summary: "Quand la statique ne suffit plus.", level: "intermediaire", minutes: 20, available: false, objectives: ["Reconnaître une structure hyperstatique", "Comprendre le rôle des déformations"] },
    ],
  ),
  mod(
    {
      id: "m3",
      slug: "sollicitations",
      number: 3,
      title: "Les sollicitations internes",
      description: "Coupure, torseur de cohésion, équations de N, T, M et tracé des diagrammes.",
      icon: "Scissors",
    },
    [
      { slug: "torseur-cohesion", title: "Coupure et torseur de cohésion", summary: "N, T, M : ce qui passe à travers une section.", level: "intermediaire", minutes: 30, available: true, objectives: ["Définir N, T et M dans une section", "Appliquer la convention de signe du cours (dM/dx = −T)", "Isoler la partie gauche ou droite d'une coupure"] },
      { slug: "diagrammes", title: "Tracé des diagrammes N, T, M", summary: "Équations par tronçon et diagrammes.", level: "intermediaire", minutes: 35, available: true, objectives: ["Établir les équations N(x), T(x), M(x) par tronçon", "Tracer les diagrammes et repérer les valeurs remarquables", "Trouver le moment maximal là où T s'annule"] },
      { slug: "conventions", title: "Conventions de signes", summary: "Comparer les conventions rencontrées dans les livres.", level: "intermediaire", minutes: 10, available: false, objectives: ["Passer d'une convention à l'autre sans erreur"] },
    ],
  ),
  mod(
    {
      id: "m4",
      slug: "structures",
      number: 4,
      title: "Les structures",
      description: "Charges réparties, consoles, poutres continues, portiques et treillis.",
      icon: "Building2",
    },
    [
      { slug: "charges-reparties", title: "Charges réparties", summary: "Uniformes, triangulaires, trapézoïdales : résultante et position.", level: "debutant", minutes: 20, available: true, objectives: ["Calculer la résultante d'une charge répartie", "Placer cette résultante (centre de gravité du diagramme de charge)", "Passer d'une charge surfacique à une charge linéique"] },
      { slug: "treillis", title: "Treillis : méthode des nœuds", summary: "Barres bi-articulées, efforts de traction et de compression.", level: "intermediaire", minutes: 30, available: true, objectives: ["Vérifier qu'un treillis est isostatique (m + r = 2n)", "Calculer les efforts par la méthode des nœuds", "Interpréter traction et compression"] },
      { slug: "portiques", title: "Portiques", summary: "Poteaux, traverses et nœuds rigides.", level: "avance", minutes: 35, available: false, objectives: ["Écrire le torseur de cohésion barre par barre", "Contrôler l'équilibre des nœuds"] },
      { slug: "poutres-continues", title: "Poutres continues", summary: "Plusieurs travées, moments sur appuis.", level: "avance", minutes: 25, available: false, objectives: ["Lire les diagrammes d'une poutre continue"] },
    ],
  ),
  mod(
    {
      id: "m5",
      slug: "rdm",
      number: 5,
      title: "La résistance des matériaux",
      description: "Contraintes, déformations, loi de Hooke, moment quadratique et flèches.",
      icon: "Ruler",
    },
    [
      { slug: "traction", title: "Traction, compression et loi de Hooke", summary: "σ = N/A, ε = ΔL/L, σ = E·ε.", level: "debutant", minutes: 20, available: false, objectives: ["Calculer une contrainte normale en traction", "Utiliser la loi de Hooke"] },
      { slug: "moment-quadratique", title: "Moment quadratique", summary: "I = bh³/12 et le théorème de Huygens.", level: "intermediaire", minutes: 25, available: false, objectives: ["Calculer I pour des sections usuelles", "Appliquer le théorème de Huygens"] },
      { slug: "flexion", title: "Contraintes normales en flexion", summary: "Formule de Navier : σ = M·y/I.", level: "intermediaire", minutes: 30, available: true, objectives: ["Calculer la contrainte maximale en flexion simple", "Utiliser le module de flexion W = I/v", "Vérifier une section vis-à-vis d'une contrainte admissible"] },
      { slug: "cisaillement", title: "Cisaillement et contraintes tangentielles", summary: "τ moyen et répartition dans la section.", level: "intermediaire", minutes: 20, available: false, objectives: ["Calculer une contrainte de cisaillement moyenne"] },
      { slug: "torsion", title: "Torsion", summary: "Arbres circulaires et moment de torsion.", level: "avance", minutes: 20, available: false, objectives: ["Calculer la contrainte de torsion d'un arbre plein"] },
      { slug: "fleche", title: "Flèche des poutres", summary: "Déformée, formulaires et critère L/f.", level: "intermediaire", minutes: 30, available: true, objectives: ["Calculer la flèche des cas courants avec le formulaire", "Comprendre le rôle de E et de I", "Vérifier un critère de flèche L/300"] },
    ],
  ),
  mod(
    {
      id: "m6",
      slug: "approfondissement",
      number: 6,
      title: "Approfondissement",
      description: "Méthodes énergétiques, structures hyperstatiques, flambement et introduction aux Eurocodes.",
      icon: "Telescope",
    },
    [
      { slug: "flambement", title: "Flambement : formule d'Euler", summary: "Charge critique et longueur de flambement.", level: "avance", minutes: 30, available: true, objectives: ["Calculer la charge critique d'Euler", "Choisir la longueur de flambement selon les liaisons", "Calculer l'élancement d'un poteau"] },
      { slug: "methode-forces", title: "Méthode des forces", summary: "Lever l'hyperstaticité par une condition de déplacement.", level: "avance", minutes: 35, available: false, objectives: ["Résoudre une poutre hyperstatique de degré 1"] },
      { slug: "methode-deplacements", title: "Méthode des déplacements", summary: "La méthode utilisée par les logiciels de calcul.", level: "avance", minutes: 35, available: false, objectives: ["Comprendre la matrice de rigidité d'une barre"] },
      { slug: "travaux-virtuels", title: "Principe des travaux virtuels", summary: "Calculer un déplacement par l'énergie.", level: "avance", minutes: 30, available: false, objectives: ["Calculer une flèche par la méthode de la charge unité"] },
      { slug: "castigliano", title: "Théorème de Castigliano", summary: "Dériver l'énergie pour obtenir un déplacement.", level: "avance", minutes: 25, available: false, objectives: ["Appliquer le théorème de Castigliano à une poutre"] },
      { slug: "beton-acier", title: "Introduction au béton armé et à l'acier", summary: "Matériaux, comportement, principes de dimensionnement.", level: "avance", minutes: 25, available: false, objectives: ["Situer les vérifications ELU / ELS"] },
      { slug: "eurocodes", title: "Introduction aux Eurocodes", summary: "Combinaisons d'actions et coefficients partiels.", level: "avance", minutes: 25, available: false, objectives: ["Écrire une combinaison ELU fondamentale 1,35 G + 1,5 Q"] },
    ],
  ),
];

export function findModule(slug: string) {
  return MODULES.find((m) => m.slug === slug);
}

export function findChapter(moduleSlug: string, chapterSlug: string) {
  const m = findModule(moduleSlug);
  const c = m?.chapters.find((x) => x.slug === chapterSlug);
  return m && c ? { module: m, chapter: c } : undefined;
}

export function chapterById(id: string) {
  for (const m of MODULES) {
    const c = m.chapters.find((x) => x.id === id);
    if (c) return { module: m, chapter: c };
  }
  return undefined;
}

export const ALL_CHAPTERS = MODULES.flatMap((m) => m.chapters);
export const AVAILABLE_CHAPTERS = ALL_CHAPTERS.filter((c) => c.available);
