import { PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { DeleteButton, StatusControls, type Status } from "@/components/admin/controls";
import { UploadForm } from "@/components/admin/upload-form";
import { requirePermission } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Documents" };

export default async function DocumentsAdmin() {
  await requirePermission("documents.manage");
  const supabase = await createClient();
  const [{ data: docs }, { data: subjects }] = await Promise.all([
    supabase.from("documents").select("id, title, original_name, mime_type, size_bytes, status, created_at, subject:subjects(title)").order("created_at", { ascending: false }).limit(200),
    supabase.from("subjects").select("id, title").order("position"),
  ]);
  return (
    <>
      <PageHeader title="Documents" description="Fichiers privés : renommés à l'envoi, contrôlés (format réel, PDF sans code actif), servis par lien signé de 60 s aux seuls comptes connectés une fois publiés." />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Déposer un document</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadForm subjects={subjects ?? []} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="divide-y divide-border pt-2">
          {!docs?.length && <p className="py-6 text-center text-sm text-muted-foreground">Aucun document.</p>}
          {docs?.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <a href={`/api/documents/${d.id}`} target="_blank" rel="noopener" className="font-medium hover:text-primary">
                  {d.title}
                </a>
                <div className="text-xs text-muted-foreground">
                  {(d.subject as unknown as { title: string } | null)?.title ?? "Générale"} · {d.original_name} · {Math.max(1, Math.round(d.size_bytes / 1024))} ko
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusControls table="documents" id={d.id} status={d.status as Status} canPublish />
                <DeleteButton table="documents" id={d.id} back="/admin/documents" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
