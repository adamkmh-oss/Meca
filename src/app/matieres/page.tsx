import type { Metadata } from "next";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Container, PageHeader } from "@/components/layout/app-shell";
import { Badge, Callout, Card, CardContent } from "@/components/ui";
import { getSubjects } from "@/lib/learning/content";
import { supabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Matières",
  description: "Les matières du BUT Génie Civil – Construction Durable : mécanique des structures, RDM, statique, béton armé, géotechnique, matériaux, topographie, thermique, construction durable, lecture de plans.",
};

export default async function SubjectsPage() {
  const subjects = await getSubjects();
  return (
    <Container>
      <PageHeader eyebrow="Programme" title="Matières" description="Choisissez une matière : cours, fiches de révision, exercices corrigés et documents." />
      {!supabaseConfigured && (
        <Callout tone="warning" className="mb-6">
          La base de contenus n&apos;est pas configurée sur ce serveur : seul le <Link href="/cours" className="underline">cours de mécanique intégré</Link> est disponible.
        </Callout>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {subjects.map((s) => {
          const Icon = ((Icons as unknown as Record<string, Icons.LucideIcon>)[s.icon] ?? Icons.BookOpen) as Icons.LucideIcon;
          return (
            <Link key={s.id} href={`/matieres/${s.slug}`} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/50">
                <CardContent className="flex h-full flex-col gap-3 pt-5">
                  <div className="flex items-start justify-between">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <Icon className="size-5" />
                    </span>
                    <span className="flex gap-1">
                      {s.builtin_modules.length > 0 && <Badge variant="success">cours interactifs</Badge>}
                      {s.status !== "published" && <Badge variant="warning">{s.status === "draft" ? "brouillon" : "archivée"}</Badge>}
                    </span>
                  </div>
                  <div>
                    <h2 className="font-semibold group-hover:text-primary">{s.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </Container>
  );
}
