import type { ChapterContent } from "../types";

export const m2Liaisons: ChapterContent = {
  id: "m2-liaisons",
  intro:
    "Avant de calculer, il faut **modéliser** : remplacer chaque appui réel (une platine boulonnée, un appareil d'appui en élastomère, un pied de poteau scellé) par une liaison idéale. Chaque liaison bloque certains mouvements et introduit autant d'**inconnues**. Les compter dit immédiatement si la statique suffira.",
  sections: [
    {
      title: "Degrés de liberté et liaisons",
      blocks: [
        {
          type: "md",
          md: "Dans le plan, un solide possède **3 degrés de liberté** : deux translations (horizontale et verticale) et une rotation. Une liaison bloque un ou plusieurs de ces mouvements ; pour cela, elle exerce une action — une **réaction** — dans chaque direction bloquée.",
        },
        { type: "widget", widget: "supports-gallery", caption: "Cliquez sur une liaison pour afficher ses inconnues de liaison." },
        {
          type: "md",
          md: "| Liaison | Mouvements bloqués | Inconnues | Exemple réel |\n|---|---|---|---|\n| Appui simple | 1 translation | 1 ($V$) | appareil d'appui glissant, poutre posée sur un mur |\n| Articulation | 2 translations | 2 ($H$, $V$) | pied de poteau métallique sur platine mince |\n| Encastrement | 2 translations + rotation | 3 ($H$, $V$, $M$) | poteau scellé dans une fondation massive |",
        },
      ],
    },
    {
      title: "Degré d'hyperstaticité",
      blocks: [
        {
          type: "formula",
          title: "Poutre ou portique sans rotule interne",
          tex: "h = r - 3",
          variables: [
            { symbol: "r", meaning: "nombre total d'inconnues de liaison extérieures", unit: "—" },
            { symbol: "3", meaning: "nombre d'équations d'équilibre du solide plan", unit: "—" },
          ],
          note: "Chaque rotule interne apporte une équation supplémentaire (moment nul) et diminue h d'une unité.",
        },
        {
          type: "md",
          md: "- $h < 0$ : **hypostatique** — mécanisme, la structure peut bouger sans se déformer.\n- $h = 0$ : **isostatique** — les réactions se calculent avec le seul PFS.\n- $h > 0$ : **hyperstatique** de degré $h$ — il faut ajouter $h$ conditions sur les déformations.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "Compter ne suffit pas toujours",
          md: "Trois appuis simples verticaux donnent $r = 3$ et $h = 0$, mais rien ne bloque la translation horizontale : la poutre est un mécanisme. Il faut aussi vérifier que les liaisons bloquent **tous** les mouvements. Le simulateur détecte ces cas.",
        },
        {
          type: "example",
          title: "Poutre de pont à trois appuis",
          context: "Une poutre continue repose sur une articulation (culée gauche), un appui simple (pile) et un appui simple (culée droite).",
          steps: [
            { title: "Inconnues", md: "$r = 2 + 1 + 1 = 4$." },
            { title: "Degré", md: "$h = 4 - 3 = 1$ : hyperstatique de degré 1." },
            { title: "Conséquence", md: "Le PFS ne suffit pas ; on écrira par exemple que la flèche sur la pile est nulle (méthode des forces, module 6)." },
          ],
          result: "La continuité sur la pile réduit les moments en travée : c'est l'intérêt des poutres continues.",
        },
      ],
    },
  ],
  keyPoints: [
    "Appui simple : 1 inconnue ; articulation : 2 ; encastrement : 3.",
    "h = r − 3 pour une barre ou un portique sans rotule interne.",
    "h = 0 : isostatique ; h > 0 : hyperstatique ; h < 0 : mécanisme.",
    "Vérifier aussi que les liaisons bloquent tous les mouvements.",
  ],
  quiz: [
    { id: "q1", prompt: "Combien d'inconnues introduit un encastrement plan ?", choices: ["1", "2", "3", "4"], answer: 2, explanation: "Deux forces ($H$, $V$) et un moment ($M$)." },
    { id: "q2", prompt: "Une poutre encastrée à une extrémité et posée sur un appui simple à l'autre est :", choices: ["isostatique", "hyperstatique de degré 1", "hyperstatique de degré 2", "hypostatique"], answer: 1, explanation: "$r = 3 + 1 = 4$, $h = 4 - 3 = 1$." },
    { id: "q3", prompt: "Une articulation laisse libre :", choices: ["la translation horizontale", "la translation verticale", "la rotation", "rien"], answer: 2, explanation: "Elle bloque les deux translations et laisse tourner : pas de moment de liaison." },
    { id: "q4", prompt: "Une console (encastrement seul) est :", choices: ["isostatique", "hyperstatique", "hypostatique", "indéterminée"], answer: 0, explanation: "$r = 3$, $h = 0$." },
    { id: "q5", prompt: "Que signifie $h = -1$ ?", choices: ["structure très rigide", "une équation de trop : mécanisme", "une inconnue de trop", "erreur de calcul"], answer: 1, explanation: "Moins d'inconnues que d'équations : la structure peut se déplacer sans se déformer." },
  ],
  exercises: ["hyperstaticite"],
};

export const m2Reactions: ChapterContent = {
  id: "m2-reactions",
  intro:
    "Les réactions d'appui sont les efforts que les liaisons exercent sur la structure pour la maintenir en équilibre. Ce sont elles qui descendent dans les fondations : leur calcul est la première étape de tout dimensionnement. Sur une structure isostatique, il se fait avec le seul PFS.",
  sections: [
    {
      title: "Méthode",
      blocks: [
        {
          type: "md",
          md: "1. **Isoler** la poutre : supprimer les appuis et les remplacer par leurs inconnues, **en rouge et dans le sens positif** du repère global — c'est une convention d'écriture, pas une prévision.\n2. **Charges réparties** : pour l'équation des moments seulement, les remplacer par leur résultante appliquée au centre de gravité du diagramme de charge.\n3. **Moments** en un appui : une seule inconnue reste.\n4. **Forces** : $\\Sigma F_x$ et $\\Sigma F_y$ donnent les autres inconnues.\n5. **Vérifier** : moments en l'autre appui.",
        },
        {
          type: "formula",
          title: "Poutre sur deux appuis, charge ponctuelle P en x = a",
          tex: "V_A = \\frac{P\\,(L - a)}{L} \\qquad V_B = \\frac{P\\,a}{L}",
          variables: [
            { symbol: "L", meaning: "portée entre appuis", unit: "m" },
            { symbol: "a", meaning: "distance de la charge à l'appui A", unit: "m" },
            { symbol: "P", meaning: "charge ponctuelle verticale", unit: "kN" },
          ],
          note: "Chaque appui reprend une part de la charge proportionnelle à la distance de la charge à l'**autre** appui.",
        },
        { type: "widget", widget: "reactions-beam", caption: "Déplacez la charge : les réactions (en vert) varient linéairement avec sa position." },
      ],
    },
    {
      title: "Cas types",
      blocks: [
        {
          type: "formula",
          title: "Poutre sur deux appuis, charge uniforme q",
          tex: "V_A = V_B = \\frac{q\\,L}{2}",
          variables: [
            { symbol: "q", meaning: "charge linéique uniforme", unit: "kN/m" },
            { symbol: "L", meaning: "portée", unit: "m" },
          ],
        },
        {
          type: "formula",
          title: "Console de longueur L encastrée en A, charge P en bout et q uniforme",
          tex: "V_A = P + q\\,L \\qquad M_A = P\\,L + \\frac{q\\,L^2}{2}",
          variables: [
            { symbol: "V_A", meaning: "réaction verticale de l'encastrement", unit: "kN" },
            { symbol: "M_A", meaning: "moment d'encastrement (anti-horaire si la console est à droite de A)", unit: "kN·m" },
          ],
        },
        {
          type: "example",
          title: "Balcon en porte-à-faux",
          context: "Une poutre de balcon repose sur une articulation A (x = 0) et un appui simple B (x = 4 m), puis se prolonge de 1,5 m en porte-à-faux. Elle porte 6 kN/m sur toute sa longueur et un garde-corps de 3 kN en bout.",
          steps: [
            { title: "Résultante", md: "$R = 6\\times 5{,}5 = 33$ kN en $x = 2{,}75$ m." },
            { title: "Moments en A", md: "$4\\,V_B - 33\\times 2{,}75 - 3\\times 5{,}5 = 0 \\Rightarrow V_B = \\dfrac{90{,}75 + 16{,}5}{4} = 26{,}81$ kN." },
            { title: "Forces verticales", md: "$V_A = 33 + 3 - 26{,}81 = 9{,}19$ kN." },
            { title: "Vérification", md: "Moments en B : $-4\\times 9{,}19 + 33\\times 1{,}25 - 3\\times 1{,}5 = -36{,}75 + 41{,}25 - 4{,}5 = 0$ ✓" },
          ],
          result: "$V_A = 9{,}19$ kN et $V_B = 26{,}81$ kN. Avec un porte-à-faux plus long, $V_A$ deviendrait négative : l'appui A devrait retenir la poutre.",
        },
      ],
    },
  ],
  keyPoints: [
    "Inconnues dessinées dans le sens positif ; le signe du résultat donne le sens réel.",
    "Charge répartie → résultante au centre de gravité, pour les moments uniquement.",
    "Moments en un appui → une seule inconnue.",
    "Vérification par les moments en l'autre appui.",
  ],
  quiz: [
    { id: "q1", prompt: "Poutre de 6 m sur deux appuis, charge de 30 kN à 2 m de A. $V_B$ vaut :", choices: ["10 kN", "15 kN", "20 kN", "30 kN"], answer: 0, explanation: "$V_B = P\\,a/L = 30\\times 2/6 = 10$ kN." },
    { id: "q2", prompt: "Même poutre : $V_A$ vaut :", choices: ["10 kN", "20 kN", "15 kN", "30 kN"], answer: 1, explanation: "$V_A = P - V_B = 20$ kN : l'appui le plus proche reprend le plus." },
    { id: "q3", prompt: "Console de 2 m sous 5 kN/m : le moment d'encastrement vaut :", choices: ["5 kN·m", "10 kN·m", "20 kN·m", "2,5 kN·m"], answer: 1, explanation: "$qL^2/2 = 5\\times 4/2 = 10$ kN·m." },
    { id: "q4", prompt: "Pour écrire ΣM, une charge répartie trapézoïdale se remplace par :", choices: ["sa valeur moyenne au milieu", "sa résultante au centre de gravité du trapèze", "deux forces aux extrémités", "sa valeur maximale"], answer: 1, explanation: "La résultante (aire du trapèze) appliquée au centre de gravité du diagramme de charge." },
    { id: "q5", prompt: "Pourquoi l'appui A d'une poutre à grand porte-à-faux peut-il avoir une réaction négative ?", choices: ["erreur de convention", "le porte-à-faux fait basculer la poutre autour de B et soulève A", "A est un encastrement", "la poutre est hyperstatique"], answer: 1, explanation: "Effet de levier : la charge du porte-à-faux fait pivoter la poutre autour de B." },
  ],
  exercises: ["reactions-ponctuelle", "reactions-console", "reactions-mixte", "reactions-porte-a-faux"],
};

export const m3Torseur: ChapterContent = {
  id: "m3-torseur-cohesion",
  intro:
    "Les réactions disent ce qui entre dans la structure ; les **efforts internes** disent comment cela la traverse. En coupant fictivement une poutre, on fait apparaître dans la section trois efforts — N, T et M — qui permettront ensuite de calculer les contraintes et de dimensionner la section.",
  sections: [
    {
      title: "La coupure",
      blocks: [
        {
          type: "md",
          md: "On coupe la poutre en une section d'abscisse $x$. Chaque partie reste en équilibre : la partie droite exerce sur la partie gauche des efforts répartis sur la section, dont la réduction au centre de gravité de la section est le **torseur de cohésion**.",
        },
        {
          type: "definition",
          term: "Torseur de cohésion",
          md: "Action de la partie droite sur la partie gauche, exprimée dans le **repère local** de la barre ($x$ le long de la barre, $y$ obtenu en tournant $x$ de +90°). Ses composantes sont l'effort normal $N(x)$ selon $x$, l'effort tranchant $T(x)$ selon $y$ et le moment fléchissant $M(x)$ autour de $z$.",
        },
        {
          type: "md",
          md: "| Effort | Direction | Effet sur la poutre | Signe positif |\n|---|---|---|---|\n| $N$ | axe de la barre | allongement ou raccourcissement | traction |\n| $T$ | perpendiculaire à l'axe | glissement des sections | sens $+y$ appliqué à la partie gauche |\n| $M$ | rotation autour de $z$ | flexion, courbure | fibre inférieure tendue (poutre horizontale) |",
        },
      ],
    },
    {
      title: "Convention du cours",
      blocks: [
        {
          type: "callout",
          tone: "info",
          title: "Ce qu'on écrit",
          md: "- Partie **gauche** isolée : on dessine $+N(x)$, $+T(x)$, $+M(x)$ dans le sens positif du repère local.\n- Partie **droite** isolée : c'est l'opposé qui s'applique : $-N(x)$, $-T(x)$, $-M(x)$, flèches inchangées.\n- On isole toujours **le côté le moins chargé**.",
        },
        {
          type: "formula",
          title: "Relation entre moment et tranchant",
          tex: "\\frac{\\mathrm{d}M}{\\mathrm{d}x} = -T(x)",
          variables: [
            { symbol: "M(x)", meaning: "moment fléchissant", unit: "kN·m" },
            { symbol: "T(x)", meaning: "effort tranchant (convention du cours)", unit: "kN" },
          ],
          note: "Conséquence : là où $T$ s'annule, $M$ est extrémal. Certains ouvrages notent $V = -T$ et écrivent $\\mathrm{d}M/\\mathrm{d}x = V$ : les diagrammes de moment sont identiques, ceux du tranchant sont de signe opposé.",
        },
        { type: "widget", widget: "cut-explorer", caption: "Déplacez la coupure : les efforts N, T, M équilibrent les actions appliquées à la partie gauche." },
      ],
    },
    {
      title: "Exemple",
      blocks: [
        {
          type: "example",
          title: "Poutre de plancher, section quelconque",
          context: "Poutre de 8 m sur appuis simples, $q = 5$ kN/m et $P = 20$ kN à 5 m de A. Réactions : $V_A = 27{,}5$ kN, $V_B = 32{,}5$ kN. On cherche $T$ et $M$ en $x = 3$ m.",
          steps: [
            { title: "Choix du côté", md: "À gauche de la section : $V_A$ et la charge répartie sur 3 m (résultante 15 kN à 1,5 m de la section). C'est le côté le moins chargé." },
            { title: "Équilibre de la partie gauche", md: "$T(3) + V_A - 15 = 0 \\Rightarrow T(3) = -12{,}5$ kN\n\n$M(3) - V_A\\times 3 + 15\\times 1{,}5 = 0 \\Rightarrow M(3) = 82{,}5 - 22{,}5 = 60{,}0$ kN·m" },
            { title: "Contrôle", md: "$\\dfrac{\\mathrm{d}M}{\\mathrm{d}x} = V_A - q\\,x = 27{,}5 - 15 = 12{,}5 = -T(3)$ ✓" },
          ],
          result: "$T(3) = -12{,}5$ kN et $M(3) = 60{,}0$ kN·m (fibre inférieure tendue).",
        },
      ],
    },
  ],
  keyPoints: [
    "Torseur de cohésion = action de la partie droite sur la partie gauche, en repère local.",
    "Partie gauche : +N, +T, +M ; partie droite : −N, −T, −M.",
    "dM/dx = −T : M est extrémal là où T s'annule.",
    "Isoler le côté le moins chargé.",
  ],
  quiz: [
    { id: "q1", prompt: "Quel effort interne provoque l'allongement d'une barre ?", choices: ["N > 0", "T", "M", "N < 0"], answer: 0, explanation: "Un effort normal positif est une traction." },
    { id: "q2", prompt: "On isole la partie droite d'une coupure. Les étiquettes du torseur sont :", choices: ["+N, +T, +M", "−N, −T, −M", "+N, −T, +M", "aucune"], answer: 1, explanation: "Le torseur de cohésion s'applique à la partie gauche ; sur la partie droite s'applique son opposé." },
    { id: "q3", prompt: "Avec la convention du cours, si $T$ est positif sur un tronçon, le moment :", choices: ["croît", "décroît", "est constant", "est nul"], answer: 1, explanation: "$\\mathrm{d}M/\\mathrm{d}x = -T < 0$." },
    { id: "q4", prompt: "Le moment fléchissant est maximal là où :", choices: ["N s'annule", "T s'annule (ou change de signe)", "la charge est maximale", "x = L/2 toujours"], answer: 1, explanation: "Extremum d'une fonction : dérivée nulle, donc $T = 0$ (ou changement de signe par saut)." },
    { id: "q5", prompt: "Poutre sur deux appuis chargée vers le bas : le signe du moment en travée est :", choices: ["positif (fibre inférieure tendue)", "négatif", "nul", "variable selon la convention de T"], answer: 0, explanation: "La poutre fléchit vers le bas : la fibre inférieure s'allonge." },
  ],
  exercises: ["torseur-section"],
};

export const m3Diagrammes: ChapterContent = {
  id: "m3-diagrammes",
  intro:
    "Un diagramme résume en un coup d'œil ce que subit chaque section d'une poutre : où l'effort tranchant est maximal (vérification à l'effort tranchant), où le moment est maximal (dimensionnement en flexion), où il change de signe (position des aciers dans une poutre en béton armé).",
  sections: [
    {
      title: "Méthode des tronçons",
      blocks: [
        {
          type: "md",
          md: "1. Calculer les **réactions**.\n2. Repérer les **discontinuités** : appuis, charges ponctuelles, début et fin des charges réparties. Elles délimitent les tronçons.\n3. Sur chaque tronçon, couper en $x$ et écrire l'équilibre d'une partie : on obtient $N(x)$, $T(x)$, $M(x)$.\n4. **Tracer** en reportant les valeurs perpendiculairement à la ligne moyenne, avec le signe cerclé dans chaque zone.\n5. **Contrôler** : $\\mathrm{d}M/\\mathrm{d}x = -T$, valeurs aux extrémités, sauts.",
        },
        { type: "widget", widget: "beam-diagrams", caption: "Choisissez un cas de charge et observez la forme des diagrammes." },
      ],
    },
    {
      title: "Lire un diagramme",
      blocks: [
        {
          type: "md",
          md: "| Chargement du tronçon | T(x) | M(x) |\n|---|---|---|\n| aucun | constant | linéaire |\n| charge uniforme | linéaire | parabolique |\n| charge triangulaire | parabolique | cubique |\n| charge ponctuelle (au point) | **saut** égal à la charge | changement de pente |\n| couple (au point) | inchangé | **saut** égal au couple |",
        },
        {
          type: "callout",
          tone: "success",
          title: "Contrôles gratuits",
          md: "- $M = 0$ aux appuis simples et articulations d'extrémité, et aux extrémités libres non chargées par un couple.\n- Le degré de $M$ est celui de $T$ plus un.\n- Le saut de $T$ au droit d'une charge ponctuelle est égal à cette charge.\n- $M_{max}$ là où $T$ s'annule ou change de signe.",
        },
        {
          type: "formula",
          title: "Poutre sur deux appuis, charge uniforme",
          tex: "T(x) = q\\,x - \\frac{qL}{2} \\qquad M(x) = \\frac{q\\,x\\,(L - x)}{2} \\qquad M_{max} = \\frac{q\\,L^2}{8}",
          variables: [
            { symbol: "q", meaning: "charge uniforme", unit: "kN/m" },
            { symbol: "L", meaning: "portée", unit: "m" },
            { symbol: "x", meaning: "abscisse depuis l'appui gauche", unit: "m" },
          ],
        },
        {
          type: "formula",
          title: "Console de longueur L, charge P à l'extrémité libre (encastrement à gauche)",
          tex: "T(x) = -P \\qquad M(x) = -P\\,(L - x) \\qquad M_{min} = M(0) = -P\\,L",
          variables: [{ symbol: "P", meaning: "charge en bout", unit: "kN" }],
          note: "Moment négatif : fibre supérieure tendue — les aciers d'une console en béton armé sont en partie haute.",
        },
      ],
    },
    {
      title: "Exemple de génie civil",
      blocks: [
        {
          type: "example",
          title: "Poutre de rive : où placer les aciers ?",
          context: "Poutre en béton armé de 6 m sur appuis simples, $q = 10$ kN/m.",
          steps: [
            { title: "Réactions", md: "$V_A = V_B = 30$ kN." },
            { title: "Équations", md: "$T(x) = 10\\,x - 30$ ; $M(x) = 30\\,x - 5\\,x^2$." },
            { title: "Valeurs remarquables", md: "$T(0) = -30$ kN, $T(6) = +30$ kN ; $T = 0$ en $x = 3$ m où $M_{max} = 45$ kN·m." },
          ],
          result: "Le moment est positif sur toute la portée : la fibre inférieure est tendue, les aciers longitudinaux principaux sont en bas, au maximum à mi-portée. L'effort tranchant est maximal près des appuis : c'est là que les armatures transversales (étriers) sont les plus serrées.",
        },
      ],
    },
  ],
  keyPoints: [
    "Un tronçon par zone de chargement continu.",
    "Charge répartie → T linéaire, M parabolique ; aucune charge → T constant, M linéaire.",
    "Saut de T au droit d'une charge ponctuelle, saut de M au droit d'un couple.",
    "M max là où T s'annule ou change de signe.",
  ],
  quiz: [
    { id: "q1", prompt: "Sur un tronçon sans charge, le moment est :", choices: ["constant", "linéaire", "parabolique", "nul"], answer: 1, explanation: "T est constant, donc M (sa primitive au signe près) est linéaire." },
    { id: "q2", prompt: "$M_{max}$ d'une poutre de 8 m sur appuis simples sous 10 kN/m :", choices: ["40 kN·m", "80 kN·m", "160 kN·m", "320 kN·m"], answer: 1, explanation: "$qL^2/8 = 10\\times 64/8 = 80$ kN·m." },
    { id: "q3", prompt: "Au droit d'une charge ponctuelle de 20 kN, le diagramme de T :", choices: ["est continu", "présente un saut de 20 kN", "présente un saut de moment", "s'annule"], answer: 1, explanation: "L'équilibre d'un tronçon infinitésimal autour de la charge impose un saut égal à la charge." },
    { id: "q4", prompt: "Dans une console chargée vers le bas, la fibre tendue est :", choices: ["inférieure", "supérieure", "neutre", "alternativement l'une et l'autre"], answer: 1, explanation: "Le moment est négatif sur toute la console." },
    { id: "q5", prompt: "Sous charge triangulaire, le moment est un polynôme de degré :", choices: ["1", "2", "3", "4"], answer: 2, explanation: "Charge de degré 1 → T de degré 2 → M de degré 3." },
  ],
  exercises: ["diagramme-uniforme", "moment-max-mixte", "torseur-section"],
};
