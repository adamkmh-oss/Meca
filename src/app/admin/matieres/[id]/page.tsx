import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui";
import { SubjectForm } from "@/components/admin/editors";
import { DeleteButton, StatusControls, type Status } from "@/components/admin/controls";
import { requirePermission } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Matière" };

export default async function EditSubject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requirePermission("content.write");
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("subjects").select("id, slug, title, description, icon, position, status").eq("id", id).maybeSingle();
  if (!data) notFound();
  return (
    <>
      <PageHeader
        eyebrow={<Link href="/admin/contenus">Contenus</Link>}
        title={data.title}
        actions={
          <Link href={`/matieres/${data.slug}`} className="text-sm text-primary hover:underline">
            Voir la page
          </Link>
        }
      />
      <div className="mb-4">
        <StatusControls table="subjects" id={data.id} status={data.status as Status} canPublish={s.permissions.includes("content.publish")} />
      </div>
      <Card>
        <CardContent className="pt-5">
          <SubjectForm s={data} />
        </CardContent>
      </Card>
      {s.permissions.includes("subjects.manage") && (
        <div className="mt-6">
          <DeleteButton table="subjects" id={data.id} back="/admin/contenus" label="Supprimer la matière" />
        </div>
      )}
    </>
  );
}
