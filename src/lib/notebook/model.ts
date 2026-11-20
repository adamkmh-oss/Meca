/** Création, copie et validation des cahiers et des pages. */
import { z } from "zod";
import type { NoteElement, Notebook, NotebookMeta, Orientation, Page, PaperColor, PaperKind } from "./types";

export function uid(prefix = ""): string {
  const r = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "").slice(0, 12) : Math.random().toString(36).slice(2, 14);
  return prefix + r;
}

export function newPage(paper: PaperKind = "carreaux", color: PaperColor = "blanc", orientation: Orientation = "portrait"): Page {
  return { id: uid("p"), paper, color, orientation, elements: [] };
}

export function newNotebook(title: string, cover: string, paper: PaperKind = "carreaux", color: PaperColor = "blanc"): Notebook {
  const now = Date.now();
  return { version: 1, id: uid("n"), title: title.trim() || "Sans titre", cover, createdAt: now, updatedAt: now, pages: [newPage(paper, color)] };
}

/** Copie avec de nouveaux identifiants (dupliquer, coller). */
export function cloneElement<T extends NoteElement>(e: T, groupMap?: Map<string, string>): T {
  const copy = { ...e, id: uid("e") };
  if (e.group && groupMap) {
    let g = groupMap.get(e.group);
    if (!g) {
      g = uid("g");
      groupMap.set(e.group, g);
    }
    copy.group = g;
  }
  return copy;
}

export function clonePage(p: Page): Page {
  const groups = new Map<string, string>();
  return { ...p, id: uid("p"), elements: p.elements.map((e) => cloneElement(e, groups)) };
}

export function searchTextOf(nb: Notebook): string {
  const parts: string[] = [nb.title];
  for (const p of nb.pages) {
    if (p.title) parts.push(p.title);
    for (const e of p.elements) {
      if (e.type === "text") parts.push(e.text);
      else if (e.type === "math") parts.push(e.tex);
      else if ((e.type === "beam" || e.type === "truss") && e.title) parts.push(e.title);
    }
  }
  return parts.join("\n").slice(0, 20000);
}

export function metaOf(nb: Notebook): NotebookMeta {
  return {
    id: nb.id,
    title: nb.title,
    cover: nb.cover,
    createdAt: nb.createdAt,
    updatedAt: nb.updatedAt,
    pageCount: nb.pages.length,
    searchText: searchTextOf(nb),
  };
}

/* ------------------------------------------------------------------ */
/*               Validation d'un fichier importé (.json)               */
/* ------------------------------------------------------------------ */
const num = z.number().finite();
const str = z.string().max(2_000_000);
const color = z.string().max(40);
const base = { id: z.string().min(1).max(64), group: z.string().max(64).optional() };
const beamModel = z.object({
  length: num.positive().max(1000),
  E: num.positive(),
  A: num.positive(),
  I: num.positive(),
  supports: z.array(z.object({ id: z.string().max(40), x: num, type: z.enum(["roller", "rollerX", "pin", "fixed"]) })).max(20),
  hinges: z.array(z.object({ id: z.string().max(40), x: num })).max(20),
  loads: z
    .array(
      z.discriminatedUnion("kind", [
        z.object({ id: z.string().max(40), kind: z.literal("point"), x: num, F: num, angle: num }),
        z.object({ id: z.string().max(40), kind: z.literal("dist"), x1: num, x2: num, q1: num, q2: num }),
        z.object({ id: z.string().max(40), kind: z.literal("moment"), x: num, M: num }),
      ]),
    )
    .max(60),
});

const expr = z.string().min(1).max(200);
const litVars = z.array(z.object({ name: z.string().min(1).max(20), value: num })).max(60);
const litBeam = z.object({
  vars: litVars,
  length: expr,
  supports: z.array(z.object({ id: z.string().max(40), x: expr, type: z.enum(["roller", "rollerX", "pin", "fixed"]) })).max(20),
  hinges: z.array(z.object({ id: z.string().max(40), x: expr })).max(20),
  loads: z
    .array(
      z.discriminatedUnion("kind", [
        z.object({ id: z.string().max(40), kind: z.literal("point"), x: expr, F: expr, angle: num }),
        z.object({ id: z.string().max(40), kind: z.literal("dist"), x1: expr, x2: expr, q1: expr, q2: expr }),
        z.object({ id: z.string().max(40), kind: z.literal("moment"), x: expr, M: expr }),
      ]),
    )
    .max(60),
});
const litTruss = z.object({
  vars: litVars,
  nodes: z.array(z.object({ id: z.string().min(1).max(8), x: expr, y: expr, support: z.enum(["free", "pin", "roller", "rollerX"]) })).max(200),
  bars: z.array(z.object({ id: z.string().min(1).max(20), i: z.string().max(8), j: z.string().max(8) })).max(600),
  loads: z.array(z.object({ id: z.string().min(1).max(20), node: z.string().max(8), F: expr, angle: num })).max(200),
});

const element = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("stroke"), tool: z.enum(["pen", "highlighter"]), color, size: num, pts: z.array(num).max(300_000), pressure: z.boolean(), pen: z.enum(["ball", "fountain"]).optional() }),
  z.object({
    ...base,
    type: z.literal("shape"),
    shape: z.enum(["line", "arrow", "darrow", "rect", "ellipse", "triangle", "polygon", "polyline", "dim"]),
    pts: z.array(num).max(2000),
    color,
    size: num,
    dash: z.boolean().optional(),
    fill: z.boolean().optional(),
    label: z.string().max(200).optional(),
  }),
  z.object({ ...base, type: z.literal("text"), x: num, y: num, w: num, text: z.string().max(100_000), size: num, color, font: z.enum(["sans", "serif", "mono"]).optional(), boxed: z.boolean().optional(), role: z.enum(["pfs", "cuts", "truss"]).optional() }),
  z.object({ ...base, type: z.literal("math"), x: num, y: num, tex: z.string().max(50_000), size: num, color, boxed: z.boolean().optional() }),
  z.object({ ...base, type: z.literal("image"), x: num, y: num, w: num, h: num, src: str.refine((s) => s.startsWith("data:image/"), "image intégrée attendue") }),
  z.object({
    ...base,
    type: z.literal("symbol"),
    kind: z.string().max(60),
    x: num,
    y: num,
    rot: num,
    scale: num,
    color,
    label: z.string().max(60).optional(),
    label2: z.string().max(60).optional(),
    len: num.optional(),
    h: num.optional(),
    h2: num.optional(),
  }),
  z.object({
    ...base,
    type: z.literal("beam"),
    x: num,
    y: num,
    w: num,
    title: z.string().max(200).optional(),
    model: beamModel,
    show: z.object({ schema: z.boolean(), reactions: z.boolean(), N: z.boolean(), T: z.boolean(), M: z.boolean(), deformee: z.boolean() }),
    lit: litBeam.optional(),
  }),
  z.object({ ...base, type: z.literal("cut"), x: num, y: num, w: num, model: beamModel, seg: z.number().int().min(0).max(200), lit: litBeam.optional() }),
  z.object({
    ...base,
    type: z.literal("truss"),
    x: num,
    y: num,
    w: num,
    title: z.string().max(200).optional(),
    model: z.object({
      nodes: z.array(z.object({ id: z.string().min(1).max(8), x: num, y: num, support: z.enum(["free", "pin", "roller", "rollerX"]) })).max(200),
      bars: z.array(z.object({ id: z.string().min(1).max(20), i: z.string().max(8), j: z.string().max(8) })).max(600),
      loads: z.array(z.object({ id: z.string().min(1).max(20), node: z.string().max(8), F: num, angle: num })).max(200),
      E: num.positive(),
      A: num.positive(),
    }),
    show: z.object({ efforts: z.boolean(), reactions: z.boolean(), labels: z.boolean() }),
    lit: litTruss.optional(),
  }),
]);

const page = z.object({
  id: z.string().min(1).max(64),
  title: z.string().max(200).optional(),
  paper: z.enum(["blanc", "ligne", "carreaux", "seyes", "points", "millimetre", "etude-poutre", "diagrammes", "exercice"]),
  color: z.enum(["blanc", "creme", "ardoise"]),
  orientation: z.enum(["portrait", "paysage"]),
  elements: z.array(element).max(20_000),
  background: str.refine((s) => s.startsWith("data:image/"), "image intégrée attendue").optional(),
});

export const notebookSchema = z.object({
  version: z.literal(1),
  id: z.string().min(1).max(64),
  title: z.string().max(200),
  cover: color,
  createdAt: num,
  updatedAt: num,
  pages: z.array(page).min(1).max(2000),
});

export const exportFile = z.object({
  app: z.literal("cahier-meca"),
  version: z.literal(1),
  exportedAt: num,
  notebooks: z.array(notebookSchema).min(1).max(500),
});

export type ExportFile = z.infer<typeof exportFile>;

export function makeExport(notebooks: Notebook[]): string {
  return JSON.stringify({ app: "cahier-meca", version: 1, exportedAt: Date.now(), notebooks });
}

/** Lit un fichier de sauvegarde ; les cahiers reçoivent de nouveaux identifiants pour ne rien écraser. */
export function parseExport(text: string): { ok: true; notebooks: Notebook[] } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "Ce fichier n'est pas un fichier JSON valide." };
  }
  const res = exportFile.safeParse(raw);
  if (!res.success) return { ok: false, error: "Ce fichier n'est pas une sauvegarde de cahier reconnue." };
  const out = res.data.notebooks.map((nb) => ({ ...(nb as Notebook), id: uid("n"), updatedAt: Date.now() }));
  return { ok: true, notebooks: out };
}
