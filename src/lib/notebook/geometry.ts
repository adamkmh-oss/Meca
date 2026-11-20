/**
 * Géométrie des éléments : boîtes englobantes, tests de contact (sélection,
 * gomme), déplacement et mise à l'échelle, découpe des traits par la gomme
 * précise.
 */
import { symbolDef } from "./symbols";
import type { NoteElement, Rect, ShapeEl, StrokeEl, SymbolEl } from "./types";

/** Hauteurs mesurées des éléments HTML (texte, formules, poutres), renseignées par le rendu. */
export const measured = new Map<string, { w: number; h: number }>();

export function estimatedHeight(e: NoteElement): number {
  switch (e.type) {
    case "text":
      return Math.max(e.size * 1.6, (e.text.split("\n").length || 1) * e.size * 1.55 + 8);
    case "math":
      return Math.max(1, e.tex.split("\n").filter((l) => l.trim()).length) * e.size * 2.4 + 12;
    case "beam":
      return e.w * 0.8;
    case "cut":
      return e.w * 0.42;
    default:
      return 0;
  }
}

function htmlHeight(e: NoteElement): number {
  return measured.get(e.id)?.h ?? estimatedHeight(e);
}

export function unionRect(a: Rect | null, b: Rect): Rect {
  if (!a) return { ...b };
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

function boundsOf(xs: number[], stride: number, pad: number): Rect {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i + 1 < xs.length; i += stride) {
    const x = xs[i];
    const y = xs[i + 1];
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  if (!Number.isFinite(x0)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad };
}

/** Matrice local → page d'un symbole : rotation (degrés) puis échelle, autour du point d'accroche. */
export function symbolToPage(s: SymbolEl, lx: number, ly: number): [number, number] {
  const a = (s.rot * Math.PI) / 180;
  const c = Math.cos(a);
  const sn = Math.sin(a);
  return [s.x + s.scale * (lx * c - ly * sn), s.y + s.scale * (lx * sn + ly * c)];
}

export function pageToSymbol(s: SymbolEl, px: number, py: number): [number, number] {
  const a = (-s.rot * Math.PI) / 180;
  const c = Math.cos(a);
  const sn = Math.sin(a);
  const dx = (px - s.x) / s.scale;
  const dy = (py - s.y) / s.scale;
  return [dx * c - dy * sn, dx * sn + dy * c];
}

export function symbolBounds(s: SymbolEl): Rect {
  const b = symbolDef(s.kind).box(s);
  const corners = [
    symbolToPage(s, b.x, b.y),
    symbolToPage(s, b.x + b.w, b.y),
    symbolToPage(s, b.x, b.y + b.h),
    symbolToPage(s, b.x + b.w, b.y + b.h),
  ];
  return boundsOf(corners.flat(), 2, 0);
}

export function elementBounds(e: NoteElement): Rect {
  switch (e.type) {
    case "stroke":
      return boundsOf(e.pts, 3, e.size / 2 + 1);
    case "shape": {
      const b = boundsOf(e.pts, 2, e.size / 2 + (e.shape === "arrow" || e.shape === "darrow" || e.shape === "dim" ? 8 : 1));
      if (e.shape === "dim") return unionRect(b, { x: b.x, y: b.y - 18, w: b.w, h: 18 });
      return b;
    }
    case "image":
      return { x: e.x, y: e.y, w: e.w, h: e.h };
    case "symbol":
      return symbolBounds(e);
    case "text":
    case "math":
    case "beam":
    case "cut":
      return { x: e.x, y: e.y, w: e.type === "math" ? (measured.get(e.id)?.w ?? 200) : e.w, h: htmlHeight(e) };
  }
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;
}

export function pointInRect(x: number, y: number, b: Rect, pad = 0): boolean {
  return x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad;
}

/** Distance d'un point à un segment. */
export function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t * dx - px;
  const qy = ay + t * dy - py;
  return Math.sqrt(qx * qx + qy * qy);
}

function distToPolyline(px: number, py: number, pts: number[], stride: number, closed = false): number {
  const n = Math.floor(pts.length / stride);
  if (n === 0) return Infinity;
  if (n === 1) return Math.hypot(px - pts[0], py - pts[1]);
  let best = Infinity;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const j = (i + 1) % n;
    const d = distToSegment(px, py, pts[i * stride], pts[i * stride + 1], pts[j * stride], pts[j * stride + 1]);
    if (d < best) best = d;
  }
  return best;
}

/** Contour d'une forme en polyligne (couples x, y). */
export function shapeOutline(s: ShapeEl): { pts: number[]; closed: boolean } {
  const p = s.pts;
  switch (s.shape) {
    case "rect": {
      const [x0, y0, x1, y1] = p;
      return { pts: [x0, y0, x1, y0, x1, y1, x0, y1], closed: true };
    }
    case "ellipse": {
      const [x0, y0, x1, y1] = p;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const rx = Math.abs(x1 - x0) / 2;
      const ry = Math.abs(y1 - y0) / 2;
      const out: number[] = [];
      for (let k = 0; k < 48; k++) {
        const a = (k / 48) * Math.PI * 2;
        out.push(cx + rx * Math.cos(a), cy + ry * Math.sin(a));
      }
      return { pts: out, closed: true };
    }
    case "triangle":
    case "polygon":
      return { pts: p, closed: true };
    default:
      return { pts: p, closed: false };
  }
}

/** L'élément est-il touché au point (x, y) avec la tolérance donnée ? */
export function hitElement(e: NoteElement, x: number, y: number, tol: number): boolean {
  switch (e.type) {
    case "stroke":
      if (!pointInRect(x, y, elementBounds(e), tol)) return false;
      return distToPolyline(x, y, e.pts, 3) <= e.size / 2 + tol;
    case "shape": {
      const b = elementBounds(e);
      if (!pointInRect(x, y, b, tol)) return false;
      const o = shapeOutline(e);
      if (e.fill && o.closed && pointInPolygon(x, y, o.pts)) return true;
      if (e.shape === "dim" && pointInRect(x, y, b)) return true;
      return distToPolyline(x, y, o.pts, 2, o.closed) <= e.size / 2 + tol;
    }
    case "symbol": {
      const [lx, ly] = pageToSymbol(e, x, y);
      return pointInRect(lx, ly, symbolDef(e.kind).box(e), tol / e.scale);
    }
    default:
      return pointInRect(x, y, elementBounds(e), tol);
  }
}

/** Le trait passe-t-il à moins de r du segment [a, b] (passage de la gomme) ? */
export function strokeTouchesSegment(e: StrokeEl | ShapeEl, ax: number, ay: number, bx: number, by: number, r: number): boolean {
  const b = elementBounds(e);
  const minX = Math.min(ax, bx) - r;
  const maxX = Math.max(ax, bx) + r;
  const minY = Math.min(ay, by) - r;
  const maxY = Math.max(ay, by) + r;
  if (b.x > maxX || b.x + b.w < minX || b.y > maxY || b.y + b.h < minY) return false;
  if (e.type === "stroke") {
    const n = e.pts.length / 3;
    const rr = r + e.size / 2;
    for (let i = 0; i < n; i++) {
      if (distToSegment(e.pts[i * 3], e.pts[i * 3 + 1], ax, ay, bx, by) <= rr) return true;
      if (i < n - 1 && segmentsClose(e.pts[i * 3], e.pts[i * 3 + 1], e.pts[i * 3 + 3], e.pts[i * 3 + 4], ax, ay, bx, by, rr)) return true;
    }
    return false;
  }
  const o = shapeOutline(e);
  const n = o.pts.length / 2;
  const last = o.closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const j = (i + 1) % n;
    if (segmentsClose(o.pts[i * 2], o.pts[i * 2 + 1], o.pts[j * 2], o.pts[j * 2 + 1], ax, ay, bx, by, r + e.size / 2)) return true;
  }
  return false;
}

function segmentsClose(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number, r: number): boolean {
  if (segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy)) return true;
  return (
    distToSegment(ax, ay, cx, cy, dx, dy) <= r ||
    distToSegment(bx, by, cx, cy, dx, dy) <= r ||
    distToSegment(cx, cy, ax, ay, bx, by) <= r ||
    distToSegment(dx, dy, ax, ay, bx, by) <= r
  );
}

function segmentsIntersect(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): boolean {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/**
 * Gomme précise : retire les points du trait situés à moins de r du segment
 * [a, b] et renvoie les morceaux restants (null si le trait est intact).
 */
export function eraseFromStroke(e: StrokeEl, ax: number, ay: number, bx: number, by: number, r: number): number[][] | null {
  const n = e.pts.length / 3;
  const rr = r + e.size / 2;
  // On densifie les segments longs pour une découpe propre.
  const dense: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = e.pts[i * 3];
    const y = e.pts[i * 3 + 1];
    const p = e.pts[i * 3 + 2];
    if (i > 0) {
      const px = e.pts[i * 3 - 3];
      const py = e.pts[i * 3 - 2];
      const pp = e.pts[i * 3 - 1];
      const d = Math.hypot(x - px, y - py);
      const steps = Math.floor(d / Math.max(1.5, r / 2));
      for (let k = 1; k < steps; k++) {
        const t = k / steps;
        dense.push(px + (x - px) * t, py + (y - py) * t, pp + (p - pp) * t);
      }
    }
    dense.push(x, y, p);
  }
  let touched = false;
  const runs: number[][] = [];
  let cur: number[] = [];
  for (let i = 0; i < dense.length; i += 3) {
    const hit = distToSegment(dense[i], dense[i + 1], ax, ay, bx, by) <= rr;
    if (hit) {
      touched = true;
      if (cur.length >= 6) runs.push(cur);
      cur = [];
    } else cur.push(dense[i], dense[i + 1], dense[i + 2]);
  }
  if (!touched) return null;
  if (cur.length >= 6) runs.push(cur);
  return runs;
}

export function pointInPolygon(x: number, y: number, poly: number[]): boolean {
  let inside = false;
  const n = poly.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i * 2];
    const yi = poly[i * 2 + 1];
    const xj = poly[j * 2];
    const yj = poly[j * 2 + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** L'élément est-il entouré par le lasso ? (majorité des points pour un trait, centre et coins pour un objet) */
export function insideLasso(e: NoteElement, poly: number[]): boolean {
  if (e.type === "stroke") {
    const n = e.pts.length / 3;
    const step = Math.max(1, Math.floor(n / 24));
    let inside = 0;
    let total = 0;
    for (let i = 0; i < n; i += step) {
      total++;
      if (pointInPolygon(e.pts[i * 3], e.pts[i * 3 + 1], poly)) inside++;
    }
    return total > 0 && inside / total >= 0.5;
  }
  if (e.type === "shape") {
    const n = e.pts.length / 2;
    let inside = 0;
    for (let i = 0; i < n; i++) if (pointInPolygon(e.pts[i * 2], e.pts[i * 2 + 1], poly)) inside++;
    const b = elementBounds(e);
    if (pointInPolygon(b.x + b.w / 2, b.y + b.h / 2, poly)) inside++;
    return inside / (n + 1) >= 0.5;
  }
  const b = elementBounds(e);
  const pts: [number, number][] = [
    [b.x + b.w / 2, b.y + b.h / 2],
    [b.x, b.y],
    [b.x + b.w, b.y],
    [b.x, b.y + b.h],
    [b.x + b.w, b.y + b.h],
  ];
  const k = pts.filter(([x, y]) => pointInPolygon(x, y, poly)).length;
  return pointInPolygon(pts[0][0], pts[0][1], poly) && k >= 3;
}

/* ------------------------------------------------------------------ */
/*                        Transformations                              */
/* ------------------------------------------------------------------ */
const r2 = (v: number) => Math.round(v * 100) / 100;

export function translateElement<T extends NoteElement>(e: T, dx: number, dy: number): T {
  switch (e.type) {
    case "stroke": {
      const pts = e.pts.slice();
      for (let i = 0; i + 1 < pts.length; i += 3) {
        pts[i] = r2(pts[i] + dx);
        pts[i + 1] = r2(pts[i + 1] + dy);
      }
      return { ...e, pts };
    }
    case "shape": {
      const pts = e.pts.map((v, i) => r2(v + (i % 2 === 0 ? dx : dy)));
      return { ...e, pts };
    }
    default:
      return { ...e, x: r2((e as { x: number }).x + dx), y: r2((e as { y: number }).y + dy) };
  }
}

/** Mise à l'échelle uniforme de facteur k autour de (ox, oy). */
export function scaleElement<T extends NoteElement>(e: T, k: number, ox: number, oy: number): T {
  const X = (x: number) => r2(ox + (x - ox) * k);
  const Y = (y: number) => r2(oy + (y - oy) * k);
  switch (e.type) {
    case "stroke": {
      const pts = e.pts.slice();
      for (let i = 0; i + 1 < pts.length; i += 3) {
        pts[i] = X(pts[i]);
        pts[i + 1] = Y(pts[i + 1]);
      }
      return { ...e, pts, size: r2(Math.max(0.5, e.size * k)) };
    }
    case "shape":
      return { ...e, pts: e.pts.map((v, i) => (i % 2 === 0 ? X(v) : Y(v))), size: r2(Math.max(0.5, e.size * k)) };
    case "image":
      return { ...e, x: X(e.x), y: Y(e.y), w: r2(e.w * k), h: r2(e.h * k) };
    case "symbol":
      return { ...e, x: X(e.x), y: Y(e.y), scale: Math.max(0.1, Math.round(e.scale * k * 1000) / 1000) };
    case "text":
      return { ...e, x: X(e.x), y: Y(e.y), w: r2(e.w * k), size: r2(Math.max(6, e.size * k)) };
    case "math":
      return { ...e, x: X(e.x), y: Y(e.y), size: r2(Math.max(6, e.size * k)) };
    case "beam":
    case "cut":
      return { ...e, x: X(e.x), y: Y(e.y), w: r2(Math.max(120, e.w * k)) };
  }
}

export function changeColor<T extends NoteElement>(e: T, color: string): T {
  switch (e.type) {
    case "stroke":
    case "shape":
    case "symbol":
    case "text":
    case "math":
      return { ...e, color };
    default:
      return e;
  }
}
