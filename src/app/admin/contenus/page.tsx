import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { Button, Card, CardContent } from "@/components/ui";
import { StatusBadge, type Status } from "@/components/admin/controls";
import { requirePermission } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Contenus" };

interface Tree {
  id: string;
  title: string;
  slug: string;
  status: Status;
  chapters: { id: string; title: string; status: Status; position: number; lessons: { id: string; title: string; kind: string; status: Status; position: number }[]; exercises: { id: string; title: string; status: Status; position: number }[] }[];
}

export default async function ContentsPage() {
  const s = await requirePermission("content.write");
  const supabase = await createClient();
  const { data } = await supabase
    .from("subjects")
    .select("id, title, slug, status, chapters(id, title, status, position, lessons(id, title, kind, status, position), exercises(id, title, status, position))")
    .order("position");
  const subjects = (data ?? []) as Tree[];
  return (
    <>
      <PageHeader
        title="Contenus"
        description="Matières, chapitres, leçons, fiches et exercices. Un contenu n'est visible des étudiants qu'une fois publié, avec son chapitre et sa matière."
        actions={
          s.permissions.includes("subjects.manage") ? (
            <Button asChild>
              <Link href="/admin/matieres/nouvelle">
                <Plus /> Nouvelle matière
              </Link>
            </Button>
          ) : undefined
        }
      />
      <div className="space-y-4">
        {subjects.map((sub) => (
          <Card key={sub.id}>
            <CardContent className="space-y-3 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/admin/matieres/${sub.id}`} className="text-lg font-semibold hover:text-primary">
                  {sub.title}
                </Link>
                <div className="flex items-center gap-2">
                  <StatusBadge status={sub.status} />
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/chapitres/nouveau?matiere=${sub.id}`}>
                      <Plus /> Chapitre
                    </Link>
                  </Button>
                </div>
              </div>
              {sub.chapters.length === 0 && <p className="text-sm text-muted-foreground">Aucun chapitre.</p>}
              {[...sub.chapters].sort((a, b) => a.position - b.position).map((c) => (
                <div key={c.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/admin/chapitres/${c.id}`} className="font-medium hover:text-primary">
                      {c.title}
                    </Link>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={c.status} />
                      <Link href={`/admin/lecons/nouvelle?chapitre=${c.id}`} className="text-xs text-primary hover:underline">
                        + leçon
                      </Link>
                      <Link href={`/admin/exercices/nouveau?chapitre=${c.id}`} className="text-xs text-primary hover:underline">
                        + exercice
                      </Link>
                    </div>
                  </div>
                  <ul className="mt-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                    {[...c.lessons].sort((a, b) => a.position - b.position).map((l) => (
                      <li key={l.id} className="flex min-w-0 items-center justify-between gap-2">
                        <Link href={`/admin/lecons/${l.id}`} className="min-w-0 truncate hover:text-primary">
                          {l.kind === "fiche" ? "Fiche · " : ""}
                          {l.title}
                        </Link>
                        <StatusBadge status={l.status} />
                      </li>
                    ))}
                    {[...c.exercises].sort((a, b) => a.position - b.position).map((e) => (
                      <li key={e.id} className="flex min-w-0 items-center justify-between gap-2">
                        <Link href={`/admin/exercices/${e.id}`} className="min-w-0 truncate hover:text-primary">
                          Exercice · {e.title}
                        </Link>
                        <StatusBadge status={e.status} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
