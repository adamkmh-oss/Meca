/**
 * Rédaction automatique pour une poutre calculée : PFS (réactions) et
 * coupures tronçon par tronçon (équilibre de la partie gauche, expressions
 * de N(x), T(x), M(x)). Texte en Markdown + LaTeX, inséré dans le cahier.
 *
 * Convention du cours : torseur de cohésion = action de la partie droite sur
 * la partie gauche ; N > 0 en traction ; T = −ΣF_y(gauche) ; dM/dx = −T ;
 * M > 0 tend la fibre inférieure. Moments comptés positifs dans le sens
 * anti-horaire, charges réparties positives vers le bas.
 */
import { analyzeBeam, pointLoadComponents, type BeamAnalysis, type BeamModel } from "@/lib/mechanics/beam";
import { handCalcBeam } from "@/lib/mechanics/beam-equations";
import { fmt } from "@/lib/mechanics/format";

const LETTERS = "ABCDEFGHIJ";
const EPS = 1e-9;

/** Nombre en LaTeX, virgule décimale, zéros inutiles supprimés (27,5 ; 20 ; 1,333). */
export function texn(v: number, decimals = 2): string {
  let s = fmt(Math.abs(v) < 1e-9 ? 0 : v, decimals);
  s = s.replace(/,(\d*?)0+$/, (_m, g: string) => (g ? "," + g : ""));
  return s.replace(/,/g, "{,}").replace(/\u2009/g, "\\,").replace(/−/g, "-");
}

/** Texte simple (Markdown) d'un nombre. */
export function txtn(v: number, decimals = 2): string {
  let s = fmt(Math.abs(v) < 1e-9 ? 0 : v, decimals);
  s = s.replace(/,(\d*?)0+$/, (_m, g: string) => (g ? "," + g : ""));
  return s;
}

/* ------------------------------------------------------------------ */
/*                    Polynômes (coefficients croissants)               */
/* ------------------------------------------------------------------ */
type Poly = number[];

function padd(a: Poly, b: Poly): Poly {
  const n = Math.max(a.length, b.length);
  return Array.from({ length: n }, (_, k) => (a[k] ?? 0) + (b[k] ?? 0));
}
function pscale(a: Poly, k: number): Poly {
  return a.map((v) => v * k);
}
/** (x − a)^n développé. */
function shiftPow(a: number, n: number): Poly {
  let p: Poly = [1];
  for (let i = 0; i < n; i++) {
    const q: Poly = new Array(p.length + 1).fill(0);
    p.forEach((c, k) => {
      q[k + 1] += c;
      q[k] += -a * c;
    });
    p = q;
  }
  return p;
}
export function pevalAt(p: Poly, x: number): number {
  return p.reduce((s, c, k) => s + c * x ** k, 0);
}

export function polyTexN(c: Poly, decimals = 2): string {
  const scale = Math.max(1e-9, ...c.map((v) => Math.abs(v)));
  const terms: string[] = [];
  c.forEach((v, k) => {
    if (Math.abs(v) < 1e-9 * Math.max(1, scale)) return;
    const mag = texn(Math.abs(v), decimals);
    const coef = k > 0 && mag === "1" ? "" : mag;
    const body = k === 0 ? mag : k === 1 ? `${coef}${coef ? "\\," : ""}x` : `${coef}${coef ? "\\," : ""}x^{${k}}`;
    terms.push(`${v < 0 ? "-" : "+"} ${body}`);
  });
  if (terms.length === 0) return "0";
  // puissances décroissantes : forme habituelle en cours (25x − 2,5x²) → croissantes plus lisibles ici
  let s = terms.join(" ");
  if (s.startsWith("+ ")) s = s.slice(2);
  else if (s.startsWith("- ")) s = "-" + s.slice(2);
  return s;
}

/** « (x − a) » ou « x » en LaTeX. */
function xa(a: number): string {
  if (Math.abs(a) < EPS) return "x";
  return a > 0 ? `(x - ${texn(a)})` : `(x + ${texn(-a)})`;
}
function xaPow(a: number, n: number): string {
  const base = xa(a);
  if (n === 1) return base;
  return Math.abs(a) < EPS ? `x^{${n}}` : `${base}^{${n}}`;
}

/* ------------------------------------------------------------------ */
/*                           Réactions                                  */
/* ------------------------------------------------------------------ */
export interface NamedReaction {
  letter: string;
  x: number;
  type: string;
  H?: number;
  V?: number;
  M?: number;
}

export function supportLetters(model: BeamModel): { x: number; letter: string; type: string }[] {
  return [...model.supports].sort((a, b) => a.x - b.x).map((s, k) => ({ x: s.x, letter: LETTERS[k] ?? `S${k + 1}`, type: s.type }));
}

export function namedReactions(an: BeamAnalysis): NamedReaction[] {
  if (!an.result.ok) return [];
  const out: NamedReaction[] = [];
  for (const s of supportLetters(an.model)) {
    const id = an.built.nodeIdAt(Math.min(Math.max(s.x, 0), an.model.length));
    const r = id ? an.result.reactions[id] : undefined;
    if (!r) continue;
    if (out.some((o) => Math.abs(o.x - s.x) < 1e-7)) continue;
    out.push({
      letter: s.letter,
      x: s.x,
      type: s.type,
      H: r.blocked.x ? r.rx : undefined,
      V: r.blocked.y ? r.ry : undefined,
      M: r.blocked.rz ? r.mz : undefined,
    });
  }
  return out;
}

const SUPPORT_NAME: Record<string, string> = {
  roller: "appui simple",
  rollerX: "appui simple (plan vertical)",
  pin: "articulation",
  fixed: "encastrement",
};

/* ------------------------------------------------------------------ */
/*                                 PFS                                  */
/* ------------------------------------------------------------------ */
export function describeBeam(model: BeamModel): string {
  const sup = supportLetters(model)
    .map((s) => `${SUPPORT_NAME[s.type] ?? s.type} en ${s.letter} ($x = ${texn(s.x)}$ m)`)
    .join(", ");
  return `Poutre de longueur $L = ${texn(model.length)}$ m : ${sup || "aucun appui"}.`;
}

/** Bloc PFS : bilan, inconnues, équations et réactions. */
export function pfsMarkdown(model: BeamModel, an: BeamAnalysis = analyzeBeam(model)): string {
  const lines: string[] = ["### Équilibre global (PFS)", describeBeam(model), ""];
  if (!an.result.ok) {
    lines.push(`*Calcul impossible : ${an.result.error}*`);
    return lines.join("\n");
  }
  const hand = handCalcBeam(model);
  const h = an.result.hyperstaticity;
  if (hand.applicable) {
    for (const st of hand.steps) {
      lines.push(`**${st.title}**`);
      if (st.text) lines.push(st.text);
      for (const l of st.latex) lines.push(`$$${l}$$`);
      lines.push("");
    }
  } else {
    lines.push(`Inconnues de liaison : ${h.reactions} — degré d'hyperstaticité $h = ${h.degree}$ (${h.classification}).`);
    if (hand.reason) lines.push("", `*${hand.reason}*`);
    lines.push("");
  }
  lines.push("**Réactions**");
  for (const r of namedReactions(an)) {
    const parts: string[] = [];
    if (r.H !== undefined && Math.abs(r.H) > 1e-9) parts.push(`$H_${r.letter} = ${texn(r.H)}$ kN`);
    if (r.V !== undefined) parts.push(`$V_${r.letter} = ${texn(r.V)}$ kN`);
    if (r.M !== undefined) parts.push(`$M_${r.letter} = ${texn(r.M)}$ kN·m`);
    if (r.H !== undefined && Math.abs(r.H) <= 1e-9) parts.push(`$H_${r.letter} = 0$`);
    lines.push(`- ${r.letter} (${SUPPORT_NAME[r.type] ?? r.type}) : ${parts.join(" ; ")}`);
  }
  lines.push("", "*Forces positives vers le haut et vers la droite, moments positifs dans le sens anti-horaire.*");
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*                              Coupures                                */
/* ------------------------------------------------------------------ */
export interface SegmentCut {
  x0: number;
  x1: number;
  /** Équations d'équilibre de la partie gauche (LaTeX). */
  eqN: string;
  eqT: string;
  eqM: string;
  N: Poly;
  T: Poly;
  M: Poly;
}

/** Abscisses des discontinuités (bornes des tronçons). */
export function segmentBounds(model: BeamModel): number[] {
  const L = model.length;
  const pts = new Set<number>([0, L]);
  model.supports.forEach((s) => pts.add(Math.min(Math.max(s.x, 0), L)));
  model.hinges.forEach((h) => pts.add(Math.min(Math.max(h.x, 0), L)));
  for (const ld of model.loads) {
    if (ld.kind === "dist") {
      pts.add(Math.min(Math.max(ld.x1, 0), L));
      pts.add(Math.min(Math.max(ld.x2, 0), L));
    } else pts.add(Math.min(Math.max(ld.x, 0), L));
  }
  return [...pts].sort((a, b) => a - b).filter((v, k, arr) => k === 0 || v - arr[k - 1] > 1e-7);
}

interface Term {
  /** LaTeX du terme sans signe initial (« V_A », « 20 », « 5\,x »). */
  tex: string;
  sign: 1 | -1;
}

function joinTerms(lhs: string, terms: Term[]): string {
  let s = lhs;
  for (const t of terms) s += ` ${t.sign > 0 ? "+" : "-"} ${t.tex}`;
  return s + " = 0";
}

function term(v: number, body: string): Term {
  return { sign: v >= 0 ? 1 : -1, tex: body };
}

/** Coefficient × facteur, sans « 1 \, » inutile. */
function coefTex(c: number, factor: string): string {
  const m = texn(Math.abs(c));
  return m === "1" ? factor : `${m}\\,${factor}`;
}

export function cutEquations(model: BeamModel, an: BeamAnalysis = analyzeBeam(model)): SegmentCut[] {
  if (!an.result.ok) return [];
  const bounds = segmentBounds(model);
  const reacts = namedReactions(an);
  const out: SegmentCut[] = [];
  let nF = 0;
  let nC = 0;
  const loadName = new Map<string, string>();
  for (const ld of model.loads) {
    if (ld.kind === "point") loadName.set(ld.id, `F_{${++nF}}`);
    else if (ld.kind === "moment") loadName.set(ld.id, `C_{${++nC}}`);
  }

  for (let k = 0; k < bounds.length - 1; k++) {
    const x0 = bounds[k];
    const x1 = bounds[k + 1];
    const xm = (x0 + x1) / 2;
    const tFx: Term[] = [];
    const tFy: Term[] = [];
    const tM: Term[] = [];
    let sFx: Poly = [0];
    let sFy: Poly = [0];
    let sM: Poly = [0];

    // Réactions des appuis situés à gauche de la coupure
    for (const r of reacts) {
      if (r.x > xm) continue;
      if (r.H !== undefined && Math.abs(r.H) > 1e-9) {
        tFx.push({ sign: 1, tex: `H_${r.letter}` });
        sFx = padd(sFx, [r.H]);
      }
      if (r.V !== undefined && Math.abs(r.V) > 1e-9) {
        tFy.push({ sign: 1, tex: `V_${r.letter}` });
        sFy = padd(sFy, [r.V]);
        // moment en G d'une force verticale en x_r : −V (x − x_r)
        tM.push({ sign: -1, tex: `V_${r.letter}\\,${xa(r.x)}` });
        sM = padd(sM, pscale(shiftPow(r.x, 1), -r.V));
      }
      if (r.M !== undefined && Math.abs(r.M) > 1e-9) {
        tM.push({ sign: 1, tex: `M_${r.letter}` });
        sM = padd(sM, [r.M]);
      }
    }

    // Charges à gauche de la coupure
    for (const ld of model.loads) {
      if (ld.kind === "point") {
        if (ld.x > xm) continue;
        const { fx, fy } = pointLoadComponents(ld.F, ld.angle);
        if (Math.abs(fx) > 1e-12) {
          tFx.push(term(fx, texn(Math.abs(fx))));
          sFx = padd(sFx, [fx]);
        }
        if (Math.abs(fy) > 1e-12) {
          tFy.push(term(fy, texn(Math.abs(fy))));
          sFy = padd(sFy, [fy]);
          tM.push(term(-fy, coefTex(fy, xa(ld.x))));
          sM = padd(sM, pscale(shiftPow(ld.x, 1), -fy));
        }
      } else if (ld.kind === "moment") {
        if (ld.x > xm) continue;
        tM.push(term(ld.M, texn(Math.abs(ld.M))));
        sM = padd(sM, [ld.M]);
      } else {
        const a = Math.max(Math.min(ld.x1, ld.x2), 0);
        const b = Math.min(Math.max(ld.x1, ld.x2), model.length);
        if (b - a <= EPS || a > xm) continue;
        const [qa, qb] = ld.x1 <= ld.x2 ? [ld.q1, ld.q2] : [ld.q2, ld.q1];
        if (b <= xm) {
          // charge entièrement à gauche : résultante R (vers le bas) en x_G
          const l = b - a;
          const R = ((qa + qb) / 2) * l;
          if (Math.abs(R) < 1e-12) continue;
          const xg = Math.abs(qa + qb) > 1e-12 ? a + (l * (qa + 2 * qb)) / (3 * (qa + qb)) : (a + b) / 2;
          tFy.push(term(-R, texn(Math.abs(R))));
          sFy = padd(sFy, [-R]);
          tM.push(term(R, coefTex(R, xa(xg))));
          sM = padd(sM, pscale(shiftPow(xg, 1), R));
        } else {
          // la coupure est dans la charge : partie [a, x] variable
          const kq = (qb - qa) / (b - a);
          if (Math.abs(qa) > 1e-12) {
            tFy.push(term(-qa, coefTex(qa, xa(a))));
            sFy = padd(sFy, pscale(shiftPow(a, 1), -qa));
            tM.push(term(qa, `${texn(Math.abs(qa))}\\,\\dfrac{${xaPow(a, 2)}}{2}`));
            sM = padd(sM, pscale(shiftPow(a, 2), qa / 2));
          }
          if (Math.abs(kq) > 1e-12) {
            tFy.push(term(-kq, `${texn(Math.abs(kq))}\\,\\dfrac{${xaPow(a, 2)}}{2}`));
            sFy = padd(sFy, pscale(shiftPow(a, 2), -kq / 2));
            tM.push(term(kq, `${texn(Math.abs(kq))}\\,\\dfrac{${xaPow(a, 3)}}{6}`));
            sM = padd(sM, pscale(shiftPow(a, 3), kq / 6));
          }
        }
      }
    }

    const clean = (p: Poly) => {
      const sc = Math.max(1e-9, ...p.map((v) => Math.abs(v)));
      const q = p.map((v) => (Math.abs(v) < 1e-9 * Math.max(1, sc) ? 0 : v));
      while (q.length > 1 && q[q.length - 1] === 0) q.pop();
      return q;
    };
    out.push({
      x0,
      x1,
      eqN: joinTerms("N(x)", tFx),
      eqT: joinTerms("T(x)", tFy),
      eqM: joinTerms("M(x)", tM),
      N: clean(pscale(sFx, -1)),
      T: clean(pscale(sFy, -1)),
      M: clean(pscale(sM, -1)),
    });
  }
  return out;
}

/** Bloc « coupures » : équilibre de la partie gauche sur chaque tronçon. */
export function cutsMarkdown(model: BeamModel, an: BeamAnalysis = analyzeBeam(model)): string {
  const cuts = cutEquations(model, an);
  if (cuts.length === 0) return "### Coupures\n*Calcul impossible pour cette poutre.*";
  const lines: string[] = [
    "### Coupures — torseur de cohésion",
    "On isole la **partie gauche** $[0\\,;\\,x]$ ; la partie droite exerce sur elle $N(x)$, $T(x)$, $M(x)$ (sens positifs du repère local). Moments en $G$, centre de la section, positifs dans le sens anti-horaire.",
    "",
  ];
  cuts.forEach((c, k) => {
    lines.push(`**Tronçon ${k + 1} : $${texn(c.x0)} < x < ${texn(c.x1)}$ m**`);
    if (c.eqN === "N(x) = 0") lines.push(`$$\\Sigma F_x = 0 :\\; N(x) = 0$$`);
    else lines.push(`$$\\Sigma F_x = 0 :\\; ${c.eqN} \\;\\Rightarrow\\; N(x) = ${polyTexN(c.N)}\\ \\text{kN}$$`);
    lines.push(`$$\\Sigma F_y = 0 :\\; ${c.eqT} \\;\\Rightarrow\\; T(x) = ${polyTexN(c.T)}\\ \\text{kN}$$`);
    lines.push(`$$\\Sigma M_{/G} = 0 :\\; ${c.eqM}$$`);
    lines.push(`$$\\Rightarrow\\; M(x) = ${polyTexN(c.M)}\\ \\text{kN·m}$$`);
    const T0 = pevalAt(c.T, c.x0);
    const T1 = pevalAt(c.T, c.x1);
    const M0 = pevalAt(c.M, c.x0);
    const M1 = pevalAt(c.M, c.x1);
    let extra = "";
    if (c.M.length >= 3 && T0 * T1 < 0) {
      // T s'annule dans le tronçon : moment extrémal
      const xs = rootIn(c.T, c.x0, c.x1);
      if (xs !== null) extra = ` ; $T = 0$ en $x = ${texn(xs)}$ m : $M_{extr} = ${texn(pevalAt(c.M, xs))}$ kN·m`;
    }
    lines.push(
      `Valeurs : $T(${texn(c.x0)}^+) = ${texn(T0)}$, $T(${texn(c.x1)}^-) = ${texn(T1)}$ kN ; $M(${texn(c.x0)}) = ${texn(M0)}$, $M(${texn(c.x1)}) = ${texn(M1)}$ kN·m${extra}`,
      "",
    );
  });
  lines.push("*Contrôle : $\\mathrm{d}M/\\mathrm{d}x = -T(x)$ sur chaque tronçon.*");
  return lines.join("\n");
}

/** Racine de p dans ]a, b[ (p de degré ≤ 2). */
function rootIn(p: Poly, a: number, b: number): number | null {
  const [c0 = 0, c1 = 0, c2 = 0] = p;
  const cands: number[] = [];
  if (Math.abs(c2) < 1e-12) {
    if (Math.abs(c1) > 1e-12) cands.push(-c0 / c1);
  } else {
    const d = c1 * c1 - 4 * c2 * c0;
    if (d >= 0) {
      cands.push((-c1 + Math.sqrt(d)) / (2 * c2), (-c1 - Math.sqrt(d)) / (2 * c2));
    }
  }
  return cands.find((x) => x > a + 1e-9 && x < b - 1e-9) ?? null;
}
