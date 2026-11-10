import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { z } from "zod";
import { Container, PageHeader } from "@/components/layout/app-shell";
import { Badge, Card, CardContent } from "@/components/ui";
import { Md } from "@/components/math";
import { LEVEL_LABEL } from "@/content/types";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/env";
import { getSession } from "@/lib/auth/dal";
import { isFavorite } from "@/lib/learning/content";
import { DbExercisePlayer, type DbQuestion } from "@/components/exercises/db-exercise";
import { FavoriteButton, ReportButton } from "@/components/learning/actions-bar";

async function load(slug: string, id: string) {
  if (!supabaseConfigured || !z.uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("exercises")
    .select("id, title, statement_md, data_md, difficulty, status, illustration_document_id, chapter:chapters!inner(title, slug, subject:subjects!inner(slug, title)), questions(id, kind, prompt_md, unit, points, multiple, position, answers(id, label_md, position))")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const chapter = data.chapter as unknown as { title: string; slug: string; subject: { slug: string; title: string } };
  if (chapter.subject.slug !== slug) return null;
  const questions = ((data.questions ?? []) as (DbQuestion & { position: number })[])
    .sort((a, b) => a.position - b.position)
    .map((q) => ({ ...q, answers: [...q.answers].sort((a, b) => a.position - b.position) }));
  return { ex: data, chapter, questions };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<Metadata> {
  const p = await params;
  const d = await load(p.slug, p.id);
  return { title: d ? d.ex.title : "Exercice" };
}

export default async function DbExercisePage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const p = await params;
  const d = await load(p.slug, p.id);
  if (!d) notFound();
  const { ex, chapter } = d;
  const href = `/matieres/${chapter.subject.slug}/exercices/${ex.id}`;
  const session = await getSession();
  const fav = session ? await isFavorite(`exercise:${ex.id}`) : false;
  return (
    <Container className="max-w-3xl">
      <Link href={`/matieres/${chapter.subject.slug}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> {chapter.subject.title}
      </Link>
      <PageHeader
        eyebrow={chapter.title}
        title={ex.title}
        actions={<FavoriteButton itemKey={`exercise:${ex.id}`} kind="exercice" title={ex.title} href={href} initial={fav} />}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="outline">{LEVEL_LABEL[ex.difficulty as keyof typeof LEVEL_LABEL]}</Badge>
        <Badge variant="muted">{d.questions.length} question(s)</Badge>
        {ex.status !== "published" && <Badge variant="warning">{ex.status === "draft" ? "brouillon" : "archivé"}</Badge>}
      </div>
      <Card className="mb-4">
        <CardContent className="space-y-3 pt-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Énoncé</h2>
          <Md>{ex.statement_md}</Md>
          {ex.illustration_document_id && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/documents/${ex.illustration_document_id}`} alt={`Schéma de l'exercice « ${ex.title} »`} className="mx-auto max-h-96 rounded-lg border border-border" />
          )}
          {ex.data_md && (
            <>
              <h2 className="pt-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Données</h2>
              <Md>{ex.data_md}</Md>
            </>
          )}
        </CardContent>
      </Card>
      <DbExercisePlayer exerciseId={ex.id} questions={d.questions} />
      <div className="mt-6">
        <ReportButton targetType="exercise" targetKey={`exercise:${ex.id}`} targetTitle={ex.title} targetHref={href} />
      </div>
    </Container>
  );
}
