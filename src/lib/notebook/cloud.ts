/**
 * Synchronisation des cahiers avec le stockage de la page publiée sur
 * claude.ai (capacité `db`), dans l'espace privé de chaque personne
 * `data/users/<id>/` : personne d'autre ne le lit, propriétaire compris.
 *
 * Le navigateur (IndexedDB) reste la copie de travail : on y lit et on y
 * écrit d'abord ; le stockage distant sert de sauvegarde et fait suivre les
 * cahiers d'un appareil à l'autre (le plus récent l'emporte, par cahier).
 *
 * Organisation :
 *   data/users/<id>/m-<cahier>                     manifeste (titre, dates, pages et empreintes)
 *   data/users/<id>/m-<cahier>/chunks/<morceau>    contenu des pages, découpé (< 256 Kio par document)
 * Les morceaux sont nommés d'après l'empreinte du contenu : un manifeste ne
 * désigne jamais un morceau à moitié écrit, et seules les pages modifiées
 * sont renvoyées.
 */
import { notebookSchema } from "./model";
import type { NotebookStore } from "./storage";
import type { Notebook, NotebookMeta, Page } from "./types";

/* ---------------------- interface minimale du stockage ---------------------- */
export interface MiniSnap {
  id: string;
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}
export interface MiniDoc {
  get(): Promise<MiniSnap>;
  set(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
}
export interface MiniCollection {
  get(): Promise<{ docs: MiniSnap[] }>;
}
export interface MiniDb {
  doc(path: string): MiniDoc;
  collection(path: string): MiniCollection;
}

interface PageRef {
  id: string;
  hash: string;
  n: number;
}

export interface Manifest {
  kind: "m";
  id: string;
  title: string;
  cover: string;
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
  pages: PageRef[];
}

/** Empreinte rapide (cyrb53) d'une chaîne. */
export function hashString(s: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

const enc = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
const bytes = (s: string) => (enc ? enc.encode(s).length : s.length * 3);

/** Découpe une chaîne en morceaux dont l'enregistrement reste sous ~240 Kio. */
export function splitChunks(s: string, maxBytes = 240_000): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    let len = Math.min(s.length - i, 200_000);
    while (len > 1000 && bytes(JSON.stringify({ kind: "c", data: s.slice(i, i + len) })) > maxBytes) len = Math.floor(len / 2);
    out.push(s.slice(i, i + len));
    i += len;
  }
  if (out.length === 0) out.push("");
  return out;
}

function errCode(e: unknown): string {
  return (e as { code?: string })?.code ?? "unavailable";
}

export class CloudSync {
  private base: string;
  constructor(
    private db: MiniDb,
    uid: string,
  ) {
    this.base = `data/users/${uid}`;
  }

  private manifestPath(id: string) {
    return `${this.base}/m-${id}`;
  }
  private chunkPath(nbId: string, pageId: string, hash: string, k: number) {
    return `${this.base}/m-${nbId}/chunks/${pageId}-${hash}-${k}`;
  }

  async listManifests(): Promise<Manifest[]> {
    const snap = await this.db.collection(this.base).get();
    const out: Manifest[] = [];
    for (const d of snap.docs) {
      const m = d.data() as Manifest | undefined;
      if (d.exists && m && m.kind === "m" && typeof m.id === "string" && typeof m.updatedAt === "number") out.push(m);
    }
    return out;
  }

  async getManifest(id: string): Promise<Manifest | null> {
    const s = await this.db.doc(this.manifestPath(id)).get();
    const m = s.data() as Manifest | undefined;
    return s.exists && m && m.kind === "m" ? m : null;
  }

  /** Envoie un cahier (seules les pages modifiées sont réécrites). */
  async push(nb: Notebook): Promise<void> {
    const old = await this.getManifest(nb.id);
    const oldRefs = new Map((old?.pages ?? []).map((p) => [p.id, p]));
    const refs: PageRef[] = [];
    for (const page of nb.pages) {
      const json = JSON.stringify(page);
      const hash = hashString(json);
      const prev = oldRefs.get(page.id);
      if (prev && prev.hash === hash) {
        refs.push(prev);
        continue;
      }
      const parts = splitChunks(json);
      for (let k = 0; k < parts.length; k++) await this.db.doc(this.chunkPath(nb.id, page.id, hash, k)).set({ kind: "c", data: parts[k] });
      refs.push({ id: page.id, hash, n: parts.length });
    }
    const manifest: Manifest = { kind: "m", id: nb.id, title: nb.title, cover: nb.cover, createdAt: nb.createdAt, updatedAt: nb.updatedAt, pages: refs };
    await this.db.doc(this.manifestPath(nb.id)).set({ ...manifest });
    // morceaux devenus inutiles
    const keep = new Set(refs.map((r) => `${r.id}-${r.hash}`));
    for (const r of old?.pages ?? []) {
      if (keep.has(`${r.id}-${r.hash}`)) continue;
      for (let k = 0; k < r.n; k++) await this.db.doc(this.chunkPath(nb.id, r.id, r.hash, k)).delete().catch(() => {});
    }
  }

  /** Récupère un cahier complet ; null s'il est absent, supprimé ou illisible. */
  async pull(id: string, manifest?: Manifest | null): Promise<Notebook | null> {
    const m = manifest ?? (await this.getManifest(id));
    if (!m || m.deleted) return null;
    const pages: Page[] = [];
    for (const r of m.pages) {
      let json = "";
      for (let k = 0; k < r.n; k++) {
        const s = await this.db.doc(this.chunkPath(id, r.id, r.hash, k)).get();
        const d = s.data() as { data?: string } | undefined;
        if (!s.exists || typeof d?.data !== "string") return null;
        json += d.data;
      }
      try {
        pages.push(JSON.parse(json) as Page);
      } catch {
        return null;
      }
    }
    const candidate = { version: 1, id: m.id, title: m.title, cover: m.cover, createdAt: m.createdAt, updatedAt: m.updatedAt, pages };
    const ok = notebookSchema.safeParse(candidate);
    return ok.success ? (ok.data as Notebook) : null;
  }

  /** Marque le cahier supprimé (pour les autres appareils) et efface son contenu. */
  async remove(id: string, at = Date.now()): Promise<void> {
    const old = await this.getManifest(id);
    await this.db.doc(this.manifestPath(id)).set({ kind: "m", id, title: old?.title ?? "", cover: old?.cover ?? "#000000", createdAt: old?.createdAt ?? at, updatedAt: at, deleted: true, pages: [] });
    for (const r of old?.pages ?? []) for (let k = 0; k < r.n; k++) await this.db.doc(this.chunkPath(id, r.id, r.hash, k)).delete().catch(() => {});
  }
}

/* ------------------------------------------------------------------ */
/*              Stockage hybride : appareil + compte claude.ai          */
/* ------------------------------------------------------------------ */
export type SyncStatus = "connecting" | "local" | "syncing" | "ok" | "offline" | "readonly" | "quota";

export class HybridStore implements NotebookStore {
  persistent = true;
  status: SyncStatus;
  private listeners = new Set<(s: SyncStatus) => void>();
  private remote = new Map<string, Manifest>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private queue: Promise<void> = Promise.resolve();
  private disabled = false;

  /** `cloud` peut être branché plus tard (attach) : en attendant, tout reste sur l'appareil. */
  constructor(
    private local: NotebookStore,
    private cloud: CloudSync | null = null,
    private pushDelay = 2500,
  ) {
    this.status = cloud ? "syncing" : "connecting";
  }

  attach(cloud: CloudSync | null) {
    this.cloud = cloud;
    if (!cloud) this.setStatus("local");
  }

  onStatus(fn: (s: SyncStatus) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  private setStatus(s: SyncStatus) {
    this.status = s;
    for (const l of this.listeners) l(s);
  }

  /** Exécute les échanges avec le stockage distant un par un. */
  private run<T>(task: () => Promise<T>): Promise<T | undefined> {
    const p = this.queue.then(async () => {
      if (this.disabled || !this.cloud) return undefined;
      try {
        const r = await task();
        if (this.status !== "ok") this.setStatus("ok");
        return r;
      } catch (e) {
        const code = errCode(e);
        if (code === "quota_exceeded") this.setStatus("quota");
        else if (code === "invalid_argument" || code === "not_granted" || code === "revoked" || code === "capability_disabled" || code === "capability_removed") {
          this.disabled = true;
          this.setStatus("readonly");
        } else this.setStatus("offline");
        return undefined;
      }
    });
    this.queue = p.then(
      () => undefined,
      () => undefined,
    );
    return p;
  }

  list() {
    return this.local.list();
  }

  async load(id: string) {
    const nb = await this.local.load(id);
    const m = this.remote.get(id);
    if (m && !m.deleted && (!nb || m.updatedAt > nb.updatedAt)) {
      const fresh = await this.run(() => this.cloud!.pull(id, m));
      if (fresh) {
        await this.local.save(fresh);
        return fresh;
      }
    }
    return nb;
  }

  async save(nb: Notebook) {
    await this.local.save(nb);
    this.schedulePush(nb.id);
  }

  async remove(id: string) {
    // la suppression doit être plus récente que toute version connue (horloges décalées)
    const known = Math.max((await this.local.load(id))?.updatedAt ?? 0, this.remote.get(id)?.updatedAt ?? 0);
    await this.local.remove(id);
    const t = this.timers.get(id);
    if (t) clearTimeout(t);
    this.timers.delete(id);
    const at = Math.max(Date.now(), known + 1);
    this.remote.set(id, { kind: "m", id, title: "", cover: "", createdAt: at, updatedAt: at, deleted: true, pages: [] });
    await this.run(() => this.cloud!.remove(id, at));
  }

  private schedulePush(id: string) {
    const t = this.timers.get(id);
    if (t) clearTimeout(t);
    this.timers.set(
      id,
      setTimeout(() => {
        this.timers.delete(id);
        void this.pushNow(id);
      }, this.pushDelay),
    );
  }

  async pushNow(id: string) {
    await this.run(async () => {
      const nb = await this.local.load(id);
      if (!nb) return;
      this.setStatus("syncing");
      await this.cloud!.push(nb);
      const m = this.remote.get(id);
      this.remote.set(id, { kind: "m", id, title: nb.title, cover: nb.cover, createdAt: nb.createdAt, updatedAt: nb.updatedAt, pages: m?.pages ?? [] });
    });
  }

  /** Envoie tout ce qui reste en attente (fermeture de la page). */
  async flush() {
    const ids = [...this.timers.keys()];
    for (const id of ids) {
      clearTimeout(this.timers.get(id)!);
      this.timers.delete(id);
    }
    for (const id of ids) await this.pushNow(id);
    await this.queue;
  }

  /** Rapproche l'appareil et le compte : le plus récent l'emporte, cahier par cahier. */
  async syncAll(): Promise<boolean> {
    if (!this.cloud || this.disabled) return false;
    this.setStatus("syncing");
    const manifests = await this.run(() => this.cloud!.listManifests());
    if (!manifests) return false;
    this.remote = new Map(manifests.map((m) => [m.id, m]));
    const locals = new Map<string, NotebookMeta>((await this.local.list()).map((m) => [m.id, m]));
    for (const m of manifests) {
      const l = locals.get(m.id);
      if (m.deleted) {
        if (l && l.updatedAt <= m.updatedAt) await this.local.remove(m.id);
        continue;
      }
      if (!l || l.updatedAt < m.updatedAt) {
        const nb = await this.run(() => this.cloud!.pull(m.id, m));
        if (nb) await this.local.save(nb);
      }
    }
    for (const l of locals.values()) {
      const m = this.remote.get(l.id);
      if (!m || m.updatedAt < l.updatedAt) await this.pushNow(l.id);
    }
    if (this.status === "syncing") this.setStatus("ok");
    return true;
  }
}

/* ------------------------------------------------------------------ */
/*                  Connexion depuis la page publiée                    */
/* ------------------------------------------------------------------ */
type ClaudeWindow = Window & { claude?: { use?: (name: string) => Promise<unknown> } };

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}

/** La page tourne-t-elle dans le lecteur claude.ai (capacités possibles) ? */
export function inClaudeViewer(): boolean {
  return typeof window !== "undefined" && typeof (window as ClaudeWindow).claude?.use === "function";
}

/** Espace privé de la personne sur claude.ai (capacités `db` et `user`), sinon null. */
export async function connectCloud(): Promise<CloudSync | null> {
  if (!inClaudeViewer()) return null;
  const c = (window as ClaudeWindow).claude!;
  try {
    const res = await withTimeout(Promise.all([c.use!("db"), c.use!("user")]), 9000);
    if (!res) return null;
    const [db, user] = res as [MiniDb | null, { id?: () => Promise<string | null> } | null];
    if (!db || !user?.id) return null;
    const id = await withTimeout(user.id(), 5000);
    if (!id) return null;
    return new CloudSync(db, id);
  } catch {
    return null;
  }
}
