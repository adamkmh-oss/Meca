"use client";
/** Saisie d'un treillis calculé en littéral : coordonnées et charges en lettres (a, h, P…). */
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import katex from "katex";
import { Button } from "@/components/ui";
import { StructureView } from "@/components/mechanics/structure-svg";
import { uid } from "@/lib/notebook/model";
import { analyzeTruss, barName, nodeName, TRUSS_PRESETS, type TrussModel, type TrussPreset, type TrussSupport } from "@/lib/notebook/truss";
import { litTrussPreset, litTrussSymbols, litTrussToModel, literalTrussFromNumeric, parseTruss, solveLitTruss, type LitTruss } from "@/lib/notebook/literal-truss";
import { defaultValue } from "@/lib/notebook/literal-beam";
import { Ex, plain, tex } from "@/lib/notebook/symbolic";
import type { TrussEl, TrussShow } from "@/lib/notebook/types";
import { Modal, NumField } from "./nb-ui";
import { ExprField } from "./beam-dialog";

export interface TrussInsertOptions {
  lit: LitTruss;
  model: TrussModel;
  title: string;
  show: TrussShow;
  /** Rédaction : réactions, méthode des nœuds, tableau des efforts. */
  notes: boolean;
}

const SUPPORTS: { value: TrussSupport; label: string }[] = [
  { value: "free", label: "Nœud libre" },
  { value: "pin", label: "Articulation (2 inc.)" },
  { value: "roller", label: "Appui simple (1 inc.)" },
  { value: "rollerX", label: "Appui simple vertical" },
];

const DIRECTIONS = [
  { value: "-90", label: "↓" },
  { value: "90", label: "↑" },
  { value: "0", label: "→" },
  { value: "180", label: "←" },
  { value: "-45", label: "↘ 45°" },
  { value: "-135", label: "↙ 45°" },
];

const kt = (s: string) => katex.renderToString(s, { throwOnError: false, strict: "ignore" });

function Sel<T extends string>({ value, onChange, options, label, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string; className?: string }) {
  return (
    <label className={`flex min-w-0 flex-col gap-0.5 text-[11.5px] font-medium text-muted-foreground ${className ?? ""}`}>
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

export function TrussDialog({ initial, onSave, onCancel }: { initial?: TrussEl; onSave: (o: TrussInsertOptions) => void; onCancel: () => void }) {
  const [preset, setPreset] = useState<TrussPreset>("pratt");
  const [panels, setPanels] = useState(4);
  const [chord, setChord] = useState<"top" | "bottom">("top");
  const [lit, setLit] = useState<LitTruss>(() => (initial ? structuredClone(initial.lit ?? literalTrussFromNumeric(initial.model)) : litTrussPreset("pratt", 4, "top")));
  const [title, setTitle] = useState(initial?.title ?? "");
  const [show, setShow] = useState<TrussShow>(initial?.show ?? { efforts: true, reactions: true, labels: true });
  const [notes, setNotes] = useState(!initial);
  const [editOpen, setEditOpen] = useState(!!initial);

  const parsed = useMemo(() => parseTruss(lit), [lit]);
  const model = useMemo(() => litTrussToModel(lit), [lit]);
  const an = useMemo(() => (model ? analyzeTruss(model) : null), [model]);
  const sol = useMemo(() => (parsed.ok ? solveLitTruss(parsed.p) : null), [parsed]);
  const symbols = useMemo(() => litTrussSymbols(lit), [lit]);
  const vals = parsed.ok ? parsed.p.vals : {};
  const ids = lit.nodes.map((n) => ({ value: n.id, label: n.id }));
  const generate = (kind = preset, n = panels, c = chord) => setLit((old) => ({ ...litTrussPreset(kind, n, c), vars: old.vars.length ? old.vars : litTrussPreset(kind).vars }));
  const setVar = (name: string, value: number) =>
    setLit((s) => ({ ...s, vars: s.vars.some((v) => v.name === name) ? s.vars.map((v) => (v.name === name ? { ...v, value } : v)) : [...s.vars, { name, value }] }));
  const upNode = (id: string, patch: Partial<LitTruss["nodes"][number]>) => setLit((s) => ({ ...s, nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
  const canSave = !!model && !!an && !an.error && !!sol?.ok;

  return (
    <Modal
      title={initial ? "Modifier le treillis" : "Nouveau treillis calculé"}
      onClose={onCancel}
      wide
      footer={
        <>
          <span className="mr-auto text-xs text-muted-foreground">
            {lit.nodes.length} nœuds · {lit.bars.length} barres · b + r − 2n = {an?.degree ?? "—"}
          </span>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button disabled={!canSave} onClick={() => model && onSave({ lit, model, title, show, notes })}>
            {initial ? "Recalculer" : "Insérer dans la page"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="rounded-lg bg-primary-soft px-3 py-2 text-[12.5px] leading-snug text-primary">
          Coordonnées et charges <b>en lettres</b> (<code>a</code>, <code>2a</code>, <code>h</code>, <code>h/2</code>, <code>P</code>, <code>2P</code>…). Les barres inclinées reçoivent un angle α, β… défini par sa tangente ; tous les efforts sont écrits en littéral.
        </p>
        <label className="flex flex-col gap-0.5 text-[11.5px] font-medium text-muted-foreground">
          Titre (facultatif)
          <input id="truss-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Exercice 3 — ferme de hangar" className="h-8 rounded-lg border border-input bg-background px-2 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-primary/40" />
        </label>

        <section className="rounded-xl border border-border p-3">
          <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1.6fr_repeat(2,minmax(0,1fr))_auto]">
            <Sel
              label="Cas type"
              value={preset}
              onChange={(v) => {
                setPreset(v);
                if (!initial) generate(v);
              }}
              options={TRUSS_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
              className="col-span-2 sm:col-span-1"
            />
            {(preset === "pratt" || preset === "howe" || preset === "warren") && (
              <>
                <NumField label="Panneaux" value={panels} min={2} max={12} step={1} onChange={(v) => setPanels(Math.round(v))} />
                <Sel
                  label="Nœuds chargés"
                  value={chord}
                  onChange={setChord}
                  options={[
                    { value: "top", label: "Membrure haute" },
                    { value: "bottom", label: "Membrure basse" },
                  ]}
                />
              </>
            )}
            <Button variant="secondary" size="sm" onClick={() => generate()} className="h-8">
              {initial ? "Remplacer" : "Appliquer"}
            </Button>
          </div>
        </section>

        <div className="overflow-hidden rounded-xl border border-border bg-white text-[#0f1a35] [--card:#fff] [--ink:#0f1a35] [--load:#c2410c] [--reaction:#0f9f58] [--primary:#1f5eff] [--muted-foreground:#56627f] [--diag-pos:#1f5eff] [--diag-neg:#d9322b]">
          {an && model ? (
            <StructureView
              structure={an.structure}
              result={an.result.ok ? an.result : null}
              mode={an.result.ok ? "efforts" : "none"}
              showReactions={an.result.ok}
              nodeLabels
              memberText={(id) => {
                const b = lit.bars.find((x) => x.id === id);
                const v = sol?.N.get(id);
                if (!b) return "";
                const t = v ? plain(v) : "";
                return t && t.length <= 16 ? t : barName(b);
              }}
              loadText={(k) => {
                const l = parsed.ok ? parsed.p.loads.filter((x) => !(x.fx.isZero() && x.fy.isZero()))[k] : undefined;
                return l ? plain(l.F) : "";
              }}
              reactionText={(node, comp) => `${comp}_${node}`}
              className="block"
            />
          ) : (
            <div className="p-3 text-[12.5px] text-red-600">{!parsed.ok ? parsed.errors.join(" ; ") : "Treillis incomplet"}</div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-dashed border-slate-200 px-3 py-1.5 text-[12.5px]">
            {an?.error ? (
              <span className="text-red-600">{an.error}</span>
            ) : (
              <>
                <span className="text-[#1f5eff]">bleu : traction</span>
                <span className="text-[#d9322b]">rouge : compression</span>
                {parsed.ok && parsed.p.angles.map((g) => <span key={g.name} dangerouslySetInnerHTML={{ __html: kt(`\\tan ${tex(Ex.s(g.name))} = ${g.tanTex}`) }} />)}
                {sol && !sol.ok && <span className="text-red-600">{sol.reason}</span>}
              </>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_14rem]">
          <div>
            <button type="button" onClick={() => setEditOpen((o) => !o)} className="cursor-pointer text-[13px] font-medium text-primary hover:underline">
              {editOpen ? "Masquer" : "Modifier"} les nœuds, les barres et les charges
            </button>
            {editOpen && (
              <div className="mt-2 space-y-4">
                <section>
                  <div className="mb-1.5 flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold">Nœuds et appuis</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setLit((s) => {
                          let k = 0;
                          while (s.nodes.some((n) => n.id === nodeName(k))) k++;
                          return { ...s, nodes: [...s.nodes, { id: nodeName(k), x: "a", y: "0", support: "free" }] };
                        })
                      }
                    >
                      <Plus /> Nœud
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    {lit.nodes.map((n) => (
                      <div key={n.id} className="grid grid-cols-[1.6rem_5rem_5rem_1fr_2rem] items-end gap-1.5">
                        <span className="pb-1.5 text-center text-[13px] font-bold">{n.id}</span>
                        <ExprField label="x" value={n.x} onChange={(v) => upNode(n.id, { x: v })} />
                        <ExprField label="y" value={n.y} onChange={(v) => upNode(n.id, { y: v })} />
                        <Sel label="Appui" value={n.support} onChange={(v) => upNode(n.id, { support: v })} options={SUPPORTS} />
                        <button
                          type="button"
                          onClick={() => setLit((s) => ({ ...s, nodes: s.nodes.filter((x) => x.id !== n.id), bars: s.bars.filter((b) => b.i !== n.id && b.j !== n.id), loads: s.loads.filter((l) => l.node !== n.id) }))}
                          className="mb-0.5 inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger"
                          aria-label={`Supprimer le nœud ${n.id}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <div className="mb-1.5 flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold">Barres</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setLit((s) => {
                          for (const a of s.nodes)
                            for (const b of s.nodes) {
                              if (a.id >= b.id) continue;
                              if (!s.bars.some((x) => (x.i === a.id && x.j === b.id) || (x.i === b.id && x.j === a.id))) return { ...s, bars: [...s.bars, { id: uid("b"), i: a.id, j: b.id }] };
                            }
                          return s;
                        })
                      }
                    >
                      <Plus /> Barre
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {lit.bars.map((b) => (
                      <div key={b.id} className="flex items-end gap-1 rounded-lg border border-border p-1.5">
                        <Sel label="De" value={b.i} onChange={(v) => setLit((s) => ({ ...s, bars: s.bars.map((x) => (x.id === b.id ? { ...x, i: v } : x)) }))} options={ids} />
                        <Sel label="à" value={b.j} onChange={(v) => setLit((s) => ({ ...s, bars: s.bars.map((x) => (x.id === b.id ? { ...x, j: v } : x)) }))} options={ids} />
                        <button type="button" onClick={() => setLit((s) => ({ ...s, bars: s.bars.filter((x) => x.id !== b.id) }))} className="mb-0.5 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label={`Supprimer la barre ${barName(b)}`}>
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <div className="mb-1.5 flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold">Charges aux nœuds</h3>
                    <Button size="sm" variant="outline" onClick={() => setLit((s) => ({ ...s, loads: [...s.loads, { id: uid("f"), node: s.nodes[0]?.id ?? "A", F: "P", angle: -90 }] }))}>
                      <Plus /> Force
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    {lit.loads.map((l) => (
                      <div key={l.id} className="grid grid-cols-[4.5rem_1fr_6rem_2rem] items-end gap-1.5">
                        <Sel label="Nœud" value={l.node} onChange={(v) => setLit((s) => ({ ...s, loads: s.loads.map((x) => (x.id === l.id ? { ...x, node: v } : x)) }))} options={ids} />
                        <ExprField label="Intensité" value={l.F} onChange={(v) => setLit((s) => ({ ...s, loads: s.loads.map((x) => (x.id === l.id ? { ...x, F: v } : x)) }))} placeholder="P" />
                        <Sel
                          label="Direction"
                          value={String(l.angle)}
                          onChange={(v) => setLit((s) => ({ ...s, loads: s.loads.map((x) => (x.id === l.id ? { ...x, angle: Number(v) } : x)) }))}
                          options={DIRECTIONS.some((d) => d.value === String(l.angle)) ? DIRECTIONS : [...DIRECTIONS, { value: String(l.angle), label: `${l.angle}°` }]}
                        />
                        <button type="button" onClick={() => setLit((s) => ({ ...s, loads: s.loads.filter((x) => x.id !== l.id) }))} className="mb-0.5 inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Supprimer la force">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>
          <section className="rounded-xl border border-border p-2.5">
            <h3 className="text-[13px] font-semibold">Valeurs pour le dessin</h3>
            <p className="mb-2 text-[11.5px] leading-snug text-muted-foreground">Seulement pour les proportions du dessin ; jamais dans les calculs.</p>
            <div className="space-y-1.5">
              {symbols.map((n) => (
                <div key={n} className="grid grid-cols-[2.4rem_1fr] items-end gap-2">
                  <span className="pb-1.5 text-right text-[14px]" dangerouslySetInnerHTML={{ __html: kt(tex(Ex.s(n))) }} />
                  <NumField label="" value={vals[n] ?? defaultValue(n, vals)} onChange={(v) => setVar(n, v)} />
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-1.5 text-[13px] font-semibold">Dans le dessin</h3>
            <div className="grid grid-cols-1 gap-1 text-[13px]">
              {(
                [
                  ["efforts", "Efforts N et couleurs traction / compression"],
                  ["reactions", "Réactions d'appui"],
                  ["labels", "Noms des nœuds"],
                ] as [keyof TrussShow, string][]
              ).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="checkbox" checked={show[k]} onChange={(e) => setShow((s) => ({ ...s, [k]: e.target.checked }))} /> {label}
                </label>
              ))}
            </div>
          </div>
          {!initial && (
            <div>
              <h3 className="mb-1.5 text-[13px] font-semibold">Rédaction automatique (en littéral)</h3>
              <label className="flex items-start gap-2 text-[13px]">
                <input type="checkbox" className="mt-0.5" checked={notes} onChange={(e) => setNotes(e.target.checked)} />
                <span>Isostaticité, angles, réactions (PFS), méthode des nœuds pas à pas et tableau des efforts</span>
              </label>
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}
