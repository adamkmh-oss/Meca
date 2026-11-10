"use client";
import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error.digest ?? error.message);
  }, [error]);
  return (
    <div className="mx-auto max-w-xl space-y-3 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
      <p className="text-muted-foreground">L&apos;incident a été enregistré. Réessayez ; si le problème persiste, signalez-le à l&apos;équipe.</p>
      {error.digest && <p className="font-mono text-xs text-muted-foreground">Référence : {error.digest}</p>}
      <Button onClick={reset}>
        <RotateCcw /> Réessayer
      </Button>
    </div>
  );
}
