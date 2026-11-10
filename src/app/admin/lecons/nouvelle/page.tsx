import { PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui";
import { LessonForm } from "@/components/admin/editors";
import { requirePermission } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { chapterOptions } from "@/lib/learning/admin-options";

export const metadata = { title: "Nouvelle leçon" };

export default async function NewLesson({ searchParams }: { searchParams: Promise<{ chapitre?: string }> }) {
  await requirePermission("content.write");
  const { chapitre } = await searchParams;
  const supabase = await createClient();
  const chapters = await chapterOptions(supabase);
  return (
    <>
      <PageHeader title="Nouvelle leçon ou fiche" description="Créée en brouillon : relisez l'aperçu avant de publier." />
      <Card>
        <CardContent className="pt-5">
          <LessonForm chapters={chapters} l={chapitre ? { id: "", chapter_id: chapitre, slug: "", kind: "cours", title: "", summary: "", body_md: "", estimated_minutes: 15, position: 0 } : undefined} />
        </CardContent>
      </Card>
    </>
  );
}
