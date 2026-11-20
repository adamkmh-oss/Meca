/** Cahier d'exemple créé au premier lancement : il montre ce que fait chaque outil. */
import type { BeamModel } from "@/lib/mechanics/beam";
import { analyzeBeam } from "@/lib/mechanics/beam";
import { cutsMarkdown, pfsMarkdown } from "./beam-notes";
import { newPage, uid } from "./model";
import type { Notebook, NoteElement, SymbolEl } from "./types";
import { CUT, INK, LOAD, REACTION, symbolDef } from "./symbols";

const STEEL = { E: 210e6, A: 53.8e-4, I: 8356e-8 };

function sym(kind: string, x: number, y: number, extra: Partial<SymbolEl> = {}): SymbolEl {
  return { id: uid("e"), type: "symbol", kind, x, y, rot: 0, scale: 1, ...symbolDef(kind).defaults, ...extra };
}

export function demoNotebook(): Notebook {
  const model: BeamModel = {
    ...STEEL,
    length: 6,
    hinges: [],
    supports: [
      { id: "A", x: 0, type: "pin" },
      { id: "B", x: 6, type: "roller" },
    ],
    loads: [
      { id: "q", kind: "dist", x1: 0, x2: 6, q1: 10, q2: 10 },
      { id: "F", kind: "point", x: 2, F: 20, angle: -90 },
    ],
  };
  const an = analyzeBeam(model);
  const group = uid("g");
  const now = Date.now();

  const p1 = newPage("carreaux");
  p1.title = "Mode d'emploi";
  const e1: NoteElement[] = [
    { id: uid("e"), type: "text", x: 60, y: 44, w: 680, text: "**Cahier de mécanique des structures**", size: 26, color: "#1f5eff" },
    {
      id: uid("e"),
      type: "text",
      x: 60,
      y: 96,
      w: 680,
      size: 15,
      color: INK,
      text:
        "- **Stylo** sensible à la pression, **surligneur**, **gomme** (trait entier ou précise), **lasso** pour déplacer, agrandir, copier\n- Gardez le stylet immobile en fin de trait : la droite ou le cercle devient parfait\n- **Bibliothèque mécanique** : appuis, charges, réactions, coupures et torseurs, sections, axes de diagrammes, PFS et formulaire\n- **Poutre calculée** : saisissez appuis et charges, le cahier écrit le PFS, les coupures et trace N, T, M\n- Texte : Markdown et formules entre deux signes `$`, par exemple $\\Sigma F_y = 0$\n- Deux doigts pour zoomer, tape à deux doigts pour annuler",
    },
    sym("poutre-2-appuis", 120, 430, { len: 300 }),
    sym("charge-uniforme", 120, 427, { color: LOAD, len: 300, h: 26, label: "q" }),
    sym("force", 220, 396, { color: LOAD, label: "F", len: 52 }),
    sym("cote", 120, 516, { len: 300, label: "L" }),
    sym("repere", 470, 510, { len: 52 }),
    { id: uid("e"), type: "text", x: 560, y: 390, w: 190, size: 13, color: "#56627f", text: "Symboles insérés depuis la bibliothèque : touchez-les avec le lasso pour les déplacer, les pivoter ou changer leurs étiquettes." },
    sym("troncon-gauche", 170, 650, { len: 220, color: CUT }),
    { id: uid("e"), type: "text", x: 560, y: 610, w: 190, size: 13, color: "#56627f", text: "Coupure préfaite : partie gauche isolée avec $N$, $T$, $M$ (convention du cours)." },
    sym("reaction-v", 640, 880, { color: REACTION, label: "V_A" }),
    sym("articulation", 640, 880),
    { id: uid("e"), type: "math", x: 100, y: 850, tex: "\\Sigma F_x = 0 :\\quad H_A = 0\n\\Sigma F_y = 0 :\\quad V_A + V_B - qL - F = 0\n\\Sigma M_{/A} = 0 :\\quad V_B\\,L - qL\\,\\dfrac{L}{2} - F\\,a = 0", size: 17, color: INK },
  ];
  p1.elements = e1;

  const p2 = newPage("carreaux");
  p2.title = "Poutre calculée";
  p2.elements = [
    { id: uid("e"), type: "text", x: 77, y: 34, w: 640, size: 15, color: "#56627f", text: "Double-touchez la poutre (outil lasso) pour changer appuis et charges : schéma, réactions, PFS, coupures et diagrammes se recalculent." },
    { id: uid("e"), group, type: "beam", x: 77, y: 84, w: 640, title: "Poutre de 6 m — q = 10 kN/m et F = 20 kN", model, show: { schema: true, reactions: true, N: false, T: true, M: true, deformee: false } },
  ];

  const p3 = newPage("carreaux");
  p3.title = "PFS et coupures";
  p3.elements = [
    { id: uid("e"), group, role: "pfs", type: "text", x: 77, y: 40, w: 640, size: 14, color: INK, text: pfsMarkdown(model, an) },
  ];
  const p4 = newPage("carreaux");
  p4.title = "Coupures";
  p4.elements = [
    { id: uid("e"), group, type: "cut", x: 77, y: 40, w: 640, model, seg: 0 },
    { id: uid("e"), group, type: "cut", x: 77, y: 560, w: 640, model, seg: 1 },
  ];
  const p5 = newPage("carreaux");
  p5.title = "Équations des tronçons";
  p5.elements = [{ id: uid("e"), group, role: "cuts", type: "text", x: 77, y: 40, w: 640, size: 14, color: INK, text: cutsMarkdown(model, an) }];
  const p6 = newPage("etude-poutre");
  p6.title = "À vous";

  return { version: 1, id: uid("n"), title: "Exemple — poutre sur deux appuis", cover: "#1f5eff", createdAt: now, updatedAt: now, pages: [p1, p2, p3, p4, p5, p6] };
}
