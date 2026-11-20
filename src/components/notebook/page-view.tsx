"use client";
/**
 * Rendu d'une page du cahier, en trois calques superposés :
 *  1. SVG du fond : papier, images, surligneur, formes, symboles mécaniques ;
 *  2. HTML : zones de texte (Markdown + LaTeX), formules, poutres calculées, coupures ;
 *  3. SVG de l'encre : traits du stylo (toujours au-dessus, comme sur du papier).
 * Les calques n'interceptent pas le pointeur : l'éditeur gère les gestes.
 */
import { memo, useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import katex from "katex";
import { Md } from "@/components/math";
import { strokePath } from "@/lib/notebook/ink";
import { measured } from "@/lib/notebook/geometry";
import { PAPER_COLORS, displayColor, pageSize, paperCssVars } from "@/lib/notebook/paper";
import type { ImageEl, MathEl, NoteElement, Page, ShapeEl, StrokeEl, TextEl } from "@/lib/notebook/types";
import { BeamBlock, CutBlock } from "./beam-blocks";
import { PaperBackground } from "./paper";
import { SymbolArt } from "./symbol-art";

/* ------------------------------------------------------------------ */
/*                       Mesure des éléments HTML                       */
/* ------------------------------------------------------------------ */
const measureListeners = new Set<() => void>();
export function onMeasure(fn: () => void) {
  measureListeners.add(fn);
  return () => {
    measureListeners.delete(fn);
  };
}
let notifyQueued = false;
function notifyMeasure() {
  if (notifyQueued) return;
  notifyQueued = true;
  requestAnimationFrame(() => {
    notifyQueued = false;
    for (const l of measureListeners) l();
  });
}

function useMeasure(id: string) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const prev = measured.get(id);
      if (!prev || Math.abs(prev.w - w) > 0.5 || Math.abs(prev.h - h) > 0.5) {
        measured.set(id, { w, h });
        notifyMeasure();
      }
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [id]);
  return ref;
}

/* ------------------------------------------------------------------ */
/*                           Éléments SVG                               */
/* ------------------------------------------------------------------ */
const StrokeView = memo(function StrokeView({ el, dark }: { el: StrokeEl; dark: boolean }) {
  const d = strokePath(el);
  if (el.tool === "highlighter") {
    return <path d={d} fill="none" stroke={el.color} strokeWidth={el.size} strokeLinecap="round" strokeLinejoin="round" opacity={dark ? 0.45 : 0.42} style={{ mixBlendMode: dark ? "screen" : "multiply" }} />;
  }
  return <path d={d} fill={displayColor(el.color, dark)} />;
});

function arrowHead(x1: number, y1: number, x2: number, y2: number, size: number): string {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = Math.max(9, size * 4);
  const w = h * 0.45;
  const bx = x2 - h * Math.cos(a);
  const by = y2 - h * Math.sin(a);
  return `M${x2} ${y2} L${bx + w * Math.sin(a)} ${by - w * Math.cos(a)} L${bx - w * Math.sin(a)} ${by + w * Math.cos(a)} Z`;
}

export const ShapeView = memo(function ShapeView({ el, dark }: { el: ShapeEl; dark: boolean }) {
  const c = displayColor(el.color, dark);
  const p = el.pts;
  const common = {
    stroke: c,
    strokeWidth: el.size,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeDasharray: el.dash ? `${el.size * 3.5} ${el.size * 2.5}` : undefined,
    fill: el.fill ? c : "none",
    fillOpacity: el.fill ? 0.14 : undefined,
  };
  switch (el.shape) {
    case "line":
      return <line x1={p[0]} y1={p[1]} x2={p[2]} y2={p[3]} {...common} />;
    case "arrow":
    case "darrow": {
      const h = Math.max(9, el.size * 4);
      const a = Math.atan2(p[3] - p[1], p[2] - p[0]);
      const ex = p[2] - Math.cos(a) * h * 0.8;
      const ey = p[3] - Math.sin(a) * h * 0.8;
      const sx = el.shape === "darrow" ? p[0] + Math.cos(a) * h * 0.8 : p[0];
      const sy = el.shape === "darrow" ? p[1] + Math.sin(a) * h * 0.8 : p[1];
      return (
        <g>
          <line x1={sx} y1={sy} x2={ex} y2={ey} {...common} />
          <path d={arrowHead(p[0], p[1], p[2], p[3], el.size)} fill={c} />
          {el.shape === "darrow" && <path d={arrowHead(p[2], p[3], p[0], p[1], el.size)} fill={c} />}
        </g>
      );
    }
    case "dim": {
      const a = Math.atan2(p[3] - p[1], p[2] - p[0]);
      const nx = -Math.sin(a) * 9;
      const ny = Math.cos(a) * 9;
      const mx = (p[0] + p[2]) / 2;
      const my = (p[1] + p[3]) / 2;
      let deg = (a * 180) / Math.PI;
      if (deg > 90) deg -= 180;
      if (deg < -90) deg += 180;
      return (
        <g>
          <line x1={p[0] + nx} y1={p[1] + ny} x2={p[0] - nx} y2={p[1] - ny} stroke={c} strokeWidth={1} />
          <line x1={p[2] + nx} y1={p[3] + ny} x2={p[2] - nx} y2={p[3] - ny} stroke={c} strokeWidth={1} />
          <line x1={p[0]} y1={p[1]} x2={p[2]} y2={p[3]} stroke={c} strokeWidth={Math.min(el.size, 1.6)} />
          <path d={arrowHead(p[2], p[3], p[0], p[1], 1.6)} fill={c} />
          <path d={arrowHead(p[0], p[1], p[2], p[3], 1.6)} fill={c} />
          {el.label && (
            <text
              x={mx}
              y={my}
              transform={`rotate(${deg} ${mx} ${my}) translate(0 -7)`}
              textAnchor="middle"
              fontSize={15}
              fontStyle="italic"
              fontWeight={600}
              fill={c}
              paintOrder="stroke"
              stroke="var(--card)"
              strokeWidth={3}
              style={{ fontFamily: "'Cambria Math', 'Times New Roman', serif" }}
            >
              {el.label}
            </text>
          )}
        </g>
      );
    }
    case "rect":
      return <rect x={Math.min(p[0], p[2])} y={Math.min(p[1], p[3])} width={Math.abs(p[2] - p[0])} height={Math.abs(p[3] - p[1])} {...common} />;
    case "ellipse":
      return <ellipse cx={(p[0] + p[2]) / 2} cy={(p[1] + p[3]) / 2} rx={Math.abs(p[2] - p[0]) / 2} ry={Math.abs(p[3] - p[1]) / 2} {...common} />;
    case "triangle":
    case "polygon":
      return <polygon points={pairs(p)} {...common} />;
    case "polyline":
      return <polyline points={pairs(p)} {...common} fill="none" />;
  }
});

function pairs(p: number[]): string {
  const out: string[] = [];
  for (let i = 0; i + 1 < p.length; i += 2) out.push(`${p[i]},${p[i + 1]}`);
  return out.join(" ");
}

const ImageView = memo(function ImageView({ el }: { el: ImageEl }) {
  return <image href={el.src} x={el.x} y={el.y} width={el.w} height={el.h} preserveAspectRatio="none" />;
});

/* ------------------------------------------------------------------ */
/*                           Éléments HTML                              */
/* ------------------------------------------------------------------ */
/** Retours à la ligne simples conservés (Markdown les fusionnerait). */
export function hardBreaks(text: string): string {
  const lines = text.split("\n");
  return lines
    .map((l, i) => {
      const next = lines[i + 1];
      if (next === undefined || !l.trim() || !next.trim()) return l;
      if (l.trim().startsWith("$$") || next.trim().startsWith("$$") || l.trim().endsWith("$$")) return l;
      return l + "  ";
    })
    .join("\n");
}

const FONT: Record<string, string> = {
  sans: "var(--font-sans)",
  serif: "'Iowan Old Style', 'Palatino Linotype', Georgia, serif",
  mono: "var(--font-mono)",
};

const TextView = memo(function TextView({ el, dark }: { el: TextEl; dark: boolean }) {
  const ref = useMeasure(el.id);
  const style: CSSProperties = {
    left: el.x,
    top: el.y,
    width: el.w,
    fontSize: el.size,
    color: displayColor(el.color, dark),
    fontFamily: FONT[el.font ?? "sans"],
  };
  return (
    <div ref={ref} className={`nb-text absolute ${el.boxed ? "nb-boxed" : ""}`} style={style}>
      {el.text.trim() ? <Md>{hardBreaks(el.text)}</Md> : <span className="opacity-40">Texte</span>}
    </div>
  );
});

export function renderTexLines(tex: string): string {
  return tex
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => katex.renderToString(l, { displayMode: true, throwOnError: false, strict: "ignore", macros: { "\\ok": "\\;\\checkmark" } }))
    .join("");
}

const MathView = memo(function MathView({ el, dark }: { el: MathEl; dark: boolean }) {
  const ref = useMeasure(el.id);
  const html = renderTexLines(el.tex);
  return (
    <div
      ref={ref}
      className={`nb-math absolute ${el.boxed ? "nb-boxed" : ""}`}
      style={{ left: el.x, top: el.y, fontSize: el.size, color: displayColor(el.color, dark) }}
      dangerouslySetInnerHTML={{ __html: html || "<span style='opacity:.4'>Formule</span>" }}
    />
  );
});

function BlockFrame({ id, x, y, w, children }: { id: string; x: number; y: number; w: number; children: React.ReactNode }) {
  const ref = useMeasure(id);
  return (
    <div ref={ref} className="nb-block absolute" style={{ left: x, top: y, width: w }}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                                Page                                  */
/* ------------------------------------------------------------------ */
export interface TextEditing {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onDone: () => void;
}

function TextEditor({ el, editing, dark }: { el: TextEl; editing: TextEditing; dark: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const t = ref.current;
    if (!t) return;
    t.focus({ preventScroll: true });
    t.setSelectionRange(t.value.length, t.value.length);
  }, []);
  useLayoutEffect(() => {
    const t = ref.current;
    if (!t) return;
    t.style.height = "0px";
    t.style.height = t.scrollHeight + 2 + "px";
  }, [editing.value]);
  return (
    <textarea
      ref={ref}
      value={editing.value}
      onChange={(e) => editing.onChange(e.target.value)}
      onBlur={editing.onDone}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") editing.onDone();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      placeholder="Texte… ($…$ pour une formule)"
      className="nb-textarea absolute resize-none rounded-[3px] bg-transparent outline-none"
      style={{
        left: el.x - 4,
        top: el.y - 3,
        width: el.w + 8,
        fontSize: el.size,
        lineHeight: 1.45,
        color: displayColor(el.color, dark),
        fontFamily: FONT[el.font ?? "sans"],
        pointerEvents: "auto",
      }}
    />
  );
}

/**
 * `scale` : facteur d'affichage. Les calques SVG sont dessinés à la taille
 * affichée (vectoriel net à tout zoom) ; le calque HTML est mis à l'échelle.
 */
export const PageView = memo(function PageView({ page, editing, hidden, scale = 1 }: { page: Page; editing?: TextEditing | null; hidden?: ReadonlySet<string>; scale?: number }) {
  const { w, h } = pageSize(page.orientation);
  const W = w * scale;
  const H = h * scale;
  const dark = PAPER_COLORS[page.color].theme.dark;
  const vars = paperCssVars(page.color) as CSSProperties;
  const back: NoteElement[] = [];
  const html: NoteElement[] = [];
  const ink: StrokeEl[] = [];
  const hl: StrokeEl[] = [];
  for (const e of page.elements) {
    if (hidden?.has(e.id)) continue;
    if (e.type === "stroke") (e.tool === "highlighter" ? hl : ink).push(e);
    else if (e.type === "text" || e.type === "math" || e.type === "beam" || e.type === "cut") html.push(e);
    else back.push(e);
  }
  return (
    <div className="nb-page relative overflow-hidden" style={{ width: W, height: H, ...vars, background: PAPER_COLORS[page.color].theme.bg }} data-page={page.id}>
      <svg className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${w} ${h}`}>
        <PaperBackground kind={page.paper} color={page.color} w={w} h={h} patternId={`pt-${page.id}`} background={page.background} />
        {back.map((e) => (e.type === "image" ? <ImageView key={e.id} el={e} /> : null))}
        <g>
          {hl.map((e) => (
            <StrokeView key={e.id} el={e} dark={dark} />
          ))}
        </g>
        {back.map((e) => (e.type === "shape" ? <ShapeView key={e.id} el={e} dark={dark} /> : e.type === "symbol" ? <SymbolArt key={e.id} el={e} dark={dark} /> : null))}
      </svg>
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: w, height: h, transform: scale === 1 ? undefined : `scale(${scale})`, pointerEvents: "none" }}>
        {html.map((e) => {
          if (e.type === "text") return editing?.id === e.id ? <TextEditor key={e.id} el={e} editing={editing} dark={dark} /> : <TextView key={e.id} el={e} dark={dark} />;
          if (e.type === "math") return <MathView key={e.id} el={e} dark={dark} />;
          if (e.type === "beam")
            return (
              <BlockFrame key={e.id} id={e.id} x={e.x} y={e.y} w={e.w}>
                <BeamBlock el={e} />
              </BlockFrame>
            );
          if (e.type === "cut")
            return (
              <BlockFrame key={e.id} id={e.id} x={e.x} y={e.y} w={e.w}>
                <CutBlock el={e} />
              </BlockFrame>
            );
          return null;
        })}
      </div>
      <svg className="pointer-events-none absolute inset-0" width={W} height={H} viewBox={`0 0 ${w} ${h}`}>
        {ink.map((e) => (
          <StrokeView key={e.id} el={e} dark={dark} />
        ))}
      </svg>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*                    Vignette (barre des pages)                        */
/* ------------------------------------------------------------------ */
export const PageThumb = memo(function PageThumb({ page }: { page: Page }) {
  const { w, h } = pageSize(page.orientation);
  const dark = PAPER_COLORS[page.color].theme.dark;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block h-auto w-full" style={paperCssVars(page.color) as CSSProperties} aria-hidden>
      <PaperBackground kind={page.paper} color={page.color} w={w} h={h} patternId={`th-${page.id}`} background={page.background} />
      {page.elements.map((e) => {
        switch (e.type) {
          case "stroke":
            return <StrokeView key={e.id} el={e} dark={dark} />;
          case "shape":
            return <ShapeView key={e.id} el={e} dark={dark} />;
          case "symbol":
            return <SymbolArt key={e.id} el={e} dark={dark} />;
          case "image":
            return <ImageView key={e.id} el={e} />;
          default: {
            const m = measured.get(e.id);
            const ww = e.type === "math" ? (m?.w ?? 200) : e.w;
            return <rect key={e.id} x={e.x} y={e.y} width={ww} height={m?.h ?? 60} rx={6} fill={dark ? "#8b97b8" : "#9aa6c6"} opacity={0.28} />;
          }
        }
      })}
    </svg>
  );
});
