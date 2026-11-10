import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui";
import { ChapterForm } from "@/components/admin/editors";
import { DeleteButton, StatusControls, type Status } from "@/components/admin/controls";
import { requirePermission } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Chapitre" };

export default async function EditChapter({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requirePermission("content.write");
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const [{ data }, { data: subjects }] = await Promise.all([
    supabase.from("chapters").select("id, subject_id, slug, title, summary, level, position, status").eq("id", id).maybeSingle(),
    supabase.from("subjects").select("id, title").order("position"),
  ]);
  if (!data) notFound();
  return (
    <>
      <PageHeader eyebrow={<Link href="/admin/contenus">Contenus</Link>} title={data.title} />
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <StatusControls table="chapters" id={data.id} status={data.status as Status} canPublish={s.permissions.includes("content.publish")} />
        <Link href={`/admin/lecons/nouvelle?chapitre=${data.id}`} className="text-sm text-primary hover:underline">+ leçon</Link>
        <Link href={`/admin/exercices/nouveau?chapitre=${data.id}`} className="text-sm text-primary hover:underline">+ exercice</Link>
      </div>
      <Card>
        <CardContent className="pt-5">
          <ChapterForm c={data} subjects={subjects ?? []} />
        </CardContent>
      </Card>
      <div className="mt-6">
        <DeleteButton table="chapters" id={data.id} back="/admin/contenus" label="Supprimer le chapitre (et ses leçons et exercices)" />
      </div>
    </>
  );
}
