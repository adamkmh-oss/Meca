import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, FileText, FlaskConical, NotebookTabs, PenLine, BookOpen } from "lucide-react";
import { Container, PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { FavoriteButton } from "@/components/learning/actions-bar";

export const metadata: Metadata = { title: "Mes favoris" };
const ICON = { cours: BookOpen, fiche: NotebookTabs, exercice: PenLine, document: FileText, outil: FlaskConical } as const;
const LABEL = { cours: "Cours", fiche: "Fiches sauvegardées", exercice: "Exercices", document: "Documents", outil: "Outils" } as const;

export default async function FavoritesPage() {
  await requireUser("/espace/favoris");
  const supabase = await createClient();
  const { data } = await supabase.from("favorites").select("item_key, kind, title, href, created_at").order("created_at", { ascending: false });
  const groups = (["fiche", "cours", "exercice", "document", "outil"] as const).map((k) => ({ k, items: (data ?? []).filter((f) => f.kind === k) })).filter((g) => g.items.length);
  return (
    <Container className="max-w-4xl">
      <Link href="/espace" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Mon espace
      </Link>
      <PageHeader title="Mes favoris" description="Cours, fiches de révision, exercices et documents mis de côté." />
      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucun favori pour l&apos;instant. Utilisez le bouton « Ajouter aux favoris » sur un cours, une fiche ou un exercice.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map(({ k, items }) => {
            const Icon = ICON[k];
            return (
              <section key={k}>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <Icon className="size-4" /> {LABEL[k]}
                </h2>
                <Card>
                  <CardContent className="divide-y divide-border pt-2">
                    {items.map((f) => (
                      <div key={f.item_key} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                        <Link href={f.href} className="font-medium hover:text-primary">
                          {f.title}
                        </Link>
                        <FavoriteButton itemKey={f.item_key} kind={f.kind} title={f.title} href={f.href} initial />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </section>
            );
          })}
        </div>
      )}
    </Container>
  );
}
