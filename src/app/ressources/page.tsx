import type { Metadata } from "next";
import { FileText, ImageIcon } from "lucide-react";
import { Container, PageHeader } from "@/components/layout/app-shell";
import { Badge, Card, CardContent } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Bibliothèque de ressources" };

function size(b: number) {
  return b > 1048576 ? `${(b / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(b / 1024))} ko`;
}

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser("/ressources");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: subjects } = await supabase.from("subjects").select("id, slug, title").eq("status", "published").order("position");
  const current = subjects?.find((s) => s.slug === sp.matiere);
  let q = supabase.from("documents").select("id, title, description, mime_type, size_bytes, created_at, subject:subjects(title)").eq("status", "published").order("created_at", { ascending: false }).limit(200);
  if (current) q = q.eq("subject_id", current.id);
  const { data: docs } = await q;
  return (
    <Container>
      <PageHeader eyebrow="Bibliothèque" title="Ressources pédagogiques" description="Documents déposés par l'équipe pédagogique : formulaires, sujets, abaques, plans. Accès réservé aux comptes étudiants." />
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Filtrer par matière">
        <a href="/ressources" className={`rounded-full border px-3 py-1 text-sm ${!current ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-muted"}`}>
          Toutes
        </a>
        {subjects?.map((s) => (
          <a key={s.id} href={`/ressources?matiere=${s.slug}`} className={`rounded-full border px-3 py-1 text-sm ${current?.id === s.id ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-muted"}`}>
            {s.title}
          </a>
        ))}
      </nav>
      <Card>
        <CardContent className="divide-y divide-border pt-2">
          {!docs?.length && <p className="py-8 text-center text-sm text-muted-foreground">Aucun document publié{current ? " pour cette matière" : ""} pour le moment.</p>}
          {docs?.map((d) => (
            <a key={d.id} href={`/api/documents/${d.id}`} target="_blank" rel="noopener" className="flex items-center gap-3 py-3 hover:text-primary">
              {d.mime_type === "application/pdf" ? <FileText className="size-5 shrink-0 text-danger" /> : <ImageIcon className="size-5 shrink-0 text-primary" />}
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{d.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {(d.subject as unknown as { title: string } | null)?.title ?? "Général"} · {size(d.size_bytes)}
                  {d.description ? ` · ${d.description}` : ""}
                </span>
              </span>
              <Badge variant="muted">{d.mime_type === "application/pdf" ? "PDF" : "image"}</Badge>
            </a>
          ))}
        </CardContent>
      </Card>
    </Container>
  );
}
