/**
 * Adresse interne ↔ fragment de l'URL. Le lecteur d'artefacts ne transmet
 * que des fragments simples (lettres, chiffres, tirets) :
 *   /                               ↔ #accueil
 *   /cours/rdm/fleche               ↔ #cours--rdm--fleche
 *   /exercices/unites?seed=4821     ↔ #exercices--unites--4821
 */
const SEP = "--";
const HOME = "accueil";

export function encodePath(href: string): string {
  const [path, query = ""] = href.split("?");
  const segs = path.split("/").filter(Boolean);
  if (segs.length === 0) return HOME;
  const seed = new URLSearchParams(query).get("seed");
  if (segs[0] === "exercices" && segs.length === 2 && seed && /^\d+$/.test(seed)) segs.push(seed);
  return segs.join(SEP);
}

export function decodeHash(hash: string): string {
  let name: string;
  try {
    name = decodeURIComponent(hash.replace(/^#/, "")).trim();
  } catch {
    return "/";
  }
  if (!name || name === HOME) return "/";
  const segs = name.split(SEP).filter(Boolean);
  if (segs[0] === "exercices" && segs.length === 3 && /^\d+$/.test(segs[2])) return `/exercices/${segs[1]}?seed=${segs[2]}`;
  return "/" + segs.join("/");
}
