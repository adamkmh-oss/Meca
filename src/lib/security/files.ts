/**
 * Contrôle des fichiers déposés : extension autorisée, type MIME déclaré
 * cohérent, signature binaire réelle (« magic bytes »), taille maximale.
 * Seuls PDF et images matricielles sont admis (pas de SVG : il peut
 * contenir du script ; pas d'exécutable, d'archive ni de document Office).
 */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export const ALLOWED = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
} as const;
export type AllowedExt = keyof typeof ALLOWED;

export function extensionOf(filename: string): AllowedExt | null {
  const m = /\.([A-Za-z0-9]{1,5})$/.exec(filename.trim());
  if (!m) return null;
  const e = m[1].toLowerCase();
  if (e === "jpeg") return "jpg";
  return e in ALLOWED ? (e as AllowedExt) : null;
}

/** Type réel d'après les premiers octets du fichier. */
export function sniff(bytes: Uint8Array): AllowedExt | null {
  const b = (i: number) => bytes[i];
  if (bytes.length >= 5 && b(0) === 0x25 && b(1) === 0x50 && b(2) === 0x44 && b(3) === 0x46 && b(4) === 0x2d) return "pdf"; // %PDF-
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b(i) === v)) return "png";
  if (bytes.length >= 3 && b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "jpg";
  if (bytes.length >= 12 && b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 && b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50) return "webp";
  return null;
}

/** Recherche d'éléments actifs dans un PDF (JavaScript, lancement de programme, fichiers joints). */
export function pdfHasActiveContent(bytes: Uint8Array): boolean {
  const text = new TextDecoder("latin1").decode(bytes);
  return /\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia|XFA)\b/.test(text);
}

export interface UploadCheck {
  ok: boolean;
  error?: string;
  ext?: AllowedExt;
}

/** Contrôle préalable (avant envoi) : nom, type déclaré, taille. */
export function checkDeclared(filename: string, mime: string, size: number): UploadCheck {
  const ext = extensionOf(filename);
  if (!ext) return { ok: false, error: "Format refusé : PDF, PNG, JPEG ou WebP uniquement." };
  if (mime && mime !== ALLOWED[ext]) return { ok: false, error: "Le type du fichier ne correspond pas à son extension." };
  if (!Number.isFinite(size) || size <= 0) return { ok: false, error: "Fichier vide." };
  if (size > MAX_UPLOAD_BYTES) return { ok: false, error: "Fichier trop volumineux (20 Mo maximum)." };
  return { ok: true, ext };
}

/** Contrôle du contenu réel (après envoi). */
export function checkContent(bytes: Uint8Array, expected: AllowedExt): UploadCheck {
  if (bytes.length === 0) return { ok: false, error: "Fichier vide." };
  if (bytes.length > MAX_UPLOAD_BYTES) return { ok: false, error: "Fichier trop volumineux (20 Mo maximum)." };
  const real = sniff(bytes);
  if (real !== expected) return { ok: false, error: "Le contenu du fichier ne correspond pas à son extension (fichier refusé)." };
  if (real === "pdf" && pdfHasActiveContent(bytes)) return { ok: false, error: "PDF refusé : il contient du code actif (JavaScript, lancement de programme ou pièce jointe)." };
  return { ok: true, ext: real };
}
