import Link from "next/link";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge, Card, CardContent } from "@/components/ui";
import { ReportActions } from "@/components/admin/report-row";
import { requirePermission } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Signalements" };
const REASON: Record<string, string> = { erreur: "Erreur", incomprehensible: "Peu clair", inapproprie: "Inapproprié", technique: "Technique", autre: "Autre" };
const STATUS: Record<string, { l: string; v: "warning" | "default" | "success" | "muted" }> = {
  open: { l: "ouvert", v: "warning" },
  in_review: { l: "en cours", v: "default" },
  resolved: { l: "résolu", v: "success" },
  rejected: { l: "rejeté", v: "muted" },
};

export default async function ReportsAdmin({ searchParams }: { searchParams: Promise<{ tous?: string }> }) {
  await requirePermission("reports.moderate");
  const all = (await searchParams).tous === "1";
  const supabase = await createClient();
  let q = supabase.from("reports").select("id, target_type, target_title, target_href, reason, message, status, resolution_note, created_at").order("created_at", { ascending: false }).limit(200);
  if (!all) q = q.in("status", ["open", "in_review"]);
  const { data } = await q;
  return (
    <>
      <PageHeader
        title="Signalements"
        description="Erreurs signalées par les étudiants. Le déclarant est notifié quand le signalement est résolu ou rejeté."
        actions={
          <Link href={all ? "/admin/signalements" : "/admin/signalements?tous=1"} className="text-sm text-primary hover:underline">
            {all ? "Seulement à traiter" : "Afficher tout"}
          </Link>
        }
      />
      <Card>
        <CardContent className="divide-y divide-border pt-2">
          {!data?.length && <p className="py-6 text-center text-sm text-muted-foreground">Aucun signalement à traiter.</p>}
          {data?.map((r) => (
            <div key={r.id} className="space-y-2 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={STATUS[r.status].v}>{STATUS[r.status].l}</Badge>
                <Badge variant="outline">{REASON[r.reason]}</Badge>
                {r.target_href ? (
                  <Link href={r.target_href} className="font-medium hover:text-primary">
                    {r.target_title || r.target_type}
                  </Link>
                ) : (
                  <span className="font-medium">{r.target_title}</span>
                )}
                <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</span>
              </div>
              {r.message && <p className="whitespace-pre-wrap text-sm">{r.message}</p>}
              {r.resolution_note && <p className="text-xs text-muted-foreground">Réponse : {r.resolution_note}</p>}
              {(r.status === "open" || r.status === "in_review") && <ReportActions id={r.id} />}
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
