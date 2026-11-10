"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CircleCheck, CircleX, Eye, Lightbulb, Shuffle } from "lucide-react";
import { checkAnswer, findGenerator, randomSeed } from "@/lib/exercises/generators";
import { parseNum } from "@/components/simulator/fields";
import { Md } from "@/components/math";
import { Badge, Button, Callout, Card, CardContent, Input } from "@/components/ui";
import { ExerciseFigureView } from "./exercise-figure";
import { recordAttempt, XP_BY_LEVEL } from "@/lib/progress/store";
import { useViewer } from "@/components/layout/viewer";
import { saveGeneratorAttempt } from "@/app/actions/learning";
import { chapterById } from "@/content/modules";
import { LEVEL_LABEL } from "@/content/types";
import { cn } from "@/lib/utils";

const SOLUTION_PARTS: { key: keyof import("@/lib/exercises/types").ExerciseSolution; title: string }[] = [
  { key: "donnees", title: "1. Données" },
  { key: "schema", title: "2. Schéma mécanique" },
  { key: "equations", title: "3. Équations" },
  { key: "calculs", title: "4. Calculs détaillés" },
  { key: "resultat", title: "5. Résultat" },
  { key: "verification", title: "6. Vérification de cohérence" },
];

export interface ExerciseOutcome {
  score: number;
  max: number;
  /** Réponses brutes (le serveur recorrige à partir d'elles). */
  values: Record<string, number | null>;
}

export function ExercisePlayer({
  generatorId,
  initialSeed,
  onSeedChange,
  onDone,
  record = true,
  allowNew = true,
  compact = false,
  hideHelp = false,
}: {
  generatorId: string;
  initialSeed?: number;
  onSeedChange?: (seed: number) => void;
  /** Appelé à la première vérification (examens). */
  onDone?: (o: ExerciseOutcome) => void;
  record?: boolean;
  allowNew?: boolean;
  compact?: boolean;
  /** Mode examen : ni indice, ni correction, ni retour avant la fin. */
  hideHelp?: boolean;
}) {
  const gen = findGenerator(generatorId);
  const [seed, setSeed] = useState(initialSeed ?? 1);
  useEffect(() => {
    if (initialSeed === undefined) setSeed(randomSeed());
  }, [initialSeed]);
  const ex = useMemo(() => gen?.generate(seed), [gen, seed]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [hints, setHints] = useState<Record<string, boolean>>({});
  const [showSolution, setShowSolution] = useState(false);
  const viewer = useViewer();
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
    setValues({});
    setChecked(false);
    setRecorded(false);
    setHints({});
    setShowSolution(false);
  }, [seed, generatorId]);

  if (!gen || !ex) return <Callout tone="danger">Exercice introuvable.</Callout>;

  const results = ex.questions.map((q) => {
    const v = parseNum(values[q.key] ?? "");
    return { q, v, ok: v !== null && checkAnswer(v, q.answer, q.rel, q.abs) };
  });
  const score = results.filter((r) => r.ok).length;
  const feedback = checked && !hideHelp;
  const locked = hideHelp && recorded;
  const allFilled = results.every((r) => r.v !== null);

  const verify = () => {
    setChecked(true);
    if (!recorded) {
      setRecorded(true);
      const max = ex.questions.length;
      const raw = Object.fromEntries(results.map((r) => [r.q.key, r.v]));
      if (record) {
        const ch = chapterById(gen.chapterId);
        recordAttempt({
          kind: "exercise",
          ref: `${gen.id}#${seed}`,
          title: gen.title,
          chapter: gen.chapterId,
          module: ch?.module.id,
          level: gen.level,
          score,
          max,
          xp: Math.round((XP_BY_LEVEL[gen.level] * score) / max),
        });
      }
      if (record && viewer) void saveGeneratorAttempt({ generatorId: gen.id, seed, values: raw, durationSeconds: Math.round((Date.now() - startedAt.current) / 1000) });
      onDone?.({ score, max, values: raw });
    }
  };

  const fresh = () => {
    const s = randomSeed();
    setSeed(s);
    onSeedChange?.(s);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className={cn("space-y-4", compact ? "pt-4" : "pt-5")}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={gen.level === "debutant" ? "success" : gen.level === "intermediaire" ? "default" : "warning"}>{LEVEL_LABEL[gen.level]}</Badge>
            <Badge variant="outline">{gen.calc}</Badge>
            <span className="ml-auto text-xs text-muted-foreground">Exercice n° {seed}</span>
          </div>
          {!compact && <h2 className="text-lg font-semibold">{ex.title}</h2>}
          <Md>{ex.statement}</Md>
          {ex.figure && (
            <div className="rounded-lg border border-border bg-background/60 p-2">
              <ExerciseFigureView figure={ex.figure} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-5">
          {results.map(({ q, ok: good, v }) => (
            <div key={q.key} className="space-y-1.5">
              <div className="grid items-center gap-2 sm:grid-cols-[1fr_220px_auto]">
                <div className="text-sm">
                  <Md className="[&_p]:m-0">{q.label}</Md>
                </div>
                <div className="relative">
                  <Input
                    inputMode="decimal"
                    placeholder="Votre réponse"
                    aria-label={`Réponse : ${q.label.replace(/\$/g, "")}`}
                    value={values[q.key] ?? ""}
                    disabled={locked}
                    onChange={(e) => {
                      setValues((s) => ({ ...s, [q.key]: e.target.value }));
                      if (checked) setChecked(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && allFilled) verify();
                    }}
                    className={cn(q.unit && "pr-16", feedback && (good ? "border-success" : "border-danger"))}
                  />
                  {q.unit && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">{q.unit}</span>}
                </div>
                <div className="flex items-center gap-1">
                  {feedback && (good ? <CircleCheck className="size-5 text-success" /> : <CircleX className="size-5 text-danger" />)}
                  {!hideHelp && (
                    <Button variant="ghost" size="sm" onClick={() => setHints((h) => ({ ...h, [q.key]: !h[q.key] }))}>
                      <Lightbulb /> Indice
                    </Button>
                  )}
                </div>
              </div>
              {hints[q.key] && (
                <div className="rounded-lg bg-warning-soft px-3 py-2 text-sm">
                  <Md className="[&_p]:m-0">{q.hint}</Md>
                </div>
              )}
              {feedback && !good && v !== null && (
                <p className="text-xs text-danger">
                  {Math.abs(v + q.answer) <= Math.max(0.01 * Math.abs(q.answer), 0.01) && Math.abs(q.answer) > 1e-9
                    ? "La valeur absolue est juste, mais le signe est faux : revoyez la convention de signe."
                    : Math.abs(q.answer) > 1e-9 && [10, 100, 1000, 1e4, 1e6].some((f) => Math.abs(v * f - q.answer) <= 0.02 * Math.abs(q.answer) || Math.abs(v / f - q.answer) <= 0.02 * Math.abs(q.answer))
                      ? "Les chiffres sont justes mais pas l'ordre de grandeur : vérifiez les conversions d'unités."
                      : "Ce n'est pas la bonne valeur. Consultez l'indice, puis réessayez."}
                </p>
              )}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button onClick={verify} disabled={!allFilled || locked}>
              {hideHelp ? (locked ? "Réponse enregistrée" : "Valider ma réponse") : "Vérifier"}
            </Button>
            {!hideHelp && (
              <Button variant="outline" onClick={() => setShowSolution((s) => !s)} disabled={!checked && !recorded}>
                <Eye /> {showSolution ? "Masquer la correction" : "Voir la correction détaillée"}
              </Button>
            )}
            {allowNew && (
              <Button variant="ghost" onClick={fresh}>
                <Shuffle /> Nouvelles données
              </Button>
            )}
            {feedback && (
              <span className={cn("ml-auto text-sm font-semibold", score === ex.questions.length ? "text-success" : "text-muted-foreground")}>
                {score} / {ex.questions.length} {score === ex.questions.length ? "— bravo !" : ""}
              </span>
            )}
          </div>
          {!checked && !recorded && !hideHelp && <p className="text-xs text-muted-foreground">Saisissez toutes les réponses (virgule ou point acceptés) puis vérifiez. La correction détaillée se débloque après une première vérification. Tolérance : 1 %.</p>}
        </CardContent>
      </Card>

      {showSolution && !hideHelp && (
        <Card className="animate-rise">
          <CardContent className="space-y-4 pt-5">
            <h3 className="text-base font-semibold">Correction détaillée</h3>
            {SOLUTION_PARTS.map((p) => (
              <section key={p.key} className="space-y-1">
                <h4 className="text-sm font-semibold text-primary">{p.title}</h4>
                <Md>{ex.solution[p.key]}</Md>
              </section>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
