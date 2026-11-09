import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Container, PageHeader } from "@/components/layout/app-shell";
import { MODULES, findModule } from "@/content/modules";
import { CHAPTER_CONTENT } from "@/content/chapters";
import { GENERATORS } from "@/lib/exercises/generators";
import { ModuleExam } from "@/components/course/interactive";

export function generateStaticParams() {
  return MODULES.map((m) => ({ module: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ module: string }> }): Promise<Metadata> {
  const { module } = await params;
  const m = findModule(module);
  return { title: m ? `Examen — ${m.title}` : "Examen" };
}

export default async function ExamPage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const m = findModule(module);
  if (!m) notFound();
  const pool = m.chapters.flatMap((c) => (CHAPTER_CONTENT[c.id]?.quiz ?? []).map((q) => ({ chapter: c.id, q })));
  const gens = GENERATORS.filter((g) => m.chapters.some((c) => c.id === g.chapterId)).map((g) => g.id);
  return (
    <Container className="max-w-4xl">
      <Link href={`/cours/${m.slug}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Module {m.number}
      </Link>
      <PageHeader eyebrow={`Module ${m.number} · examen final`} title={m.title} description="Validez vos acquis : questions de cours et exercices à données variables, sans indice ni correction avant la fin." />
      {pool.length === 0 && gens.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ce module est en cours de rédaction : son examen sera disponible avec ses chapitres.</p>
      ) : (
        <ModuleExam moduleId={m.id} moduleTitle={m.title} pool={pool} generators={gens} />
      )}
    </Container>
  );
}
