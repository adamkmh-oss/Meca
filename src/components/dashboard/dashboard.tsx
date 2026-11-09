"use client";
import Link from "next/link";
import { useState } from "react";
import * as Icons from "lucide-react";
import { ArrowRight, Flame, Lock, Pencil, RotateCcw, Sparkles, Target, Trophy, Users } from "lucide-react";
import { AVAILABLE_CHAPTERS, MODULES, chapterById } from "@/content/modules";
import {
  BADGES,
  chapterMastery,
  dayKey,
  levelFromXp,
  resetProgress,
  setName,
  setWeeklyGoal,
  streak,
  useProgress,
  weekExercises,
} from "@/lib/progress/store";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Progress } from "@/components/ui";
import { cn } from "@/lib/utils";

function Stat({ icon: Icon, label, value, sub, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; sub?: React.ReactNode; tone: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-5">
        <span className={cn("flex size-11 items-center justify-center rounded-xl", tone)}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-bold tabular-nums">{value}</div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function Heatmap({ days }: { days: string[] }) {
  const set = new Set(days);
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - (7 * 16 - 1) - ((today.getDay() + 6) % 7));
  const weeks: Date[][] = [];
  const cur = new Date(start);
  while (cur <= today) {
    const w: Date[] = [];
    for (let k = 0; k < 7; k++) {
      w.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(w);
  }
  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {weeks.map((w, i) => (
        <div key={i} className="flex flex-col gap-1">
          {w.map((d) => {
            const k = dayKey(d);
            const future = d > today;
            return (
              <span
                key={k}
                title={d.toLocaleDateString("fr-FR")}
                className={cn("size-3 rounded-[3px]", future ? "bg-transparent" : set.has(k) ? "bg-primary" : "bg-muted")}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function Dashboard() {
  const s = useProgress();
  const [editing, setEditing] = useState(false);
  const lv = levelFromXp(s.xp);
  const st = streak(s);
  const week = weekExercises(s);
  const exercises = s.attempts.filter((a) => a.kind === "exercise");
  const success = exercises.length ? Math.round((100 * exercises.filter((a) => a.score === a.max).length) / exercises.length) : 0;
  const next = AVAILABLE_CHAPTERS.find((c) => chapterMastery(s, c.id) < 80);
  const nextRef = next ? chapterById(next.id) : undefined;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card className="overflow-hidden">
        <div className="relative bg-[#0b1530] p-6 text-white dark:bg-[#0f1b40]">
          <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]" aria-hidden>
            <defs>
              <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M28 0H0V28" fill="none" stroke="#4d84ff" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="text-sm text-white/70">Tableau de bord</div>
              {editing ? (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setEditing(false);
                  }}
                >
                  <Input autoFocus defaultValue={s.name} placeholder="Votre prénom" className="h-9 max-w-[220px] bg-white text-[#0b1530]" onChange={(e) => setName(e.target.value)} />
                  <Button size="sm" type="submit">
                    OK
                  </Button>
                </form>
              ) : (
                <h1 className="flex items-center gap-2 text-2xl font-bold">
                  Bonjour{s.name ? ` ${s.name}` : ""} 👋
                  <button type="button" aria-label="Modifier le prénom" className="rounded p-1 text-white/60 hover:text-white cursor-pointer" onClick={() => setEditing(true)}>
                    <Pencil className="size-4" />
                  </button>
                </h1>
              )}
              <p className="text-sm text-white/70">Niveau {lv.level} · {s.xp} XP</p>
            </div>
            <div className="w-full max-w-xs space-y-1.5">
              <div className="flex justify-between text-xs text-white/70">
                <span>Niveau {lv.level}</span>
                <span>
                  {s.xp - lv.floor} / {lv.next - lv.floor} XP
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-[#4d84ff] transition-[width] duration-500" style={{ width: `${lv.ratio * 100}%` }} />
              </div>
              <div className="text-right text-xs text-white/60">Niveau {lv.level + 1} à {lv.next} XP</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Chiffres clés */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Flame} label="Série en cours" value={`${st.current} jour${st.current > 1 ? "s" : ""}`} sub={`Record : ${st.best} · ${st.activeToday ? "objectif du jour atteint" : "faites un exercice aujourd'hui"}`} tone="bg-warning-soft text-warning" />
        <Stat icon={Sparkles} label="Expérience" value={`${s.xp} XP`} sub={`Niveau ${lv.level}`} tone="bg-primary-soft text-primary" />
        <Stat icon={Target} label="Exercices réalisés" value={exercises.length} sub={`${success} % entièrement réussis`} tone="bg-success-soft text-success" />
        <Stat icon={Trophy} label="Badges" value={`${Object.keys(s.badges).length} / ${BADGES.length}`} sub={`${Object.keys(s.examsPassed).length} module(s) validé(s)`} tone="bg-danger-soft text-danger" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Reprendre */}
          {nextRef && (
            <Card className="border-primary/40">
              <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-primary">Continuer</div>
                  <div className="font-semibold">{nextRef.chapter.title}</div>
                  <div className="text-sm text-muted-foreground">
                    Module {nextRef.module.number} · maîtrise {chapterMastery(s, nextRef.chapter.id)} %
                  </div>
                </div>
                <Button asChild>
                  <Link href={`/cours/${nextRef.module.slug}/${nextRef.chapter.slug}`}>
                    Reprendre <ArrowRight />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Progression par module */}
          <Card>
            <CardHeader>
              <CardTitle>Progression par module</CardTitle>
              <CardDescription>Maîtrise moyenne des chapitres disponibles : lecture, quiz et exercices réussis.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {MODULES.map((m) => {
                const chs = m.chapters.filter((c) => c.available);
                const mastery = chs.length ? Math.round(chs.reduce((a, c) => a + chapterMastery(s, c.id), 0) / chs.length) : 0;
                const exam = s.examsPassed[m.id];
                return (
                  <div key={m.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <Link href={`/cours/${m.slug}`} className="font-medium hover:underline">
                        {m.number}. {m.title}
                      </Link>
                      <div className="flex items-center gap-2">
                        {exam && <Badge variant="success">validé</Badge>}
                        <span className="w-10 text-right tabular-nums text-muted-foreground">{mastery} %</span>
                      </div>
                    </div>
                    <Progress value={mastery} tone={exam ? "success" : "primary"} />
                    <div className="flex flex-wrap gap-1.5">
                      {chs.map((c) => (
                        <Link
                          key={c.id}
                          href={`/cours/${m.slug}/${c.slug}`}
                          className={cn(
                            "rounded-md border px-2 py-0.5 text-[11px]",
                            chapterMastery(s, c.id) >= 80 ? "border-success/40 bg-success-soft text-success" : chapterMastery(s, c.id) > 0 ? "border-primary/30 bg-primary-soft text-primary" : "border-border text-muted-foreground",
                          )}
                        >
                          {c.title} · {chapterMastery(s, c.id)} %
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Historique */}
          <Card>
            <CardHeader>
              <CardTitle>Historique des résultats</CardTitle>
            </CardHeader>
            <CardContent>
              {s.attempts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun résultat pour l&apos;instant. Commencez par un{" "}
                  <Link href="/exercices" className="text-primary hover:underline">
                    exercice
                  </Link>{" "}
                  ou un quiz de chapitre.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {[...s.attempts]
                    .reverse()
                    .slice(0, 12)
                    .map((a, k) => (
                      <div key={k} className="flex items-center gap-3 py-2 text-sm">
                        <Badge variant={a.kind === "exercise" ? "default" : a.kind === "quiz" ? "muted" : "warning"}>{a.kind === "exercise" ? "exercice" : a.kind}</Badge>
                        <span className="min-w-0 flex-1 truncate">{a.title}</span>
                        <span className={cn("tabular-nums font-medium", a.score === a.max ? "text-success" : "text-muted-foreground")}>
                          {a.score}/{a.max}
                        </span>
                        <span className="w-14 text-right text-xs text-primary">+{a.xp} XP</span>
                        <span className="hidden w-24 text-right text-xs text-muted-foreground sm:block">{new Date(a.date).toLocaleDateString("fr-FR")}</span>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Objectif hebdomadaire */}
          <Card>
            <CardHeader>
              <CardTitle>Objectif de la semaine</CardTitle>
              <CardDescription>Exercices réalisés depuis lundi.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold tabular-nums">
                  {week}
                  <span className="text-base font-medium text-muted-foreground"> / {s.weeklyGoal}</span>
                </span>
                {week >= s.weeklyGoal && <Badge variant="success">atteint</Badge>}
              </div>
              <Progress value={(100 * week) / s.weeklyGoal} tone={week >= s.weeklyGoal ? "success" : "primary"} />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Objectif :
                {[10, 15, 25, 40].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setWeeklyGoal(g)}
                    className={cn("rounded-md border px-2 py-0.5 cursor-pointer", s.weeklyGoal === g ? "border-primary bg-primary-soft text-primary" : "border-border hover:border-primary/40")}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Activité */}
          <Card>
            <CardHeader>
              <CardTitle>Activité</CardTitle>
              <CardDescription>16 dernières semaines.</CardDescription>
            </CardHeader>
            <CardContent>
              <Heatmap days={s.activeDays} />
            </CardContent>
          </Card>

          {/* Badges */}
          <Card>
            <CardHeader>
              <CardTitle>Badges</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {BADGES.map((b) => {
                const unlocked = !!s.badges[b.id];
                const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[b.icon] ?? Trophy;
                return (
                  <div key={b.id} className={cn("rounded-lg border p-2.5", unlocked ? "border-warning/40 bg-warning-soft" : "border-border opacity-55")} title={b.description}>
                    <div className="flex items-center gap-2">
                      {unlocked ? <Icon className="size-4 text-warning" /> : <Lock className="size-4 text-muted-foreground" />}
                      <span className="text-xs font-semibold">{b.title}</span>
                    </div>
                    <div className="mt-1 text-[11px] leading-snug text-muted-foreground">{b.description}</div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Classement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4" /> Classement
              </CardTitle>
              <CardDescription>Facultatif, entre étudiants d&apos;une même promotion.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Le classement nécessite des comptes partagés : il sera activé avec la connexion Supabase (phase « comptes utilisateurs »). Votre progression est
              aujourd&apos;hui enregistrée dans ce navigateur uniquement.
            </CardContent>
          </Card>

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              if (window.confirm("Effacer toute la progression enregistrée dans ce navigateur ?")) resetProgress();
            }}
          >
            <RotateCcw /> Réinitialiser ma progression
          </Button>
        </div>
      </div>
    </div>
  );
}
