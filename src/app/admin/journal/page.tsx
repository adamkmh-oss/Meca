import { PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui";
import { requirePermission } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Journal d'audit" };
const PAGE = 100;

export default async function AuditLog({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requirePermission("audit.read");
  const page = Math.max(0, Number.parseInt((await searchParams).page ?? "0", 10) || 0);
  const supabase = await createClient();
  const { data, count } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, target_table, target_id, details, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * PAGE, page * PAGE + PAGE - 1);
  const actors = [...new Set((data ?? []).map((d) => d.actor_id).filter(Boolean))] as string[];
  const names = new Map<string, string>();
  if (actors.length) {
    const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", actors);
    for (const p of profiles ?? []) names.set(p.id, p.display_name);
  }
  return (
    <>
      <PageHeader title="Journal d'audit" description={`${count ?? 0} opération(s) sensibles enregistrées (publication, suppression, rôles, statuts, signalements). Journal en ajout seul.`} />
      <Card>
        <CardContent className="overflow-x-auto pt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Auteur</th>
                <th className="py-2 pr-3">Action</th>
                <th className="py-2">Détail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap py-2 pr-3 tabular-nums">{new Date(l.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</td>
                  <td className="py-2 pr-3">{l.actor_id ? (names.get(l.actor_id) ?? l.actor_id.slice(0, 8)) : "système"}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{l.action}</td>
                  <td className="py-2 text-xs text-muted-foreground">{(l.details as { title?: string; from?: string; to?: string })?.title ?? ""} {(l.details as { from?: string })?.from ? `(${(l.details as { from: string }).from} → ${(l.details as { to: string }).to})` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <div className="mt-4 flex justify-between text-sm">
        {page > 0 ? <a href={`?page=${page - 1}`} className="text-primary">← Plus récents</a> : <span />}
        {(page + 1) * PAGE < (count ?? 0) && <a href={`?page=${page + 1}`} className="text-primary">Plus anciens →</a>}
      </div>
    </>
  );
}
