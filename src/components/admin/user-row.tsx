"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Select } from "@/components/ui";
import { deleteUser, setUserRole, setUserStatus } from "@/app/admin/actions";

export function UserActions({ id, role, status, self, canManage }: { id: string; role: string; status: string; self: boolean; canManage: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "OK") : (r.error ?? "") });
      if (r.ok) router.refresh();
    });
  if (!canManage || self) return <span className="text-xs text-muted-foreground">{self ? "vous" : ""}</span>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select aria-label="Rôle" value={role} disabled={pending} onChange={(e) => act(() => setUserRole(id, e.target.value as "student" | "teacher" | "admin"))} className="h-8 w-36">
        <option value="student">Étudiant</option>
        <option value="teacher">Enseignant</option>
        <option value="admin">Administrateur</option>
      </Select>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => act(() => setUserStatus(id, status === "active" ? "suspended" : "active"))}>
        {status === "active" ? "Suspendre" : "Réactiver"}
      </Button>
      {!armed ? (
        <Button size="sm" variant="ghost" className="text-danger" onClick={() => setArmed(true)}>
          Supprimer
        </Button>
      ) : (
        <Button size="sm" variant="danger" disabled={pending} onClick={() => act(() => deleteUser(id))}>
          Confirmer la suppression
        </Button>
      )}
      {msg && <Badge variant={msg.ok ? "success" : "danger"}>{msg.text}</Badge>}
    </div>
  );
}
