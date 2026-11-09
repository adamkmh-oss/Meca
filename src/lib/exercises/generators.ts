/**
 * Générateurs d'exercices à données variables.
 *
 * Chaque exercice est entièrement déterminé par sa graine (seed) : on peut le
 * refaire, le partager et le recorriger. Les résultats sont calculés par les
 * formules de la mécanique ; quand c'est possible, ils sont recoupés par le
 * solveur du simulateur (méthode des déplacements) dans la vérification.
 *
 * Convention du cours : torseur de cohésion appliqué à la partie gauche,
 * T(x) = −Σ F_y(gauche), dM/dx = −T, M > 0 tend la fibre inférieure.
 */
import { analyzeBeam, type BeamModel } from "@/lib/mechanics/beam";
import { analyze } from "@/lib/mechanics/solver";
import type { ExerciseGenerator, GeneratedExercise } from "./types";

/* ------------------------------------------------------------------ */
/*                         Aléa reproductible                          */
/* ------------------------------------------------------------------ */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function R(seed: number) {
  const r = mulberry32(seed);
  return {
    int: (a: number, b: number) => a + Math.floor(r() * (b - a + 1)),
    pick: <T,>(arr: readonly T[]) => arr[Math.floor(r() * arr.length)],
    step: (a: number, b: number, s: number) => +(a + s * Math.floor(r() * (Math.round((b - a) / s) + 1))).toFixed(6),
  };
}

/* ------------------------------------------------------------------ */
/*                       Mise en forme des nombres                     */
/* ------------------------------------------------------------------ */
function frNum(v: number, d = 2): string {
  const x = Number(v.toFixed(d));
  return (Object.is(x, -0) ? 0 : x).toLocaleString("fr-FR", { maximumFractionDigits: d, useGrouping: true });
}
/** Nombre pour LaTeX (virgule protégée). */
const n = (v: number, d = 2) => frNum(v, d).replace(/,/g, "{,}").replace(/[\u202f\u00a0]/g, "\\,");
/** Nombre pour le texte courant. */
const t = (v: number, d = 2) => frNum(v, d).replace(/[\u202f\u00a0]/g, "\u2009");

const STEEL = { E: 210e6, A: 53.8e-4, I: 8356e-8 };

function beam(partial: Omit<BeamModel, "E" | "A" | "I" | "hinges"> & { hinges?: BeamModel["hinges"] }): BeamModel {
  return { ...STEEL, hinges: [], ...partial };
}

const ok = "✓";

/** Contrôle par le solveur matriciel. */
function solverLine(items: { label: string; value: number; expected: number; unit: string; d?: number }[]): string {
  const good = items.every((i) => Math.abs(i.value - i.expected) <= 1e-6 * Math.max(1, Math.abs(i.expected)));
  const list = items.map((i) => `$${i.label} = ${n(i.value, i.d ?? 2)}$ ${i.unit}`).join(", ");
  return good
    ? `**Contrôle indépendant** — le solveur du simulateur (méthode des déplacements) donne ${list} : identique ✓`
    : `**Contrôle indépendant** — écart avec le solveur (${list}) : signalez cet exercice.`;
}

/* ================================================================== */
/*                         MODULE 1 — Fondamentaux                     */
/* ================================================================== */
const momentForce: ExerciseGenerator = {
  id: "moment-force",
  title: "Moment d'une force inclinée",
  description: "Calculer le moment d'une force par rapport à un point en identifiant le bras de levier.",
  chapterId: "m1-moment",
  level: "debutant",
  calc: "statique",
  skill: "Calculer un moment par rapport à un point",
  generate(seed) {
    const r = R(seed);
    const d = r.step(0.5, 3, 0.25);
    const F = r.step(5, 40, 5);
    const alpha = r.pick([30, 45, 60, 90] as const);
    const s = Math.sin((alpha * Math.PI) / 180);
    const dp = d * s;
    const M = -F * dp;
    return {
      generatorId: this.id,
      seed,
      title: this.title,
      statement: `Une barre horizontale OA de longueur $d = ${n(d)}$ m est fixée en O. En A s'applique une force $F = ${n(F)}$ kN, dirigée vers le bas et vers la droite, inclinée de $\\alpha = ${alpha}°$ **par rapport à l'horizontale**.\n\nCalculer le bras de levier de $F$ par rapport à O, puis le moment $M_{/O}(\\vec F)$ (positif dans le sens anti-horaire).`,
      figure: { kind: "lever", d, F, alpha },
      questions: [
        { key: "dp", label: "Bras de levier $d_\\perp$", unit: "m", answer: dp, hint: "Le bras de levier est la distance **perpendiculaire** entre O et la ligne d'action de la force, pas la longueur de la barre." },
        { key: "M", label: "Moment $M_{/O}(\\vec F)$", unit: "kN·m", answer: M, hint: "Décomposez $F$ : seule la composante perpendiculaire à OA crée un moment. Une force vers le bas à droite de O fait tourner dans le sens horaire." },
      ],
      solution: {
        donnees: `- $d = OA = ${n(d)}$ m\n- $F = ${n(F)}$ kN, inclinée de $\\alpha = ${alpha}°$ sous l'horizontale`,
        schema: "On décompose $\\vec F$ en une composante le long de OA (horizontale) et une composante perpendiculaire (verticale).",
        equations: `$$F_x = F\\cos\\alpha \\qquad F_y = -F\\sin\\alpha$$\n$$M_{/O}(\\vec F) = x_A\\,F_y - y_A\\,F_x \\quad\\text{avec } x_A = d,\\; y_A = 0$$`,
        calculs: `La composante horizontale passe par O : son moment est nul. Il reste\n$$M_{/O} = d\\cdot(-F\\sin\\alpha) = -${n(F)}\\times ${n(d)}\\times\\sin ${alpha}° = ${n(M)}\\ \\text{kN·m}$$\nAutre lecture : $d_\\perp = d\\sin\\alpha = ${n(dp, 3)}$ m et $|M| = F\\,d_\\perp$.`,
        resultat: `$$d_\\perp = ${n(dp, 3)}\\ \\text{m} \\qquad M_{/O}(\\vec F) = ${n(M)}\\ \\text{kN·m (sens horaire)}$$`,
        verification: `Cas limite : pour $\\alpha = 90°$ la force est perpendiculaire à la barre et $d_\\perp = d$ ; pour $\\alpha \\to 0$ elle passe par O et le moment s'annule. Ici $d_\\perp = ${n(dp, 3)} \\le d = ${n(d)}$ ${ok}$`,
      },
    };
  },
};

const unitConversion: ExerciseGenerator = {
  id: "unites",
  title: "Conversions d'unités du génie civil",
  description: "Moment quadratique, contrainte et charge linéique : les conversions qui piègent.",
  chapterId: "m1-unites",
  level: "debutant",
  calc: "unités",
  skill: "Convertir sans erreur",
  generate(seed) {
    const r = R(seed);
    const Icm = r.pick([171, 318, 1943, 3892, 8356, 23130] as const);
    const N = r.step(20, 300, 10);
    const A = r.pick([4.5, 8, 12.5, 20, 28.5, 53.8] as const);
    const p = r.step(1.5, 6, 0.5);
    const e = r.step(2, 6, 0.5);
    const Imm = Icm * 1e4;
    const sigma = (10 * N) / A;
    const q = p * e;
    return {
      generatorId: this.id,
      seed,
      title: this.title,
      statement: `1. Un profilé a un moment quadratique $I = ${n(Icm, 0)}$ cm⁴. Exprimer $I$ en mm⁴.\n2. Une barre de section $A = ${n(A, 1)}$ cm² est tendue par $N = ${n(N, 0)}$ kN. Calculer la contrainte $\\sigma = N/A$ en MPa.\n3. Un plancher reçoit une charge $p = ${n(p, 1)}$ kN/m². Les solives sont espacées de $e = ${n(e, 1)}$ m. Calculer la charge linéique $q$ reprise par une solive.`,
      questions: [
        { key: "I", label: "$I$ en mm⁴", unit: "mm⁴", answer: Imm, hint: "1 cm = 10 mm, donc 1 cm⁴ = 10⁴ mm⁴ (l'exposant s'applique aussi au facteur)." },
        { key: "s", label: "$\\sigma$", unit: "MPa", answer: sigma, hint: "1 MPa = 1 N/mm². Convertissez N en newtons et A en mm², ou retenez 1 kN/cm² = 10 MPa." },
        { key: "q", label: "$q$", unit: "kN/m", answer: q, hint: "Chaque solive reprend la charge d'une bande de plancher de largeur égale à l'entraxe." },
      ],
      solution: {
        donnees: `- $I = ${n(Icm, 0)}$ cm⁴\n- $N = ${n(N, 0)}$ kN, $A = ${n(A, 1)}$ cm²\n- $p = ${n(p, 1)}$ kN/m², $e = ${n(e, 1)}$ m`,
        schema: "Pas de schéma mécanique : il s'agit de conversions. On écrit chaque grandeur avec ses unités et on remplace chaque unité par sa valeur.",
        equations: `$$1\\ \\text{cm}^4 = (10\\ \\text{mm})^4 = 10^4\\ \\text{mm}^4 \\qquad 1\\ \\text{MPa} = 1\\ \\text{N/mm}^2 \\qquad q = p\\cdot e$$`,
        calculs: `$$I = ${n(Icm, 0)}\\times 10^4 = ${n(Imm, 0)}\\ \\text{mm}^4$$\n$$\\sigma = \\frac{${n(N, 0)}\\times 10^3\\ \\text{N}}{${n(A, 1)}\\times 10^2\\ \\text{mm}^2} = ${n(sigma, 2)}\\ \\text{MPa}$$\n$$q = ${n(p, 1)}\\ \\text{kN/m}^2 \\times ${n(e, 1)}\\ \\text{m} = ${n(q, 2)}\\ \\text{kN/m}$$`,
        resultat: `$$I = ${n(Imm, 0)}\\ \\text{mm}^4 \\qquad \\sigma = ${n(sigma, 2)}\\ \\text{MPa} \\qquad q = ${n(q, 2)}\\ \\text{kN/m}$$`,
        verification: `Homogénéité : $[\\text{kN/m}^2]\\times[\\text{m}] = [\\text{kN/m}]$ ${ok}. Ordre de grandeur : une contrainte de ${t(sigma, 0)} MPa est ${sigma < 235 ? "inférieure" : "supérieure"} à la limite élastique d'un acier S235.`,
      },
    };
  },
};

const pfsLever: ExerciseGenerator = {
  id: "pfs-levier",
  title: "Équilibre d'une barre sur pivot",
  description: "Écrire le PFS : équation de moments pour l'inconnue, puis équation de forces pour la réaction.",
  chapterId: "m1-equilibre",
  level: "debutant",
  calc: "statique",
  skill: "Appliquer le principe fondamental de la statique",
  generate(seed) {
    const r = R(seed);
    const a = r.step(1, 3, 0.5);
    const b = r.step(1, 4, 0.5);
    const P = r.step(10, 50, 5);
    const F = (P * a) / b;
    const Rv = P + F;
    return {
      generatorId: this.id,
      seed,
      title: this.title,
      statement: `Une barre horizontale CB repose sur une articulation O. En C, à $a = ${n(a)}$ m à gauche de O, est suspendue une charge $P = ${n(P)}$ kN. En B, à $b = ${n(b)}$ m à droite de O, on applique une force verticale $F$ dirigée vers le bas pour maintenir la barre en équilibre. Le poids de la barre est négligé.\n\nCalculer $F$, puis la réaction verticale $R_O$ de l'articulation (positive vers le haut).`,
      figure: {
        kind: "beam",
        model: beam({ length: a + b, supports: [{ id: "O", x: a, type: "pin" }], loads: [{ id: "P", kind: "point", x: 0, F: P, angle: -90 }] }),
      },
      questions: [
        { key: "F", label: "Force $F$", unit: "kN", answer: F, hint: "Écrivez l'équation des moments en O : la réaction de l'articulation n'y apparaît pas." },
        { key: "R", label: "Réaction $R_O$", unit: "kN", answer: Rv, hint: "Une fois $F$ connue, la somme des forces verticales donne $R_O$." },
      ],
      solution: {
        donnees: `- $a = ${n(a)}$ m, $b = ${n(b)}$ m\n- $P = ${n(P)}$ kN (en C, vers le bas), $F$ inconnue (en B, vers le bas)`,
        schema: "On isole la barre : actions extérieures $P$, $F$ et la réaction de l'articulation ($H_O$, $R_O$), dessinées dans le sens positif.",
        equations: `$$\\Sigma M_{/O} = 0 \\;\\Rightarrow\\; P\\cdot a - F\\cdot b = 0$$\n$$\\Sigma F_y = 0 \\;\\Rightarrow\\; R_O - P - F = 0 \\qquad \\Sigma F_x = 0 \\;\\Rightarrow\\; H_O = 0$$`,
        calculs: `$$F = \\frac{P\\,a}{b} = \\frac{${n(P)}\\times ${n(a)}}{${n(b)}} = ${n(F)}\\ \\text{kN}$$\n$$R_O = P + F = ${n(P)} + ${n(F)} = ${n(Rv)}\\ \\text{kN}$$`,
        resultat: `$$F = ${n(F)}\\ \\text{kN} \\qquad R_O = ${n(Rv)}\\ \\text{kN (vers le haut)}$$`,
        verification: `Moments en C (point non utilisé) : $\\Sigma M_{/C} = R_O\\cdot a - F\\,(a+b) = ${n(Rv * a)} - ${n(F * (a + b))} = ${n(Rv * a - F * (a + b), 4)}$ ${ok}. ${b > a ? "Le bras de levier de $F$ étant plus long, $F < P$ : c'est le principe du levier." : b < a ? "Le bras de levier de $F$ étant plus court, il faut $F > P$." : "Bras de levier égaux : $F = P$."}`,
      },
    };
  },
};

/* ================================================================== */
/*                       MODULE 2 — Réactions d'appui                  */
/* ================================================================== */
const reactionsPoint: ExerciseGenerator = {
  id: "reactions-ponctuelle",
  title: "Réactions d'une poutre sur deux appuis — charge ponctuelle",
  description: "Poutre isostatique, une charge concentrée : le cas d'école.",
  chapterId: "m2-reactions",
  level: "debutant",
  calc: "réactions",
  skill: "Calculer des réactions d'appui",
  generate(seed) {
    const r = R(seed);
    const L = r.pick([4, 5, 6, 7, 8] as const);
    const a = r.step(1, L - 1, 0.5);
    const P = r.step(10, 60, 5);
    const VB = (P * a) / L;
    const VA = P - VB;
    const model = beam({ length: L, supports: [{ id: "A", x: 0, type: "pin" }, { id: "B", x: L, type: "roller" }], loads: [{ id: "P", kind: "point", x: a, F: P, angle: -90 }] });
    const an = analyzeBeam(model);
    const res = an.result.ok ? an.result.reactions : null;
    return {
      generatorId: this.id,
      seed,
      title: this.title,
      statement: `Une poutre AB de longueur $L = ${n(L)}$ m repose sur une articulation en A et un appui simple en B. Elle porte une charge ponctuelle verticale $P = ${n(P)}$ kN dirigée vers le bas, à $a = ${n(a)}$ m de A. Le poids propre est négligé.\n\nCalculer les réactions verticales $V_A$ et $V_B$ (positives vers le haut).`,
      figure: { kind: "beam", model },
      questions: [
        { key: "VA", label: "$V_A$", unit: "kN", answer: VA, hint: "Commencez par l'équation des moments en B : elle ne contient que $V_A$." },
        { key: "VB", label: "$V_B$", unit: "kN", answer: VB, hint: "Équation des moments en A : bras de levier de $P$ = $a$, celui de $V_B$ = $L$." },
      ],
      solution: {
        donnees: `- $L = ${n(L)}$ m, $a = ${n(a)}$ m, $b = L - a = ${n(L - a)}$ m\n- $P = ${n(P)}$ kN vers le bas`,
        schema: "Liaisons : articulation en A (2 inconnues $H_A$, $V_A$), appui simple en B (1 inconnue $V_B$). $h = 3 - 3 = 0$ : poutre isostatique. Les inconnues sont dessinées dans le sens positif.",
        equations: `$$\\Sigma F_x = 0 \\;\\Rightarrow\\; H_A = 0$$\n$$\\Sigma M_{/A} = 0 \\;\\Rightarrow\\; V_B\\cdot L - P\\cdot a = 0$$\n$$\\Sigma F_y = 0 \\;\\Rightarrow\\; V_A + V_B - P = 0$$`,
        calculs: `$$V_B = \\frac{P\\,a}{L} = \\frac{${n(P)}\\times ${n(a)}}{${n(L)}} = ${n(VB)}\\ \\text{kN}$$\n$$V_A = P - V_B = ${n(P)} - ${n(VB)} = ${n(VA)}\\ \\text{kN}$$`,
        resultat: `$$V_A = ${n(VA)}\\ \\text{kN} \\qquad V_B = ${n(VB)}\\ \\text{kN} \\qquad H_A = 0$$`,
        verification: `$\\Sigma M_{/B} = -V_A\\,L + P\\,(L-a) = -${n(VA * L)} + ${n(P * (L - a))} = 0$ ${ok}. L'appui le plus proche de la charge reprend la plus grande part : ${a < L / 2 ? "A" : a > L / 2 ? "B" : "charge centrée, partage égal"}.\n\n${res ? solverLine([{ label: "V_A", value: res.N0.ry, expected: VA, unit: "kN" }, { label: "V_B", value: res.N1.ry, expected: VB, unit: "kN" }]) : ""}`,
      },
    };
  },
};

const reactionsMixed: ExerciseGenerator = {
  id: "reactions-mixte",
  title: "Réactions — charge ponctuelle et charge répartie partielle",
  description: "Remplacer la charge répartie par sa résultante pour écrire les moments.",
  chapterId: "m2-reactions",
  level: "intermediaire",
  calc: "réactions",
  skill: "Utiliser la résultante d'une charge répartie",
  generate(seed) {
    const r = R(seed);
    const L = r.pick([6, 7, 8, 9, 10] as const);
    const a = r.step(1, L - 1, 0.5);
    const P = r.step(10, 40, 5);
    const c = r.step(0, L / 2, 0.5);
    const d = r.step(c + 1.5, L, 0.5);
    const q = r.step(4, 15, 1);
    const Rq = q * (d - c);
    const xG = (c + d) / 2;
    const VB = (P * a + Rq * xG) / L;
    const VA = P + Rq - VB;
    const model = beam({
      length: L,
      supports: [{ id: "A", x: 0, type: "pin" }, { id: "B", x: L, type: "roller" }],
      loads: [
        { id: "P", kind: "point", x: a, F: P, angle: -90 },
        { id: "q", kind: "dist", x1: c, x2: d, q1: q, q2: q },
      ],
    });
    const an = analyzeBeam(model);
    const res = an.result.ok ? an.result.reactions : null;
    return {
      generatorId: this.id,
      seed,
      title: this.title,
      statement: `Une poutre AB de portée $L = ${n(L)}$ m (articulation en A, appui simple en B) porte :\n- une charge ponctuelle $P = ${n(P)}$ kN à $${n(a)}$ m de A ;\n- une charge uniformément répartie $q = ${n(q)}$ kN/m entre $x = ${n(c)}$ m et $x = ${n(d)}$ m.\n\nCalculer $V_A$ et $V_B$ (positives vers le haut).`,
      figure: { kind: "beam", model },
      questions: [
        { key: "VA", label: "$V_A$", unit: "kN", answer: VA, hint: "Moments en B. La charge répartie se remplace par sa résultante $q\\times$longueur, placée au milieu du tronçon chargé." },
        { key: "VB", label: "$V_B$", unit: "kN", answer: VB, hint: "Moments en A : la résultante de la charge répartie est à $x_G = (c+d)/2$ de A." },
      ],
      solution: {
        donnees: `- $L = ${n(L)}$ m ; $P = ${n(P)}$ kN en $x = ${n(a)}$ m\n- $q = ${n(q)}$ kN/m sur $[${n(c)}\\,;\\,${n(d)}]$ m (longueur $${n(d - c)}$ m)`,
        schema: `Poutre isostatique ($h = 0$). Pour le seul calcul des moments, la charge répartie est remplacée par sa résultante $R_q = q\\,(d-c) = ${n(Rq)}$ kN, appliquée en $x_G = ${n(xG)}$ m.`,
        equations: `$$\\Sigma M_{/A} = 0 \\;\\Rightarrow\\; V_B\\cdot L - P\\cdot a - R_q\\cdot x_G = 0$$\n$$\\Sigma F_y = 0 \\;\\Rightarrow\\; V_A + V_B - P - R_q = 0$$`,
        calculs: `$$V_B = \\frac{${n(P)}\\times ${n(a)} + ${n(Rq)}\\times ${n(xG)}}{${n(L)}} = \\frac{${n(P * a)} + ${n(Rq * xG)}}{${n(L)}} = ${n(VB)}\\ \\text{kN}$$\n$$V_A = ${n(P)} + ${n(Rq)} - ${n(VB)} = ${n(VA)}\\ \\text{kN}$$`,
        resultat: `$$V_A = ${n(VA)}\\ \\text{kN} \\qquad V_B = ${n(VB)}\\ \\text{kN}$$`,
        verification: `Somme des réactions $= ${n(VA + VB)}$ kN $=$ charge totale $P + R_q = ${n(P + Rq)}$ kN ${ok}.\n\n${res ? solverLine([{ label: "V_A", value: res.N0.ry, expected: VA, unit: "kN" }, { label: "V_B", value: res.N1.ry, expected: VB, unit: "kN" }]) : ""}`,
      },
    };
  },
};

const reactionsCantilever: ExerciseGenerator = {
  id: "reactions-console",
  title: "Réactions d'une console encastrée",
  description: "Trois inconnues à l'encastrement, dont un moment.",
  chapterId: "m2-reactions",
  level: "debutant",
  calc: "réactions",
  skill: "Calculer le moment d'encastrement",
  generate(seed) {
    const r = R(seed);
    const L = r.step(2, 4, 0.5);
    const P = r.step(5, 30, 5);
    const q = r.step(2, 12, 1);
    const VA = P + q * L;
    const MA = P * L + (q * L * L) / 2;
    const model = beam({
      length: L,
      supports: [{ id: "A", x: 0, type: "fixed" }],
      loads: [
        { id: "q", kind: "dist", x1: 0, x2: L, q1: q, q2: q },
        { id: "P", kind: "point", x: L, F: P, angle: -90 },
      ],
    });
    const an = analyzeBeam(model);
    const res = an.result.ok ? an.result.reactions.N0 : null;
    return {
      generatorId: this.id,
      seed,
      title: this.title,
      statement: `Une console AB de longueur $L = ${n(L)}$ m est encastrée en A et libre en B. Elle porte une charge uniformément répartie $q = ${n(q)}$ kN/m sur toute sa longueur et une charge ponctuelle $P = ${n(P)}$ kN en B (vers le bas).\n\nCalculer la réaction verticale $V_A$ (positive vers le haut) et le moment d'encastrement $M_A$ (positif dans le sens anti-horaire).`,
      figure: { kind: "beam", model },
      questions: [
        { key: "VA", label: "$V_A$", unit: "kN", answer: VA, hint: "Une seule réaction verticale doit reprendre toutes les charges verticales." },
        { key: "MA", label: "$M_A$", unit: "kN·m", answer: MA, hint: "Moments en A : $P$ a pour bras de levier $L$, la résultante $qL$ a pour bras de levier $L/2$." },
      ],
      solution: {
        donnees: `- $L = ${n(L)}$ m ; $q = ${n(q)}$ kN/m sur $[0\\,;\\,L]$ ; $P = ${n(P)}$ kN en B`,
        schema: "Encastrement en A : 3 inconnues $H_A$, $V_A$, $M_A$ ; extrémité B libre. $h = 3 - 3 = 0$.",
        equations: `$$\\Sigma F_x = 0 \\Rightarrow H_A = 0 \\qquad \\Sigma F_y = 0 \\Rightarrow V_A - qL - P = 0$$\n$$\\Sigma M_{/A} = 0 \\Rightarrow M_A - qL\\cdot\\frac{L}{2} - P\\cdot L = 0$$`,
        calculs: `$$V_A = ${n(q)}\\times ${n(L)} + ${n(P)} = ${n(VA)}\\ \\text{kN}$$\n$$M_A = \\frac{${n(q)}\\times ${n(L)}^2}{2} + ${n(P)}\\times ${n(L)} = ${n((q * L * L) / 2)} + ${n(P * L)} = ${n(MA)}\\ \\text{kN·m}$$`,
        resultat: `$$V_A = ${n(VA)}\\ \\text{kN} \\qquad M_A = ${n(MA)}\\ \\text{kN·m (anti-horaire)}$$`,
        verification: `Le moment d'encastrement est positif (anti-horaire) : il s'oppose au basculement horaire provoqué par les charges ${ok}. Le moment fléchissant interne en A vaut $M(0) = -M_A = -${n(MA)}$ kN·m : la fibre supérieure est tendue.\n\n${res ? solverLine([{ label: "V_A", value: res.ry, expected: VA, unit: "kN" }, { label: "M_A", value: res.mz, expected: MA, unit: "kN·m" }]) : ""}`,
      },
    };
  },
};

const reactionsOverhang: ExerciseGenerator = {
  id: "reactions-porte-a-faux",
  title: "Réactions d'une poutre à porte-à-faux",
  description: "Une réaction peut être négative : l'appui retient la poutre.",
  chapterId: "m2-reactions",
  level: "intermediaire",
  calc: "réactions",
  skill: "Interpréter le signe d'une réaction",
  generate(seed) {
    const r = R(seed);
    const a = r.pick([4, 5, 6] as const);
    const c = r.pick([1, 1.5, 2, 2.5] as const);
    const L = a + c;
    const q = r.step(2, 10, 1);
    const P = r.step(10, 40, 5);
    const VB = ((q * L * L) / 2 + P * L) / a;
    const VA = q * L + P - VB;
    const model = beam({
      length: L,
      supports: [{ id: "A", x: 0, type: "pin" }, { id: "B", x: a, type: "roller" }],
      loads: [
        { id: "q", kind: "dist", x1: 0, x2: L, q1: q, q2: q },
        { id: "P", kind: "point", x: L, F: P, angle: -90 },
      ],
    });
    const an = analyzeBeam(model);
    const nA = an.built.nodeIdAt(0);
    const nB = an.built.nodeIdAt(a);
    const res = an.result.ok && nA && nB ? an.result.reactions : null;
    return {
      generatorId: this.id,
      seed,
      title: this.title,
      statement: `Une poutre ABC repose sur une articulation en A ($x = 0$) et un appui simple en B ($x = ${n(a)}$ m) ; elle se prolonge en porte-à-faux jusqu'à C ($x = ${n(L)}$ m). Elle porte une charge répartie $q = ${n(q)}$ kN/m sur toute sa longueur et une charge $P = ${n(P)}$ kN en C.\n\nCalculer $V_A$ et $V_B$ (positives vers le haut).`,
      figure: { kind: "beam", model },
      questions: [
        { key: "VA", label: "$V_A$", unit: "kN", answer: VA, hint: "Après avoir trouvé $V_B$ par les moments en A, la somme des forces verticales donne $V_A$. Le résultat peut être négatif." },
        { key: "VB", label: "$V_B$", unit: "kN", answer: VB, hint: "Moments en A : la résultante $qL$ est à $L/2$ de A, la charge $P$ à $L$." },
      ],
      solution: {
        donnees: `- Travée AB : $a = ${n(a)}$ m ; porte-à-faux BC : $c = ${n(c)}$ m ; longueur totale $L = ${n(L)}$ m\n- $q = ${n(q)}$ kN/m sur $[0\\,;\\,L]$, $P = ${n(P)}$ kN en C`,
        schema: `Isostatique ($h = 0$). Résultante de la charge répartie : $R_q = qL = ${n(q * L)}$ kN en $x = L/2 = ${n(L / 2)}$ m.`,
        equations: `$$\\Sigma M_{/A} = 0 \\;\\Rightarrow\\; V_B\\cdot a - qL\\cdot\\frac{L}{2} - P\\cdot L = 0$$\n$$\\Sigma F_y = 0 \\;\\Rightarrow\\; V_A + V_B - qL - P = 0$$`,
        calculs: `$$V_B = \\frac{${n((q * L * L) / 2)} + ${n(P * L)}}{${n(a)}} = ${n(VB)}\\ \\text{kN}$$\n$$V_A = ${n(q * L)} + ${n(P)} - ${n(VB)} = ${n(VA)}\\ \\text{kN}$$`,
        resultat: `$$V_A = ${n(VA)}\\ \\text{kN} \\qquad V_B = ${n(VB)}\\ \\text{kN}$$`,
        verification: `${VA < 0 ? "$V_A < 0$ : le porte-à-faux fait basculer la poutre autour de B et soulève A ; l'articulation doit **retenir** la poutre vers le bas (ancrage nécessaire). " : "$V_A > 0$ : la travée reste suffisamment chargée pour que A soit comprimé. "}$V_B$ dépasse la charge totale ${VB > q * L + P ? "car l'appui B reprend aussi l'effet de levier du porte-à-faux" : ""}.\n\n${res && nA && nB ? solverLine([{ label: "V_A", value: res[nA].ry, expected: VA, unit: "kN" }, { label: "V_B", value: res[nB].ry, expected: VB, unit: "kN" }]) : ""}`,
      },
    };
  },
};

const HYPER_CASES = [
  { sup: ["pin", "roller"] as const, h: 0, label: "articulation en A, appui simple en B" },
  { sup: ["fixed"] as const, h: 0, label: "encastrement en A, extrémité B libre" },
  { sup: ["fixed", "roller"] as const, h: 1, label: "encastrement en A, appui simple en B" },
  { sup: ["fixed", "fixed"] as const, h: 3, label: "encastrement en A et en B" },
  { sup: ["pin", "roller", "roller"] as const, h: 1, label: "articulation en A, appuis simples en B et C" },
  { sup: ["pin", "pin"] as const, h: 1, label: "articulations en A et B" },
  { sup: ["fixed", "pin"] as const, h: 2, label: "encastrement en A, articulation en B" },
  { sup: ["pin", "roller", "roller", "roller"] as const, h: 2, label: "articulation en A, appuis simples en B, C et D" },
];

const hyperstaticity: ExerciseGenerator = {
  id: "hyperstaticite",
  title: "Degré d'hyperstaticité d'une poutre",
  description: "Compter les inconnues de liaison et conclure.",
  chapterId: "m2-liaisons",
  level: "debutant",
  calc: "statique",
  skill: "Calculer un degré d'hyperstaticité",
  generate(seed) {
    const r = R(seed);
    const c = r.pick(HYPER_CASES);
    const L = r.pick([6, 8, 10] as const);
    const unknowns: Record<string, number> = { roller: 1, pin: 2, fixed: 3 };
    const rTot = c.sup.reduce((s, k) => s + unknowns[k], 0);
    const xs = c.sup.length === 1 ? [0] : c.sup.map((_, k) => (L * k) / (c.sup.length - 1));
    const model = beam({
      length: L,
      supports: c.sup.map((type, k) => ({ id: "ABCD"[k], x: xs[k], type })),
      loads: [{ id: "q", kind: "dist", x1: 0, x2: L, q1: 5, q2: 5 }],
    });
    const nature = c.h === 0 ? "isostatique" : `hyperstatique de degré ${c.h}`;
    return {
      generatorId: this.id,
      seed,
      title: this.title,
      statement: `Une poutre droite continue (sans rotule interne) de longueur $${n(L)}$ m est liée au sol par : ${c.label}.\n\nCalculer son degré d'hyperstaticité $h$.`,
      figure: { kind: "beam", model },
      questions: [{ key: "h", label: "Degré d'hyperstaticité $h$", unit: "", answer: c.h, abs: 0.01, rel: 0, hint: "Appui simple : 1 inconnue ; articulation : 2 ; encastrement : 3. Une poutre plane dispose de 3 équations d'équilibre." }],
      solution: {
        donnees: `Liaisons : ${c.label}.`,
        schema: c.sup.map((k, i) => `- ${"ABCD"[i]} : ${k === "roller" ? "appui simple → 1 inconnue" : k === "pin" ? "articulation → 2 inconnues" : "encastrement → 3 inconnues"}`).join("\n"),
        equations: `$$h = r - 3 \\quad\\text{(une seule barre, aucune rotule interne)}$$`,
        calculs: `$$r = ${c.sup.map((k) => unknowns[k]).join(" + ")} = ${rTot} \\qquad h = ${rTot} - 3 = ${c.h}$$`,
        resultat: `$$h = ${c.h}$$ La poutre est **${nature}**.`,
        verification: c.h === 0 ? "Autant d'inconnues que d'équations : les réactions se calculent avec le seul PFS." : `Il manque ${c.h} équation${c.h > 1 ? "s" : ""} : il faut écrire ${c.h > 1 ? "des conditions" : "une condition"} de déformation (méthode des forces ou des déplacements). Le simulateur affiche le même degré pour ce modèle.`,
      },
    };
  },
};

/* ================================================================== */
/*                     MODULE 3 — Sollicitations internes              */
/* ================================================================== */
const internalSection: ExerciseGenerator = {
  id: "torseur-section",
  title: "Torseur de cohésion dans une section",
  description: "Isoler le bon côté de la coupure et appliquer la convention du cours.",
  chapterId: "m3-torseur-cohesion",
  level: "intermediaire",
  calc: "efforts internes",
  skill: "Calculer T et M dans une section",
  generate(seed) {
    const r = R(seed);
    const L = r.pick([5, 6, 8, 10] as const);
    const a = r.step(1.5, L - 1.5, 0.5);
    const P = r.step(10, 50, 5);
    let xs = r.step(0.5, L - 0.5, 0.5);
    if (Math.abs(xs - a) < 0.25) xs = xs + 0.5 <= L - 0.5 ? xs + 0.5 : xs - 0.5;
    const VB = (P * a) / L;
    const VA = P - VB;
    const left = xs < a;
    const T = left ? -VA : VB;
    const M = left ? VA * xs : VB * (L - xs);
    const model = beam({ length: L, supports: [{ id: "A", x: 0, type: "pin" }, { id: "B", x: L, type: "roller" }], loads: [{ id: "P", kind: "point", x: a, F: P, angle: -90 }] });
    const an = analyzeBeam(model);
    const at = an.at(xs);
    return {
      generatorId: this.id,
      seed,
      title: this.title,
      statement: `Une poutre AB de portée $L = ${n(L)}$ m (articulation en A, appui simple en B) porte une charge $P = ${n(P)}$ kN à $a = ${n(a)}$ m de A.\n\nCalculer l'effort tranchant $T$ et le moment fléchissant $M$ dans la section située à $x = ${n(xs)}$ m de A. Convention du cours : torseur de cohésion appliqué à la partie gauche, $\\dfrac{\\mathrm{d}M}{\\mathrm{d}x} = -T$.`,
      figure: { kind: "beam", model },
      questions: [
        { key: "T", label: `$T(${n(xs)})$`, unit: "kN", answer: T, hint: left ? "La partie gauche ne porte que $V_A$ : isolez-la et écrivez l'équilibre avec $N$, $T$, $M$ dans le sens positif." : "La partie droite ne porte que $V_B$ : isolez-la et appliquez l'opposé du torseur ($-N$, $-T$, $-M$)." },
        { key: "M", label: `$M(${n(xs)})$`, unit: "kN·m", answer: M, hint: "Bras de levier de la réaction = distance horizontale entre l'appui et la section." },
      ],
      solution: {
        donnees: `- $L = ${n(L)}$ m, $P = ${n(P)}$ kN en $a = ${n(a)}$ m, section en $x = ${n(xs)}$ m\n- Réactions (PFS) : $V_A = \\dfrac{P(L-a)}{L} = ${n(VA)}$ kN, $V_B = \\dfrac{Pa}{L} = ${n(VB)}$ kN`,
        schema: left
          ? `La section est à gauche de la charge : on isole la **partie gauche** $[0\\,;\\,x]$, qui ne porte que $V_A$. Le torseur s'y applique tel quel : $N$, $T$, $M$.`
          : `La section est à droite de la charge : on isole la **partie droite** $[x\\,;\\,L]$, qui ne porte que $V_B$. C'est l'opposé du torseur qui s'y applique : $-N$, $-T$, $-M$.`,
        equations: left
          ? `$$N(x) = 0 \\qquad T(x) + V_A = 0 \\qquad M(x) - V_A\\cdot x = 0$$`
          : `$$-N(x) = 0 \\qquad -T(x) + V_B = 0 \\qquad -M(x) + V_B\\cdot(L - x) = 0$$`,
        calculs: left
          ? `$$T = -V_A = -${n(VA)}\\ \\text{kN} \\qquad M = V_A\\,x = ${n(VA)}\\times ${n(xs)} = ${n(M)}\\ \\text{kN·m}$$`
          : `$$T = V_B = ${n(VB)}\\ \\text{kN} \\qquad M = V_B\\,(L-x) = ${n(VB)}\\times ${n(L - xs)} = ${n(M)}\\ \\text{kN·m}$$`,
        resultat: `$$T(${n(xs)}) = ${n(T)}\\ \\text{kN} \\qquad M(${n(xs)}) = ${n(M)}\\ \\text{kN·m}$$`,
        verification: `$M > 0$ : fibre inférieure tendue, cohérent avec une poutre sur deux appuis chargée vers le bas. Avec l'autre côté de la coupure on trouverait le même résultat (essayez !).\n\n${solverLine([{ label: "T", value: -at.V, expected: T, unit: "kN" }, { label: "M", value: at.M, expected: M, unit: "kN·m" }])}`,
      },
    };
  },
};

const mmaxUdl: ExerciseGenerator = {
  id: "diagramme-uniforme",
  title: "Diagrammes d'une poutre sous charge uniforme",
  description: "Équations de T(x) et M(x), moment maximal à mi-portée.",
  chapterId: "m3-diagrammes",
  level: "debutant",
  calc: "efforts internes",
  skill: "Établir T(x), M(x) et le moment maximal",
  generate(seed) {
    const r = R(seed);
    const L = r.pick([4, 5, 6, 7, 8] as const);
    const q = r.step(4, 20, 1);
    const VA = (q * L) / 2;
    const T0 = -VA;
    const Mmax = (q * L * L) / 8;
    const model = beam({ length: L, supports: [{ id: "A", x: 0, type: "pin" }, { id: "B", x: L, type: "roller" }], loads: [{ id: "q", kind: "dist", x1: 0, x2: L, q1: q, q2: q }] });
    const an = analyzeBeam(model);
    return {
      generatorId: this.id,
      seed,
      title: this.title,
      statement: `Une poutre AB de portée $L = ${n(L)}$ m, sur appuis simples, porte une charge uniformément répartie $q = ${n(q)}$ kN/m.\n\nDonner l'effort tranchant juste à droite de A, $T(0^+)$, puis le moment fléchissant maximal $M_{max}$. Convention du cours : $\\dfrac{\\mathrm{d}M}{\\mathrm{d}x} = -T$.`,
      figure: { kind: "beam", model },
      questions: [
        { key: "T0", label: "$T(0^+)$", unit: "kN", answer: T0, hint: "Partie gauche isolée juste après A : seule $V_A$ agit. Attention au signe dans la convention du cours." },
        { key: "M", label: "$M_{max}$", unit: "kN·m", answer: Mmax, hint: "Le moment est maximal là où $T$ s'annule, ici au milieu par symétrie." },
      ],
      solution: {
        donnees: `- $L = ${n(L)}$ m, $q = ${n(q)}$ kN/m sur toute la portée\n- Par symétrie : $V_A = V_B = \\dfrac{qL}{2} = ${n(VA)}$ kN`,
        schema: "Une seule coupure suffit (pas de discontinuité de chargement). On isole la partie gauche $[0\\,;\\,x]$ : elle porte $V_A$ et la charge $q\\,x$, de résultante appliquée en $x/2$.",
        equations: `$$T(x) + V_A - q\\,x = 0 \\qquad M(x) - V_A\\,x + q\\,x\\cdot\\frac{x}{2} = 0$$`,
        calculs: `$$T(x) = q\\,x - \\frac{qL}{2} = ${n(q)}\\,x - ${n(VA)} \\qquad M(x) = \\frac{qL}{2}x - \\frac{q\\,x^2}{2} = ${n(VA)}\\,x - ${n(q / 2)}\\,x^2$$\n$$T(0^+) = -${n(VA)}\\ \\text{kN}$$\n$T$ s'annule en $x_0 = L/2 = ${n(L / 2)}$ m, où\n$$M_{max} = \\frac{qL^2}{8} = \\frac{${n(q)}\\times ${n(L)}^2}{8} = ${n(Mmax)}\\ \\text{kN·m}$$`,
        resultat: `$$T(0^+) = ${n(T0)}\\ \\text{kN} \\qquad M_{max} = ${n(Mmax)}\\ \\text{kN·m en } x = ${n(L / 2)}\\ \\text{m}$$`,
        verification: `Contrôle $\\dfrac{\\mathrm{d}M}{\\mathrm{d}x} = ${n(VA)} - ${n(q)}\\,x = -T(x)$ ${ok}. $M(0) = M(L) = 0$ aux appuis simples d'extrémité ${ok}.\n\n${solverLine([{ label: "T(0^+)", value: -an.at(0, "right").V, expected: T0, unit: "kN" }, { label: "M_{max}", value: an.extremes.Mmax.value, expected: Mmax, unit: "kN·m" }])}`,
      },
    };
  },
};

const mmaxMixed: ExerciseGenerator = {
  id: "moment-max-mixte",
  title: "Moment maximal — charge répartie et charge ponctuelle",
  description: "Trouver où T s'annule (ou change de signe) pour obtenir M max.",
  chapterId: "m3-diagrammes",
  level: "avance",
  calc: "efforts internes",
  skill: "Localiser le moment maximal",
  generate(seed) {
    const r = R(seed);
    const L = r.pick([6, 7, 8, 9, 10] as const);
    const q = r.step(4, 12, 1);
    const P = r.step(10, 40, 5);
    const a = r.step(1.5, L - 1.5, 0.5);
    const VA = ((q * L * L) / 2 + P * (L - a)) / L;
    let x0: number;
    let Mx: number;
    let caseTxt: string;
    if (q * a - VA >= 0) {
      x0 = VA / q;
      Mx = VA * x0 - (q * x0 * x0) / 2;
      caseTxt = `Sur $[0\\,;\\,a[$ : $T(x) = q\\,x - V_A$ s'annule en $x_0 = V_A/q = ${n(x0, 3)}$ m $< a$.`;
    } else if (q * a - VA + P > 0) {
      x0 = a;
      Mx = VA * a - (q * a * a) / 2;
      caseTxt = `$T(a^-) = q\\,a - V_A = ${n(q * a - VA)}$ kN $< 0$ et $T(a^+) = T(a^-) + P = ${n(q * a - VA + P)}$ kN $> 0$ : $T$ change de signe **par un saut** au droit de la charge ponctuelle. Le moment est maximal en $x_0 = a$.`;
    } else {
      x0 = (VA - P) / q;
      Mx = VA * x0 - (q * x0 * x0) / 2 - P * (x0 - a);
      caseTxt = `Sur $]a\\,;\\,L]$ : $T(x) = q\\,x - V_A + P$ s'annule en $x_0 = (V_A - P)/q = ${n(x0, 3)}$ m $> a$.`;
    }
    const model = beam({
      length: L,
      supports: [{ id: "A", x: 0, type: "pin" }, { id: "B", x: L, type: "roller" }],
      loads: [
        { id: "q", kind: "dist", x1: 0, x2: L, q1: q, q2: q },
        { id: "P", kind: "point", x: a, F: P, angle: -90 },
      ],
    });
    const an = analyzeBeam(model);
    return {
      generatorId: this.id,
      seed,
      title: this.title,
      statement: `Une poutre AB de portée $L = ${n(L)}$ m (appuis simples) porte une charge répartie $q = ${n(q)}$ kN/m sur toute sa longueur et une charge ponctuelle $P = ${n(P)}$ kN à $a = ${n(a)}$ m de A.\n\nDéterminer la position $x_0$ du moment maximal et sa valeur $M_{max}$.`,
      figure: { kind: "beam", model },
      questions: [
        { key: "x0", label: "Position $x_0$", unit: "m", answer: x0, hint: "Écrivez $T(x)$ sur chaque tronçon et cherchez où il change de signe — éventuellement par un saut au droit de $P$." },
        { key: "M", label: "$M_{max}$", unit: "kN·m", answer: Mx, hint: "Évaluez $M(x)$ au point trouvé, avec l'expression du bon tronçon." },
      ],
      solution: {
        donnees: `- $L = ${n(L)}$ m ; $q = ${n(q)}$ kN/m ; $P = ${n(P)}$ kN en $a = ${n(a)}$ m`,
        schema: "Deux tronçons, $[0\\,;\\,a[$ et $]a\\,;\\,L]$, séparés par la charge ponctuelle. Partie gauche isolée dans les deux cas.",
        equations: `$$\\Sigma M_{/B} = 0 \\Rightarrow V_A = \\frac{qL^2/2 + P(L-a)}{L} = ${n(VA, 3)}\\ \\text{kN}$$\n$$x < a :\\; T(x) = q\\,x - V_A,\\quad M(x) = V_A\\,x - \\frac{q\\,x^2}{2}$$\n$$x > a :\\; T(x) = q\\,x - V_A + P,\\quad M(x) = V_A\\,x - \\frac{q\\,x^2}{2} - P\\,(x-a)$$`,
        calculs: `${caseTxt}\n$$M_{max} = M(x_0) = ${n(Mx, 3)}\\ \\text{kN·m}$$`,
        resultat: `$$x_0 = ${n(x0, 3)}\\ \\text{m} \\qquad M_{max} = ${n(Mx)}\\ \\text{kN·m}$$`,
        verification: `Le maximum se trouve bien entre les appuis et $M_{max}$ dépasse les valeurs de $M$ aux points voisins.\n\n${solverLine([{ label: "x_0", value: an.extremes.Mmax.x, expected: x0, unit: "m", d: 3 }, { label: "M_{max}", value: an.extremes.Mmax.value, expected: Mx, unit: "kN·m" }])}`,
      },
    };
  },
};

/* ================================================================== */
/*                          MODULE 4 — Structures                      */
/* ================================================================== */
const resultantDist: ExerciseGenerator = {
  id: "resultante-repartie",
  title: "Résultante d'une charge répartie trapézoïdale",
  description: "Intensité et position de la résultante.",
  chapterId: "m4-charges-reparties",
  level: "debutant",
  calc: "charges",
  skill: "Remplacer une charge répartie par sa résultante",
  generate(seed) {
    const r = R(seed);
    const l = r.step(2, 6, 0.5);
    const q1 = r.pick([0, 2, 4, 5, 6] as const);
    let q2 = r.step(4, 16, 2);
    if (q2 === q1) q2 += 2;
    const Rr = ((q1 + q2) * l) / 2;
    const xG = (l * (q1 + 2 * q2)) / (3 * (q1 + q2));
    const R1 = q1 * l;
    const R2 = ((q2 - q1) * l) / 2;
    return {
      generatorId: this.id,
      seed,
      title: this.title,
      statement: `Une charge répartie varie linéairement de $q_1 = ${n(q1)}$ kN/m (à gauche) à $q_2 = ${n(q2)}$ kN/m (à droite) sur une longueur $l = ${n(l)}$ m.\n\nCalculer l'intensité $R$ de sa résultante et la distance $x_G$ de son point d'application à l'extrémité gauche.`,
      figure: { kind: "trapezoid", l, q1, q2 },
      questions: [
        { key: "R", label: "Résultante $R$", unit: "kN", answer: Rr, hint: "La résultante est l'aire du diagramme de charge (trapèze)." },
        { key: "xG", label: "Position $x_G$", unit: "m", answer: xG, hint: "Décomposez en un rectangle et un triangle, puis écrivez les moments par rapport à l'extrémité gauche." },
      ],
      solution: {
        donnees: `- $q_1 = ${n(q1)}$ kN/m, $q_2 = ${n(q2)}$ kN/m, $l = ${n(l)}$ m`,
        schema: `Le trapèze se décompose en un rectangle de hauteur $q_1$ (résultante en $l/2$) et un triangle de hauteur $q_2 - q_1$ (résultante en $2l/3$, côté le plus chargé).`,
        equations: `$$R = \\frac{q_1 + q_2}{2}\\,l \\qquad R\\cdot x_G = R_1\\cdot\\frac{l}{2} + R_2\\cdot\\frac{2l}{3}$$`,
        calculs: `$$R_1 = q_1\\,l = ${n(R1)}\\ \\text{kN} \\qquad R_2 = \\frac{(q_2 - q_1)\\,l}{2} = ${n(R2)}\\ \\text{kN} \\qquad R = R_1 + R_2 = ${n(Rr)}\\ \\text{kN}$$\n$$x_G = \\frac{${n(R1)}\\times ${n(l / 2, 3)} + ${n(R2)}\\times ${n((2 * l) / 3, 3)}}{${n(Rr)}} = ${n(xG, 3)}\\ \\text{m}$$`,
        resultat: `$$R = ${n(Rr)}\\ \\text{kN} \\qquad x_G = ${n(xG, 3)}\\ \\text{m}$$`,
        verification: `Formule directe : $x_G = \\dfrac{l\\,(q_1 + 2q_2)}{3\\,(q_1+q_2)} = ${n(xG, 3)}$ m ${ok}. La résultante est décalée vers le côté le plus chargé : $l/2 = ${n(l / 2)} < x_G \\le 2l/3 = ${n((2 * l) / 3, 3)}$ m ${ok}`,
      },
    };
  },
};

const trussTriangle: ExerciseGenerator = {
  id: "treillis-noeuds",
  title: "Treillis triangulaire — méthode des nœuds",
  description: "Efforts dans les trois barres d'une ferme simple.",
  chapterId: "m4-treillis",
  level: "intermediaire",
  calc: "treillis",
  skill: "Appliquer la méthode des nœuds",
  generate(seed) {
    const r = R(seed);
    const L = r.pick([4, 5, 6, 8] as const);
    const c = r.step(1.5, L - 1.5, 0.5);
    const h = r.pick([1.5, 2, 2.5, 3] as const);
    const P = r.step(10, 50, 5);
    const VA = (P * (L - c)) / L;
    const VB = (P * c) / L;
    const lAC = Math.hypot(c, h);
    const lBC = Math.hypot(L - c, h);
    const NAC = -VA * (lAC / h);
    const NBC = -VB * (lBC / h);
    const NAB = (VA * c) / h;
    const bar = (id: string, i: string, j: string) => ({ id, i, j, E: 210e6, A: 10e-4, I: 1e-6, releaseI: true, releaseJ: true });
    const structure = {
      nodes: [
        { id: "A", x: 0, y: 0, support: "pin" as const },
        { id: "B", x: L, y: 0, support: "roller" as const },
        { id: "C", x: c, y: h },
      ],
      members: [bar("AB", "A", "B"), bar("AC", "A", "C"), bar("BC", "B", "C")],
      loads: [{ kind: "nodal" as const, node: "C", fx: 0, fy: -P, mz: 0 }],
    };
    const res = analyze(structure);
    return {
      generatorId: this.id,
      seed,
      title: this.title,
      statement: `Une ferme triangulaire ABC est formée de trois barres bi-articulées. A ($x = 0$) est une articulation, B ($x = ${n(L)}$ m) un appui simple. Le nœud C est à $x = ${n(c)}$ m et à la hauteur $h = ${n(h)}$ m ; il porte une charge verticale $P = ${n(P)}$ kN vers le bas.\n\nCalculer les efforts normaux $N_{AC}$, $N_{BC}$ et $N_{AB}$ (positifs en traction).`,
      figure: { kind: "structure", structure },
      questions: [
        { key: "AC", label: "$N_{AC}$", unit: "kN", answer: NAC, hint: "Nœud A : la seule barre ayant une composante verticale est AC ; elle équilibre $V_A$." },
        { key: "BC", label: "$N_{BC}$", unit: "kN", answer: NBC, hint: "Même raisonnement au nœud B." },
        { key: "AB", label: "$N_{AB}$", unit: "kN", answer: NAB, hint: "Nœud A, équation horizontale : $N_{AB}$ équilibre la composante horizontale de $N_{AC}$." },
      ],
      solution: {
        donnees: `- $L = ${n(L)}$ m, C en $(${n(c)}\\,;\\,${n(h)})$ m, $P = ${n(P)}$ kN\n- Longueurs : $AC = ${n(lAC, 3)}$ m, $BC = ${n(lBC, 3)}$ m`,
        schema: `Treillis isostatique : $m + r = 3 + 3 = 2n = 6$. Réactions (moments en A puis en B) : $V_B = \\dfrac{Pc}{L} = ${n(VB)}$ kN, $V_A = ${n(VA)}$ kN, $H_A = 0$. Chaque barre exerce sur un nœud une force dirigée vers la barre si elle est tendue (convention : on dessine $N$ « sortant » du nœud).`,
        equations: `Nœud A : $$\\Sigma F_y = 0:\\; V_A + N_{AC}\\,\\frac{h}{AC} = 0 \\qquad \\Sigma F_x = 0:\\; N_{AB} + N_{AC}\\,\\frac{c}{AC} = 0$$\nNœud B : $$\\Sigma F_y = 0:\\; V_B + N_{BC}\\,\\frac{h}{BC} = 0$$`,
        calculs: `$$N_{AC} = -V_A\\,\\frac{AC}{h} = -${n(VA)}\\times\\frac{${n(lAC, 3)}}{${n(h)}} = ${n(NAC)}\\ \\text{kN}$$\n$$N_{BC} = -V_B\\,\\frac{BC}{h} = ${n(NBC)}\\ \\text{kN} \\qquad N_{AB} = -N_{AC}\\,\\frac{c}{AC} = ${n(NAB)}\\ \\text{kN}$$`,
        resultat: `$$N_{AC} = ${n(NAC)}\\ \\text{kN (compression)} \\quad N_{BC} = ${n(NBC)}\\ \\text{kN (compression)} \\quad N_{AB} = ${n(NAB)}\\ \\text{kN (traction)}$$`,
        verification: `Nœud B, équation horizontale (non utilisée) : $-N_{AB} - N_{BC}\\,\\dfrac{L-c}{BC} = ${n(-NAB - (NBC * (L - c)) / lBC, 4)}$ ${ok}. Les arbalétriers sont comprimés, l'entrait est tendu : c'est le fonctionnement attendu d'une ferme.\n\n${res.ok ? solverLine([{ label: "N_{AC}", value: res.members.AC.forcesAt(0.1).N, expected: NAC, unit: "kN" }, { label: "N_{BC}", value: res.members.BC.forcesAt(0.1).N, expected: NBC, unit: "kN" }, { label: "N_{AB}", value: res.members.AB.forcesAt(0.1).N, expected: NAB, unit: "kN" }]) : ""}`,
      },
    };
  },
};

/* ================================================================== */
/*                    MODULE 5 — Résistance des matériaux              */
/* ================================================================== */
const tension: ExerciseGenerator = {
  id: "traction-tirant",
  title: "Contrainte et allongement d'un tirant",
  description: "σ = N/A et loi de Hooke ΔL = NL/(EA).",
  chapterId: "m5-traction",
  level: "debutant",
  calc: "contraintes",
  skill: "Calculer une contrainte normale et un allongement",
  generate(seed) {
    const r = R(seed);
    const d = r.pick([12, 16, 20, 25, 32] as const);
    const N = r.step(20, 120, 5);
    const L = r.step(2, 6, 0.5);
    const E = 210000;
    const A = (Math.PI * d * d) / 4;
    const sigma = (N * 1000) / A;
    const dL = (N * 1000 * L * 1000) / (E * A);
    return {
      generatorId: this.id,
      seed,
      title: this.title,
      statement: `Un tirant en acier (E = 210 000 MPa) de section circulaire pleine, de diamètre $d = ${d}$ mm et de longueur $L = ${n(L)}$ m, est soumis à un effort de traction $N = ${n(N)}$ kN.\n\nCalculer l'aire $A$, la contrainte normale $\\sigma$ et l'allongement $\\Delta L$.`,
      questions: [
        { key: "A", label: "Aire $A$", unit: "mm²", answer: A, hint: "$A = \\pi d^2/4$, avec $d$ en mm." },
        { key: "s", label: "Contrainte $\\sigma$", unit: "MPa", answer: sigma, hint: "$\\sigma = N/A$ avec $N$ en newtons et $A$ en mm² donne des MPa." },
        { key: "dL", label: "Allongement $\\Delta L$", unit: "mm", answer: dL, hint: "Loi de Hooke : $\\varepsilon = \\sigma/E$ et $\\Delta L = \\varepsilon\\,L$." },
      ],
      solution: {
        donnees: `- $d = ${d}$ mm, $L = ${n(L)}$ m $= ${n(L * 1000, 0)}$ mm\n- $N = ${n(N)}$ kN $= ${n(N * 1000, 0)}$ N, $E = 210\\,000$ MPa`,
        schema: "Barre en traction simple : l'effort normal est constant, la contrainte est uniforme dans la section.",
        equations: `$$A = \\frac{\\pi d^2}{4} \\qquad \\sigma = \\frac{N}{A} \\qquad \\Delta L = \\frac{N\\,L}{E\\,A} = \\frac{\\sigma}{E}\\,L$$`,
        calculs: `$$A = \\frac{\\pi\\times ${d}^2}{4} = ${n(A, 1)}\\ \\text{mm}^2$$\n$$\\sigma = \\frac{${n(N * 1000, 0)}}{${n(A, 1)}} = ${n(sigma, 1)}\\ \\text{MPa}$$\n$$\\Delta L = \\frac{${n(sigma, 1)}}{210\\,000}\\times ${n(L * 1000, 0)} = ${n(dL, 3)}\\ \\text{mm}$$`,
        resultat: `$$A = ${n(A, 1)}\\ \\text{mm}^2 \\qquad \\sigma = ${n(sigma, 1)}\\ \\text{MPa} \\qquad \\Delta L = ${n(dL, 2)}\\ \\text{mm}$$`,
        verification: `Déformation $\\varepsilon = \\sigma/E = ${n((sigma / E) * 1000, 3)}$ ‰ : de l'ordre du millième, typique de l'acier en service ${ok}. ${sigma > 235 ? "Attention : $\\sigma$ dépasse $f_y = 235$ MPa d'un acier S235." : "$\\sigma < f_y = 235$ MPa (acier S235)."}`,
      },
    };
  },
};

const bending: ExerciseGenerator = {
  id: "flexion-contrainte",
  title: "Contrainte maximale de flexion (poutre en bois)",
  description: "M max, module de flexion W = bh²/6, σ = M/W.",
  chapterId: "m5-flexion",
  level: "intermediaire",
  calc: "contraintes",
  skill: "Vérifier une section en flexion",
  generate(seed) {
    const r = R(seed);
    const sec = r.pick([
      [8, 20],
      [10, 22],
      [12, 24],
      [10, 26],
      [7.5, 22.5],
    ] as const);
    const [b, h] = sec;
    const L = r.step(3, 5, 0.5);
    const q = r.step(1.5, 5, 0.5);
    const M = (q * L * L) / 8;
    const I = (b * h ** 3) / 12;
    const W = (b * h * h) / 6;
    const sigma = (M * 1e6) / (W * 1e3);
    const model = beam({ length: L, supports: [{ id: "A", x: 0, type: "pin" }, { id: "B", x: L, type: "roller" }], loads: [{ id: "q", kind: "dist", x1: 0, x2: L, q1: q, q2: q }] });
    return {
      generatorId: this.id,
      seed,
      title: this.title,
      statement: `Une solive en bois massif C24 de section rectangulaire $b\\times h = ${n(b, 1)}\\times ${n(h, 1)}$ cm, de portée $L = ${n(L)}$ m sur appuis simples, porte une charge uniformément répartie $q = ${n(q)}$ kN/m.\n\nCalculer le moment maximal, le module de flexion $W$ et la contrainte normale maximale $\\sigma_{max}$.`,
      figure: { kind: "section", b, h },
      questions: [
        { key: "M", label: "$M_{max}$", unit: "kN·m", answer: M, hint: "Poutre sur deux appuis sous charge uniforme : $M_{max} = qL^2/8$." },
        { key: "W", label: "$W = I/v$", unit: "cm³", answer: W, hint: "Pour un rectangle, $I = bh^3/12$ et $v = h/2$." },
        { key: "s", label: "$\\sigma_{max}$", unit: "MPa", answer: sigma, hint: "$\\sigma = M/W$ ; convertissez M en N·mm et W en mm³." },
      ],
      solution: {
        donnees: `- $b = ${n(b, 1)}$ cm, $h = ${n(h, 1)}$ cm\n- $L = ${n(L)}$ m, $q = ${n(q)}$ kN/m`,
        schema: "Poutre isostatique sur deux appuis ; la section la plus sollicitée est à mi-portée. Formule de Navier : $\\sigma(y) = \\dfrac{M\\,y}{I}$, maximale sur les fibres extrêmes ($y = \\pm h/2$).",
        equations: `$$M_{max} = \\frac{qL^2}{8} \\qquad I = \\frac{b\\,h^3}{12} \\qquad W = \\frac{I}{v} = \\frac{b\\,h^2}{6} \\qquad \\sigma_{max} = \\frac{M_{max}}{W}$$`,
        calculs: `$$M_{max} = \\frac{${n(q)}\\times ${n(L)}^2}{8} = ${n(M, 3)}\\ \\text{kN·m}$$\n$$I = \\frac{${n(b, 1)}\\times ${n(h, 1)}^3}{12} = ${n(I, 0)}\\ \\text{cm}^4 \\qquad W = \\frac{${n(b, 1)}\\times ${n(h, 1)}^2}{6} = ${n(W, 1)}\\ \\text{cm}^3$$\n$$\\sigma_{max} = \\frac{${n(M, 3)}\\times 10^6\\ \\text{N·mm}}{${n(W, 1)}\\times 10^3\\ \\text{mm}^3} = ${n(sigma, 2)}\\ \\text{MPa}$$`,
        resultat: `$$M_{max} = ${n(M, 2)}\\ \\text{kN·m} \\qquad W = ${n(W, 1)}\\ \\text{cm}^3 \\qquad \\sigma_{max} = ${n(sigma, 2)}\\ \\text{MPa}$$`,
        verification: `Fibre inférieure tendue, fibre supérieure comprimée, $\\sigma = 0$ sur l'axe neutre. Ordre de grandeur : à comparer à $f_{m,k} = 24$ MPa (bois C24) — la vérification réglementaire (Eurocode 5) applique en plus des coefficients partiels et de durée de charge. La section ${sigma < 24 ? "reste sous" : "dépasse"} la résistance caractéristique.\n\n${(() => {
          const an = analyzeBeam(model);
          return solverLine([{ label: "M_{max}", value: an.extremes.Mmax.value, expected: M, unit: "kN·m", d: 3 }]);
        })()}`,
      },
    };
  },
};

const IPE_I: Record<string, number> = { "IPE 200": 1943, "IPE 240": 3892, "IPE 270": 5790, "IPE 300": 8356 };

const deflection: ExerciseGenerator = {
  id: "fleche-uniforme",
  title: "Flèche d'une poutre en acier",
  description: "Formulaire 5qL⁴/384EI et critère L/300.",
  chapterId: "m5-fleche",
  level: "intermediaire",
  calc: "déformations",
  skill: "Calculer et vérifier une flèche",
  generate(seed) {
    const r = R(seed);
    const prof = r.pick(Object.keys(IPE_I));
    const I = IPE_I[prof];
    const L = r.step(4, 8, 0.5);
    const q = r.step(5, 20, 1);
    const E = 210000;
    const f = (5 * q * (L * 1000) ** 4) / (384 * E * I * 1e4);
    const fadm = (L * 1000) / 300;
    const model: BeamModel = { length: L, E: 210e6, A: 50e-4, I: I * 1e-8, hinges: [], supports: [{ id: "A", x: 0, type: "pin" }, { id: "B", x: L, type: "roller" }], loads: [{ id: "q", kind: "dist", x1: 0, x2: L, q1: q, q2: q }] };
    const an = analyzeBeam(model);
    return {
      generatorId: this.id,
      seed,
      title: this.title,
      statement: `Une poutre ${prof} ($I_y = ${n(I, 0)}$ cm⁴, $E = 210\\,000$ MPa), de portée $L = ${n(L)}$ m sur appuis simples, porte une charge de service uniformément répartie $q = ${n(q)}$ kN/m.\n\nCalculer la flèche à mi-portée $f$ et la flèche admissible $L/300$. La poutre est-elle vérifiée ?`,
      figure: { kind: "beam", model },
      questions: [
        { key: "f", label: "Flèche $f$", unit: "mm", answer: f, hint: "Utilisez des unités cohérentes : N/mm, mm, MPa et mm⁴." },
        { key: "fadm", label: "Flèche admissible $L/300$", unit: "mm", answer: fadm, hint: "Exprimez $L$ en millimètres." },
      ],
      solution: {
        donnees: `- ${prof} : $I = ${n(I, 0)}$ cm⁴ $= ${n(I * 1e4, 0)}$ mm⁴, $E = 210\\,000$ MPa\n- $L = ${n(L)}$ m $= ${n(L * 1000, 0)}$ mm, $q = ${n(q)}$ kN/m $= ${n(q)}$ N/mm`,
        schema: "Poutre sur deux appuis sous charge uniforme : la déformée est symétrique, la flèche maximale est à mi-portée.",
        equations: `$$f = \\frac{5\\,q\\,L^4}{384\\,E\\,I} \\qquad f_{adm} = \\frac{L}{300}$$`,
        calculs: `$$f = \\frac{5\\times ${n(q)}\\times ${n(L * 1000, 0)}^4}{384\\times 210\\,000\\times ${n(I * 1e4, 0)}} = ${n(f, 2)}\\ \\text{mm}$$\n$$f_{adm} = \\frac{${n(L * 1000, 0)}}{300} = ${n(fadm, 2)}\\ \\text{mm}$$`,
        resultat: `$$f = ${n(f, 2)}\\ \\text{mm} \\qquad f_{adm} = ${n(fadm, 2)}\\ \\text{mm}$$ ${f <= fadm ? "$f \\le L/300$ : **la poutre est vérifiée** vis-à-vis de ce critère." : "$f > L/300$ : **la poutre n'est pas vérifiée** ; il faut un profilé plus raide (I plus grand)."}`,
        verification: `La flèche varie comme $L^4$ : doubler la portée multiplie la flèche par 16. Elle est inversement proportionnelle à $EI$.\n\n${solverLine([{ label: "f", value: -an.extremes.vmin.value * 1000, expected: f, unit: "mm" }])}`,
      },
    };
  },
};

/* ================================================================== */
/*                        MODULE 6 — Approfondissement                 */
/* ================================================================== */
const EULER_K = {
  "bi-articule": { K: 1, label: "articulé aux deux extrémités" },
  "encastre-libre": { K: 2, label: "encastré en pied et libre en tête" },
  "encastre-articule": { K: 0.7, label: "encastré en pied et articulé en tête" },
  "bi-encastre": { K: 0.5, label: "encastré aux deux extrémités" },
} as const;

const euler: ExerciseGenerator = {
  id: "flambement-euler",
  title: "Charge critique d'Euler d'un poteau en bois",
  description: "Longueur de flambement, inertie minimale, charge critique.",
  chapterId: "m6-flambement",
  level: "avance",
  calc: "stabilité",
  skill: "Calculer une charge critique de flambement",
  generate(seed) {
    const r = R(seed);
    const [b, h] = r.pick([
      [10, 10],
      [10, 15],
      [12, 12],
      [12, 20],
      [15, 15],
    ] as const);
    const L = r.step(2.5, 4, 0.5);
    const support = r.pick(Object.keys(EULER_K) as (keyof typeof EULER_K)[]);
    const { K, label } = EULER_K[support];
    const E = 11000;
    const Lf = K * L;
    const Imin = (h * b ** 3) / 12;
    const Ncr = (Math.PI ** 2 * E * Imin * 1e4) / (Lf * 1000) ** 2 / 1000;
    return {
      generatorId: this.id,
      seed,
      title: this.title,
      statement: `Un poteau en bois massif ($E = 11\\,000$ MPa) de section $${n(b, 0)}\\times ${n(h, 0)}$ cm et de hauteur $L = ${n(L)}$ m est ${label}.\n\nDéterminer la longueur de flambement $L_f$, le moment quadratique minimal $I_{min}$ et la charge critique d'Euler $N_{cr}$.`,
      figure: { kind: "column", L, support, b, h },
      questions: [
        { key: "Lf", label: "$L_f$", unit: "m", answer: Lf, hint: "Articulé–articulé : $L_f = L$ ; encastré–libre : $2L$ ; encastré–articulé : $0{,}7L$ ; encastré–encastré : $0{,}5L$." },
        { key: "I", label: "$I_{min}$", unit: "cm⁴", answer: Imin, hint: "Le poteau flambe autour de l'axe de plus faible inertie : prenez la petite dimension au cube." },
        { key: "N", label: "$N_{cr}$", unit: "kN", answer: Ncr, hint: "$N_{cr} = \\pi^2 E I_{min} / L_f^2$, en N et mm." },
      ],
      solution: {
        donnees: `- Section $b\\times h = ${n(b, 0)}\\times ${n(h, 0)}$ cm (petite dimension $b$)\n- $L = ${n(L)}$ m, liaisons : ${label} ; $E = 11\\,000$ MPa`,
        schema: `Le poteau comprimé flambe dans le plan de plus faible rigidité. Coefficient de longueur de flambement $K = ${n(K, 1)}$.`,
        equations: `$$L_f = K\\,L \\qquad I_{min} = \\frac{h\\,b^3}{12} \\qquad N_{cr} = \\frac{\\pi^2\\,E\\,I_{min}}{L_f^2}$$`,
        calculs: `$$L_f = ${n(K, 1)}\\times ${n(L)} = ${n(Lf)}\\ \\text{m}$$\n$$I_{min} = \\frac{${n(h, 0)}\\times ${n(b, 0)}^3}{12} = ${n(Imin, 1)}\\ \\text{cm}^4$$\n$$N_{cr} = \\frac{\\pi^2\\times 11\\,000\\times ${n(Imin * 1e4, 0)}}{${n(Lf * 1000, 0)}^2} = ${n(Ncr * 1000, 0)}\\ \\text{N} = ${n(Ncr, 1)}\\ \\text{kN}$$`,
        resultat: `$$L_f = ${n(Lf)}\\ \\text{m} \\qquad I_{min} = ${n(Imin, 1)}\\ \\text{cm}^4 \\qquad N_{cr} = ${n(Ncr, 1)}\\ \\text{kN}$$`,
        verification: `$N_{cr}$ varie comme $1/L_f^2$ : ${K > 1 ? "l'encastrement–libre est la condition la plus défavorable." : K < 1 ? "les encastrements réduisent la longueur de flambement et augmentent fortement la charge critique." : "cas de référence d'Euler."} La charge critique est une limite théorique : le dimensionnement réglementaire (Eurocode 5) applique un coefficient de flambement $k_c$ sur la résistance en compression.`,
      },
    };
  },
};

const proppedCantilever: ExerciseGenerator = {
  id: "encastree-appuyee",
  title: "Poutre encastrée–appuyée (méthode des forces)",
  description: "Lever l'hyperstaticité par une condition de flèche nulle.",
  chapterId: "m6-methode-forces",
  level: "avance",
  calc: "réactions",
  skill: "Résoudre une structure hyperstatique de degré 1",
  generate(seed) {
    const r = R(seed);
    const L = r.pick([4, 5, 6, 7, 8] as const);
    const q = r.step(5, 20, 1);
    const RB = (3 * q * L) / 8;
    const M0 = (-q * L * L) / 8;
    const model = beam({ length: L, supports: [{ id: "A", x: 0, type: "fixed" }, { id: "B", x: L, type: "roller" }], loads: [{ id: "q", kind: "dist", x1: 0, x2: L, q1: q, q2: q }] });
    const an = analyzeBeam(model);
    return {
      generatorId: this.id,
      seed,
      title: this.title,
      statement: `Une poutre AB de portée $L = ${n(L)}$ m est encastrée en A et repose sur un appui simple en B. Elle porte une charge uniformément répartie $q = ${n(q)}$ kN/m. $EI$ est constant.\n\nCalculer la réaction $V_B$ par la méthode des forces, puis le moment fléchissant à l'encastrement $M(0)$.`,
      figure: { kind: "beam", model },
      questions: [
        { key: "VB", label: "$V_B$", unit: "kN", answer: RB, hint: "Supprimez l'appui B : la console sous $q$ fléchit de $qL^4/8EI$ en B ; $V_B$ seule la relève de $V_B L^3/3EI$. La flèche réelle en B est nulle." },
        { key: "M0", label: "$M(0)$", unit: "kN·m", answer: M0, hint: "Partie droite isolée depuis la section A : $V_B$ et toute la charge $qL$." },
      ],
      solution: {
        donnees: `- $L = ${n(L)}$ m, $q = ${n(q)}$ kN/m, $EI$ constant`,
        schema: "Liaisons : 3 + 1 = 4 inconnues, $h = 1$. Structure isostatique associée : la console encastrée en A, sur laquelle on applique $q$ et l'inconnue hyperstatique $V_B$.",
        equations: `Condition de compatibilité : flèche nulle en B.\n$$f_B = -\\frac{q\\,L^4}{8\\,EI} + \\frac{V_B\\,L^3}{3\\,EI} = 0$$`,
        calculs: `$$V_B = \\frac{3\\,q\\,L}{8} = \\frac{3\\times ${n(q)}\\times ${n(L)}}{8} = ${n(RB)}\\ \\text{kN}$$\nPartie droite de la section A ($x = 0^+$) : $-M(0) + V_B\\,L - qL\\cdot\\dfrac{L}{2} = 0$\n$$M(0) = V_B\\,L - \\frac{qL^2}{2} = -\\frac{qL^2}{8} = ${n(M0)}\\ \\text{kN·m}$$`,
        resultat: `$$V_B = ${n(RB)}\\ \\text{kN} \\qquad V_A = \\frac{5qL}{8} = ${n((5 * q * L) / 8)}\\ \\text{kN} \\qquad M(0) = ${n(M0)}\\ \\text{kN·m}$$`,
        verification: `$V_A + V_B = qL = ${n(q * L)}$ kN ${ok}. Le moment en travée vaut au plus $9qL^2/128 = ${n((9 * q * L * L) / 128)}$ kN·m, inférieur en valeur absolue au moment sur l'encastrement : c'est l'encastrement qui dimensionne.\n\n${an.result.ok ? solverLine([{ label: "V_B", value: an.result.reactions.N1.ry, expected: RB, unit: "kN" }, { label: "M(0)", value: an.at(0, "right").M, expected: M0, unit: "kN·m" }]) : ""}`,
      },
    };
  },
};

export const GENERATORS: ExerciseGenerator[] = [
  unitConversion,
  momentForce,
  pfsLever,
  hyperstaticity,
  reactionsPoint,
  reactionsCantilever,
  reactionsMixed,
  reactionsOverhang,
  internalSection,
  mmaxUdl,
  mmaxMixed,
  resultantDist,
  trussTriangle,
  tension,
  bending,
  deflection,
  euler,
  proppedCantilever,
];

export function findGenerator(id: string) {
  return GENERATORS.find((g) => g.id === id);
}

export function generate(id: string, seed: number): GeneratedExercise | undefined {
  return findGenerator(id)?.generate(seed);
}

/** Correction d'une réponse numérique (tolérance relative 1 % par défaut). */
export function checkAnswer(value: number, expected: number, rel = 0.01, abs?: number): boolean {
  const tolAbs = abs ?? Math.max(0.01, 0.002 * Math.abs(expected));
  return Math.abs(value - expected) <= Math.max(rel * Math.abs(expected), tolAbs);
}

export function randomSeed() {
  return Math.floor(Math.random() * 1_000_000) + 1;
}
