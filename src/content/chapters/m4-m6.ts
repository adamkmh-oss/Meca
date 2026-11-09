import type { ChapterContent } from "../types";

export const m4Charges: ChapterContent = {
  id: "m4-charges-reparties",
  intro:
    "Dans un bâtiment, presque toutes les charges sont **réparties** : poids propre des dalles, revêtements, cloisons, neige, exploitation. Savoir passer d'une charge surfacique à une charge linéique, puis à une résultante correctement placée, est le préalable à tout calcul de poutre.",
  sections: [
    {
      title: "Des charges surfaciques aux charges linéiques",
      blocks: [
        {
          type: "md",
          md: "Une dalle reçoit des charges **surfaciques** $p$ (kN/m²). Elles descendent dans les poutres ou solives qui la portent, chacune reprenant une **bande de chargement** de largeur égale à son entraxe $e$ (ou à la moitié de chaque portée de dalle adjacente) :\n\n$$q = p\\cdot e \\quad [\\text{kN/m}]$$\n\nLe poids propre d'une poutre s'ajoute : $q_{pp} = \\gamma\\cdot A$, avec $\\gamma = 25$ kN/m³ pour le béton armé et $A$ l'aire de la section.",
        },
      ],
    },
    {
      title: "Résultante et position",
      blocks: [
        {
          type: "definition",
          term: "Résultante d'une charge répartie",
          md: "Force unique équivalente à la charge répartie **pour l'équilibre global** : son intensité est l'aire du diagramme de charge et elle passe par le centre de gravité de ce diagramme. On l'utilise pour écrire les équations de moments — jamais pour calculer les efforts internes à l'intérieur de la zone chargée.",
        },
        {
          type: "formula",
          title: "Charge uniforme q sur une longueur l",
          tex: "R = q\\,l \\qquad x_G = \\frac{l}{2}",
          variables: [
            { symbol: "q", meaning: "intensité de la charge", unit: "kN/m" },
            { symbol: "l", meaning: "longueur chargée", unit: "m" },
          ],
        },
        {
          type: "formula",
          title: "Charge triangulaire (0 → q)",
          tex: "R = \\frac{q\\,l}{2} \\qquad x_G = \\frac{2\\,l}{3}\\ \\text{(depuis le côté nul)}",
          variables: [{ symbol: "q", meaning: "intensité maximale", unit: "kN/m" }],
        },
        {
          type: "formula",
          title: "Charge trapézoïdale (q₁ → q₂)",
          tex: "R = \\frac{(q_1 + q_2)\\,l}{2} \\qquad x_G = \\frac{l\\,(q_1 + 2\\,q_2)}{3\\,(q_1 + q_2)}",
          variables: [
            { symbol: "q_1,\\ q_2", meaning: "intensités aux extrémités gauche et droite", unit: "kN/m" },
            { symbol: "x_G", meaning: "position de la résultante depuis l'extrémité gauche", unit: "m" },
          ],
        },
        { type: "widget", widget: "distributed-load", caption: "La résultante (grise, en pointillés, entre parenthèses) se décale vers le côté le plus chargé." },
        {
          type: "callout",
          tone: "info",
          title: "Convention des schémas",
          md: "Sur les schémas d'isolement, la résultante est dessinée **en gris, en pointillés et entre parenthèses** : ce n'est pas une charge supplémentaire, seulement la position qui donne le bras de levier.",
        },
      ],
    },
    {
      title: "Exemple",
      blocks: [
        {
          type: "example",
          title: "Poutre de rive d'un plancher",
          context: "Dalle de 20 cm ($\\gamma = 25$ kN/m³) + revêtement 1,0 kN/m² + exploitation 2,5 kN/m². La poutre reprend une bande de 2,5 m. Section de la poutre : 25 × 50 cm.",
          steps: [
            { title: "Charges surfaciques", md: "Dalle : $25\\times 0{,}20 = 5{,}0$ kN/m² ; total $p = 5{,}0 + 1{,}0 + 2{,}5 = 8{,}5$ kN/m²." },
            { title: "Charge linéique de la dalle", md: "$q_1 = 8{,}5\\times 2{,}5 = 21{,}25$ kN/m." },
            { title: "Poids propre de la poutre", md: "$q_2 = 25\\times 0{,}25\\times 0{,}50 = 3{,}13$ kN/m (en toute rigueur, retrancher la partie commune avec la dalle)." },
          ],
          result: "$q \\approx 24{,}4$ kN/m (valeur caractéristique, avant pondération ELU).",
        },
      ],
    },
  ],
  keyPoints: [
    "q = p × largeur de reprise ; poids propre = γ × A.",
    "Résultante = aire du diagramme de charge, au centre de gravité.",
    "Triangle : R = ql/2 à 2l/3 du côté nul.",
    "La résultante sert aux équations globales, pas aux efforts internes dans la zone chargée.",
  ],
  quiz: [
    { id: "q1", prompt: "Une charge triangulaire de 0 à 12 kN/m sur 6 m a pour résultante :", choices: ["72 kN", "36 kN", "24 kN", "12 kN"], answer: 1, explanation: "$R = q\\,l/2 = 12\\times 6/2 = 36$ kN." },
    { id: "q2", prompt: "Cette résultante est placée à :", choices: ["3 m du côté nul", "2 m du côté nul", "4 m du côté nul", "6 m"], answer: 2, explanation: "$2l/3 = 4$ m depuis l'extrémité où la charge est nulle." },
    { id: "q3", prompt: "Une dalle de 18 cm en béton armé pèse :", choices: ["1,8 kN/m²", "4,5 kN/m²", "18 kN/m²", "25 kN/m²"], answer: 1, explanation: "$25\\times 0{,}18 = 4{,}5$ kN/m²." },
    { id: "q4", prompt: "Des solives espacées de 50 cm sous 4 kN/m² portent chacune :", choices: ["2 kN/m", "4 kN/m", "8 kN/m", "0,5 kN/m"], answer: 0, explanation: "$q = p\\,e = 4\\times 0{,}5 = 2$ kN/m." },
    { id: "q5", prompt: "Pour calculer M(x) au milieu d'une zone chargée, on peut utiliser la résultante de toute la charge :", choices: ["oui, toujours", "non : seule la charge située du côté isolé compte", "seulement si la charge est uniforme", "seulement pour les consoles"], answer: 1, explanation: "On utilise la résultante de la portion de charge qui se trouve sur la partie isolée." },
  ],
  exercises: ["resultante-repartie", "reactions-mixte"],
};

export const m4Treillis: ChapterContent = {
  id: "m4-treillis",
  intro:
    "Fermes de toiture, poutres de ponts, pylônes : les treillis assemblent des barres pour porter de grandes portées avec peu de matière. Modélisées comme **bi-articulées** et chargées uniquement aux nœuds, leurs barres ne travaillent qu'en **traction ou compression**.",
  sections: [
    {
      title: "Hypothèses et isostaticité",
      blocks: [
        {
          type: "md",
          md: "- Les barres sont **rectilignes** et reliées par des **articulations** parfaites.\n- Les charges sont appliquées **aux nœuds**.\n- Conséquence : chaque barre est en équilibre sous deux forces opposées, alignées avec son axe → seul l'effort normal $N$ existe ($T = M = 0$).",
        },
        {
          type: "formula",
          title: "Condition d'isostaticité d'un treillis plan",
          tex: "m + r = 2\\,n",
          variables: [
            { symbol: "m", meaning: "nombre de barres", unit: "—" },
            { symbol: "r", meaning: "nombre d'inconnues de liaison extérieures", unit: "—" },
            { symbol: "n", meaning: "nombre de nœuds (2 équations d'équilibre par nœud)", unit: "—" },
          ],
          note: "Si $m + r > 2n$ : hyperstatique ; si $m + r < 2n$ : mécanisme. La condition est nécessaire mais pas suffisante : le treillis doit être triangulé.",
        },
      ],
    },
    {
      title: "Méthode des nœuds",
      blocks: [
        {
          type: "md",
          md: "1. Calculer les **réactions** (PFS global).\n2. Choisir un nœud où arrivent **au plus deux barres inconnues**.\n3. Dessiner les efforts des barres **sortant du nœud** (hypothèse de traction).\n4. Écrire $\\Sigma F_x = 0$ et $\\Sigma F_y = 0$ au nœud, en projetant chaque barre avec son angle.\n5. Passer au nœud suivant. Un résultat négatif signifie **compression**.",
        },
        { type: "widget", widget: "truss-explorer", caption: "Ferme triangulaire : bleu = traction, rouge = compression. Faites varier la hauteur." },
        {
          type: "callout",
          tone: "warning",
          title: "Barres à effort nul",
          md: "À un nœud non chargé où arrivent deux barres non alignées, les deux sont à effort nul. À un nœud non chargé à trois barres dont deux alignées, la troisième est à effort nul. Ces barres restent utiles : elles réduisent la longueur de flambement des barres comprimées.",
        },
      ],
    },
    {
      title: "Exemple",
      blocks: [
        {
          type: "example",
          title: "Ferme de charpente symétrique",
          context: "Ferme triangulaire de portée 6 m et de hauteur 2 m (faîtage au milieu), charge de 30 kN au faîtage C. A est une articulation, B un appui simple.",
          steps: [
            { title: "Réactions", md: "Par symétrie : $V_A = V_B = 15$ kN." },
            { title: "Géométrie", md: "$AC = \\sqrt{3^2 + 2^2} = 3{,}606$ m ; $\\sin\\theta = 2/3{,}606 = 0{,}555$, $\\cos\\theta = 3/3{,}606 = 0{,}832$." },
            { title: "Nœud A", md: "$\\Sigma F_y = 0 : 15 + N_{AC}\\sin\\theta = 0 \\Rightarrow N_{AC} = -27{,}04$ kN\n\n$\\Sigma F_x = 0 : N_{AB} + N_{AC}\\cos\\theta = 0 \\Rightarrow N_{AB} = +22{,}5$ kN" },
          ],
          result: "Les arbalétriers sont comprimés ($-27{,}0$ kN), l'entrait est tendu ($+22{,}5$ kN) : c'est lui qui empêche les murs d'être poussés vers l'extérieur.",
        },
      ],
    },
  ],
  keyPoints: [
    "Barres bi-articulées chargées aux nœuds : N seul.",
    "Isostatique si m + r = 2n (et triangulé).",
    "Nœud par nœud, au plus deux inconnues ; barres dessinées en traction.",
    "N < 0 : compression → attention au flambement.",
  ],
  quiz: [
    { id: "q1", prompt: "Un treillis de 9 barres, 6 nœuds, sur une articulation et un appui simple est :", choices: ["isostatique", "hyperstatique de degré 1", "un mécanisme", "indéterminé"], answer: 0, explanation: "$m + r = 9 + 3 = 12 = 2n = 12$." },
    { id: "q2", prompt: "Dans une barre de treillis idéal, le moment fléchissant est :", choices: ["maximal au milieu", "nul", "égal à N × L", "constant non nul"], answer: 1, explanation: "Barre bi-articulée sans charge entre ses nœuds : $T = M = 0$." },
    { id: "q3", prompt: "Un effort normal négatif signifie :", choices: ["traction", "compression", "barre à effort nul", "erreur"], answer: 1, explanation: "Convention : N > 0 en traction." },
    { id: "q4", prompt: "Pour une ferme triangulaire plus plate (h diminue), les efforts dans les barres :", choices: ["diminuent", "augmentent", "ne changent pas", "s'annulent"], answer: 1, explanation: "$N = V/\\sin\\theta$ : quand l'angle diminue, l'effort augmente." },
    { id: "q5", prompt: "Pourquoi garder une barre à effort nul ?", choices: ["pour l'esthétique", "elle stabilise les barres comprimées et sert pour d'autres cas de charge", "elle est toujours utile en traction", "elle ne sert à rien"], answer: 1, explanation: "Elle réduit les longueurs de flambement et peut travailler sous un autre chargement." },
  ],
  exercises: ["treillis-noeuds"],
};

export const m5Flexion: ChapterContent = {
  id: "m5-flexion",
  intro:
    "Le moment fléchissant courbe la poutre : les fibres d'un côté s'allongent, celles de l'autre se raccourcissent. Ce chapitre relie le moment $M$ aux **contraintes** dans la section, pour vérifier qu'un matériau résiste — et comprendre pourquoi une poutre est plus haute que large.",
  sections: [
    {
      title: "Formule de Navier",
      blocks: [
        {
          type: "md",
          md: "Hypothèses de la flexion simple (Navier–Bernoulli) : les sections planes restent planes, le matériau est élastique linéaire (loi de Hooke). La déformation, donc la contrainte, varie **linéairement** dans la hauteur ; elle est nulle sur l'**axe neutre**, qui passe par le centre de gravité de la section.",
        },
        {
          type: "formula",
          title: "Contrainte normale en flexion simple",
          tex: "\\sigma(y) = -\\frac{M\\,y}{I}",
          variables: [
            { symbol: "\\sigma(y)", meaning: "contrainte normale à la distance y de l'axe neutre (traction > 0)", unit: "MPa" },
            { symbol: "M", meaning: "moment fléchissant dans la section (M > 0 : fibre inférieure tendue)", unit: "N·mm" },
            { symbol: "y", meaning: "ordonnée de la fibre, comptée vers le haut depuis l'axe neutre", unit: "mm" },
            { symbol: "I", meaning: "moment quadratique de la section par rapport à l'axe neutre", unit: "mm⁴" },
          ],
          note: "Avec M > 0, la fibre inférieure (y < 0) est tendue. En valeur absolue sur les fibres extrêmes : $|\\sigma|_{max} = |M|\\,v/I = |M|/W$.",
        },
        {
          type: "formula",
          title: "Module de flexion élastique",
          tex: "W = \\frac{I}{v} \\qquad \\text{rectangle : } I = \\frac{b\\,h^3}{12},\\ W = \\frac{b\\,h^2}{6}",
          variables: [
            { symbol: "v", meaning: "distance de l'axe neutre à la fibre la plus éloignée", unit: "mm" },
            { symbol: "b,\\ h", meaning: "largeur et hauteur de la section rectangulaire", unit: "mm" },
          ],
          note: "Doubler la hauteur multiplie W par 4 et I par 8 : la hauteur est le paramètre efficace.",
        },
        { type: "widget", widget: "section-stress", caption: "Contraintes dans une section rectangulaire sous M et N : la répartition est linéaire, nulle sur l'axe neutre en flexion pure." },
      ],
    },
    {
      title: "Vérification d'une section",
      blocks: [
        {
          type: "md",
          md: "On compare la contrainte maximale à une contrainte limite : $\\sigma_{max} = \\dfrac{M_{max}}{W} \\le f$. Les règlements (Eurocodes) appliquent des coefficients partiels aux charges et aux matériaux ; ici on s'en tient au principe.",
        },
        {
          type: "example",
          title: "Solive de plancher en bois",
          context: "Solive C24 de 7,5 × 22,5 cm, portée 4,0 m sur appuis simples, $q = 2{,}0$ kN/m.",
          steps: [
            { title: "Moment maximal", md: "$M = qL^2/8 = 2\\times 16/8 = 4{,}0$ kN·m $= 4{,}0\\times 10^6$ N·mm." },
            { title: "Module de flexion", md: "$W = bh^2/6 = 75\\times 225^2/6 = 632\\,813$ mm³." },
            { title: "Contrainte", md: "$\\sigma = M/W = 4{,}0\\times 10^6 / 632\\,813 = 6{,}32$ MPa." },
          ],
          result: "$\\sigma_{max} = 6{,}3$ MPa, à comparer à $f_{m,k} = 24$ MPa pour du C24 (avant coefficients réglementaires) : la solive est largement suffisante en flexion — c'est souvent la flèche qui dimensionne le bois.",
        },
      ],
    },
  ],
  keyPoints: [
    "σ varie linéairement dans la hauteur, nulle sur l'axe neutre.",
    "|σ|max = |M|/W avec W = I/v ; rectangle : W = bh²/6.",
    "M > 0 : fibre inférieure tendue, fibre supérieure comprimée.",
    "Unités : N·mm, mm³ → MPa.",
  ],
  quiz: [
    { id: "q1", prompt: "Où la contrainte normale de flexion est-elle nulle ?", choices: ["sur la fibre supérieure", "sur l'axe neutre", "aux appuis", "nulle part"], answer: 1, explanation: "La répartition est linéaire et s'annule sur l'axe neutre (centre de gravité de la section)." },
    { id: "q2", prompt: "Module de flexion d'un rectangle 10 × 20 cm (h = 20) :", choices: ["333 cm³", "667 cm³", "6 667 cm³", "200 cm³"], answer: 1, explanation: "$W = bh^2/6 = 10\\times 400/6 = 667$ cm³." },
    { id: "q3", prompt: "On double la hauteur d'une poutre rectangulaire. W est multiplié par :", choices: ["2", "4", "8", "16"], answer: 1, explanation: "$W \\propto h^2$." },
    { id: "q4", prompt: "M = 20 kN·m et W = 500 cm³. σmax vaut :", choices: ["4 MPa", "40 MPa", "400 MPa", "0,04 MPa"], answer: 1, explanation: "$20\\times 10^6\\ \\text{N·mm} / 500\\times 10^3\\ \\text{mm}^3 = 40$ MPa." },
    { id: "q5", prompt: "Sous un moment négatif (console), la fibre tendue est :", choices: ["inférieure", "supérieure", "l'axe neutre", "aucune"], answer: 1, explanation: "Le signe du moment indique la fibre tendue : négatif → fibre supérieure." },
  ],
  exercises: ["flexion-contrainte", "traction-tirant"],
};

export const m5Fleche: ChapterContent = {
  id: "m5-fleche",
  intro:
    "Une poutre peut résister sans se rompre et pourtant être inacceptable : si elle fléchit trop, les cloisons fissurent, les revêtements se décollent, le plancher vibre. La **flèche** est vérifiée aux états limites de service, souvent avec des critères du type $L/300$.",
  sections: [
    {
      title: "Équation de la déformée",
      blocks: [
        {
          type: "formula",
          title: "Équation différentielle de la ligne élastique",
          tex: "E\\,I\\,v''(x) = M(x)",
          variables: [
            { symbol: "v(x)", meaning: "déplacement vertical de la ligne moyenne (positif vers le haut)", unit: "m" },
            { symbol: "E", meaning: "module d'Young du matériau", unit: "MPa" },
            { symbol: "I", meaning: "moment quadratique de la section", unit: "mm⁴" },
            { symbol: "M(x)", meaning: "moment fléchissant (M > 0 : fibre inférieure tendue)", unit: "N·mm" },
          ],
          note: "Deux intégrations successives donnent la rotation $v'$ puis la flèche $v$ ; les constantes viennent des conditions aux appuis (v = 0 sur un appui, v' = 0 à un encastrement).",
        },
      ],
    },
    {
      title: "Formulaire",
      blocks: [
        {
          type: "md",
          md: "| Cas | Flèche maximale |\n|---|---|\n| Deux appuis, charge uniforme $q$ | $f = \\dfrac{5\\,q\\,L^4}{384\\,EI}$ (à mi-portée) |\n| Deux appuis, charge $P$ au milieu | $f = \\dfrac{P\\,L^3}{48\\,EI}$ |\n| Console, charge $P$ en bout | $f = \\dfrac{P\\,L^3}{3\\,EI}$ |\n| Console, charge uniforme $q$ | $f = \\dfrac{q\\,L^4}{8\\,EI}$ |\n| Encastrée–encastrée, charge uniforme | $f = \\dfrac{q\\,L^4}{384\\,EI}$ |",
        },
        { type: "widget", widget: "deflection-beam", caption: "Comparez la formule du formulaire et le calcul du simulateur : ils coïncident." },
        {
          type: "callout",
          tone: "warning",
          title: "Unités cohérentes",
          md: "Travaillez en N, mm et MPa : $q$ en N/mm (= kN/m), $L$ en mm, $E$ en MPa, $I$ en mm⁴ → $f$ en mm. Oublier la puissance 4 de $L$ ou les 10⁴ entre cm⁴ et mm⁴ est l'erreur la plus fréquente.",
        },
      ],
    },
    {
      title: "Exemple",
      blocks: [
        {
          type: "example",
          title: "Poutre métallique de plancher",
          context: "IPE 240 ($I = 3\\,892$ cm⁴), portée 6 m sur appuis simples, charge de service $q = 10$ kN/m, $E = 210\\,000$ MPa.",
          steps: [
            { title: "Données en N et mm", md: "$q = 10$ N/mm ; $L = 6000$ mm ; $I = 3{,}892\\times 10^7$ mm⁴." },
            { title: "Flèche", md: "$f = \\dfrac{5\\times 10\\times 6000^4}{384\\times 210\\,000\\times 3{,}892\\times 10^7} = 20{,}6$ mm." },
            { title: "Critère", md: "$L/300 = 20{,}0$ mm." },
          ],
          result: "$f = 20{,}6$ mm $> 20{,}0$ mm : légèrement non vérifié. Un IPE 270 ($I = 5\\,790$ cm⁴) donne 13,9 mm ✓",
        },
      ],
    },
  ],
  keyPoints: [
    "EI·v'' = M : la flèche dépend de la rigidité EI.",
    "Deux appuis + q : f = 5qL⁴/384EI ; console + P : f = PL³/3EI.",
    "f ∝ L⁴ (charge répartie) : la portée domine.",
    "Critère de service usuel : f ≤ L/300 (ou L/500 sous cloisons fragiles).",
  ],
  quiz: [
    { id: "q1", prompt: "Si la portée d'une poutre sous charge uniforme double, la flèche est multipliée par :", choices: ["2", "4", "8", "16"], answer: 3, explanation: "$f \\propto L^4 = 2^4 = 16$." },
    { id: "q2", prompt: "À portée et charge égales, quelle poutre fléchit le moins ?", choices: ["sur deux appuis", "console", "encastrée aux deux extrémités", "toutes pareilles"], answer: 2, explanation: "$qL^4/384EI$ contre $5qL^4/384EI$ et $qL^4/8EI$." },
    { id: "q3", prompt: "Un acier de module 210 GPa et un aluminium de 70 GPa, même section : l'aluminium fléchit :", choices: ["3 fois moins", "autant", "3 fois plus", "9 fois plus"], answer: 2, explanation: "$f \\propto 1/E$." },
    { id: "q4", prompt: "Flèche admissible L/300 pour une portée de 4,5 m :", choices: ["1,5 mm", "15 mm", "30 mm", "4,5 mm"], answer: 1, explanation: "$4500/300 = 15$ mm." },
    { id: "q5", prompt: "Dans EI·v'' = M, une condition aux limites d'un encastrement est :", choices: ["v = 0 seulement", "v' = 0 seulement", "v = 0 et v' = 0", "M = 0"], answer: 2, explanation: "Un encastrement bloque le déplacement et la rotation." },
  ],
  exercises: ["fleche-uniforme"],
};

export const m6Flambement: ChapterContent = {
  id: "m6-flambement",
  intro:
    "Une barre comprimée peut céder bien avant que sa contrainte n'atteigne la résistance du matériau : au-delà d'une **charge critique**, elle se dérobe latéralement. C'est le **flambement**, phénomène d'instabilité qui gouverne le dimensionnement des poteaux élancés et des barres comprimées des treillis.",
  sections: [
    {
      title: "Charge critique d'Euler",
      blocks: [
        {
          type: "formula",
          title: "Formule d'Euler",
          tex: "N_{cr} = \\frac{\\pi^2\\,E\\,I_{min}}{L_f^2}",
          variables: [
            { symbol: "N_{cr}", meaning: "charge critique de flambement élastique", unit: "N" },
            { symbol: "E", meaning: "module d'Young", unit: "MPa" },
            { symbol: "I_{min}", meaning: "plus petit moment quadratique de la section", unit: "mm⁴" },
            { symbol: "L_f", meaning: "longueur de flambement", unit: "mm" },
          ],
          note: "Le poteau flambe autour de l'axe de plus faible inertie : pour un rectangle $b < h$, $I_{min} = h\\,b^3/12$.",
        },
        {
          type: "formula",
          title: "Longueur de flambement",
          tex: "L_f = K\\cdot L",
          variables: [
            { symbol: "K = 1", meaning: "articulé – articulé (cas de référence)", unit: "" },
            { symbol: "K = 2", meaning: "encastré en pied, libre en tête", unit: "" },
            { symbol: "K = 0{,}7", meaning: "encastré – articulé", unit: "" },
            { symbol: "K = 0{,}5", meaning: "encastré – encastré", unit: "" },
          ],
        },
        { type: "widget", widget: "euler-buckling", caption: "La charge critique chute avec le carré de la longueur de flambement." },
      ],
    },
    {
      title: "Élancement",
      blocks: [
        {
          type: "formula",
          tex: "\\lambda = \\frac{L_f}{i} \\qquad i = \\sqrt{\\frac{I_{min}}{A}} \\qquad \\sigma_{cr} = \\frac{N_{cr}}{A} = \\frac{\\pi^2 E}{\\lambda^2}",
          variables: [
            { symbol: "\\lambda", meaning: "élancement (sans dimension)", unit: "—" },
            { symbol: "i", meaning: "rayon de giration minimal", unit: "mm" },
            { symbol: "\\sigma_{cr}", meaning: "contrainte critique d'Euler", unit: "MPa" },
          ],
          note: "Pour les faibles élancements, la ruine se produit par écrasement ($\\sigma = f$) avant le flambement : la formule d'Euler surestime alors la résistance. Les Eurocodes combinent les deux phénomènes par un coefficient de réduction ($\\chi$ en acier, $k_c$ en bois).",
        },
        {
          type: "example",
          title: "Poteau en bois de rez-de-chaussée",
          context: "Poteau C24 de 12 × 12 cm, hauteur 3,0 m, articulé aux deux extrémités, $E = 11\\,000$ MPa.",
          steps: [
            { title: "Inertie", md: "$I = 120^4/12 = 1{,}728\\times 10^7$ mm⁴." },
            { title: "Charge critique", md: "$N_{cr} = \\dfrac{\\pi^2\\times 11\\,000\\times 1{,}728\\times 10^7}{3000^2} = 208\\,400$ N $\\approx 208$ kN." },
            { title: "Élancement", md: "$i = 120/\\sqrt{12} = 34{,}6$ mm ; $\\lambda = 3000/34{,}6 = 86{,}6$ : poteau élancé, le flambement gouverne." },
          ],
          result: "$N_{cr} \\approx 208$ kN. Le même poteau encastré en pied et libre en tête ($L_f = 6$ m) n'aurait plus que 52 kN.",
        },
      ],
    },
  ],
  keyPoints: [
    "Ncr = π²EI/Lf² : axe de plus faible inertie.",
    "Lf = K·L : 1 (art.–art.), 2 (enc.–libre), 0,7 (enc.–art.), 0,5 (enc.–enc.).",
    "Ncr ∝ 1/Lf² : doubler la longueur divise la charge critique par 4.",
    "Élancement λ = Lf/i ; règlementairement, on réduit la résistance par un coefficient de flambement.",
  ],
  quiz: [
    { id: "q1", prompt: "Longueur de flambement d'un poteau de 4 m encastré en pied et libre en tête :", choices: ["2 m", "2,8 m", "4 m", "8 m"], answer: 3, explanation: "$K = 2$ : $L_f = 8$ m." },
    { id: "q2", prompt: "Si $L_f$ double, $N_{cr}$ est :", choices: ["divisée par 2", "divisée par 4", "multipliée par 2", "inchangée"], answer: 1, explanation: "$N_{cr} \\propto 1/L_f^2$." },
    { id: "q3", prompt: "Un poteau rectangulaire 10 × 20 cm flambe :", choices: ["autour de l'axe de plus forte inertie", "autour de l'axe de plus faible inertie", "dans les deux plans à la fois", "jamais"], answer: 1, explanation: "Il se dérobe dans le plan où sa rigidité EI est la plus faible ($I_{min} = 20\\times 10^3/12$)." },
    { id: "q4", prompt: "L'élancement est défini par :", choices: ["L/h", "Lf/i", "I/A", "N/A"], answer: 1, explanation: "$\\lambda = L_f/i$ avec $i = \\sqrt{I/A}$." },
    { id: "q5", prompt: "Pourquoi la formule d'Euler ne suffit-elle pas pour un poteau trapu ?", choices: ["E n'est plus constant", "il s'écrase avant de flamber", "il ne flambe que s'il est en bois", "elle suffit toujours"], answer: 1, explanation: "Pour un faible élancement, la contrainte atteint la résistance du matériau avant la charge critique." },
  ],
  exercises: ["flambement-euler", "encastree-appuyee"],
};
