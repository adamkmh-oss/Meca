/**
 * Poutre en calcul littéral : positions et charges saisies avec des lettres
 * (L, a, L/2, F, q, C…). Les valeurs numériques des lettres ne servent qu'au
 * dessin (proportions, allure des diagrammes) ; toute la rédaction — PFS,
 * coupures, valeurs remarquables — est écrite avec des lettres et des
 * chiffres, comme dans le cours.
 *
 * Conventions identiques au reste du cahier : forces positives vers le haut
 * et la droite, moments positifs anti-horaires, q > 0 vers le bas,
 * N > 0 en traction, dM/dx = −T, M > 0 fibre inférieure tendue.
 */
import type { BeamModel } from "@/lib/mechanics/beam";
import { Ex, parseExpr, plain, tex, texInX, texParen } from "./symbolic";

export interface LitVar {
  name: string;
  /** Valeur pour le dessin uniquement (unités : m, kN, kN/m, kN·m). */
  value: number;
}

export type LitSupportType = "pin" | "roller" | "rollerX" | "fixed";

export type LitLoad =
  | { id: string; kind: "point"; x: string; F: string; angle: number }
  | { id: string; kind: "dist"; x1: string; x2: string; q1: string; q2: string }
  | { id: string; kind: "moment"; x: string; M: string };

export interface LitBeam {
  vars: LitVar[];
  length: string;
  supports: { id: string; x: string; type: LitSupportType }[];
  hinges: { id: string; x: string }[];
  loads: LitLoad[];
}

const LETTERS = "ABCDEFGHIJ";

/* ------------------------------------------------------------------ */
/*                       Lecture et valeurs de dessin                   */
/* ------------------------------------------------------------------ */
interface PLoadPoint {
  id: string;
  kind: "point";
  x: Ex;
  xv: number;
  F: Ex;
  angle: number;
  fx: Ex;
  fy: Ex;
}
interface PLoadDist {
  id: string;
  kind: "dist";
  a: Ex;
  b: Ex;
  av: number;
  bv: number;
  qa: Ex;
  qb: Ex;
}
interface PLoadMoment {
  id: string;
  kind: "moment";
  x: Ex;
  xv: number;
  M: Ex;
}
type PLoad = PLoadPoint | PLoadDist | PLoadMoment;

export interface ParsedBeam {
  L: Ex;
  Lv: number;
  supports: { id: string; x: Ex; xv: number; type: LitSupportType; letter: string }[];
  hinges: { id: string; x: Ex; xv: number }[];
  loads: PLoad[];
  vals: Record<string, number>;
}

/** Valeur de dessin proposée pour une nouvelle lettre. */
export function defaultValue(name: string, known: Record<string, number>): number {
  const L = known.L ?? 6;
  const c = name[0];
  if (c === "L") return 6;
  if (c === "l") return L / 2;
  if ("abcd".includes(c)) return Math.round(((L * ("abcd".indexOf(c) + 1)) / 4) * 100) / 100;
  if (c === "h") return 2;
  if (c === "q" || c === "p" || c === "w") return 10;
  if (c === "F" || c === "P" || c === "Q" || c === "R") return 20;
  if (c === "C" || c === "M") return 20;
  return 1;
}

/** Composantes d'une force d'intensité F et de direction `angle` (degrés). Exactes pour 0, ±90, 180 ; cos / sin sinon. */
export function forceComponents(F: Ex, angle: number): { fx: Ex; fy: Ex } {
  const a = ((angle % 360) + 360) % 360;
  const exact: Record<number, [number, number]> = { 0: [1, 0], 90: [0, 1], 180: [-1, 0], 270: [0, -1] };
  if (exact[a]) return { fx: F.scale(exact[a][0]), fy: F.scale(exact[a][1]) };
  // angle aigu de référence et signes selon le quadrant
  const rad = (a * Math.PI) / 180;
  const ref = Math.round(Math.abs((Math.atan(Math.abs(Math.tan(rad))) * 180) / Math.PI) * 1000) / 1000;
  const sx = Math.cos(rad) < 0 ? -1 : 1;
  const sy = Math.sin(rad) < 0 ? -1 : 1;
  return { fx: F.mul(Ex.s(`cos(${ref}°)`)).scale(sx), fy: F.mul(Ex.s(`sin(${ref}°)`)).scale(sy) };
}

function exprList(lit: LitBeam): [string, string][] {
  const out: [string, string][] = [["Longueur", lit.length]];
  lit.supports.forEach((s, k) => out.push([`Appui ${k + 1}`, s.x]));
  lit.hinges.forEach((h, k) => out.push([`Rotule ${k + 1}`, h.x]));
  lit.loads.forEach((l, k) => {
    if (l.kind === "point") out.push([`Charge ${k + 1} (position)`, l.x], [`Charge ${k + 1} (intensité)`, l.F]);
    else if (l.kind === "moment") out.push([`Charge ${k + 1} (position)`, l.x], [`Charge ${k + 1} (couple)`, l.M]);
    else out.push([`Charge ${k + 1} (début)`, l.x1], [`Charge ${k + 1} (fin)`, l.x2], [`Charge ${k + 1} (q gauche)`, l.q1], [`Charge ${k + 1} (q droite)`, l.q2]);
  });
  return out;
}

/** Lettres utilisées dans les expressions (pour proposer leurs valeurs de dessin). */
export function litSymbols(lit: LitBeam): string[] {
  const s = new Set<string>();
  for (const [, src] of exprList(lit)) {
    try {
      for (const n of parseExpr(src).symbols()) if (!/^(cos|sin|tan)\(/.test(n)) s.add(n);
    } catch {
      /* erreur signalée ailleurs */
    }
  }
  return [...s].sort((a, b) => (a === "L" ? -1 : b === "L" ? 1 : a < b ? -1 : 1));
}

export function parseBeam(lit: LitBeam): { ok: true; p: ParsedBeam } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const vals: Record<string, number> = {};
  for (const v of lit.vars) vals[v.name] = v.value;
  for (const n of litSymbols(lit)) if (!(n in vals)) vals[n] = defaultValue(n, vals);
  const P = (label: string, src: string): Ex => {
    try {
      const e = parseExpr(src);
      e.eval(vals);
      return e;
    } catch (e) {
      errors.push(`${label} : ${e instanceof Error ? e.message : "expression invalide"}`);
      return Ex.zero();
    }
  };
  const L = P("Longueur", lit.length);
  const Lv = L.eval(vals);
  if (!(Lv > 0)) errors.push("La longueur doit être positive (valeur de dessin).");
  const sorted = lit.supports.map((s, k) => ({ s, x: P(`Appui ${k + 1}`, s.x) })).map((o) => ({ ...o, xv: o.x.eval(vals) }));
  sorted.sort((a, b) => a.xv - b.xv);
  const supports = sorted.map((o, k) => ({ id: o.s.id, x: o.x, xv: o.xv, type: o.s.type, letter: LETTERS[k] ?? `S${k + 1}` }));
  const hinges = lit.hinges.map((h, k) => {
    const x = P(`Rotule ${k + 1}`, h.x);
    return { id: h.id, x, xv: x.eval(vals) };
  });
  const loads: PLoad[] = lit.loads.map((l, k) => {
    if (l.kind === "point") {
      const x = P(`Charge ${k + 1} (position)`, l.x);
      const F = P(`Charge ${k + 1} (intensité)`, l.F);
      const { fx, fy } = forceComponents(F, l.angle);
      return { id: l.id, kind: "point", x, xv: x.eval(vals), F, angle: l.angle, fx, fy };
    }
    if (l.kind === "moment") {
      const x = P(`Charge ${k + 1} (position)`, l.x);
      return { id: l.id, kind: "moment", x, xv: x.eval(vals), M: P(`Charge ${k + 1} (couple)`, l.M) };
    }
    let a = P(`Charge ${k + 1} (début)`, l.x1);
    let b = P(`Charge ${k + 1} (fin)`, l.x2);
    let qa = P(`Charge ${k + 1} (q gauche)`, l.q1);
    let qb = P(`Charge ${k + 1} (q droite)`, l.q2);
    if (a.eval(vals) > b.eval(vals)) {
      [a, b] = [b, a];
      [qa, qb] = [qb, qa];
    }
    return { id: l.id, kind: "dist", a, b, av: a.eval(vals), bv: b.eval(vals), qa, qb };
  });
  for (const s of supports) if (s.xv < -1e-9 || s.xv > Lv + 1e-9) errors.push(`L'appui ${s.letter} est hors de la poutre (avec les valeurs de dessin).`);
  if (supports.length === 0) errors.push("Ajoutez au moins un appui.");
  if (errors.length) return { ok: false, errors };
  return { ok: true, p: { L, Lv, supports, hinges, loads, vals } };
}

/** Modèle numérique (valeurs de dessin) pour le schéma et l'allure des diagrammes. */
export function litToModel(lit: LitBeam, mat: { E: number; A: number; I: number }): BeamModel | null {
  const r = parseBeam(lit);
  if (!r.ok) return null;
  const p = r.p;
  const v = (e: Ex) => e.eval(p.vals);
  return {
    ...mat,
    length: p.Lv,
    supports: p.supports.map((s) => ({ id: s.id, x: s.xv, type: s.type })),
    hinges: p.hinges.map((h) => ({ id: h.id, x: h.xv })),
    loads: p.loads.map((l) =>
      l.kind === "point"
        ? { id: l.id, kind: "point", x: l.xv, F: v(l.F), angle: l.angle }
        : l.kind === "moment"
          ? { id: l.id, kind: "moment", x: l.xv, M: v(l.M) }
          : { id: l.id, kind: "dist", x1: l.av, x2: l.bv, q1: v(l.qa), q2: v(l.qb) },
    ),
  };
}

/* ------------------------------------------------------------------ */
/*                    Équilibre global (PFS littéral)                   */
/* ------------------------------------------------------------------ */
interface Unknown {
  sym: string;
  letter: string;
  comp: "H" | "V" | "M";
}

interface Equation {
  title: string;
  coeffs: Map<string, Ex>;
  constant: Ex;
  /** Termes affichés (dans l'ordre) : signe + corps LaTeX. */
  terms: { neg: boolean; body: string }[];
}

const isZeroNum = (v: number, ref = 1) => Math.abs(v) < 1e-9 * Math.max(1, Math.abs(ref));

function signed(e: Ex, vals: Record<string, number>): { neg: boolean; abs: Ex } {
  const v = e.eval(vals);
  return v < 0 ? { neg: true, abs: e.neg() } : { neg: false, abs: e };
}

/** Moment (anti-horaire +) en x0 d'une charge répartie linéaire qa→qb sur [a, b] (vers le bas). */
function distMoment(a: Ex, b: Ex, qa: Ex, qb: Ex, x0: Ex): Ex {
  // ∫ q(s)(s − x0) ds = (b−a)/6 [qa(2a+b) + qb(a+2b)] − x0 (qa+qb)(b−a)/2 ; charge vers le bas → signe −
  const l = b.sub(a);
  const first = l.div(Ex.n(6)).mul(qa.mul(a.scale(2).add(b)).add(qb.mul(a.add(b.scale(2)))));
  const second = x0.mul(qa.add(qb)).mul(l).div(Ex.n(2));
  return first.sub(second).neg();
}

function distResultant(a: Ex, b: Ex, qa: Ex, qb: Ex): { R: Ex; xg: Ex | null } {
  const l = b.sub(a);
  const R = qa.add(qb).mul(l).div(Ex.n(2));
  const s = qa.add(qb);
  if (s.isZero()) return { R, xg: null };
  return { R, xg: a.add(l.mul(qa.add(qb.scale(2))).div(s.scale(3))) };
}

/** Charge répartie restreinte à [a, c] (c ≤ b) : intensité au point c. */
function qAt(d: PLoadDist, c: Ex): Ex {
  if (d.qa.equals(d.qb)) return d.qa;
  return d.qa.add(d.qb.sub(d.qa).mul(c.sub(d.a)).div(d.b.sub(d.a)));
}

function armTex(arm: Ex): string {
  return texParen(arm);
}

function loadTermsAbout(p: ParsedBeam, x0: Ex, x0v: number, limit?: { xv: number; x: Ex }): { value: Ex; terms: { neg: boolean; body: string }[] } {
  let value = Ex.zero();
  const terms: { neg: boolean; body: string }[] = [];
  for (const l of p.loads) {
    if (l.kind === "point") {
      if (limit && !(l.xv < limit.xv - 1e-9)) continue;
      const arm = l.x.sub(x0);
      const m = l.fy.mul(arm);
      // composante horizontale : bras de levier nul (charge sur l'axe de la poutre)
      if (m.isZero()) continue;
      value = value.add(m);
      const f = signed(l.fy, p.vals);
      const d = signed(arm, p.vals);
      terms.push({ neg: f.neg !== d.neg, body: `${texParen(f.abs)} \\times ${armTex(d.abs)}` });
    } else if (l.kind === "moment") {
      if (limit && !(l.xv < limit.xv - 1e-9)) continue;
      value = value.add(l.M);
      const s = signed(l.M, p.vals);
      terms.push({ neg: s.neg, body: texParen(s.abs) });
    } else {
      let b = l.b;
      let bv = l.bv;
      let qb = l.qb;
      if (limit) {
        if (!(l.av < limit.xv - 1e-9)) continue;
        if (l.bv > limit.xv) {
          b = limit.x;
          bv = limit.xv;
          qb = qAt(l, limit.x);
        }
      }
      void bv;
      const m = distMoment(l.a, b, l.qa, qb, x0);
      if (m.isZero()) continue;
      value = value.add(m);
      const { R, xg } = distResultant(l.a, b, l.qa, qb);
      const arm = xg ? xg.sub(x0) : Ex.zero();
      const r = signed(R, p.vals);
      const d = signed(arm, p.vals);
      // charge vers le bas : moment = −R × (xG − x0)
      terms.push({ neg: !(r.neg !== d.neg), body: `${texParen(r.abs)} \\times ${armTex(d.abs)}` });
    }
  }
  void x0v;
  return { value, terms };
}

export interface LitStatics {
  ok: boolean;
  reason?: string;
  equations: Equation[];
  unknowns: Unknown[];
  values: Map<string, Ex>;
  /** Description des appuis et charges (Markdown). */
  bilan: string[];
}

export function solveStatics(p: ParsedBeam): LitStatics {
  const unknowns: Unknown[] = [];
  for (const s of p.supports) {
    if (s.type === "pin" || s.type === "fixed" || s.type === "rollerX") unknowns.push({ sym: `H_${s.letter}`, letter: s.letter, comp: "H" });
    if (s.type === "pin" || s.type === "fixed" || s.type === "roller") unknowns.push({ sym: `V_${s.letter}`, letter: s.letter, comp: "V" });
    if (s.type === "fixed") unknowns.push({ sym: `M_${s.letter}`, letter: s.letter, comp: "M" });
  }
  const sx = (letter: string) => p.supports.find((s) => s.letter === letter)!;
  const A = p.supports[0];
  const eqs: Equation[] = [];

  // ΣFx
  {
    const coeffs = new Map<string, Ex>();
    const terms: { neg: boolean; body: string }[] = [];
    for (const u of unknowns.filter((u) => u.comp === "H")) {
      coeffs.set(u.sym, Ex.n(1));
      terms.push({ neg: false, body: tex(Ex.s(u.sym)) });
    }
    let c = Ex.zero();
    for (const l of p.loads) {
      if (l.kind !== "point" || l.fx.isZero()) continue;
      c = c.add(l.fx);
      const s = signed(l.fx, p.vals);
      terms.push({ neg: s.neg, body: texParen(s.abs) });
    }
    eqs.push({ title: "\\Sigma F_x = 0", coeffs, constant: c, terms });
  }
  // ΣFy
  {
    const coeffs = new Map<string, Ex>();
    const terms: { neg: boolean; body: string }[] = [];
    for (const u of unknowns.filter((u) => u.comp === "V")) {
      coeffs.set(u.sym, Ex.n(1));
      terms.push({ neg: false, body: tex(Ex.s(u.sym)) });
    }
    let c = Ex.zero();
    for (const l of p.loads) {
      if (l.kind === "point" && !l.fy.isZero()) {
        c = c.add(l.fy);
        const s = signed(l.fy, p.vals);
        terms.push({ neg: s.neg, body: texParen(s.abs) });
      } else if (l.kind === "dist") {
        const { R } = distResultant(l.a, l.b, l.qa, l.qb);
        if (R.isZero()) continue;
        c = c.sub(R);
        const s = signed(R, p.vals);
        terms.push({ neg: !s.neg, body: texParen(s.abs) });
      }
    }
    eqs.push({ title: "\\Sigma F_y = 0", coeffs, constant: c, terms });
  }
  // ΣM / A
  const momentEq = (title: string, x0: Ex, x0v: number, limit?: { xv: number; x: Ex }): Equation => {
    const coeffs = new Map<string, Ex>();
    const terms: { neg: boolean; body: string }[] = [];
    for (const u of unknowns) {
      const s = sx(u.letter);
      if (limit && !(s.xv < limit.xv - 1e-9)) continue;
      if (u.comp === "V") {
        const arm = s.x.sub(x0);
        if (arm.isZero()) continue;
        coeffs.set(u.sym, arm);
        const d = signed(arm, p.vals);
        terms.push({ neg: d.neg, body: `${tex(Ex.s(u.sym))} \\times ${armTex(d.abs)}` });
      } else if (u.comp === "M") {
        coeffs.set(u.sym, Ex.n(1));
        terms.push({ neg: false, body: tex(Ex.s(u.sym)) });
      }
    }
    const lt = loadTermsAbout(p, x0, x0v, limit);
    return { title, coeffs, constant: lt.value, terms: [...terms, ...lt.terms] };
  };
  eqs.push(momentEq(`\\Sigma M_{/${A.letter}} = 0`, A.x, A.xv));
  for (const h of [...p.hinges].sort((a, b) => a.xv - b.xv)) {
    eqs.push(momentEq(`\\Sigma M_{/\\text{rotule}}^{\\,gauche} = 0`, h.x, h.xv, { xv: h.xv, x: h.x }));
  }

  const bilan: string[] = [];
  for (const s of p.supports) {
    const name = s.type === "pin" ? "articulation" : s.type === "roller" ? "appui simple" : s.type === "rollerX" ? "appui simple (plan vertical)" : "encastrement";
    const inc = unknowns.filter((u) => u.letter === s.letter).map((u) => `$${tex(Ex.s(u.sym))}$`);
    bilan.push(`- ${name} en ${s.letter} ($x = ${tex(s.x)}$) : ${inc.join(", ")}`);
  }
  for (const l of p.loads) {
    if (l.kind === "point") bilan.push(`- force $${texParen(l.F)}$ en $x = ${tex(l.x)}$${l.angle === -90 ? " (vers le bas)" : l.angle === 90 ? " (vers le haut)" : `, inclinée à $${l.angle}^{\\circ}$`}`);
    else if (l.kind === "moment") bilan.push(`- couple $${tex(l.M)}$ en $x = ${tex(l.x)}$ (positif anti-horaire)`);
    else {
      const { R, xg } = distResultant(l.a, l.b, l.qa, l.qb);
      const uniform = l.qa.equals(l.qb);
      bilan.push(
        `- charge ${uniform ? `uniforme $${texParen(l.qa)}$` : `linéaire de $${tex(l.qa)}$ à $${tex(l.qb)}$`} sur $[${tex(l.a)}\\,;\\,${tex(l.b)}]$ : résultante $R = ${tex(R)}$${xg ? ` en $x_G = ${tex(xg)}$` : ""}`,
      );
    }
  }

  // Résolution : on retire les équations sans inconnue (vérifiées d'office ou impossibles)
  const active = eqs.filter((e) => e.coeffs.size > 0);
  for (const e of eqs) if (e.coeffs.size === 0 && !e.constant.isZero()) return { ok: false, reason: "Mécanisme : les appuis ne peuvent pas équilibrer ces charges.", equations: eqs, unknowns, values: new Map(), bilan };
  if (unknowns.length > active.length) return { ok: false, reason: "Poutre hyperstatique : la statique seule ne suffit pas (calcul littéral hors programme).", equations: eqs, unknowns, values: new Map(), bilan };
  if (unknowns.length < active.length) return { ok: false, reason: "Poutre hypostatique (mécanisme).", equations: eqs, unknowns, values: new Map(), bilan };

  // Élimination de Gauss sur les fractions rationnelles
  const n = unknowns.length;
  const M: Ex[][] = active.map((e) => unknowns.map((u) => e.coeffs.get(u.sym) ?? Ex.zero()));
  const rhs: Ex[] = active.map((e) => e.constant.neg());
  const rowOf: number[] = [];
  const used = new Set<number>();
  for (let col = 0; col < n; col++) {
    let piv = -1;
    for (let r = 0; r < n; r++) {
      if (used.has(r) || M[r][col].isZero()) continue;
      if (piv < 0 || (M[r][col].num.isConst() && M[r][col].den.isConst())) piv = r;
    }
    if (piv < 0) return { ok: false, reason: "Système singulier (mécanisme).", equations: eqs, unknowns, values: new Map(), bilan };
    used.add(piv);
    rowOf[col] = piv;
    for (let r = 0; r < n; r++) {
      if (r === piv || M[r][col].isZero()) continue;
      const f = M[r][col].div(M[piv][col]);
      for (let c = col; c < n; c++) M[r][c] = M[r][c].sub(f.mul(M[piv][c]));
      rhs[r] = rhs[r].sub(f.mul(rhs[piv]));
    }
  }
  const values = new Map<string, Ex>();
  for (let col = 0; col < n; col++) values.set(unknowns[col].sym, rhs[rowOf[col]].div(M[rowOf[col]][col]));
  // ordre de présentation : moments d'abord (une seule inconnue), puis forces
  return { ok: true, equations: [eqs[2], ...eqs.slice(3), eqs[1], eqs[0]].filter((e) => e.coeffs.size > 0 || !e.constant.isZero()), unknowns, values, bilan };
}

function eqTex(e: Equation): string {
  const parts = e.terms.map((t, i) => (i === 0 ? (t.neg ? `-${t.body}` : t.body) : t.neg ? ` - ${t.body}` : ` + ${t.body}`)).join("");
  return `${e.title} :\\; ${parts || "0"} = 0`;
}

/* ------------------------------------------------------------------ */
/*                       Coupures (efforts internes)                    */
/* ------------------------------------------------------------------ */
export interface LitCut {
  x0: Ex;
  x1: Ex;
  x0v: number;
  x1v: number;
  eqN: string;
  eqT: string;
  eqM: string;
  N: Ex;
  T: Ex;
  M: Ex;
}

/** Bornes des tronçons, triées avec les valeurs de dessin. */
export function litBounds(p: ParsedBeam): { x: Ex; xv: number }[] {
  const pts: { x: Ex; xv: number }[] = [{ x: Ex.zero(), xv: 0 }, { x: p.L, xv: p.Lv }];
  const add = (x: Ex, xv: number) => {
    if (xv < -1e-9 || xv > p.Lv + 1e-9) return;
    pts.push({ x, xv });
  };
  p.supports.forEach((s) => add(s.x, s.xv));
  p.hinges.forEach((h) => add(h.x, h.xv));
  for (const l of p.loads) {
    if (l.kind === "dist") {
      add(l.a, l.av);
      add(l.b, l.bv);
    } else add(l.x, l.xv);
  }
  pts.sort((a, b) => a.xv - b.xv);
  return pts.filter((v, k, arr) => k === 0 || v.xv - arr[k - 1].xv > 1e-7 * Math.max(1, p.Lv));
}

function xa(a: Ex): string {
  if (a.isZero()) return "x";
  const t = tex(a);
  return t.startsWith("-") ? `(x + ${tex(a.neg())})` : `(x - ${isMultiTermTex(t) ? `(${t})` : t})`;
}
function isMultiTermTex(t: string) {
  return /\s[+-]\s/.test(t);
}
function xaPow(a: Ex, k: number): string {
  return a.isZero() ? `x^{${k}}` : `${xa(a)}^{${k}}`;
}

export function litCuts(p: ParsedBeam, st: LitStatics): LitCut[] {
  if (!st.ok) return [];
  const X = Ex.s("x");
  const bounds = litBounds(p);
  const out: LitCut[] = [];
  for (let k = 0; k < bounds.length - 1; k++) {
    const b0 = bounds[k];
    const b1 = bounds[k + 1];
    const mid = (b0.xv + b1.xv) / 2;
    const tFx: { neg: boolean; body: string }[] = [];
    const tFy: { neg: boolean; body: string }[] = [];
    const tM: { neg: boolean; body: string }[] = [];
    let sFx = Ex.zero();
    let sFy = Ex.zero();
    let sM = Ex.zero();
    for (const s of p.supports) {
      if (s.xv > mid) continue;
      for (const u of st.unknowns.filter((u) => u.letter === s.letter)) {
        const v = st.values.get(u.sym)!;
        if (u.comp === "H") {
          tFx.push({ neg: false, body: tex(Ex.s(u.sym)) });
          sFx = sFx.add(v);
        } else if (u.comp === "V") {
          tFy.push({ neg: false, body: tex(Ex.s(u.sym)) });
          sFy = sFy.add(v);
          tM.push({ neg: true, body: `${tex(Ex.s(u.sym))}\\,${xa(s.x)}` });
          sM = sM.sub(v.mul(X.sub(s.x)));
        } else {
          tM.push({ neg: false, body: tex(Ex.s(u.sym)) });
          sM = sM.add(v);
        }
      }
    }
    for (const l of p.loads) {
      if (l.kind === "point") {
        if (l.xv > mid) continue;
        if (!l.fx.isZero()) {
          const s = signed(l.fx, p.vals);
          tFx.push({ neg: s.neg, body: texParen(s.abs) });
          sFx = sFx.add(l.fx);
        }
        if (!l.fy.isZero()) {
          const s = signed(l.fy, p.vals);
          tFy.push({ neg: s.neg, body: texParen(s.abs) });
          sFy = sFy.add(l.fy);
          // moment en G de fy en x_i : −fy (x − x_i)
          tM.push({ neg: !s.neg, body: `${texParen(s.abs)}\\,${xa(l.x)}` });
          sM = sM.sub(l.fy.mul(X.sub(l.x)));
        }
      } else if (l.kind === "moment") {
        if (l.xv > mid) continue;
        const s = signed(l.M, p.vals);
        tM.push({ neg: s.neg, body: texParen(s.abs) });
        sM = sM.add(l.M);
      } else {
        if (l.av > mid) continue;
        if (l.bv <= mid) {
          const { R, xg } = distResultant(l.a, l.b, l.qa, l.qb);
          if (R.isZero()) continue;
          const s = signed(R, p.vals);
          tFy.push({ neg: !s.neg, body: texParen(s.abs) });
          sFy = sFy.sub(R);
          tM.push({ neg: s.neg, body: `${texParen(s.abs)}\\,${xa(xg ?? Ex.zero())}` });
          sM = sM.add(R.mul(X.sub(xg ?? Ex.zero())));
        } else {
          // coupure dans la charge : partie [a, x]
          const uniform = l.qa.equals(l.qb);
          const kq = uniform ? Ex.zero() : l.qb.sub(l.qa).div(l.b.sub(l.a));
          if (!l.qa.isZero()) {
            const s = signed(l.qa, p.vals);
            tFy.push({ neg: !s.neg, body: `${texParen(s.abs)}\\,${xa(l.a)}` });
            sFy = sFy.sub(l.qa.mul(X.sub(l.a)));
            tM.push({ neg: s.neg, body: `${texParen(s.abs)}\\,\\dfrac{${xaPow(l.a, 2)}}{2}` });
            sM = sM.add(l.qa.mul(X.sub(l.a).pow(2)).div(Ex.n(2)));
          }
          if (!kq.isZero()) {
            const s = signed(kq, p.vals);
            tFy.push({ neg: !s.neg, body: `${texParen(s.abs)}\\,\\dfrac{${xaPow(l.a, 2)}}{2}` });
            sFy = sFy.sub(kq.mul(X.sub(l.a).pow(2)).div(Ex.n(2)));
            tM.push({ neg: s.neg, body: `${texParen(s.abs)}\\,\\dfrac{${xaPow(l.a, 3)}}{6}` });
            sM = sM.add(kq.mul(X.sub(l.a).pow(3)).div(Ex.n(6)));
          }
        }
      }
    }
    const join = (lhs: string, t: { neg: boolean; body: string }[]) => lhs + t.map((x) => (x.neg ? ` - ${x.body}` : ` + ${x.body}`)).join("") + " = 0";
    out.push({
      x0: b0.x,
      x1: b1.x,
      x0v: b0.xv,
      x1v: b1.xv,
      eqN: join("N(x)", tFx),
      eqT: join("T(x)", tFy),
      eqM: join("M(x)", tM),
      N: sFx.neg(),
      T: sFy.neg(),
      M: sM.neg(),
    });
  }
  return out;
}

/** Moment extrémal dans un tronçon (T s'annule en x₀, T affine en x). */
export function litExtremum(c: LitCut, vals: Record<string, number>): { x: Ex; M: Ex } | null {
  const cs = c.T.coeffsIn("x");
  if (!cs || cs.length !== 2 || cs[1].isZero()) return null;
  const x0 = cs[0].neg().div(cs[1]);
  const xv = x0.eval(vals);
  if (!(xv > c.x0v + 1e-9 && xv < c.x1v - 1e-9)) return null;
  return { x: x0, M: c.M.subst("x", x0) };
}

/* ------------------------------------------------------------------ */
/*                              Rédaction                               */
/* ------------------------------------------------------------------ */
export function litPfsMarkdown(lit: LitBeam): string {
  const r = parseBeam(lit);
  if (!r.ok) return `### Équilibre global (PFS)\n*${r.errors.join(" ; ")}*`;
  const p = r.p;
  const st = solveStatics(p);
  const out = ["### Équilibre global (PFS)", `Poutre de longueur $${tex(p.L)}$.`, "", "**Bilan des actions extérieures**", ...st.bilan, ""];
  const h = st.unknowns.length - st.equations.length;
  out.push(`**Inconnues** : ${st.unknowns.length} — **équations** : ${3 + p.hinges.length} (${p.hinges.length ? `3 + ${p.hinges.length} par rotule` : "PFS plan"}).${st.ok ? " Poutre **isostatique**." : ""}`);
  void h;
  if (!st.ok) {
    out.push("", `*${st.reason}*`);
    return out.join("\n");
  }
  out.push("", "**Équations d'équilibre** (forces positives vers le haut et la droite, moments positifs dans le sens anti-horaire)");
  for (const e of st.equations) out.push(`$$${eqTex(e)}$$`);
  out.push("", "**Réactions**");
  for (const u of st.unknowns) out.push(`$$${tex(Ex.s(u.sym))} = ${tex(st.values.get(u.sym)!)}$$`);
  return out.join("\n");
}

export function litCutsMarkdown(lit: LitBeam): string {
  const r = parseBeam(lit);
  if (!r.ok) return `### Coupures\n*${r.errors.join(" ; ")}*`;
  const p = r.p;
  const st = solveStatics(p);
  if (!st.ok) return `### Coupures\n*${st.reason}*`;
  const cuts = litCuts(p, st);
  const lines = [
    "### Coupures — torseur de cohésion",
    "On isole la **partie gauche** $[0\\,;\\,x]$ ; la partie droite exerce sur elle $N(x)$, $T(x)$, $M(x)$ (sens positifs du repère local). Moments en $G$, centre de la section, positifs dans le sens anti-horaire.",
    "",
  ];
  cuts.forEach((c, k) => {
    lines.push(`**Tronçon ${k + 1} : $${tex(c.x0)} < x < ${tex(c.x1)}$**`);
    if (c.eqN === "N(x) = 0") lines.push("$$\\Sigma F_x = 0 :\\; N(x) = 0$$");
    else lines.push(`$$\\Sigma F_x = 0 :\\; ${c.eqN} \\;\\Rightarrow\\; N(x) = ${texInX(c.N)}$$`);
    lines.push(`$$\\Sigma F_y = 0 :\\; ${c.eqT}$$`);
    lines.push(`$$\\Rightarrow\\; T(x) = ${texInX(c.T)}$$`);
    lines.push(`$$\\Sigma M_{/G} = 0 :\\; ${c.eqM}$$`);
    lines.push(`$$\\Rightarrow\\; M(x) = ${texInX(c.M)}$$`);
    const v0 = (e: Ex, x: Ex) => tex(e.subst("x", x));
    lines.push(
      `Valeurs : $T(${tex(c.x0)}^+) = ${v0(c.T, c.x0)}$ ; $T(${tex(c.x1)}^-) = ${v0(c.T, c.x1)}$ ; $M(${tex(c.x0)}) = ${v0(c.M, c.x0)}$ ; $M(${tex(c.x1)}) = ${v0(c.M, c.x1)}$`,
    );
    const ext = litExtremum(c, p.vals);
    if (ext) lines.push(`$T = 0$ en $x_0 = ${tex(ext.x)}$ : $M_{max} = M(x_0) = ${tex(ext.M)}$`);
    lines.push("");
  });
  lines.push("*Contrôle : $\\mathrm{d}M/\\mathrm{d}x = -T(x)$ sur chaque tronçon.*");
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*                  Valeurs remarquables (diagrammes)                   */
/* ------------------------------------------------------------------ */
export interface KeyValue {
  /** Abscisse (valeur de dessin) et valeur (dessin) pour placer l'étiquette. */
  xv: number;
  yv: number;
  tex: string;
  /** Texte brut (estimation de la largeur de l'étiquette). */
  plain: string;
  /** Côté où écrire l'étiquette : à gauche du point, à droite, ou centrée. */
  side: "l" | "r" | "c";
}

export function litKeyValues(lit: LitBeam, q: "N" | "T" | "M"): KeyValue[] {
  const r = parseBeam(lit);
  if (!r.ok) return [];
  const st = solveStatics(r.p);
  if (!st.ok) return [];
  const cuts = litCuts(r.p, st);
  const out: KeyValue[] = [];
  const push = (xv: number, e: Ex, side: KeyValue["side"]) => {
    if (e.isZero()) return;
    const yv = e.eval(r.p.vals);
    if (out.some((o) => Math.abs(o.xv - xv) < 1e-9 && Math.abs(o.yv - yv) < 1e-9 * Math.max(1, Math.abs(yv)))) return;
    out.push({ xv, yv, tex: tex(e), plain: plain(e), side });
  };
  for (const c of cuts) {
    const f = q === "N" ? c.N : q === "T" ? c.T : c.M;
    push(c.x0v, f.subst("x", c.x0), "r");
    push(c.x1v, f.subst("x", c.x1), "l");
    if (q === "M") {
      const ext = litExtremum(c, r.p.vals);
      if (ext) push(ext.x.eval(r.p.vals), ext.M, "c");
    }
  }
  return out;
}

/** Réactions en littéral (pour l'affichage sous le schéma). */
export function litReactions(lit: LitBeam): { sym: string; tex: string; plain: string }[] {
  const r = parseBeam(lit);
  if (!r.ok) return [];
  const st = solveStatics(r.p);
  if (!st.ok) return [];
  return st.unknowns.map((u) => ({ sym: u.sym, tex: tex(st.values.get(u.sym)!), plain: plain(st.values.get(u.sym)!) }));
}

/* ------------------------------------------------------------------ */
/*                 Conversion d'une poutre numérique                    */
/* ------------------------------------------------------------------ */
const FRACTIONS: [number, string][] = [
  [1 / 2, "L/2"],
  [1 / 3, "L/3"],
  [2 / 3, "2L/3"],
  [1 / 4, "L/4"],
  [3 / 4, "3L/4"],
];

/** Propose des lettres pour une poutre saisie en valeurs (L, a, b…, F, q, C). */
export function literalFromNumeric(m: BeamModel): LitBeam {
  const L = m.length;
  const vars: LitVar[] = [{ name: "L", value: L }];
  const posNames = "abcdefg";
  const positions = new Map<string, string>();
  const allX = [...m.supports.map((s) => s.x), ...m.hinges.map((h) => h.x), ...m.loads.flatMap((l) => (l.kind === "dist" ? [l.x1, l.x2] : [l.x]))]
    .filter((x) => x > 1e-9 && x < L - 1e-9)
    .sort((a, b) => a - b);
  let k = 0;
  const pos = (x: number): string => {
    if (Math.abs(x) < 1e-9) return "0";
    if (Math.abs(x - L) < 1e-9) return "L";
    const key = x.toFixed(6);
    if (positions.has(key)) return positions.get(key)!;
    const frac = FRACTIONS.find(([f]) => Math.abs(x - f * L) < 1e-9);
    let name: string;
    if (frac) name = frac[1];
    else {
      name = posNames[k++] ?? `a${k}`;
      vars.push({ name, value: x });
    }
    positions.set(key, name);
    return name;
  };
  allX.forEach(pos);
  const named = (prefix: string, values: number[]) => {
    const distinct = [...new Set(values.map((v) => Math.abs(v).toFixed(6)))];
    const map = new Map<string, string>();
    distinct.forEach((d, i) => {
      const name = distinct.length === 1 ? prefix : `${prefix}_${i + 1}`;
      map.set(d, name);
      vars.push({ name, value: Number(d) });
    });
    return (v: number) => (Math.abs(v) < 1e-12 ? "0" : `${v < 0 ? "-" : ""}${map.get(Math.abs(v).toFixed(6))}`);
  };
  const Fn = named("F", m.loads.filter((l) => l.kind === "point").map((l) => (l.kind === "point" ? l.F : 0)));
  const qn = named(
    "q",
    m.loads.flatMap((l) => (l.kind === "dist" ? [l.q1, l.q2].filter((v) => Math.abs(v) > 1e-12) : [])),
  );
  const Cn = named("C", m.loads.filter((l) => l.kind === "moment").map((l) => (l.kind === "moment" ? l.M : 0)));
  return {
    vars,
    length: "L",
    supports: m.supports.map((s) => ({ id: s.id, x: pos(s.x), type: s.type })),
    hinges: m.hinges.map((h) => ({ id: h.id, x: pos(h.x) })),
    loads: m.loads.map((l) =>
      l.kind === "point"
        ? { id: l.id, kind: "point", x: pos(l.x), F: Fn(l.F), angle: l.angle }
        : l.kind === "moment"
          ? { id: l.id, kind: "moment", x: pos(l.x), M: Cn(l.M) }
          : { id: l.id, kind: "dist", x1: pos(l.x1), x2: pos(l.x2), q1: qn(l.q1), q2: qn(l.q2) },
    ),
  };
}
