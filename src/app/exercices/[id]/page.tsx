import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { Container, PageHeader } from "@/components/layout/app-shell";
import { GENERATORS, findGenerator } from "@/lib/exercises/generators";
import { chapterById } from "@/content/modules";
import { ExerciseRoute } from "./exercise-route";

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
  return (
    <Container className="max-w-4xl">
      <Link href="/exercices" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Banque d&apos;exercices
      </Link>
      <PageHeader
        eyebrow={ch ? `Module ${ch.module.number} · ${ch.chapter.title}` : undefined}
        title={g.title}
        description={g.description}
      />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
        <ExerciseRoute id={id} />
      </Suspense>
    </Container>
  );
}
