import Link from "next/link";
import { AlertTriangle, Bot, CircleCheck, FileText, PenLine, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, Progress } from "@/components/ui";
import { requirePermission } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Vue d'ensemble" };

interface Stats {
  users: { total: number; students: number; teachers: number; admins: number; suspended: number; new_7d: number };
  active_7d: number;
  attempts_7d: number;
  success_rate_30d: number | null;
  content: { subjects: number; lessons_published: number; lessons_draft: number; exercises_published: number; exercises_draft: number; documents: number };
  reports_open: number;
  ai_calls_7d: number;
  by_subject: { subject_slug: string; attempts: number; success: number | null }[];
}

function Tile({ icon: Icon, label, value, hint, href }: { icon: typeof Users; label: string; value: string | number; hint?: string; href?: string }) {
  const body = (
    <Card className={href ? "h-full hover:border-primary/50" : "h-full"}>
      <CardContent className="space-y-1 pt-5">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Icon className="size-4" /> {label}
        </div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function AdminHome() {
  await requirePermission("stats.read");
  const supabase = await createClient();
  const [{ data }, { data: subjects }] = await Promise.all([supabase.rpc("admin_stats"), supabase.from("subjects").select("slug, title")]);
  const s = data as Stats;
  const titles = new Map((subjects ?? []).map((x) => [x.slug, x.title]));
  return (
    <>
      <PageHeader title="Vue d'ensemble" description="Statistiques agrégées de la plateforme (aucune donnée individuelle)." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile icon={Users} label="Comptes" value={s.users.total} hint={`${s.users.students} étudiants · ${s.users.teachers} enseignants · ${s.users.admins} admins`} />
        <Tile icon={CircleCheck} label="Actifs (7 j)" value={s.active_7d} hint={`${s.attempts_7d} tentatives · +${s.users.new_7d} inscrits`} />
        <Tile icon={PenLine} label="Réussite (30 j)" value={s.success_rate_30d === null ? "—" : `${s.success_rate_30d} %`} hint="toutes tentatives notées" />
        <Tile icon={AlertTriangle} label="Signalements ouverts" value={s.reports_open} href="/admin/signalements" />
        <Tile icon={FileText} label="Leçons publiées" value={s.content.lessons_published} hint={`${s.content.lessons_draft} en brouillon`} href="/admin/contenus" />
        <Tile icon={PenLine} label="Exercices publiés" value={s.content.exercises_published} hint={`${s.content.exercises_draft} en brouillon`} href="/admin/contenus" />
        <Tile icon={FileText} label="Documents publiés" value={s.content.documents} href="/admin/documents" />
        <Tile icon={Bot} label="Questions au tuteur (7 j)" value={s.ai_calls_7d} />
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Activité par matière (30 jours)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {s.by_subject.length === 0 && <p className="text-sm text-muted-foreground">Pas encore d&apos;activité.</p>}
          {s.by_subject.map((b) => (
            <div key={b.subject_slug}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{titles.get(b.subject_slug) ?? b.subject_slug}</span>
                <span className="text-muted-foreground tabular-nums">
                  {b.attempts} tentatives · réussite {b.success ?? "—"} %
                </span>
              </div>
              <Progress value={b.success ?? 0} />
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
