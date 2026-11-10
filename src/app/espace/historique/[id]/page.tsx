import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, CircleCheck, CircleX, RotateCcw } from "lucide-react";
import { z } from "zod";
import { Container, PageHeader } from "@/components/layout/app-shell";
import { Badge, Button, Callout, Card, CardContent } from "@/components/ui";
import { Md } from "@/components/math";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { findGenerator } from "@/lib/exercises/generators";
import { formatDuration, SOURCE_LABEL } from "@/lib/learning/stats";
import { CorrectionView, type Correction } from "@/components/exercises/db-exercise";

export const metadata: Metadata = { title: "Détail d'une tentative" };

interface DbResult {
  question_id: string;
  kind: "qcm" | "numeric" | "free";
  correct: boolean | null;
  points: number;
  earned: number;
  given: unknown;
  correct_answer_ids?: string[] | null;
  expected_value?: number | null;
  unit?: string;
  model_answer_md?: string;
  explanation_md?: string;
  // exercices générés
  key?: string;
  ok?: boolean;
  expected?: number;
}

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  await requireUser(`/espace/historique/${id}`);
  const supabase = await createClient();
  // RLS : seules ses propres tentatives sont visibles (une autre → introuvable).
  const { data: a } = await supabase.from("attempts").select("*").eq("id", id).maybeSingle();
  if (!a) notFound();

  let questions: { id: string; prompt_md: string; kind: string; answers: { id: string; label_md: string }[] }[] = [];
  let correction: Correction | null = null;
  let redo: string | null = null;
  if (a.source === "exercise" && a.exercise_id) {
    const { data: qs } = await supabase.from("questions").select("id, prompt_md, kind, answers(id, label_md, position)").eq("exercise_id", a.exercise_id).order("position");
    questions = (qs ?? []) as typeof questions;
    const { data: c } = await supabase.rpc("get_correction", { p_exercise_id: a.exercise_id });
    correction = (c as Correction | null) ?? null;
    if (a.subject_slug) redo = `/matieres/${a.subject_slug}/exercices/${a.exercise_id}`;
  } else if (a.source === "generator") {
    const gen = findGenerator(String(a.item_key).slice(10));
    if (gen) redo = `/exercices/${gen.id}${a.seed ? `?seed=${a.seed}` : ""}`;
  }
  const results = (a.results ?? []) as DbResult[];

  return (
    <Container className="max-w-3xl">
      <Link href="/espace/historique" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Historique
      </Link>
      <PageHeader
        eyebrow={SOURCE_LABEL[a.source]}
        title={a.title}
        description={`${new Date(a.created_at).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Paris" })}${a.duration_seconds ? ` · ${formatDuration(a.duration_seconds)}` : ""}`}
        actions={
          redo ? (
            <Button asChild>
              <Link href={redo}>
                <RotateCcw /> Refaire
              </Link>
            </Button>
          ) : undefined
        }
      />
      <Card className="mb-4">
        <CardContent className="flex items-center justify-between pt-5">
          <span className="text-sm text-muted-foreground">Score</span>
          <span className="text-2xl font-bold tabular-nums">{Number(a.max_score) > 0 ? `${Number(a.score)} / ${Number(a.max_score)}` : "à auto-évaluer"}</span>
        </CardContent>
      </Card>

      {a.source === "exercise" ? (
        <div className="space-y-3">
          {questions.map((q, i) => {
            const r = results.find((x) => x.question_id === q.id);
            return (
              <Card key={q.id}>
                <CardContent className="space-y-2 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-xs font-semibold text-muted-foreground">Question {i + 1}</div>
                    {r?.correct === true && <Badge variant="success"><CircleCheck className="size-3" /> juste</Badge>}
                    {r?.correct === false && <Badge variant="danger"><CircleX className="size-3" /> fausse</Badge>}
                    {r?.correct === null && <Badge variant="muted">réponse libre</Badge>}
                  </div>
                  <Md>{q.prompt_md}</Md>
                  {q.kind === "qcm" && (
                    <ul className="space-y-1 text-sm">
                      {q.answers.map((ans) => {
                        const chosen = Array.isArray(r?.given) && (r.given as string[]).includes(ans.id);
                        const right = r?.correct_answer_ids?.includes(ans.id);
                        return (
                          <li key={ans.id} className={`rounded-lg border px-3 py-1.5 ${right ? "border-success/50 bg-success-soft" : chosen ? "border-danger/50 bg-danger-soft" : "border-border"}`}>
                            <Md>{ans.label_md}</Md>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {q.kind === "numeric" && (
                    <p className="text-sm">
                      Votre réponse : <strong>{r?.given === null || r?.given === undefined ? "—" : String(r.given)}</strong> {r?.unit} · attendu :{" "}
                      <strong>{r?.expected_value ?? "—"}</strong> {r?.unit}
                    </p>
                  )}
                  {q.kind === "free" && (
                    <div className="space-y-2 text-sm">
                      <p className="whitespace-pre-wrap rounded-lg bg-muted p-3">{String(r?.given ?? "")}</p>
                      {r?.model_answer_md && (
                        <Callout title="Réponse attendue">
                          <Md>{r.model_answer_md}</Md>
                        </Callout>
                      )}
                    </div>
                  )}
                  {r?.explanation_md && <Md className="text-sm text-muted-foreground">{r.explanation_md}</Md>}
                </CardContent>
              </Card>
            );
          })}
          {correction && <CorrectionView correction={correction} />}
        </div>
      ) : a.source === "generator" ? (
        <Card>
          <CardContent className="pt-5">
            <ul className="space-y-1.5 text-sm">
              {results.map((r) => (
                <li key={r.key} className="flex items-center justify-between gap-2">
                  <span>Question {r.key}</span>
                  <span>
                    {r.ok ? <CircleCheck className="inline size-4 text-success" /> : <CircleX className="inline size-4 text-danger" />} réponse {r.given === null ? "—" : String(r.given)} · attendu {Number(r.expected).toPrecision(4)} {r.unit}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">La correction détaillée se rouvre avec « Refaire » (mêmes données).</p>
          </CardContent>
        </Card>
      ) : (
        <Callout>Tentative de {SOURCE_LABEL[a.source].toLowerCase()} : seul le score est conservé.</Callout>
      )}
    </Container>
  );
}
