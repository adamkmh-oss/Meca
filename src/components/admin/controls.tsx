"use client";
/** Contrôles d'édition : statut de publication, suppression confirmée, éditeur Markdown avec aperçu. */
import { useState, useTransition } from "react";
import { Archive, Eye, LoaderCircle, Pencil, Send, Trash2, Undo2 } from "lucide-react";
import { Badge, Button, Callout, Label } from "@/components/ui";
import { Md } from "@/components/math";
import { FieldError } from "@/components/forms/form-kit";
import { deleteEntity, setStatus } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

type Table = "subjects" | "chapters" | "lessons" | "exercises" | "documents";
export type Status = "draft" | "published" | "archived";

export function StatusBadge({ status }: { status: Status }) {
  return status === "published" ? <Badge variant="success">publié</Badge> : status === "draft" ? <Badge variant="warning">brouillon</Badge> : <Badge variant="muted">archivé</Badge>;
}

export function StatusControls({ table, id, status, canPublish }: { table: Table; id: string; status: Status; canPublish: boolean }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const go = (s: Status) =>
    start(async () => {
      const r = await setStatus(table, id, s);
      setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "") : r.error });
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge status={status} />
      {canPublish && status !== "published" && (
        <Button size="sm" variant="success" disabled={pending} onClick={() => go("published")}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Send />} Publier
        </Button>
      )}
      {canPublish && status === "published" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => go("draft")}>
          <Undo2 /> Dépublier
        </Button>
      )}
      {canPublish && status !== "archived" && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => go("archived")}>
          <Archive /> Archiver
        </Button>
      )}
      {!canPublish && <span className="text-xs text-muted-foreground">La publication est réservée aux rôles autorisés.</span>}
      {msg && <span className={cn("text-xs", msg.ok ? "text-success" : "text-danger")}>{msg.text}</span>}
    </div>
  );
}

export function DeleteButton({ table, id, back, label = "Supprimer" }: { table: Table; id: string; back: string; label?: string }) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      {!armed ? (
        <Button size="sm" variant="ghost" className="text-danger" onClick={() => setArmed(true)}>
          <Trash2 /> {label}
        </Button>
      ) : (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm">
          <span>Suppression définitive (avec les éléments rattachés).</span>
          <Button size="sm" variant="danger" disabled={pending} onClick={() => start(async () => { const r = await deleteEntity(table, id, back); if (!r.ok) setError(r.error); })}>
            Confirmer
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setArmed(false)}>
            Annuler
          </Button>
        </div>
      )}
      {error && <Callout tone="danger">{error}</Callout>}
    </div>
  );
}

export function MarkdownEditor({ name, label, defaultValue = "", rows = 12, maxLength, hint }: { name: string; label: string; defaultValue?: string; rows?: number; maxLength?: number; hint?: string }) {
  const [value, setValue] = useState(defaultValue);
  const [preview, setPreview] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={`md-${name}`} className="text-sm text-foreground">
          {label}
        </Label>
        <button type="button" onClick={() => setPreview((p) => !p)} className="inline-flex items-center gap-1 text-xs text-primary cursor-pointer">
          {preview ? <Pencil className="size-3" /> : <Eye className="size-3" />} {preview ? "Modifier" : "Aperçu"}
        </button>
      </div>
      <textarea
        id={`md-${name}`}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={rows}
        maxLength={maxLength}
        hidden={preview}
        className="w-full rounded-lg border border-input bg-card p-3 font-mono text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
      />
      {preview && <div className="min-h-24 rounded-lg border border-border bg-background p-4">{value.trim() ? <Md>{value}</Md> : <p className="text-sm text-muted-foreground">Rien à afficher.</p>}</div>}
      <p className="text-xs text-muted-foreground">{hint ?? "Markdown : **gras**, listes, tableaux ; formules LaTeX entre $…$ ou $$…$$. Le HTML n'est pas interprété."}</p>
      <FieldError name={name} />
    </div>
  );
}
