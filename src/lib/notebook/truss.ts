/**
 * Treillis calculé du cahier : modèle éditable (nœuds, barres, appuis,
 * charges aux nœuds), cas types, calcul par le moteur (barres
 * bi-articulées) et rédaction de la méthode des nœuds.
 *
 * Convention : N > 0 en traction (barre tirée), N < 0 en compression. Le
 * polycopié MS1 compte l'effort positif en compression : la rédaction le
 * rappelle.
 */
import { analyze } from "@/lib/mechanics/solver";
import type { AnalysisResult, Load, Structure, StructMember, StructNode } from "@/lib/mechanics/types";
import { texn, txtn } from "./beam-notes";

export type TrussSupport = "free" | "pin" | "roller" | "rollerX";

export interface TrussNode {
  id: string;
  x: number;
  y: number;
  support: TrussSupport;
}

export interface TrussBar {
  id: string;
  i: string;
  j: string;
}

/** Force appliquée à un nœud : intensité F (kN) et direction (degrés, −90 = vers le bas). */
export interface TrussLoad {
  id: string;
  node: string;
  F: number;
  angle: number;
}

export interface TrussModel {
  nodes: TrussNode[];
  bars: TrussBar[];
  loads: TrussLoad[];
  /** kN/m² et m² (sans effet sur les efforts d'un treillis isostatique). */
  E: number;
  A: number;
}

export type TrussPreset = "triangle" | "potence" | "pratt" | "howe" | "warren" | "ferme";

export const TRUSS_PRESETS: { id: TrussPreset; label: string }[] = [
  { id: "triangle", label: "Triangle (3 barres)" },
  { id: "potence", label: "Potence (console au mur)" },
  { id: "pratt", label: "Pratt (diagonales tendues)" },
  { id: "howe", label: "Howe (diagonales comprimées)" },
  { id: "warren", label: "Warren (sans montants)" },
  { id: "ferme", label: "Ferme de toiture à deux pentes" },
];

export interface PresetParams {
  panels: number;
  span: number;
  height: number;
  P: number;
  chord: "top" | "bottom";
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export function nodeName(k: number): string {
  return k < 26 ? LETTERS[k] : `${LETTERS[Math.floor(k / 26) - 1]}${LETTERS[k % 26]}`;
}

export function barName(b: TrussBar): string {
  return `${b.i}${b.j}`;
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** Treillis types, nœuds nommés A, B, C… (membrure inférieure puis supérieure, de gauche à droite). */
export function trussPreset(kind: TrussPreset, p: PresetParams): TrussModel {
  const E = 210e6;
  const A = 20e-4;
  const L = p.span;
  const h = p.height;
  const pts: { x: number; y: number; support?: TrussSupport; top?: boolean }[] = [];
  const links: [number, number][] = [];
  if (kind === "triangle") {
    pts.push({ x: 0, y: 0, support: "pin" }, { x: L, y: 0, support: "roller" }, { x: L / 2, y: h, top: true });
    links.push([0, 1], [0, 2], [1, 2]);
  } else if (kind === "potence") {
    // deux attaches au mur (articulations), barre horizontale et bracon
    pts.push({ x: 0, y: h, support: "pin" }, { x: 0, y: 0, support: "pin" }, { x: L, y: h, top: true });
    links.push([0, 2], [1, 2]);
  } else if (kind === "ferme") {
    const n = 4;
    for (let k = 0; k <= n; k++) pts.push({ x: (k * L) / n, y: 0, support: k === 0 ? "pin" : k === n ? "roller" : undefined });
    pts.push({ x: L / 4, y: h / 2, top: true }, { x: L / 2, y: h, top: true }, { x: (3 * L) / 4, y: h / 2, top: true });
    // indices : bas 0..4, haut 5 (L/4), 6 (L/2), 7 (3L/4)
    links.push([0, 1], [1, 2], [2, 3], [3, 4]);
    links.push([0, 5], [5, 6], [6, 7], [7, 4]);
    links.push([1, 5], [2, 6], [3, 7]);
    links.push([1, 6], [3, 6]);
  } else {
    const n = Math.max(2, Math.round(p.panels));
    const d = L / n;
    for (let k = 0; k <= n; k++) pts.push({ x: k * d, y: 0, support: k === 0 ? "pin" : k === n ? "roller" : undefined });
    if (kind === "warren") {
      for (let k = 0; k < n; k++) pts.push({ x: (k + 0.5) * d, y: h, top: true });
      for (let k = 0; k < n; k++) links.push([k, k + 1]);
      for (let k = 0; k < n - 1; k++) links.push([n + 1 + k, n + 2 + k]);
      for (let k = 0; k < n; k++) links.push([k, n + 1 + k], [n + 1 + k, k + 1]);
    } else {
      for (let k = 0; k <= n; k++) pts.push({ x: k * d, y: h, top: true });
      const T = (k: number) => n + 1 + k;
      for (let k = 0; k < n; k++) links.push([k, k + 1]);
      for (let k = 0; k < n; k++) links.push([T(k), T(k + 1)]);
      for (let k = 0; k <= n; k++) links.push([k, T(k)]);
      for (let k = 0; k < n; k++) {
        const leftHalf = k + 0.5 < n / 2;
        const descendToCenter = kind === "pratt";
        if (leftHalf === descendToCenter) links.push([T(k), k + 1]);
        else links.push([k, T(k + 1)]);
      }
    }
  }
  const nodes: TrussNode[] = pts.map((q, k) => ({ id: nodeName(k), x: r3(q.x), y: r3(q.y), support: q.support ?? "free" }));
  const bars: TrussBar[] = links.map(([a, b], k) => ({ id: `b${k + 1}`, i: nodes[a].id, j: nodes[b].id }));
  const loads: TrussLoad[] = [];
  if (p.P !== 0) {
    pts.forEach((q, k) => {
      if (q.support) return;
      const wanted = kind === "potence" || kind === "triangle" ? !!q.top : p.chord === "top" ? !!q.top : !q.top;
      if (wanted) loads.push({ id: `f${loads.length + 1}`, node: nodes[k].id, F: p.P, angle: -90 });
    });
  }
  return { nodes, bars, loads, E, A };
}

/* ------------------------------------------------------------------ */
/*                              Calcul                                  */
/* ------------------------------------------------------------------ */
export function loadComponents(F: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  const clean = (v: number) => (Math.abs(v) < 1e-12 * Math.max(1, Math.abs(F)) ? 0 : v);
  return { fx: clean(F * Math.cos(a)), fy: clean(F * Math.sin(a)) };
}

export function trussToStructure(m: TrussModel): Structure {
  const nodes: StructNode[] = m.nodes.map((n) => ({ id: n.id, x: n.x, y: n.y, support: n.support }));
  const members: StructMember[] = m.bars.map((b) => ({ id: b.id, i: b.i, j: b.j, E: m.E, A: m.A, I: 1e-6, releaseI: true, releaseJ: true }));
  const loads: Load[] = [];
  for (const l of m.loads) {
    const { fx, fy } = loadComponents(l.F, l.angle);
    if (fx === 0 && fy === 0) continue;
    loads.push({ kind: "nodal", node: l.node, fx, fy, mz: 0 });
  }
  return { nodes, members, loads };
}

export interface TrussAnalysis {
  structure: Structure;
  result: AnalysisResult;
  /** Effort normal de chaque barre (kN, traction > 0). */
  N: Record<string, number>;
  /** b + r − 2n */
  degree: number;
  error?: string;
}

/** Contrôle de cohérence avant calcul (barres valides, appuis, nœuds isolés). */
export function trussProblems(m: TrussModel): string | null {
  const ids = new Set(m.nodes.map((n) => n.id));
  if (m.nodes.length < 2) return "Il faut au moins deux nœuds.";
  if (m.bars.length === 0) return "Ajoutez des barres.";
  for (const b of m.bars) {
    if (!ids.has(b.i) || !ids.has(b.j)) return `La barre ${barName(b)} relie un nœud inexistant.`;
    if (b.i === b.j) return `La barre ${barName(b)} relie un nœud à lui-même.`;
    const a = m.nodes.find((n) => n.id === b.i)!;
    const c = m.nodes.find((n) => n.id === b.j)!;
    if (Math.hypot(a.x - c.x, a.y - c.y) < 1e-6) return `La barre ${barName(b)} est de longueur nulle.`;
  }
  const seen = new Set<string>();
  for (const b of m.bars) {
    const k = [b.i, b.j].sort().join("-");
    if (seen.has(k)) return `La barre ${barName(b)} est en double.`;
    seen.add(k);
  }
  for (const n of m.nodes) if (!m.bars.some((b) => b.i === n.id || b.j === n.id)) return `Le nœud ${n.id} n'est relié à aucune barre.`;
  if (!m.nodes.some((n) => n.support !== "free")) return "Ajoutez des appuis.";
  return null;
}

export function reactionsCount(m: TrussModel): number {
  return m.nodes.reduce((s, n) => s + (n.support === "pin" ? 2 : n.support === "roller" || n.support === "rollerX" ? 1 : 0), 0);
}

export function analyzeTruss(m: TrussModel): TrussAnalysis {
  const structure = trussToStructure(m);
  const degree = m.bars.length + reactionsCount(m) - 2 * m.nodes.length;
  const problem = trussProblems(m);
  if (problem) return { structure, result: { ok: false, error: problem }, N: {}, degree, error: problem };
  const result = analyze(structure);
  const N: Record<string, number> = {};
  if (result.ok) for (const b of m.bars) N[b.id] = result.members[b.id].forcesAt(result.members[b.id].L / 2).N;
  return { structure, result, N, degree, error: result.ok ? undefined : result.error };
}

/* ------------------------------------------------------------------ */
/*                    Rédaction : méthode des nœuds                     */
/* ------------------------------------------------------------------ */
export interface JointEquation {
  node: string;
  /** Barres inconnues résolues à ce nœud. */
  unknowns: string[];
  /** Coefficients des équations ΣFx et ΣFy : par barre (id) puis termes connus. */
  cx: Record<string, number>;
  cy: Record<string, number>;
  /** Forces extérieures et réactions au nœud (kN). */
  extX: number;
  extY: number;
  texX: string;
  texY: string;
}

const SUPPORT_NAME: Record<TrussSupport, string> = { free: "", pin: "articulation", roller: "appui simple", rollerX: "appui simple (plan vertical)" };

function coefTerm(c: number, sym: string, first: boolean): string {
  if (Math.abs(c) < 1e-9) return "";
  const mag = Math.abs(c);
  const body = Math.abs(mag - 1) < 1e-9 ? sym : `${texn(mag, 3)}\\,${sym}`;
  if (first) return c < 0 ? `-${body}` : body;
  return c < 0 ? ` - ${body}` : ` + ${body}`;
}

function numTerm(v: number, first: boolean): string {
  if (Math.abs(v) < 1e-9) return "";
  if (first) return texn(v, 2);
  return v < 0 ? ` - ${texn(-v, 2)}` : ` + ${texn(v, 2)}`;
}

/** Ordre de résolution « nœud à deux inconnues au plus » et équations correspondantes. */
export function jointEquations(m: TrussModel, an: TrussAnalysis): { steps: JointEquation[]; complete: boolean } {
  const known = new Set<string>();
  const done = new Set<string>();
  const steps: JointEquation[] = [];
  const nodeById = new Map(m.nodes.map((n) => [n.id, n]));
  const reactions = an.result.ok ? an.result.reactions : {};
  const incident = (id: string) => m.bars.filter((b) => b.i === id || b.j === id);
  for (;;) {
    // nœud suivant : de préférence à exactement deux barres inconnues, sinon une seule
    const count = (n: TrussNode) => incident(n.id).filter((b) => !known.has(b.id)).length;
    const open = m.nodes.filter((n) => !done.has(n.id));
    const pick = open.find((n) => count(n) === 2) ?? open.find((n) => count(n) === 1) ?? null;
    if (!pick) break;
    const n = pick;
    const cx: Record<string, number> = {};
    const cy: Record<string, number> = {};
    let texX = "";
    let texY = "";
    for (const b of incident(n.id)) {
      const other = nodeById.get(b.i === n.id ? b.j : b.i)!;
      const len = Math.hypot(other.x - n.x, other.y - n.y);
      const ux = (other.x - n.x) / len;
      const uy = (other.y - n.y) / len;
      cx[b.id] = Math.abs(ux) < 1e-12 ? 0 : ux;
      cy[b.id] = Math.abs(uy) < 1e-12 ? 0 : uy;
      const sym = `N_{${barName(b)}}`;
      texX += coefTerm(cx[b.id], sym, texX === "");
      texY += coefTerm(cy[b.id], sym, texY === "");
    }
    let extX = 0;
    let extY = 0;
    const r = reactions[n.id];
    if (r) {
      if (r.blocked.x) {
        extX += r.rx;
        texX += texX === "" ? `H_${n.id}` : ` + H_${n.id}`;
      }
      if (r.blocked.y) {
        extY += r.ry;
        texY += texY === "" ? `V_${n.id}` : ` + V_${n.id}`;
      }
    }
    for (const l of m.loads.filter((l) => l.node === n.id)) {
      const { fx, fy } = loadComponents(l.F, l.angle);
      extX += fx;
      extY += fy;
      texX += numTerm(fx, texX === "");
      texY += numTerm(fy, texY === "");
    }
    const unknowns = incident(n.id)
      .filter((b) => !known.has(b.id))
      .map((b) => b.id);
    steps.push({ node: n.id, unknowns, cx, cy, extX, extY, texX: (texX || "0") + " = 0", texY: (texY || "0") + " = 0" });
    for (const id of unknowns) known.add(id);
    done.add(n.id);
  }
  return { steps, complete: m.bars.every((b) => known.has(b.id)) };
}

function nature(N: number, scale: number): string {
  if (Math.abs(N) < 1e-6 * Math.max(1, scale)) return "barre non sollicitée";
  return N > 0 ? "traction" : "compression";
}

/** Rédaction complète : isostaticité, réactions, méthode des nœuds, tableau des efforts. */
export function trussMarkdown(m: TrussModel, an: TrussAnalysis = analyzeTruss(m), opts: { joints?: boolean; table?: boolean } = { joints: true, table: true }): string {
  const out: string[] = ["### Treillis — efforts dans les barres"];
  const r = reactionsCount(m);
  out.push(
    `**Isostaticité** : $b + r - 2n = ${m.bars.length} + ${r} - 2 \\times ${m.nodes.length} = ${an.degree}$ → ${an.degree === 0 ? "isostatique" : an.degree > 0 ? `hyperstatique de degré ${an.degree}` : "mécanisme (hypostatique)"}.`,
  );
  if (!an.result.ok) {
    out.push("", `*Calcul impossible : ${an.error}*`);
    return out.join("\n");
  }
  const res = an.result;
  const scale = Math.max(1e-9, ...Object.values(an.N).map(Math.abs));

  // Réactions (PFS)
  out.push("", "**Réactions d'appui (PFS)**");
  const supports = m.nodes.filter((n) => n.support !== "free");
  const pin = supports.filter((s) => s.support === "pin");
  const roller = supports.filter((s) => s.support === "roller");
  const loadsC = m.loads.map((l) => ({ ...l, ...loadComponents(l.F, l.angle), at: m.nodes.find((n) => n.id === l.node)! })).filter((l) => l.at);
  if (supports.length === 2 && pin.length === 1 && roller.length === 1) {
    const A = pin[0];
    const B = roller[0];
    const d = B.x - A.x;
    let mt = "";
    for (const l of loadsC) {
      const mom = (l.at.x - A.x) * l.fy - (l.at.y - A.y) * l.fx;
      if (Math.abs(mom) > 1e-9) mt += mom < 0 ? ` - ${texn(-mom, 2)}` : ` + ${texn(mom, 2)}`;
    }
    const rA = res.reactions[A.id];
    const rB = res.reactions[B.id];
    const sumFx = loadsC.reduce((s, l) => s + l.fx, 0);
    const sumFy = loadsC.reduce((s, l) => s + l.fy, 0);
    if (Math.abs(d) > 1e-9) {
      out.push(`$$\\Sigma M_{/${A.id}} = 0 :\\; ${texn(d, 2)}\\,V_${B.id}${mt} = 0 \\;\\Rightarrow\\; V_${B.id} = ${texn(rB.ry, 2)}\\ \\text{kN}$$`);
    }
    out.push(`$$\\Sigma F_y = 0 :\\; V_${A.id} + V_${B.id}${numTerm(sumFy, false)} = 0 \\;\\Rightarrow\\; V_${A.id} = ${texn(rA.ry, 2)}\\ \\text{kN}$$`);
    out.push(`$$\\Sigma F_x = 0 :\\; H_${A.id}${numTerm(sumFx, false)} = 0 \\;\\Rightarrow\\; H_${A.id} = ${texn(rA.rx, 2)}\\ \\text{kN}$$`);
  } else {
    for (const s of supports) {
      const rr = res.reactions[s.id];
      const parts: string[] = [];
      if (rr.blocked.x) parts.push(`$H_${s.id} = ${texn(rr.rx, 2)}$ kN`);
      if (rr.blocked.y) parts.push(`$V_${s.id} = ${texn(rr.ry, 2)}$ kN`);
      out.push(`- ${s.id} (${SUPPORT_NAME[s.support]}) : ${parts.join(" ; ")}`);
    }
  }

  // Méthode des nœuds
  if (opts.joints !== false) {
    const { steps, complete } = jointEquations(m, an);
    out.push("", "**Méthode des nœuds** — chaque barre est supposée tendue (effort orienté vers l'extérieur du nœud) ; un résultat négatif indique une compression.");
    for (const st of steps) {
      out.push("", `*Nœud ${st.node}*`);
      out.push(`$$\\Sigma F_x = 0 :\\; ${st.texX}$$`);
      out.push(`$$\\Sigma F_y = 0 :\\; ${st.texY}$$`);
      const vals = st.unknowns.map((id) => {
        const b = m.bars.find((x) => x.id === id)!;
        return `N_{${barName(b)}} = ${texn(an.N[id], 2)}\\ \\text{kN}`;
      });
      out.push(`$$\\Rightarrow\\; ${vals.join(" \\qquad ")}$$`);
    }
    if (!complete) out.push("", "*Aucun nœud ne présente plus deux inconnues au plus : les efforts restants sont obtenus par le calcul matriciel (ou par une coupe de Ritter).*");
  }

  // Tableau des efforts
  if (opts.table !== false) {
    out.push("", "**Efforts dans les barres**", "", "| Barre | Longueur (m) | N (kN) | Nature |", "|---|---|---|---|");
    for (const b of m.bars) {
      const a = m.nodes.find((n) => n.id === b.i)!;
      const c = m.nodes.find((n) => n.id === b.j)!;
      out.push(`| ${barName(b)} | ${txtn(Math.hypot(a.x - c.x, a.y - c.y), 2)} | ${txtn(an.N[b.id], 2)} | ${nature(an.N[b.id], scale)} |`);
    }
    out.push("", "*N > 0 : traction ; N < 0 : compression. Le polycopié MS1 compte l'effort positif en compression.*");
  }
  return out.join("\n");
}
