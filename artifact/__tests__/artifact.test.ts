import { afterEach, describe, expect, it } from "vitest";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { decodeHash, encodePath } from "../paths";
import { checkTutor, sendTutor } from "../sample-transport";
import { TOOLS } from "@/lib/tutor/tools";
import { TutorError, type TutorEvent } from "@/lib/tutor/transport-types";
import { AVAILABLE_CHAPTERS, MODULES } from "@/content/modules";
import { GENERATORS } from "@/lib/exercises/generators";

describe("adresses ↔ fragments", () => {
  const paths = [
    "/",
    "/cours",
    "/exercices",
    "/simulateur",
    "/tableau-de-bord",
    "/tuteur",
    ...MODULES.flatMap((m) => [`/cours/${m.slug}`, `/cours/${m.slug}/examen`]),
    ...AVAILABLE_CHAPTERS.map((c) => `/cours/${MODULES.find((m) => m.id === c.moduleId)!.slug}/${c.slug}`),
    ...GENERATORS.flatMap((g) => [`/exercices/${g.id}`, `/exercices/${g.id}?seed=4821`]),
  ];

  it("chaque page a un fragment simple (lettres, chiffres, tirets) et revient à l'identique", () => {
    for (const p of paths) {
      const h = encodePath(p);
      expect(h, p).toMatch(/^[a-z0-9-]+$/);
      expect(decodeHash("#" + h), p).toBe(p);
    }
  });

  it("aucun fragment n'emprunte un nom réservé par claude.ai", () => {
    const reserved = /^(settings|sidebar|customize|upgrade|downloads|comment-.*)$/;
    for (const p of paths) expect(encodePath(p)).not.toMatch(reserved);
  });

  it("fragment vide ou illisible → accueil", () => {
    expect(decodeHash("")).toBe("/");
    expect(decodeHash("#")).toBe("/");
    expect(decodeHash("#%E0%A4%A")).toBe("/");
  });
});

describe("outils du tuteur dans les limites de la capacité sample", () => {
  it("nom, description ≤ 1 Ko et schéma ≤ 4 Ko", () => {
    for (const t of TOOLS) {
      expect(t.name).toMatch(/^[A-Za-z0-9_-]{1,128}$/);
      expect(new TextEncoder().encode(t.description ?? "").length, t.name).toBeLessThanOrEqual(1024);
      expect(JSON.stringify(t.input_schema).length, t.name).toBeLessThanOrEqual(4096);
    }
  });
});

/* ----------------------- Transport par `sample` ----------------------- */
type Call = { input: { role: string; content: string }[]; opts: Record<string, unknown> };
const g = globalThis as { claude?: unknown };

function fakeClaude(impl: (call: Call) => Promise<{ text: string; truncated: boolean }>, limits: object = { maxPromptBytes: 262144, tools: { maxCount: 8 } }) {
  const calls: Call[] = [];
  const sample = Object.assign(
    async (input: Call["input"], opts: Call["opts"]) => {
      const call = { input, opts };
      calls.push(call);
      return impl(call);
    },
    { limits: async () => limits },
  );
  g.claude = { use: async (name: string) => (name === "sample" ? sample : null) };
  return calls;
}

describe("transport du tuteur par la capacité sample", () => {
  afterEach(() => {
    delete g.claude;
  });

  it("sans lecteur Claude : indisponible, avec explication", async () => {
    const a = await checkTutor();
    expect(a.ok).toBe(false);
    expect(a.message).toMatch(/claude\.ai/);
    fakeClaude(async () => ({ text: "ok", truncated: false }));
    expect((await checkTutor()).ok).toBe(true);
  });

  it("exécute les outils dans la page et restitue l'historique", async () => {
    const calls = fakeClaude(async ({ opts }) => {
      const onText = opts.onText as (u: { text: string; delta: string }) => void;
      onText({ text: "Calcul :", delta: "Calcul :" });
      const tool = (opts.tools as { name: string; execute: (i: unknown) => unknown }[]).find((t) => t.name === "analyser_poutre")!;
      const out = JSON.parse(
        String(
          tool.execute({
            longueur: 6,
            appuis: [
              { x: 0, type: "articulation" },
              { x: 6, type: "appui_simple" },
            ],
            charges: [{ type: "repartie", x1: 0, x2: 6, q1: 10 }],
          }),
        ),
      );
      expect(out.reactions[0].V_kN).toBeCloseTo(30, 9);
      onText({ text: "Calcul :\n\nV_A = 30 kN", delta: "\n\nV_A = 30 kN" });
      return { text: "Calcul :\n\nV_A = 30 kN", truncated: false };
    });

    const history: BetaMessageParam[] = [
      { role: "user", content: "Question 1" },
      { role: "assistant", content: [{ type: "text", text: "Réponse 1" }] },
    ];
    const events: TutorEvent[] = [];
    await sendTutor(
      { history, message: "Poutre de 6 m ?", mode: "indices", context: { page: { path: "/simulateur", title: "Simulateur" } } },
      (e) => events.push(e),
      new AbortController().signal,
    );

    const [{ input, opts }] = calls;
    expect(opts.cache).toBe(false);
    expect((opts.tools as unknown[]).length).toBe(TOOLS.length);
    expect(input[0].role).toBe("user");
    expect(input[0].content.startsWith("Tu es le tuteur")).toBe(true);
    expect(input.slice(1).map((t) => t.content)).toEqual(["Question 1", "Réponse 1", expect.stringContaining("Mode demandé : indices")]);
    expect(input.at(-1)!.content).toContain("Poutre de 6 m ?");

    expect(events.map((e) => e.type)).toEqual(["text", "tool", "tool_result", "text", "done"]);
    const done = events.at(-1) as Extract<TutorEvent, { type: "done" }>;
    expect(done.messages[0]).toEqual({ role: "user", content: "Poutre de 6 m ?" });
    const blocks = done.messages[1].content as { type: string }[];
    expect(blocks.map((b) => b.type)).toEqual(["text", "tool_use", "text"]);
    const res = done.messages[2].content as { type: string; is_error?: boolean }[];
    expect(res[0].type).toBe("tool_result");
    expect(res[0].is_error).toBeUndefined();
  });

  it("sans outils disponibles : consigne adaptée, aucun outil envoyé", async () => {
    const calls = fakeClaude(async ({ opts }) => {
      (opts.onText as (u: { text: string; delta: string }) => void)({ text: "ok", delta: "ok" });
      return { text: "ok", truncated: false };
    }, { maxPromptBytes: 262144 });
    await sendTutor({ history: [], message: "Bonjour", mode: "expliquer", context: {} }, () => {}, new AbortController().signal);
    expect(calls[0].opts.tools).toBeUndefined();
    expect(calls[0].input[0].content).toContain("Outils indisponibles");
  });

  it("garde les échanges récents quand la conversation dépasse la limite", async () => {
    const calls = fakeClaude(async ({ opts }) => {
      (opts.onText as (u: { text: string; delta: string }) => void)({ text: "ok", delta: "ok" });
      return { text: "ok", truncated: false };
    });
    const long = "x".repeat(40_000);
    const history: BetaMessageParam[] = [];
    for (let k = 0; k < 8; k++) history.push({ role: "user", content: `Q${k} ${long}` }, { role: "assistant", content: `R${k} ${long}` });
    await sendTutor({ history, message: "Dernière", mode: "expliquer", context: {} }, () => {}, new AbortController().signal);
    const input = calls[0].input;
    const size = input.reduce((n, t) => n + new TextEncoder().encode(t.content).length, 0);
    expect(size).toBeLessThanOrEqual(262144);
    expect(input[1].role).toBe("user");
    expect(input[1].content.startsWith("Q")).toBe(true);
    expect(input.at(-2)!.content.startsWith("R7")).toBe(true);
  });

  it("refus d'autorisation → erreur permanente ; arrêt → AbortError", async () => {
    fakeClaude(async () => Promise.reject({ code: "not_granted", message: "x" }));
    const e1 = await sendTutor({ history: [], message: "a", mode: "expliquer", context: {} }, () => {}, new AbortController().signal).catch((e) => e);
    expect(e1).toBeInstanceOf(TutorError);
    expect(e1.permanent).toBe(true);

    fakeClaude(async () => Promise.reject({ code: "cancelled", message: "x" }));
    const e2 = await sendTutor({ history: [], message: "a", mode: "expliquer", context: {} }, () => {}, new AbortController().signal).catch((e) => e);
    expect(e2.name).toBe("AbortError");
  });
});
