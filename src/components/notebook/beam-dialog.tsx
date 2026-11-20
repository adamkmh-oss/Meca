"use client";
/**
 * Saisie d'une poutre calculée en littéral : positions et charges en lettres
 * (L, a, L/2, F, q, C…), valeurs des lettres pour le dessin uniquement.
 */
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import katex from "katex";
import type { BeamModel } from "@/lib/mechanics/beam";
import { BEAM_PRESETS } from "@/components/simulator/beam-presets";
import { literalFromNumeric, litBounds, litReactions, litSymbols, litToModel, parseBeam, solveStatics, defaultValue, type LitBeam, type LitLoad, type LitSupportType } from "@/lib/notebook/literal-beam";
import { uid } from "@/lib/notebook/model";
import { Ex, tex, tryParse } from "@/lib/notebook/symbolic";
import type { BeamEl, BeamShow } from "@/lib/notebook/types";
import { Button } from "@/components/ui";
import { Modal, NumField, Segmented } from "./nb-ui";
import { LitBeamSchema } from "./literal-views";

const STEEL = { E: 210e6, A: 53.8e-4, I: 8356e-8 };

export interface BeamInsertOptions {
  lit: LitBeam;
  model: BeamModel;
  title: string;
  show: BeamShow;
  pfs: boolean;
  cuts: boolean;
  cutFigures: boolean;
}

const SUPPORT_TYPES: { value: LitSupportType; label: string }[] = [
  { value: "pin", label: "Articulation (2 inc.)" },
  { value: "roller", label: "Appui simple (1 inc.)" },
  { value: "fixed", label: "Encastrement (3 inc.)" },
  { value: "rollerX", label: "Appui simple vertical" },
];

const DIRECTIONS: { value: string; label: string }[] = [
  { value: "-90", label: "↓ vers le bas" },
  { value: "90", label: "↑ vers le haut" },
  { value: "0", label: "→ vers la droite" },
  { value: "180", label: "← vers la gauche" },
  { value: "-60", label: "↘ inclinée 60°" },
  { value: "-45", label: "↘ inclinée 45°" },
  { value: "-30", label: "↘ inclinée 30°" },
  { value: "-120", label: "↙ inclinée 60°" },
  { value: "-135", label: "↙ inclinée 45°" },
];

const kt = (s: string) => katex.renderToString(s, { throwOnError: false, strict: "ignore" });

function Sel<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
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

/** Champ d'expression littérale (L/2, 2a, qL…), souligné en rouge s'il est illisible. */
export function ExprField({ label, value, onChange, placeholder, className }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const ok = tryParse(value).ok;
  return (
    <label className={`flex min-w-0 flex-col gap-0.5 text-[11.5px] font-medium text-muted-foreground ${className ?? ""}`}>
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        className={`h-8 w-full min-w-0 rounded-lg border bg-background px-2 font-mono text-[13.5px] text-foreground outline-none focus:ring-2 focus:ring-primary/40 ${ok ? "border-input" : "border-danger ring-1 ring-danger/40"}`}
      />
    </label>
  );
}

function presetLit(id?: string): LitBeam {
  const p = BEAM_PRESETS.find((b) => b.id === id) ?? BEAM_PRESETS[0];
  return literalFromNumeric({ ...STEEL, ...structuredClone(p.draft) });
}

const VAR_HINT: Record<string, string> = { L: "m", l: "m", a: "m", b: "m", c: "m", d: "m", h: "m", q: "kN/m", p: "kN/m", F: "kN", P: "kN", C: "kN·m", M: "kN·m" };

export function BeamDialog({ initial, presetId, onSave, onCancel }: { initial?: BeamEl; presetId?: string; onSave: (o: BeamInsertOptions) => void; onCancel: () => void }) {
  const [lit, setLit] = useState<LitBeam>(() => (initial ? structuredClone(initial.lit ?? literalFromNumeric(initial.model)) : presetLit(presetId)));
  const [mat, setMat] = useState(() => (initial ? { E: initial.model.E, A: initial.model.A, I: initial.model.I } : STEEL));
  const [title, setTitle] = useState(initial?.title ?? "");
  const [show, setShow] = useState<BeamShow>(initial?.show ?? { schema: true, reactions: true, N: false, T: true, M: true, deformee: false });
  const [pfs, setPfs] = useState(!initial);
  const [cutsMode, setCutsMode] = useState<"aucune" | "equations" | "figures">(initial ? "aucune" : "equations");
  const [preset, setPreset] = useState(presetId ?? "");
  const [adv, setAdv] = useState(false);

  const parsed = useMemo(() => parseBeam(lit), [lit]);
  const model = useMemo(() => litToModel(lit, mat), [lit, mat]);
  const st = useMemo(() => (parsed.ok ? solveStatics(parsed.p) : null), [parsed]);
  const reacts = useMemo(() => litReactions(lit), [lit]);
  const symbols = useMemo(() => litSymbols(lit), [lit]);
  const vals = parsed.ok ? parsed.p.vals : {};
  const nseg = parsed.ok ? litBounds(parsed.p).length - 1 : 0;
  const canSave = parsed.ok && !!model && !!st?.ok;

  const setVar = (name: string, value: number) =>
    setLit((s) => ({ ...s, vars: s.vars.some((v) => v.name === name) ? s.vars.map((v) => (v.name === name ? { ...v, value } : v)) : [...s.vars, { name, value }] }));
  const upLoad = (id: string, patch: Partial<LitLoad>) => setLit((s) => ({ ...s, loads: s.loads.map((x) => (x.id === id ? ({ ...x, ...patch } as LitLoad) : x)) }));
  const letterOf = (id: string) => (parsed.ok ? (parsed.p.supports.find((s) => s.id === id)?.letter ?? "?") : "?");

  return (
    <Modal
      title={initial ? "Modifier la poutre calculée" : "Nouvelle poutre calculée"}
      onClose={onCancel}
      wide
      footer={
        <>
          <span className="mr-auto text-xs text-muted-foreground">{st?.ok ? `isostatique · ${nseg} tronçon(s)` : (st?.reason ?? "Expressions à corriger")}</span>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button disabled={!canSave} onClick={() => model && onSave({ lit, model, title, show, pfs, cuts: cutsMode === "equations", cutFigures: cutsMode === "figures" })}>
            {initial ? "Recalculer" : "Insérer dans la page"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="rounded-lg bg-primary-soft px-3 py-2 text-[12.5px] leading-snug text-primary">
          Écrivez positions et charges <b>en lettres</b> : <code>L</code>, <code>a</code>, <code>L/2</code>, <code>2a</code>, <code>L-a</code>, <code>F</code>, <code>q</code>, <code>2P</code>… Tout le calcul est rédigé en littéral ; les valeurs des lettres ne servent qu&apos;au dessin.
        </p>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_8rem]">
          <label className="flex flex-col gap-0.5 text-[11.5px] font-medium text-muted-foreground">
            Titre (facultatif)
            <input id="beam-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Exercice 2 — poutre de plancher" className="h-8 rounded-lg border border-input bg-background px-2 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-primary/40" />
          </label>
          {!initial && (
            <Sel
              label="Cas type"
              value={preset}
              onChange={(v) => {
                setPreset(v);
                if (v) setLit(presetLit(v));
              }}
              options={[{ value: "", label: "—" }, ...BEAM_PRESETS.map((p) => ({ value: p.id, label: p.label }))]}
            />
          )}
          <ExprField label="Longueur" value={lit.length} onChange={(v) => setLit((s) => ({ ...s, length: v }))} placeholder="L" />
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-white text-[#0f1a35] [--card:#fff] [--ink:#0f1a35] [--load:#c2410c] [--reaction:#0f9f58] [--primary:#1f5eff] [--muted-foreground:#56627f] [--border:#d5dceb]">
          {model && parsed.ok ? <LitBeamSchema lit={lit} model={model} /> : <div className="p-3 text-[12.5px] text-red-600">{!parsed.ok ? parsed.errors.join(" ; ") : "Expressions à corriger"}</div>}
          <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-dashed border-slate-200 px-3 py-1.5 text-[13px] text-[#0f9f58]">
            {st && !st.ok ? (
              <span className="text-red-600">{st.reason}</span>
            ) : (
              reacts
                .filter((r) => r.tex !== "0" || !r.sym.startsWith("H"))
                .map((r) => <span key={r.sym} dangerouslySetInnerHTML={{ __html: kt(`${tex(Ex.s(r.sym))} = ${r.tex}`) }} />)
            )}
          </div>
        </div>

        <section className="grid gap-4 lg:grid-cols-[1fr_15rem]">
          <div className="space-y-4">
            <section>
              <div className="mb-1.5 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold">Appuis</h3>
                <Button size="sm" variant="outline" onClick={() => setLit((s) => ({ ...s, supports: [...s.supports, { id: uid("s"), x: s.length, type: "roller" }] }))}>
                  <Plus /> Appui
                </Button>
              </div>
              <div className="space-y-1.5">
                {lit.supports.map((s) => (
                  <div key={s.id} className="grid grid-cols-[1.5rem_1fr_7rem_2rem] items-end gap-2">
                    <span className="pb-1.5 text-center text-[13px] font-bold">{letterOf(s.id)}</span>
                    <Sel label="Type" value={s.type} onChange={(v) => setLit((x) => ({ ...x, supports: x.supports.map((y) => (y.id === s.id ? { ...y, type: v } : y)) }))} options={SUPPORT_TYPES} />
                    <ExprField label="Position x" value={s.x} onChange={(v) => setLit((x) => ({ ...x, supports: x.supports.map((y) => (y.id === s.id ? { ...y, x: v } : y)) }))} placeholder="0, L, a…" />
                    <button type="button" onClick={() => setLit((x) => ({ ...x, supports: x.supports.filter((y) => y.id !== s.id) }))} className="mb-0.5 inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Supprimer l'appui">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[13px] font-semibold">Charges</h3>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setLit((s) => ({ ...s, loads: [...s.loads, { id: uid("l"), kind: "point", x: "L/2", F: "F", angle: -90 }] }))}>
                    <Plus /> Force
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setLit((s) => ({ ...s, loads: [...s.loads, { id: uid("l"), kind: "dist", x1: "0", x2: s.length, q1: "q", q2: "q" }] }))}>
                    <Plus /> Charge répartie
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setLit((s) => ({ ...s, loads: [...s.loads, { id: uid("l"), kind: "moment", x: "L/2", M: "C" }] }))}>
                    <Plus /> Couple
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {lit.loads.map((ld) => (
                  <div key={ld.id} className="grid grid-cols-2 items-end gap-2 rounded-lg border border-border p-2 sm:grid-cols-[6.5rem_repeat(4,minmax(0,1fr))_2rem]">
                    <span className="col-span-2 text-[12.5px] font-semibold sm:col-span-1 sm:pb-1.5">{ld.kind === "point" ? "Force" : ld.kind === "dist" ? "Charge répartie" : "Couple"}</span>
                    {ld.kind === "point" && (
                      <>
                        <ExprField label="Position x" value={ld.x} onChange={(v) => upLoad(ld.id, { x: v })} />
                        <ExprField label="Intensité" value={ld.F} onChange={(v) => upLoad(ld.id, { F: v })} placeholder="F" />
                        <Sel
                          label="Direction"
                          value={String(ld.angle)}
                          onChange={(v) => upLoad(ld.id, { angle: Number(v) })}
                          options={DIRECTIONS.some((d) => d.value === String(ld.angle)) ? DIRECTIONS : [...DIRECTIONS, { value: String(ld.angle), label: `${ld.angle}°` }]}
                        />
                        <span />
                      </>
                    )}
                    {ld.kind === "dist" && (
                      <>
                        <ExprField label="De" value={ld.x1} onChange={(v) => upLoad(ld.id, { x1: v })} />
                        <ExprField label="à" value={ld.x2} onChange={(v) => upLoad(ld.id, { x2: v })} />
                        <ExprField label="q début (↓ +)" value={ld.q1} onChange={(v) => upLoad(ld.id, { q1: v })} placeholder="q" />
                        <ExprField label="q fin (↓ +)" value={ld.q2} onChange={(v) => upLoad(ld.id, { q2: v })} placeholder="q" />
                      </>
                    )}
                    {ld.kind === "moment" && (
                      <>
                        <ExprField label="Position x" value={ld.x} onChange={(v) => upLoad(ld.id, { x: v })} />
                        <ExprField label="Couple (↺ +)" value={ld.M} onChange={(v) => upLoad(ld.id, { M: v })} placeholder="C" />
                        <span />
                        <span />
                      </>
                    )}
                    <button type="button" onClick={() => setLit((s) => ({ ...s, loads: s.loads.filter((x) => x.id !== ld.id) }))} className="mb-0.5 inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Supprimer la charge">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-xl border border-border p-2.5">
            <h3 className="text-[13px] font-semibold">Valeurs pour le dessin</h3>
            <p className="mb-2 text-[11.5px] leading-snug text-muted-foreground">Elles fixent seulement les proportions du schéma et l&apos;allure des diagrammes ; elles n&apos;apparaissent jamais dans les calculs.</p>
            <div className="space-y-1.5">
              {symbols.map((n) => (
                <div key={n} className="grid grid-cols-[2.6rem_1fr] items-end gap-2">
                  <span className="pb-1.5 text-right text-[14px]" dangerouslySetInnerHTML={{ __html: kt(tex(Ex.s(n))) }} />
                  <NumField label="" unit={VAR_HINT[n[0]] ?? ""} value={vals[n] ?? defaultValue(n, vals)} onChange={(v) => setVar(n, v)} />
                </div>
              ))}
            </div>
          </section>
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
                  ["deformee", "Allure de la déformée"],
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
              <h3 className="text-[13px] font-semibold">Rédaction automatique (en littéral)</h3>
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
            {adv ? "Masquer" : "Afficher"} les rotules internes et le matériau
          </button>
          {adv && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold">Rotules internes (poutre Gerber)</span>
                <Button size="sm" variant="outline" onClick={() => setLit((s) => ({ ...s, hinges: [...s.hinges, { id: uid("h"), x: "a" }] }))}>
                  <Plus /> Rotule
                </Button>
              </div>
              {lit.hinges.map((h) => (
                <div key={h.id} className="flex items-end gap-2">
                  <ExprField label="Position x" value={h.x} onChange={(v) => setLit((s) => ({ ...s, hinges: s.hinges.map((x) => (x.id === h.id ? { ...x, x: v } : x)) }))} className="w-40" />
                  <button type="button" onClick={() => setLit((s) => ({ ...s, hinges: s.hinges.filter((x) => x.id !== h.id) }))} className="mb-0.5 inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Supprimer la rotule">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              <div className="grid grid-cols-3 gap-2">
                <NumField label="E" unit="GPa" value={Math.round((mat.E / 1e6) * 1000) / 1000} onChange={(v) => setMat((m) => ({ ...m, E: Math.max(v, 0.001) * 1e6 }))} />
                <NumField label="I" unit="cm⁴" value={Math.round(mat.I * 1e8 * 100) / 100} onChange={(v) => setMat((m) => ({ ...m, I: Math.max(v, 0.0001) * 1e-8 }))} />
                <NumField label="A" unit="cm²" value={Math.round(mat.A * 1e4 * 100) / 100} onChange={(v) => setMat((m) => ({ ...m, A: Math.max(v, 0.0001) * 1e-4 }))} />
              </div>
              <p className="text-xs text-muted-foreground">Le matériau ne change que l&apos;allure de la déformée.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
