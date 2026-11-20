/**
 * Encre : contour des traits (perfect-freehand, sensible à la pression du
 * stylet) et tracé lissé du surligneur.
 */
import { getStroke } from "perfect-freehand";
import type { StrokeEl } from "./types";

const cache = new WeakMap<StrokeEl, string>();

/** Contour fermé → chemin SVG (courbes quadratiques par les milieux). */
export function outlineToPath(pts: number[][]): string {
  const n = pts.length;
  if (n < 2) return "";
  const r = (v: number) => Math.round(v * 100) / 100;
  let d = `M${r(pts[0][0])},${r(pts[0][1])} Q`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % n];
    d += `${r(x0)},${r(y0)} ${r((x0 + x1) / 2)},${r((y0 + y1) / 2)} `;
  }
  return d + "Z";
}

/** Pression du stylet → pression « confortable » (l'Apple Pencil écrit souvent vers 0,2–0,4). */
export function normalizePressure(p: number): number {
  if (!Number.isFinite(p) || p <= 0) return 0.5;
  return Math.min(1, 0.18 + p * 0.95);
}

export function penPath(el: Pick<StrokeEl, "pts" | "size" | "pressure">, last = true): string {
  const input: number[][] = [];
  for (let i = 0; i + 1 < el.pts.length; i += 3) input.push([el.pts[i], el.pts[i + 1], el.pts[i + 2] ?? 0.5]);
  if (input.length === 0) return "";
  const outline = getStroke(input, {
    size: el.size,
    thinning: el.pressure ? 0.6 : 0.32,
    smoothing: 0.55,
    streamline: 0.38,
    simulatePressure: !el.pressure,
    last,
    start: { cap: true, taper: 0 },
    end: { cap: true, taper: 0 },
  });
  return outlineToPath(outline);
}

/** Tracé central lissé (surligneur, gomme de prévisualisation). */
export function centerPath(pts: number[], stride = 3): string {
  const n = Math.floor(pts.length / stride);
  if (n === 0) return "";
  const r = (v: number) => Math.round(v * 100) / 100;
  const X = (i: number) => pts[i * stride];
  const Y = (i: number) => pts[i * stride + 1];
  if (n === 1) return `M${r(X(0))},${r(Y(0))} l0.01,0`;
  let d = `M${r(X(0))},${r(Y(0))}`;
  if (n === 2) return d + ` L${r(X(1))},${r(Y(1))}`;
  for (let i = 1; i < n - 1; i++) {
    d += ` Q${r(X(i))},${r(Y(i))} ${r((X(i) + X(i + 1)) / 2)},${r((Y(i) + Y(i + 1)) / 2)}`;
  }
  d += ` L${r(X(n - 1))},${r(Y(n - 1))}`;
  return d;
}

/** Chemin SVG mis en cache pour un trait terminé. */
export function strokePath(el: StrokeEl): string {
  let d = cache.get(el);
  if (d === undefined) {
    d = el.tool === "highlighter" ? centerPath(el.pts) : penPath(el, true);
    cache.set(el, d);
  }
  return d;
}

/** Ajoute un point en ignorant les déplacements infimes (bruit du capteur). */
export function pushPoint(pts: number[], x: number, y: number, p: number, minDist = 0.6): boolean {
  const n = pts.length;
  if (n >= 3) {
    const dx = x - pts[n - 3];
    const dy = y - pts[n - 2];
    if (dx * dx + dy * dy < minDist * minDist) return false;
  }
  pts.push(Math.round(x * 100) / 100, Math.round(y * 100) / 100, Math.round(p * 1000) / 1000);
  return true;
}
