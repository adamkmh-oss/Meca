import type { Metadata } from "next";
import Link from "next/link";
import * as Icons from "lucide-react";
import { ArrowRight, CircleCheck, Clock, Flame, History, Star, Target, TrendingDown, TrendingUp } from "lucide-react";
import { Container, PageHeader } from "@/components/layout/app-shell";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Progress } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { formatDuration, loadDashboard, SOURCE_LABEL } from "@/lib/learning/stats";
import { ROLE_LABEL } from "@/lib/auth/permissions";

export const metadata: Metadata = { title: "Mon espace" };

function Tile({ icon: Icon, label, value, hint }: { icon: typeof Clock; label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 pt-5">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Icon className="size-4" /> {label}
        </div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export default async function SpacePage() {
  const user = await requireUser("/espace");
  const supabase = await createClient();
  const d = await loadDashboard(supabase);
  const goal = d.profile?.weekly_goal ?? user.weeklyGoal;
  const started = d.subjects.filter((s) => s.attempts > 0 || s.completed > 0);
  const others = d.subjects.filter((s) => !(s.attempts > 0 || s.completed > 0));

  return (
    <Container>
      <PageHeader
        eyebrow={`${ROLE_LABEL[user.role]}${user.studyYear ? ` · ${user.studyYear}` : ""}`}
        title={`Bonjour ${user.displayName}`}
        description="Votre progression, vos résultats et les notions à retravailler, d'après vos exercices et vos lectures."
        actions={
          <Button asChild variant="outline">
            <Link href="/espace/historique">
              <History /> Historique
            </Link>
          </Button>
        }
      />

      {d.profile?.last_item_href && (
        <Card className="mb-6 border-primary/30 bg-primary-soft/40">
          <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">Reprendre</div>
              <div className="font-semibold">{d.profile.last_item_title}</div>
            </div>
            <Button asChild>
              <Link href={d.profile.last_item_href}>
                Continuer <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile icon={CircleCheck} label="Exercices réalisés" value={String(d.totals.exercises)} hint={`${d.totals.distinctExercises} différents`} />
        <Tile icon={Target} label="Taux de réussite" value={d.totals.successRate === null ? "—" : `${d.totals.successRate} %`} hint="exercices, quiz et examens" />
        <Tile icon={Clock} label="Temps d'apprentissage" value={formatDuration(d.totals.studySeconds)} hint="lecture + exercices" />
        <Tile icon={Flame} label="Série" value={`${d.streak.current} j`} hint={d.streak.activeToday ? "actif aujourd'hui" : "travaillez aujourd'hui pour la prolonger"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Progression par matière</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[...started, ...others].map((s) => {
              const Icon = ((Icons as unknown as Record<string, typeof Clock>)[s.icon] ?? Icons.BookOpen) as typeof Clock;
              return (
                <Link key={s.slug} href={`/matieres/${s.slug}`} className="block rounded-lg p-1 hover:bg-muted/60">
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2 font-medium">
                      <Icon className="size-4 shrink-0 text-primary" />
                      <span className="truncate">{s.title}</span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {s.total > 0 ? `${s.completed}/${s.total} · ${s.progress} %` : "contenu à venir"}
                      {s.success !== null && ` · réussite ${s.success} %`}
                    </span>
                  </div>
                  <Progress value={s.progress} tone={s.progress >= 100 ? "success" : "primary"} />
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Objectif de la semaine</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold tabular-nums">
                  {d.totals.weekExercises} / {goal}
                </span>
                <span className="text-xs text-muted-foreground">exercices depuis lundi</span>
              </div>
              <Progress value={(100 * d.totals.weekExercises) / goal} tone={d.totals.weekExercises >= goal ? "success" : "primary"} />
              <Link href="/compte" className="text-xs text-primary hover:underline">
                Modifier l&apos;objectif
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-4 text-success" /> Points forts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {d.strengths.length ? (
                <ul className="space-y-1.5 text-sm">
                  {d.strengths.map((c) => (
                    <li key={c.chapter_key} className="flex justify-between gap-2">
                      <span className="truncate">{c.title}</span>
                      <Badge variant="success">{c.rate} %</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Réussissez quelques exercices pour voir apparaître vos points forts.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="size-4 text-warning" /> Notions à retravailler
              </CardTitle>
            </CardHeader>
            <CardContent>
              {d.weaknesses.length ? (
                <ul className="space-y-1.5 text-sm">
                  {d.weaknesses.map((c) => (
                    <li key={c.chapter_key} className="flex justify-between gap-2">
                      <span className="truncate">{c.title}</span>
                      <Badge variant="warning">{c.rate} %</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Rien à signaler pour l&apos;instant.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Dernières tentatives</CardTitle>
            <Link href="/espace/historique" className="text-sm text-primary hover:underline">
              Tout voir
            </Link>
          </CardHeader>
          <CardContent>
            {d.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune tentative enregistrée. Commencez par la{" "}
                <Link href="/exercices" className="text-primary underline">
                  banque d&apos;exercices
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {d.recent.map((a) => (
                  <li key={a.id}>
                    <Link href={`/espace/historique/${a.id}`} className="flex items-center justify-between gap-3 py-2 hover:text-primary">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{a.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {SOURCE_LABEL[a.source]} · {new Date(a.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" })}
                        </span>
                      </span>
                      <Badge variant={a.max_score > 0 && a.score / a.max_score >= 0.7 ? "success" : "muted"}>
                        {a.max_score > 0 ? `${Number(a.score)}/${Number(a.max_score)}` : "à évaluer"}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Raccourcis</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <Link href="/espace/favoris" className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted">
              <Star className="size-4 text-warning" /> Mes favoris et fiches sauvegardées
            </Link>
            <Link href="/fiches" className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted">
              <Icons.NotebookTabs className="size-4 text-primary" /> Fiches de révision
            </Link>
            <Link href="/tuteur" className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted">
              <Icons.Bot className="size-4 text-primary" /> Réviser avec le tuteur IA
            </Link>
            <Link href="/compte" className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted">
              <Icons.Settings className="size-4 text-muted-foreground" /> Profil, sécurité et données
            </Link>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
