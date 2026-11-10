"use client";
/** Édition des questions d'un exercice : QCM, numérique (tolérance), réponse libre ; clé de correction incluse. */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { Badge, Button, Callout, Card, CardContent, Input, Label, Select } from "@/components/ui";
import { Md } from "@/components/math";
import { deleteQuestion, saveQuestion } from "@/app/admin/actions";

export interface EditableQuestion {
  id?: string;
  kind: "qcm" | "numeric" | "free";
  prompt_md: string;
  points: number;
  unit: string;
  multiple: boolean;
  position: number;
  choices: { label_md: string; correct: boolean }[];
  expected_value: number | null;
  tolerance_rel: number;
  tolerance_abs: number;
  model_answer_md: string;
  explanation_md: string;
}

const KIND = { qcm: "QCM", numeric: "Réponse numérique", free: "Réponse libre" } as const;

function QuestionCard({ exerciseId, q, index }: { exerciseId: string; q: EditableQuestion; index: number }) {
  const router = useRouter();
  const [v, setV] = useState<EditableQuestion>(q);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof EditableQuestion>(k: K, val: EditableQuestion[K]) => setV((x) => ({ ...x, [k]: val }));
  const num = (s: string) => {
    const n = Number(s.replace(",", "."));
    return s.trim() === "" || !Number.isFinite(n) ? null : n;
  };
  const save = () =>
    start(async () => {
      const r = await saveQuestion({ ...v, exercise_id: exerciseId, position: index + 1 });
      setMsg({ ok: r.ok, text: r.ok ? "Enregistrée." : r.error });
      if (r.ok && r.data) {
        set("id", r.data.id);
        router.refresh();
      }
    });
  const remove = () =>
    start(async () => {
      if (!v.id) return router.refresh();
      const r = await deleteQuestion(v.id, exerciseId);
      if (r.ok) router.refresh();
      else setMsg({ ok: false, text: r.error });
    });

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold">
            Question {index + 1} <Badge variant="outline">{KIND[v.kind]}</Badge> {!v.id && <Badge variant="warning">non enregistrée</Badge>}
          </span>
          <div className="flex gap-2">
            <Select value={v.kind} onChange={(e) => set("kind", e.target.value as EditableQuestion["kind"])} className="h-8 w-44" aria-label="Type de question">
              <option value="qcm">QCM</option>
              <option value="numeric">Réponse numérique</option>
              <option value="free">Réponse libre</option>
            </Select>
            <Input type="number" min={0.5} step={0.5} value={v.points} onChange={(e) => set("points", Number(e.target.value) || 1)} className="h-8 w-20" aria-label="Points" />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Énoncé de la question (Markdown + LaTeX)</Label>
          <textarea value={v.prompt_md} onChange={(e) => set("prompt_md", e.target.value)} rows={3} className="w-full rounded-lg border border-input bg-card p-2 font-mono text-sm" />
          {v.prompt_md && <Md className="rounded-lg bg-muted/50 p-2 text-sm">{v.prompt_md}</Md>}
        </div>

        {v.kind === "qcm" && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={v.multiple} onChange={(e) => set("multiple", e.target.checked)} /> Plusieurs bonnes réponses possibles
            </label>
            {v.choices.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type={v.multiple ? "checkbox" : "radio"}
                  name={`correct-${index}`}
                  checked={c.correct}
                  aria-label={`Choix ${i + 1} correct`}
                  onChange={(e) => set("choices", v.choices.map((x, j) => (j === i ? { ...x, correct: e.target.checked } : v.multiple ? x : { ...x, correct: false })))}
                />
                <Input value={c.label_md} onChange={(e) => set("choices", v.choices.map((x, j) => (j === i ? { ...x, label_md: e.target.value } : x)))} placeholder={`Choix ${i + 1}`} />
                <Button size="icon" variant="ghost" aria-label="Retirer le choix" onClick={() => set("choices", v.choices.filter((_, j) => j !== i))}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            {v.choices.length < 10 && (
              <Button size="sm" variant="outline" onClick={() => set("choices", [...v.choices, { label_md: "", correct: false }])}>
                <Plus /> Choix
              </Button>
            )}
          </div>
        )}
        {v.kind === "numeric" && (
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label>Valeur attendue</Label>
              <Input defaultValue={v.expected_value ?? ""} onChange={(e) => set("expected_value", num(e.target.value))} inputMode="decimal" />
            </div>
            <div className="space-y-1">
              <Label>Unité</Label>
              <Input value={v.unit} onChange={(e) => set("unit", e.target.value)} placeholder="kN" />
            </div>
            <div className="space-y-1">
              <Label>Tolérance relative</Label>
              <Input defaultValue={v.tolerance_rel} onChange={(e) => set("tolerance_rel", num(e.target.value) ?? 0.01)} inputMode="decimal" />
            </div>
            <div className="space-y-1">
              <Label>Tolérance absolue</Label>
              <Input defaultValue={v.tolerance_abs} onChange={(e) => set("tolerance_abs", num(e.target.value) ?? 0)} inputMode="decimal" />
            </div>
          </div>
        )}
        {v.kind === "free" && (
          <div className="space-y-1">
            <Label>Réponse attendue (montrée après l&apos;envoi)</Label>
            <textarea value={v.model_answer_md} onChange={(e) => set("model_answer_md", e.target.value)} rows={3} className="w-full rounded-lg border border-input bg-card p-2 font-mono text-sm" />
          </div>
        )}
        <div className="space-y-1">
          <Label>Explication (montrée après l&apos;envoi)</Label>
          <textarea value={v.explanation_md} onChange={(e) => set("explanation_md", e.target.value)} rows={2} className="w-full rounded-lg border border-input bg-card p-2 font-mono text-sm" />
        </div>
        {msg && <Callout tone={msg.ok ? "success" : "danger"}>{msg.text}</Callout>}
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" /> : <Save />} Enregistrer la question
          </Button>
          <Button size="sm" variant="ghost" className="text-danger" onClick={remove} disabled={pending}>
            <Trash2 /> Supprimer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function QuestionsEditor({ exerciseId, initial }: { exerciseId: string; initial: EditableQuestion[] }) {
  const [extra, setExtra] = useState<EditableQuestion[]>([]);
  const all = [...initial, ...extra];
  return (
    <div className="space-y-4">
      {all.map((q, i) => (
        <QuestionCard key={q.id ?? `new-${i}`} exerciseId={exerciseId} q={q} index={i} />
      ))}
      <Button
        variant="outline"
        onClick={() =>
          setExtra((x) => [
            ...x,
            { kind: "qcm", prompt_md: "", points: 1, unit: "", multiple: false, position: all.length + 1, choices: [{ label_md: "", correct: true }, { label_md: "", correct: false }], expected_value: null, tolerance_rel: 0.01, tolerance_abs: 0, model_answer_md: "", explanation_md: "" },
          ])
        }
      >
        <Plus /> Ajouter une question
      </Button>
    </div>
  );
}
