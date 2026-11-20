"use client";
/** Dialogues : éditeur de formules (LaTeX) et saisie d'une poutre calculée. */
import { useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { analyzeBeam, type BeamLoad, type BeamModel, type BeamSupport } from "@/lib/mechanics/beam";
import { BeamSchema } from "@/components/mechanics/beam-svg";
import { BEAM_PRESETS } from "@/components/simulator/beam-presets";
import { namedReactions, segmentBounds, txtn } from "@/lib/notebook/beam-notes";
import { uid } from "@/lib/notebook/model";
import type { BeamEl, BeamShow, MathEl } from "@/lib/notebook/types";
import { Button } from "@/components/ui";
import { Modal, NumField, Segmented } from "./nb-ui";
import { renderTexLines } from "./page-view";

/* ------------------------------------------------------------------ */
/*                               Formules                               */
/* ------------------------------------------------------------------ */
const PALETTE: { group: string; items: [string, string][] }[] = [
  {
    group: "Mécanique",
    items: [
      ["ΣFx", "\\Sigma F_x = 0"],
      ["ΣFy", "\\Sigma F_y = 0"],
      ["ΣM/A", "\\Sigma M_{/A} = 0"],
      ["V_A", "V_A"],
      ["H_A", "H_A"],
      ["M_A", "M_A"],
      ["N(x)", "N(x)"],
      ["T(x)", "T(x)"],
      ["M(x)", "M(x)"],
      ["dM/dx", "\\dfrac{\\mathrm{d}M}{\\mathrm{d}x} = -T"],
      ["σ = N/A", "\\sigma = \\dfrac{N}{A}"],
      ["σ flexion", "\\sigma = -\\dfrac{M\\,y}{I}"],
      ["I rect", "I = \\dfrac{b\\,h^3}{12}"],
      ["kN", "\\ \\text{kN}"],
      ["kN·m", "\\ \\text{kN·m}"],
      ["MPa", "\\ \\text{MPa}"],
    ],
  },
  {
    group: "Structure",
    items: [
      ["x²", "^{2}"],
      ["xᵢ", "_{i}"],
      ["a/b", "\\dfrac{a}{b}"],
      ["√", "\\sqrt{x}"],
      ["vecteur", "\\vec{F}"],
      ["∫", "\\int_{0}^{L}"],
      ["( )", "\\left( \\right)"],
      ["texte", "\\text{ }"],
      ["espace", "\\quad "],
      ["système", "\\begin{cases} a \\\\ b \\end{cases}"],
      ["matrice", "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}"],
      ["encadré", "\\boxed{}"],
    ],
  },
  {
    group: "Symboles",
    items: [
      ["⇒", "\\Rightarrow "],
      ["⇔", "\\Leftrightarrow "],
      ["≈", "\\approx "],
      ["≤", "\\le "],
      ["≥", "\\ge "],
      ["×", "\\times "],
      ["·", "\\cdot "],
      ["±", "\\pm "],
      ["≠", "\\neq "],
      ["∞", "\\infty "],
      ["✓", "\\checkmark "],
      ["°", "^{\\circ}"],
    ],
  },
  {
    group: "Grec",
    items: ["alpha", "beta", "gamma", "delta", "theta", "lambda", "mu", "nu", "pi", "rho", "sigma", "tau", "varphi", "omega", "varepsilon", "Delta", "Sigma", "Omega"].map((g) => [
      katexGreek(g),
      `\\${g} `,
    ]) as [string, string][],
  },
];

function katexGreek(name: string): string {
  const map: Record<string, string> = {
    alpha: "α",
    beta: "β",
    gamma: "γ",
    delta: "δ",
    theta: "θ",
    lambda: "λ",
    mu: "μ",
    nu: "ν",
    pi: "π",
    rho: "ρ",
    sigma: "σ",
    tau: "τ",
    varphi: "φ",
    omega: "ω",
    varepsilon: "ε",
    Delta: "Δ",
    Sigma: "Σ",
    Omega: "Ω",
  };
  return map[name] ?? name;
}

export function MathDialog({ initial, onSave, onCancel }: { initial?: MathEl; onSave: (p: { tex: string; size: number; boxed?: boolean }) => void; onCancel: () => void }) {
  const [tex, setTex] = useState(initial?.tex ?? "");
  const [size, setSize] = useState(initial?.size ?? 18);
  const [boxed, setBoxed] = useState(!!initial?.boxed);
  const ref = useRef<HTMLTextAreaElement>(null);
  const insert = (snippet: string) => {
    const t = ref.current;
    if (!t) return setTex((v) => v + snippet);
    const a = t.selectionStart;
    const b = t.selectionEnd;
    const next = tex.slice(0, a) + snippet + tex.slice(b);
    setTex(next);
    requestAnimationFrame(() => {
      t.focus();
      const pos = a + snippet.length;
      t.setSelectionRange(pos, pos);
    });
  };
  const html = useMemo(() => renderTexLines(tex), [tex]);
  return (
    <Modal
      title={initial ? "Modifier la formule" : "Nouvelle formule"}
      onClose={onCancel}
      wide
      footer={
        <>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button onClick={() => onSave({ tex, size, boxed: boxed || undefined })}>{initial ? (tex.trim() ? "Enregistrer" : "Supprimer") : "Insérer"}</Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <div className="space-y-2">
          <textarea
            ref={ref}
            value={tex}
            onChange={(e) => setTex(e.target.value)}
            rows={6}
            autoFocus
            spellCheck={false}
            placeholder={"\\Sigma M_{/A} = 0 :\\; V_B \\times 6 - 20 \\times 2 = 0\nV_B = 6{,}67\\ \\text{kN}"}
            className="w-full rounded-lg border border-input bg-background p-2.5 font-mono text-[13px] outline-none focus:ring-2 focus:ring-primary/40"
          />
          <p className="text-xs text-muted-foreground">Une équation par ligne. Virgule décimale : écrire <code>{"6{,}67"}</code>.</p>
          <div className="flex flex-wrap items-center gap-3 text-[13px]">
            <label className="flex items-center gap-2">
              Taille
              <input type="range" min={11} max={40} value={size} onChange={(e) => setSize(Number(e.target.value))} />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={boxed} onChange={(e) => setBoxed(e.target.checked)} /> Encadré
            </label>
          </div>
          <div className="min-h-24 overflow-x-auto rounded-lg border border-dashed border-border bg-white p-3 text-[#0f1a35]" style={{ fontSize: size }} dangerouslySetInnerHTML={{ __html: html || "<span style='opacity:.4;font-size:14px'>Aperçu</span>" }} />
        </div>
        <div className="space-y-2.5">
          {PALETTE.map((g) => (
            <div key={g.group}>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.group}</div>
              <div className="flex flex-wrap gap-1">
                {g.items.map(([label, snip]) => (
                  <button key={label + snip} type="button" onClick={() => insert(snip)} className="h-8 cursor-pointer rounded-md border border-border px-2 text-[12.5px] hover:border-primary hover:bg-primary-soft" title={snip}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*                           Poutre calculée                            */
/* ------------------------------------------------------------------ */
const STEEL = { E: 210e6, A: 53.8e-4, I: 8356e-8 };

export interface BeamInsertOptions {
  model: BeamModel;
  title: string;
  show: BeamShow;
  pfs: boolean;
  cuts: boolean;
  cutFigures: boolean;
}

const SUPPORT_TYPES: { value: BeamSupport["type"]; label: string }[] = [
  { value: "pin", label: "Articulation (2 inc.)" },
  { value: "roller", label: "Appui simple (1 inc.)" },
  { value: "fixed", label: "Encastrement (3 inc.)" },
  { value: "rollerX", label: "Appui simple vertical" },
];

function Select<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-0.5 text-[11.5px] font-medium text-muted-foreground">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="h-8 rounded-lg border border-input bg-background px-1.5 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-primary/40">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function BeamDialog({ initial, presetId, onSave, onCancel }: { initial?: BeamEl; presetId?: string; onSave: (o: BeamInsertOptions) => void; onCancel: () => void }) {
  const start = useMemo<BeamModel>(() => {
    if (initial) return initial.model;
    const p = BEAM_PRESETS.find((b) => b.id === presetId) ?? BEAM_PRESETS[0];
    return { ...STEEL, ...structuredClone(p.draft) };
  }, [initial, presetId]);
  const [m, setM] = useState<BeamModel>(start);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [show, setShow] = useState<BeamShow>(initial?.show ?? { schema: true, reactions: true, N: false, T: true, M: true, deformee: false });
  const [pfs, setPfs] = useState(!initial);
  const [cutsMode, setCutsMode] = useState<"aucune" | "equations" | "figures">(initial ? "aucune" : "equations");
  const [adv, setAdv] = useState(false);

  const an = useMemo(() => analyzeBeam(m), [m]);
  const reacts = useMemo(() => namedReactions(an), [an]);
  const L = m.length;
  const clampX = (x: number) => Math.min(Math.max(x, 0), L);

  const upSupport = (id: string, patch: Partial<BeamSupport>) => setM((s) => ({ ...s, supports: s.supports.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const upLoad = (id: string, patch: Partial<BeamLoad>) => setM((s) => ({ ...s, loads: s.loads.map((x) => (x.id === id ? ({ ...x, ...patch } as BeamLoad) : x)) }));
  const nseg = segmentBounds(m).length - 1;

  const sortedSupports = [...m.supports].sort((a, b) => a.x - b.x);
  const letter = (id: string) => "ABCDEFGHIJ"[sortedSupports.findIndex((s) => s.id === id)] ?? "?";

  return (
    <Modal
      title={initial ? "Modifier la poutre calculée" : "Nouvelle poutre calculée"}
      onClose={onCancel}
      wide
      footer={
        <>
          <span className="mr-auto text-xs text-muted-foreground">
            {an.result.ok ? `${an.result.hyperstaticity.classification} (h = ${an.result.hyperstaticity.degree}) · ${nseg} tronçon(s)` : "Structure non calculable"}
          </span>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button disabled={!an.result.ok} onClick={() => onSave({ model: m, title, show, pfs, cuts: cutsMode === "equations", cutFigures: cutsMode === "figures" })}>
            {initial ? "Recalculer" : "Insérer dans la page"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <label className="flex flex-col gap-0.5 text-[11.5px] font-medium text-muted-foreground">
            Titre (facultatif)
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Exercice 2 — poutre de plancher" className="h-8 rounded-lg border border-input bg-background px-2 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-primary/40" />
          </label>
          {!initial && (
            <Select
              label="Cas type"
              value={presetId ?? ""}
              onChange={(v) => {
                const p = BEAM_PRESETS.find((b) => b.id === v);
                if (p) setM({ ...STEEL, ...structuredClone(p.draft) });
              }}
              options={[{ value: "", label: "—" }, ...BEAM_PRESETS.map((p) => ({ value: p.id, label: p.label }))]}
            />
          )}
          <NumField label="Longueur L" unit="m" value={L} min={0.1} max={200} onChange={(v) => setM((s) => ({ ...s, length: v }))} className="w-28" />
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-white text-[#0f1a35] [--card:#fff] [--ink:#0f1a35] [--load:#c2410c] [--reaction:#0f9f58] [--primary:#1f5eff] [--muted-foreground:#56627f]">
          <BeamSchema model={m} reactions={an.result.ok ? reacts.map((r) => ({ x: r.x, rx: r.H ?? 0, ry: r.V ?? 0, mz: r.M ?? 0 })) : undefined} supportLabels />
          {an.result.ok ? (
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 border-t border-dashed border-slate-200 px-3 py-1.5 text-[12.5px] text-[#0f9f58]">
              {reacts.map((r) => (
                <span key={r.letter}>
                  <b>{r.letter}</b> :{r.H !== undefined && Math.abs(r.H) > 1e-9 ? ` H = ${txtn(r.H, 2)} ;` : ""}
                  {r.V !== undefined ? ` V = ${txtn(r.V, 2)} kN` : ""}
                  {r.M !== undefined ? ` ; M = ${txtn(r.M, 2)} kN·m` : ""}
                </span>
              ))}
              <span className="text-slate-500">
                M max = {txtn(an.extremes.Mmax.value, 2)} kN·m · M min = {txtn(an.extremes.Mmin.value, 2)} kN·m
              </span>
            </div>
          ) : (
            <div className="border-t border-dashed border-slate-200 px-3 py-1.5 text-[12.5px] text-red-600">{an.result.error}</div>
          )}
        </div>

        <section>
          <div className="mb-1.5 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold">Appuis</h3>
            <Button size="sm" variant="outline" onClick={() => setM((s) => ({ ...s, supports: [...s.supports, { id: uid("s"), x: L, type: "roller" }] }))}>
              <Plus /> Appui
            </Button>
          </div>
          <div className="space-y-1.5">
            {m.supports.map((s) => (
              <div key={s.id} className="grid grid-cols-[1.5rem_1fr_6.5rem_2rem] items-end gap-2">
                <span className="pb-1.5 text-center text-[13px] font-bold">{letter(s.id)}</span>
                <Select label="Type" value={s.type} onChange={(v) => upSupport(s.id, { type: v })} options={SUPPORT_TYPES} />
                <NumField label="Position x" unit="m" value={s.x} onChange={(v) => upSupport(s.id, { x: clampX(v) })} />
                <button type="button" onClick={() => setM((st) => ({ ...st, supports: st.supports.filter((x) => x.id !== s.id) }))} className="mb-0.5 inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Supprimer l'appui">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            {m.supports.length === 0 && <p className="text-xs text-danger">Ajoutez au moins un appui.</p>}
          </div>
        </section>

        <section>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[13px] font-semibold">Charges</h3>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" onClick={() => setM((s) => ({ ...s, loads: [...s.loads, { id: uid("l"), kind: "point", x: L / 2, F: 10, angle: -90 }] }))}>
                <Plus /> Force
              </Button>
              <Button size="sm" variant="outline" onClick={() => setM((s) => ({ ...s, loads: [...s.loads, { id: uid("l"), kind: "dist", x1: 0, x2: L, q1: 5, q2: 5 }] }))}>
                <Plus /> Charge répartie
              </Button>
              <Button size="sm" variant="outline" onClick={() => setM((s) => ({ ...s, loads: [...s.loads, { id: uid("l"), kind: "moment", x: L / 2, M: 10 }] }))}>
                <Plus /> Couple
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {m.loads.map((ld) => (
              <div key={ld.id} className="grid grid-cols-2 items-end gap-2 rounded-lg border border-border p-2 sm:grid-cols-[7rem_repeat(4,minmax(0,1fr))_2rem]">
                <span className="col-span-2 text-[12.5px] font-semibold sm:col-span-1 sm:pb-1.5">{ld.kind === "point" ? "Force" : ld.kind === "dist" ? "Charge répartie" : "Couple"}</span>
                {ld.kind === "point" && (
                  <>
                    <NumField label="Position x" unit="m" value={ld.x} onChange={(v) => upLoad(ld.id, { x: clampX(v) })} />
                    <NumField label="Intensité F" unit="kN" value={ld.F} onChange={(v) => upLoad(ld.id, { F: v })} />
                    <NumField label="Angle (−90 = ↓)" unit="°" value={ld.angle} onChange={(v) => upLoad(ld.id, { angle: v })} />
                    <span />
                  </>
                )}
                {ld.kind === "dist" && (
                  <>
                    <NumField label="De x₁" unit="m" value={ld.x1} onChange={(v) => upLoad(ld.id, { x1: clampX(v) })} />
                    <NumField label="à x₂" unit="m" value={ld.x2} onChange={(v) => upLoad(ld.id, { x2: clampX(v) })} />
                    <NumField label="q₁ (↓ +)" unit="kN/m" value={ld.q1} onChange={(v) => upLoad(ld.id, { q1: v })} />
                    <NumField label="q₂ (↓ +)" unit="kN/m" value={ld.q2} onChange={(v) => upLoad(ld.id, { q2: v })} />
                  </>
                )}
                {ld.kind === "moment" && (
                  <>
                    <NumField label="Position x" unit="m" value={ld.x} onChange={(v) => upLoad(ld.id, { x: clampX(v) })} />
                    <NumField label="Couple (↺ +)" unit="kN·m" value={ld.M} onChange={(v) => upLoad(ld.id, { M: v })} />
                    <span />
                    <span />
                  </>
                )}
                <button type="button" onClick={() => setM((s) => ({ ...s, loads: s.loads.filter((x) => x.id !== ld.id) }))} className="mb-0.5 inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Supprimer la charge">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-1.5 text-[13px] font-semibold">Dans la poutre</h3>
            <div className="grid grid-cols-2 gap-1 text-[13px]">
              {(
                [
                  ["schema", "Schéma mécanique"],
                  ["reactions", "Réactions"],
                  ["N", "Diagramme N(x)"],
                  ["T", "Diagramme T(x)"],
                  ["M", "Diagramme M(x)"],
                  ["deformee", "Déformée"],
                ] as [keyof BeamShow, string][]
              ).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="checkbox" checked={show[k]} onChange={(e) => setShow((s) => ({ ...s, [k]: e.target.checked }))} /> {label}
                </label>
              ))}
            </div>
          </div>
          {!initial && (
            <div className="space-y-2">
              <h3 className="text-[13px] font-semibold">Rédaction automatique</h3>
              <label className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" checked={pfs} onChange={(e) => setPfs(e.target.checked)} /> PFS : bilan, équations, réactions
              </label>
              <div className="text-[13px]">
                <div className="mb-1">Coupures (torseur de cohésion)</div>
                <Segmented
                  size="sm"
                  value={cutsMode}
                  onChange={setCutsMode}
                  options={[
                    { value: "aucune", label: "Aucune" },
                    { value: "equations", label: "Équations" },
                    { value: "figures", label: "Figures + équations" },
                  ]}
                />
              </div>
            </div>
          )}
        </section>

        <div>
          <button type="button" onClick={() => setAdv((a) => !a)} className="cursor-pointer text-[12.5px] font-medium text-primary hover:underline">
            {adv ? "Masquer" : "Afficher"} matériau, section et rotules
          </button>
          {adv && (
            <div className="mt-2 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <NumField label="E" unit="GPa" value={Math.round(m.E / 1e6 * 1000) / 1000} onChange={(v) => setM((s) => ({ ...s, E: Math.max(v, 0.001) * 1e6 }))} />
                <NumField label="I" unit="cm⁴" value={Math.round(m.I * 1e8 * 100) / 100} onChange={(v) => setM((s) => ({ ...s, I: Math.max(v, 0.0001) * 1e-8 }))} />
                <NumField label="A" unit="cm²" value={Math.round(m.A * 1e4 * 100) / 100} onChange={(v) => setM((s) => ({ ...s, A: Math.max(v, 0.0001) * 1e-4 }))} />
              </div>
              <p className="text-xs text-muted-foreground">Par défaut : acier, IPE 300. Sans effet sur les réactions d&apos;une poutre isostatique ; utile pour la déformée et les poutres hyperstatiques.</p>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold">Rotules internes</span>
                <Button size="sm" variant="outline" onClick={() => setM((s) => ({ ...s, hinges: [...s.hinges, { id: uid("h"), x: L / 2 }] }))}>
                  <Plus /> Rotule
                </Button>
              </div>
              {m.hinges.map((h) => (
                <div key={h.id} className="flex items-end gap-2">
                  <NumField label="Position x" unit="m" value={h.x} onChange={(v) => setM((s) => ({ ...s, hinges: s.hinges.map((x) => (x.id === h.id ? { ...x, x: clampX(v) } : x)) }))} className="w-40" />
                  <button type="button" onClick={() => setM((s) => ({ ...s, hinges: s.hinges.filter((x) => x.id !== h.id) }))} className="mb-0.5 inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Supprimer la rotule">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
