/**
 * Treillis en calcul littéral : coordonnées et charges en lettres (a, h, P…),
 * angles des barres inclinées nommés α, β, γ… (tan α = h/a). Réactions et
 * méthode des nœuds rédigées avec des lettres et des chiffres ; les valeurs
 * des lettres ne servent qu'au dessin.
 *
 * Convention : chaque barre est supposée tendue ; N > 0 traction, N < 0
 * compression.
 */
import { Ex, parseExpr, tex, texParen } from "./symbolic";
import type { LitVar } from "./literal-beam";
import { defaultValue, forceComponents } from "./literal-beam";
import { barName, nodeName, type TrussBar, type TrussModel, type TrussPreset, type TrussSupport } from "./truss";

export interface LitTruss {
  vars: LitVar[];
  nodes: { id: string; x: string; y: string; support: TrussSupport }[];
  bars: TrussBar[];
  loads: { id: string; node: string; F: string; angle: number }[];
}

const GREEK = ["α", "β", "γ", "δ", "θ", "φ", "λ", "μ", "ω", "ε"];

interface PNode {
  id: string;
  x: Ex;
  y: Ex;
  xv: number;
  yv: number;
  support: TrussSupport;
}

export interface ParsedTruss {
  nodes: PNode[];
  bars: TrussBar[];
  loads: { id: string; node: string; F: Ex; fx: Ex; fy: Ex; angle: number }[];
  vals: Record<string, number>;
  /** Groupes d'angles : nom, définition tan = …, valeur (dessin, rad). */
  angles: { name: string; tanTex: string; rad: number }[];
  /** Direction de chaque barre vue depuis son nœud i : composantes littérales. */
  dir: Map<string, { cx: Ex; cy: Ex; cxv: number; cyv: number }>;
}

function srcList(lit: LitTruss): [string, string][] {
  const out: [string, string][] = [];
  lit.nodes.forEach((n) => out.push([`Nœud ${n.id} (x)`, n.x], [`Nœud ${n.id} (y)`, n.y]));
  lit.loads.forEach((l, k) => out.push([`Force ${k + 1}`, l.F]));
  return out;
}

export function litTrussSymbols(lit: LitTruss): string[] {
  const s = new Set<string>();
  for (const [, src] of srcList(lit)) {
    try {
      for (const n of parseExpr(src).symbols()) if (!/^(cos|sin|tan)\(/.test(n)) s.add(n);
    } catch {
      /* signalé ailleurs */
    }
  }
  return [...s].sort();
}

export function parseTruss(lit: LitTruss): { ok: true; p: ParsedTruss } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const vals: Record<string, number> = {};
  for (const v of lit.vars) vals[v.name] = v.value;
  for (const n of litTrussSymbols(lit)) if (!(n in vals)) vals[n] = n[0] === "a" || n[0] === "d" || n[0] === "l" ? 2 : defaultValue(n, vals);
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
  const nodes: PNode[] = lit.nodes.map((n) => {
    const x = P(`Nœud ${n.id} (x)`, n.x);
    const y = P(`Nœud ${n.id} (y)`, n.y);
    return { id: n.id, x, y, xv: x.eval(vals), yv: y.eval(vals), support: n.support };
  });
  const loads = lit.loads.map((l, k) => {
    const F = P(`Force ${k + 1}`, l.F);
    return { id: l.id, node: l.node, F, angle: l.angle, ...forceComponents(F, l.angle) };
  });
  if (errors.length) return { ok: false, errors };
  // angles des barres inclinées, regroupés par pente littérale
  const angles: ParsedTruss["angles"] = [];
  const byTan = new Map<string, string>();
  const dir = new Map<string, { cx: Ex; cy: Ex; cxv: number; cyv: number }>();
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  for (const b of lit.bars) {
    const a = nodeById.get(b.i);
    const c = nodeById.get(b.j);
    if (!a || !c) continue;
    const dx = c.x.sub(a.x);
    const dy = c.y.sub(a.y);
    const dxv = c.xv - a.xv;
    const dyv = c.yv - a.yv;
    const sx = dxv < 0 ? -1 : 1;
    const sy = dyv < 0 ? -1 : 1;
    if (dy.isZero()) dir.set(b.id, { cx: Ex.n(sx), cy: Ex.zero(), cxv: sx, cyv: 0 });
    else if (dx.isZero()) dir.set(b.id, { cx: Ex.zero(), cy: Ex.n(sy), cxv: 0, cyv: sy });
    else {
      const ratio = dy.scale(sy).div(dx.scale(sx));
      const key = tex(ratio);
      let name = byTan.get(key);
      const rad = Math.atan2(Math.abs(dyv), Math.abs(dxv));
      if (!name) {
        name = GREEK[angles.length] ?? `θ${angles.length + 1}`;
        byTan.set(key, name);
        angles.push({ name, tanTex: key, rad });
      }
      vals[`angle:${name}`] = angles.find((g) => g.name === name)!.rad;
      dir.set(b.id, { cx: Ex.s(`cos(${name})`).scale(sx), cy: Ex.s(`sin(${name})`).scale(sy), cxv: sx * Math.cos(rad), cyv: sy * Math.sin(rad) });
    }
  }
  return { ok: true, p: { nodes, bars: lit.bars, loads, vals, angles, dir } };
}

export function litTrussToModel(lit: LitTruss): TrussModel | null {
  const r = parseTruss(lit);
  if (!r.ok) return null;
  const v = (e: Ex) => e.eval(r.p.vals);
  return {
    nodes: r.p.nodes.map((n) => ({ id: n.id, x: n.xv, y: n.yv, support: n.support })),
    bars: lit.bars.map((b) => ({ ...b })),
    loads: r.p.loads.map((l) => ({ id: l.id, node: l.node, F: v(l.F), angle: l.angle })),
    E: 210e6,
    A: 20e-4,
  };
}

/* ------------------------------------------------------------------ */
/*                    Résolution littérale (nœuds)                      */
/* ------------------------------------------------------------------ */
interface Step {
  node: string;
  texX: string;
  texY: string;
  solved: { sym: string; value: Ex }[];
}

export interface LitTrussSolution {
  ok: boolean;
  reason?: string;
  /** Réactions par le PFS global (articulation + appui simple). */
  global: string[];
  steps: Step[];
  /** Effort de chaque barre (id → expression). */
  N: Map<string, Ex>;
  reactions: Map<string, Ex>;
}

const sym = (b: TrussBar) => `N_${barName(b)}`;

function term(coef: Ex, symbolTex: string, vals: Record<string, number>): { neg: boolean; body: string } | null {
  if (coef.isZero()) return null;
  const v = coef.eval(vals);
  const a = v < 0 ? coef.neg() : coef;
  const t = tex(a);
  return { neg: v < 0, body: t === "1" ? symbolTex : `${symbolTex}\\,${t}` };
}

function join(parts: ({ neg: boolean; body: string } | null)[]): string {
  const ps = parts.filter((p): p is { neg: boolean; body: string } => !!p);
  if (!ps.length) return "0";
  return ps.map((p, i) => (i === 0 ? (p.neg ? `-${p.body}` : p.body) : p.neg ? ` - ${p.body}` : ` + ${p.body}`)).join("");
}

export function solveLitTruss(p: ParsedTruss): LitTrussSolution {
  const N = new Map<string, Ex>();
  const reactions = new Map<string, Ex>();
  const global: string[] = [];
  const steps: Step[] = [];
  const incident = (id: string) => p.bars.filter((b) => b.i === id || b.j === id);
  const reactComps = (n: PNode) => [...(n.support === "pin" || n.support === "rollerX" ? [`H_${n.id}`] : []), ...(n.support === "pin" || n.support === "roller" ? [`V_${n.id}`] : [])];
  const loadsAt = (id: string) => p.loads.filter((l) => l.node === id);

  // PFS global quand les appuis sont une articulation et un appui simple
  const sup = p.nodes.filter((n) => n.support !== "free");
  const pin = sup.filter((n) => n.support === "pin");
  const rol = sup.filter((n) => n.support === "roller");
  if (sup.length === 2 && pin.length === 1 && rol.length === 1 && Math.abs(rol[0].xv - pin[0].xv) > 1e-9) {
    const A = pin[0];
    const B = rol[0];
    const arm = B.x.sub(A.x);
    let mom = Ex.zero();
    const mt: ({ neg: boolean; body: string } | null)[] = [];
    const ad = arm.eval(p.vals);
    mt.push({ neg: ad < 0, body: `V_{${B.id}} \\times ${texParen(ad < 0 ? arm.neg() : arm)}` });
    for (const l of p.loads) {
      const n = p.nodes.find((x) => x.id === l.node)!;
      const dxa = n.x.sub(A.x);
      const dya = n.y.sub(A.y);
      const m = dxa.mul(l.fy).sub(dya.mul(l.fx));
      if (m.isZero()) continue;
      mom = mom.add(m);
      // force × bras de levier (composante par composante)
      if (!l.fy.isZero() && !dxa.isZero()) {
        const v = dxa.mul(l.fy).eval(p.vals);
        const f = l.fy.eval(p.vals) < 0 ? l.fy.neg() : l.fy;
        const d = dxa.eval(p.vals) < 0 ? dxa.neg() : dxa;
        mt.push({ neg: v < 0, body: `${texParen(f)} \\times ${texParen(d)}` });
      }
      if (!l.fx.isZero() && !dya.isZero()) {
        const v = dya.mul(l.fx).neg().eval(p.vals);
        const f = l.fx.eval(p.vals) < 0 ? l.fx.neg() : l.fx;
        const d = dya.eval(p.vals) < 0 ? dya.neg() : dya;
        mt.push({ neg: v < 0, body: `${texParen(f)} \\times ${texParen(d)}` });
      }
    }
    const VB = mom.neg().div(arm);
    let sfy = Ex.zero();
    let sfx = Ex.zero();
    const fyT: ({ neg: boolean; body: string } | null)[] = [{ neg: false, body: `V_{${A.id}}` }, { neg: false, body: `V_{${B.id}}` }];
    const fxT: ({ neg: boolean; body: string } | null)[] = [{ neg: false, body: `H_{${A.id}}` }];
    for (const l of p.loads) {
      sfy = sfy.add(l.fy);
      sfx = sfx.add(l.fx);
      fyT.push(term(l.fy, "", p.vals) && { neg: l.fy.eval(p.vals) < 0, body: tex(l.fy.eval(p.vals) < 0 ? l.fy.neg() : l.fy) });
      fxT.push(l.fx.isZero() ? null : { neg: l.fx.eval(p.vals) < 0, body: tex(l.fx.eval(p.vals) < 0 ? l.fx.neg() : l.fx) });
    }
    const VA = sfy.neg().sub(VB);
    const HA = sfx.neg();
    reactions.set(`V_${B.id}`, VB);
    reactions.set(`V_${A.id}`, VA);
    reactions.set(`H_${A.id}`, HA);
    global.push(`$$\\Sigma M_{/${A.id}} = 0 :\\; ${join(mt)} = 0 \\;\\Rightarrow\\; V_{${B.id}} = ${tex(VB)}$$`);
    global.push(`$$\\Sigma F_y = 0 :\\; ${join(fyT)} = 0 \\;\\Rightarrow\\; V_{${A.id}} = ${tex(VA)}$$`);
    global.push(`$$\\Sigma F_x = 0 :\\; ${join(fxT)} = 0 \\;\\Rightarrow\\; H_{${A.id}} = ${tex(HA)}$$`);
  }

  const done = new Set<string>();
  for (let guard = 0; guard < 400; guard++) {
    const open = p.nodes.filter((n) => !done.has(n.id));
    if (!open.length) break;
    const unknownsOf = (n: PNode) => [...incident(n.id).filter((b) => !N.has(b.id)).map((b) => b.id), ...reactComps(n).filter((r) => !reactions.has(r))];
    const pick = open.find((n) => unknownsOf(n).length === 2) ?? open.find((n) => unknownsOf(n).length === 1);
    if (!pick) break;
    const unk = unknownsOf(pick);
    // ΣFx et ΣFy : coefficients des inconnues et partie connue
    const coefX = new Map<string, Ex>();
    const coefY = new Map<string, Ex>();
    let cX = Ex.zero();
    let cY = Ex.zero();
    const tX: ({ neg: boolean; body: string } | null)[] = [];
    const tY: ({ neg: boolean; body: string } | null)[] = [];
    for (const b of incident(pick.id)) {
      const d = p.dir.get(b.id)!;
      const fromI = b.i === pick.id;
      const cx = fromI ? d.cx : d.cx.neg();
      const cy = fromI ? d.cy : d.cy.neg();
      const s = `N_{${barName(b)}}`;
      tX.push(term(cx, s, p.vals));
      tY.push(term(cy, s, p.vals));
      if (N.has(b.id)) {
        cX = cX.add(cx.mul(N.get(b.id)!));
        cY = cY.add(cy.mul(N.get(b.id)!));
      } else {
        coefX.set(b.id, cx);
        coefY.set(b.id, cy);
      }
    }
    for (const r of reactComps(pick)) {
      const isH = r.startsWith("H");
      (isH ? tX : tY).push({ neg: false, body: `${r[0]}_{${pick.id}}` });
      if (reactions.has(r)) {
        if (isH) cX = cX.add(reactions.get(r)!);
        else cY = cY.add(reactions.get(r)!);
      } else (isH ? coefX : coefY).set(r, Ex.n(1));
    }
    for (const l of loadsAt(pick.id)) {
      cX = cX.add(l.fx);
      cY = cY.add(l.fy);
      if (!l.fx.isZero()) tX.push({ neg: l.fx.eval(p.vals) < 0, body: tex(l.fx.eval(p.vals) < 0 ? l.fx.neg() : l.fx) });
      if (!l.fy.isZero()) tY.push({ neg: l.fy.eval(p.vals) < 0, body: tex(l.fy.eval(p.vals) < 0 ? l.fy.neg() : l.fy) });
    }
    const a = (m: Map<string, Ex>, k: string) => m.get(k) ?? Ex.zero();
    const solved: { sym: string; value: Ex }[] = [];
    if (unk.length === 2) {
      const [u1, u2] = unk;
      const a11 = a(coefX, u1);
      const a12 = a(coefX, u2);
      const a21 = a(coefY, u1);
      const a22 = a(coefY, u2);
      const D = a11.mul(a22).sub(a12.mul(a21));
      if (D.isZero()) return { ok: false, reason: `Au nœud ${pick.id}, les deux barres inconnues sont alignées : le treillis est un mécanisme.`, global, steps, N, reactions };
      const v1 = a12.mul(cY).sub(a22.mul(cX)).div(D);
      const v2 = a21.mul(cX).sub(a11.mul(cY)).div(D);
      solved.push({ sym: u1, value: v1 }, { sym: u2, value: v2 });
    } else {
      const [u] = unk;
      const ax = a(coefX, u);
      const ay = a(coefY, u);
      const useX = !ax.isZero();
      if (!useX && ay.isZero()) return { ok: false, reason: `Au nœud ${pick.id}, l'inconnue n'apparaît dans aucune équation.`, global, steps, N, reactions };
      solved.push({ sym: u, value: (useX ? cX : cY).neg().div(useX ? ax : ay) });
    }
    for (const s of solved) {
      if (s.sym.startsWith("H_") || s.sym.startsWith("V_")) reactions.set(s.sym, s.value);
      else N.set(s.sym, s.value);
    }
    steps.push({
      node: pick.id,
      texX: `${join(tX)} = 0`,
      texY: `${join(tY)} = 0`,
      solved: solved.map((s) => {
        const bar = p.bars.find((b) => b.id === s.sym);
        return { sym: bar ? `N_{${barName(bar)}}` : `${s.sym[0]}_{${s.sym.slice(2)}}`, value: s.value };
      }),
    });
    done.add(pick.id);
  }
  const complete = p.bars.every((b) => N.has(b.id));
  void sym;
  return complete
    ? { ok: true, global, steps, N, reactions }
    : { ok: false, reason: "Aucun nœud ne présente plus deux inconnues au plus : treillis complexe (coupe de Ritter ou calcul matriciel).", global, steps, N, reactions };
}

/* ------------------------------------------------------------------ */
/*                              Rédaction                               */
/* ------------------------------------------------------------------ */
export function litTrussMarkdown(lit: LitTruss): string {
  const out = ["### Treillis — efforts dans les barres"];
  const r = parseTruss(lit);
  if (!r.ok) return out.concat(`*${r.errors.join(" ; ")}*`).join("\n");
  const p = r.p;
  const rc = p.nodes.reduce((s, n) => s + (n.support === "pin" ? 2 : n.support === "free" ? 0 : 1), 0);
  const h = p.bars.length + rc - 2 * p.nodes.length;
  out.push(`**Isostaticité** : $b + r - 2n = ${p.bars.length} + ${rc} - 2 \\times ${p.nodes.length} = ${h}$ → ${h === 0 ? "isostatique" : h > 0 ? `hyperstatique de degré ${h}` : "mécanisme"}.`);
  if (p.angles.length) {
    out.push("", `**Angles des barres inclinées** (avec l'horizontale) : ${p.angles.map((g) => `$\\tan ${tex(Ex.s(g.name))} = ${g.tanTex}$`).join(" ; ")}`);
  }
  const s = solveLitTruss(p);
  if (s.global.length) out.push("", "**Réactions d'appui (PFS)**", ...s.global);
  out.push("", "**Méthode des nœuds** — chaque barre est supposée tendue (effort orienté vers l'extérieur du nœud) ; un résultat négatif indique une compression.");
  for (const st of s.steps) {
    out.push("", `*Nœud ${st.node}*`, `$$\\Sigma F_x = 0 :\\; ${st.texX}$$`, `$$\\Sigma F_y = 0 :\\; ${st.texY}$$`);
    out.push(`$$\\Rightarrow\\; ${st.solved.map((v) => `${v.sym} = ${tex(v.value)}`).join(" \\qquad ")}$$`);
  }
  if (!s.ok) {
    out.push("", `*${s.reason}*`);
    return out.join("\n");
  }
  out.push("", "**Efforts dans les barres**", "", "| Barre | N | Nature |", "|---|---|---|");
  for (const b of p.bars) {
    const v = s.N.get(b.id)!;
    const nv = v.eval(p.vals);
    const scale = Math.max(1e-9, ...[...s.N.values()].map((x) => Math.abs(x.eval(p.vals))));
    out.push(`| ${barName(b)} | $${tex(v)}$ | ${Math.abs(nv) < 1e-9 * scale ? "barre non sollicitée" : nv > 0 ? "traction" : "compression"} |`);
  }
  out.push("", "*N > 0 : traction ; N < 0 : compression. Le polycopié MS1 compte l'effort positif en compression.*");
  return out.join("\n");
}

/* ------------------------------------------------------------------ */
/*                            Cas types                                 */
/* ------------------------------------------------------------------ */
/** Treillis types en lettres : panneaux de largeur a, hauteur h, charges P. */
export function litTrussPreset(kind: TrussPreset, panels = 4, chord: "top" | "bottom" = "top"): LitTruss {
  const pts: { x: string; y: string; support?: TrussSupport; top?: boolean }[] = [];
  const links: [number, number][] = [];
  const k = (i: number, unit: string) => (i === 0 ? "0" : i === 1 ? unit : `${i}${unit}`);
  const half = (i: number, unit: string) => (i === 0 ? `${unit}/2` : `${2 * i + 1}${unit}/2`);
  if (kind === "triangle") {
    pts.push({ x: "0", y: "0", support: "pin" }, { x: "2a", y: "0", support: "roller" }, { x: "a", y: "h", top: true });
    links.push([0, 1], [0, 2], [1, 2]);
  } else if (kind === "potence") {
    pts.push({ x: "0", y: "h", support: "pin" }, { x: "0", y: "0", support: "pin" }, { x: "a", y: "h", top: true });
    links.push([0, 2], [1, 2]);
  } else if (kind === "ferme") {
    for (let i = 0; i <= 4; i++) pts.push({ x: k(i, "a"), y: "0", support: i === 0 ? "pin" : i === 4 ? "roller" : undefined });
    pts.push({ x: "a", y: "h/2", top: true }, { x: "2a", y: "h", top: true }, { x: "3a", y: "h/2", top: true });
    links.push([0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 4], [1, 5], [2, 6], [3, 7], [1, 6], [3, 6]);
  } else {
    const n = Math.max(2, Math.round(panels));
    for (let i = 0; i <= n; i++) pts.push({ x: k(i, "a"), y: "0", support: i === 0 ? "pin" : i === n ? "roller" : undefined });
    if (kind === "warren") {
      for (let i = 0; i < n; i++) pts.push({ x: half(i, "a"), y: "h", top: true });
      for (let i = 0; i < n; i++) links.push([i, i + 1]);
      for (let i = 0; i < n - 1; i++) links.push([n + 1 + i, n + 2 + i]);
      for (let i = 0; i < n; i++) links.push([i, n + 1 + i], [n + 1 + i, i + 1]);
    } else {
      for (let i = 0; i <= n; i++) pts.push({ x: k(i, "a"), y: "h", top: true });
      const T = (i: number) => n + 1 + i;
      for (let i = 0; i < n; i++) links.push([i, i + 1]);
      for (let i = 0; i < n; i++) links.push([T(i), T(i + 1)]);
      for (let i = 0; i <= n; i++) links.push([i, T(i)]);
      for (let i = 0; i < n; i++) {
        const leftHalf = i + 0.5 < n / 2;
        if (leftHalf === (kind === "pratt")) links.push([T(i), i + 1]);
        else links.push([i, T(i + 1)]);
      }
    }
  }
  const nodes = pts.map((q, i) => ({ id: nodeName(i), x: q.x, y: q.y, support: q.support ?? ("free" as TrussSupport) }));
  const bars = links.map(([a, b], i) => ({ id: `b${i + 1}`, i: nodes[a].id, j: nodes[b].id }));
  const loads: LitTruss["loads"] = [];
  pts.forEach((q, i) => {
    if (q.support) return;
    const wanted = kind === "potence" || kind === "triangle" ? !!q.top : chord === "top" ? !!q.top : !q.top;
    if (wanted) loads.push({ id: `f${loads.length + 1}`, node: nodes[i].id, F: "P", angle: -90 });
  });
  return { vars: [{ name: "a", value: 2 }, { name: "h", value: 2 }, { name: "P", value: 10 }], nodes, bars, loads };
}

/** Lettres proposées pour un treillis saisi en valeurs (ancienne version du cahier). */
export function literalTrussFromNumeric(m: TrussModel): LitTruss {
  const xs = [...new Set(m.nodes.map((n) => n.x))].sort((a, b) => a - b);
  const steps = xs.slice(1).map((x, i) => x - xs[i]).filter((d) => d > 1e-9);
  const a = steps.length ? Math.min(...steps) : 1;
  const H = Math.max(...m.nodes.map((n) => Math.abs(n.y)), 0) || 1;
  const toExpr = (v: number, unit: string, u: number) => {
    if (Math.abs(v) < 1e-9) return "0";
    for (const d of [1, 2, 3, 4]) {
      const k = Math.round((v / u) * d);
      if (Math.abs((k / d) * u - v) < 1e-9 * Math.max(1, Math.abs(v))) {
        if (d === 1) return k === 1 ? unit : k === -1 ? `-${unit}` : `${k}${unit}`;
        return `${k}${unit}/${d}`;
      }
    }
    return null;
  };
  const vars: LitVar[] = [{ name: "a", value: a }, { name: "h", value: H }];
  let extra = 0;
  const free = (v: number) => {
    const name = `c${++extra}`;
    vars.push({ name, value: v });
    return name;
  };
  const distinctP = [...new Set(m.loads.map((l) => Math.abs(l.F).toFixed(6)))];
  distinctP.forEach((d, i) => vars.push({ name: distinctP.length === 1 ? "P" : `P_${i + 1}`, value: Number(d) }));
  return {
    vars,
    nodes: m.nodes.map((n) => ({ id: n.id, x: toExpr(n.x, "a", a) ?? free(n.x), y: toExpr(n.y, "h", H) ?? free(n.y), support: n.support })),
    bars: m.bars.map((b) => ({ ...b })),
    loads: m.loads.map((l) => {
      const i = distinctP.indexOf(Math.abs(l.F).toFixed(6));
      const name = distinctP.length === 1 ? "P" : `P_${i + 1}`;
      return { id: l.id, node: l.node, F: l.F < 0 ? `-${name}` : name, angle: l.angle };
    }),
  };
}
