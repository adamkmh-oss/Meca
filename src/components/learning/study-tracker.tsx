"use client";
/**
 * Suivi de lecture : enregistre l'ouverture (reprise automatique du dernier
 * cours) et le temps passé, uniquement quand l'onglet est visible.
 */
import { useEffect, useRef } from "react";
import { useViewer } from "@/components/layout/viewer";
import { trackChapterView, trackLessonView } from "@/app/actions/learning";

export function StudyTracker({ itemKey }: { itemKey: string }) {
  const viewer = useViewer();
  const acc = useRef(0);
  useEffect(() => {
    if (!viewer) return;
    const [kind, id] = itemKey.split(":");
    void (kind === "lesson" ? trackLessonView(id) : trackChapterView(id));
    let last = Date.now();
    const tick = () => {
      const now = Date.now();
      if (document.visibilityState === "visible") acc.current += (now - last) / 1000;
      last = now;
    };
    const flush = (beacon = false) => {
      tick();
      const seconds = Math.min(600, Math.round(acc.current));
      if (seconds < 5) return;
      acc.current = 0;
      const body = JSON.stringify({ itemKey, seconds });
      if (beacon && navigator.sendBeacon) navigator.sendBeacon("/api/progress/temps", new Blob([body], { type: "application/json" }));
      else void fetch("/api/progress/temps", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    };
    const timer = setInterval(() => flush(), 60_000);
    const onVis = () => (document.visibilityState === "hidden" ? flush(true) : (last = Date.now()));
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
      flush(true);
    };
  }, [itemKey, viewer]);
  return null;
}
