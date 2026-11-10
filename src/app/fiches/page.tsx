import type { Metadata } from "next";
import Link from "next/link";
import { NotebookTabs } from "lucide-react";
import { Container, PageHeader } from "@/components/layout/app-shell";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Md } from "@/components/math";
import { AVAILABLE_CHAPTERS, MODULES } from "@/content/modules";
import { CHAPTER_CONTENT } from "@/content/chapters";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/env";
import { getSession } from "@/lib/auth/dal";
import { FavoriteButton } from "@/components/learning/actions-bar";
import { SUBJECT_OF_MODULE } from "@/lib/learning/builtin";

export const metadata: Metadata = { title: "Fiches de révision", description: "L'essentiel de chaque chapitre : formules, conventions et pièges à éviter." };

export default async function SheetsPage() {
  const session = await getSession();
  let dbSheets: { id: string; slug: string; title: string; summary: string; chapter: { slug: string; title: string; subject: { slug: string; title: string } } }[] = [];
  let favs = new Set<string>();
  if (supabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("lessons")
      .select("id, slug, title, summary, chapter:chapters!inner(slug, title, subject:subjects!inner(slug, title))")
      .eq("kind", "fiche")
      .eq("status", "published")
      .order("title");
    dbSheets = (data ?? []) as unknown as typeof dbSheets;
    if (session) {
      const { data: f } = await supabase.from("favorites").select("item_key").eq("kind", "fiche");
      favs = new Set((f ?? []).map((x) => x.item_key));
    }
  }
  const builtin = AVAILABLE_CHAPTERS.filter((c) => CHAPTER_CONTENT[c.id]?.keyPoints.length).map((c) => {
    const m = MODULES.find((x) => x.id === c.moduleId)!;
    return { chapter: c, module: m, points: CHAPTER_CONTENT[c.id].keyPoints, subject: SUBJECT_OF_MODULE[m.slug] };
  });
  return (
    <Container>
      <PageHeader eyebrow="Révisions" title="Fiches de révision" description="L'essentiel de chaque chapitre. Sauvegardez celles à revoir avant un contrôle : elles apparaissent dans vos favoris." />
      {dbSheets.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Fiches des enseignants</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {dbSheets.map((s) => (
              <Link key={s.id} href={`/matieres/${s.chapter.subject.slug}/${s.chapter.slug}/${s.slug}`}>
                <Card className="h-full hover:border-primary/50">
                  <CardContent className="space-y-1 pt-5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-warning">
                      <NotebookTabs className="size-3.5" /> {s.chapter.subject.title}
                    </div>
                    <div className="font-semibold">{s.title}</div>
                    {s.summary && <p className="text-sm text-muted-foreground">{s.summary}</p>}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Cours de mécanique, RDM et statique</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {builtin.map(({ chapter, module, points }) => {
            const href = `/cours/${module.slug}/${chapter.slug}`;
            return (
              <Card key={chapter.id} id={chapter.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="outline">Module {module.number}</Badge>
                    <FavoriteButton itemKey={`fiche:${chapter.id}`} kind="fiche" title={`Fiche — ${chapter.title}`} href={`/fiches#${chapter.id}`} initial={favs.has(`fiche:${chapter.id}`)} />
                  </div>
                  <CardTitle>
                    <Link href={href} className="hover:text-primary">
                      {chapter.title}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-sm">
                    {points.map((p, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                        <Md className="min-w-0 flex-1 [&_p]:my-0">{p}</Md>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </Container>
  );
}
