/**
 * Stockage local des cahiers (IndexedDB du navigateur), avec repli en
 * mémoire si IndexedDB est indisponible (navigation privée, aperçu).
 * Deux magasins : « meta » (liste rapide de la bibliothèque) et
 * « notebooks » (contenu complet, images comprises).
 */
import { metaOf } from "./model";
import type { Notebook, NotebookMeta } from "./types";

const DB_NAME = "cahier-meca";
const DB_VERSION = 1;

export interface NotebookStore {
  persistent: boolean;
  list(): Promise<NotebookMeta[]>;
  load(id: string): Promise<Notebook | null>;
  save(nb: Notebook): Promise<void>;
  remove(id: string): Promise<void>;
}

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("transaction annulée"));
  });
}

async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "id" });
      if (!db.objectStoreNames.contains("notebooks")) db.createObjectStore("notebooks", { keyPath: "id" });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error("base bloquée"));
  });
}

class IdbStore implements NotebookStore {
  persistent = true;
  constructor(private db: IDBDatabase) {}
  async list() {
    const tx = this.db.transaction("meta", "readonly");
    const all = (await req(tx.objectStore("meta").getAll())) as NotebookMeta[];
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  }
  async load(id: string) {
    const tx = this.db.transaction("notebooks", "readonly");
    return ((await req(tx.objectStore("notebooks").get(id))) as Notebook | undefined) ?? null;
  }
  async save(nb: Notebook) {
    const tx = this.db.transaction(["meta", "notebooks"], "readwrite");
    tx.objectStore("notebooks").put(nb);
    tx.objectStore("meta").put(metaOf(nb));
    await done(tx);
  }
  async remove(id: string) {
    const tx = this.db.transaction(["meta", "notebooks"], "readwrite");
    tx.objectStore("notebooks").delete(id);
    tx.objectStore("meta").delete(id);
    await done(tx);
  }
}

export class MemoryStore implements NotebookStore {
  persistent = false;
  private data = new Map<string, Notebook>();
  async list() {
    return [...this.data.values()].map(metaOf).sort((a, b) => b.updatedAt - a.updatedAt);
  }
  async load(id: string) {
    return this.data.get(id) ?? null;
  }
  async save(nb: Notebook) {
    this.data.set(nb.id, nb);
  }
  async remove(id: string) {
    this.data.delete(id);
  }
}

let storePromise: Promise<NotebookStore> | null = null;

export function getStore(): Promise<NotebookStore> {
  if (!storePromise) {
    storePromise = (async () => {
      try {
        if (typeof indexedDB === "undefined") throw new Error("IndexedDB indisponible");
        const db = await openDb();
        // Demande au navigateur de ne pas effacer les cahiers en cas de manque de place.
        try {
          await navigator.storage?.persist?.();
        } catch {}
        return new IdbStore(db);
      } catch {
        return new MemoryStore();
      }
    })();
  }
  return storePromise;
}

/* ------------------------------------------------------------------ */
/*                      Réglages (localStorage)                        */
/* ------------------------------------------------------------------ */
export function readPref<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem("cahier:" + key);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}

export function writePref(key: string, value: unknown) {
  try {
    localStorage.setItem("cahier:" + key, JSON.stringify(value));
  } catch {}
}
