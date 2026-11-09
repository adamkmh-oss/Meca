import type { ChapterContent } from "../types";

export const m1Unites: ChapterContent = {
  id: "m1-unites",
  intro:
    "En calcul de structures, la plupart des erreurs ne viennent pas de la mécanique mais des **unités**. Ce chapitre fixe les unités du génie civil, les conversions qui piègent (aires, moments quadratiques, contraintes) et le réflexe qui sauve une copie : vérifier l'homogénéité d'une formule.",
  sections: [
    {
      title: "Les unités du calcul de structures",
      blocks: [
        {
          type: "md",
          md: "Le Système international (SI) utilise le mètre, le kilogramme et la seconde ; la force s'exprime en **newtons** (N). En génie civil, les ordres de grandeur conduisent à des multiples :\n\n| Grandeur | Unité courante | Équivalence |\n|---|---|---|\n| Force, réaction | kN | 1 kN = 1 000 N |\n| Charge linéique | kN/m | 1 kN/m = 1 N/mm |\n| Charge surfacique | kN/m² | 1 kN/m² = 1 kPa |\n| Moment | kN·m | 1 kN·m = 10⁶ N·mm |\n| Contrainte, module d'Young | MPa | 1 MPa = 1 N/mm² |\n| Aire | cm² ou mm² | 1 cm² = 100 mm² |\n| Moment quadratique | cm⁴ ou mm⁴ | 1 cm⁴ = 10⁴ mm⁴ |",
        },
        {
          type: "callout",
          tone: "info",
          title: "Deux couples d'unités cohérents",
          md: "Pour les **efforts** : kN, m, kN·m, kN/m. Pour les **contraintes et déformations** : N, mm, MPa (= N/mm²), mm⁴. Passer d'un système à l'autre au moment de calculer une contrainte évite la plupart des erreurs de puissances de 10.",
        },
      ],
    },
    {
      title: "Conversions qui piègent",
      blocks: [
        {
          type: "md",
          md: "Une unité élevée à une puissance entraîne son facteur : $1\\ \\text{cm} = 10\\ \\text{mm}$ donne $1\\ \\text{cm}^2 = 10^2\\ \\text{mm}^2$ et $1\\ \\text{cm}^4 = 10^4\\ \\text{mm}^4$. Le moment quadratique d'un IPE 300 vaut $I = 8\\,356\\ \\text{cm}^4 = 8{,}356\\times 10^7\\ \\text{mm}^4 = 8{,}356\\times 10^{-5}\\ \\text{m}^4$.",
        },
        {
          type: "formula",
          title: "Contrainte : du kN et des cm² au MPa",
          tex: "\\sigma\\,[\\text{MPa}] = \\frac{N\\,[\\text{kN}]\\times 10^3}{A\\,[\\text{cm}^2]\\times 10^2} = 10\\,\\frac{N\\,[\\text{kN}]}{A\\,[\\text{cm}^2]}",
          variables: [
            { symbol: "\\sigma", meaning: "contrainte normale", unit: "MPa = N/mm²" },
            { symbol: "N", meaning: "effort normal", unit: "kN" },
            { symbol: "A", meaning: "aire de la section", unit: "cm²" },
          ],
          note: "À retenir : 1 kN/cm² = 10 MPa.",
        },
        { type: "widget", widget: "unit-converter", caption: "Convertisseur : choisissez la grandeur, la valeur et les unités." },
      ],
    },
    {
      title: "Contrôler l'homogénéité",
      blocks: [
        {
          type: "md",
          md: "Une formule juste est **homogène** : ses deux membres ont la même unité. Exemple, la flèche d'une poutre sur deux appuis :\n\n$$f = \\frac{5\\,q\\,L^4}{384\\,E\\,I} \\quad\\Rightarrow\\quad \\frac{[\\text{N/mm}]\\,[\\text{mm}^4]}{[\\text{N/mm}^2]\\,[\\text{mm}^4]} = [\\text{mm}]$$\n\nSi l'unité obtenue n'est pas une longueur, la formule (ou la saisie) est fausse.",
        },
        {
          type: "example",
          title: "Charge d'un plancher sur une solive",
          context: "Un plancher de bureaux reçoit $g = 2{,}5$ kN/m² (poids propre) et $q = 2{,}5$ kN/m² (exploitation). Les solives sont espacées de 60 cm.",
          steps: [
            { title: "Charge surfacique totale", md: "$p = g + q = 5{,}0$ kN/m²." },
            { title: "Largeur reprise par une solive", md: "Chaque solive reprend une bande égale à l'entraxe : $e = 0{,}60$ m." },
            { title: "Charge linéique", md: "$q_{lin} = p\\cdot e = 5{,}0\\times 0{,}60 = 3{,}0$ kN/m, soit 3,0 N/mm." },
          ],
          result: "Chaque solive porte $3{,}0$ kN/m. Unités : [kN/m²]·[m] = [kN/m] ✓",
        },
      ],
    },
  ],
  keyPoints: [
    "Efforts en kN, longueurs en m ; contraintes en MPa = N/mm².",
    "1 cm² = 10² mm² et 1 cm⁴ = 10⁴ mm⁴ : l'exposant s'applique au facteur.",
    "1 kN/cm² = 10 MPa ; 1 kN/m = 1 N/mm ; 1 kN·m = 10⁶ N·mm.",
    "Vérifier l'homogénéité d'une formule avant de passer au calcul numérique.",
  ],
  quiz: [
    { id: "q1", prompt: "Combien vaut $1\\ \\text{cm}^4$ en $\\text{mm}^4$ ?", choices: ["$10$", "$10^2$", "$10^4$", "$10^{-4}$"], answer: 2, explanation: "$1\\ \\text{cm} = 10\\ \\text{mm}$ donc $1\\ \\text{cm}^4 = (10\\ \\text{mm})^4 = 10^4\\ \\text{mm}^4$." },
    { id: "q2", prompt: "Une contrainte de $1\\ \\text{kN/cm}^2$ vaut :", choices: ["1 MPa", "10 MPa", "100 MPa", "0,1 MPa"], answer: 1, explanation: "$1\\ \\text{kN/cm}^2 = 1000\\ \\text{N} / 100\\ \\text{mm}^2 = 10\\ \\text{N/mm}^2 = 10$ MPa." },
    { id: "q3", prompt: "Une charge linéique de $5$ kN/m vaut :", choices: ["0,5 N/mm", "5 N/mm", "50 N/mm", "5 000 N/mm"], answer: 1, explanation: "$5\\ \\text{kN/m} = 5000\\ \\text{N} / 1000\\ \\text{mm} = 5$ N/mm." },
    { id: "q4", prompt: "Quelle est l'unité de $\\dfrac{M}{W}$ avec $M$ en N·mm et $W$ en mm³ ?", choices: ["N", "N·mm", "MPa", "mm"], answer: 2, explanation: "$[\\text{N·mm}]/[\\text{mm}^3] = [\\text{N/mm}^2] = $ MPa : c'est une contrainte." },
    { id: "q5", prompt: "Un poids volumique de béton armé de 25 kN/m³ sur une dalle de 20 cm donne une charge surfacique de :", choices: ["0,5 kN/m²", "5 kN/m²", "50 kN/m²", "125 kN/m²"], answer: 1, explanation: "$25\\ \\text{kN/m}^3\\times 0{,}20\\ \\text{m} = 5\\ \\text{kN/m}^2$." },
  ],
  exercises: ["unites"],
};

export const m1Moment: ChapterContent = {
  id: "m1-moment",
  intro:
    "Une force ne fait pas que pousser : elle peut aussi **faire tourner**. Le moment d'une force mesure cette tendance à la rotation. C'est la notion qui permet d'écrire l'équilibre en rotation d'une structure — et donc de calculer les réactions d'appui.",
  sections: [
    {
      title: "Définition",
      blocks: [
        {
          type: "definition",
          term: "Moment d'une force par rapport à un point",
          md: "Le moment de $\\vec F$ par rapport au point O est le produit de l'intensité de la force par son **bras de levier** $d_\\perp$, distance perpendiculaire entre O et la ligne d'action de la force. Il est compté positivement dans le sens trigonométrique (anti-horaire).",
        },
        {
          type: "formula",
          tex: "M_{/O}(\\vec F) = \\pm\\,F\\cdot d_\\perp",
          variables: [
            { symbol: "F", meaning: "intensité de la force", unit: "kN" },
            { symbol: "d_\\perp", meaning: "bras de levier : distance de O à la ligne d'action, mesurée perpendiculairement à la force", unit: "m" },
            { symbol: "M_{/O}", meaning: "moment par rapport à O, positif dans le sens anti-horaire", unit: "kN·m" },
          ],
        },
        {
          type: "formula",
          title: "Avec les composantes (plus sûr pour les forces inclinées)",
          tex: "M_{/O}(\\vec F) = x_A\\,F_y - y_A\\,F_x",
          variables: [
            { symbol: "(x_A, y_A)", meaning: "coordonnées du point d'application A, mesurées depuis O", unit: "m" },
            { symbol: "F_x, F_y", meaning: "composantes de la force dans le repère (X, Y)", unit: "kN" },
          ],
          note: "Chaque composante a son propre bras de levier : la composante horizontale utilise une distance verticale, et réciproquement.",
        },
        { type: "widget", widget: "moment-lever", caption: "Faites varier la direction de la force : le moment est maximal quand elle est perpendiculaire à OA, nul quand sa ligne d'action passe par O." },
      ],
    },
    {
      title: "Le piège du bras de levier",
      blocks: [
        {
          type: "callout",
          tone: "warning",
          title: "Erreur classique",
          md: "Le bras de levier n'est **pas** la longueur de la barre ni la distance au point d'application : c'est la distance **perpendiculaire** à la force. Une force verticale a pour bras de levier une distance **horizontale** ; une force horizontale, une distance **verticale**.",
        },
        {
          type: "example",
          title: "Force inclinée en bout de console",
          context: "Un panneau de signalisation exerce en A, à 2 m de l'encastrement O, une force de 10 kN inclinée de 30° sous l'horizontale (vers la droite et vers le bas).",
          steps: [
            { title: "Composantes", md: "$F_x = 10\\cos 30° = 8{,}66$ kN ; $F_y = -10\\sin 30° = -5{,}00$ kN." },
            { title: "Moment", md: "$M_{/O} = x_A F_y - y_A F_x = 2\\times(-5{,}00) - 0\\times 8{,}66 = -10{,}0$ kN·m." },
            { title: "Lecture", md: "La composante horizontale passe par O (bras de levier nul) ; seule la verticale fait tourner, dans le sens horaire." },
          ],
          result: "$M_{/O} = -10{,}0$ kN·m (sens horaire) — et non $-20$ kN·m, qu'on obtiendrait en multipliant $F$ par la longueur de la console.",
        },
      ],
    },
  ],
  keyPoints: [
    "M = F × d⊥ : la distance est perpendiculaire à la force.",
    "Signe : anti-horaire positif (à préciser sur la copie).",
    "Une force dont la ligne d'action passe par le point a un moment nul.",
    "Pour une force inclinée, décomposer et utiliser M = x·Fy − y·Fx.",
  ],
  quiz: [
    { id: "q1", prompt: "Une force verticale de 20 kN agit à 3 m à droite d'un point O, vers le bas. Son moment par rapport à O vaut :", choices: ["+60 kN·m", "−60 kN·m", "+6,67 kN·m", "0"], answer: 1, explanation: "$M = x F_y = 3\\times(-20) = -60$ kN·m : sens horaire." },
    { id: "q2", prompt: "Le bras de levier d'une force horizontale appliquée à 4 m de hauteur au-dessus de O et à 2 m sur sa droite est :", choices: ["2 m", "4 m", "√20 m", "6 m"], answer: 1, explanation: "Pour une force horizontale, le bras de levier est la distance verticale : 4 m." },
    { id: "q3", prompt: "Le moment d'une force dont la ligne d'action passe par O est :", choices: ["maximal", "nul", "égal à F", "indéterminé"], answer: 1, explanation: "Le bras de levier est nul." },
    { id: "q4", prompt: "Pour une même force et un même point d'application, le moment est maximal quand la force est :", choices: ["parallèle à OA", "perpendiculaire à OA", "inclinée à 45°", "verticale"], answer: 1, explanation: "Alors $d_\\perp = OA$, sa valeur la plus grande." },
    { id: "q5", prompt: "Unité d'un moment dans les calculs de structures :", choices: ["kN/m", "kN·m", "kN/m²", "MPa"], answer: 1, explanation: "Force × longueur : kN·m (à ne pas confondre avec la charge linéique kN/m)." },
  ],
  exercises: ["moment-force"],
};

export const m1Equilibre: ChapterContent = {
  id: "m1-equilibre",
  intro:
    "Une structure de génie civil doit rester **immobile** : c'est la condition de base de son fonctionnement. Le principe fondamental de la statique (PFS) traduit cette immobilité en équations. Dans le plan, il en fournit exactement trois — c'est le nombre d'inconnues qu'on pourra déterminer.",
  sections: [
    {
      title: "Le principe fondamental de la statique",
      blocks: [
        {
          type: "definition",
          term: "PFS",
          md: "Un solide (ou un ensemble de solides) est en équilibre si la somme des forces extérieures qui lui sont appliquées est nulle et si la somme de leurs moments par rapport à **n'importe quel point** est nulle.",
        },
        {
          type: "formula",
          title: "Dans le plan (X, Y)",
          tex: "\\Sigma F_x = 0 \\qquad \\Sigma F_y = 0 \\qquad \\Sigma M_{/P} = 0",
          variables: [
            { symbol: "\\Sigma F_x,\\ \\Sigma F_y", meaning: "sommes des composantes horizontales et verticales des actions extérieures (charges et réactions)", unit: "kN" },
            { symbol: "\\Sigma M_{/P}", meaning: "somme des moments par rapport à un point P choisi librement", unit: "kN·m" },
          ],
          note: "Trois équations indépendantes au plus : on peut remplacer une équation de forces par une équation de moments en un autre point.",
        },
      ],
    },
    {
      title: "La méthode, pas à pas",
      blocks: [
        {
          type: "md",
          md: "1. **Isoler** le système : le dessiner seul, sans ses appuis.\n2. **Faire le bilan** des actions extérieures : charges connues et inconnues de liaison, dessinées dans le sens positif du repère.\n3. **Écrire** les trois équations, en choisissant le point des moments là où passent le plus d'inconnues.\n4. **Résoudre**, puis **vérifier** avec une équation non utilisée (moments en un autre point).",
        },
        { type: "widget", widget: "equilibrium-beam", caption: "Levier sur pivot : l'équation des moments en O donne F sans faire intervenir la réaction du pivot." },
        {
          type: "callout",
          tone: "success",
          title: "Le bon choix du point de moments",
          md: "Écrire les moments en un point où passent deux inconnues les élimine d'un coup : il ne reste qu'une inconnue, obtenue directement.",
        },
      ],
    },
    {
      title: "Exemple de génie civil",
      blocks: [
        {
          type: "example",
          title: "Linteau au-dessus d'une baie",
          context: "Un linteau de 3,0 m repose sur deux appuis (articulation en A, appui simple en B). Il porte la maçonnerie, modélisée par une charge uniforme de 12 kN/m, et une poutre secondaire qui lui transmet 18 kN à 1,0 m de A.",
          steps: [
            { title: "Bilan", md: "Résultante de la charge répartie : $12\\times 3 = 36$ kN en $x = 1{,}5$ m. Charge ponctuelle : 18 kN en $x = 1{,}0$ m. Inconnues : $H_A$, $V_A$, $V_B$." },
            { title: "Moments en A", md: "$V_B\\times 3 - 36\\times 1{,}5 - 18\\times 1{,}0 = 0 \\Rightarrow V_B = 24{,}0$ kN." },
            { title: "Forces verticales", md: "$V_A = 36 + 18 - 24 = 30{,}0$ kN ; $H_A = 0$ (aucune charge horizontale)." },
            { title: "Vérification", md: "Moments en B : $-30\\times 3 + 36\\times 1{,}5 + 18\\times 2 = -90 + 54 + 36 = 0$ ✓" },
          ],
          result: "$V_A = 30{,}0$ kN, $V_B = 24{,}0$ kN : l'appui A, plus proche de la charge ponctuelle, est le plus chargé.",
        },
      ],
    },
  ],
  keyPoints: [
    "Isoler, faire le bilan, écrire les 3 équations, résoudre, vérifier.",
    "Inconnues dessinées dans le sens positif : le signe du résultat donne le sens réel.",
    "Moments en un point qui élimine un maximum d'inconnues.",
    "Toujours vérifier avec une équation non utilisée.",
  ],
  quiz: [
    { id: "q1", prompt: "Combien d'équations d'équilibre indépendantes le PFS fournit-il pour un solide plan ?", choices: ["2", "3", "6", "autant que d'inconnues"], answer: 1, explanation: "Deux équations de forces et une de moments." },
    { id: "q2", prompt: "Pour calculer $V_B$ d'une poutre sur appuis en A et B, on écrit de préférence :", choices: ["ΣFy = 0", "ΣM/A = 0", "ΣM/B = 0", "ΣFx = 0"], answer: 1, explanation: "Les moments en A éliminent $H_A$ et $V_A$ : il ne reste que $V_B$." },
    { id: "q3", prompt: "On trouve une réaction négative. Cela signifie :", choices: ["une erreur de calcul", "que la réaction agit dans le sens opposé au sens dessiné", "que la structure est instable", "que l'appui est inutile"], answer: 1, explanation: "Les inconnues sont dessinées dans le sens positif par convention ; un résultat négatif indique le sens réel opposé." },
    { id: "q4", prompt: "Pourquoi vérifier avec les moments en un autre point ?", choices: ["pour trouver une 4e inconnue", "pour contrôler les calculs avec une équation indépendante", "c'est obligatoire pour les structures hyperstatiques", "pour obtenir H"], answer: 1, explanation: "Une équation non utilisée pour la résolution permet de détecter une erreur ; refaire les moments au même point serait circulaire." },
    { id: "q5", prompt: "Une charge répartie de 10 kN/m sur 4 m est remplacée, pour l'équation des moments, par :", choices: ["10 kN au milieu", "40 kN au milieu", "40 kN à une extrémité", "2,5 kN au milieu"], answer: 1, explanation: "Résultante $q\\,l = 40$ kN, appliquée au centre de gravité de la charge (le milieu pour une charge uniforme)." },
  ],
  exercises: ["pfs-levier", "reactions-ponctuelle"],
};
