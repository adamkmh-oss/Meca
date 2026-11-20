"use client";
/**
 * État d'un cahier ouvert : pages, historique d'annulation (copies
 * superficielles des pages, partage des éléments inchangés) et sauvegarde
 * automatique dans le stockage local.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { NotebookStore } from "@/lib/notebook/storage";
import type { Notebook, Page } from "@/lib/notebook/types";

const MAX_HISTORY = 120;

export interface NotebookHandle {
  nb: Notebook;
  /** Modification annulable. */
  commit: (fn: (pages: Page[]) => Page[]) => void;
  /** Modification en cours de geste (pas d'entrée d'historique). */
  transient: (fn: (pages: Page[]) => Page[]) => void;
  /** Termine un geste : une seule entrée d'historique depuis l'état `before`. */
  endGesture: (before: Page[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  setTitle: (t: string) => void;
  pagesRef: React.RefObject<Page[]>;
  saving: "saved" | "pending" | "error";
  flush: () => Promise<void>;
}

export function useNotebook(initial: Notebook, store: NotebookStore): NotebookHandle {
  const [nb, setNb] = useState<Notebook>(initial);
  const hist = useRef<{ past: Page[][]; future: Page[][] }>({ past: [], future: [] });
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const push = useCallback(
    (before: Page[]) => {
      hist.current = { past: [...hist.current.past.slice(-MAX_HISTORY + 1), before], future: [] };
      bump();
    },
    [bump],
  );
  const [saving, setSaving] = useState<"saved" | "pending" | "error">("saved");
  const pagesRef = useRef<Page[]>(initial.pages);
  const nbRef = useRef(nb);
  nbRef.current = nb;
  pagesRef.current = nb.pages;
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async () => {
    if (!dirty.current) return;
    dirty.current = false;
    try {
      await store.save({ ...nbRef.current, updatedAt: Date.now() });
      setSaving((s) => (dirty.current ? s : "saved"));
    } catch {
      setSaving("error");
    }
  }, [store]);

  const schedule = useCallback(() => {
    dirty.current = true;
    setSaving("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(save, 700);
  }, [save]);

  const apply = useCallback(
    (pages: Page[]) => {
      pagesRef.current = pages;
      setNb((n) => ({ ...n, pages, updatedAt: Date.now() }));
      schedule();
    },
    [schedule],
  );

  const commit = useCallback(
    (fn: (pages: Page[]) => Page[]) => {
      const before = pagesRef.current;
      const after = fn(before);
      if (after === before) return;
      push(before);
      apply(after);
    },
    [apply, push],
  );

  const transient = useCallback(
    (fn: (pages: Page[]) => Page[]) => {
      const after = fn(pagesRef.current);
      if (after === pagesRef.current) return;
      pagesRef.current = after;
      setNb((n) => ({ ...n, pages: after }));
    },
    [],
  );

  const endGesture = useCallback(
    (before: Page[]) => {
      const after = pagesRef.current;
      if (after === before) return;
      push(before);
      apply(after);
    },
    [apply, push],
  );

  const undo = useCallback(() => {
    const h = hist.current;
    if (h.past.length === 0) return;
    const prev = h.past[h.past.length - 1];
    hist.current = { past: h.past.slice(0, -1), future: [pagesRef.current, ...h.future] };
    apply(prev);
    bump();
  }, [apply, bump]);

  const redo = useCallback(() => {
    const h = hist.current;
    if (h.future.length === 0) return;
    const next = h.future[0];
    hist.current = { past: [...h.past, pagesRef.current], future: h.future.slice(1) };
    apply(next);
    bump();
  }, [apply, bump]);

  const setTitle = useCallback(
    (t: string) => {
      setNb((n) => ({ ...n, title: t.trim() || "Sans titre", updatedAt: Date.now() }));
      schedule();
    },
    [schedule],
  );

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    await save();
  }, [save]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      void flush();
    };
  }, [flush]);

  return {
    nb,
    commit,
    transient,
    endGesture,
    undo,
    redo,
    canUndo: hist.current.past.length > 0,
    canRedo: hist.current.future.length > 0,
    setTitle,
    pagesRef,
    saving,
    flush,
  };
}

/** Remplace une page (par identifiant). */
export function mapPage(pages: Page[], pageId: string, fn: (p: Page) => Page): Page[] {
  const i = pages.findIndex((p) => p.id === pageId);
  if (i < 0) return pages;
  const np = fn(pages[i]);
  if (np === pages[i]) return pages;
  const out = pages.slice();
  out[i] = np;
  return out;
}
