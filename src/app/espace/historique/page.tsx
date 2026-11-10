import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Container, PageHeader } from "@/components/layout/app-shell";
import { Badge, Card, CardContent } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { formatDuration, SOURCE_LABEL } from "@/lib/learning/stats";

export const metadata: Metadata = { title: "Historique des tentatives" };
const PAGE = 30;

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser("/espace/historique");
  const sp = await searchParams;
  const page = Math.max(0, Math.min(1000, Number.parseInt(sp.page ?? "0", 10) || 0));
  const source = ["exercise", "generator", "quiz", "exam"].includes(sp.type ?? "") ? sp.type : undefined;
  const supabase = await createClient();
  let q = supabase
    .from("attempts")
    .select("id, source, title, subject_slug, score, max_score, duration_seconds, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * PAGE, page * PAGE + PAGE - 1);
  if (source) q = q.eq("source", source);
  const { data, count } = await q;
  const pages = Math.ceil((count ?? 0) / PAGE);
  const filters = [
    { v: undefined, l: "Tout" },
    { v: "exercise", l: "Exercices" },
    { v: "generator", l: "Exercices générés" },
    { v: "quiz", l: "Quiz" },
    { v: "exam", l: "Examens" },
  ];
  return (
    <Container className="max-w-4xl">
      <Link href="/espace" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Mon espace
      </Link>
      <PageHeader title="Historique des tentatives" description={`${count ?? 0} tentative(s) enregistrée(s). Ouvrez-en une pour revoir vos réponses et la correction.`} />
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Filtrer">
        {filters.map((f) => (
          <Link
            key={f.l}
            href={f.v ? `/espace/historique?type=${f.v}` : "/espace/historique"}
            className={`rounded-full border px-3 py-1 text-sm ${source === f.v ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-muted"}`}
          >
            {f.l}
          </Link>
        ))}
      </nav>
      <Card>
        <CardContent className="pt-2">
          {!data?.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucune tentative.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.map((a) => (
                <li key={a.id}>
                  <Link href={`/espace/historique/${a.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-primary">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{a.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {SOURCE_LABEL[a.source]} · {new Date(a.created_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" })}
                        {a.duration_seconds ? ` · ${formatDuration(a.duration_seconds)}` : ""}
                      </span>
                    </span>
                    <Badge variant={a.max_score > 0 && a.score / a.max_score >= 0.7 ? "success" : a.max_score > 0 ? "warning" : "muted"}>
                      {a.max_score > 0 ? `${Number(a.score)} / ${Number(a.max_score)}` : "à évaluer"}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      {pages > 1 && (
        <div className="mt-4 flex justify-between text-sm">
          {page > 0 ? <Link href={`/espace/historique?page=${page - 1}${source ? `&type=${source}` : ""}`} className="text-primary">← Plus récentes</Link> : <span />}
          {page < pages - 1 && <Link href={`/espace/historique?page=${page + 1}${source ? `&type=${source}` : ""}`} className="text-primary">Plus anciennes →</Link>}
        </div>
      )}
    </Container>
  );
}
