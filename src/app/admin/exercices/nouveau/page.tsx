import { PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui";
import { ExerciseForm } from "@/components/admin/editors";
import { requirePermission } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { chapterOptions } from "@/lib/learning/admin-options";

export const metadata = { title: "Nouvel exercice" };

export default async function NewExercise({ searchParams }: { searchParams: Promise<{ chapitre?: string }> }) {
  await requirePermission("content.write");
  const { chapitre } = await searchParams;
  const supabase = await createClient();
  const [chapters, { data: docs }] = await Promise.all([chapterOptions(supabase), supabase.from("documents").select("id, title").neq("mime_type", "application/pdf")]);
  return (
    <>
      <PageHeader title="Nouvel exercice" description="Enregistrez l'énoncé, puis ajoutez les questions et le corrigé." />
      <Card>
        <CardContent className="pt-5">
          <ExerciseForm chapters={chapters} documents={docs ?? []} e={chapitre ? { id: "", chapter_id: chapitre, title: "", statement_md: "", data_md: "", difficulty: "debutant", position: 0, illustration_document_id: null } : undefined} />
        </CardContent>
      </Card>
    </>
  );
}
