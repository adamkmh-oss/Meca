import { PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui";
import { ChapterForm } from "@/components/admin/editors";
import { requirePermission } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Nouveau chapitre" };

export default async function NewChapter({ searchParams }: { searchParams: Promise<{ matiere?: string }> }) {
  await requirePermission("content.write");
  const { matiere } = await searchParams;
  const supabase = await createClient();
  const { data: subjects } = await supabase.from("subjects").select("id, title").order("position");
  return (
    <>
      <PageHeader title="Nouveau chapitre" description="Créé en brouillon." />
      <Card>
        <CardContent className="pt-5">
          <ChapterForm subjects={subjects ?? []} c={matiere ? { id: "", subject_id: matiere, slug: "", title: "", summary: "", level: "debutant", position: 0 } : undefined} />
        </CardContent>
      </Card>
    </>
  );
}
