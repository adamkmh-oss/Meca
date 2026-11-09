"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bot, Maximize2, X } from "lucide-react";
import { TutorChat } from "./tutor-chat";

/** Bulle flottante présente sur toutes les pages : ouvre le tuteur dans un panneau latéral. */
export function TutorLauncher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  if (pathname.startsWith("/tuteur")) return null;
  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-[1.03] cursor-pointer"
          aria-label="Ouvrir le tuteur IA"
        >
          <Bot className="size-5" /> <span className="hidden sm:inline">Tuteur IA</span>
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Tuteur IA">
          <button type="button" aria-label="Fermer" className="absolute inset-0 bg-black/30 backdrop-blur-[1px] cursor-default" onClick={() => setOpen(false)} />
          <div className="relative flex h-full w-full flex-col border-l border-border bg-card p-4 shadow-2xl animate-rise sm:w-[460px]">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Bot className="size-4" />
                </span>
                Tuteur IA
              </div>
              <div className="flex items-center gap-1">
                <Link href="/tuteur" onClick={() => setOpen(false)} className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted" aria-label="Ouvrir en plein écran" title="Plein écran">
                  <Maximize2 className="size-4" />
                </Link>
                <button type="button" onClick={() => setOpen(false)} className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted cursor-pointer" aria-label="Fermer">
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <TutorChat variant="panel" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
