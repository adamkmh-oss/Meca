/**
 * Reconnaissance de formes : on garde le stylet immobile en fin de trait et
 * le tracé à main levée devient une droite, un triangle, un rectangle, une
 * ellipse ou une ligne brisée.
 */
import type { ShapeEl, ShapeKind } from "./types";

type P = [number, number];

function toPoints(pts: number[], stride: number): P[] {
  const out: P[] = [];
  for (let i = 0; i + 1 < pts.length; i += stride) out.push([pts[i], pts[i + 1]]);
  return out;
}

function perpDist(p: P, a: P, b: P): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy);
  if (l < 1e-9) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / l;
}

/** Simplification de Ramer–Douglas–Peucker. */
export function rdp(points: P[], eps: number): P[] {
  if (points.length < 3) return points.slice();
  let idx = 0;
  let dmax = 0;
  const a = points[0];
  const b = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i], a, b);
    if (d > dmax) {
      dmax = d;
      idx = i;
    }
  }
  if (dmax <= eps) return [a, b];
  const left = rdp(points.slice(0, idx + 1), eps);
  const right = rdp(points.slice(idx), eps);
  return left.slice(0, -1).concat(right);
}

function pathLength(p: P[]): number {
  let s = 0;
  for (let i = 1; i < p.length; i++) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return s;
}

/** Aligne les angles proches de 0/45/90° (tolérance en degrés). */
function snapAngle(a: P, b: P, tolDeg = 6): P {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  const snapped = Math.round(ang / 45) * 45;
  if (Math.abs(ang - snapped) > tolDeg) return b;
  const r = (snapped * Math.PI) / 180;
  return [a[0] + len * Math.cos(r), a[1] + len * Math.sin(r)];
}

function angleAt(a: P, b: P, c: P): number {
  const v1 = [a[0] - b[0], a[1] - b[1]];
  const v2 = [c[0] - b[0], c[1] - b[1]];
  const d = Math.hypot(v1[0], v1[1]) * Math.hypot(v2[0], v2[1]);
  if (d < 1e-9) return 180;
  return (Math.acos(Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / d))) * 180) / Math.PI;
}

export interface Recognized {
  shape: ShapeKind;
  pts: number[];
}

/**
 * Reconnaît une forme à partir des points d'un trait (stride 3 : x, y, p).
 * Renvoie null si rien de convaincant (le trait reste manuscrit).
 */
export function recognizeShape(raw: number[], stride = 3): Recognized | null {
  const pts = toPoints(raw, stride);
  if (pts.length < 2) return null;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const diag = Math.hypot(maxX - minX, maxY - minY);
  if (diag < 12) return null;
  const len = pathLength(pts);
  const first = pts[0];
  const last = pts[pts.length - 1];
  const gap = Math.hypot(last[0] - first[0], last[1] - first[1]);

  // Droite : écart maximal faible devant la longueur.
  const maxDev = Math.max(...pts.map((p) => perpDist(p, first, last)));
  if (gap > 0.7 * len && maxDev < Math.max(4, 0.06 * gap)) {
    const end = snapAngle(first, last);
    return { shape: "line", pts: [first[0], first[1], end[0], end[1]] };
  }

  const closed = gap < Math.max(18, 0.18 * len);
  const simp = rdp(pts, Math.max(4, 0.045 * diag));

  if (closed) {
    let poly = simp.slice();
    // fermeture : le dernier sommet rejoint le premier
    if (poly.length > 2 && Math.hypot(poly[poly.length - 1][0] - poly[0][0], poly[poly.length - 1][1] - poly[0][1]) < Math.max(18, 0.2 * diag)) {
      poly = poly.slice(0, -1);
    }
    // supprime les sommets presque alignés
    poly = poly.filter((p, i) => {
      const a = poly[(i - 1 + poly.length) % poly.length];
      const c = poly[(i + 1) % poly.length];
      return angleAt(a, p, c) < 160;
    });
    if (poly.length === 3) return { shape: "triangle", pts: poly.flat() };
    if (poly.length === 4) {
      const right = poly.every((p, i) => Math.abs(angleAt(poly[(i + 3) % 4], p, poly[(i + 1) % 4]) - 90) < 22);
      const axis = poly.every((p, i) => {
        const q = poly[(i + 1) % 4];
        const a = Math.abs((Math.atan2(q[1] - p[1], q[0] - p[0]) * 180) / Math.PI) % 90;
        return a < 12 || a > 78;
      });
      if (right && axis) return { shape: "rect", pts: [minX, minY, maxX, maxY] };
      return { shape: "polygon", pts: poly.flat() };
    }
    // Ellipse : distance au centre régulière une fois normalisée.
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rx = (maxX - minX) / 2;
    const ry = (maxY - minY) / 2;
    if (rx > 3 && ry > 3) {
      const devs = pts.map((p) => Math.abs(Math.hypot((p[0] - cx) / rx, (p[1] - cy) / ry) - 1));
      const mean = devs.reduce((s, d) => s + d, 0) / devs.length;
      if (mean < 0.2) {
        // cercle si les deux rayons sont proches
        if (Math.abs(rx - ry) < 0.12 * Math.max(rx, ry)) {
          const rr = (rx + ry) / 2;
          return { shape: "ellipse", pts: [cx - rr, cy - rr, cx + rr, cy + rr] };
        }
        return { shape: "ellipse", pts: [minX, minY, maxX, maxY] };
      }
    }
    if (poly.length >= 5 && poly.length <= 8) return { shape: "polygon", pts: poly.flat() };
    return null;
  }

  // Ligne brisée ouverte (axes, cotes, allure de diagramme).
  if (simp.length >= 3 && simp.length <= 5) {
    const out: P[] = [simp[0]];
    for (let i = 1; i < simp.length; i++) out.push(snapAngle(out[i - 1], simp[i]));
    return { shape: "polyline", pts: out.flat() };
  }
  return null;
}

export function shapeFromRecognized(id: string, rec: Recognized, color: string, size: number): ShapeEl {
  return { id, type: "shape", shape: rec.shape, pts: rec.pts.map((v) => Math.round(v * 100) / 100), color, size };
}
