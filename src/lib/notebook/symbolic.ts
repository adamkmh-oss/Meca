/**
 * Calcul littéral : fractions rationnelles à plusieurs variables, à
 * coefficients rationnels exacts (BigInt). Sert à rédiger PFS, coupures et
 * treillis « avec des lettres et des chiffres », comme dans le cours
 * (V_B = Fa/L + qL/2, M_max = qL²/8…).
 *
 * Symboles : noms libres (q, L, a, F_1, V_A, x…) et atomes trigonométriques
 * « cos(α) », « sin(α) », « cos(30°) ».
 */

/* ------------------------------------------------------------------ */
/*                         Rationnels exacts                            */
/* ------------------------------------------------------------------ */
const B0 = BigInt(0);
const B1 = BigInt(1);
const B10 = BigInt(10);
const B12 = BigInt(12);

export interface Q {
  n: bigint;
  d: bigint;
}
const abs = (a: bigint) => (a < B0 ? -a : a);
function gcd(a: bigint, b: bigint): bigint {
  a = abs(a);
  b = abs(b);
  while (b) [a, b] = [b, a % b];
  return a || B1;
}
export function q(n: bigint | number, d: bigint | number = B1): Q {
  let N = BigInt(n);
  let D = BigInt(d);
  if (D === B0) throw new Error("division par zéro");
  if (D < B0) {
    N = -N;
    D = -D;
  }
  const g = gcd(N, D);
  return { n: N / g, d: D / g };
}
const qadd = (a: Q, b: Q) => q(a.n * b.d + b.n * a.d, a.d * b.d);
const qmul = (a: Q, b: Q) => q(a.n * b.n, a.d * b.d);
const qdiv = (a: Q, b: Q) => q(a.n * b.d, a.d * b.n);
const qneg = (a: Q): Q => ({ n: -a.n, d: a.d });
const qnum = (a: Q) => Number(a.n) / Number(a.d);

/** Nombre décimal → fraction exacte (0,35 → 7/20). */
export function qFromNumber(v: number): Q {
  if (!Number.isFinite(v)) throw new Error("nombre invalide");
  if (Number.isInteger(v)) return q(BigInt(v));
  const s = v.toString();
  if (s.includes("e")) {
    const k = 1e9;
    return q(BigInt(Math.round(v * k)), BigInt(k));
  }
  const dec = s.split(".")[1]?.length ?? 0;
  const p = B10 ** BigInt(dec);
  return q(BigInt(s.replace(".", "").replace(/^(-?)0+(?=\d)/, "$1")), p);
}

/* ------------------------------------------------------------------ */
/*                           Monômes, polynômes                         */
/* ------------------------------------------------------------------ */
/** Monôme : liste triée [symbole, exposant]. Clé : « L^2*q^1 ». */
type Mono = [string, number][];

function monoKey(m: Mono): string {
  return m.map(([s, e]) => `${s}^${e}`).join("*");
}
function parseKey(k: string): Mono {
  if (!k) return [];
  return k.split("*").map((p) => {
    const i = p.lastIndexOf("^");
    return [p.slice(0, i), Number(p.slice(i + 1))] as [string, number];
  });
}
function monoMul(a: Mono, b: Mono): Mono {
  const m = new Map<string, number>();
  for (const [s, e] of a) m.set(s, (m.get(s) ?? 0) + e);
  for (const [s, e] of b) m.set(s, (m.get(s) ?? 0) + e);
  return [...m.entries()].filter(([, e]) => e !== 0).sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
}
/** a / b si b divise a, sinon null. */
function monoDiv(a: Mono, b: Mono): Mono | null {
  const m = new Map<string, number>(a);
  for (const [s, e] of b) {
    const cur = m.get(s) ?? 0;
    if (cur < e) return null;
    m.set(s, cur - e);
  }
  return [...m.entries()].filter(([, e]) => e !== 0).sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
}
/** Ordre lexicographique (symboles triés). */
function monoCmp(a: Mono, b: Mono): number {
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    const sa = a[i]?.[0];
    const sb = b[j]?.[0];
    if (sa !== undefined && (sb === undefined || sa < sb)) return 1; // a a un symbole plus « petit » avec exposant > 0
    if (sb !== undefined && (sa === undefined || sb < sa)) return -1;
    if (a[i][1] !== b[j][1]) return a[i][1] > b[j][1] ? 1 : -1;
    i++;
    j++;
  }
  return 0;
}

export class Poly {
  /** clé du monôme → coefficient */
  readonly t: Map<string, Q>;
  constructor(t?: Map<string, Q>) {
    this.t = t ?? new Map();
  }
  static c(v: Q | number): Poly {
    const c = typeof v === "number" ? qFromNumber(v) : v;
    const p = new Poly();
    if (c.n !== B0) p.t.set("", c);
    return p;
  }
  static s(name: string, e = 1): Poly {
    const p = new Poly();
    p.t.set(monoKey([[name, e]]), q(1));
    return p;
  }
  isZero() {
    return this.t.size === 0;
  }
  isConst() {
    return this.t.size === 0 || (this.t.size === 1 && this.t.has(""));
  }
  constValue(): Q {
    return this.t.get("") ?? q(0);
  }
  add(o: Poly): Poly {
    const r = new Map(this.t);
    for (const [k, c] of o.t) {
      const s = r.has(k) ? qadd(r.get(k)!, c) : c;
      if (s.n === B0) r.delete(k);
      else r.set(k, s);
    }
    return new Poly(r);
  }
  neg(): Poly {
    const r = new Map<string, Q>();
    for (const [k, c] of this.t) r.set(k, qneg(c));
    return new Poly(r);
  }
  sub(o: Poly): Poly {
    return this.add(o.neg());
  }
  scale(c: Q): Poly {
    if (c.n === B0) return new Poly();
    const r = new Map<string, Q>();
    for (const [k, v] of this.t) r.set(k, qmul(v, c));
    return new Poly(r);
  }
  mulTerm(m: Mono, c: Q): Poly {
    const r = new Map<string, Q>();
    for (const [k, v] of this.t) r.set(monoKey(monoMul(parseKey(k), m)), qmul(v, c));
    return new Poly(r);
  }
  mul(o: Poly): Poly {
    let r = new Poly();
    for (const [k, c] of o.t) r = r.add(this.mulTerm(parseKey(k), c));
    return r;
  }
  equals(o: Poly): boolean {
    if (this.t.size !== o.t.size) return false;
    for (const [k, c] of this.t) {
      const d = o.t.get(k);
      if (!d || d.n !== c.n || d.d !== c.d) return false;
    }
    return true;
  }
  terms(): { m: Mono; c: Q }[] {
    return [...this.t.entries()].map(([k, c]) => ({ m: parseKey(k), c }));
  }
  lead(): { m: Mono; c: Q } {
    let best: { m: Mono; c: Q } | null = null;
    for (const tm of this.terms()) if (!best || monoCmp(tm.m, best.m) > 0) best = tm;
    return best!;
  }
  symbols(): Set<string> {
    const s = new Set<string>();
    for (const k of this.t.keys()) for (const [n] of parseKey(k)) s.add(n);
    return s;
  }
  degreeIn(sym: string): number {
    let d = 0;
    for (const k of this.t.keys()) for (const [n, e] of parseKey(k)) if (n === sym && e > d) d = e;
    return d;
  }
  /** Plus grand monôme commun à tous les termes. */
  monoGcd(): Mono {
    let g: Map<string, number> | null = null;
    for (const k of this.t.keys()) {
      const m = new Map(parseKey(k));
      if (!g) g = m;
      else for (const [s, e] of [...g]) g.set(s, Math.min(e, m.get(s) ?? 0));
    }
    return g ? [...g.entries()].filter(([, e]) => e > 0).sort((x, y) => (x[0] < y[0] ? -1 : 1)) : [];
  }
  divMono(m: Mono): Poly {
    const r = new Map<string, Q>();
    for (const [k, c] of this.t) r.set(monoKey(monoDiv(parseKey(k), m)!), c);
    return new Poly(r);
  }
  /** Division exacte (algorithme de division multivariée) ; null si le reste n'est pas nul. */
  divExact(d: Poly): Poly | null {
    if (d.isZero()) return null;
    let rest: Poly = this;
    let quo = new Poly();
    const ld = d.lead();
    let guard = 0;
    while (!rest.isZero()) {
      if (++guard > 500) return null;
      const lr = rest.lead();
      const m = monoDiv(lr.m, ld.m);
      if (!m) return null;
      const c = qdiv(lr.c, ld.c);
      const t = new Poly(new Map([[monoKey(m), c]]));
      quo = quo.add(t);
      rest = rest.sub(d.mulTerm(m, c));
    }
    return quo;
  }
  eval(vals: Record<string, number>): number {
    let s = 0;
    for (const [k, c] of this.t) {
      let v = qnum(c);
      for (const [n, e] of parseKey(k)) {
        const x = symbolValue(n, vals);
        v *= x ** e;
      }
      s += v;
    }
    return s;
  }
}

/** Valeur numérique d'un symbole (atomes trigonométriques compris). */
function symbolValue(n: string, vals: Record<string, number>): number {
  if (n in vals) return vals[n];
  const m = /^(cos|sin|tan)\((.+)\)$/.exec(n);
  if (m) {
    const deg = /^(-?[\d.]+)°$/.exec(m[2]);
    const a = deg ? (Number(deg[1]) * Math.PI) / 180 : vals[`angle:${m[2]}`];
    if (a === undefined) throw new Error(`angle ${m[2]} inconnu`);
    return m[1] === "cos" ? Math.cos(a) : m[1] === "sin" ? Math.sin(a) : Math.tan(a);
  }
  throw new Error(`valeur manquante pour ${n}`);
}

/* ------------------------------------------------------------------ */
/*                        Fractions rationnelles                        */
/* ------------------------------------------------------------------ */
export class Ex {
  constructor(
    readonly num: Poly,
    readonly den: Poly,
  ) {}
  static n(v: number | Q): Ex {
    return new Ex(Poly.c(v), Poly.c(1));
  }
  static s(name: string): Ex {
    return new Ex(Poly.s(name), Poly.c(1));
  }
  static p(p: Poly): Ex {
    return new Ex(p, Poly.c(1));
  }
  static zero = () => Ex.n(0);
  isZero() {
    return this.num.isZero();
  }
  /** Normalisation : facteurs monômes communs, dénominateur unitaire, division exacte. */
  norm(): Ex {
    let num = this.num;
    let den = this.den;
    if (num.isZero()) return new Ex(new Poly(), Poly.c(1));
    const g = monoGcdOf(num, den);
    if (g.length) {
      num = num.divMono(g);
      den = den.divMono(g);
    }
    const lc = den.lead().c;
    if (!(lc.n === B1 && lc.d === B1)) {
      const inv = qdiv(q(1), lc);
      num = num.scale(inv);
      den = den.scale(inv);
    }
    if (den.isConst()) return new Ex(num, den);
    const ex = num.divExact(den);
    if (ex) return new Ex(ex, Poly.c(1));
    return new Ex(num, den);
  }
  add(o: Ex): Ex {
    if (this.den.equals(o.den)) return new Ex(this.num.add(o.num), this.den).norm();
    const k1 = o.den.divExact(this.den);
    if (k1) return new Ex(this.num.mul(k1).add(o.num), o.den).norm();
    const k2 = this.den.divExact(o.den);
    if (k2) return new Ex(this.num.add(o.num.mul(k2)), this.den).norm();
    return new Ex(this.num.mul(o.den).add(o.num.mul(this.den)), this.den.mul(o.den)).norm();
  }
  neg(): Ex {
    return new Ex(this.num.neg(), this.den);
  }
  sub(o: Ex): Ex {
    return this.add(o.neg());
  }
  mul(o: Ex): Ex {
    // simplifications croisées avant de multiplier
    let a = this.num;
    let b = o.num;
    let c = this.den;
    let d = o.den;
    const ad = a.divExact(d);
    if (ad && !d.isConst()) {
      a = ad;
      d = Poly.c(1);
    }
    const bc = b.divExact(c);
    if (bc && !c.isConst()) {
      b = bc;
      c = Poly.c(1);
    }
    return new Ex(a.mul(b), c.mul(d)).norm();
  }
  inv(): Ex {
    if (this.num.isZero()) throw new Error("division par zéro");
    return new Ex(this.den, this.num).norm();
  }
  div(o: Ex): Ex {
    return this.mul(o.inv());
  }
  scale(v: number | Q): Ex {
    return this.mul(Ex.n(v));
  }
  pow(k: number): Ex {
    let r = Ex.n(1);
    for (let i = 0; i < k; i++) r = r.mul(this);
    return r;
  }
  equals(o: Ex): boolean {
    return this.sub(o).isZero();
  }
  eval(vals: Record<string, number>): number {
    return this.num.eval(vals) / this.den.eval(vals);
  }
  symbols(): Set<string> {
    return new Set([...this.num.symbols(), ...this.den.symbols()]);
  }
  /** Remplace un symbole par une expression. */
  subst(sym: string, val: Ex): Ex {
    const sp = (p: Poly): Ex => {
      let r = Ex.zero();
      for (const { m, c } of p.terms()) {
        const e = m.find(([s]) => s === sym)?.[1] ?? 0;
        const rest = m.filter(([s]) => s !== sym);
        const term = new Ex(new Poly(new Map([[monoKey(rest), c]])), Poly.c(1));
        r = r.add(e ? term.mul(val.pow(e)) : term);
      }
      return r;
    };
    return sp(this.num).div(sp(this.den));
  }
  /** Coefficients selon les puissances de `sym` (le dénominateur ne doit pas en dépendre). */
  coeffsIn(sym: string): Ex[] | null {
    if (this.den.degreeIn(sym) > 0) return null;
    const deg = this.num.degreeIn(sym);
    const out: Ex[] = Array.from({ length: deg + 1 }, () => Ex.zero());
    for (const { m, c } of this.num.terms()) {
      const e = m.find(([s]) => s === sym)?.[1] ?? 0;
      const rest = m.filter(([s]) => s !== sym);
      out[e] = out[e].add(new Ex(new Poly(new Map([[monoKey(rest), c]])), this.den));
    }
    return out;
  }
}

function monoGcdOf(a: Poly, b: Poly): Mono {
  const gb = new Map(b.monoGcd());
  return a
    .monoGcd()
    .map(([s, e]) => [s, Math.min(e, gb.get(s) ?? 0)] as [string, number])
    .filter(([, e]) => e > 0);
}

/* ------------------------------------------------------------------ */
/*                               Lecture                                */
/* ------------------------------------------------------------------ */
export class ParseError extends Error {}

type Tok = { k: "num"; v: Q } | { k: "id"; v: string } | { k: "op"; v: string };

function tokenize(src: string): Tok[] {
  const s = src.replace(/[×·∙]/g, "*").replace(/−/g, "-").replace(/²/g, "^2").replace(/³/g, "^3").replace(/,/g, ".");
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const txt = s.slice(i, j);
      if (!/^\d*\.?\d+$|^\d+\.$/.test(txt)) throw new ParseError(`nombre mal écrit : ${txt}`);
      out.push({ k: "num", v: qFromNumber(Number(txt)) });
      i = j;
      continue;
    }
    if (/\p{L}/u.test(ch)) {
      // lettre seule, éventuellement suivie de chiffres (q1) ou d'un indice _x (F_1, V_A)
      let j = i + 1;
      if (s[j] === "_") {
        j++;
        while (j < s.length && /[\p{L}\p{N}]/u.test(s[j])) j++;
      } else while (j < s.length && /\d/.test(s[j])) j++;
      out.push({ k: "id", v: s.slice(i, j) });
      i = j;
      continue;
    }
    if ("+-*/^()".includes(ch)) {
      out.push({ k: "op", v: ch });
      i++;
      continue;
    }
    throw new ParseError(`caractère inattendu : ${ch}`);
  }
  return out;
}

/** Lit une expression littérale : « L/2 », « 2a », « L - a », « qL », « (q1+q2)/2 ». */
export function parseExpr(src: string): Ex {
  const toks = tokenize(src);
  if (toks.length === 0) throw new ParseError("expression vide");
  let i = 0;
  const peek = () => toks[i];
  const eat = (v?: string) => {
    const t = toks[i++];
    if (!t || (v && (t.k !== "op" || t.v !== v))) throw new ParseError(v ? `« ${v} » attendu` : "expression incomplète");
    return t;
  };
  const startsFactor = (t?: Tok) => !!t && (t.k === "num" || t.k === "id" || (t.k === "op" && t.v === "("));
  function expr(): Ex {
    let v = term();
    while (peek()?.k === "op" && (peek()!.v === "+" || peek()!.v === "-")) {
      const op = eat().v;
      const r = term();
      v = op === "+" ? v.add(r) : v.sub(r);
    }
    return v;
  }
  function term(): Ex {
    let v = unary();
    for (;;) {
      const t = peek();
      if (t?.k === "op" && (t.v === "*" || t.v === "/")) {
        eat();
        const r = unary();
        if (t.v === "/" && r.isZero()) throw new ParseError("division par zéro");
        v = t.v === "*" ? v.mul(r) : v.div(r);
      } else if (startsFactor(t)) v = v.mul(power());
      else break;
    }
    return v;
  }
  function unary(): Ex {
    const t = peek();
    if (t?.k === "op" && t.v === "-") {
      eat();
      return unary().neg();
    }
    if (t?.k === "op" && t.v === "+") {
      eat();
      return unary();
    }
    return power();
  }
  function power(): Ex {
    const b = base();
    if (peek()?.k === "op" && peek()!.v === "^") {
      eat();
      const e = eat();
      if (e.k !== "num" || e.v.d !== B1 || e.v.n < B0 || e.v.n > B12) throw new ParseError("exposant entier attendu");
      return b.pow(Number(e.v.n));
    }
    return b;
  }
  function base(): Ex {
    const t = eat();
    if (t.k === "num") return Ex.n(t.v);
    if (t.k === "id") return Ex.s(t.v);
    if (t.v === "(") {
      const v = expr();
      eat(")");
      return v;
    }
    throw new ParseError(`« ${t.v} » inattendu`);
  }
  const v = expr();
  if (i < toks.length) throw new ParseError(`« ${(toks[i] as { v: string }).v} » inattendu`);
  return v;
}

export function tryParse(src: string): { ok: true; ex: Ex } | { ok: false; error: string } {
  try {
    return { ok: true, ex: parseExpr(src) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "expression invalide" };
  }
}

/* ------------------------------------------------------------------ */
/*                              Affichage                               */
/* ------------------------------------------------------------------ */
const GREEK: Record<string, string> = {
  α: "\\alpha",
  β: "\\beta",
  γ: "\\gamma",
  δ: "\\delta",
  θ: "\\theta",
  φ: "\\varphi",
  λ: "\\lambda",
  μ: "\\mu",
  ω: "\\omega",
  ε: "\\varepsilon",
};

function nameTex(n: string): string {
  const g = (s: string) => [...s].map((c) => GREEK[c] ?? c).join("");
  const sub = /^(\p{L})_(.+)$/u.exec(n);
  if (sub) return `${g(sub[1])}_{${g(sub[2])}}`;
  const dig = /^(\p{L})(\d+)$/u.exec(n);
  if (dig) return `${g(dig[1])}_{${dig[2]}}`;
  return g(n);
}

function atomTex(n: string, e: number): string {
  const m = /^(cos|sin|tan)\((.+)\)$/.exec(n);
  if (m) {
    const arg = m[2].endsWith("°") ? `${m[2].slice(0, -1)}^{\\circ}` : nameTex(m[2]);
    return `\\${m[1]}${e > 1 ? `^{${e}}` : ""} ${arg}`;
  }
  return e > 1 ? `${nameTex(n)}^{${e}}` : nameTex(n);
}

/** Ordre d'écriture dans un monôme : nombres, charges, longueurs, x, puis cos / sin. */
const ORDER = ["q", "p", "w", "F", "P", "Q", "R", "C", "M", "H", "V", "N", "T", "E", "I"];
function symRank(n: string): number {
  if (/^(cos|sin|tan)\(/.test(n)) return 900;
  if (n === "x") return 800;
  const k = ORDER.indexOf(n[0]);
  return k >= 0 ? k : 100 + n.charCodeAt(0);
}
function monoTex(m: Mono): string {
  return [...m]
    .sort((a, b) => symRank(a[0]) - symRank(b[0]) || (a[0] < b[0] ? -1 : 1))
    .map(([s, e]) => atomTex(s, e))
    .join(" ");
}

function texInt(b: bigint): string {
  return b.toString();
}

/** Corps d'un terme positif : coefficient a/b, monômes au numérateur et au dénominateur. */
function termBody(n: bigint, d: bigint, numM: Mono, denM: Mono): string {
  // cos^k / sin^k → 1 / tan^k ; sin^k / cos^k → tan^k
  numM = numM.slice();
  denM = denM.slice();
  for (const [s, e] of [...numM]) {
    const mc = /^cos\((.+)\)$/.exec(s);
    if (mc) {
      const k = denM.findIndex(([t, f]) => t === `sin(${mc[1]})` && f === e);
      if (k >= 0) {
        numM = numM.filter(([t]) => t !== s);
        denM[k] = [`tan(${mc[1]})`, e];
      }
    }
    const ms = /^sin\((.+)\)$/.exec(s);
    if (ms) {
      const k = denM.findIndex(([t, f]) => t === `cos(${ms[1]})` && f === e);
      if (k >= 0) {
        numM = numM.map(([t, f]) => (t === s ? [`tan(${ms[1]})`, f] : [t, f])) as Mono;
        denM.splice(k, 1);
      }
    }
  }
  const top = numM.length ? (n === B1 ? monoTex(numM) : `${texInt(n)} ${monoTex(numM)}`) : texInt(n);
  if (d === B1 && denM.length === 0) return top;
  const bottom = denM.length ? (d === B1 ? monoTex(denM) : `${texInt(d)} ${monoTex(denM)}`) : texInt(d);
  return `\\dfrac{${top}}{${bottom}}`;
}

function sortedTerms(p: Poly): { m: Mono; c: Q }[] {
  const deg = (m: Mono) => m.reduce((s, [, e]) => s + e, 0);
  const xdeg = (m: Mono) => m.find(([s]) => s === "x")?.[1] ?? 0;
  return p.terms().sort((a, b) => xdeg(a.m) - xdeg(b.m) || deg(b.m) - deg(a.m) || (monoTex(a.m) < monoTex(b.m) ? -1 : 1));
}

function joinSigned(parts: { neg: boolean; body: string }[]): string {
  if (parts.length === 0) return "0";
  return parts.map((p, i) => (i === 0 ? (p.neg ? `-${p.body}` : p.body) : p.neg ? ` - ${p.body}` : ` + ${p.body}`)).join("");
}

export function polyTex(p: Poly): string {
  return joinSigned(sortedTerms(p).map(({ m, c }) => ({ neg: c.n < B0, body: termBody(abs(c.n), c.d, m, []) })));
}

/** LaTeX d'une expression (termes séparés quand le dénominateur est un monôme). */
export function tex(e: Ex): string {
  const ex = e.norm();
  if (ex.num.isZero()) return "0";
  if (ex.den.isConst()) return polyTex(ex.num.scale(qdiv(q(1), ex.den.constValue())));
  if (ex.den.t.size === 1) {
    const [{ m: dm, c: dc }] = ex.den.terms();
    return joinSigned(
      sortedTerms(ex.num).map(({ m, c }) => {
        const cc = qdiv(c, dc);
        // simplification du monôme avec le dénominateur
        const nm = new Map(m);
        const dmm = new Map<string, number>();
        for (const [s, e2] of dm) {
          const have = nm.get(s) ?? 0;
          const k = Math.min(have, e2);
          if (k) nm.set(s, have - k);
          if (e2 - k) dmm.set(s, e2 - k);
        }
        const numM = [...nm.entries()].filter(([, x]) => x > 0) as Mono;
        const denM = [...dmm.entries()] as Mono;
        return { neg: cc.n < B0, body: termBody(abs(cc.n), cc.d, numM, denM) };
      }),
    );
  }
  // dénominateur polynôme
  let num = ex.num;
  let sign = "";
  if (num.terms().every((t) => t.c.n < B0)) {
    num = num.neg();
    sign = "-";
  }
  return `${sign}\\dfrac{${polyTex(num)}}{${polyTex(ex.den)}}`;
}

/** Expression entre parenthèses si elle comporte plusieurs termes. */
export function texParen(e: Ex): string {
  const t = tex(e);
  return isMultiTerm(e) ? `\\left(${t}\\right)` : t;
}
export function isMultiTerm(e: Ex): boolean {
  const ex = e.norm();
  return ex.num.t.size > 1 && (ex.den.isConst() || ex.den.t.size === 1);
}
export function isNegative(e: Ex, vals: Record<string, number>): boolean {
  return e.eval(vals) < 0;
}

/** Polynôme en x : « a + b x + c x² » avec coefficients littéraux regroupés. */
export function texInX(e: Ex, x = "x"): string {
  const cs = e.norm().coeffsIn(x);
  if (!cs) return tex(e);
  const parts: { neg: boolean; body: string }[] = [];
  cs.forEach((c, k) => {
    if (c.isZero()) return;
    const xs = k === 0 ? "" : k === 1 ? x : `${x}^{${k}}`;
    if (isMultiTerm(c) || (!c.den.isConst() && c.den.t.size > 1)) {
      parts.push({ neg: false, body: k === 0 ? tex(c) : `\\left(${tex(c)}\\right) ${xs}` });
      return;
    }
    let t = tex(c);
    const neg = t.startsWith("-");
    if (neg) t = t.slice(1);
    if (k === 0) parts.push({ neg, body: t });
    else if (t === "1") parts.push({ neg, body: xs });
    else if (t.startsWith("\\dfrac{")) {
      // \dfrac{a}{b} x → \dfrac{a x}{b}
      const inner = /^\\dfrac\{(.*)\}\{(.*)\}$/.exec(t);
      parts.push({ neg, body: inner ? `\\dfrac{${inner[1] === "1" ? xs : `${inner[1]} ${xs}`}}{${inner[2]}}` : `${t} ${xs}` });
    } else parts.push({ neg, body: `${t} ${xs}` });
  });
  return joinSigned(parts);
}

/** Texte simple pour les dessins (indices et exposants lus par LabelText) : « qL^2/8 ». */
/** Nombre de facteurs d'un dénominateur LaTeX (« 2 \\sin \\alpha » → 2) : au-delà d'un, on met des parenthèses. */
function denFactors(b: string): number {
  if (/\s[+-]\s/.test(b)) return 2;
  const t = b.trim().replace(/\\(cos|sin|tan)\s*(\\[a-zA-Z]+|\\left\(.*?\\right\)|[^\s]+)/g, "f");
  return t.split(/\s+/).filter(Boolean).length;
}

export function plain(e: Ex): string {
  const t = tex(e)
    .replace(/_\{([^{}]*)\}/g, "_$1")
    .replace(/\^\{\\circ\}/g, "°")
    .replace(/\^\{([^{}]*)\}/g, "^$1");
  return t
    .replace(/\\dfrac\{([^{}]*)\}\{([^{}]*)\}/g, (_m, a: string, b: string) => `${/[+-]/.test(a.trim().slice(1)) ? `(${a})` : a}/${denFactors(b) > 1 ? `(${b})` : b}`)
    .replace(/\\(cos|sin|tan)/g, "$1")
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\gamma/g, "γ")
    .replace(/\\delta/g, "δ")
    .replace(/\\theta/g, "θ")
    .replace(/\\left\(|\\right\)/g, (m) => (m.includes("left") ? "(" : ")"))
    .replace(/\s+/g, "");
}
