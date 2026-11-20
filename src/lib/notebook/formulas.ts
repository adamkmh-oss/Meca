/**
 * Blocs préfaits insérables : méthode (PFS, bilan, coupures), formulaire de
 * RDM, cas de charge usuels, flambement, treillis, unités.
 * Conventions du cours : torseur de cohésion = action de la partie droite
 * sur la partie gauche ; N > 0 en traction ; dM/dx = −T ; M > 0 tend la
 * fibre inférieure ; q > 0 vers le bas.
 */
export type SnippetCategory = "PFS & méthode" | "Cas de charge" | "Contraintes & sections" | "Flambement" | "Treillis" | "Unités";

export interface Snippet {
  id: string;
  title: string;
  category: SnippetCategory;
  /** math : une équation par ligne ; text : Markdown + LaTeX. */
  kind: "math" | "text";
  content: string;
}

export const SNIPPET_CATEGORIES: SnippetCategory[] = ["PFS & méthode", "Cas de charge", "Contraintes & sections", "Flambement", "Treillis", "Unités"];

export const SNIPPETS: Snippet[] = [
  /* --------------------------------- Méthode --------------------------------- */
  {
    id: "pfs-vect",
    title: "PFS (forme vectorielle)",
    category: "PFS & méthode",
    kind: "math",
    content: "\\sum \\vec{F}_{ext} = \\vec{0}\n\\sum \\vec{M}_{A}(\\vec{F}_{ext}) = \\vec{0}",
  },
  {
    id: "pfs-plan",
    title: "PFS projeté (3 équations)",
    category: "PFS & méthode",
    kind: "math",
    content: "\\Sigma F_x = 0 :\\quad \\dots\n\\Sigma F_y = 0 :\\quad \\dots\n\\Sigma M_{/A} = 0 :\\quad \\dots",
  },
  {
    id: "bilan",
    title: "Bilan des actions extérieures",
    category: "PFS & méthode",
    kind: "text",
    content:
      "**Bilan des actions mécaniques extérieures**\n- Charges : …\n- Liaison en A (articulation) : $H_A$, $V_A$\n- Liaison en B (appui simple) : $V_B$\n\nInconnues : 3 — équations : 3 → **isostatique**",
  },
  {
    id: "hyper",
    title: "Degré d'hyperstaticité",
    category: "PFS & méthode",
    kind: "math",
    content: "h = r - 3 - n_{rot} \\quad \\text{(poutre plane, } n_{rot} \\text{ rotules internes)}\nh = b + r - 2n \\quad \\text{(treillis plan)}\nh < 0 : \\text{mécanisme} \\qquad h = 0 : \\text{isostatique} \\qquad h > 0 : \\text{hyperstatique}",
  },
  {
    id: "torseur",
    title: "Torseur de cohésion",
    category: "PFS & méthode",
    kind: "text",
    content:
      "**Torseur de cohésion** en $G$ (abscisse $x$) : action de la partie **droite** sur la partie **gauche**, dans le repère local.\n- Partie gauche isolée : $+N(x)$, $+T(x)$, $+M(x)$\n- Partie droite isolée : $-N(x)$, $-T(x)$, $-M(x)$\n\n$N > 0$ : traction ; $M > 0$ : fibre inférieure tendue.",
  },
  {
    id: "troncon",
    title: "Équilibre d'un tronçon (partie gauche)",
    category: "PFS & méthode",
    kind: "math",
    content: "N(x) + \\Sigma F_x^{\\,gauche} = 0\nT(x) + \\Sigma F_y^{\\,gauche} = 0\nM(x) + \\Sigma M_{/G}^{\\,gauche} = 0",
  },
  {
    id: "diff",
    title: "Relations différentielles",
    category: "PFS & méthode",
    kind: "math",
    content: "\\dfrac{\\mathrm{d}T}{\\mathrm{d}x} = q(x) \\quad (q > 0 \\text{ vers le bas})\n\\dfrac{\\mathrm{d}M}{\\mathrm{d}x} = -T(x) \\quad \\Rightarrow\\; M \\text{ extrémal où } T = 0",
  },
  {
    id: "methode",
    title: "Méthode : étude d'une poutre",
    category: "PFS & méthode",
    kind: "text",
    content:
      "**Méthode**\n1. Schéma mécanique : appuis, charges, cotes, repère\n2. Bilan des actions extérieures (inconnues de liaison)\n3. Isostaticité : $h = r - 3$\n4. PFS → réactions, puis vérification ($\\Sigma M$ en un autre point)\n5. Coupures : un tronçon entre deux discontinuités ; isoler le côté le moins chargé\n6. $N(x)$, $T(x)$, $M(x)$ puis diagrammes\n7. Contrôles : $\\mathrm{d}M/\\mathrm{d}x = -T$, sauts de $T$ sous les forces, sauts de $M$ sous les couples",
  },
  {
    id: "resultantes",
    title: "Résultantes des charges réparties",
    category: "PFS & méthode",
    kind: "text",
    content:
      "**Charges réparties → résultantes**\n- Uniforme : $R = q\\,l$, au milieu\n- Triangulaire : $R = \\dfrac{q\\,l}{2}$, aux $\\dfrac{2l}{3}$ depuis le zéro\n- Trapézoïdale : $R = \\dfrac{q_1 + q_2}{2}\\,l$, en $x_G = \\dfrac{l\\,(q_1 + 2q_2)}{3\\,(q_1 + q_2)}$ depuis $q_1$",
  },

  /* ------------------------------ Cas de charge ------------------------------ */
  {
    id: "ss-q",
    title: "2 appuis — charge uniforme q",
    category: "Cas de charge",
    kind: "math",
    content: "V_A = V_B = \\dfrac{qL}{2}\nM_{max} = \\dfrac{qL^2}{8} \\quad (x = L/2)\nf = \\dfrac{5\\,qL^4}{384\\,EI}",
  },
  {
    id: "ss-p",
    title: "2 appuis — force P au milieu",
    category: "Cas de charge",
    kind: "math",
    content: "V_A = V_B = \\dfrac{P}{2}\nM_{max} = \\dfrac{PL}{4}\nf = \\dfrac{PL^3}{48\\,EI}",
  },
  {
    id: "ss-pa",
    title: "2 appuis — force P en x = a",
    category: "Cas de charge",
    kind: "math",
    content: "V_A = \\dfrac{P\\,b}{L} \\qquad V_B = \\dfrac{P\\,a}{L} \\qquad (b = L - a)\nM_{max} = \\dfrac{P\\,a\\,b}{L} \\quad (\\text{sous la charge})",
  },
  {
    id: "cs-p",
    title: "Console — force P en bout",
    category: "Cas de charge",
    kind: "math",
    content: "V_A = P \\qquad |M_A| = PL\nM(x) = -P\\,(L - x)\nf = \\dfrac{PL^3}{3\\,EI}",
  },
  {
    id: "cs-q",
    title: "Console — charge uniforme q",
    category: "Cas de charge",
    kind: "math",
    content: "V_A = qL \\qquad |M_A| = \\dfrac{qL^2}{2}\nM(x) = -\\dfrac{q\\,(L - x)^2}{2}\nf = \\dfrac{qL^4}{8\\,EI}",
  },

  /* -------------------------- Contraintes et sections -------------------------- */
  {
    id: "sigma-n",
    title: "Traction / compression",
    category: "Contraintes & sections",
    kind: "math",
    content: "\\sigma = \\dfrac{N}{A}\n\\sigma = E\\,\\varepsilon \\qquad \\varepsilon = \\dfrac{\\Delta L}{L}\n\\Delta L = \\dfrac{N\\,L}{E\\,A}",
  },
  {
    id: "navier",
    title: "Flexion (Navier)",
    category: "Contraintes & sections",
    kind: "math",
    content: "\\sigma(y) = -\\dfrac{M\\,y}{I}\n|\\sigma|_{max} = \\dfrac{|M|\\,v}{I} = \\dfrac{|M|}{W} \\le f",
  },
  {
    id: "flexion-composee",
    title: "Flexion composée",
    category: "Contraintes & sections",
    kind: "math",
    content: "\\sigma(y) = \\dfrac{N}{A} - \\dfrac{M\\,y}{I}",
  },
  {
    id: "tau",
    title: "Cisaillement moyen",
    category: "Contraintes & sections",
    kind: "math",
    content: "\\tau_{moy} = \\dfrac{T}{A} \\qquad \\tau_{max} = \\dfrac{3}{2}\\,\\dfrac{T}{A} \\;(\\text{rectangle})",
  },
  {
    id: "inertie",
    title: "Moments quadratiques",
    category: "Contraintes & sections",
    kind: "math",
    content:
      "I_{rect} = \\dfrac{b\\,h^3}{12} \\qquad W = \\dfrac{b\\,h^2}{6}\nI_{disque} = \\dfrac{\\pi D^4}{64} \\qquad I_{tube} = \\dfrac{\\pi\\,(D^4 - d^4)}{64}\nI_{\\Delta} = I_G + A\\,d^2 \\quad \\text{(Huygens)}",
  },
  {
    id: "cdg",
    title: "Centre de gravité d'une section",
    category: "Contraintes & sections",
    kind: "math",
    content: "y_G = \\dfrac{\\sum A_i\\,y_i}{\\sum A_i} \\qquad z_G = \\dfrac{\\sum A_i\\,z_i}{\\sum A_i}",
  },

  /* -------------------------------- Flambement -------------------------------- */
  {
    id: "euler",
    title: "Flambement d'Euler",
    category: "Flambement",
    kind: "math",
    content: "N_{cr} = \\dfrac{\\pi^2\\,E\\,I_{min}}{L_f^2}\n\\lambda = \\dfrac{L_f}{i} \\qquad i = \\sqrt{\\dfrac{I_{min}}{A}}\n\\sigma_{cr} = \\dfrac{N_{cr}}{A} = \\dfrac{\\pi^2 E}{\\lambda^2}",
  },
  {
    id: "lf",
    title: "Longueurs de flambement",
    category: "Flambement",
    kind: "text",
    content:
      "**Longueur de flambement $L_f$**\n- Bi-articulé : $L_f = L$\n- Encastré – libre : $L_f = 2L$\n- Encastré – articulé : $L_f = 0{,}7\\,L$\n- Bi-encastré : $L_f = 0{,}5\\,L$",
  },

  /* --------------------------------- Treillis --------------------------------- */
  {
    id: "noeuds",
    title: "Méthode des nœuds",
    category: "Treillis",
    kind: "text",
    content:
      "**Méthode des nœuds**\n- Isostaticité : $h = b + r - 2n$\n- En chaque nœud : $\\Sigma F_x = 0$ et $\\Sigma F_y = 0$\n- Commencer par un nœud à 2 inconnues\n- Effort supposé en traction (flèche sortant du nœud) : $N > 0$ traction, $N < 0$ compression\n\n*Le polycopié MS1 compte l'effort positif en compression : bien préciser la convention.*",
  },
  {
    id: "ritter",
    title: "Méthode de Ritter (coupe)",
    category: "Treillis",
    kind: "text",
    content:
      "**Méthode de Ritter**\n- Couper au plus 3 barres non concourantes\n- Isoler une des deux parties\n- $\\Sigma M = 0$ au point de concours de deux barres coupées → effort dans la troisième\n- $\\Sigma F_y = 0$ (ou $\\Sigma F_x$) pour la barre restante",
  },

  /* ---------------------------------- Unités ---------------------------------- */
  {
    id: "unites",
    title: "Conversions d'unités",
    category: "Unités",
    kind: "math",
    content:
      "1\\ \\text{MPa} = 1\\ \\text{N/mm}^2 = 10^3\\ \\text{kN/m}^2\n1\\ \\text{kN·m} = 10^6\\ \\text{N·mm}\n1\\ \\text{cm}^4 = 10^4\\ \\text{mm}^4 = 10^{-8}\\ \\text{m}^4\nE_{acier} = 210\\,000\\ \\text{MPa} \\qquad E_{bois} \\approx 11\\,000\\ \\text{MPa}",
  },
];
