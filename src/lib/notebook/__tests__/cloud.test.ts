import { describe, expect, it } from "vitest";
import { CloudSync, HybridStore, hashString, splitChunks, type MiniDb } from "../cloud";
import { demoNotebook } from "../demo";
import { newNotebook } from "../model";
import { MemoryStore } from "../storage";

/** Stockage distant factice : chemins → documents, avec contrôle de la taille. */
function fakeDb() {
  const docs = new Map<string, Record<string, unknown>>();
  const writes: string[] = [];
  const db: MiniDb = {
    doc(path) {
      expect(path.split("/").length % 2).toBe(0);
      return {
        async get() {
          const d = docs.get(path);
          return { id: path.split("/").pop()!, exists: !!d, data: () => (d ? structuredClone(d) : undefined) };
        },
        async set(data) {
          expect(JSON.stringify(data).length).toBeLessThan(256 * 1024);
          writes.push(path);
          docs.set(path, structuredClone(data));
        },
        async delete() {
          docs.delete(path);
        },
      };
    },
    collection(path) {
      expect(path.split("/").length % 2).toBe(1);
      return {
        async get() {
          const n = path.split("/").length + 1;
          const out = [...docs.entries()].filter(([p]) => p.startsWith(path + "/") && p.split("/").length === n);
          return { docs: out.map(([p, d]) => ({ id: p.split("/").pop()!, exists: true, data: () => structuredClone(d) })) };
        },
      };
    },
  };
  return { db, docs, writes };
}

describe("synchronisation des cahiers", () => {
  it("découpe sans dépasser la taille d'un document", () => {
    const big = "é".repeat(500_000);
    const parts = splitChunks(big);
    expect(parts.join("")).toBe(big);
    for (const p of parts) expect(new TextEncoder().encode(JSON.stringify({ kind: "c", data: p })).length).toBeLessThan(250_000);
    expect(hashString("abc")).toBe(hashString("abc"));
    expect(hashString("abc")).not.toBe(hashString("abd"));
  });

  it("un cahier écrit sur un appareil se retrouve sur l'autre, image comprise", async () => {
    const { db } = fakeDb();
    const nb = demoNotebook();
    nb.pages[0].elements.push({ id: "img", type: "image", x: 0, y: 0, w: 10, h: 10, src: "data:image/png;base64," + "A".repeat(600_000) });
    const a = new HybridStore(new MemoryStore(), new CloudSync(db, "u1"), 0);
    await a.save(nb);
    await a.pushNow(nb.id);
    const b = new HybridStore(new MemoryStore(), new CloudSync(db, "u1"), 0);
    await b.syncAll();
    const got = await b.load(nb.id);
    expect(got).not.toBeNull();
    expect(got).toEqual(nb);
  });

  it("ne renvoie que les pages modifiées et efface les anciens morceaux", async () => {
    const { db, docs, writes } = fakeDb();
    const cloud = new CloudSync(db, "u1");
    const nb = demoNotebook();
    await cloud.push(nb);
    const before = docs.size;
    writes.length = 0;
    const edited = { ...nb, updatedAt: nb.updatedAt + 1, pages: nb.pages.map((p, i) => (i === 1 ? { ...p, title: "modifiée" } : p)) };
    await cloud.push(edited);
    // un morceau pour la page modifiée + le manifeste
    expect(writes.filter((w) => w.includes("/chunks/")).length).toBe(1);
    expect(docs.size).toBe(before);
    const back = await cloud.pull(nb.id);
    expect(back?.pages[1].title).toBe("modifiée");
  });

  it("le plus récent l'emporte ; une suppression suit sur les autres appareils", async () => {
    const { db } = fakeDb();
    const a = new HybridStore(new MemoryStore(), new CloudSync(db, "u1"), 0);
    const b = new HybridStore(new MemoryStore(), new CloudSync(db, "u1"), 0);
    const nb = newNotebook("TD 3", "#1f5eff");
    await a.save(nb);
    await a.pushNow(nb.id);
    await b.syncAll();
    // B modifie plus tard : A récupère la version de B
    await b.save({ ...nb, title: "TD 3 (corrigé)", updatedAt: nb.updatedAt + 1000 });
    await b.pushNow(nb.id);
    await a.syncAll();
    expect((await a.load(nb.id))?.title).toBe("TD 3 (corrigé)");
    // A supprime : B le perd à la synchronisation suivante
    await a.remove(nb.id);
    await b.syncAll();
    expect(await b.load(nb.id)).toBeNull();
    expect((await b.list()).length).toBe(0);
  });

  it("chaque personne a son propre espace", async () => {
    const { db } = fakeDb();
    const a = new HybridStore(new MemoryStore(), new CloudSync(db, "alice"), 0);
    const b = new HybridStore(new MemoryStore(), new CloudSync(db, "bob"), 0);
    const nb = newNotebook("Privé", "#000000");
    await a.save(nb);
    await a.pushNow(nb.id);
    await b.syncAll();
    expect((await b.list()).length).toBe(0);
  });

  it("refus d'écriture : on continue sur l'appareil seul", async () => {
    const { db } = fakeDb();
    const refusing: MiniDb = {
      collection: db.collection,
      doc(path) {
        const d = db.doc(path);
        return { ...d, set: async () => Promise.reject({ code: "invalid_argument", message: "lecture seule" }) };
      },
    };
    const store = new HybridStore(new MemoryStore(), new CloudSync(refusing, "u1"), 0);
    const nb = newNotebook("Local", "#000000");
    await store.save(nb);
    await store.pushNow(nb.id);
    expect(store.status).toBe("readonly");
    expect((await store.load(nb.id))?.title).toBe("Local");
  });
});
