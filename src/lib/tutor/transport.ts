/**
 * Transport du tuteur pour le site Next.js : route /api/tuteur, réponse en
 * NDJSON (un TutorEvent par ligne). La version publiée sur claude.ai remplace
 * ce module par artifact/sample-transport.ts (alias de build).
 */
import { TutorError, type TutorAvailability, type TutorEvent, type TutorRequest } from "./transport-types";

export async function checkTutor(): Promise<TutorAvailability> {
  let reason = "not_configured";
  try {
    const j = await (await fetch("/api/tuteur")).json();
    if (j?.configured) return { ok: true };
    reason = j?.reason ?? reason;
  } catch {
    /* route injoignable : traité comme non configuré */
  }
  if (reason === "login_required") {
    return { ok: false, title: "Connectez-vous pour utiliser le tuteur", message: "Le tuteur IA est réservé aux comptes étudiants : connectez-vous ou créez un compte gratuit (page Connexion)." };
  }
  if (reason === "forbidden") return { ok: false, title: "Tuteur indisponible", message: "Votre compte n'a pas accès au tuteur." };
  return {
    ok: false,
    title: "Tuteur non configuré",
    message:
      "Le tuteur utilise l'API Claude. Ajoutez la variable d'environnement ANTHROPIC_API_KEY sur le serveur (par exemple dans les réglages du projet Vercel), puis redéployez.",
  };
}

/** Envoie un tour ; résout quand le flux est terminé (un événement `done` a été émis ou non). */
export async function sendTutor(req: TutorRequest, emit: (e: TutorEvent) => void, signal: AbortSignal): Promise<void> {
  const res = await fetch("/api/tuteur", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify(req),
  });
  if (!res.ok || !res.body) {
    const j = await res.json().catch(() => null);
    throw new TutorError(j?.message ?? "Le tuteur est indisponible pour le moment.", res.status === 503);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) emit(JSON.parse(line) as TutorEvent);
    }
  }
}
