import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui";
import { LessonForm } from "@/components/admin/editors";
import { DeleteButton, StatusControls, type Status } from "@/components/admin/controls";
import { requirePermission } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { chapterOptions } from "@/lib/learning/admin-options";

export const metadata = { title: "Leçon" };

export default async function EditLesson({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requirePermission("content.write");
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select("id, chapter_id, slug, kind, title, summary, body_md, estimated_minutes, position, status, chapter:chapters(slug, subject:subjects(slug))")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const chapters = await chapterOptions(supabase);
  const ch = data.chapter as unknown as { slug: string; subject: { slug: string } };
  return (
    <>
      <PageHeader
        eyebrow={<Link href="/admin/contenus">Contenus</Link>}
        title={data.title}
        actions={
          <Link href={`/matieres/${ch.subject.slug}/${ch.slug}/${data.slug}`} className="text-sm text-primary hover:underline">
            Prévisualiser
          </Link>
        }
      />
      <div className="mb-4">
        <StatusControls table="lessons" id={data.id} status={data.status as Status} canPublish={s.permissions.includes("content.publish")} />
      </div>
      <Card>
        <CardContent className="pt-5">
          <LessonForm l={data} chapters={chapters} />
        </CardContent>
      </Card>
      <div className="mt-6">
        <DeleteButton table="lessons" id={data.id} back="/admin/contenus" label="Supprimer la leçon" />
      </div>
    </>
  );
}
