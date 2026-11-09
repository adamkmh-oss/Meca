/** Outils d'algèbre linéaire dense (systèmes de petite taille). */

export type Matrix = number[][];

export function zeros(n: number, m = n): Matrix {
  return Array.from({ length: n }, () => new Array<number>(m).fill(0));
}

export class SingularMatrixError extends Error {
  constructor(public readonly index: number) {
    super("Matrice singulière");
  }
}

/**
 * Résout A·x = b par élimination de Gauss avec pivot partiel.
 * Lève SingularMatrixError si un pivot est négligeable devant la plus grande
 * valeur diagonale initiale (structure mécanisme).
 */
export function solve(Ain: Matrix, bin: number[], relTol = 1e-11): number[] {
  const n = bin.length;
  const A = Ain.map((r) => r.slice());
  const b = bin.slice();
  const perm = Array.from({ length: n }, (_, k) => k);
  let scale = 0;
  for (let k = 0; k < n; k++) scale = Math.max(scale, Math.abs(A[k][k]));
  if (scale === 0) scale = 1;
  const tol = scale * relTol;

  for (let k = 0; k < n; k++) {
    let p = k;
    let best = Math.abs(A[k][k]);
    for (let r = k + 1; r < n; r++) {
      const v = Math.abs(A[r][k]);
      if (v > best) {
        best = v;
        p = r;
      }
    }
    if (best <= tol) throw new SingularMatrixError(perm[k]);
    if (p !== k) {
      [A[k], A[p]] = [A[p], A[k]];
      [b[k], b[p]] = [b[p], b[k]];
      [perm[k], perm[p]] = [perm[p], perm[k]];
    }
    const pivot = A[k][k];
    for (let r = k + 1; r < n; r++) {
      const f = A[r][k] / pivot;
      if (f === 0) continue;
      const Ar = A[r];
      const Ak = A[k];
      for (let c = k; c < n; c++) Ar[c] -= f * Ak[c];
      b[r] -= f * b[k];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let k = n - 1; k >= 0; k--) {
    let s = b[k];
    for (let c = k + 1; c < n; c++) s -= A[k][c] * x[c];
    x[k] = s / A[k][k];
  }
  return x;
}

export function matVec(A: Matrix, x: number[]): number[] {
  return A.map((row) => row.reduce((s, a, k) => s + a * x[k], 0));
}

/** Points et poids de Gauss–Legendre à 3 points sur [-1, 1] (exact jusqu'au degré 5). */
const GL3_X = [-Math.sqrt(3 / 5), 0, Math.sqrt(3 / 5)];
const GL3_W = [5 / 9, 8 / 9, 5 / 9];

/** Intègre f sur [a, b] par Gauss–Legendre 3 points. */
export function gl3(f: (x: number) => number, a: number, b: number): number {
  if (b <= a) return 0;
  const h = (b - a) / 2;
  const m = (a + b) / 2;
  let s = 0;
  for (let k = 0; k < 3; k++) s += GL3_W[k] * f(m + h * GL3_X[k]);
  return s * h;
}

/**
 * Intègre f sur [a, b] en découpant aux points de discontinuité fournis.
 * Exact pour une fonction polynomiale par morceaux de degré ≤ 5.
 */
export function integratePiecewise(
  f: (x: number) => number,
  a: number,
  b: number,
  breakpoints: number[],
): number {
  if (b <= a) return 0;
  const pts = [a, ...breakpoints.filter((p) => p > a && p < b), b].sort((u, v) => u - v);
  let s = 0;
  for (let k = 0; k < pts.length - 1; k++) s += gl3(f, pts[k], pts[k + 1]);
  return s;
}
