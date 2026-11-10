"use client";
/** Formulaires d'édition des contenus (validés à nouveau côté serveur). */
import { ActionForm, Field, SelectField, SubmitButton } from "@/components/forms/form-kit";
import { saveChapter, saveExercise, saveLesson, saveSubject } from "@/app/admin/actions";
import { MarkdownEditor } from "./controls";

const LEVELS = [
  { value: "debutant", label: "Débutant" },
  { value: "intermediaire", label: "Intermédiaire" },
  { value: "avance", label: "Avancé" },
];

export function SubjectForm({ s }: { s?: { id: string; slug: string; title: string; description: string; icon: string; position: number } }) {
  return (
    <ActionForm action={saveSubject}>
      <input type="hidden" name="id" value={s?.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="title" label="Titre" defaultValue={s?.title} required />
        <Field name="slug" label="Identifiant d'URL" defaultValue={s?.slug} required hint="ex. beton-arme" />
        <Field name="icon" label="Icône (Lucide)" defaultValue={s?.icon ?? "BookOpen"} required />
        <Field name="position" label="Ordre" type="number" defaultValue={s?.position ?? 0} />
      </div>
      <MarkdownEditor name="description" label="Description" defaultValue={s?.description} rows={3} maxLength={1000} hint="Texte court affiché sur la carte de la matière." />
      <SubmitButton>Enregistrer</SubmitButton>
    </ActionForm>
  );
}

export function ChapterForm({ c, subjects }: { c?: { id: string; subject_id: string; slug: string; title: string; summary: string; level: string; position: number }; subjects: { id: string; title: string }[]; subjectId?: string }) {
  return (
    <ActionForm action={saveChapter}>
      <input type="hidden" name="id" value={c?.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField name="subject_id" label="Matière" options={subjects.map((s) => ({ value: s.id, label: s.title }))} defaultValue={c?.subject_id} />
        <Field name="title" label="Titre" defaultValue={c?.title} required />
        <Field name="slug" label="Identifiant d'URL" defaultValue={c?.slug} required />
        <SelectField name="level" label="Niveau" options={LEVELS} defaultValue={c?.level ?? "debutant"} />
        <Field name="position" label="Ordre" type="number" defaultValue={c?.position ?? 0} />
      </div>
      <MarkdownEditor name="summary" label="Résumé" defaultValue={c?.summary} rows={3} maxLength={1000} />
      <SubmitButton>Enregistrer</SubmitButton>
    </ActionForm>
  );
}

export function LessonForm({
  l,
  chapters,
}: {
  l?: { id: string; chapter_id: string; slug: string; kind: string; title: string; summary: string; body_md: string; estimated_minutes: number; position: number };
  chapters: { id: string; label: string }[];
}) {
  return (
    <ActionForm action={saveLesson}>
      <input type="hidden" name="id" value={l?.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField name="chapter_id" label="Chapitre" options={chapters.map((c) => ({ value: c.id, label: c.label }))} defaultValue={l?.chapter_id} />
        <SelectField
          name="kind"
          label="Type"
          options={[
            { value: "cours", label: "Cours" },
            { value: "fiche", label: "Fiche de révision" },
          ]}
          defaultValue={l?.kind ?? "cours"}
        />
        <Field name="title" label="Titre" defaultValue={l?.title} required />
        <Field name="slug" label="Identifiant d'URL" defaultValue={l?.slug} required />
        <Field name="estimated_minutes" label="Durée estimée (min)" type="number" min={1} max={240} defaultValue={l?.estimated_minutes ?? 15} />
        <Field name="position" label="Ordre" type="number" defaultValue={l?.position ?? 0} />
      </div>
      <MarkdownEditor name="summary" label="Résumé" defaultValue={l?.summary} rows={2} maxLength={1000} />
      <MarkdownEditor name="body_md" label="Contenu" defaultValue={l?.body_md} rows={22} maxLength={200000} />
      <SubmitButton>Enregistrer</SubmitButton>
    </ActionForm>
  );
}

export function ExerciseForm({
  e,
  chapters,
  documents,
}: {
  e?: { id: string; chapter_id: string; title: string; statement_md: string; data_md: string; difficulty: string; position: number; illustration_document_id: string | null };
  chapters: { id: string; label: string }[];
  documents: { id: string; title: string }[];
}) {
  return (
    <ActionForm action={saveExercise}>
      <input type="hidden" name="id" value={e?.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField name="chapter_id" label="Chapitre" options={chapters.map((c) => ({ value: c.id, label: c.label }))} defaultValue={e?.chapter_id} />
        <Field name="title" label="Titre" defaultValue={e?.title} required />
        <SelectField name="difficulty" label="Difficulté" options={LEVELS} defaultValue={e?.difficulty ?? "debutant"} />
        <Field name="position" label="Ordre" type="number" defaultValue={e?.position ?? 0} />
        <SelectField
          name="illustration_document_id"
          label="Illustration (image publiée dans Documents)"
          options={[{ value: "", label: "Aucune" }, ...documents.map((d) => ({ value: d.id, label: d.title }))]}
          defaultValue={e?.illustration_document_id ?? ""}
        />
      </div>
      <MarkdownEditor name="statement_md" label="Énoncé" defaultValue={e?.statement_md} rows={8} maxLength={50000} />
      <MarkdownEditor name="data_md" label="Données" defaultValue={e?.data_md} rows={5} maxLength={20000} hint="Valeurs numériques avec unités (ex. L = 6 m ; q = 10 kN/m)." />
      <SubmitButton>Enregistrer</SubmitButton>
    </ActionForm>
  );
}
