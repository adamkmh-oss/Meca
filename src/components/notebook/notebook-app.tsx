"use client";
/**
 * Application « Cahier de mécanique » : bibliothèque de cahiers et éditeur.
 * Le dernier cahier ouvert est rouvert directement au lancement.
 */
import { useCallback, useEffect, useState } from "react";
import { demoNotebook } from "@/lib/notebook/demo";
import { getStore, readPref, writePref, type NotebookStore } from "@/lib/notebook/storage";
import { connectCloud, HybridStore, inClaudeViewer, type SyncStatus } from "@/lib/notebook/cloud";
import type { Notebook, NotebookMeta } from "@/lib/notebook/types";
import { Editor } from "./editor";
import { Library } from "./library";

/** `homeHref` : lien de retour vers le site (absent dans la version autonome). */
export function NotebookApp({ homeHref }: { homeHref?: string }) {
  const [store, setStore] = useState<NotebookStore | null>(null);
  const [metas, setMetas] = useState<NotebookMeta[]>([]);
  const [open, setOpen] = useState<Notebook | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (s?: NotebookStore) => {
    const st = s ?? store;
    if (!st) return;
    setMetas(await st.list());
  }, [store]);

  const openNotebook = useCallback(
    async (id: string, s?: NotebookStore) => {
      const st = s ?? store;
      if (!st) return;
      const nb = await st.load(id);
      if (!nb) {
        writePref("last", null);
        return;
      }
      writePref("last", id);
      setOpen(nb);
    },
    [store],
  );

  const [sync, setSync] = useState<SyncStatus | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const local = await getStore();
        if (!alive) return;
        // Sur claude.ai : copie locale + espace privé du compte (suit d'un appareil à l'autre).
        const hybrid = inClaudeViewer() ? new HybridStore(local) : null;
        const s: NotebookStore = hybrid ?? local;
        if (hybrid) {
          setSync(hybrid.status);
          hybrid.onStatus(setSync);
          const cloud = await connectCloud();
          hybrid.attach(cloud);
          // ne bloque pas l'ouverture plus de 12 s (la synchronisation continue ensuite)
          if (cloud) await Promise.race([hybrid.syncAll(), new Promise((r) => setTimeout(r, 12000))]);
        }
        if (!alive) return;
        let list = await s.list();
        if (list.length === 0 && !readPref("seeded", false)) {
          await s.save(demoNotebook());
          writePref("seeded", true);
          list = await s.list();
        }
        setStore(s);
        setMetas(list);
        const last = readPref<string | null>("last", null);
        if (last && list.some((m) => m.id === last)) {
          const nb = await s.load(last);
          if (alive && nb) setOpen(nb);
        }
      } catch {
        setError("Impossible d'ouvrir le stockage des cahiers dans ce navigateur.");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Fermeture ou mise en arrière-plan : envoie ce qui reste à synchroniser.
  useEffect(() => {
    if (!(store instanceof HybridStore)) return;
    const onHide = () => {
      if (document.visibilityState === "hidden") void store.flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [store]);

  if (error) return <div className="p-8 text-center text-danger">{error}</div>;
  if (!store)
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-background text-sm text-muted-foreground">
        {sync === "syncing" ? "Synchronisation des cahiers…" : "Ouverture des cahiers…"}
      </div>
    );
  if (open)
    return (
      <Editor
        key={open.id}
        initial={open}
        store={store}
        sync={sync}
        onClose={async () => {
          writePref("last", null);
          setOpen(null);
          await refresh();
        }}
      />
    );
  return <Library store={store} metas={metas} onOpen={(id) => void openNotebook(id)} onRefresh={() => refresh()} homeHref={homeHref} sync={sync} />;
}
