import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, GraduationCap, Lock } from "lucide-react";
import { Container, PageHeader } from "@/components/layout/app-shell";
import { MODULES, findModule } from "@/content/modules";
import { LEVEL_LABEL } from "@/content/types";
import { GENERATORS } from "@/lib/exercises/generators";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { ExamStatus, MasteryBadge, ModuleMastery } from "@/components/course/interactive";

export function generateStaticParams() {
  return MODULES.map((m) => ({ module: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ module: string }> }): Promise<Metadata> {
  const { module } = await params;
  const m = findModule(module);
  return { title: m ? `Module ${m.number} — ${m.title}` : "Module" };
}

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const m = findModule(module);
  if (!m) notFound();
  const available = m.chapters.filter((c) => c.available);
  const gens = GENERATORS.filter((g) => m.chapters.some((c) => c.id === g.chapterId));
  return (
    <Container>
      <Link href="/cours" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Tous les modules
      </Link>
      <PageHeader eyebrow={`Module ${m.number}`} title={m.title} description={m.description} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {m.chapters.map((c, k) =>
              c.available ? (
                <Link key={c.id} href={`/cours/${m.slug}/${c.slug}`} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/60">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">{k + 1}</span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="font-medium">{c.title}</div>
                    <div className="text-sm text-muted-foreground">{c.summary}</div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Badge variant="outline">{LEVEL_LABEL[c.level]}</Badge>
                      <span className="text-xs text-muted-foreground">{c.minutes} min</span>
                      <MasteryBadge chapterId={c.id} className="ml-auto" />
                    </div>
                  </div>
                  <ChevronRight className="mt-1 size-4 text-muted-foreground" />
                </Link>
              ) : (
                <div key={c.id} className="flex items-start gap-4 px-5 py-4 opacity-60">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{k + 1}</span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="font-medium">{c.title}</div>
                    <div className="text-sm text-muted-foreground">{c.summary}</div>
                  </div>
                  <Badge variant="muted">
                    <Lock className="size-3" /> en rédaction
                  </Badge>
                </div>
              ),
            )}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Progression</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ModuleMastery chapterIds={available.map((c) => c.id)} />
              <p className="text-xs text-muted-foreground">Maîtrise d&apos;un chapitre : lecture 20 %, quiz 40 %, trois exercices réussis 40 %.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="size-5 text-primary" /> Examen de validation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ExamStatus moduleId={m.id} />
              <Button asChild className="w-full">
                <Link href={`/cours/${m.slug}/examen`}>Passer l&apos;examen</Link>
              </Button>
            </CardContent>
          </Card>
          {gens.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Exercices du module</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {gens.map((g) => (
                  <Link key={g.id} href={`/exercices/${g.id}`} className="block text-sm text-primary hover:underline">
                    {g.title}
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Container>
  );
}
