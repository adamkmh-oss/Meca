"use client";
/** Boutons « favori » et « signaler une erreur », réservés aux personnes connectées. */
import { useState, useTransition } from "react";
import { Flag, LoaderCircle, Star } from "lucide-react";
import { Button, Callout, Select } from "@/components/ui";
import { useViewer } from "@/components/layout/viewer";
import { createReport, toggleFavorite } from "@/app/actions/learning";
import { cn } from "@/lib/utils";

type FavKind = "cours" | "fiche" | "exercice" | "document" | "outil";
type TargetType = "lesson" | "exercise" | "question" | "document" | "chapter" | "generator" | "page";

export function FavoriteButton({ itemKey, kind, title, href, initial = false }: { itemKey: string; kind: FavKind; title: string; href: string; initial?: boolean }) {
  const viewer = useViewer();
  const [fav, setFav] = useState(initial);
  const [pending, start] = useTransition();
  if (!viewer) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      aria-pressed={fav}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await toggleFavorite({ itemKey, kind, title, href });
          if (r.ok && r.data) setFav(r.data.favorite);
        })
      }
    >
      {pending ? <LoaderCircle className="animate-spin" /> : <Star className={cn(fav && "fill-warning text-warning")} />}
      {fav ? "Dans mes favoris" : kind === "fiche" ? "Sauvegarder la fiche" : "Ajouter aux favoris"}
    </Button>
  );
}

const REASONS = [
  { value: "erreur", label: "Erreur (formule, valeur, unité…)" },
  { value: "incomprehensible", label: "Explication peu claire" },
  { value: "technique", label: "Problème d'affichage ou technique" },
  { value: "inapproprie", label: "Contenu inapproprié" },
  { value: "autre", label: "Autre" },
] as const;

export function ReportButton({ targetType, targetKey, targetTitle, targetHref }: { targetType: TargetType; targetKey: string; targetTitle: string; targetHref: string }) {
  const viewer = useViewer();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]["value"]>("erreur");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!viewer) return null;
  if (done) return <p className="text-sm text-success" role="status">{done}</p>;
  if (!open)
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Flag /> Signaler une erreur
      </Button>
    );
  return (
    <div className="w-full max-w-md space-y-2 rounded-xl border border-border bg-card p-3">
      <label className="block text-xs font-medium text-muted-foreground" htmlFor="report-reason">
        Motif
      </label>
      <Select id="report-reason" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
        {REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </Select>
      <label className="block text-xs font-medium text-muted-foreground" htmlFor="report-msg">
        Précisions (facultatif)
      </label>
      <textarea
        id="report-msg"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={2000}
        rows={3}
        className="w-full rounded-lg border border-input bg-card p-2 text-sm outline-none focus-visible:border-primary"
      />
      {error && <Callout tone="danger">{error}</Callout>}
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await createReport({ targetType, targetKey, targetTitle: targetTitle.slice(0, 200), targetHref, reason, message });
              if (r.ok) setDone(r.message ?? "Signalement envoyé.");
              else setError(r.error);
            })
          }
        >
          Envoyer
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
