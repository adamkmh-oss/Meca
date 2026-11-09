"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, CircleCheck, CircleX, Clock, RotateCcw, Trophy } from "lucide-react";
import type { QuizQuestion } from "@/content/types";
import { Md } from "@/components/math";
import { Badge, Button, Callout, Card, CardContent, Progress, Segmented } from "@/components/ui";
import { ExercisePlayer } from "@/components/exercises/exercise-player";
import { findGenerator, mulberry32 } from "@/lib/exercises/generators";
import { chapterMastery, markChapterRead, recordAttempt, useProgress } from "@/lib/progress/store";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*                                 Quiz                                */
/* ------------------------------------------------------------------ */
export function Quiz({ chapterId, moduleId, title, questions }: { chapterId: string; moduleId: string; title: string; questions: QuizQuestion[] }) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const done = idx >= questions.length;
  const q = questions[Math.min(idx, questions.length - 1)];
  const score = answers.filter(Boolean).length;

  const validate = () => {
    if (picked === null) return;
    const ok = picked === q.answer;
    const next = [...answers, ok];
    setAnswers(next);
    if (next.length === questions.length) {
      const s = next.filter(Boolean).length;
      recordAttempt({ kind: "quiz", ref: chapterId, title: `Quiz — ${title}`, chapter: chapterId, module: moduleId, score: s, max: questions.length, xp: 5 * s });
    }
  };
  const restart = () => {
    setIdx(0);
    setPicked(null);
    setAnswers([]);
  };

  if (done) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-5 text-center">
          <Trophy className={cn("mx-auto size-10", score === questions.length ? "text-warning" : "text-primary")} />
          <div className="text-2xl font-bold">
            {score} / {questions.length}
          </div>
          <p className="text-sm text-muted-foreground">
            {score === questions.length ? "Sans faute ! " : score >= questions.length * 0.7 ? "Bien maîtrisé. " : "Relisez les points clés puis retentez. "}+{5 * score} XP
          </p>
          <Button variant="outline" onClick={restart}>
            <RotateCcw /> Recommencer
          </Button>
        </CardContent>
      </Card>
    );
  }

  const answered = answers.length > idx;
  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex items-center gap-3">
          <Progress value={(answers.length / questions.length) * 100} />
          <span className="shrink-0 text-xs text-muted-foreground">
            {idx + 1}/{questions.length}
          </span>
        </div>
        <Md className="font-medium">{q.prompt}</Md>
        <div className="grid gap-2">
          {q.choices.map((c, k) => {
            const isRight = answered && k === q.answer;
            const isWrong = answered && k === picked && k !== q.answer;
            return (
              <button
                key={k}
                type="button"
                disabled={answered}
                onClick={() => setPicked(k)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors cursor-pointer disabled:cursor-default",
                  !answered && picked === k ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40",
                  isRight && "border-success bg-success-soft",
                  isWrong && "border-danger bg-danger-soft",
                )}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold">{String.fromCharCode(65 + k)}</span>
                <Md className="[&_p]:m-0">{c}</Md>
                {isRight && <CircleCheck className="ml-auto size-5 shrink-0 text-success" />}
                {isWrong && <CircleX className="ml-auto size-5 shrink-0 text-danger" />}
              </button>
            );
          })}
        </div>
        {answered && (
          <Callout tone={answers[idx] ? "success" : "danger"} title={answers[idx] ? "Exact" : "Pas tout à fait"}>
            <Md className="[&_p]:m-0">{q.explanation}</Md>
          </Callout>
        )}
        <div className="flex justify-end">
          {!answered ? (
            <Button onClick={validate} disabled={picked === null}>
              Valider
            </Button>
          ) : (
            <Button
              onClick={() => {
                setIdx((i) => i + 1);
                setPicked(null);
              }}
            >
              {idx + 1 < questions.length ? "Question suivante" : "Voir le résultat"} <ArrowRight />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*                      Exercices liés au chapitre                      */
/* ------------------------------------------------------------------ */
export function ChapterExercises({ ids }: { ids: string[] }) {
  const [sel, setSel] = useState(ids[0]);
  const gens = ids.map((id) => findGenerator(id)!).filter(Boolean);
  return (
    <div className="space-y-3">
      {gens.length > 1 && (
        <Segmented
          size="sm"
          value={sel}
          onChange={setSel}
          options={gens.map((g) => ({ value: g.id, label: g.title.length > 38 ? `${g.title.slice(0, 36)}…` : g.title }))}
        />
      )}
      <ExercisePlayer key={sel} generatorId={sel} compact />
      <p className="text-xs text-muted-foreground">
        Chaque tirage change les données. Plus d&apos;exercices dans la{" "}
        <Link href="/exercices" className="text-primary hover:underline">
          banque d&apos;exercices
        </Link>
        .
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                        Lecture et maîtrise                           */
/* ------------------------------------------------------------------ */
export function ReadMarker({ chapterId }: { chapterId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const s = useProgress();
  const read = !!s.chaptersRead[chapterId];
  useEffect(() => {
    const el = ref.current;
    if (!el || read) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) markChapterRead(chapterId);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [chapterId, read]);
  return (
    <div ref={ref} className="flex items-center gap-2 text-sm text-muted-foreground">
      {read ? (
        <>
          <Check className="size-4 text-success" /> Cours lu (+5 XP)
        </>
      ) : (
        "Fin du cours"
      )}
    </div>
  );
}

export function MasteryBadge({ chapterId, className }: { chapterId: string; className?: string }) {
  const s = useProgress();
  const m = chapterMastery(s, chapterId);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Progress value={m} tone={m >= 80 ? "success" : "primary"} className="h-1.5 w-20" />
      <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{m} %</span>
    </div>
  );
}

export function ModuleMastery({ chapterIds }: { chapterIds: string[] }) {
  const s = useProgress();
  const m = chapterIds.length ? Math.round(chapterIds.reduce((a, id) => a + chapterMastery(s, id), 0) / chapterIds.length) : 0;
  return (
    <div className="flex items-center gap-2">
      <Progress value={m} tone={m >= 80 ? "success" : "primary"} />
      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{m} %</span>
    </div>
  );
}

export function ExamStatus({ moduleId }: { moduleId: string }) {
  const s = useProgress();
  const e = s.examsPassed[moduleId];
  return e ? <Badge variant="success">Module validé · {Math.round(e.score * 100)} %</Badge> : <Badge variant="muted">Examen non validé</Badge>;
}

/* ------------------------------------------------------------------ */
/*                           Examen de module                           */
/* ------------------------------------------------------------------ */
interface ExamItemQuiz {
  kind: "quiz";
  q: QuizQuestion;
  chapter: string;
}
interface ExamItemEx {
  kind: "exercise";
  gen: string;
  seed: number;
}

export function ModuleExam({
  moduleId,
  moduleTitle,
  pool,
  generators,
}: {
  moduleId: string;
  moduleTitle: string;
  pool: { chapter: string; q: QuizQuestion }[];
  generators: string[];
}) {
  const [seed, setSeed] = useState<number | null>(null);
  const [started, setStarted] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const items = useMemo(() => {
    if (seed === null) return [];
    const r = mulberry32(seed);
    const shuffled = [...pool].sort(() => r() - 0.5).slice(0, 8);
    const ex = [...generators].sort(() => r() - 0.5).slice(0, 2);
    const list: (ExamItemQuiz | ExamItemEx)[] = [
      ...shuffled.map((p) => ({ kind: "quiz" as const, q: p.q, chapter: p.chapter })),
      ...ex.map((g, k) => ({ kind: "exercise" as const, gen: g, seed: Math.floor(r() * 900000) + 1 + k })),
    ];
    return list;
  }, [seed, pool, generators]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [exScores, setExScores] = useState<Record<number, { score: number; max: number }>>({});
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!started || finished) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [started, finished]);

  const start = () => {
    setSeed(Math.floor(Math.random() * 1e6) + 1);
    setStarted(Date.now());
    setNow(Date.now());
    setQuizAnswers({});
    setExScores({});
    setFinished(false);
  };

  if (seed === null) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-5">
          <p className="text-sm">
            L&apos;examen tire au hasard <strong>8 questions</strong> parmi les quiz du module et <strong>2 exercices</strong> à données variables. Il est validé à partir de{" "}
            <strong>70 %</strong> de réussite (+100 XP la première fois).
          </p>
          <Button onClick={start}>Commencer l&apos;examen</Button>
        </CardContent>
      </Card>
    );
  }

  const quizItems = items.map((it, i) => ({ it, i })).filter((x) => x.it.kind === "quiz");
  const exItems = items.map((it, i) => ({ it, i })).filter((x) => x.it.kind === "exercise");
  const total = quizItems.length + exItems.reduce((a, x) => a + (exScores[x.i]?.max ?? findGenerator((x.it as ExamItemEx).gen)!.generate((x.it as ExamItemEx).seed).questions.length), 0);
  const got =
    quizItems.filter(({ it, i }) => quizAnswers[i] === (it as ExamItemQuiz).q.answer).length + Object.values(exScores).reduce((a, s) => a + s.score, 0);
  const allAnswered = quizItems.every(({ i }) => quizAnswers[i] !== undefined) && exItems.every(({ i }) => exScores[i]);
  const elapsed = started ? Math.floor(((finished ? now : now) - started) / 1000) : 0;

  const finish = () => {
    setFinished(true);
    recordAttempt({ kind: "exam", ref: moduleId, title: `Examen — ${moduleTitle}`, module: moduleId, score: got, max: total, xp: got / total >= 0.7 ? 100 : 20 });
  };

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-10 flex items-center justify-between rounded-xl border border-border bg-card/95 px-4 py-2 backdrop-blur lg:top-2">
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="size-4" /> {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
        </span>
        <span className="text-sm">
          {Object.keys(quizAnswers).length + Object.keys(exScores).length} / {items.length} réponses
        </span>
        {!finished ? (
          <Button size="sm" onClick={finish} disabled={!allAnswered}>
            Terminer
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={start}>
            <RotateCcw /> Nouvel examen
          </Button>
        )}
      </div>

      {finished && (
        <Callout tone={got / total >= 0.7 ? "success" : "warning"} title={got / total >= 0.7 ? "Examen validé" : "Examen non validé"}>
          Score : {got} / {total} ({Math.round((100 * got) / total)} %). {got / total >= 0.7 ? "Le module est validé dans votre tableau de bord." : "Il faut 70 % : revoyez les chapitres concernés puis retentez."}
        </Callout>
      )}

      {quizItems.map(({ it, i }, n) => {
        const q = (it as ExamItemQuiz).q;
        const a = quizAnswers[i];
        return (
          <Card key={i}>
            <CardContent className="space-y-3 pt-5">
              <div className="text-xs font-semibold text-primary">Question {n + 1}</div>
              <Md className="font-medium">{q.prompt}</Md>
              <div className="grid gap-2 sm:grid-cols-2">
                {q.choices.map((c, k) => (
                  <button
                    key={k}
                    type="button"
                    disabled={finished}
                    onClick={() => setQuizAnswers((s) => ({ ...s, [i]: k }))}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-sm cursor-pointer disabled:cursor-default",
                      a === k ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40",
                      finished && k === q.answer && "border-success bg-success-soft",
                      finished && a === k && k !== q.answer && "border-danger bg-danger-soft",
                    )}
                  >
                    <Md className="[&_p]:m-0">{c}</Md>
                  </button>
                ))}
              </div>
              {finished && <Md className="text-sm text-muted-foreground">{q.explanation}</Md>}
            </CardContent>
          </Card>
        );
      })}
      {exItems.map(({ it, i }, n) => (
        <div key={i} className="space-y-2">
          <div className="text-xs font-semibold text-primary">Exercice {n + 1}</div>
          <ExercisePlayer
            generatorId={(it as ExamItemEx).gen}
            initialSeed={(it as ExamItemEx).seed}
            allowNew={false}
            record={false}
            compact
            hideHelp={!finished}
            onDone={(o) => setExScores((s) => (s[i] ? s : { ...s, [i]: o }))}
          />
        </div>
      ))}
    </div>
  );
}
