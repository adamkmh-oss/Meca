import type { Metadata } from "next";
import Link from "next/link";
import * as Icons from "lucide-react";
import { ChevronRight, Lock } from "lucide-react";
import { Container, PageHeader } from "@/components/layout/app-shell";
import { MODULES } from "@/content/modules";
import { LEVEL_LABEL } from "@/content/types";
import { Badge, Card, CardContent } from "@/components/ui";
import { ExamStatus, MasteryBadge, ModuleMastery } from "@/components/course/interactive";

export const metadata: Metadata = { title: "Cours", description: "Programme de mécanique des structures du BUT GCCD en six modules." };

export default function CoursesPage() {
  return (
    <Container>
      <PageHeader
        eyebrow="Programme"
        title="Six modules, de la statique au flambement"
        description="Chaque chapitre propose un cours structuré, les formules expliquées, des schémas interactifs, un exemple de génie civil, des exercices corrigés et un quiz. Un examen valide chaque module."
      />
      <div className="space-y-5">
        {MODULES.map((m) => {
          const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[m.icon] ?? Icons.BookOpen;
          const available = m.chapters.filter((c) => c.available);
          return (
            <Card key={m.id} className="overflow-hidden">
              <div className="grid gap-0 md:grid-cols-[300px_1fr]">
                <div className="space-y-3 border-b border-border bg-muted/50 p-5 md:border-b-0 md:border-r">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-primary">Module {m.number}</div>
                      <Link href={`/cours/${m.slug}`} className="font-semibold hover:underline">
                        {m.title}
                      </Link>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{m.description}</p>
                  <ModuleMastery chapterIds={available.map((c) => c.id)} />
                  <div className="flex items-center justify-between">
                    <ExamStatus moduleId={m.id} />
                    <Link href={`/cours/${m.slug}`} className="text-sm font-medium text-primary hover:underline">
                      Ouvrir
                    </Link>
                  </div>
                </div>
                <CardContent className="divide-y divide-border p-0">
                  {m.chapters.map((c) =>
                    c.available ? (
                      <Link key={c.id} href={`/cours/${m.slug}/${c.slug}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/60">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{c.title}</div>
                          <div className="truncate text-xs text-muted-foreground">{c.summary}</div>
                        </div>
                        <Badge variant="outline" className="hidden sm:inline-flex">{LEVEL_LABEL[c.level]}</Badge>
                        <MasteryBadge chapterId={c.id} className="hidden md:flex" />
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </Link>
                    ) : (
                      <div key={c.id} className="flex items-center gap-3 px-5 py-3 opacity-60">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{c.title}</div>
                          <div className="truncate text-xs text-muted-foreground">{c.summary}</div>
                        </div>
                        <Badge variant="muted">
                          <Lock className="size-3" /> en rédaction
                        </Badge>
                      </div>
                    ),
                  )}
                </CardContent>
              </div>
            </Card>
          );
        })}
      </div>
    </Container>
  );
}
