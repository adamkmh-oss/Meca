"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, KeyRound, LoaderCircle, Send, Square, Trash2, Wrench } from "lucide-react";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { Md } from "@/components/math";
import { Button, Callout, Segmented } from "@/components/ui";
import { describeToolCall } from "@/lib/tutor/tool-labels";
import { AVAILABLE_CHAPTERS } from "@/content/modules";
import { chapterMastery, levelFromXp, useProgress } from "@/lib/progress/store";
import { cn } from "@/lib/utils";

type Mode = "expliquer" | "indices" | "verifier";
type Part = { kind: "text"; text: string } | { kind: "tool"; id: string; label: string; ok?: boolean };
interface Turn {
  user: string;
  parts: Part[];
}

const STORAGE_KEY = "structura:tuteur:v1";
const MAX_HISTORY = 200;

const SUGGESTIONS: Record<Mode, string[]> = {
  expliquer: [
    "Pourquoi écrit-on dM/dx = −T dans notre cours ?",
    "Calcule les réactions et le moment maximal d'une poutre de 6 m sur deux appuis sous 10 kN/m.",
    "Explique la différence entre une articulation et un encastrement avec un exemple de bâtiment.",
    "Donne-moi un exercice sur la flexion adapté à mon niveau.",
  ],
  indices: [
    "Je bloque sur les réactions d'une poutre à porte-à-faux : aide-moi sans me donner la réponse.",
    "Comment commencer le torseur de cohésion d'une barre inclinée ?",
  ],
  verifier: [
    "Poutre de 8 m, P = 20 kN à 3 m de A : j'ai trouvé V_A = 7,5 kN et V_B = 12,5 kN. C'est juste ?",
    "Pour une console de 2 m sous 5 kN/m, je trouve M_A = 20 kN·m. Où est mon erreur ?",
  ],
};

function loadHistory(): BetaMessageParam[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const v = raw ? JSON.parse(raw) : null;
    return v && v.v === 1 && Array.isArray(v.messages) ? v.messages : [];
  } catch {
    return [];
  }
}
function saveHistory(messages: BetaMessageParam[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, messages }));
  } catch {
    /* stockage indisponible */
  }
}

/** Reconstitue l'affichage (questions, réponses, appels d'outils) à partir de l'historique brut. */
function toTurns(messages: BetaMessageParam[]): Turn[] {
  const turns: Turn[] = [];
  let cur: Turn | null = null;
  for (const m of messages) {
    if (m.role === "user" && typeof m.content === "string") {
      cur = { user: m.content, parts: [] };
      turns.push(cur);
    } else if (m.role === "assistant" && cur) {
      const blocks = typeof m.content === "string" ? [{ type: "text" as const, text: m.content }] : m.content;
      for (const b of blocks) {
        if (b.type === "text") cur.parts.push({ kind: "text", text: b.text });
        else if (b.type === "tool_use") cur.parts.push({ kind: "tool", id: b.id, label: describeToolCall(b.name, b.input) });
      }
    } else if (m.role === "user" && Array.isArray(m.content) && cur) {
      for (const b of m.content) {
        if (b.type === "tool_result") {
          const part = cur.parts.find((p) => p.kind === "tool" && p.id === b.tool_use_id);
          if (part && part.kind === "tool") part.ok = !b.is_error;
        }
      }
    }
  }
  return turns;
}

function ToolChip({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px]",
        ok === false ? "border-danger/40 bg-danger-soft text-danger" : "border-border bg-muted text-muted-foreground",
      )}
    >
      {ok === undefined ? <LoaderCircle className="size-3 animate-spin" /> : <Wrench className="size-3" />}
      {label}
      {ok === true && " ✓"}
    </span>
  );
}

function AssistantParts({ parts }: { parts: Part[] }) {
  // les textes consécutifs sont fusionnés pour un rendu Markdown continu
  const groups: Part[] = [];
  for (const p of parts) {
    const last = groups[groups.length - 1];
    if (p.kind === "text" && last?.kind === "text") groups[groups.length - 1] = { kind: "text", text: last.text + p.text };
    else groups.push(p);
  }
  return (
    <div className="space-y-2">
      {groups.map((p, k) =>
        p.kind === "text" ? (
          <Md key={k} className="text-[0.94rem] [&_.katex-display]:my-2">
            {p.text}
          </Md>
        ) : (
          <div key={k}>
            <ToolChip label={p.label} ok={p.ok} />
          </div>
        ),
      )}
    </div>
  );
}

export function TutorChat({ variant = "page" }: { variant?: "page" | "panel" }) {
  const pathname = usePathname();
  const progress = useProgress();
  const [history, setHistory] = useState<BetaMessageParam[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [mode, setMode] = useState<Mode>("expliquer");
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<{ user: string; parts: Part[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
    setLoaded(true);
    fetch("/api/tuteur")
      .then((r) => r.json())
      .then((j) => setConfigured(Boolean(j.configured)))
      .catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    if (loaded) saveHistory(history);
  }, [history, loaded]);

  const turns = useMemo(() => toTurns(history), [history]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns.length, pending]);

  const profile = useMemo(() => {
    const lv = levelFromXp(progress.xp);
    return {
      niveau: lv.level,
      xp: progress.xp,
      maitrise: AVAILABLE_CHAPTERS.map((c) => ({ chapitre: c.title, pct: chapterMastery(progress, c.id) })).filter((m) => m.pct > 0),
      recents: progress.attempts.slice(-5).map((a) => ({ titre: a.title.slice(0, 150), score: a.score, max: a.max })),
    };
  }, [progress]);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || pending) return;
      setError(null);
      setInput("");
      const current: { user: string; parts: Part[] } = { user: message, parts: [] };
      setPending({ ...current });
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch("/api/tuteur", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            history,
            message,
            mode,
            context: { page: { path: pathname, title: document.title.slice(0, 190) }, profil: profile },
          }),
        });
        if (!res.ok || !res.body) {
          const j = await res.json().catch(() => null);
          setError(j?.message ?? "Le tuteur est indisponible pour le moment.");
          setPending(null);
          setInput(message);
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finished = false;
        while (!finished) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line) continue;
            const ev = JSON.parse(line);
            if (ev.type === "text") {
              const last = current.parts[current.parts.length - 1];
              if (last?.kind === "text") last.text += ev.text;
              else current.parts.push({ kind: "text", text: ev.text });
            } else if (ev.type === "tool") {
              current.parts.push({ kind: "tool", id: ev.id, label: ev.label });
            } else if (ev.type === "tool_result") {
              const p = current.parts.find((x) => x.kind === "tool" && x.id === ev.id);
              if (p && p.kind === "tool") p.ok = ev.ok;
            } else if (ev.type === "error") {
              setError(ev.message);
            } else if (ev.type === "done") {
              setHistory((h) => [...h, ...(ev.messages as BetaMessageParam[])]);
              finished = true;
            }
            setPending({ user: current.user, parts: current.parts.map((p) => ({ ...p })) });
          }
        }
        if (!finished) setError((e) => e ?? "La réponse a été interrompue.");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("Connexion au tuteur impossible.");
        else setError("Réponse interrompue.");
      } finally {
        setPending(null);
        abortRef.current = null;
      }
    },
    [history, mode, pathname, pending, profile],
  );

  const tooLong = history.length > MAX_HISTORY;
  const disabled = configured === false || tooLong;

  return (
    <div className={cn("flex min-h-0 flex-col", variant === "page" ? "h-[calc(100dvh-13rem)] min-h-[480px]" : "h-full")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-1 pb-3">
        <Segmented
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: "expliquer", label: "Expliquer" },
            { value: "indices", label: "Indices seulement" },
            { value: "verifier", label: "Vérifier mon calcul" },
          ]}
        />
        {history.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setHistory([])} disabled={!!pending}>
            <Trash2 /> Nouvelle conversation
          </Button>
        )}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-1 py-4">
        {configured === false && (
          <Callout tone="warning" title="Tuteur non configuré">
            <span className="inline-flex items-start gap-2">
              <KeyRound className="mt-0.5 size-4 shrink-0" />
              <span>
                Le tuteur utilise l&apos;API Claude. Ajoutez la variable d&apos;environnement <code>ANTHROPIC_API_KEY</code> sur le serveur (par exemple dans les
                réglages du projet Vercel), puis redéployez.
              </span>
            </span>
          </Callout>
        )}
        {turns.length === 0 && !pending && configured !== false && (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Bot className="size-5" />
              </span>
              <div className="text-sm leading-relaxed">
                <p className="font-semibold">Bonjour, je suis le tuteur de STRUCTURA.</p>
                <p className="text-muted-foreground">
                  Je connais le cours du site, les corrigés de TD et leurs conventions. Pour chaque valeur numérique, j&apos;utilise le moteur de calcul du
                  simulateur : je ne donne pas de résultat non vérifié.
                </p>
              </div>
            </div>
            <div className="grid gap-2">
              {SUGGESTIONS[mode].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-left text-sm hover:border-primary/50 cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {[...turns, ...(pending ? [pending] : [])].map((t, k) => (
          <div key={k} className="space-y-3">
            <div className="flex justify-end">
              <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">{t.user}</div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Bot className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                {t.parts.length > 0 ? (
                  <AssistantParts parts={t.parts} />
                ) : (
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <LoaderCircle className="size-4 animate-spin" /> Réflexion…
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {error && <Callout tone="danger">{error}</Callout>}
        {tooLong && <Callout tone="info">Cette conversation est longue : démarrez-en une nouvelle pour continuer.</Callout>}
      </div>

      <form
        className="border-t border-border pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={variant === "page" ? 2 : 2}
            maxLength={4000}
            disabled={disabled}
            placeholder={mode === "verifier" ? "Collez votre raisonnement et vos résultats…" : "Posez votre question (Entrée pour envoyer, Maj+Entrée pour aller à la ligne)"}
            className="min-h-[44px] flex-1 resize-none rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-60"
          />
          {pending ? (
            <Button type="button" size="icon" variant="outline" aria-label="Arrêter" onClick={() => abortRef.current?.abort()}>
              <Square />
            </Button>
          ) : (
            <Button type="submit" size="icon" aria-label="Envoyer" disabled={disabled || !input.trim()}>
              <Send />
            </Button>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Le tuteur peut se tromper dans ses explications : les valeurs numériques sont calculées par le moteur, mais relisez toujours le raisonnement.
        </p>
      </form>
    </div>
  );
}
