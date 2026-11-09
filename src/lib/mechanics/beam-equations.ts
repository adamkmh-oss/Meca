/**
 * Calcul « à la main » des poutres isostatiques (équations de la statique),
 * indépendant du solveur matriciel : il sert à afficher les étapes de calcul
 * et à vérifier le solveur (double calcul).
 *
 * Conventions : forces positives vers le haut / vers la droite, moments
 * positifs dans le sens anti-horaire.
 */
import type { BeamAnalysis, BeamModel } from "./beam";
import { pointLoadComponents } from "./beam";
import { tex, texTerm } from "./format";
import { solve } from "./linalg";

export interface CalcStep {
  title: string;
  /** Lignes LaTeX (mode display). */
  latex: string[];
  /** Explication en texte (peut contenir du LaTeX inline entre $…$). */
  text?: string;
}

export interface HandReaction {
  /** Ex. « V_A », « H_A », « M_A ». */
  symbol: string;
  x: number;
  component: "H" | "V" | "M";
  value: number;
}

export interface HandCalc {
  applicable: boolean;
  reason?: string;
  steps: CalcStep[];
  reactions: HandReaction[];
}

interface Resultant {
  label: string;
  /** Composantes (kN), positives vers la droite / le haut. */
  fx: number;
  fy: number;
  /** Abscisse du point d'application (m). */
  x: number;
  /** Couple (kN·m) pour les charges de type moment. */
  c: number;
  description: string;
}

function resultants(model: BeamModel): Resultant[] {
  const out: Resultant[] = [];
  let nF = 0;
  let nQ = 0;
  let nC = 0;
  for (const ld of model.loads) {
    if (ld.kind === "point") {
      nF++;
      const { fx, fy } = pointLoadComponents(ld.F, ld.angle);
      out.push({
        label: `F_{${nF}}`,
        fx,
        fy,
        x: ld.x,
        c: 0,
        description: `$F_{${nF}} = ${tex(ld.F)}$ kN appliquée en $x = ${tex(ld.x)}$ m`,
      });
    } else if (ld.kind === "dist") {
      nQ++;
      const x1 = Math.min(ld.x1, ld.x2);
      const x2 = Math.max(ld.x1, ld.x2);
      const [qa, qb] = ld.x1 <= ld.x2 ? [ld.q1, ld.q2] : [ld.q2, ld.q1];
      const l = x2 - x1;
      const R = ((qa + qb) / 2) * l;
      if (Math.abs(qa + qb) < 1e-12 || l <= 0) continue;
      const xg = x1 + (l * (qa + 2 * qb)) / (3 * (qa + qb));
      const uniform = Math.abs(qa - qb) < 1e-12;
      const formula = uniform
        ? `R_{${nQ}} = q \\times l = ${tex(qa)} \\times ${tex(l)} = ${tex(R)}\\ \\text{kN}`
        : `R_{${nQ}} = \\dfrac{q_1 + q_2}{2} \\times l = \\dfrac{${tex(qa)} + ${tex(qb)}}{2} \\times ${tex(l)} = ${tex(R)}\\ \\text{kN}`;
      out.push({
        label: `R_{${nQ}}`,
        fx: 0,
        fy: -R,
        x: xg,
        c: 0,
        description: `${uniform ? "Charge uniformément répartie" : "Charge répartie linéaire"} sur $[${tex(x1)}\\,;\\,${tex(x2)}]$ m : $${formula}$, appliquée au centre de gravité du diagramme de charge, en $x_G = ${tex(xg, 3)}$ m`,
      });
    } else {
      nC++;
      out.push({
        label: `C_{${nC}}`,
        fx: 0,
        fy: 0,
        x: ld.x,
        c: ld.M,
        description: `Couple $C_{${nC}} = ${tex(ld.M)}$ kN·m (${ld.M >= 0 ? "anti-horaire" : "horaire"}) en $x = ${tex(ld.x)}$ m`,
      });
    }
  }
  return out;
}

/** Terme de moment ± |F|×|d| dont le signe suit le sens de rotation (anti-horaire +). */
function momentTerms(res: Resultant[], xRef: number, first: boolean): { latex: string; value: number } {
  let latex = "";
  let value = 0;
  let isFirst = first;
  for (const r of res) {
    if (r.c !== 0) {
      latex += texTerm(r.c, 2, isFirst);
      value += r.c;
      isFirst = false;
    }
    const d = r.x - xRef;
    if (Math.abs(r.fy) > 1e-12 && Math.abs(d) > 1e-12) {
      const m = r.fy * d;
      latex += `${m < 0 ? (isFirst ? "-" : " - ") : isFirst ? "" : " + "}${tex(Math.abs(r.fy))} \\times ${tex(Math.abs(d))}`;
      value += m;
      isFirst = false;
    }
  }
  return { latex, value };
}

export function handCalcBeam(model: BeamModel): HandCalc {
  const steps: CalcStep[] = [];
  if (model.hinges.length > 0) {
    return {
      applicable: false,
      reason:
        "Poutre avec rotule(s) interne(s) : on la décompose en sous-poutres (poutre Gerber). Les réactions sont obtenues par la méthode des déplacements.",
      steps,
      reactions: [],
    };
  }
  const sup = [...model.supports].sort((a, b) => a.x - b.x);
  const res = resultants(model);
  const sumFx = res.reduce((s, r) => s + r.fx, 0);
  const sumFy = res.reduce((s, r) => s + r.fy, 0);

  steps.push({
    title: "1. Bilan des actions extérieures",
    latex: [],
    text: res.length ? res.map((r) => `- ${r.description}`).join("\n") : "Aucune charge appliquée.",
  });

  const names = ["A", "B", "C", "D", "E"];

  if (sup.length === 1 && sup[0].type === "fixed") {
    const xA = sup[0].x;
    const mt = momentTerms(res, xA, false);
    const MA = -mt.value;
    const HA = -sumFx;
    const VA = -sumFy;
    steps.push({
      title: "2. Inconnues de liaison",
      latex: [],
      text: `Encastrement en A ($x = ${tex(xA)}$ m) : 3 inconnues $H_A$, $V_A$, $M_A$. Trois équations d'équilibre sont disponibles : la poutre est **isostatique** ($h = 3 - 3 = 0$).`,
    });
    steps.push({
      title: "3. Équations d'équilibre (PFS)",
      latex: [
        `\\sum F_x = 0 \\;\\Rightarrow\\; H_A${texTerm(sumFx)} = 0 \\;\\Rightarrow\\; H_A = ${tex(HA)}\\ \\text{kN}`,
        `\\sum F_y = 0 \\;\\Rightarrow\\; V_A${res
          .filter((r) => Math.abs(r.fy) > 1e-12)
          .map((r) => texTerm(r.fy))
          .join("")} = 0 \\;\\Rightarrow\\; V_A = ${tex(VA)}\\ \\text{kN}`,
        `\\sum M_{/A} = 0 \\;\\Rightarrow\\; M_A${mt.latex} = 0 \\;\\Rightarrow\\; M_A = ${tex(MA)}\\ \\text{kN·m}`,
      ],
      text: "Moments comptés positifs dans le sens anti-horaire ; forces positives vers le haut et vers la droite.",
    });
    return {
      applicable: true,
      steps,
      reactions: [
        { symbol: "H_A", x: xA, component: "H", value: HA },
        { symbol: "V_A", x: xA, component: "V", value: VA },
        { symbol: "M_A", x: xA, component: "M", value: MA },
      ],
    };
  }

  if (sup.length === 2 && sup.every((s) => s.type === "pin" || s.type === "roller")) {
    const [A, B] = sup;
    const nA = names[0];
    const nB = names[1];
    const pinCount = sup.filter((s) => s.type === "pin").length;
    if (pinCount === 0 && Math.abs(sumFx) > 1e-9) {
      return {
        applicable: false,
        reason:
          "Deux appuis simples ne bloquent pas le déplacement horizontal : la structure est hypostatique et ne peut pas équilibrer une charge horizontale.",
        steps,
        reactions: [],
      };
    }
    const span = B.x - A.x;
    if (span <= 1e-9) {
      return { applicable: false, reason: "Les deux appuis sont confondus.", steps, reactions: [] };
    }
    const mt = momentTerms(res, A.x, false);
    const VB = -mt.value / span;
    const VA = -sumFy - VB;
    const pinName = A.type === "pin" ? nA : nB;
    const H = -sumFx;
    const unknownText =
      pinCount === 1
        ? `Articulation en ${pinName} (2 inconnues : $H_${pinName}$, $V_${pinName}$) et appui simple en ${pinName === nA ? nB : nA} (1 inconnue). Total : 3 inconnues pour 3 équations → poutre **isostatique**.`
        : pinCount === 2
          ? `Deux articulations : 4 inconnues pour 3 équations → hyperstatique de degré 1 **vis-à-vis des efforts horizontaux uniquement**. Les réactions verticales restent déterminées par la statique ; la répartition de $H_A$ et $H_B$ dépend des déformations.`
          : `Deux appuis simples : 2 inconnues verticales. Aucun blocage horizontal (mécanisme en translation horizontale), acceptable ici car aucune charge horizontale n'est appliquée.`;
    steps.push({
      title: "2. Inconnues de liaison",
      latex: [],
      text: `A en $x = ${tex(A.x)}$ m, B en $x = ${tex(B.x)}$ m (portée entre appuis $l = ${tex(span)}$ m). ${unknownText}`,
    });
    const lines: string[] = [];
    lines.push(
      `\\sum M_{/A} = 0 \\;\\Rightarrow\\; V_B \\times ${tex(span)}${mt.latex} = 0 \\;\\Rightarrow\\; V_B = ${tex(VB)}\\ \\text{kN}`,
    );
    lines.push(
      `\\sum F_y = 0 \\;\\Rightarrow\\; V_A + V_B${res
        .filter((r) => Math.abs(r.fy) > 1e-12)
        .map((r) => texTerm(r.fy))
        .join("")} = 0 \\;\\Rightarrow\\; V_A = ${tex(VA)}\\ \\text{kN}`,
    );
    if (pinCount === 1) {
      lines.push(
        `\\sum F_x = 0 \\;\\Rightarrow\\; H_${pinName}${texTerm(sumFx)} = 0 \\;\\Rightarrow\\; H_${pinName} = ${tex(H)}\\ \\text{kN}`,
      );
    } else if (pinCount === 2) {
      lines.push(`\\sum F_x = 0 \\;\\Rightarrow\\; H_A + H_B${texTerm(sumFx)} = 0`);
    }
    steps.push({
      title: "3. Équations d'équilibre (PFS)",
      latex: lines,
      text: "On écrit d'abord l'équation des moments en A : elle ne contient qu'une seule inconnue, $V_B$. Moments positifs dans le sens anti-horaire.",
    });
    // Vérification : moments en B
    const mtB = momentTerms(res, B.x, false);
    const checkB = mtB.value + VA * (A.x - B.x);
    steps.push({
      title: "4. Vérification",
      latex: [
        `\\sum M_{/B} = -V_A \\times ${tex(span)}${mtB.latex} = ${tex(checkB, 4)} \\approx 0 \\;\\checkmark`,
      ],
      text: "L'équation des moments écrite en B, non utilisée pour la résolution, doit être vérifiée.",
    });
    const reactions: HandReaction[] = [
      { symbol: "V_A", x: A.x, component: "V", value: VA },
      { symbol: "V_B", x: B.x, component: "V", value: VB },
    ];
    if (pinCount === 1) {
      reactions.push({ symbol: `H_${pinName}`, x: pinName === nA ? A.x : B.x, component: "H", value: H });
    }
    return { applicable: true, steps, reactions };
  }

  return {
    applicable: false,
    reason:
      "Cette configuration d'appuis est hyperstatique (ou non standard) : les seules équations de la statique ne suffisent pas. Les réactions sont calculées par la méthode des déplacements.",
    steps,
    reactions: [],
  };
}

/* -------------------------------------------------------------------------- */
/*                Équations des efforts internes par tronçon                  */
/* -------------------------------------------------------------------------- */

export interface SegmentEquation {
  x0: number;
  x1: number;
  /** Coefficients en puissances croissantes de x (abscisse globale, m). */
  N: number[];
  V: number[];
  M: number[];
}

function fitPoly(xs: number[], ys: number[], degree: number): number[] {
  const n = degree + 1;
  const A = xs.slice(0, n).map((x) => Array.from({ length: n }, (_, k) => x ** k));
  try {
    return solve(A, ys.slice(0, n), 1e-14);
  } catch {
    return new Array<number>(n).fill(0);
  }
}

function cleanCoeffs(c: number[], x1: number, scale: number): number[] {
  return c.map((v, k) => (Math.abs(v) * Math.max(1, x1) ** k < 1e-7 * Math.max(scale, 1e-9) ? 0 : v));
}

/** Équations polynomiales exactes N(x), V(x), M(x) sur chaque tronçon. */
export function segmentEquations(an: BeamAnalysis): SegmentEquation[] {
  if (!an.result.ok) return [];
  const L = an.model.length;
  const pts = new Set<number>([0, L, ...an.built.xs]);
  for (const ld of an.model.loads) {
    if (ld.kind === "dist") {
      pts.add(Math.min(Math.max(ld.x1, 0), L));
      pts.add(Math.min(Math.max(ld.x2, 0), L));
    } else pts.add(Math.min(Math.max(ld.x, 0), L));
  }
  const sorted = [...pts].sort((a, b) => a - b).filter((v, k, arr) => k === 0 || v - arr[k - 1] > 1e-9);
  const out: SegmentEquation[] = [];
  for (let k = 0; k < sorted.length - 1; k++) {
    const x0 = sorted[k];
    const x1 = sorted[k + 1];
    const xs = [0.15, 0.38, 0.62, 0.85].map((t) => x0 + t * (x1 - x0));
    const vals = xs.map((x) => an.at(x));
    const scaleM = Math.max(...vals.map((v) => Math.abs(v.M)), 1e-9);
    const scaleV = Math.max(...vals.map((v) => Math.abs(v.V)), 1e-9);
    const scaleN = Math.max(...vals.map((v) => Math.abs(v.N)), 1e-9);
    out.push({
      x0,
      x1,
      N: cleanCoeffs(fitPoly(xs, vals.map((v) => v.N), 2), x1, scaleN),
      V: cleanCoeffs(fitPoly(xs, vals.map((v) => v.V), 2), x1, scaleV),
      M: cleanCoeffs(fitPoly(xs, vals.map((v) => v.M), 3), x1, scaleM),
    });
  }
  return out;
}

/** Polynôme → LaTeX (« 25{,}00\,x - 2{,}50\,x^{2} »). */
export function polyTex(c: number[], decimals = 3): string {
  const terms: string[] = [];
  c.forEach((v, k) => {
    if (Math.abs(v) < 1e-12) return;
    const mag = tex(Math.abs(v), decimals);
    const body = k === 0 ? mag : k === 1 ? `${mag}\\,x` : `${mag}\\,x^{${k}}`;
    terms.push(`${v < 0 ? "-" : "+"} ${body}`);
  });
  if (terms.length === 0) return "0";
  let s = terms.join(" ");
  if (s.startsWith("+ ")) s = s.slice(2);
  else if (s.startsWith("- ")) s = "-" + s.slice(2);
  return s;
}
