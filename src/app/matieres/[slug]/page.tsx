import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as Icons from "lucide-react";
import { ChevronLeft, FileText, NotebookTabs, PenLine } from "lucide-react";
import { Container, PageHeader } from "@/components/layout/app-shell";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { MODULES } from "@/content/modules";
import { LEVEL_LABEL } from "@/content/types";
import { getSubject } from "@/lib/learning/content";
import { getSession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = await getSubject((await params).slug);
  return s ? { title: s.title, description: s.description } : { title: "Matière" };
}

const STATUS: Record<string, string> = { draft: "brouillon", archived: "archivé" };

export default async function SubjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const subject = await getSubject(slug);
  if (!subject) notFound();
  const session = await getSession();
  const modules = MODULES.filter((m) => subject.builtin_modules.includes(m.slug));
  let documents: { id: string; title: string; description: string; mime_type: string }[] = [];
  if (session) {
    const supabase = await createClient();
    const { data } = await supabase.from("documents").select("id, title, description, mime_type").eq("subject_id", subject.id).eq("status", "published").order("created_at", { ascending: false }).limit(20);
    documents = data ?? [];
  }
  const empty = modules.length === 0 && subject.chapters.length === 0;
  const Icon = ((Icons as unknown as Record<string, Icons.LucideIcon>)[subject.icon] ?? Icons.BookOpen) as Icons.LucideIcon;

  return (
    <Container>
      <Link href="/matieres" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Matières
      </Link>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Icon className="size-3.5" /> Matière
          </span>
        }
        title={subject.title}
        description={subject.description}
      />

      {modules.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Cours interactifs (simulateurs, quiz, exercices générés)</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {modules.map((m) => (
              <Link key={m.id} href={`/cours/${m.slug}`}>
                <Card className="h-full hover:border-primary/50">
                  <CardContent className="space-y-1 pt-5">
                    <div className="text-xs font-semibold text-primary">Module {m.number}</div>
                    <div className="font-semibold">{m.title}</div>
                    <p className="text-sm text-muted-foreground">{m.description}</p>
                    <p className="text-xs text-muted-foreground">{m.chapters.filter((c) => c.available).length} chapitre(s) disponible(s)</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {subject.chapters.length > 0 && (
        <section className="mb-8 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Chapitres</h2>
          {subject.chapters.map((c, i) => (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>
                    {i + 1}. {c.title}
                  </CardTitle>
                  <Badge variant="outline">{LEVEL_LABEL[c.level]}</Badge>
                  {c.status !== "published" && <Badge variant="warning">{STATUS[c.status]}</Badge>}
                </div>
                {c.summary && <p className="text-sm text-muted-foreground">{c.summary}</p>}
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cours et fiches</h3>
                  {c.lessons.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune leçon publiée.</p>
                  ) : (
                    <ul className="space-y-1">
                      {c.lessons.map((l) => (
                        <li key={l.id}>
                          <Link href={`/matieres/${subject.slug}/${c.slug}/${l.slug}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                            {l.kind === "fiche" ? <NotebookTabs className="size-4 text-warning" /> : <Icons.BookOpen className="size-4 text-primary" />}
                            <span className="flex-1">{l.title}</span>
                            <span className="text-xs text-muted-foreground">{l.estimated_minutes} min</span>
                            {l.status !== "published" && <Badge variant="warning">{STATUS[l.status]}</Badge>}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Exercices</h3>
                  {c.exercises.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun exercice publié.</p>
                  ) : (
                    <ul className="space-y-1">
                      {c.exercises.map((e) => (
                        <li key={e.id}>
                          <Link href={`/matieres/${subject.slug}/exercices/${e.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                            <PenLine className="size-4 text-primary" />
                            <span className="flex-1">{e.title}</span>
                            <Badge variant="outline">{LEVEL_LABEL[e.difficulty]}</Badge>
                            {e.status !== "published" && <Badge variant="warning">{STATUS[e.status]}</Badge>}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {empty && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Les contenus de cette matière sont en préparation par l&apos;équipe pédagogique.
          </CardContent>
        </Card>
      )}

      {documents.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Documents</h2>
          <Card>
            <CardContent className="divide-y divide-border pt-2">
              {documents.map((d) => (
                <a key={d.id} href={`/api/documents/${d.id}`} target="_blank" rel="noopener" className="flex items-center gap-3 py-2.5 text-sm hover:text-primary">
                  <FileText className="size-4 shrink-0" />
                  <span className="flex-1">
                    <span className="font-medium">{d.title}</span>
                    {d.description && <span className="block text-xs text-muted-foreground">{d.description}</span>}
                  </span>
                  <Badge variant="muted">{d.mime_type === "application/pdf" ? "PDF" : "image"}</Badge>
                </a>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </Container>
  );
}
