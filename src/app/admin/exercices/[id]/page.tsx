import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { ExerciseForm } from "@/components/admin/editors";
import { DeleteButton, MarkdownEditor, StatusControls, type Status } from "@/components/admin/controls";
import { QuestionsEditor, type EditableQuestion } from "@/components/admin/questions-editor";
import { ActionForm, SubmitButton } from "@/components/forms/form-kit";
import { requirePermission } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { chapterOptions } from "@/lib/learning/admin-options";
import { saveCorrection } from "../../actions";

export const metadata = { title: "Exercice" };

const PARTS = [
  ["donnees_md", "1. Données"],
  ["schema_md", "2. Schéma et hypothèses (conventions de signe, unités)"],
  ["equations_md", "3. Équations"],
  ["calculs_md", "4. Calculs"],
  ["resultat_md", "5. Résultat (avec unités)"],
  ["verification_md", "6. Vérification"],
] as const;

export default async function EditExercise({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requirePermission("content.write");
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: ex } = await supabase
    .from("exercises")
    .select("id, chapter_id, title, statement_md, data_md, difficulty, position, status, illustration_document_id, chapter:chapters(subject:subjects(slug))")
    .eq("id", id)
    .maybeSingle();
  if (!ex) notFound();
  const [chapters, { data: docs }, { data: qs }, { data: correction }] = await Promise.all([
    chapterOptions(supabase),
    supabase.from("documents").select("id, title").neq("mime_type", "application/pdf"),
    supabase.from("questions").select("id, kind, prompt_md, points, unit, multiple, position, answers(id, label_md, position), question_keys(*)").eq("exercise_id", id).order("position"),
    supabase.from("corrections").select("*").eq("exercise_id", id).maybeSingle(),
  ]);
  const questions: EditableQuestion[] = (qs ?? []).map((q) => {
    const key = (Array.isArray(q.question_keys) ? q.question_keys[0] : q.question_keys) as
      | { correct_answer_ids: string[]; expected_value: number | null; tolerance_rel: number; tolerance_abs: number; model_answer_md: string; explanation_md: string }
      | null;
    const answers = [...(q.answers as { id: string; label_md: string; position: number }[])].sort((a, b) => a.position - b.position);
    return {
      id: q.id,
      kind: q.kind,
      prompt_md: q.prompt_md,
      points: Number(q.points),
      unit: q.unit,
      multiple: q.multiple,
      position: q.position,
      choices: answers.map((a) => ({ label_md: a.label_md, correct: key?.correct_answer_ids?.includes(a.id) ?? false })),
      expected_value: key?.expected_value ?? null,
      tolerance_rel: key?.tolerance_rel ?? 0.01,
      tolerance_abs: key?.tolerance_abs ?? 0,
      model_answer_md: key?.model_answer_md ?? "",
      explanation_md: key?.explanation_md ?? "",
    };
  });
  const subjectSlug = (ex.chapter as unknown as { subject: { slug: string } }).subject.slug;
  return (
    <>
      <PageHeader
        eyebrow={<Link href="/admin/contenus">Contenus</Link>}
        title={ex.title}
        actions={
          <Link href={`/matieres/${subjectSlug}/exercices/${ex.id}`} className="text-sm text-primary hover:underline">
            Prévisualiser et tester
          </Link>
        }
      />
      <div className="mb-4">
        <StatusControls table="exercises" id={ex.id} status={ex.status as Status} canPublish={s.permissions.includes("content.publish")} />
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Énoncé</CardTitle>
          </CardHeader>
          <CardContent>
            <ExerciseForm e={ex} chapters={chapters} documents={docs ?? []} />
          </CardContent>
        </Card>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Questions et clés de correction</h2>
          <p className="text-sm text-muted-foreground">Les bonnes réponses ne sont jamais envoyées aux étudiants avant leur tentative : la correction est calculée par la base de données.</p>
          <QuestionsEditor exerciseId={ex.id} initial={questions} />
        </section>
        <Card>
          <CardHeader>
            <CardTitle>Corrigé détaillé</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={saveCorrection}>
              <input type="hidden" name="exercise_id" value={ex.id} />
              {PARTS.map(([k, label]) => (
                <MarkdownEditor key={k} name={k} label={label} defaultValue={(correction as Record<string, string> | null)?.[k] ?? ""} rows={k === "calculs_md" ? 10 : 4} />
              ))}
              <SubmitButton>Enregistrer le corrigé</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
        <DeleteButton table="exercises" id={ex.id} back="/admin/contenus" label="Supprimer l'exercice" />
      </div>
    </>
  );
}
