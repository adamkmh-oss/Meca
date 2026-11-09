/**
 * Outils du tuteur : tout résultat numérique présenté à l'étudiant passe par
 * ces fonctions, branchées sur le moteur de calcul de STRUCTURA.
 */
import { z } from "zod";
import type { BetaTool } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { analyzeBeam, type BeamLoad, type BeamModel } from "@/lib/mechanics/beam";
import { handCalcBeam, segmentEquations } from "@/lib/mechanics/beam-equations";
import { analyze } from "@/lib/mechanics/solver";
import { portalFrame } from "@/lib/mechanics/presets";
import { circle, ipe, IPE_TABLE, rectangle, tube } from "@/lib/mechanics/sections";
import type { Structure, SupportType } from "@/lib/mechanics/types";

const r4 = (v: number) => (Math.abs(v) < 1e-9 ? 0 : Number(v.toPrecision(5)));

/* ------------------------------------------------------------------ */
/*                       Calculatrice sans eval                         */
/* ------------------------------------------------------------------ */
const FUNCS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sind: (x) => Math.sin((x * Math.PI) / 180),
  cosd: (x) => Math.cos((x * Math.PI) / 180),
  tand: (x) => Math.tan((x * Math.PI) / 180),
  asind: (x) => (Math.asin(x) * 180) / Math.PI,
  acosd: (x) => (Math.acos(x) * 180) / Math.PI,
  atand: (x) => (Math.atan(x) * 180) / Math.PI,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
};

export function evaluate(expr: string): number {
  const s = expr.replace(/,/g, ".").replace(/×|·/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/π/g, "pi").replace(/\s+/g, "");
  if (s.length === 0 || s.length > 300) throw new Error("expression vide ou trop longue");
  let i = 0;
  const peek = () => s[i];
  const parseNumber = (): number => {
    const m = /^(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i));
    if (!m) throw new Error(`nombre attendu à la position ${i + 1}`);
    i += m[0].length;
    return Number(m[0]);
  };
  const parsePrimary = (): number => {
    const c = peek();
    if (c === "(") {
      i++;
      const v = parseExpr();
      if (peek() !== ")") throw new Error("parenthèse fermante manquante");
      i++;
      return v;
    }
    if (c === "-") {
      i++;
      return -parsePower();
    }
    if (c === "+") {
      i++;
      return parsePower();
    }
    const id = /^[a-z]+/i.exec(s.slice(i));
    if (id) {
      const name = id[0].toLowerCase();
      i += id[0].length;
      if (name === "pi") return Math.PI;
      const f = FUNCS[name];
      if (!f) throw new Error(`fonction inconnue : ${name}`);
      if (peek() !== "(") throw new Error(`parenthèse attendue après ${name}`);
      return f(parsePrimary());
    }
    return parseNumber();
  };
  const parsePower = (): number => {
    const base = parsePrimary();
    if (peek() === "^") {
      i++;
      return base ** parsePower();
    }
    return base;
  };
  const parseTerm = (): number => {
    let v = parsePower();
    while (peek() === "*" || peek() === "/") {
      const op = s[i++];
      const w = parsePower();
      v = op === "*" ? v * w : v / w;
    }
    return v;
  };
  const parseExpr = (): number => {
    let v = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = s[i++];
      const w = parseTerm();
      v = op === "+" ? v + w : v - w;
    }
    return v;
  };
  const v = parseExpr();
  if (i !== s.length) throw new Error(`caractère inattendu « ${s[i]} » à la position ${i + 1}`);
  if (!Number.isFinite(v)) throw new Error("résultat non fini (division par zéro ?)");
  return v;
}

/* ------------------------------------------------------------------ */
/*                       Schémas de validation                          */
/* ------------------------------------------------------------------ */
const num = z.number().finite();

const BeamInput = z.object({
  longueur: num.positive().max(200),
  appuis: z.array(z.object({ x: num, type: z.enum(["appui_simple", "articulation", "encastrement"]) })).min(1).max(10),
  rotules: z.array(num).max(5).optional(),
  charges: z
    .array(
      z.discriminatedUnion("type", [
        z.object({ type: z.literal("ponctuelle"), x: num, F: num, angle: num.optional() }),
        z.object({ type: z.literal("repartie"), x1: num, x2: num, q1: num, q2: num.optional() }),
        z.object({ type: z.literal("couple"), x: num, M: num }),
      ]),
    )
    .max(20),
  E_GPa: num.positive().optional(),
  I_cm4: num.positive().optional(),
  A_cm2: num.positive().optional(),
  sections: z.array(num).max(20).optional(),
});

const FrameInput = z.object({
  portee: num.positive().max(100),
  hauteur: num.positive().max(50),
  pieds: z.enum(["encastres", "articules"]),
  q: num.optional(),
  H: num.optional(),
  P: num.optional(),
  I_poteaux_cm4: num.positive().optional(),
  I_traverse_cm4: num.positive().optional(),
  E_GPa: num.positive().optional(),
});

const TrussInput = z.object({
  noeuds: z
    .array(z.object({ id: z.string().min(1).max(8), x: num, y: num, appui: z.enum(["articulation", "appui_simple", "appui_simple_horizontal"]).optional() }))
    .min(2)
    .max(40),
  barres: z.array(z.object({ i: z.string(), j: z.string() })).min(1).max(80),
  charges: z.array(z.object({ noeud: z.string(), Fx: num.optional(), Fy: num.optional() })).max(40),
});

const SectionInput = z.object({
  forme: z.enum(["rectangle", "disque", "tube", "IPE"]),
  b_cm: num.positive().optional(),
  h_cm: num.positive().optional(),
  d_cm: num.positive().optional(),
  D_cm: num.positive().optional(),
  t_mm: num.positive().optional(),
  profil: z.string().optional(),
});

const CalcInput = z.object({ expression: z.string().min(1).max(300) });

/* ------------------------------------------------------------------ */
/*                           Définitions                                */
/* ------------------------------------------------------------------ */
export const TOOLS: BetaTool[] = [
  {
    name: "analyser_poutre",
    description:
      "Analyse une poutre droite horizontale par la méthode des déplacements (moteur STRUCTURA, exact pour Euler–Bernoulli). Renvoie le degré d'hyperstaticité, les réactions, N, T, M aux sections demandées (convention du cours : dM/dx = −T, M > 0 fibre inférieure tendue), les extremums, les équations par tronçon, la flèche maximale et, si la poutre est isostatique, le calcul pas à pas par le PFS. À utiliser pour toute valeur numérique concernant une poutre.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        longueur: { type: "number", description: "Longueur totale de la poutre (m), abscisse x de 0 à longueur depuis l'extrémité gauche." },
        appuis: {
          type: "array",
          description: "Liaisons extérieures.",
          items: {
            type: "object",
            properties: {
              x: { type: "number", description: "Abscisse (m)." },
              type: { type: "string", enum: ["appui_simple", "articulation", "encastrement"] },
            },
            required: ["x", "type"],
          },
        },
        rotules: { type: "array", items: { type: "number" }, description: "Abscisses des rotules internes (m), facultatif." },
        charges: {
          type: "array",
          description:
            "Charges : ponctuelle {x, F (kN, > 0), angle en degrés depuis +x, −90 = vers le bas par défaut} ; repartie {x1, x2, q1, q2 (kN/m, positives VERS LE BAS ; q2 = q1 si omis)} ; couple {x, M (kN·m, positif anti-horaire)}.",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["ponctuelle", "repartie", "couple"] },
              x: { type: "number" },
              F: { type: "number" },
              angle: { type: "number" },
              x1: { type: "number" },
              x2: { type: "number" },
              q1: { type: "number" },
              q2: { type: "number" },
              M: { type: "number" },
            },
            required: ["type"],
          },
        },
        E_GPa: { type: "number", description: "Module d'Young (GPa). Défaut : 210 (acier)." },
        I_cm4: { type: "number", description: "Moment quadratique (cm⁴). Défaut : 8356 (IPE 300)." },
        A_cm2: { type: "number", description: "Aire (cm²). Défaut : 53,8 (IPE 300)." },
        sections: { type: "array", items: { type: "number" }, description: "Abscisses (m) où donner N, T, M." },
      },
      required: ["longueur", "appuis", "charges"],
    },
  },
  {
    name: "analyser_portique",
    description:
      "Analyse un portique simple : poteaux AB (gauche) et DC (droit) de hauteur h, traverse BC de portée L ; pieds A et D encastrés ou articulés. Charges : q uniforme sur la traverse (kN/m vers le bas), H horizontale en B (kN, vers la droite), P verticale à mi-portée (kN vers le bas). Renvoie réactions et efforts N, T, M aux extrémités de chaque barre (convention du cours ; barres orientées A→B, B→C, D→C).",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        portee: { type: "number" },
        hauteur: { type: "number" },
        pieds: { type: "string", enum: ["encastres", "articules"] },
        q: { type: "number" },
        H: { type: "number" },
        P: { type: "number" },
        I_poteaux_cm4: { type: "number", description: "Défaut 8356 (IPE 300)." },
        I_traverse_cm4: { type: "number", description: "Défaut 8356 (IPE 300)." },
        E_GPa: { type: "number", description: "Défaut 210." },
      },
      required: ["portee", "hauteur", "pieds"],
    },
  },
  {
    name: "analyser_treillis",
    description:
      "Analyse un treillis plan articulé quelconque (barres bi-articulées, charges aux nœuds). Renvoie l'effort normal de chaque barre (traction > 0), les réactions et le test m + r − 2n.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        noeuds: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              x: { type: "number" },
              y: { type: "number" },
              appui: { type: "string", enum: ["articulation", "appui_simple", "appui_simple_horizontal"], description: "appui_simple bloque la translation verticale ; appui_simple_horizontal bloque la translation horizontale." },
            },
            required: ["id", "x", "y"],
          },
        },
        barres: { type: "array", items: { type: "object", properties: { i: { type: "string" }, j: { type: "string" } }, required: ["i", "j"] } },
        charges: {
          type: "array",
          items: { type: "object", properties: { noeud: { type: "string" }, Fx: { type: "number" }, Fy: { type: "number", description: "kN, positif vers le haut" } }, required: ["noeud"] },
        },
      },
      required: ["noeuds", "barres", "charges"],
    },
  },
  {
    name: "caracteristiques_section",
    description: "Aire, moment quadratique, distance à la fibre extrême, module de flexion et rayon de giration d'une section (rectangle b×h, disque d, tube D×t, profilé IPE du catalogue).",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        forme: { type: "string", enum: ["rectangle", "disque", "tube", "IPE"] },
        b_cm: { type: "number" },
        h_cm: { type: "number" },
        d_cm: { type: "number" },
        D_cm: { type: "number" },
        t_mm: { type: "number" },
        profil: { type: "string", description: `Un de : ${IPE_TABLE.map((r) => r.name).join(", ")}` },
      },
      required: ["forme"],
    },
  },
  {
    name: "calculer",
    description:
      "Évalue exactement une expression numérique (+ − * / ^, parenthèses, pi, sqrt, abs, sin/cos/tan en radians, sind/cosd/tand/asind/acosd/atand en degrés, ln, log, exp). À utiliser pour toute application numérique d'une formule (contraintes, flèches, conversions, Euler…).",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: { expression: { type: "string" } },
      required: ["expression"],
    },
  },
];

/* ------------------------------------------------------------------ */
/*                            Exécution                                 */
/* ------------------------------------------------------------------ */
const SUPPORT: Record<string, "roller" | "pin" | "fixed"> = { appui_simple: "roller", articulation: "pin", encastrement: "fixed" };

function runBeam(input: z.infer<typeof BeamInput>) {
  const L = input.longueur;
  const loads: BeamLoad[] = input.charges.map((c, k) => {
    if (c.type === "ponctuelle") return { id: `F${k + 1}`, kind: "point", x: c.x, F: c.F, angle: c.angle ?? -90 };
    if (c.type === "repartie") return { id: `q${k + 1}`, kind: "dist", x1: c.x1, x2: c.x2, q1: c.q1, q2: c.q2 ?? c.q1 };
    return { id: `C${k + 1}`, kind: "moment", x: c.x, M: c.M };
  });
  const model: BeamModel = {
    length: L,
    E: (input.E_GPa ?? 210) * 1e6,
    I: (input.I_cm4 ?? 8356) * 1e-8,
    A: (input.A_cm2 ?? 53.8) * 1e-4,
    supports: input.appuis.map((s, k) => ({ id: String.fromCharCode(65 + k), x: s.x, type: SUPPORT[s.type] })),
    hinges: (input.rotules ?? []).map((x, k) => ({ id: `R${k + 1}`, x })),
    loads,
  };
  const an = analyzeBeam(model);
  if (!an.result.ok) return { erreur: an.result.error };
  const res = an.result;
  const reactions = model.supports.map((s) => {
    const nid = an.built.nodeIdAt(Math.min(Math.max(s.x, 0), L));
    const r = nid ? res.reactions[nid] : undefined;
    return {
      appui: s.id,
      x: s.x,
      type: s.type,
      H_kN: r?.blocked.x ? r4(r.rx) : null,
      V_kN: r?.blocked.y ? r4(r.ry) : null,
      M_kNm: r?.blocked.rz ? r4(r.mz) : null,
    };
  });
  const sections = (input.sections ?? []).map((x) => {
    const g = an.at(x, "left");
    const d = an.at(x, "right");
    return { x, N_kN: r4(d.N), T_gauche_kN: r4(-g.V), T_droite_kN: r4(-d.V), M_kNm: r4(g.M), M_droite_kNm: r4(d.M), fleche_mm: r4(g.v * 1000) };
  });
  const poly = (c: number[]) =>
    c
      .map((v, k) => (Math.abs(v) < 1e-9 ? "" : `${v >= 0 ? "+" : "−"} ${Math.abs(r4(v))}${k === 0 ? "" : k === 1 ? "·x" : `·x^${k}`}`))
      .filter(Boolean)
      .join(" ")
      .replace(/^\+ /, "") || "0";
  const eqs = segmentEquations(an).map((s) => ({ de: r4(s.x0), a: r4(s.x1), N: poly(s.N), T: poly(s.V.map((v) => -v)), M: poly(s.M) }));
  const e = an.extremes;
  const hand = handCalcBeam(model);
  return {
    hyperstaticite: { degre: res.hyperstaticity.degree, nature: res.hyperstaticity.classification },
    reactions,
    convention: "Repère global : H > 0 vers la droite, V > 0 vers le haut, M > 0 anti-horaire. Efforts internes : convention du cours (dM/dx = −T).",
    extremums: {
      M_max: { valeur_kNm: r4(e.Mmax.value), x: r4(e.Mmax.x) },
      M_min: { valeur_kNm: r4(e.Mmin.value), x: r4(e.Mmin.x) },
      T_max_abs_kN: r4(Math.max(Math.abs(e.Vmax.value), Math.abs(e.Vmin.value))),
      N_max_kN: r4(e.Nmax.value),
      N_min_kN: r4(e.Nmin.value),
      fleche_max_mm: { valeur: r4(Math.abs(e.vmin.value) >= Math.abs(e.vmax.value) ? e.vmin.value * 1000 : e.vmax.value * 1000), x: r4(Math.abs(e.vmin.value) >= Math.abs(e.vmax.value) ? e.vmin.x : e.vmax.x) },
      hypotheses_fleche: `E = ${input.E_GPa ?? 210} GPa, I = ${input.I_cm4 ?? 8356} cm⁴${input.I_cm4 ? "" : " (valeur par défaut : IPE 300)"}`,
    },
    efforts_aux_sections: sections,
    equations_par_troncon: eqs,
    calcul_main: hand.applicable ? hand.steps.map((s) => ({ etape: s.title, texte: s.text ?? "", latex: s.latex })) : hand.reason,
    controle_equilibre: { somme_Fx: r4(res.equilibrium.sumFx), somme_Fy: r4(res.equilibrium.sumFy), somme_M: r4(res.equilibrium.sumM) },
  };
}

function runFrame(input: z.infer<typeof FrameInput>) {
  const E = (input.E_GPa ?? 210) * 1e6;
  const Ic = (input.I_poteaux_cm4 ?? 8356) * 1e-8;
  const Ib = (input.I_traverse_cm4 ?? 8356) * 1e-8;
  const s = portalFrame({
    span: input.portee,
    height: input.hauteur,
    base: input.pieds === "encastres" ? "fixed" : "pin",
    E,
    Ac: 53.8e-4,
    Ic,
    Ab: 53.8e-4,
    Ib,
    q: input.q ?? 0,
    H: input.H ?? 0,
    P: input.P ?? 0,
  });
  const res = analyze(s);
  if (!res.ok) return { erreur: res.error };
  const course = (f: { N: number; V: number; M: number }) => ({ N: r4(f.N), T: r4(-f.V), M: r4(f.M) });
  const barres = s.members.map((m) => {
    const mr = res.members[m.id];
    const ext = Math.abs(mr.extremes.Mmax.value) >= Math.abs(mr.extremes.Mmin.value) ? mr.extremes.Mmax : mr.extremes.Mmin;
    return {
      barre: m.id,
      origine: m.i,
      longueur: r4(mr.L),
      debut: course(mr.forcesAt(0, "right")),
      fin: course(mr.forcesAt(mr.L, "left")),
      M_extreme: { valeur: r4(ext.value), x_depuis_origine: r4(ext.x) },
    };
  });
  return {
    hyperstaticite: { degre: res.hyperstaticity.degree, nature: res.hyperstaticity.classification },
    hypotheses: `E = ${input.E_GPa ?? 210} GPa, I poteaux = ${input.I_poteaux_cm4 ?? 8356} cm⁴, I traverse = ${input.I_traverse_cm4 ?? 8356} cm⁴ ; structure hyperstatique : les résultats dépendent du rapport des inerties.`,
    reactions: Object.fromEntries(Object.entries(res.reactions).map(([id, r]) => [id, { H_kN: r4(r.rx), V_kN: r4(r.ry), M_kNm: r4(r.mz) }])),
    efforts_barres_kN_kNm: barres,
    convention: "Repère local de chaque barre : x de l'origine vers l'autre extrémité, y = x tourné de +90°. N > 0 traction, dM/dx = −T, M > 0 tend la fibre côté −y.",
  };
}

function runTruss(input: z.infer<typeof TrussInput>) {
  const ids = new Set(input.noeuds.map((n) => n.id));
  for (const b of input.barres) if (!ids.has(b.i) || !ids.has(b.j)) return { erreur: `barre ${b.i}-${b.j} : nœud inconnu` };
  for (const c of input.charges) if (!ids.has(c.noeud)) return { erreur: `charge sur un nœud inconnu : ${c.noeud}` };
  const sup: Record<string, SupportType> = { articulation: "pin", appui_simple: "roller", appui_simple_horizontal: "rollerX" };
  const s: Structure = {
    nodes: input.noeuds.map((n) => ({ id: n.id, x: n.x, y: n.y, support: n.appui ? sup[n.appui] : undefined })),
    members: input.barres.map((b) => ({ id: `${b.i}-${b.j}`, i: b.i, j: b.j, E: 210e6, A: 10e-4, I: 1e-6, releaseI: true, releaseJ: true })),
    loads: input.charges.map((c) => ({ kind: "nodal" as const, node: c.noeud, fx: c.Fx ?? 0, fy: c.Fy ?? 0, mz: 0 })),
  };
  const res = analyze(s);
  if (!res.ok) return { erreur: res.error };
  const m = s.members.length;
  const r = res.hyperstaticity.reactions;
  const n = s.nodes.length;
  return {
    test_isostaticite: `m + r − 2n = ${m} + ${r} − 2×${n} = ${m + r - 2 * n}`,
    nature: res.hyperstaticity.classification,
    efforts: s.members.map((b) => {
      const N = r4(res.members[b.id].forcesAt(res.members[b.id].L / 2).N);
      return { barre: b.id, N_kN: N, nature: Math.abs(N) < 1e-6 ? "effort nul" : N > 0 ? "traction" : "compression" };
    }),
    reactions: Object.fromEntries(Object.entries(res.reactions).map(([id, rr]) => [id, { H_kN: r4(rr.rx), V_kN: r4(rr.ry) }])),
  };
}

function runSection(input: z.infer<typeof SectionInput>) {
  let p;
  if (input.forme === "rectangle") {
    if (!input.b_cm || !input.h_cm) return { erreur: "b_cm et h_cm requis" };
    p = rectangle(input.b_cm / 100, input.h_cm / 100);
    const Imin = (input.h_cm * input.b_cm ** 3) / 12;
    return {
      A_cm2: r4(p.A * 1e4),
      I_cm4: r4(p.I * 1e8),
      I_min_cm4: r4(Math.min(Imin, p.I * 1e8)),
      v_cm: r4(p.v * 100),
      W_cm3: r4(p.W * 1e6),
      i_min_cm: r4(Math.sqrt(Math.min(Imin, p.I * 1e8) / (p.A * 1e4))),
      formules: "A = bh, I = bh³/12 (axe parallèle à b), I_min = hb³/12, W = bh²/6",
    };
  }
  if (input.forme === "disque") {
    if (!input.d_cm) return { erreur: "d_cm requis" };
    p = circle(input.d_cm / 100);
  } else if (input.forme === "tube") {
    if (!input.D_cm || !input.t_mm) return { erreur: "D_cm et t_mm requis" };
    p = tube(input.D_cm / 100, input.t_mm / 1000);
  } else {
    const name = (input.profil ?? "").toUpperCase().replace(/\s+/g, " ").replace(/^IPE(\d)/, "IPE $1");
    if (!IPE_TABLE.some((r) => r.name === name)) return { erreur: `profil inconnu ; disponibles : ${IPE_TABLE.map((r) => r.name).join(", ")}` };
    p = ipe(name);
  }
  return { A_cm2: r4(p.A * 1e4), I_cm4: r4(p.I * 1e8), v_cm: r4(p.v * 100), W_cm3: r4(p.W * 1e6), i_cm: r4(Math.sqrt(p.I / p.A) * 100), designation: p.label };
}

export interface ToolOutcome {
  ok: boolean;
  content: string;
}

/** Exécute un outil après validation de son entrée. */
export function runTool(name: string, rawInput: unknown): ToolOutcome {
  try {
    let out: unknown;
    switch (name) {
      case "analyser_poutre": {
        const p = BeamInput.safeParse(rawInput);
        if (!p.success) return { ok: false, content: `Entrée invalide : ${p.error.message}` };
        out = runBeam(p.data);
        break;
      }
      case "analyser_portique": {
        const p = FrameInput.safeParse(rawInput);
        if (!p.success) return { ok: false, content: `Entrée invalide : ${p.error.message}` };
        out = runFrame(p.data);
        break;
      }
      case "analyser_treillis": {
        const p = TrussInput.safeParse(rawInput);
        if (!p.success) return { ok: false, content: `Entrée invalide : ${p.error.message}` };
        out = runTruss(p.data);
        break;
      }
      case "caracteristiques_section": {
        const p = SectionInput.safeParse(rawInput);
        if (!p.success) return { ok: false, content: `Entrée invalide : ${p.error.message}` };
        out = runSection(p.data);
        break;
      }
      case "calculer": {
        const p = CalcInput.safeParse(rawInput);
        if (!p.success) return { ok: false, content: `Entrée invalide : ${p.error.message}` };
        const v = evaluate(p.data.expression);
        out = { expression: p.data.expression, resultat: Number(v.toPrecision(10)) };
        break;
      }
      default:
        return { ok: false, content: `Outil inconnu : ${name}` };
    }
    const isErr = typeof out === "object" && out !== null && "erreur" in out;
    return { ok: !isErr, content: JSON.stringify(out) };
  } catch (e) {
    return { ok: false, content: `Erreur de calcul : ${e instanceof Error ? e.message : String(e)}` };
  }
}

export { describeToolCall } from "./tool-labels";
