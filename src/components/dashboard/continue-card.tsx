"use client";
import Link from "next/link";
import { ArrowRight, Flame, Sparkles } from "lucide-react";
import { AVAILABLE_CHAPTERS, chapterById } from "@/content/modules";
import { chapterMastery, streak, useProgress } from "@/lib/progress/store";
import { Button } from "@/components/ui";

export function ContinueCard() {
  const s = useProgress();
  if (s.attempts.length === 0 && Object.keys(s.chaptersRead).length === 0) return null;
  const next = AVAILABLE_CHAPTERS.find((c) => chapterMastery(s, c.id) < 80);
  const ref = next ? chapterById(next.id) : undefined;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-card p-4 sm:flex-row sm:items-center">
      <div className="flex gap-4 text-sm">
        <span className="inline-flex items-center gap-1 font-semibold text-warning">
          <Flame className="size-4" /> {streak(s).current} j
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-primary">
          <Sparkles className="size-4" /> {s.xp} XP
        </span>
      </div>
      {ref && (
        <div className="min-w-0 flex-1 text-sm">
          Prochain chapitre conseillé : <strong>{ref.chapter.title}</strong>
        </div>
      )}
      {ref && (
        <Button asChild size="sm">
          <Link href={`/cours/${ref.module.slug}/${ref.chapter.slug}`}>
            Reprendre <ArrowRight />
          </Link>
        </Button>
      )}
    </div>
  );
}
