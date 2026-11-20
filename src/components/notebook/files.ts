"use client";
/**
 * Fichiers : enregistrement (téléchargement classique ou capacité
 * « downloads » de la version publiée sur claude.ai), choix d'un fichier,
 * réduction des images, import de PDF (pages → images de fond).
 */

type DownloadsApi = { save: (r: { filename: string; data: string | Blob }) => Promise<unknown> };
type ClaudeWindow = Window & { claude?: { use?: (name: string) => Promise<unknown> } };

let downloadsPromise: Promise<DownloadsApi | null> | null = null;
function downloadsApi(): Promise<DownloadsApi | null> {
  if (!downloadsPromise) {
    const c = (window as ClaudeWindow).claude;
    downloadsPromise = c?.use ? (c.use("downloads") as Promise<DownloadsApi | null>).catch(() => null) : Promise.resolve(null);
  }
  return downloadsPromise;
}

/** Enregistre un fichier. Renvoie false si la personne a refusé. */
export async function saveFile(filename: string, data: string | Blob, mime = "application/octet-stream"): Promise<boolean> {
  const api = await downloadsApi();
  if (api) {
    try {
      await api.save({ filename, data });
      return true;
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === "declined" || code === "rate_limited") return false;
      // capacité indisponible : repli sur le téléchargement classique
    }
  }
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
}

export function pickFiles(accept: string, multiple = false): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
    input.style.display = "none";
    input.onchange = () => {
      resolve(input.files ? [...input.files] : []);
      input.remove();
    };
    document.body.appendChild(input);
    input.click();
  });
}

export function safeName(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9-_ ]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "cahier"
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image illisible"));
    img.src = src;
  });
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/** Image réduite (côté max 1800 px) en data URL, avec ses dimensions. */
export async function imageToDataUrl(file: Blob, maxSide = 1800): Promise<{ src: string; w: number; h: number }> {
  const raw = await readAsDataUrl(file);
  const img = await loadImage(raw);
  const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * k));
  const h = Math.max(1, Math.round(img.naturalHeight * k));
  if (k === 1 && raw.length < 1_500_000) return { src: raw, w, h };
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { src: raw, w, h };
  ctx.drawImage(img, 0, 0, w, h);
  const png = file.type === "image/png" && w * h < 900_000;
  return { src: canvas.toDataURL(png ? "image/png" : "image/jpeg", 0.86), w, h };
}

/** Pages d'un PDF rendues en images (fond de page). */
export async function pdfToImages(file: File, onProgress?: (done: number, total: number) => void): Promise<{ src: string; w: number; h: number }[]> {
  const pdfjs = await import("pdfjs-dist");
  // Moteur PDF dans la page (pas de worker séparé : compatible avec la version page unique).
  const g = globalThis as unknown as { pdfjsWorker?: unknown };
  if (!g.pdfjsWorker) g.pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.mjs");
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data });
  const doc = await task.promise;
  const out: { src: string; w: number; h: number }[] = [];
  const n = Math.min(doc.numPages, 200);
  for (let i = 1; i <= n; i++) {
    const page = await doc.getPage(i);
    const v1 = page.getViewport({ scale: 1 });
    const scale = Math.min(2.2, 1700 / Math.max(v1.width, v1.height));
    const vp = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
    out.push({ src: canvas.toDataURL("image/jpeg", 0.85), w: v1.width, h: v1.height });
    onProgress?.(i, n);
  }
  await task.destroy();
  return out;
}
