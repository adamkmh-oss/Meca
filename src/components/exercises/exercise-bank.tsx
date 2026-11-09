"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CircleCheck } from "lucide-react";
import { GENERATORS } from "@/lib/exercises/generators";
import { MODULES, chapterById } from "@/content/modules";
import { LEVEL_LABEL, type Level } from "@/content/types";
import { Badge, Card, CardContent, Label, Select } from "@/components/ui";
import { useProgress } from "@/lib/progress/store";

export function ExerciseBank() {
  const [moduleId, setModuleId] = useState("all");
  const [level, setLevel] = useState<"all" | Level>("all");
  const [calc, setCalc] = useState("all");
  const progress = useProgress();
  const calcs = useMemo(() => [...new Set(GENERATORS.map((g) => g.calc))], []);
  const list = GENERATORS.filter((g) => {
    const ch = chapterById(g.chapterId);
    return (moduleId === "all" || ch?.module.id === moduleId) && (level === "all" || g.level === level) && (calc === "all" || g.calc === calc);
  });
  const doneCount = (id: string) => progress.attempts.filter((a) => a.kind === "exercise" && a.ref.startsWith(`${id}#`) && a.score === a.max).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="f-mod">Module</Label>
          <Select id="f-mod" value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
            <option value="all">Tous les modules</option>
            {MODULES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.number}. {m.title}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-lvl">Difficulté</Label>
          <Select id="f-lvl" value={level} onChange={(e) => setLevel(e.target.value as "all" | Level)}>
            <option value="all">Tous niveaux</option>
            <option value="debutant">Débutant</option>
            <option value="intermediaire">Intermédiaire</option>
            <option value="avance">Avancé</option>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-calc">Type de calcul</Label>
          <Select id="f-calc" value={calc} onChange={(e) => setCalc(e.target.value)}>
            <option value="all">Tous les calculs</option>
            {calcs.map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {list.length} type{list.length > 1 ? "s" : ""} d&apos;exercice. Chaque type génère des données différentes à chaque tirage : refaites-le autant de fois que nécessaire.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((g) => {
          const ch = chapterById(g.chapterId);
          const done = doneCount(g.id);
          return (
            <Link key={g.id} href={`/exercices/${g.id}`} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/60">
                <CardContent className="flex h-full flex-col gap-2 pt-5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={g.level === "debutant" ? "success" : g.level === "intermediaire" ? "default" : "warning"}>{LEVEL_LABEL[g.level]}</Badge>
                    <Badge variant="outline">{g.calc}</Badge>
                    {done > 0 && (
                      <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-success">
                        <CircleCheck className="size-3.5" /> réussi {done}×
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold leading-snug">{g.title}</h3>
                  <p className="text-sm text-muted-foreground">{g.description}</p>
                  <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted-foreground">
                    <span>
                      Module {ch?.module.number} · {ch?.chapter.title}
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-primary">
                      S&apos;entraîner <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">Compétence : {g.skill}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
