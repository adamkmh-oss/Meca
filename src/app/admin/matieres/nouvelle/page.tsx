import { PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui";
import { SubjectForm } from "@/components/admin/editors";
import { requirePermission } from "@/lib/auth/dal";

export const metadata = { title: "Nouvelle matière" };

export default async function NewSubject() {
  await requirePermission("subjects.manage");
  return (
    <>
      <PageHeader title="Nouvelle matière" description="Créée en brouillon : publiez-la quand ses premiers contenus sont prêts." />
      <Card>
        <CardContent className="pt-5">
          <SubjectForm />
        </CardContent>
      </Card>
    </>
  );
}
