"use client";
import { useState, useTransition } from "react";
import { LoaderCircle, LogOut, Smartphone } from "lucide-react";
import { Button, Callout, Input } from "@/components/ui";
import { confirmMfaEnroll, removeMfa, signOutEverywhere, startMfaEnroll } from "./actions";

export function MfaPanel({ factors }: { factors: { id: string; name: string; created: string }[] }) {
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "") : (r.error ?? "") });
    });

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-medium">Double authentification (TOTP)</h3>
        <p className="text-sm text-muted-foreground">Un code à 6 chiffres d&apos;une application (Aegis, Google Authenticator, 1Password…) est demandé à chaque connexion.</p>
      </div>
      {msg && <Callout tone={msg.ok ? "success" : "danger"}>{msg.text}</Callout>}
      {factors.map((f) => (
        <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
          <span className="inline-flex items-center gap-2">
            <Smartphone className="size-4" /> {f.name}
          </span>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => removeMfa(f.id))}>
            Désactiver
          </Button>
        </div>
      ))}
      {factors.length === 0 && !enroll && (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await startMfaEnroll();
              if (r.ok && r.data) setEnroll(r.data);
              else if (!r.ok) setMsg({ ok: false, text: r.error });
            })
          }
        >
          {pending && <LoaderCircle className="animate-spin" />} Activer la double authentification
        </Button>
      )}
      {enroll && (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <p className="text-sm">1. Scannez ce QR code avec votre application d&apos;authentification.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enroll.qr} alt="QR code de configuration de la double authentification" className="size-44 rounded bg-white p-2" />
          <p className="text-xs text-muted-foreground">
            Ou saisissez la clé : <code className="break-all">{enroll.secret}</code>
          </p>
          <p className="text-sm">2. Saisissez le code affiché.</p>
          <div className="flex max-w-xs gap-2">
            <Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} aria-label="Code à 6 chiffres" className="h-10" />
            <Button
              disabled={pending || code.length !== 6}
              onClick={() =>
                start(async () => {
                  const r = await confirmMfaEnroll(enroll.factorId, code);
                  setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "") : r.error });
                  if (r.ok) setEnroll(null);
                })
              }
            >
              Valider
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SessionsPanel() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-medium">Sessions</h3>
        <p className="text-sm text-muted-foreground">Fermez les sessions ouvertes sur d&apos;autres appareils (ordinateur partagé, téléphone perdu…).</p>
      </div>
      {msg && <Callout tone="success">{msg}</Callout>}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={pending} onClick={() => start(async () => { const r = await signOutEverywhere("others"); if (r.ok) setMsg(r.message ?? null); })}>
          <LogOut /> Déconnecter les autres appareils
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => start(async () => { await signOutEverywhere("global"); })}>
          <LogOut /> Me déconnecter partout
        </Button>
      </div>
    </div>
  );
}
