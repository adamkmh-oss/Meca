"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { analyzeBeam, type BeamLoad, type BeamModel, type BeamSupport } from "@/lib/mechanics/beam";
import { BeamSchema } from "@/components/mechanics/beam-svg";
import { Badge, Button, Callout, Card, CardContent, CardHeader, CardTitle, Label, Segmented, Select } from "@/components/ui";
import { recordSimulatorRun } from "@/lib/progress/store";
import { BEAM_PRESETS, type BeamDraft } from "./beam-presets";
import { DEFAULT_SECTION, NumberField, SectionPicker, sectionProps, type SectionState } from "./fields";
import { BeamCalculations, BeamDiagrams, KeyValues, ReactionsTable } from "./beam-results";

const LETTERS = "ABCDEFGHIJKLMNOP";

function nextId(prefix: string, used: string[]) {
  let k = 1;
  while (used.includes(`${prefix}${k}`)) k++;
  return `${prefix}${k}`;
}

function clampDraft(d: BeamDraft): BeamDraft {
  const L = d.length;
  const c = (x: number) => Math.min(Math.max(x, 0), L);
  return {
    ...d,
    supports: d.supports.map((s) => ({ ...s, x: c(s.x) })),
    hinges: d.hinges.map((h) => ({ ...h, x: c(h.x) })),
    loads: d.loads.map((l) => (l.kind === "dist" ? { ...l, x1: c(l.x1), x2: c(l.x2) } : { ...l, x: c(l.x) })),
  };
}

const DIRECTIONS = [
  { value: "-90", label: "↓ verticale vers le bas" },
  { value: "90", label: "↑ verticale vers le haut" },
  { value: "0", label: "→ horizontale vers la droite" },
  { value: "180", label: "← horizontale vers la gauche" },
  { value: "custom", label: "Inclinée (angle libre)" },
];

export function BeamSimulator() {
  const [draft, setDraft] = useState<BeamDraft>(BEAM_PRESETS[0].draft);
  const [section, setSection] = useState<SectionState>(DEFAULT_SECTION);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"diagrammes" | "calculs">("diagrammes");
  const [preset, setPreset] = useState(BEAM_PRESETS[0].id);

  const sp = sectionProps(section);
  const model: BeamModel = useMemo(() => ({ ...draft, E: sp.E, A: sp.A, I: sp.I }), [draft, sp.E, sp.A, sp.I]);
  const an = useMemo(() => analyzeBeam(model), [model]);

  // compteur de calculs (badge « Ingénieur d'essai ») : au plus un toutes les 4 s
  const last = useRef(0);
  useEffect(() => {
    const t = setTimeout(() => {
      if (Date.now() - last.current > 4000) {
        last.current = Date.now();
        recordSimulatorRun();
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [model]);

  const update = (fn: (d: BeamDraft) => BeamDraft) => setDraft((d) => clampDraft(fn(d)));
  const setLoad = (id: string, patch: Partial<BeamLoad>) =>
    update((d) => ({ ...d, loads: d.loads.map((l) => (l.id === id ? ({ ...l, ...patch } as BeamLoad) : l)) }));
  const setSupport = (id: string, patch: Partial<BeamSupport>) =>
    update((d) => ({ ...d, supports: d.supports.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  const onDrag = (id: string, kind: "load" | "load2" | "support" | "hinge", x: number) => {
    update((d) => {
      if (kind === "support") return { ...d, supports: d.supports.map((s) => (s.id === id ? { ...s, x } : s)) };
      if (kind === "hinge") return { ...d, hinges: d.hinges.map((h) => (h.id === id ? { ...h, x } : h)) };
      return {
        ...d,
        loads: d.loads.map((l) => {
          if (l.id !== id) return l;
          if (l.kind === "dist") return kind === "load" ? { ...l, x1: x } : { ...l, x2: x };
          return { ...l, x };
        }),
      };
    });
  };

  const addLoad = (kind: BeamLoad["kind"]) => {
    const used = draft.loads.map((l) => l.id);
    const L = draft.length;
    let ld: BeamLoad;
    if (kind === "point") ld = { id: nextId("F", used), kind, x: +(L / 2).toFixed(2), F: 10, angle: -90 };
    else if (kind === "dist") ld = { id: nextId("q", used), kind, x1: 0, x2: L, q1: 5, q2: 5 };
    else ld = { id: nextId("C", used), kind, x: +(L / 2).toFixed(2), M: 10 };
    update((d) => ({ ...d, loads: [...d.loads, ld] }));
    setSelected(ld.id);
  };

  const addSupport = () => {
    const used = draft.supports.map((s) => s.id);
    const id = [...LETTERS].find((c) => !used.includes(c)) ?? nextId("S", used);
    update((d) => ({ ...d, supports: [...d.supports, { id, x: d.length / 2, type: "roller" }] }));
    setSelected(id);
  };

  const reactions =
    an.result.ok
      ? draft.supports.map((s) => {
          const nid = an.built.nodeIdAt(Math.min(Math.max(s.x, 0), draft.length));
          const r = nid && an.result.ok ? an.result.reactions[nid] : undefined;
          return { x: s.x, rx: r?.rx ?? 0, ry: r?.ry ?? 0, mz: r?.mz ?? 0 };
        })
      : undefined;

  return (
    <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
      {/* ----------------------------- Panneau de saisie ----------------------------- */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Modèle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="preset">Cas type</Label>
              <Select
                id="preset"
                value={preset}
                onChange={(e) => {
                  const p = BEAM_PRESETS.find((x) => x.id === e.target.value)!;
                  setPreset(p.id);
                  setDraft(p.draft);
                  setSelected(null);
                }}
              >
                {BEAM_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
            <NumberField label="Longueur de la poutre L" unit="m" value={draft.length} min={0.5} max={60} step={0.5} onChange={(length) => update((d) => ({ ...d, length }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Appuis et rotules</CardTitle>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={addSupport}>
                <Plus /> Appui
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const id = nextId("R", draft.hinges.map((h) => h.id));
                  update((d) => ({ ...d, hinges: [...d.hinges, { id, x: d.length / 2 }] }));
                }}
              >
                <Plus /> Rotule
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {draft.supports.map((s) => (
              <div key={s.id} className={`grid grid-cols-[20px_minmax(0,1fr)_86px_30px] items-end gap-1.5 rounded-lg p-1 ${selected === s.id ? "bg-primary-soft" : ""}`}>
                <span className="pb-2 text-sm font-semibold">{s.id}</span>
                <Select className="px-2 text-[13px]" aria-label={`Type de l'appui ${s.id}`} value={s.type} onChange={(e) => setSupport(s.id, { type: e.target.value as BeamSupport["type"] })}>
                  <option value="roller">Appui simple</option>
                  <option value="pin">Articulation</option>
                  <option value="fixed">Encastrement</option>
                </Select>
                <NumberField value={s.x} unit="m" min={0} max={draft.length} onChange={(x) => setSupport(s.id, { x })} />
                <Button size="icon" variant="ghost" aria-label={`Supprimer l'appui ${s.id}`} onClick={() => update((d) => ({ ...d, supports: d.supports.filter((x) => x.id !== s.id) }))}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            {draft.hinges.map((h) => (
              <div key={h.id} className="grid grid-cols-[20px_minmax(0,1fr)_86px_30px] items-end gap-1.5 p-1">
                <span className="pb-2 text-sm font-semibold">{h.id}</span>
                <span className="pb-2 text-sm text-muted-foreground">Rotule interne</span>
                <NumberField value={h.x} unit="m" min={0} max={draft.length} onChange={(x) => update((d) => ({ ...d, hinges: d.hinges.map((y) => (y.id === h.id ? { ...y, x } : y)) }))} />
                <Button size="icon" variant="ghost" aria-label={`Supprimer la rotule ${h.id}`} onClick={() => update((d) => ({ ...d, hinges: d.hinges.filter((y) => y.id !== h.id) }))}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            {draft.supports.length === 0 && <p className="text-sm text-muted-foreground">Aucun appui : ajoutez-en au moins un.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Charges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="outline" onClick={() => addLoad("point")}>
                <Plus /> Ponctuelle
              </Button>
              <Button size="sm" variant="outline" onClick={() => addLoad("dist")}>
                <Plus /> Répartie
              </Button>
              <Button size="sm" variant="outline" onClick={() => addLoad("moment")}>
                <Plus /> Couple
              </Button>
            </div>
            {draft.loads.map((l) => (
              <div key={l.id} className={`space-y-2 rounded-lg border p-2.5 ${selected === l.id ? "border-primary bg-primary-soft/50" : "border-border"}`} onClick={() => setSelected(l.id)}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {l.id}{" "}
                    <span className="font-normal text-muted-foreground">
                      {l.kind === "point" ? "force ponctuelle" : l.kind === "dist" ? "charge répartie" : "couple"}
                    </span>
                  </span>
                  <Button size="icon" variant="ghost" className="size-7" aria-label={`Supprimer ${l.id}`} onClick={() => update((d) => ({ ...d, loads: d.loads.filter((x) => x.id !== l.id) }))}>
                    <Trash2 />
                  </Button>
                </div>
                {l.kind === "point" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <NumberField label="Position x" unit="m" value={l.x} min={0} max={draft.length} onChange={(x) => setLoad(l.id, { x })} />
                      <NumberField label="Intensité F" unit="kN" value={l.F} min={0} onChange={(F) => setLoad(l.id, { F })} />
                    </div>
                    <Select
                      aria-label="Direction"
                      value={DIRECTIONS.some((d) => d.value === String(l.angle)) ? String(l.angle) : "custom"}
                      onChange={(e) => setLoad(l.id, { angle: e.target.value === "custom" ? -60 : Number(e.target.value) })}
                    >
                      {DIRECTIONS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </Select>
                    {!["-90", "90", "0", "180"].includes(String(l.angle)) && (
                      <NumberField label="Angle depuis l'horizontale (−90° = vers le bas)" unit="°" value={l.angle} min={-180} max={180} step={5} onChange={(angle) => setLoad(l.id, { angle })} />
                    )}
                  </>
                )}
                {l.kind === "dist" && (
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField label="Début x₁" unit="m" value={l.x1} min={0} max={draft.length} onChange={(x1) => setLoad(l.id, { x1 })} />
                    <NumberField label="Fin x₂" unit="m" value={l.x2} min={0} max={draft.length} onChange={(x2) => setLoad(l.id, { x2 })} />
                    <NumberField label="q₁ (vers le bas)" unit="kN/m" value={l.q1} onChange={(q1) => setLoad(l.id, { q1 })} />
                    <NumberField label="q₂ (vers le bas)" unit="kN/m" value={l.q2} onChange={(q2) => setLoad(l.id, { q2 })} />
                  </div>
                )}
                {l.kind === "moment" && (
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField label="Position x" unit="m" value={l.x} min={0} max={draft.length} onChange={(x) => setLoad(l.id, { x })} />
                    <NumberField label="C (+ anti-horaire)" unit="kN·m" value={l.M} onChange={(M) => setLoad(l.id, { M })} />
                  </div>
                )}
              </div>
            ))}
            {draft.loads.length === 0 && <p className="text-sm text-muted-foreground">Aucune charge.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Matériau et section</CardTitle>
          </CardHeader>
          <CardContent>
            <SectionPicker value={section} onChange={setSection} />
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------- Résultats ------------------------------- */}
      <div className="min-w-0 space-y-4">
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Schéma mécanique</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Faites glisser les charges et les appuis pour les déplacer (pas de 5 cm).</p>
            </div>
            <div className="flex items-center gap-2">
              {an.result.ok ? (
                <Badge variant={an.result.hyperstaticity.classification === "isostatique" ? "success" : "warning"}>
                  {an.result.hyperstaticity.classification}
                  {an.result.hyperstaticity.degree > 0 ? ` (h = ${an.result.hyperstaticity.degree})` : ""}
                </Badge>
              ) : (
                <Badge variant="danger">non calculable</Badge>
              )}
              <Button size="sm" variant="ghost" onClick={() => setDraft(BEAM_PRESETS.find((p) => p.id === preset)!.draft)}>
                <RotateCcw /> Réinitialiser
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <BeamSchema model={model} reactions={reactions} selectedId={selected} onSelect={setSelected} onDrag={onDrag} />
            <p className="text-xs text-muted-foreground">
              Réactions d&apos;appui en vert (sens réel). Charges en orange.
            </p>
          </CardContent>
        </Card>

        {!an.result.ok ? (
          <Callout tone="danger" title="Calcul impossible">
            {an.result.error}
          </Callout>
        ) : (
          <>
            <KeyValues an={an} W={sp.W} A={sp.A} strength={sp.strength} strengthLabel={sp.strengthLabel} />
            <Card>
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
                <CardTitle>Résultats</CardTitle>
                <Segmented
                  value={tab}
                  onChange={setTab}
                  options={[
                    { value: "diagrammes", label: "Diagrammes" },
                    { value: "calculs", label: "Calculs détaillés" },
                  ]}
                />
              </CardHeader>
              <CardContent className="space-y-4">
                {tab === "diagrammes" ? (
                  <>
                    <ReactionsTable an={an} />
                    <BeamDiagrams an={an} />
                    <p className="text-xs text-muted-foreground">
                      Convention du cours : torseur de cohésion appliqué à la partie gauche, dM/dx = −T. Valeurs positives reportées vers le haut ; la fibre
                      tendue est du côté opposé au diagramme du moment. Survolez un diagramme pour lire la valeur en tout point.
                    </p>
                  </>
                ) : (
                  <BeamCalculations an={an} />
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
