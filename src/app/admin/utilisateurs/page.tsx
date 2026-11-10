import { PageHeader } from "@/components/layout/app-shell";
import { Badge, Card, CardContent, Input } from "@/components/ui";
import { UserActions } from "@/components/admin/user-row";
import { requirePermission } from "@/lib/auth/dal";
import { ROLE_LABEL, type AppRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Utilisateurs" };
const PAGE = 50;

interface Row {
  id: string;
  email: string;
  display_name: string;
  role: AppRole;
  status: "active" | "suspended";
  study_year: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
  mfa: boolean;
  total_count: number;
}

export default async function UsersAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requirePermission("users.read");
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 100);
  const role = ["student", "teacher", "admin"].includes(sp.role ?? "") ? sp.role : null;
  const page = Math.max(0, Number.parseInt(sp.page ?? "0", 10) || 0);
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_list_users", { p_search: q || null, p_role: role, p_limit: PAGE, p_offset: page * PAGE });
  const rows = (data ?? []) as Row[];
  const total = rows[0]?.total_count ?? 0;
  return (
    <>
      <PageHeader title="Utilisateurs" description={`${total} compte(s). Les changements de rôle et de statut sont journalisés.`} />
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <Input name="q" defaultValue={q} placeholder="Rechercher (e-mail, nom)" className="h-9 max-w-xs" aria-label="Rechercher" />
        <select name="role" defaultValue={role ?? ""} className="h-9 rounded-lg border border-input bg-card px-2 text-sm" aria-label="Rôle">
          <option value="">Tous les rôles</option>
          <option value="student">Étudiants</option>
          <option value="teacher">Enseignants</option>
          <option value="admin">Administrateurs</option>
        </select>
        <button className="h-9 rounded-lg border border-border px-3 text-sm hover:bg-muted cursor-pointer">Filtrer</button>
      </form>
      <Card>
        <CardContent className="divide-y divide-border pt-2">
          {rows.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="font-medium">
                  {u.display_name || "—"} <span className="text-sm font-normal text-muted-foreground">{u.email}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1 text-xs text-muted-foreground">
                  <Badge variant="outline">{ROLE_LABEL[u.role]}</Badge>
                  {u.status === "suspended" && <Badge variant="danger">suspendu</Badge>}
                  {!u.email_confirmed && <Badge variant="warning">e-mail non confirmé</Badge>}
                  {u.mfa && <Badge variant="success">MFA</Badge>}
                  <span>inscrit le {new Date(u.created_at).toLocaleDateString("fr-FR")}</span>
                  {u.last_sign_in_at && <span>· dernière connexion {new Date(u.last_sign_in_at).toLocaleDateString("fr-FR")}</span>}
                </div>
              </div>
              <UserActions id={u.id} role={u.role} status={u.status} self={u.id === s.id} canManage={s.permissions.includes("users.manage")} />
            </div>
          ))}
          {!rows.length && <p className="py-6 text-center text-sm text-muted-foreground">Aucun compte.</p>}
        </CardContent>
      </Card>
      {total > PAGE && (
        <div className="mt-4 flex justify-between text-sm">
          {page > 0 ? <a href={`?q=${encodeURIComponent(q)}&role=${role ?? ""}&page=${page - 1}`} className="text-primary">← Précédents</a> : <span />}
          {(page + 1) * PAGE < total && <a href={`?q=${encodeURIComponent(q)}&role=${role ?? ""}&page=${page + 1}`} className="text-primary">Suivants →</a>}
        </div>
      )}
    </>
  );
}
