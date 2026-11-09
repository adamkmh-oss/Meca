import { describe, expect, it } from "vitest";
import type { BetaMessage, BetaMessageParam, BetaMessageStreamParams } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { evaluate, runTool, TOOLS } from "../tools";
import { buildKnowledge } from "../knowledge";
import { buildSystem, buildTurnContext, CONTEXT_MARKER } from "../prompt";
import { requestParams, runTutorTurn, type StreamLike, type TutorClient, type TutorEvent } from "../run";
import { AVAILABLE_CHAPTERS } from "@/content/modules";

const parse = (s: string) => JSON.parse(s);

describe("Outils de calcul du tuteur", () => {
  it("poutre sur deux appuis sous charge uniforme : réactions, Mmax, flèche, PFS pas à pas", () => {
    const out = runTool("analyser_poutre", {
      longueur: 6,
      appuis: [{ x: 0, type: "articulation" }, { x: 6, type: "appui_simple" }],
      charges: [{ type: "repartie", x1: 0, x2: 6, q1: 10 }],
      sections: [0, 3],
    });
    expect(out.ok).toBe(true);
    const r = parse(out.content);
    expect(r.hyperstaticite.degre).toBe(0);
    expect(r.reactions[0].V_kN).toBeCloseTo(30, 6);
    expect(r.reactions[1].V_kN).toBeCloseTo(30, 6);
    expect(r.extremums.M_max.valeur_kNm).toBeCloseTo(45, 6);
    expect(r.extremums.M_max.x).toBeCloseTo(3, 6);
    expect(r.efforts_aux_sections[0].T_droite_kN).toBeCloseTo(-30, 6); // convention du cours
    expect(r.extremums.fleche_max_mm.valeur).toBeCloseTo(-9.62, 2);
    expect(Array.isArray(r.calcul_main)).toBe(true);
  });

  it("console : moment d'encastrement et effort tranchant", () => {
    const r = parse(runTool("analyser_poutre", { longueur: 3, appuis: [{ x: 0, type: "encastrement" }], charges: [{ type: "ponctuelle", x: 3, F: 12 }], sections: [0.0001] }).content);
    expect(r.reactions[0].V_kN).toBeCloseTo(12, 6);
    expect(r.reactions[0].M_kNm).toBeCloseTo(36, 6);
    expect(r.efforts_aux_sections[0].T_droite_kN).toBeCloseTo(-12, 6);
  });

  it("treillis triangulaire : arbalétriers comprimés, entrait tendu", () => {
    const r = parse(
      runTool("analyser_treillis", {
        noeuds: [{ id: "A", x: 0, y: 0, appui: "articulation" }, { id: "B", x: 6, y: 0, appui: "appui_simple" }, { id: "C", x: 3, y: 2 }],
        barres: [{ i: "A", j: "B" }, { i: "A", j: "C" }, { i: "B", j: "C" }],
        charges: [{ noeud: "C", Fy: -30 }],
      }).content,
    );
    const N = Object.fromEntries(r.efforts.map((e: { barre: string; N_kN: number }) => [e.barre, e.N_kN]));
    expect(N["A-B"]).toBeCloseTo(22.5, 4);
    expect(N["A-C"]).toBeCloseTo(-27.04, 2);
    expect(r.test_isostaticite).toContain("= 0");
  });

  it("portique bi-articulé : équilibre vertical", () => {
    const r = parse(runTool("analyser_portique", { portee: 8, hauteur: 4, pieds: "articules", q: 20 }).content);
    expect(r.reactions.A.V_kN + r.reactions.D.V_kN).toBeCloseTo(160, 4);
    expect(r.hyperstaticite.degre).toBe(1);
  });

  it("sections : rectangle et IPE", () => {
    const rect = parse(runTool("caracteristiques_section", { forme: "rectangle", b_cm: 10, h_cm: 20 }).content);
    expect(rect.I_cm4).toBeCloseTo(6666.7, 1);
    expect(rect.W_cm3).toBeCloseTo(666.67, 1);
    expect(rect.I_min_cm4).toBeCloseTo(1666.7, 1);
    const p = parse(runTool("caracteristiques_section", { forme: "IPE", profil: "ipe300" }).content);
    expect(p.I_cm4).toBeCloseTo(8356, 3);
  });

  it("calculatrice : priorités, puissances, fonctions, erreurs", () => {
    expect(evaluate("5*10*6000^4/(384*210000*3,892e7)")).toBeCloseTo(20.65, 2);
    expect(evaluate("pi^2*11000*1.728e7/3000^2")).toBeCloseTo(208446.04, 1);
    expect(evaluate("-2^2")).toBe(-4);
    expect(evaluate("sqrt(3^2+4^2)")).toBe(5);
    expect(evaluate("cosd(60)")).toBeCloseTo(0.5, 12);
    expect(() => evaluate("2*/3")).toThrow();
    expect(() => evaluate("process.exit()")).toThrow();
    expect(runTool("calculer", { expression: "1/0" }).ok).toBe(false);
  });

  it("entrées invalides refusées sans exception", () => {
    expect(runTool("analyser_poutre", { longueur: -1, appuis: [], charges: [] }).ok).toBe(false);
    expect(runTool("inconnu", {}).ok).toBe(false);
  });

  it("chaque outil déclaré est exécutable et en entrée streamée", () => {
    for (const t of TOOLS) {
      expect(t.eager_input_streaming).toBe(true);
      expect(runTool(t.name, {}).content).toBeTypeOf("string");
    }
  });
});

describe("Base documentaire et prompt", () => {
  it("contient tous les chapitres rédigés, les conventions et les corrigés", () => {
    const k = buildKnowledge();
    for (const c of AVAILABLE_CHAPTERS) expect(k).toContain(c.title);
    expect(k).toContain("dM/dx = −T");
    expect(k).toContain("Structure (S4)");
    expect(k).toContain("Structure (S6)");
    expect(k.length).toBeLessThan(400_000);
  });
  it("est déterministe (préfixe stable pour le cache)", () => {
    expect(JSON.stringify(buildSystem())).toBe(JSON.stringify(buildSystem()));
    expect(JSON.stringify(requestParams([]))).toBe(JSON.stringify(requestParams([])));
  });
  it("contexte de tour marqué et borné", () => {
    const c = buildTurnContext("indices", { page: { path: "/cours/rdm/fleche", title: "Flèche" }, profil: { niveau: 2, xp: 150, maitrise: [{ chapitre: "Flèche", pct: 40 }], recents: [] } });
    expect(c.startsWith(CONTEXT_MARKER)).toBe(true);
    expect(c).toContain("indices");
  });
});

/* -------------------- Boucle de conversation (client simulé) -------------------- */
function fakeMessage(content: BetaMessage["content"], stop_reason: BetaMessage["stop_reason"]): BetaMessage {
  return { id: "msg", type: "message", role: "assistant", model: "claude-opus-5-5", content, stop_reason } as unknown as BetaMessage;
}

function scriptedClient(script: { text?: string; message: BetaMessage }[]) {
  const calls: BetaMessageStreamParams[] = [];
  let k = 0;
  const client: TutorClient = {
    stream(params) {
      calls.push(JSON.parse(JSON.stringify(params)));
      const step = script[k++];
      let listener: ((d: string) => void) | undefined;
      const s: StreamLike = {
        on(_e, l) {
          listener = l;
          return s;
        },
        async finalMessage() {
          if (step.text) listener?.(step.text);
          return step.message;
        },
      };
      return s;
    },
  };
  return { client, calls };
}

describe("Boucle du tuteur", () => {
  it("appelle l'outil, renvoie le résultat, puis termine ; historique en ajout seul", async () => {
    const { client, calls } = scriptedClient([
      {
        message: fakeMessage(
          [
            { type: "thinking", thinking: "", signature: "sig1" },
            { type: "tool_use", id: "tu_1", name: "calculer", input: { expression: "10*6^2/8" } },
          ] as BetaMessage["content"],
          "tool_use",
        ),
      },
      { text: "M_max = 45 kN·m", message: fakeMessage([{ type: "text", text: "M_max = 45 kN·m", citations: null }] as BetaMessage["content"], "end_turn") },
    ]);
    const history: BetaMessageParam[] = [
      { role: "user", content: "Bonjour" },
      { role: "system", content: `${CONTEXT_MARKER} Mode demandé : expliquer.` },
      { role: "assistant", content: "Bonjour !" },
    ];
    const turn: BetaMessageParam[] = [
      { role: "user", content: "Mmax pour q = 10 kN/m sur 6 m ?" },
      { role: "system", content: `${CONTEXT_MARKER} Mode demandé : expliquer.` },
    ];
    const events: TutorEvent[] = [];
    const added = await runTutorTurn(client, history, turn, (e) => events.push(e));

    expect(calls).toHaveLength(2);
    // Le 2e appel reprend exactement le 1er en ajoutant des messages à la fin.
    expect(calls[1].messages.slice(0, calls[0].messages.length)).toEqual(calls[0].messages);
    expect(calls[0].messages.slice(0, 3)).toEqual(history);
    // Les blocs de réflexion sont renvoyés tels quels.
    expect(JSON.stringify(calls[1].messages)).toContain("sig1");
    const toolResult = added[3] as { role: string; content: { type: string; tool_use_id: string; content: string }[] };
    expect(toolResult.role).toBe("user");
    expect(toolResult.content[0].tool_use_id).toBe("tu_1");
    expect(JSON.parse(toolResult.content[0].content).resultat).toBe(45);
    expect(events.map((e) => e.type)).toEqual(["tool", "tool_result", "text", "done"]);
    expect(added.map((m) => m.role)).toEqual(["user", "system", "assistant", "user", "assistant"]);
    expect(calls[0].fallbacks).toBe("default");
    expect(calls[0].model).toBe("claude-opus-5-5");
  });

  it("refus sans contenu : une réponse assistant est tout de même ajoutée", async () => {
    const { client } = scriptedClient([{ message: fakeMessage([], "refusal") }]);
    const added = await runTutorTurn(client, [], [{ role: "user", content: "?" }, { role: "system", content: `${CONTEXT_MARKER} x` }], () => {});
    expect(added[added.length - 1].role).toBe("assistant");
  });

  it("entrée d'outil tronquée (max_tokens) : appel refermé par un tool_result d'erreur", async () => {
    const { client } = scriptedClient([
      { message: fakeMessage([{ type: "tool_use", id: "tu_9", name: "calculer", input: { expression: "1+" } }] as BetaMessage["content"], "max_tokens") },
    ]);
    const added = await runTutorTurn(client, [], [{ role: "user", content: "?" }, { role: "system", content: `${CONTEXT_MARKER} x` }], () => {});
    const last = added[added.length - 1] as { role: string; content: { is_error?: boolean; tool_use_id: string }[] };
    expect(last.role).toBe("user");
    expect(last.content[0].tool_use_id).toBe("tu_9");
    expect(last.content[0].is_error).toBe(true);
  });
});
