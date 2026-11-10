"use client";
/**
 * Exercice rédigé par l'équipe pédagogique (base de données) : QCM, réponses
 * numériques, réponses libres. La correction est calculée par la base après
 * envoi ; les réponses attendues ne sont jamais envoyées avant.
 */
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { CircleCheck, CircleX, LoaderCircle, RotateCcw, Send } from "lucide-react";
import { Md } from "@/components/math";
import { Badge, Button, Callout, Card, CardContent, Input } from "@/components/ui";
import { useViewer } from "@/components/layout/viewer";
import { submitExercise, type GradeResult } from "@/app/actions/exercises";
import { cn } from "@/lib/utils";

export interface DbQuestion {
  id: string;
  kind: "qcm" | "numeric" | "free";
  prompt_md: string;
  unit: string;
  points: number;
  multiple: boolean;
  answers: { id: string; label_md: string; position: number }[];
}

export type Correction = Partial<Record<"donnees_md" | "schema_md" | "equations_md" | "calculs_md" | "resultat_md" | "verification_md", string>>;

const PARTS: [keyof Correction, string][] = [
  ["donnees_md", "1. Données"],
  ["schema_md", "2. Schéma et hypothèses"],
  ["equations_md", "3. Équations"],
  ["calculs_md", "4. Calculs"],
  ["resultat_md", "5. Résultat (avec unités)"],
  ["verification_md", "6. Vérification"],
];

export function CorrectionView({ correction }: { correction: Correction }) {
  const parts = PARTS.filter(([k]) => correction[k]?.trim());
  if (!parts.length) return null;
  return (
    <Card className="border-success/40">
      <CardContent className="space-y-4 pt-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-success">
          <CircleCheck className="size-4" /> Corrigé validé par l&apos;équipe pédagogique
        </div>
        {parts.map(([k, title]) => (
          <section key={k}>
            <h3 className="mb-1 text-sm font-semibold">{title}</h3>
            <Md>{correction[k]!}</Md>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

function parseNumber(s: string): number | null {
  const t = s.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}

export function DbExercisePlayer({ exerciseId, questions }: { exerciseId: string; questions: DbQuestion[] }) {
  const viewer = useViewer();
  const [choices, setChoices] = useState<Record<string, string[]>>({});
  const [numbers, setNumbers] = useState<Record<string, string>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [result, setResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const startedAt = useRef(Date.now());

  const toggle = (q: DbQuestion, id: string) =>
    setChoices((c) => {
      const cur = c[q.id] ?? [];
      return { ...c, [q.id]: q.multiple ? (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]) : [id] };
    });

  const submit = () => {
    setError(null);
    const responses: Record<string, unknown> = {};
    for (const q of questions) {
      if (q.kind === "qcm") responses[q.id] = { choices: choices[q.id] ?? [] };
      else if (q.kind === "numeric") responses[q.id] = { value: parseNumber(numbers[q.id] ?? "") };
      else responses[q.id] = { text: (texts[q.id] ?? "").slice(0, 4000) };
    }
    start(async () => {
      const r = await submitExercise({ exerciseId, responses, durationSeconds: Math.round((Date.now() - startedAt.current) / 1000) });
      if (r.ok && r.data) setResult(r.data);
      else if (!r.ok) setError(r.error);
    });
  };

  const reset = () => {
    setResult(null);
    setChoices({});
    setNumbers({});
    setTexts({});
    startedAt.current = Date.now();
  };

  const byId = new Map(result?.results.map((r) => [r.question_id, r]));
  const invalidNumbers = questions.some((q) => q.kind === "numeric" && (numbers[q.id] ?? "").trim() !== "" && parseNumber(numbers[q.id] ?? "") === null);

  return (
    <div className="space-y-4">
      {questions.map((q, i) => {
        const r = byId.get(q.id);
        return (
          <Card key={q.id} className={cn(r?.correct === true && "border-success/50", r?.correct === false && "border-danger/50")}>
            <CardContent className="space-y-3 pt-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  Question {i + 1} · {Number(q.points)} pt{Number(q.points) > 1 ? "s" : ""}
                </span>
                {r?.correct === true && <Badge variant="success"><CircleCheck className="size-3" /> juste</Badge>}
                {r?.correct === false && <Badge variant="danger"><CircleX className="size-3" /> à revoir</Badge>}
                {r && r.correct === null && <Badge variant="muted">comparez avec la réponse attendue</Badge>}
              </div>
              <Md>{q.prompt_md}</Md>
              {q.kind === "qcm" && (
                <fieldset className="space-y-2" disabled={!!result}>
                  <legend className="sr-only">Choix</legend>
                  {q.answers.map((a) => {
                    const sel = (choices[q.id] ?? []).includes(a.id);
                    const right = r?.correct_answer_ids?.includes(a.id);
                    return (
                      <label
                        key={a.id}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm",
                          sel ? "border-primary bg-primary-soft/50" : "border-border hover:bg-muted",
                          r && right && "border-success bg-success-soft",
                          r && sel && !right && "border-danger bg-danger-soft",
                        )}
                      >
                        <input type={q.multiple ? "checkbox" : "radio"} name={q.id} checked={sel} onChange={() => toggle(q, a.id)} className="mt-1 accent-[var(--primary)]" />
                        <Md className="min-w-0 flex-1">{a.label_md}</Md>
                      </label>
                    );
                  })}
                  {q.multiple && <p className="text-xs text-muted-foreground">Plusieurs réponses possibles.</p>}
                </fieldset>
              )}
              {q.kind === "numeric" && (
                <div className="flex max-w-xs items-center gap-2">
                  <Input
                    inputMode="decimal"
                    aria-label={`Réponse à la question ${i + 1}`}
                    value={numbers[q.id] ?? ""}
                    onChange={(e) => setNumbers((n) => ({ ...n, [q.id]: e.target.value }))}
                    disabled={!!result}
                    className="h-10"
                  />
                  {q.unit && <span className="text-sm text-muted-foreground">{q.unit}</span>}
                </div>
              )}
              {q.kind === "numeric" && r && (
                <p className="text-sm">
                  Valeur attendue : <strong>{r.expected_value}</strong> {r.unit}
                </p>
              )}
              {q.kind === "free" && (
                <textarea
                  aria-label={`Réponse à la question ${i + 1}`}
                  value={texts[q.id] ?? ""}
                  onChange={(e) => setTexts((t) => ({ ...t, [q.id]: e.target.value }))}
                  disabled={!!result}
                  maxLength={4000}
                  rows={4}
                  className="w-full rounded-lg border border-input bg-card p-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
                />
              )}
              {r?.model_answer_md && (
                <Callout title="Réponse attendue">
                  <Md>{r.model_answer_md}</Md>
                </Callout>
              )}
              {r?.explanation_md && (
                <Callout title="Explication">
                  <Md>{r.explanation_md}</Md>
                </Callout>
              )}
            </CardContent>
          </Card>
        );
      })}

      {error && <Callout tone="danger">{error}</Callout>}
      {!viewer ? (
        <Callout tone="warning" title="Connectez-vous pour être corrigé(e)">
          La correction est calculée sur le serveur et enregistrée dans votre historique.{" "}
          <Link href="/connexion" className="font-medium text-primary underline">
            Se connecter
          </Link>{" "}
          ou{" "}
          <Link href="/inscription" className="font-medium text-primary underline">
            créer un compte
          </Link>
          .
        </Callout>
      ) : result ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
              <span className="text-lg font-bold">
                Score : {Number(result.score)} / {Number(result.max)}
              </span>
              <Button variant="outline" onClick={reset}>
                <RotateCcw /> Refaire l&apos;exercice
              </Button>
            </CardContent>
          </Card>
          {result.correction && <CorrectionView correction={result.correction} />}
        </div>
      ) : (
        <Button onClick={submit} disabled={pending || invalidNumbers} className="h-10">
          {pending ? <LoaderCircle className="animate-spin" /> : <Send />} Valider mes réponses
        </Button>
      )}
      {invalidNumbers && !result && <p className="text-xs text-danger">Une réponse numérique n&apos;est pas un nombre (utilisez la virgule ou le point).</p>}
    </div>
  );
}
