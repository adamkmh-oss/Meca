import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, NotebookTabs, PenLine } from "lucide-react";
import { Container } from "@/components/layout/app-shell";
import { Badge, Card, CardContent } from "@/components/ui";
import { Md } from "@/components/math";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/env";
import { isFavorite } from "@/lib/learning/content";
import { FavoriteButton, ReportButton } from "@/components/learning/actions-bar";
import { StudyTracker } from "@/components/learning/study-tracker";
import { CompleteButton } from "./complete-button";

const SLUG = /^[a-z0-9-]{1,80}$/;

async function load(slug: string, chapitre: string, lecon: string) {
  if (!supabaseConfigured || ![slug, chapitre, lecon].every((s) => SLUG.test(s))) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select("id, slug, kind, title, summary, body_md, estimated_minutes, status, updated_at, chapter:chapters!inner(id, slug, title, subject:subjects!inner(slug, title))")
    .eq("slug", lecon)
    .eq("chapter.slug", chapitre)
    .eq("chapter.subject.slug", slug)
    .maybeSingle();
  if (!data) return null;
  const chapter = data.chapter as unknown as { id: string; slug: string; title: string; subject: { slug: string; title: string } };
  const { data: siblings } = await supabase.from("lessons").select("slug, title, position").eq("chapter_id", chapter.id).order("position");
  const { data: exercises } = await supabase.from("exercises").select("id, title, difficulty").eq("chapter_id", chapter.id).order("position");
  return { lesson: data, chapter, siblings: siblings ?? [], exercises: exercises ?? [] };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; chapitre: string; lecon: string }> }): Promise<Metadata> {
  const p = await params;
  const d = await load(p.slug, p.chapitre, p.lecon);
  return d ? { title: d.lesson.title, description: d.lesson.summary || undefined } : { title: "Leçon" };
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string; chapitre: string; lecon: string }> }) {
  const p = await params;
  const d = await load(p.slug, p.chapitre, p.lecon);
  if (!d) notFound();
  const { lesson, chapter } = d;
  const href = `/matieres/${chapter.subject.slug}/${chapter.slug}/${lesson.slug}`;
  const k = d.siblings.findIndex((s) => s.slug === lesson.slug);
  const prev = d.siblings[k - 1];
  const next = d.siblings[k + 1];
  const fav = await isFavorite(`lesson:${lesson.id}`);

  return (
    <Container className="max-w-3xl">
      <StudyTracker itemKey={`lesson:${lesson.id}`} />
      <Link href={`/matieres/${chapter.subject.slug}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> {chapter.subject.title}
      </Link>
      <div className="mb-6 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          {lesson.kind === "fiche" ? (
            <span className="inline-flex items-center gap-1 text-warning">
              <NotebookTabs className="size-3.5" /> Fiche de révision
            </span>
          ) : (
            <span>{chapter.title}</span>
          )}
          {lesson.status !== "published" && <Badge variant="warning">{lesson.status === "draft" ? "brouillon" : "archivé"}</Badge>}
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{lesson.title}</h1>
        {lesson.summary && <p className="text-muted-foreground">{lesson.summary}</p>}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-4" /> {lesson.estimated_minutes} min
          </span>
          <span>· mis à jour le {new Date(lesson.updated_at).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <FavoriteButton itemKey={`lesson:${lesson.id}`} kind={lesson.kind === "fiche" ? "fiche" : "cours"} title={lesson.title} href={href} initial={fav} />
        </div>
      </div>

      <article>
        <Md>{lesson.body_md}</Md>
      </article>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        <CompleteButton lessonId={lesson.id} />
        <ReportButton targetType="lesson" targetKey={`lesson:${lesson.id}`} targetTitle={lesson.title} targetHref={href} />
      </div>

      {d.exercises.length > 0 && (
        <Card className="mt-6">
          <CardContent className="space-y-2 pt-5">
            <h2 className="text-sm font-semibold">S&apos;entraîner sur ce chapitre</h2>
            {d.exercises.map((e) => (
              <Link key={e.id} href={`/matieres/${chapter.subject.slug}/exercices/${e.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                <PenLine className="size-4 text-primary" /> {e.title}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <nav className="mt-6 flex justify-between gap-3 text-sm" aria-label="Leçons du chapitre">
        {prev ? <Link href={`/matieres/${chapter.subject.slug}/${chapter.slug}/${prev.slug}`} className="text-primary hover:underline">← {prev.title}</Link> : <span />}
        {next && <Link href={`/matieres/${chapter.subject.slug}/${chapter.slug}/${next.slug}`} className="text-right text-primary hover:underline">{next.title} →</Link>}
      </nav>
    </Container>
  );
}
