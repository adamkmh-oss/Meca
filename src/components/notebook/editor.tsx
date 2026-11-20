"use client";
/**
 * Éditeur d'un cahier : pages empilées verticalement, zoom et déplacement
 * libres, outils d'écriture (stylo sensible à la pression, surligneur,
 * gomme, lasso, formes, texte, formules), bibliothèque mécanique et poutres
 * calculées.
 *
 * Gestes : stylet = outil ; doigt = déplacer / zoomer (ou dessiner si
 * « dessin au doigt » est actif) ; deux doigts = zoom ; tape à deux doigts =
 * annuler, à trois doigts = rétablir ; souris : molette = défiler,
 * Ctrl + molette = zoom, barre d'espace ou bouton du milieu = déplacer.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { centerPath, normalizePressure, penPath, pushPoint } from "@/lib/notebook/ink";
import {
  changeColor,
  eraseFromStroke,
  elementBounds,
  hitElement,
  insideLasso,
  measured,
  pointInRect,
  scaleElement,
  strokeTouchesSegment,
  translateElement,
  unionRect,
} from "@/lib/notebook/geometry";
import { cloneElement, clonePage, newPage, uid } from "@/lib/notebook/model";
import { PAPER_COLORS, pageSize } from "@/lib/notebook/paper";
import { recognizeShape, shapeFromRecognized, type Recognized } from "@/lib/notebook/recognize";
import { readPref, writePref, type NotebookStore } from "@/lib/notebook/storage";
import type { SyncStatus } from "@/lib/notebook/cloud";
import { SYMBOL_BY_KIND } from "@/lib/notebook/symbols";
import type { BeamEl, CutEl, MathEl, NoteElement, Notebook, Page, Rect, ShapeEl, StrokeEl, SymbolEl, TextEl, TrussEl } from "@/lib/notebook/types";
import { analyzeTruss, trussMarkdown } from "@/lib/notebook/truss";
import { TrussDialog, type TrussInsertOptions } from "./truss-dialog";
import { analyzeBeam } from "@/lib/mechanics/beam";
import { cutsMarkdown, pfsMarkdown, segmentBounds } from "@/lib/notebook/beam-notes";
import { onMeasure, PageView, type TextEditing } from "./page-view";
import { mapPage, useNotebook } from "./use-notebook";
import { DEFAULT_SETTINGS, type Tool, type ToolSettings } from "./tools";
import { EditorToolbar, TopBar } from "./toolbar";
import { MechanicsDrawer, PagesSidebar, PropsPanel, SelectionBar } from "./panels";
import { BeamDialog, MathDialog, type BeamInsertOptions } from "./dialogs";
import { PrintArea, printNotebook, printableHtml } from "./print";
import { imageToDataUrl, pdfToImages, pickFiles, safeName, saveFile } from "./files";
import { Eraser } from "lucide-react";
import { ToolIcon } from "./toolbar";

const GAP = 28;
const MIN_Z = 0.2;
const MAX_Z = 6;

interface View {
  x: number;
  y: number;
  z: number;
}

interface PageBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function computeLayout(pages: Page[]): { boxes: PageBox[]; colW: number; totalH: number } {
  const colW = Math.max(...pages.map((p) => pageSize(p.orientation).w));
  let y = 0;
  const boxes = pages.map((p) => {
    const { w, h } = pageSize(p.orientation);
    const b = { id: p.id, x: (colW - w) / 2, y, w, h };
    y += h + GAP;
    return b;
  });
  return { boxes, colW, totalH: y - GAP };
}

type Gesture =
  | {
      kind: "draw";
      pid: number;
      pageId: string;
      tool: "pen" | "highlighter";
      pts: number[];
      pressure: boolean;
      color: string;
      size: number;
      holdAt: [number, number];
      holdTimer: ReturnType<typeof setTimeout> | null;
      snapped: Recognized | null;
      touch: boolean;
      t0: number;
    }
  | { kind: "erase"; pid: number; pageId: string; before: Page[]; last: [number, number]; touch: boolean }
  | { kind: "lasso"; pid: number; pageId: string; pts: number[]; touch: boolean }
  | { kind: "move"; pid: number; pageId: string; before: Page[]; start: [number, number]; orig: Map<string, NoteElement>; moved: boolean; touch: boolean }
  | { kind: "scale"; pid: number; pageId: string; before: Page[]; box: Rect; orig: Map<string, NoteElement>; touch: boolean }
  | { kind: "shape"; pid: number; pageId: string; start: [number, number]; end: [number, number]; touch: boolean }
  | { kind: "pan"; pid: number; start: [number, number]; view0: View }
  | { kind: "pinch"; a: number; b: number; d0: number; c0: [number, number]; world0: [number, number]; z0: number; t0: number; moved: boolean; maxTouches: number };

interface Selection {
  pageId: string;
  ids: string[];
}

interface Editing {
  pageId: string;
  id: string;
  value: string;
  isNew: boolean;
  before: Page[];
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Écran tactile de tablette (iPad…) : le doigt sert à faire défiler, pas à écrire. */
function isTablet(): boolean {
  if (typeof navigator === "undefined" || typeof screen === "undefined") return false;
  return navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) >= 600;
}

/** Longueur du tracé (points x, y, p). */
function strokeLength(pts: number[]): number {
  let l = 0;
  for (let i = 3; i + 1 < pts.length; i += 3) l += Math.hypot(pts[i] - pts[i - 3], pts[i + 1] - pts[i - 2]);
  return l;
}

export function Editor({ initial, store, onClose, sync }: { initial: Notebook; store: NotebookStore; onClose: () => void; sync?: SyncStatus | null }) {
  const nbh = useNotebook(initial, store);
  const { nb, commit, transient, endGesture, pagesRef } = nbh;
  const pages = nb.pages;
  const layout = useMemo(() => computeLayout(pages), [pages]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  /* ---------------------------- réglages ---------------------------- */
  const [settings, setSettings] = useState<ToolSettings>(() => ({ ...DEFAULT_SETTINGS, ...readPref<Partial<ToolSettings>>("settings", {}) }));
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const updateSettings = useCallback((patch: Partial<ToolSettings>) => {
    setSettings((s) => {
      const n = { ...s, ...patch };
      writePref("settings", n);
      return n;
    });
  }, []);
  const [tool, setToolState] = useState<Tool>("pen");
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const penSeen = useRef<boolean>(readPref("penSeen", false));

  /* ------------------------------ vue ------------------------------ */
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState({ w: 800, h: 600 });
  const [view, setViewState] = useState<View>({ x: 0, y: 16, z: 1 });
  const viewRef = useRef(view);
  const raf = useRef<number | null>(null);
  /*
   * Netteté : les pages sont dessinées à la taille réelle du zoom « figé » (zc),
   * en vectoriel. Pendant un pincement ou un zoom à la molette, une échelle CSS
   * temporaire (z / zc) suit le geste ; à l'arrêt, le zoom est figé et tout est
   * redessiné net (pas d'agrandissement d'une image floue).
   */
  const [zc, setZc] = useState(1);
  const zcRef = useRef(1);
  const zoomCommit = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setView = useCallback((v: View) => {
    viewRef.current = v;
    if (worldRef.current) worldRef.current.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.z / zcRef.current})`;
    if (raf.current === null) {
      raf.current = requestAnimationFrame(() => {
        raf.current = null;
        setViewState(viewRef.current);
      });
    }
    if (Math.abs(v.z - zcRef.current) > 1e-6) {
      if (zoomCommit.current) clearTimeout(zoomCommit.current);
      zoomCommit.current = setTimeout(() => {
        zoomCommit.current = null;
        const cur = viewRef.current;
        if (Math.abs(cur.z - zcRef.current) < 1e-6) return;
        zcRef.current = cur.z;
        setZc(cur.z);
        setViewState(cur);
      }, 160);
    }
  }, []);
  useEffect(
    () => () => {
      if (zoomCommit.current) clearTimeout(zoomCommit.current);
    },
    [],
  );

  const fitWidth = useCallback(
    (keepPage = true) => {
      const el = viewportRef.current;
      if (!el) return;
      const w = el.clientWidth;
      const L = layoutRef.current;
      const z = clamp((w - (w < 640 ? 12 : 48)) / L.colW, MIN_Z, w > 1400 ? 1.4 : 1.25);
      const v = viewRef.current;
      // garde la page visible au même endroit
      const cy = keepPage ? (el.clientHeight / 2 - v.y) / v.z : 0;
      setView({ x: (w - L.colW * z) / 2, y: keepPage ? el.clientHeight / 2 - cy * z : 16, z });
    },
    [setView],
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    setVp({ w: el.clientWidth, h: el.clientHeight });
    fitWidth(false);
    let lastW = el.clientWidth;
    const ro = new ResizeObserver(() => {
      setVp({ w: el.clientWidth, h: el.clientHeight });
      // rotation de la tablette, ouverture d'un panneau : on réajuste la largeur
      if (Math.abs(el.clientWidth - lastW) > 2) {
        lastW = el.clientWidth;
        fitWidth(true);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitWidth]);

  const clampView = useCallback(
    (v: View): View => {
      const L = layoutRef.current;
      const el = viewportRef.current;
      const w = el?.clientWidth ?? 800;
      const h = el?.clientHeight ?? 600;
      const cw = L.colW * v.z;
      const ch = L.totalH * v.z;
      const x = cw <= w ? clamp(v.x, -cw * 0.5, w - cw * 0.5) : clamp(v.x, w - cw - 120, 120);
      const y = clamp(v.y, h * 0.5 - ch - 40, h * 0.5);
      return { x, y, z: v.z };
    },
    [],
  );

  const zoomAt = useCallback(
    (factor: number, cx: number, cy: number) => {
      const v = viewRef.current;
      const z = clamp(v.z * factor, MIN_Z, MAX_Z);
      const wx = (cx - v.x) / v.z;
      const wy = (cy - v.y) / v.z;
      setView(clampView({ x: cx - wx * z, y: cy - wy * z, z }));
    },
    [setView, clampView],
  );

  /* ---------------------- coordonnées et pages ---------------------- */
  const clientToWorld = useCallback((cx: number, cy: number): [number, number] => {
    const r = viewportRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    return [(cx - r.left - v.x) / v.z, (cy - r.top - v.y) / v.z];
  }, []);

  const pageAtWorld = useCallback((wx: number, wy: number, margin = 0): PageBox | null => {
    for (const b of layoutRef.current.boxes) if (wx >= b.x - margin && wx <= b.x + b.w + margin && wy >= b.y - margin && wy <= b.y + b.h + margin) return b;
    return null;
  }, []);

  const boxOf = useCallback((pageId: string) => layoutRef.current.boxes.find((b) => b.id === pageId) ?? null, []);

  const toPage = useCallback(
    (pageId: string, cx: number, cy: number): [number, number] => {
      const [wx, wy] = clientToWorld(cx, cy);
      const b = boxOf(pageId)!;
      return [wx - b.x, wy - b.y];
    },
    [clientToWorld, boxOf],
  );

  /** Page la plus proche du centre de l'écran. */
  const currentPageIndex = useMemo(() => {
    const cy = (vp.h / 2 - view.y) / view.z;
    let best = 0;
    let bd = Infinity;
    layout.boxes.forEach((b, i) => {
      const d = cy < b.y ? b.y - cy : cy > b.y + b.h ? cy - b.y - b.h : 0;
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  }, [layout, view, vp]);
  const currentRef = useRef(currentPageIndex);
  currentRef.current = currentPageIndex;

  const goToPage = useCallback(
    (i: number) => {
      const b = layoutRef.current.boxes[clamp(i, 0, layoutRef.current.boxes.length - 1)];
      if (!b) return;
      const v = viewRef.current;
      setView(clampView({ x: v.x, y: 16 - b.y * v.z, z: v.z }));
    },
    [setView, clampView],
  );

  /* ---------------------------- sélection ---------------------------- */
  const [sel, setSel] = useState<Selection | null>(null);
  const selRef = useRef(sel);
  selRef.current = sel;
  const [propsOpen, setPropsOpen] = useState(false);
  const [measureTick, setMeasureTick] = useState(0);
  useEffect(() => onMeasure(() => setMeasureTick((t) => t + 1)), []);

  const prevTool = useRef<Tool>("pen");
  const setTool = useCallback((t: Tool) => {
    if (t !== toolRef.current) prevTool.current = toolRef.current;
    setToolState(t);
    if (t !== "lasso") setSel(null);
  }, []);
  /** Équivalent du double-tap de l'Apple Pencil : outil courant ⇄ gomme. */
  const toggleEraser = useCallback(() => {
    if (toolRef.current === "eraser") setTool(prevTool.current === "eraser" ? "pen" : prevTool.current);
    else setTool("eraser");
  }, [setTool]);

  const selectedElements = useMemo(() => {
    if (!sel) return [];
    const p = pages.find((pp) => pp.id === sel.pageId);
    if (!p) return [];
    const set = new Set(sel.ids);
    return p.elements.filter((e) => set.has(e.id));
  }, [sel, pages]);

  const selBox = useMemo(() => {
    void measureTick;
    let r: Rect | null = null;
    for (const e of selectedElements) r = unionRect(r, elementBounds(e));
    return r;
  }, [selectedElements, measureTick]);

  /* ------------------------------ texte ------------------------------ */
  const [editing, setEditing] = useState<Editing | null>(null);
  const editingRef = useRef(editing);
  editingRef.current = editing;

  const finishEditing = useCallback(() => {
    const ed = editingRef.current;
    if (!ed) return;
    editingRef.current = null;
    setEditing(null);
    const value = ed.value.replace(/\s+$/, "");
    transient((ps) =>
      mapPage(ps, ed.pageId, (p) => {
        if (!value.trim()) return { ...p, elements: p.elements.filter((e) => e.id !== ed.id) };
        return { ...p, elements: p.elements.map((e) => (e.id === ed.id && e.type === "text" ? { ...e, text: value } : e)) };
      }),
    );
    endGesture(ed.before);
  }, [transient, endGesture]);

  const startEditing = useCallback(
    (pageId: string, el: TextEl, isNew: boolean, before?: Page[]) => {
      finishEditing();
      setSel(null);
      setEditing({ pageId, id: el.id, value: el.text, isNew, before: before ?? pagesRef.current });
    },
    [finishEditing, pagesRef],
  );

  const textEditing: TextEditing | null = useMemo(
    () =>
      editing
        ? {
            id: editing.id,
            value: editing.value,
            onChange: (v: string) => setEditing((e) => (e ? { ...e, value: v } : e)),
            onDone: finishEditing,
          }
        : null,
    [editing, finishEditing],
  );

  /* ----------------------------- dialogues ----------------------------- */
  const [mathDlg, setMathDlg] = useState<{ pageId: string; el?: MathEl; at?: [number, number] } | null>(null);
  const [beamDlg, setBeamDlg] = useState<{ el?: BeamEl; pageId?: string; presetId?: string } | null>(null);
  const [trussDlg, setTrussDlg] = useState<{ el?: TrussEl } | null>(null);
  const [drawer, setDrawer] = useState<"mechanics" | null>(null);
  const [sidebar, setSidebar] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  /* ------------------------- insertion d'objets ------------------------- */
  /** Point central visible de la page courante (coordonnées page). */
  const visibleCenter = useCallback((): { pageId: string; x: number; y: number } => {
    const el = viewportRef.current;
    const v = viewRef.current;
    const L = layoutRef.current;
    const b = L.boxes[currentRef.current] ?? L.boxes[0];
    const cx = ((el?.clientWidth ?? 800) / 2 - v.x) / v.z - b.x;
    const cy = ((el?.clientHeight ?? 600) / 2 - v.y) / v.z - b.y;
    return { pageId: b.id, x: clamp(cx, 40, b.w - 40), y: clamp(cy, 60, b.h - 60) };
  }, []);

  const insertElements = useCallback(
    (make: (c: { pageId: string; x: number; y: number; w: number; h: number }) => NoteElement[], select = true) => {
      finishEditing();
      const c = visibleCenter();
      const b = boxOf(c.pageId)!;
      const els = make({ ...c, w: b.w, h: b.h });
      if (els.length === 0) return;
      commit((ps) => mapPage(ps, c.pageId, (p) => ({ ...p, elements: [...p.elements, ...els] })));
      if (select) {
        setToolState("lasso");
        setSel({ pageId: c.pageId, ids: els.map((e) => e.id) });
      }
    },
    [commit, finishEditing, visibleCenter, boxOf],
  );

  const insertSymbol = useCallback(
    (kind: string) => {
      const def = SYMBOL_BY_KIND[kind];
      if (!def) return;
      insertElements((c) => {
        const el: SymbolEl = { id: uid("e"), type: "symbol", kind, x: 0, y: 0, rot: 0, scale: 1, ...def.defaults };
        const bx = def.box(el);
        // centre la boîte du symbole sur le point visé
        return [{ ...el, x: Math.round(c.x - (bx.x + bx.w / 2)), y: Math.round(c.y - (bx.y + bx.h / 2)) }];
      });
      if (window.innerWidth < 900) setDrawer(null);
    },
    [insertElements],
  );

  const insertSnippet = useCallback(
    (kind: "math" | "text", content: string) => {
      insertElements((c) => {
        const color = settingsRef.current.textColor;
        if (kind === "math") return [{ id: uid("e"), type: "math", x: Math.round(c.x - 160), y: Math.round(c.y - 40), tex: content, size: 17, color } satisfies MathEl];
        return [{ id: uid("e"), type: "text", x: Math.round(Math.max(30, c.x - 220)), y: Math.round(c.y - 60), w: Math.min(440, c.w - 60), text: content, size: 16, color } satisfies TextEl];
      });
      if (window.innerWidth < 900) setDrawer(null);
    },
    [insertElements],
  );

  /* ---------------- empilement des blocs générés (poutre) ---------------- */
  const [stack, setStack] = useState<{ pageId: string; ids: string[]; y0: number; x: number } | null>(null);
  useEffect(() => {
    if (!stack) return;
    // attend la mesure des blocs (deux images) puis les empile, en débordant sur de nouvelles pages
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const ps = pagesRef.current;
      const startIdx = ps.findIndex((p) => p.id === stack.pageId);
      if (startIdx < 0) return setStack(null);
      const out = ps.slice();
      let pi = startIdx;
      let page = { ...out[pi], elements: out[pi].elements.slice() };
      const { h } = pageSize(page.orientation);
      let y = stack.y0;
      const margin = 36;
      const moving = new Map<string, NoteElement>();
      for (const p of ps) for (const e of p.elements) if (stack.ids.includes(e.id)) moving.set(e.id, e);
      // retire les blocs de leur page, on les replace un par un
      for (let k = startIdx; k < out.length; k++) out[k] = { ...out[k], elements: out[k].elements.filter((e) => !moving.has(e.id)) };
      page = { ...out[pi], elements: out[pi].elements.slice() };
      for (const id of stack.ids) {
        const e = moving.get(id);
        if (!e) continue;
        const eh = measured.get(id)?.h ?? 200;
        if (y + eh > h - margin && y > margin + 10) {
          out[pi] = page;
          pi++;
          if (pi >= out.length || out[pi].elements.length > 0) {
            const np = newPage(page.paper === "etude-poutre" || page.paper === "exercice" || page.paper === "diagrammes" ? "carreaux" : page.paper, page.color, page.orientation);
            out.splice(pi, 0, np);
          }
          page = { ...out[pi], elements: out[pi].elements.slice() };
          y = margin;
        }
        page.elements.push({ ...e, x: stack.x, y } as NoteElement);
        y += eh + 14;
      }
      out[pi] = page;
      transient(() => out);
      setStack(null);
    };
    const t = setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(run)), 60);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [stack, pagesRef, transient]);

  /** Place des blocs calculés sous le contenu de la page courante (ou sur une nouvelle page) puis les empile. */
  const placeGenerated = useCallback(
    (els: NoteElement[], x: number, selectId: string) => {
      const c = visibleCenter();
      const b = boxOf(c.pageId)!;
      const page = pagesRef.current.find((p) => p.id === c.pageId)!;
      let bottom = 0;
      for (const e of page.elements) {
        const r = elementBounds(e);
        bottom = Math.max(bottom, r.y + r.h);
      }
      let y0 = page.elements.length === 0 ? 48 : Math.round(bottom + 28);
      let target = c.pageId;
      const ids = els.map((e) => e.id);
      const placed = els.map((e) => ({ ...e, x, y: y0 }) as NoteElement);
      if (y0 > b.h - 240) {
        const np = { ...newPage(page.paper === "etude-poutre" || page.paper === "exercice" || page.paper === "diagrammes" ? "carreaux" : page.paper, page.color, page.orientation), elements: placed.map((e) => ({ ...e, y: 48 }) as NoteElement) };
        y0 = 48;
        target = np.id;
        const at = pagesRef.current.findIndex((p) => p.id === c.pageId);
        commit((ps) => {
          const out = ps.slice();
          out.splice(at + 1, 0, np);
          return out;
        });
        setTimeout(() => goToPage(at + 1), 30);
      } else {
        commit((ps) => mapPage(ps, c.pageId, (p) => ({ ...p, elements: [...p.elements, ...placed] })));
      }
      setStack({ pageId: target, ids, y0, x });
      setToolState("lasso");
      setSel({ pageId: target, ids: [selectId] });
    },
    [commit, visibleCenter, boxOf, pagesRef, goToPage],
  );

  const insertTruss = useCallback(
    (opts: TrussInsertOptions, existing?: TrussEl) => {
      const an = analyzeTruss(opts.model);
      if (existing) {
        const group = existing.group;
        commit((ps) =>
          ps.map((p) =>
            p.elements.some((e) => e.id === existing.id || (group && e.group === group))
              ? {
                  ...p,
                  elements: p.elements.map((e) => {
                    if (e.id === existing.id && e.type === "truss") return { ...e, model: opts.model, show: opts.show, title: opts.title || undefined };
                    if (group && e.group === group && e.type === "text" && e.role === "truss") return { ...e, text: trussMarkdown(opts.model, an) };
                    return e;
                  }),
                }
              : p,
          ),
        );
        notify("Treillis recalculé");
        return;
      }
      const b = boxOf(visibleCenter().pageId)!;
      const group = uid("g");
      const w = Math.min(640, b.w - 60);
      const x = Math.round((b.w - w) / 2);
      const truss: TrussEl = { id: uid("e"), group, type: "truss", x, y: 0, w, title: opts.title || undefined, model: opts.model, show: opts.show };
      const els: NoteElement[] = [truss];
      if (opts.notes) els.push({ id: uid("e"), group, role: "truss", type: "text", x, y: 0, w, text: trussMarkdown(opts.model, an), size: 14, color: "#111827" } satisfies TextEl);
      placeGenerated(els, x, truss.id);
    },
    [commit, notify, boxOf, visibleCenter, placeGenerated],
  );

  const insertBeam = useCallback(
    (opts: BeamInsertOptions, existing?: BeamEl) => {
      const an = analyzeBeam(opts.model);
      if (existing) {
        // mise à jour de la poutre et régénération des blocs du même groupe
        const group = existing.group;
        const nseg = segmentBounds(opts.model).length - 1;
        commit((ps) =>
          ps.map((p) =>
            p.elements.some((e) => e.id === existing.id || (group && e.group === group))
              ? {
                  ...p,
                  elements: p.elements
                    .filter((e) => !(group && e.group === group && e.type === "cut" && e.seg >= nseg))
                    .map((e) => {
                      if (e.id === existing.id && e.type === "beam") return { ...e, model: opts.model, show: opts.show, title: opts.title || undefined };
                      if (!group || e.group !== group) return e;
                      if (e.type === "text" && e.role === "pfs") return { ...e, text: pfsMarkdown(opts.model, an) };
                      if (e.type === "text" && e.role === "cuts") return { ...e, text: cutsMarkdown(opts.model, an) };
                      if (e.type === "cut") return { ...e, model: opts.model };
                      return e;
                    }),
                }
              : p,
          ),
        );
        notify("Poutre recalculée");
        return;
      }
      const b = boxOf(visibleCenter().pageId)!;
      const group = uid("g");
      const w = Math.min(640, b.w - 60);
      const x = Math.round((b.w - w) / 2);
      const els: NoteElement[] = [];
      const beam: BeamEl = { id: uid("e"), group, type: "beam", x, y: 0, w, title: opts.title || undefined, model: opts.model, show: opts.show };
      els.push(beam);
      const color = "#111827";
      if (opts.pfs) els.push({ id: uid("e"), group, role: "pfs", type: "text", x, y: 0, w, text: pfsMarkdown(opts.model, an), size: 14, color } satisfies TextEl);
      if (opts.cutFigures) {
        const n = segmentBounds(opts.model).length - 1;
        for (let k = 0; k < n; k++) els.push({ id: uid("e"), group, type: "cut", x, y: 0, w, model: opts.model, seg: k } satisfies CutEl);
      } else if (opts.cuts) els.push({ id: uid("e"), group, role: "cuts", type: "text", x, y: 0, w, text: cutsMarkdown(opts.model, an), size: 14, color } satisfies TextEl);
      placeGenerated(els, x, beam.id);
    },
    [commit, notify, visibleCenter, boxOf, placeGenerated],
  );

  /* -------------------------- images et PDF -------------------------- */
  const insertFiles = useCallback(
    async (files: File[]) => {
      for (const f of files) {
        if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
          setBusy("Import du PDF…");
          try {
            const imgs = await pdfToImages(f, (d, t) => setBusy(`Import du PDF… page ${d} / ${t}`));
            const at = currentRef.current;
            const newPages = imgs.map((im) => {
              const p = newPage("blanc", "blanc", im.w > im.h ? "paysage" : "portrait");
              return { ...p, background: im.src, title: f.name.replace(/\.pdf$/i, "") };
            });
            // remplace la page courante si elle est vide, sinon insère après
            const cur0 = pagesRef.current[at];
            const replaced = !!cur0 && cur0.elements.length === 0 && !cur0.background;
            commit((ps) => {
              const out = ps.slice();
              out.splice(replaced ? at : at + 1, replaced ? 1 : 0, ...newPages);
              return out;
            });
            setTimeout(() => goToPage(replaced ? at : at + 1), 60);
            notify(`${newPages.length} page(s) importée(s) : annotez directement par-dessus`);
          } catch {
            notify("Impossible de lire ce PDF");
          } finally {
            setBusy(null);
          }
        } else if (f.type.startsWith("image/")) {
          try {
            const im = await imageToDataUrl(f);
            insertElements((c) => {
              const maxW = c.w * 0.8;
              const k = Math.min(1, maxW / im.w, (c.h * 0.6) / im.h);
              const w = Math.round(im.w * k);
              const h = Math.round(im.h * k);
              return [{ id: uid("e"), type: "image", x: Math.round(clamp(c.x - w / 2, 10, c.w - w - 10)), y: Math.round(clamp(c.y - h / 2, 10, c.h - h - 10)), w, h, src: im.src }];
            });
          } catch {
            notify("Image illisible");
          }
        }
      }
    },
    [commit, insertElements, notify, goToPage, pagesRef],
  );

  /* ----------------------------- actions ----------------------------- */
  const clipboard = useRef<NoteElement[]>([]);

  const deleteSelection = useCallback(() => {
    const s = selRef.current;
    if (!s) return;
    const ids = new Set(s.ids);
    commit((ps) => mapPage(ps, s.pageId, (p) => ({ ...p, elements: p.elements.filter((e) => !ids.has(e.id)) })));
    setSel(null);
  }, [commit]);

  const copySelection = useCallback(() => {
    const s = selRef.current;
    if (!s) return;
    const p = pagesRef.current.find((pp) => pp.id === s.pageId);
    if (!p) return;
    const ids = new Set(s.ids);
    clipboard.current = p.elements.filter((e) => ids.has(e.id));
    notify(`${clipboard.current.length} élément(s) copié(s)`);
  }, [pagesRef, notify]);

  const pasteClipboard = useCallback(
    (offset = 24) => {
      if (clipboard.current.length === 0) return;
      const c = visibleCenter();
      const s = selRef.current;
      const groups = new Map<string, string>();
      let r: Rect | null = null;
      for (const e of clipboard.current) r = unionRect(r, elementBounds(e));
      const sameSpot = s && s.pageId === c.pageId;
      const dx = sameSpot ? offset : r ? c.x - (r.x + r.w / 2) : 0;
      const dy = sameSpot ? offset : r ? c.y - (r.y + r.h / 2) : 0;
      const els = clipboard.current.map((e) => translateElement(cloneElement(e, groups), dx, dy));
      commit((ps) => mapPage(ps, c.pageId, (p) => ({ ...p, elements: [...p.elements, ...els] })));
      setToolState("lasso");
      setSel({ pageId: c.pageId, ids: els.map((e) => e.id) });
      clipboard.current = els;
    },
    [commit, visibleCenter],
  );

  const duplicateSelection = useCallback(() => {
    const s = selRef.current;
    if (!s) return;
    const p = pagesRef.current.find((pp) => pp.id === s.pageId);
    if (!p) return;
    const ids = new Set(s.ids);
    const groups = new Map<string, string>();
    const els = p.elements.filter((e) => ids.has(e.id)).map((e) => translateElement(cloneElement(e, groups), 24, 24));
    commit((ps) => mapPage(ps, s.pageId, (pp) => ({ ...pp, elements: [...pp.elements, ...els] })));
    setSel({ pageId: s.pageId, ids: els.map((e) => e.id) });
  }, [commit, pagesRef]);

  const updateSelected = useCallback(
    (fn: (e: NoteElement) => NoteElement) => {
      const s = selRef.current;
      if (!s) return;
      const ids = new Set(s.ids);
      commit((ps) => mapPage(ps, s.pageId, (p) => ({ ...p, elements: p.elements.map((e) => (ids.has(e.id) ? fn(e) : e)) })));
    },
    [commit],
  );

  const reorderSelection = useCallback(
    (front: boolean) => {
      const s = selRef.current;
      if (!s) return;
      const ids = new Set(s.ids);
      commit((ps) =>
        mapPage(ps, s.pageId, (p) => {
          const a = p.elements.filter((e) => ids.has(e.id));
          const b = p.elements.filter((e) => !ids.has(e.id));
          return { ...p, elements: front ? [...b, ...a] : [...a, ...b] };
        }),
      );
    },
    [commit],
  );

  const editElement = useCallback(
    (pageId: string, e: NoteElement) => {
      if (e.type === "text") startEditing(pageId, e, false);
      else if (e.type === "math") setMathDlg({ pageId, el: e });
      else if (e.type === "beam") setBeamDlg({ el: e, pageId });
      else if (e.type === "truss") setTrussDlg({ el: e });
      else {
        setSel({ pageId, ids: [e.id] });
        setPropsOpen(true);
      }
    },
    [startEditing],
  );

  /* ------------------------- gestion des pages ------------------------- */
  const addPage = useCallback(
    (after: number, template?: Partial<Page>) => {
      const ref = pagesRef.current[after] ?? pagesRef.current[pagesRef.current.length - 1];
      const p = { ...newPage(ref?.paper === "etude-poutre" || ref?.paper === "exercice" ? "carreaux" : (ref?.paper ?? "carreaux"), ref?.color ?? "blanc", ref?.orientation ?? "portrait"), ...template };
      commit((ps) => {
        const out = ps.slice();
        out.splice(after + 1, 0, p);
        return out;
      });
      setTimeout(() => goToPage(after + 1), 30);
    },
    [commit, pagesRef, goToPage],
  );

  const pageActions = useMemo(
    () => ({
      add: (after: number, template?: Partial<Page>) => addPage(after, template),
      duplicate: (i: number) =>
        commit((ps) => {
          const out = ps.slice();
          out.splice(i + 1, 0, clonePage(ps[i]));
          return out;
        }),
      remove: (i: number) =>
        commit((ps) => {
          if (ps.length <= 1) return [{ ...newPage(ps[0].paper, ps[0].color, ps[0].orientation) }];
          return ps.filter((_, k) => k !== i);
        }),
      move: (i: number, dir: -1 | 1) =>
        commit((ps) => {
          const j = i + dir;
          if (j < 0 || j >= ps.length) return ps;
          const out = ps.slice();
          [out[i], out[j]] = [out[j], out[i]];
          return out;
        }),
      update: (i: number, patch: Partial<Page>, all = false) =>
        commit((ps) => ps.map((p, k) => (all || k === i ? { ...p, ...patch } : p))),
      goTo: goToPage,
    }),
    [addPage, commit, goToPage],
  );

  /* ------------------------------ gestes ------------------------------ */
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number; type: string }>());
  const penDown = useRef(false);
  const spaceDown = useRef(false);
  const lastTap = useRef<{ t: number; id: string | null }>({ t: 0, id: null });
  const [overlayPage, setOverlayPage] = useState<string | null>(null);
  const livePath = useRef<SVGPathElement>(null);
  const cursorRef = useRef<SVGCircleElement>(null);

  const fingerDraws = () => {
    const f = settingsRef.current.finger;
    // Auto : sur tablette (iPad), le doigt fait toujours défiler et zoomer ; sur
    // téléphone, il dessine tant qu'aucun stylet n'a été utilisé.
    return f === "on" || (f === "auto" && !penSeen.current && !isTablet());
  };

  const drawLive = useCallback(() => {
    const g = gesture.current;
    const path = livePath.current;
    if (!path) return;
    if (!g) {
      path.setAttribute("d", "");
      return;
    }
    if (g.kind === "draw") {
      if (g.snapped) {
        const s = g.snapped;
        const d = shapePreview(s.shape, s.pts);
        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", g.color);
        path.setAttribute("stroke-width", String(g.tool === "highlighter" ? g.size : g.size));
        path.setAttribute("opacity", g.tool === "highlighter" ? "0.42" : "1");
        return;
      }
      if (g.tool === "pen") {
        path.setAttribute("d", penPath({ pts: g.pts, size: g.size, pressure: g.pressure }, false));
        path.setAttribute("fill", g.color);
        path.setAttribute("stroke", "none");
        path.setAttribute("opacity", "1");
      } else {
        path.setAttribute("d", centerPath(g.pts));
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", g.color);
        path.setAttribute("stroke-width", String(g.size));
        path.setAttribute("opacity", "0.42");
      }
    } else if (g.kind === "lasso") {
      path.setAttribute("d", g.pts.length >= 4 ? `M${g.pts.join(" ")}` : "");
      path.setAttribute("fill", "rgba(31,94,255,0.06)");
      path.setAttribute("stroke", "#1f5eff");
      path.setAttribute("stroke-width", String(1.4 / viewRef.current.z));
      path.setAttribute("stroke-dasharray", `${5 / viewRef.current.z} ${4 / viewRef.current.z}`);
      path.setAttribute("opacity", "1");
    } else if (g.kind === "shape") {
      const s = settingsRef.current;
      const [x0, y0] = g.start;
      const [x1, y1] = g.end;
      const pts = s.shape === "triangle" ? [x0 + (x1 - x0) / 2, y0, x1, y1, x0, y1] : [x0, y0, x1, y1];
      path.setAttribute("d", shapePreview(s.shape, pts));
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", s.shapeColor);
      path.setAttribute("stroke-width", String(s.shapeSize));
      path.setAttribute("stroke-dasharray", s.shapeDash ? `${s.shapeSize * 3.5} ${s.shapeSize * 2.5}` : "");
      path.setAttribute("opacity", "1");
    }
  }, []);

  const liveRaf = useRef<number | null>(null);
  const scheduleLive = useCallback(() => {
    if (liveRaf.current !== null) return;
    liveRaf.current = requestAnimationFrame(() => {
      liveRaf.current = null;
      drawLive();
    });
  }, [drawLive]);

  const endLive = useCallback(() => {
    gesture.current = null;
    const path = livePath.current;
    if (path) {
      path.setAttribute("d", "");
      path.removeAttribute("stroke-dasharray");
    }
  }, []);

  /** Annule le geste en cours (arrivée d'un deuxième doigt). */
  const cancelGesture = useCallback(() => {
    const g = gesture.current;
    if (!g) return;
    if (g.kind === "draw" && g.holdTimer) clearTimeout(g.holdTimer);
    if (g.kind === "erase" || g.kind === "move" || g.kind === "scale") transient(() => g.before);
    endLive();
  }, [transient, endLive]);

  const hitTop = useCallback((pageId: string, x: number, y: number, tol: number): NoteElement | null => {
    const p = pagesRef.current.find((pp) => pp.id === pageId);
    if (!p) return null;
    // priorité aux objets au-dessus : encre, puis HTML, puis le reste
    const order = [...p.elements].reverse();
    const rank = (e: NoteElement) => (e.type === "stroke" && e.tool === "pen" ? 0 : e.type === "text" || e.type === "math" || e.type === "beam" || e.type === "cut" || e.type === "truss" ? 1 : 2);
    order.sort((a, b) => rank(a) - rank(b));
    for (const e of order) if (hitElement(e, x, y, tol)) return e;
    return null;
  }, [pagesRef]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const type = e.pointerType;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, type });
      if (editingRef.current) {
        finishEditing();
        if (toolRef.current !== "text") {
          pointers.current.delete(e.pointerId);
          return;
        }
      }
      if (type === "pen") {
        if (!penSeen.current) {
          penSeen.current = true;
          writePref("penSeen", true);
        }
        penDown.current = true;
        const g = gesture.current;
        if (g && (g.kind === "pan" || g.kind === "pinch" || ("touch" in g && g.touch))) cancelGesture();
      }
      if (type === "touch" && penDown.current) return; // paume posée pendant l'écriture
      const touches = [...pointers.current.entries()].filter(([, p]) => p.type === "touch");

      // Deux doigts : zoom / déplacement (annule le trait commencé au doigt)
      if (type === "touch" && touches.length >= 2) {
        const g = gesture.current;
        if (g && g.kind === "pinch") {
          g.maxTouches = Math.max(g.maxTouches, touches.length);
          return;
        }
        cancelGesture();
        const [[a, pa], [b, pb]] = touches;
        const r = viewportRef.current!.getBoundingClientRect();
        const c0: [number, number] = [(pa.x + pb.x) / 2 - r.left, (pa.y + pb.y) / 2 - r.top];
        const v = viewRef.current;
        gesture.current = {
          kind: "pinch",
          a,
          b,
          d0: Math.hypot(pa.x - pb.x, pa.y - pb.y) || 1,
          c0,
          world0: [(c0[0] - v.x) / v.z, (c0[1] - v.y) / v.z],
          z0: v.z,
          t0: performance.now(),
          moved: false,
          maxTouches: touches.length,
        };
        return;
      }
      if (gesture.current) return;

      const isTouch = type === "touch";
      // bouton « gomme » d'un stylet qui en possède un (bit 32 des boutons)
      const t: Tool = type === "pen" && (e.buttons & 32) !== 0 ? "eraser" : toolRef.current;
      const panRequested = (isTouch && !fingerDraws()) || (type === "mouse" && (e.button === 1 || spaceDown.current)) || t === "hand";
      if (type === "mouse" && e.button === 2) return;
      try {
        viewportRef.current?.setPointerCapture?.(e.pointerId);
      } catch {
        /* pointeur déjà relâché */
      }
      if (panRequested) {
        gesture.current = { kind: "pan", pid: e.pointerId, start: [e.clientX, e.clientY], view0: viewRef.current };
        return;
      }
      e.preventDefault();
      const [wx, wy] = clientToWorld(e.clientX, e.clientY);
      const box = pageAtWorld(wx, wy, t === "lasso" ? 40 : 0);
      if (!box) {
        if (t === "lasso") setSel(null);
        gesture.current = { kind: "pan", pid: e.pointerId, start: [e.clientX, e.clientY], view0: viewRef.current };
        return;
      }
      const x = wx - box.x;
      const y = wy - box.y;
      const z = viewRef.current.z;
      const s = settingsRef.current;
      setOverlayPage(box.id);

      if (t === "pen" || t === "highlighter") {
        const pressure = type === "pen";
        const pts: number[] = [];
        pushPoint(pts, x, y, pressure ? normalizePressure(e.pressure) : 0.5, 0);
        gesture.current = {
          kind: "draw",
          pid: e.pointerId,
          pageId: box.id,
          tool: t,
          pts,
          pressure,
          color: t === "pen" ? s.penColor : s.hlColor,
          size: t === "pen" ? s.penSize : s.hlSize,
          holdAt: [x, y],
          holdTimer: null,
          snapped: null,
          touch: isTouch,
          t0: performance.now(),
        };
        scheduleLive();
        return;
      }
      if (t === "eraser") {
        gesture.current = { kind: "erase", pid: e.pointerId, pageId: box.id, before: pagesRef.current, last: [x, y], touch: isTouch };
        eraseSegment(box.id, x, y, x, y);
        return;
      }
      if (t === "shape") {
        gesture.current = { kind: "shape", pid: e.pointerId, pageId: box.id, start: [x, y], end: [x, y], touch: isTouch };
        return;
      }
      if (t === "text") {
        const hit = hitTop(box.id, x, y, 4 / z);
        if (hit && hit.type === "text") {
          startEditing(box.id, hit, false);
          return;
        }
        if (hit && (hit.type === "math" || hit.type === "beam")) {
          editElement(box.id, hit);
          return;
        }
        const before = pagesRef.current;
        const el: TextEl = {
          id: uid("e"),
          type: "text",
          x: Math.round(x),
          y: Math.round(y - s.textSize * 0.75),
          w: Math.round(clamp(box.w - x - 24, 140, 420)),
          text: "",
          size: s.textSize,
          color: s.textColor,
        };
        transient((ps) => mapPage(ps, box.id, (p) => ({ ...p, elements: [...p.elements, el] })));
        startEditing(box.id, el, true, before);
        return;
      }
      if (t === "math") {
        const hit = hitTop(box.id, x, y, 4 / z);
        if (hit && hit.type === "math") setMathDlg({ pageId: box.id, el: hit });
        else setMathDlg({ pageId: box.id, at: [x, y] });
        return;
      }
      if (t === "lasso") {
        const cur = selRef.current;
        if (cur && cur.pageId === box.id && selBoxRef.current) {
          const b = selBoxRef.current;
          const hs = 14 / z;
          if (Math.hypot(x - (b.x + b.w), y - (b.y + b.h)) <= hs * 1.4) {
            const orig = new Map(selectedRef.current.map((el) => [el.id, el] as [string, NoteElement]));
            gesture.current = { kind: "scale", pid: e.pointerId, pageId: box.id, before: pagesRef.current, box: b, orig, touch: isTouch };
            return;
          }
          if (pointInRect(x, y, b, 8 / z)) {
            const orig = new Map(selectedRef.current.map((el) => [el.id, el] as [string, NoteElement]));
            gesture.current = { kind: "move", pid: e.pointerId, pageId: box.id, before: pagesRef.current, start: [x, y], orig, moved: false, touch: isTouch };
            return;
          }
        }
        gesture.current = { kind: "lasso", pid: e.pointerId, pageId: box.id, pts: [x, y], touch: isTouch };
        scheduleLive();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cancelGesture, clientToWorld, pageAtWorld, scheduleLive, finishEditing, startEditing, hitTop, editElement, transient, pagesRef],
  );

  const selBoxRef = useRef(selBox);
  selBoxRef.current = selBox;
  const selectedRef = useRef(selectedElements);
  selectedRef.current = selectedElements;

  function eraseSegment(pageId: string, ax: number, ay: number, bx: number, by: number) {
    const s = settingsRef.current;
    const r = s.eraserSize / 2;
    transient((ps) =>
      mapPage(ps, pageId, (p) => {
        let changed = false;
        const out: NoteElement[] = [];
        for (const el of p.elements) {
          if (el.type === "stroke" || el.type === "shape") {
            if (s.eraserHlOnly && !(el.type === "stroke" && el.tool === "highlighter")) {
              out.push(el);
              continue;
            }
            if (el.type === "stroke" && s.eraserMode === "precise") {
              const runs = eraseFromStroke(el, ax, ay, bx, by, r);
              if (runs) {
                changed = true;
                for (const pts of runs) out.push({ ...el, id: uid("e"), pts });
                continue;
              }
            } else if (strokeTouchesSegment(el, ax, ay, bx, by, r)) {
              changed = true;
              continue;
            }
          }
          out.push(el);
        }
        return changed ? { ...p, elements: out } : p;
      }),
    );
  }

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const p = pointers.current.get(e.pointerId);
      if (p) {
        p.x = e.clientX;
        p.y = e.clientY;
      }
      const g = gesture.current;
      // curseur de la gomme (souris, stylet au survol)
      if (toolRef.current === "eraser" && cursorRef.current && e.pointerType !== "touch") {
        const [wx, wy] = clientToWorld(e.clientX, e.clientY);
        const box = overlayPage ? boxOf(overlayPage) : null;
        if (box) {
          cursorRef.current.setAttribute("cx", String(wx - box.x));
          cursorRef.current.setAttribute("cy", String(wy - box.y));
          cursorRef.current.setAttribute("r", String(settingsRef.current.eraserSize / 2));
          cursorRef.current.style.display = "";
        } else {
          const b2 = pageAtWorld(wx, wy);
          if (b2) setOverlayPage(b2.id);
        }
      }
      if (!g) return;
      if (g.kind === "pinch") {
        const pa = pointers.current.get(g.a);
        const pb = pointers.current.get(g.b);
        if (!pa || !pb) return;
        const r = viewportRef.current!.getBoundingClientRect();
        const c: [number, number] = [(pa.x + pb.x) / 2 - r.left, (pa.y + pb.y) / 2 - r.top];
        const d = Math.hypot(pa.x - pb.x, pa.y - pb.y) || 1;
        const z = clamp(g.z0 * (d / g.d0), MIN_Z, MAX_Z);
        if (Math.abs(d - g.d0) > 10 || Math.hypot(c[0] - g.c0[0], c[1] - g.c0[1]) > 10) g.moved = true;
        setView(clampView({ x: c[0] - g.world0[0] * z, y: c[1] - g.world0[1] * z, z }));
        return;
      }
      if ("pid" in g && g.pid !== e.pointerId) return;
      if (g.kind === "pan") {
        const v0 = g.view0;
        setView(clampView({ x: v0.x + e.clientX - g.start[0], y: v0.y + e.clientY - g.start[1], z: v0.z }));
        return;
      }
      const events = (e.nativeEvent.getCoalescedEvents?.() ?? []).length ? e.nativeEvent.getCoalescedEvents() : [e.nativeEvent];
      if (g.kind === "draw") {
        for (const ev of events) {
          const [x, y] = toPage(g.pageId, ev.clientX, ev.clientY);
          if (g.snapped) {
            if (g.snapped.shape === "line") {
              const [x0, y0] = [g.snapped.pts[0], g.snapped.pts[1]];
              const dx = x - x0;
              const dy = y - y0;
              const ang = Math.atan2(dy, dx);
              const sn = Math.round(ang / (Math.PI / 12)) * (Math.PI / 12);
              const len = Math.hypot(dx, dy);
              const useSnap = Math.abs(ang - sn) < 0.06;
              g.snapped = { shape: "line", pts: [x0, y0, useSnap ? x0 + len * Math.cos(sn) : x, useSnap ? y0 + len * Math.sin(sn) : y] };
            }
            continue;
          }
          pushPoint(g.pts, x, y, g.pressure ? normalizePressure(ev.pressure) : 0.5, 0.4 / viewRef.current.z);
          if (Math.hypot(x - g.holdAt[0], y - g.holdAt[1]) > 3.5) {
            g.holdAt = [x, y];
            if (g.holdTimer) clearTimeout(g.holdTimer);
            g.holdTimer = null;
            if (settingsRef.current.autoShape && strokeLength(g.pts) > 45) {
              g.holdTimer = setTimeout(() => {
                const cur = gesture.current;
                if (cur !== g || g.snapped) return;
                const rec = recognizeShape(g.pts);
                if (!rec) return;
                if (g.tool === "highlighter" && rec.shape !== "line") return;
                g.snapped = rec;
                scheduleLive();
              }, 800);
            }
          }
        }
        scheduleLive();
        return;
      }
      if (g.kind === "erase") {
        for (const ev of events) {
          const [x, y] = toPage(g.pageId, ev.clientX, ev.clientY);
          eraseSegment(g.pageId, g.last[0], g.last[1], x, y);
          g.last = [x, y];
        }
        if (cursorRef.current) {
          cursorRef.current.setAttribute("cx", String(g.last[0]));
          cursorRef.current.setAttribute("cy", String(g.last[1]));
        }
        return;
      }
      const [x, y] = toPage(g.pageId, e.clientX, e.clientY);
      if (g.kind === "lasso") {
        const n = g.pts.length;
        if (Math.hypot(x - g.pts[n - 2], y - g.pts[n - 1]) > 2 / viewRef.current.z) {
          g.pts.push(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
          scheduleLive();
        }
        return;
      }
      if (g.kind === "shape") {
        let [x1, y1] = [x, y];
        const s = settingsRef.current.shape;
        const [x0, y0] = g.start;
        if (s === "line" || s === "arrow" || s === "darrow" || s === "dim") {
          const ang = Math.atan2(y1 - y0, x1 - x0);
          const sn = Math.round(ang / (Math.PI / 12)) * (Math.PI / 12);
          if (Math.abs(ang - sn) < 0.07 || e.shiftKey) {
            const len = Math.hypot(x1 - x0, y1 - y0);
            x1 = x0 + len * Math.cos(sn);
            y1 = y0 + len * Math.sin(sn);
          }
        } else if (e.shiftKey) {
          const d = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
          x1 = x0 + Math.sign(x1 - x0 || 1) * d;
          y1 = y0 + Math.sign(y1 - y0 || 1) * d;
        }
        g.end = [x1, y1];
        scheduleLive();
        return;
      }
      if (g.kind === "move") {
        const dx = x - g.start[0];
        const dy = y - g.start[1];
        if (!g.moved && Math.hypot(dx, dy) < 3 / viewRef.current.z) return;
        g.moved = true;
        transient((ps) => mapPage(ps, g.pageId, (pg) => ({ ...pg, elements: pg.elements.map((el) => (g.orig.has(el.id) ? translateElement(g.orig.get(el.id)!, dx, dy) : el)) })));
        return;
      }
      if (g.kind === "scale") {
        const b = g.box;
        const k = clamp((x - b.x + (y - b.y)) / Math.max(1, b.w + b.h), 0.15, 8);
        transient((ps) => mapPage(ps, g.pageId, (pg) => ({ ...pg, elements: pg.elements.map((el) => (g.orig.has(el.id) ? scaleElement(g.orig.get(el.id)!, k, b.x, b.y) : el)) })));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clientToWorld, toPage, setView, clampView, scheduleLive, transient, overlayPage, boxOf, pageAtWorld],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const info = pointers.current.get(e.pointerId);
      pointers.current.delete(e.pointerId);
      if (e.pointerType === "pen") penDown.current = false;
      const g = gesture.current;
      if (!g) return;
      if (g.kind === "pinch") {
        if (g.a === e.pointerId || g.b === e.pointerId) {
          const quick = performance.now() - g.t0 < 320 && !g.moved;
          if (quick && e.type === "pointerup") {
            if (g.maxTouches >= 3) nbh.redo();
            else nbh.undo();
          }
          gesture.current = null;
          // un doigt reste posé : on continue en déplacement
          const rest = [...pointers.current.entries()].find(([, p]) => p.type === "touch");
          if (rest && !quick) gesture.current = { kind: "pan", pid: rest[0], start: [rest[1].x, rest[1].y], view0: viewRef.current };
        }
        return;
      }
      if ("pid" in g && g.pid !== e.pointerId) return;
      const cancelled = e.type === "pointercancel";
      void info;
      if (g.kind === "pan") {
        gesture.current = null;
        return;
      }
      if (g.kind === "draw") {
        if (g.holdTimer) clearTimeout(g.holdTimer);
        // Interruption par le système (geste, Scribble) : le trait déjà tracé est conservé.
        if (!cancelled || (!g.touch && g.pts.length >= 6)) {
          let el: NoteElement | null = null;
          if (g.snapped) {
            if (g.tool === "highlighter") el = { id: uid("e"), type: "stroke", tool: "highlighter", color: g.color, size: g.size, pressure: false, pts: [g.snapped.pts[0], g.snapped.pts[1], 0.5, g.snapped.pts[2], g.snapped.pts[3], 0.5] };
            else el = shapeFromRecognized(uid("e"), g.snapped, g.color, Math.max(1.2, g.size * 0.75));
          } else if (g.pts.length >= 3) {
            el = { id: uid("e"), type: "stroke", tool: g.tool, color: g.color, size: g.size, pressure: g.pressure, pts: g.pts } satisfies StrokeEl;
          }
          if (el) {
            const add = el;
            commit((ps) => mapPage(ps, g.pageId, (p) => ({ ...p, elements: [...p.elements, add] })));
          }
        }
        endLive();
        return;
      }
      if (g.kind === "erase") {
        if (cancelled) transient(() => g.before);
        else endGesture(g.before);
        gesture.current = null;
        return;
      }
      if (g.kind === "shape") {
        const [x0, y0] = g.start;
        const [x1, y1] = g.end;
        const s = settingsRef.current;
        if (!cancelled && Math.hypot(x1 - x0, y1 - y0) > 4) {
          const pts = s.shape === "triangle" ? [x0 + (x1 - x0) / 2, y0, x1, y1, x0, y1] : s.shape === "rect" || s.shape === "ellipse" ? [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)] : [x0, y0, x1, y1];
          const el: ShapeEl = {
            id: uid("e"),
            type: "shape",
            shape: s.shape,
            pts: pts.map((v) => Math.round(v * 100) / 100),
            color: s.shapeColor,
            size: s.shapeSize,
            dash: s.shapeDash || undefined,
            fill: (s.shapeFill && (s.shape === "rect" || s.shape === "ellipse" || s.shape === "triangle")) || undefined,
            label: s.shape === "dim" ? "L" : undefined,
          };
          commit((ps) => mapPage(ps, g.pageId, (p) => ({ ...p, elements: [...p.elements, el] })));
          if (s.shape === "dim") {
            setToolState("lasso");
            setSel({ pageId: g.pageId, ids: [el.id] });
            setPropsOpen(true);
          }
        }
        endLive();
        return;
      }
      if (g.kind === "lasso") {
        endLive();
        if (cancelled) return;
        const pts = g.pts;
        let len = 0;
        for (let i = 2; i < pts.length; i += 2) len += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
        const p = pagesRef.current.find((pp) => pp.id === g.pageId);
        if (!p) return;
        if (len < 8 / viewRef.current.z) {
          const hit = hitTop(g.pageId, pts[0], pts[1], 6 / viewRef.current.z);
          const now = performance.now();
          if (hit && lastTap.current.id === hit.id && now - lastTap.current.t < 380) {
            editElement(g.pageId, hit);
            lastTap.current = { t: 0, id: null };
            return;
          }
          lastTap.current = { t: now, id: hit?.id ?? null };
          if (hit) {
            // un clic sur un élément d'une poutre calculée sélectionne aussi son groupe ? non : seulement l'élément
            setSel({ pageId: g.pageId, ids: [hit.id] });
          } else setSel(null);
          return;
        }
        const ids = p.elements.filter((el) => insideLasso(el, pts)).map((el) => el.id);
        setSel(ids.length ? { pageId: g.pageId, ids } : null);
        return;
      }
      if (g.kind === "move") {
        gesture.current = null;
        if (cancelled) {
          transient(() => g.before);
          return;
        }
        if (!g.moved) {
          // tape sur la sélection : double tape = modifier
          const now = performance.now();
          const only = selRef.current?.ids.length === 1 ? selRef.current.ids[0] : null;
          if (only && lastTap.current.id === only && now - lastTap.current.t < 380) {
            const el = selectedRef.current[0];
            if (el) editElement(g.pageId, el);
            lastTap.current = { t: 0, id: null };
          } else lastTap.current = { t: now, id: only };
          return;
        }
        endGesture(g.before);
        return;
      }
      if (g.kind === "scale") {
        gesture.current = null;
        if (cancelled) transient(() => g.before);
        else endGesture(g.before);
      }
    },
    [commit, endGesture, endLive, transient, nbh, pagesRef, hitTop, editElement],
  );

  /* --------------------------- molette, clavier --------------------------- */
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        const f = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0022));
        zoomAt(f, e.clientX - r.left, e.clientY - r.top);
      } else {
        const v = viewRef.current;
        const k = e.deltaMode === 1 ? 16 : 1;
        const dx = (e.shiftKey ? e.deltaY : e.deltaX) * k;
        const dy = (e.shiftKey ? 0 : e.deltaY) * k;
        setView(clampView({ x: v.x - dx, y: v.y - dy, z: v.z }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    // iPad : sans cela, Safari peut lancer un défilement ou Scribble au milieu d'un trait
    // (événement « pointercancel ») et le trait est coupé.
    const onTouch = (e: TouchEvent) => {
      const target = e.target as Element | null;
      if (target?.closest?.("[data-nb-ui], input, textarea, select, button, a, label")) return;
      if (e.cancelable) e.preventDefault();
    };
    el.addEventListener("touchstart", onTouch, { passive: false });
    el.addEventListener("touchmove", onTouch, { passive: false });
    // Safari : gestes de pincement au trackpad
    const prevent = (e: Event) => e.preventDefault();
    el.addEventListener("gesturestart", prevent);
    el.addEventListener("gesturechange", prevent);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouch);
      el.removeEventListener("touchmove", onTouch);
      el.removeEventListener("gesturestart", prevent);
      el.removeEventListener("gesturechange", prevent);
    };
  }, [zoomAt, setView, clampView]);

  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
    const onKey = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === " ") {
        spaceDown.current = true;
        e.preventDefault();
        return;
      }
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) nbh.redo();
        else nbh.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        nbh.redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "c") return copySelection();
      if (mod && e.key.toLowerCase() === "x") {
        copySelection();
        deleteSelection();
        return;
      }
      if (mod && e.key.toLowerCase() === "v") {
        if (clipboard.current.length) {
          e.preventDefault();
          pasteClipboard();
        }
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelection();
        return;
      }
      if (mod && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        zoomAt(1.2, vpRef.current.w / 2, vpRef.current.h / 2);
        return;
      }
      if (mod && e.key === "-") {
        e.preventDefault();
        zoomAt(1 / 1.2, vpRef.current.w / 2, vpRef.current.h / 2);
        return;
      }
      if (mod && e.key === "0") {
        e.preventDefault();
        fitWidth();
        return;
      }
      if (mod) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selRef.current) {
        e.preventDefault();
        deleteSelection();
        return;
      }
      if (e.key === "Escape") {
        setSel(null);
        setDrawer(null);
        return;
      }
      const map: Record<string, Tool> = { p: "pen", s: "highlighter", e: "eraser", l: "lasso", f: "shape", t: "text", m: "math", h: "hand" };
      const t = map[e.key.toLowerCase()];
      if (t) setTool(t);
      if (e.key === "PageDown") goToPage(currentRef.current + 1);
      if (e.key === "PageUp") goToPage(currentRef.current - 1);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") spaceDown.current = false;
    };
    const onPaste = (e: ClipboardEvent) => {
      if (typing(e.target)) return;
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/") || f.type === "application/pdf");
      if (files.length) {
        e.preventDefault();
        void insertFiles(files);
        return;
      }
      const text = e.clipboardData?.getData("text/plain");
      if (text && !clipboard.current.length) {
        e.preventDefault();
        insertSnippet("text", text.slice(0, 20000));
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("paste", onPaste);
    };
  }, [nbh, copySelection, deleteSelection, pasteClipboard, duplicateSelection, zoomAt, fitWidth, setTool, goToPage, insertFiles, insertSnippet]);
  const vpRef = useRef(vp);
  vpRef.current = vp;

  /* ------------------------------ impression ------------------------------ */
  const [printing, setPrinting] = useState<false | "print" | "html">(false);
  const doPrint = useCallback(
    (mode: "print" | "html") => {
      finishEditing();
      setSel(null);
      setPrinting(mode);
    },
    [finishEditing],
  );
  useEffect(() => {
    if (!printing) return;
    const t = setTimeout(() => {
      if (printing === "print") printNotebook(() => setPrinting(false));
      else {
        const html = printableHtml(nbRef.current.title);
        setPrinting(false);
        if (html) void saveFile(`${safeName(nbRef.current.title)}.html`, html, "text/html");
      }
    }, 450);
    return () => clearTimeout(t);
  }, [printing]);
  const nbRef = useRef(nb);
  nbRef.current = nb;

  /* -------------------------------- rendu -------------------------------- */
  const visible = useMemo(() => {
    const top = -view.y / view.z - vp.h / view.z;
    const bottom = (vp.h - view.y) / view.z + vp.h / view.z;
    return new Set(layout.boxes.filter((b) => b.y + b.h >= top && b.y <= bottom).map((b) => b.id));
  }, [layout, view, vp]);

  const overlayBox = overlayPage ? layout.boxes.find((b) => b.id === overlayPage) : null;
  const selPageBox = sel ? layout.boxes.find((b) => b.id === sel.pageId) : null;
  const handle = 9 / view.z;

  // position de la barre de sélection (écran)
  const selScreen =
    selBox && selPageBox
      ? {
          x: (selPageBox.x + selBox.x + selBox.w / 2) * view.z + view.x,
          top: (selPageBox.y + selBox.y) * view.z + view.y,
          bottom: (selPageBox.y + selBox.y + selBox.h) * view.z + view.y,
        }
      : null;

  const single = selectedElements.length === 1 ? selectedElements[0] : null;
  const cur = pages[currentPageIndex];

  return (
    <div className="nb-root fixed inset-0 z-40 flex flex-col bg-[var(--nb-desk)] text-foreground">
      <TopBar
        title={nb.title}
        onTitle={nbh.setTitle}
        onClose={async () => {
          finishEditing();
          await nbh.flush();
          onClose();
        }}
        canUndo={nbh.canUndo}
        canRedo={nbh.canRedo}
        onUndo={nbh.undo}
        onRedo={nbh.redo}
        saving={nbh.saving}
        persistent={store.persistent}
        sync={sync ?? null}
        page={cur}
        pageIndex={currentPageIndex}
        pageCount={pages.length}
        onPage={(patch, all) => pageActions.update(currentPageIndex, patch, all)}
        onAddPage={(tpl) => pageActions.add(currentPageIndex, tpl)}
        sidebar={sidebar}
        onSidebar={() => setSidebar((s) => !s)}
        drawer={drawer === "mechanics"}
        onDrawer={() => setDrawer((d) => (d ? null : "mechanics"))}
        onImport={async () => {
          const files = await pickFiles("image/*,application/pdf,.pdf", true);
          if (files.length) void insertFiles(files);
        }}
        onPrint={() => doPrint("print")}
        onPrintHtml={() => doPrint("html")}
        notebook={nb}
        settings={settings}
        onSettings={updateSettings}
        zoom={view.z}
        onZoom={(f) => zoomAt(f, vp.w / 2, vp.h / 2)}
        onFit={() => fitWidth()}
        onBeam={() => setBeamDlg({})}
      />
      <EditorToolbar
        tool={tool}
        onTool={setTool}
        settings={settings}
        onSettings={updateSettings}
        onBeam={() => setBeamDlg({})}
        onTruss={() => setTrussDlg({})}
        onMechanics={() => setDrawer((d) => (d ? null : "mechanics"))}
      />
      <div className="relative flex min-h-0 flex-1">
        {sidebar && <PagesSidebar pages={pages} current={currentPageIndex} actions={pageActions} onClose={() => setSidebar(false)} />}
        <div
          ref={viewportRef}
          className="nb-viewport relative min-w-0 flex-1 overflow-hidden"
          style={{ touchAction: "none", cursor: tool === "hand" ? "grab" : tool === "text" ? "text" : tool === "lasso" ? "default" : "crosshair" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={(e) => {
            if (e.pointerType !== "touch" && cursorRef.current) cursorRef.current.style.display = "none";
          }}
          onContextMenu={(e) => e.preventDefault()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const files = [...e.dataTransfer.files];
            if (files.length) void insertFiles(files);
          }}
        >
          <div ref={worldRef} className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z / zc})` }}>
            {layout.boxes.map((b, i) => (
              <div key={b.id} className="nb-sheet absolute" style={{ left: b.x * zc, top: b.y * zc, width: b.w * zc, height: b.h * zc }}>
                {visible.has(b.id) ? (
                  <PageView page={pages[i]} scale={zc} editing={editing && editing.pageId === b.id ? textEditing : null} />
                ) : (
                  <div className="h-full w-full" style={{ background: PAPER_COLORS[pages[i].color].theme.bg }} />
                )}
              </div>
            ))}
            {/* calque d'interaction : trait en cours, lasso, gomme */}
            {overlayBox && (
              <svg
                className="pointer-events-none absolute overflow-visible"
                style={{ left: overlayBox.x * zc, top: overlayBox.y * zc }}
                width={overlayBox.w * zc}
                height={overlayBox.h * zc}
                viewBox={`0 0 ${overlayBox.w} ${overlayBox.h}`}
              >
                <path ref={livePath} strokeLinecap="round" strokeLinejoin="round" />
                {tool === "eraser" && <circle ref={cursorRef} r={settings.eraserSize / 2} fill="rgba(120,130,150,0.12)" stroke="#6b7280" strokeWidth={1 / view.z} style={{ display: "none" }} />}
              </svg>
            )}
            {/* sélection */}
            {selBox && selPageBox && (
              <svg
                className="pointer-events-none absolute overflow-visible"
                style={{ left: selPageBox.x * zc, top: selPageBox.y * zc }}
                width={selPageBox.w * zc}
                height={selPageBox.h * zc}
                viewBox={`0 0 ${selPageBox.w} ${selPageBox.h}`}
              >
                {selectedElements.length > 1 &&
                  selectedElements.map((el) => {
                    const r = elementBounds(el);
                    return <rect key={el.id} x={r.x} y={r.y} width={r.w} height={r.h} fill="none" stroke="#1f5eff" strokeOpacity={0.35} strokeWidth={1 / view.z} />;
                  })}
                <rect x={selBox.x - 4 / view.z} y={selBox.y - 4 / view.z} width={selBox.w + 8 / view.z} height={selBox.h + 8 / view.z} fill="rgba(31,94,255,0.04)" stroke="#1f5eff" strokeWidth={1.4 / view.z} strokeDasharray={`${6 / view.z} ${4 / view.z}`} rx={4 / view.z} />
                <circle cx={selBox.x + selBox.w} cy={selBox.y + selBox.h} r={handle} fill="#fff" stroke="#1f5eff" strokeWidth={2 / view.z} />
                <path d={`M${selBox.x + selBox.w - handle * 0.45} ${selBox.y + selBox.h + handle * 0.45} L${selBox.x + selBox.w + handle * 0.45} ${selBox.y + selBox.h - handle * 0.45}`} stroke="#1f5eff" strokeWidth={1.6 / view.z} />
              </svg>
            )}
          </div>

          {/* barre de sélection */}
          {selScreen && !gesture.current && sel && (
            <SelectionBar
              x={selScreen.x}
              top={selScreen.top}
              bottom={selScreen.bottom}
              vpW={vp.w}
              vpH={vp.h}
              elements={selectedElements}
              onDelete={deleteSelection}
              onDuplicate={duplicateSelection}
              onCopy={copySelection}
              onCut={() => {
                copySelection();
                deleteSelection();
              }}
              onColor={(c) => updateSelected((el) => changeColor(el, c))}
              onFront={() => reorderSelection(true)}
              onBack={() => reorderSelection(false)}
              onRotate={(d) => updateSelected((el) => (el.type === "symbol" ? { ...el, rot: (((el.rot + d) % 360) + 360) % 360 } : el))}
              onEdit={single ? () => editElement(sel.pageId, single) : undefined}
              onProps={() => setPropsOpen((o) => !o)}
              onSelectGroup={
                single?.group
                  ? () => {
                      const p = pages.find((pp) => pp.id === sel.pageId);
                      if (p) setSel({ pageId: sel.pageId, ids: p.elements.filter((el) => el.group === single.group).map((el) => el.id) });
                    }
                  : undefined
              }
            />
          )}
          {propsOpen && single && sel && (
            <PropsPanel
              el={single}
              onChange={(patch) => updateSelected((el) => ({ ...el, ...patch }) as NoteElement)}
              onClose={() => setPropsOpen(false)}
              onEdit={() => editElement(sel.pageId, single)}
            />
          )}

          {/* bascule rapide outil ⇄ gomme (le double-tap du Pencil n'est pas transmis aux pages web) */}
          {settings.quickSide !== "off" && (
            <button
              type="button"
              data-nb-ui
              onPointerDown={(e) => e.stopPropagation()}
              onClick={toggleEraser}
              aria-label={tool === "eraser" ? "Revenir à l'outil précédent" : "Passer à la gomme"}
              title={tool === "eraser" ? "Revenir à l'outil précédent" : "Gomme (touchez à nouveau pour revenir)"}
              className={`absolute z-20 inline-flex size-14 cursor-pointer items-center justify-center rounded-full shadow-lg ring-1 ring-black/10 transition active:scale-95 [&_svg]:size-6 ${
                settings.quickSide === "right" ? "right-3" : "left-3"
              } ${tool === "eraser" ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}
              style={{ bottom: 56 }}
            >
              {tool === "eraser" ? <ToolIcon tool={prevTool.current === "eraser" ? "pen" : prevTool.current} /> : <Eraser />}
            </button>
          )}
          {/* indicateur de page et zoom */}
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--nb-chip)] px-3 py-1 text-xs font-medium text-white shadow">
            Page {currentPageIndex + 1} / {pages.length} · {Math.round(view.z * 100)} %
          </div>
          {busy && (
            <div className="absolute inset-x-0 top-3 mx-auto w-fit rounded-lg bg-card px-4 py-2 text-sm shadow-lg ring-1 ring-border" role="status">
              {busy}
            </div>
          )}
          {toast && (
            <div className="absolute inset-x-0 bottom-12 mx-auto w-fit max-w-[90%] rounded-lg bg-[var(--nb-chip)] px-4 py-2 text-sm text-white shadow-lg" role="status">
              {toast}
            </div>
          )}
        </div>
        {drawer === "mechanics" && (
          <MechanicsDrawer
            onClose={() => setDrawer(null)}
            onSymbol={insertSymbol}
            onSnippet={insertSnippet}
            onBeam={(presetId) => setBeamDlg({ presetId })}
            onTruss={() => setTrussDlg({})}
            onPage={(tpl) => pageActions.add(currentPageIndex, tpl)}
          />
        )}
      </div>

      {mathDlg && (
        <MathDialog
          initial={mathDlg.el}
          onCancel={() => setMathDlg(null)}
          onSave={(patch) => {
            const d = mathDlg;
            setMathDlg(null);
            if (d.el) {
              const id = d.el.id;
              if (!patch.tex.trim()) commit((ps) => mapPage(ps, d.pageId, (p) => ({ ...p, elements: p.elements.filter((e) => e.id !== id) })));
              else commit((ps) => mapPage(ps, d.pageId, (p) => ({ ...p, elements: p.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) })));
            } else if (patch.tex.trim()) {
              const [x, y] = d.at ?? [100, 100];
              const el: MathEl = { id: uid("e"), type: "math", x: Math.round(x), y: Math.round(y - patch.size), color: settings.textColor, ...patch };
              commit((ps) => mapPage(ps, d.pageId, (p) => ({ ...p, elements: [...p.elements, el] })));
            }
          }}
        />
      )}
      {beamDlg && (
        <BeamDialog
          initial={beamDlg.el}
          presetId={beamDlg.presetId}
          onCancel={() => setBeamDlg(null)}
          onSave={(opts) => {
            const d = beamDlg;
            setBeamDlg(null);
            insertBeam(opts, d.el);
            if (window.innerWidth < 900) setDrawer(null);
          }}
        />
      )}
      {trussDlg && (
        <TrussDialog
          initial={trussDlg.el}
          onCancel={() => setTrussDlg(null)}
          onSave={(opts) => {
            const d = trussDlg;
            setTrussDlg(null);
            insertTruss(opts, d.el);
            if (window.innerWidth < 900) setDrawer(null);
          }}
        />
      )}
      {printing && <PrintArea notebook={nb} />}
    </div>
  );
}

/** Aperçu d'une forme pendant le tracé (chemin SVG). */
function shapePreview(shape: string, p: number[]): string {
  const [x0, y0, x1, y1] = p;
  switch (shape) {
    case "rect":
      return `M${x0} ${y0} H${x1} V${y1} H${x0} Z`;
    case "ellipse": {
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const rx = Math.abs(x1 - x0) / 2;
      const ry = Math.abs(y1 - y0) / 2;
      return `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
    }
    case "triangle":
    case "polygon": {
      let d = `M${p[0]} ${p[1]}`;
      for (let i = 2; i + 1 < p.length; i += 2) d += ` L${p[i]} ${p[i + 1]}`;
      return d + " Z";
    }
    case "polyline": {
      let d = `M${p[0]} ${p[1]}`;
      for (let i = 2; i + 1 < p.length; i += 2) d += ` L${p[i]} ${p[i + 1]}`;
      return d;
    }
    case "arrow":
    case "darrow":
    case "dim": {
      const a = Math.atan2(y1 - y0, x1 - x0);
      const h = 12;
      const head = (x: number, y: number, ang: number) => `M${x - h * Math.cos(ang - 0.4)} ${y - h * Math.sin(ang - 0.4)} L${x} ${y} L${x - h * Math.cos(ang + 0.4)} ${y - h * Math.sin(ang + 0.4)}`;
      let d = `M${x0} ${y0} L${x1} ${y1} ${head(x1, y1, a)}`;
      if (shape !== "arrow") d += ` ${head(x0, y0, a + Math.PI)}`;
      return d;
    }
    default:
      return `M${x0} ${y0} L${x1} ${y1}`;
  }
}
