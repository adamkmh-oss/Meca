"use client";
/** Saisie d'un treillis calculé : cas type, nœuds, barres, appuis, charges, aperçu en direct. */
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { StructureView } from "@/components/mechanics/structure-svg";
import { txtn } from "@/lib/notebook/beam-notes";
import { uid } from "@/lib/notebook/model";
import {
  analyzeTruss,
  barName,
  nodeName,
  reactionsCount,
  trussPreset,
  TRUSS_PRESETS,
  type PresetParams,
  type TrussModel,
  type TrussPreset,
  type TrussSupport,
} from "@/lib/notebook/truss";
import type { TrussEl, TrussShow } from "@/lib/notebook/types";
import { Modal, NumField } from "./nb-ui";

export interface TrussInsertOptions {
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

const DEFAULT_PARAMS: PresetParams = { panels: 4, span: 8, height: 2, P: 10, chord: "top" };

export function TrussDialog({ initial, onSave, onCancel }: { initial?: TrussEl; onSave: (o: TrussInsertOptions) => void; onCancel: () => void }) {
  const [preset, setPreset] = useState<TrussPreset>("pratt");
  const [params, setParams] = useState<PresetParams>(DEFAULT_PARAMS);
  const [m, setM] = useState<TrussModel>(() => (initial ? structuredClone(initial.model) : trussPreset("pratt", DEFAULT_PARAMS)));
  const [title, setTitle] = useState(initial?.title ?? "");
  const [show, setShow] = useState<TrussShow>(initial?.show ?? { efforts: true, reactions: true, labels: true });
  const [notes, setNotes] = useState(!initial);
  const [editOpen, setEditOpen] = useState(!!initial);

  const an = useMemo(() => analyzeTruss(m), [m]);
  const ids = m.nodes.map((n) => ({ value: n.id, label: n.id }));
  const setParam = (patch: Partial<PresetParams>) => setParams((p) => ({ ...p, ...patch }));
  const generate = (kind = preset, p = params) => setM(trussPreset(kind, p));
  const ext = useMemo(() => {
    let t: { b: string; N: number } | null = null;
    let c: { b: string; N: number } | null = null;
    for (const b of m.bars) {
      const N = an.N[b.id];
      if (N === undefined) continue;
      if (!t || N > t.N) t = { b: barName(b), N };
      if (!c || N < c.N) c = { b: barName(b), N };
    }
    return { t, c };
  }, [an, m.bars]);

  const upNode = (id: string, patch: Partial<TrussModel["nodes"][number]>) => setM((s) => ({ ...s, nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
  const removeNode = (id: string) =>
    setM((s) => ({ ...s, nodes: s.nodes.filter((n) => n.id !== id), bars: s.bars.filter((b) => b.i !== id && b.j !== id), loads: s.loads.filter((l) => l.node !== id) }));
  const addNode = () =>
    setM((s) => {
      let k = 0;
      while (s.nodes.some((n) => n.id === nodeName(k))) k++;
      const maxX = Math.max(0, ...s.nodes.map((n) => n.x));
      return { ...s, nodes: [...s.nodes, { id: nodeName(k), x: maxX + 1, y: 0, support: "free" }] };
    });
  const addBar = () =>
    setM((s) => {
      // première paire de nœuds non encore reliée
      for (const a of s.nodes)
        for (const b of s.nodes) {
          if (a.id >= b.id) continue;
          if (!s.bars.some((x) => (x.i === a.id && x.j === b.id) || (x.i === b.id && x.j === a.id))) return { ...s, bars: [...s.bars, { id: uid("b"), i: a.id, j: b.id }] };
        }
      return s;
    });

  return (
    <Modal
      title={initial ? "Modifier le treillis" : "Nouveau treillis calculé"}
      onClose={onCancel}
      wide
      footer={
        <>
          <span className="mr-auto text-xs text-muted-foreground">
            {m.nodes.length} nœuds · {m.bars.length} barres · {reactionsCount(m)} réactions · b + r − 2n = {an.degree}
          </span>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button disabled={!an.result.ok} onClick={() => onSave({ model: m, title, show, notes })}>
            {initial ? "Recalculer" : "Insérer dans la page"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="flex flex-col gap-0.5 text-[11.5px] font-medium text-muted-foreground">
          Titre (facultatif)
          <input id="truss-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Exercice 3 — ferme de hangar" className="h-8 rounded-lg border border-input bg-background px-2 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-primary/40" />
        </label>

        <section className="rounded-xl border border-border p-3">
          <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))_auto]">
            <Sel
              label="Cas type"
              value={preset}
              onChange={(v) => {
                setPreset(v);
                if (!initial) generate(v, params);
              }}
              options={TRUSS_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
              className="col-span-2 sm:col-span-1"
            />
            {(preset === "pratt" || preset === "howe" || preset === "warren") && <NumField label="Panneaux" value={params.panels} min={2} max={12} step={1} onChange={(v) => setParam({ panels: Math.round(v) })} />}
            <NumField label={preset === "potence" ? "Portée (m)" : "Portée L"} unit="m" value={params.span} min={0.5} max={200} onChange={(v) => setParam({ span: v })} />
            <NumField label="Hauteur h" unit="m" value={params.height} min={0.2} max={100} onChange={(v) => setParam({ height: v })} />
            <NumField label="Charge P / nœud" unit="kN" value={params.P} onChange={(v) => setParam({ P: v })} />
            {(preset === "pratt" || preset === "howe" || preset === "warren") && (
              <Sel
                label="Nœuds chargés"
                value={params.chord}
                onChange={(v) => setParam({ chord: v })}
                options={[
                  { value: "top", label: "Membrure haute" },
                  { value: "bottom", label: "Membrure basse" },
                ]}
              />
            )}
            <Button variant="secondary" size="sm" onClick={() => generate()} className="h-8">
              {initial ? "Remplacer" : "Appliquer"}
            </Button>
          </div>
        </section>

        <div className="overflow-hidden rounded-xl border border-border bg-white text-[#0f1a35] [--card:#fff] [--ink:#0f1a35] [--load:#c2410c] [--reaction:#0f9f58] [--primary:#1f5eff] [--muted-foreground:#56627f] [--diag-pos:#1f5eff] [--diag-neg:#d9322b]">
          <StructureView structure={an.structure} result={an.result.ok ? an.result : null} mode={an.result.ok ? "efforts" : "none"} showReactions={an.result.ok} nodeLabels className="block" />
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 border-t border-dashed border-slate-200 px-3 py-1.5 text-[12.5px]">
            {an.result.ok ? (
              <>
                <span className="text-[#1f5eff]">bleu : traction</span>
                <span className="text-[#d9322b]">rouge : compression</span>
                {ext.t && ext.t.N > 1e-9 && (
                  <span>
                    Traction max {ext.t.b} = {txtn(ext.t.N, 2)} kN
                  </span>
                )}
                {ext.c && ext.c.N < -1e-9 && (
                  <span>
                    Compression max {ext.c.b} = {txtn(ext.c.N, 2)} kN
                  </span>
                )}
                <span className="text-slate-500">{an.degree === 0 ? "isostatique" : an.degree > 0 ? `hyperstatique (h = ${an.degree})` : "mécanisme"}</span>
              </>
            ) : (
              <span className="text-red-600">{an.error}</span>
            )}
          </div>
        </div>

        <div>
          <button type="button" onClick={() => setEditOpen((o) => !o)} className="cursor-pointer text-[13px] font-medium text-primary hover:underline">
            {editOpen ? "Masquer" : "Modifier"} les nœuds, les barres et les charges
          </button>
        </div>

        {editOpen && (
          <div className="grid gap-4 lg:grid-cols-2">
            <section>
              <div className="mb-1.5 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold">Nœuds et appuis</h3>
                <Button size="sm" variant="outline" onClick={addNode}>
                  <Plus /> Nœud
                </Button>
              </div>
              <div className="space-y-1.5">
                {m.nodes.map((n) => (
                  <div key={n.id} className="grid grid-cols-[1.6rem_4.6rem_4.6rem_1fr_2rem] items-end gap-1.5">
                    <span className="pb-1.5 text-center text-[13px] font-bold">{n.id}</span>
                    <NumField label="x" unit="m" value={n.x} onChange={(v) => upNode(n.id, { x: v })} />
                    <NumField label="y" unit="m" value={n.y} onChange={(v) => upNode(n.id, { y: v })} />
                    <Sel label="Appui" value={n.support} onChange={(v) => upNode(n.id, { support: v })} options={SUPPORTS} />
                    <button type="button" onClick={() => removeNode(n.id)} className="mb-0.5 inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label={`Supprimer le nœud ${n.id}`}>
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
            <div className="space-y-4">
              <section>
                <div className="mb-1.5 flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold">Barres</h3>
                  <Button size="sm" variant="outline" onClick={addBar}>
                    <Plus /> Barre
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {m.bars.map((b) => (
                    <div key={b.id} className="flex items-end gap-1 rounded-lg border border-border p-1.5">
                      <Sel label="De" value={b.i} onChange={(v) => setM((s) => ({ ...s, bars: s.bars.map((x) => (x.id === b.id ? { ...x, i: v } : x)) }))} options={ids} />
                      <Sel label="à" value={b.j} onChange={(v) => setM((s) => ({ ...s, bars: s.bars.map((x) => (x.id === b.id ? { ...x, j: v } : x)) }))} options={ids} />
                      <button type="button" onClick={() => setM((s) => ({ ...s, bars: s.bars.filter((x) => x.id !== b.id) }))} className="mb-0.5 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label={`Supprimer la barre ${barName(b)}`}>
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <div className="mb-1.5 flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold">Charges aux nœuds</h3>
                  <Button size="sm" variant="outline" onClick={() => setM((s) => ({ ...s, loads: [...s.loads, { id: uid("f"), node: s.nodes[0]?.id ?? "A", F: 10, angle: -90 }] }))}>
                    <Plus /> Force
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {m.loads.map((l) => (
                    <div key={l.id} className="grid grid-cols-[4.5rem_1fr_1fr_2rem] items-end gap-1.5">
                      <Sel label="Nœud" value={l.node} onChange={(v) => setM((s) => ({ ...s, loads: s.loads.map((x) => (x.id === l.id ? { ...x, node: v } : x)) }))} options={ids} />
                      <NumField label="Intensité F" unit="kN" value={l.F} onChange={(v) => setM((s) => ({ ...s, loads: s.loads.map((x) => (x.id === l.id ? { ...x, F: v } : x)) }))} />
                      <NumField label="Angle (−90 = ↓)" unit="°" value={l.angle} onChange={(v) => setM((s) => ({ ...s, loads: s.loads.map((x) => (x.id === l.id ? { ...x, angle: v } : x)) }))} />
                      <button type="button" onClick={() => setM((s) => ({ ...s, loads: s.loads.filter((x) => x.id !== l.id) }))} className="mb-0.5 inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Supprimer la force">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                  {m.loads.length === 0 && <p className="text-xs text-muted-foreground">Aucune charge : tous les efforts sont nuls.</p>}
                </div>
              </section>
            </div>
          </div>
        )}

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
              <h3 className="mb-1.5 text-[13px] font-semibold">Rédaction automatique</h3>
              <label className="flex items-start gap-2 text-[13px]">
                <input type="checkbox" className="mt-0.5" checked={notes} onChange={(e) => setNotes(e.target.checked)} />
                <span>Isostaticité, réactions (PFS), méthode des nœuds pas à pas et tableau des efforts</span>
              </label>
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}
