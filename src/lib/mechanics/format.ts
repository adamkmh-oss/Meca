/** Mise en forme des nombres à la française (virgule décimale). */

/** Nettoie les « −0 » et les résidus numériques négligeables. */
export function clean(v: number, scale = 1): number {
  if (!Number.isFinite(v)) return v;
  if (Math.abs(v) < 1e-9 * Math.max(1, Math.abs(scale))) return 0;
  return v;
}

/** Arrondi à n chiffres significatifs. */
export function sig(v: number, n = 4): number {
  if (v === 0 || !Number.isFinite(v)) return v;
  const d = Math.ceil(Math.log10(Math.abs(v)));
  const p = n - d;
  const f = 10 ** p;
  return Math.round(v * f) / f;
}

/**
 * Formate un nombre avec un nombre fixe de décimales (virgule française),
 * en supprimant le signe des zéros.
 */
export function fmt(v: number, decimals = 2): string {
  if (!Number.isFinite(v)) return "—";
  let x = Number(v.toFixed(decimals));
  if (Object.is(x, -0) || x === 0) x = 0;
  return x
    .toLocaleString("fr-FR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: true,
    })
    .replace(/\u202f/g, "\u2009");
}

/** Formate avec un nombre de chiffres significatifs adapté (3 à 4). */
export function fmtSig(v: number, n = 4): string {
  if (!Number.isFinite(v)) return "—";
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 1e6 || a < 1e-3) {
    const e = Math.floor(Math.log10(a));
    const m = v / 10 ** e;
    return `${fmt(m, Math.max(n - 1, 0))}·10^${e}`;
  }
  const d = Math.max(0, n - Math.ceil(Math.log10(a + 1e-300)));
  return fmt(sig(v, n), Math.min(d, 6));
}

/** Version LaTeX (virgule décimale protégée par des accolades). */
export function tex(v: number, decimals = 2): string {
  return fmt(v, decimals).replace(/,/g, "{,}").replace(/\u2009/g, "\\,").replace(/−/g, "-");
}

/** LaTeX avec chiffres significatifs, notation scientifique ×10^n si besoin. */
export function texSig(v: number, n = 4): string {
  if (!Number.isFinite(v)) return "\\text{—}";
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 1e6 || a < 1e-3) {
    const e = Math.floor(Math.log10(a));
    const m = v / 10 ** e;
    return `${tex(m, Math.max(n - 1, 0))}\\times 10^{${e}}`;
  }
  const d = Math.max(0, n - Math.ceil(Math.log10(a + 1e-300)));
  return tex(sig(v, n), Math.min(d, 6));
}

/** Terme signé pour une somme LaTeX : « + 12{,}5 » ou « - 12{,}5 ». */
export function texTerm(v: number, decimals = 2, first = false): string {
  const s = tex(Math.abs(v), decimals);
  if (first) return v < 0 ? `-${s}` : s;
  return v < 0 ? ` - ${s}` : ` + ${s}`;
}
