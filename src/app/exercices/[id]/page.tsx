import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { Container, PageHeader } from "@/components/layout/app-shell";
import { GENERATORS, findGenerator } from "@/lib/exercises/generators";
import { chapterById } from "@/content/modules";
import { ExerciseRoute } from "./exercise-route";
import { FavoriteButton, ReportButton } from "@/components/learning/actions-bar";
import { isFavorite } from "@/lib/learning/content";

export function generateStaticParams() {
  return GENERATORS.map((g) => ({ id: g.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const g = findGenerator(id);
  return { title: g ? g.title : "Exercice" };
}

export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = findGenerator(id);
  if (!g) notFound();
  const ch = chapterById(g.chapterId);
  const fav = await isFavorite(`generator:${g.id}`);
  return (
    <Container className="max-w-4xl">
      <Link href="/exercices" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Banque d&apos;exercices
      </Link>
      <PageHeader
        eyebrow={ch ? `Module ${ch.module.number} · ${ch.chapter.title}` : undefined}
        title={g.title}
        description={g.description}
        actions={<FavoriteButton itemKey={`generator:${g.id}`} kind="exercice" title={g.title} href={`/exercices/${g.id}`} initial={fav} />}
      />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
        <ExerciseRoute id={id} />
      </Suspense>
      <div className="mt-6">
        <ReportButton targetType="generator" targetKey={`generator:${g.id}`} targetTitle={g.title} targetHref={`/exercices/${g.id}`} />
      </div>
    </Container>
  );
}
