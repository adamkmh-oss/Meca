"use client";
/**
 * Application « Cahier de mécanique » : bibliothèque de cahiers et éditeur.
 * Le dernier cahier ouvert est rouvert directement au lancement.
 */
import { useCallback, useEffect, useState } from "react";
import { demoNotebook } from "@/lib/notebook/demo";
import { getStore, readPref, writePref, type NotebookStore } from "@/lib/notebook/storage";
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

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await getStore();
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

  if (error) return <div className="p-8 text-center text-danger">{error}</div>;
  if (!store) return <div className="fixed inset-0 z-40 flex items-center justify-center bg-background text-sm text-muted-foreground">Ouverture des cahiers…</div>;
  if (open)
    return (
      <Editor
        key={open.id}
        initial={open}
        store={store}
        onClose={async () => {
          writePref("last", null);
          setOpen(null);
          await refresh();
        }}
      />
    );
  return <Library store={store} metas={metas} onOpen={(id) => void openNotebook(id)} onRefresh={() => refresh()} homeHref={homeHref} />;
}
