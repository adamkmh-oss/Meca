"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { moderateReport } from "@/app/admin/actions";

export function ReportActions({ id }: { id: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const go = (s: "in_review" | "resolved" | "rejected") =>
    start(async () => {
      const r = await moderateReport(id, s, note);
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="Réponse au déclarant (facultatif)" className="h-8 max-w-xs" aria-label="Note de résolution" />
      <Button size="sm" variant="outline" disabled={pending} onClick={() => go("in_review")}>En cours</Button>
      <Button size="sm" variant="success" disabled={pending} onClick={() => go("resolved")}>Résolu</Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => go("rejected")}>Rejeter</Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
