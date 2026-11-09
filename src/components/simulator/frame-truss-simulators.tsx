"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { analyze } from "@/lib/mechanics/solver";
import { portalFrame, truss, type TrussType } from "@/lib/mechanics/presets";
import { fmt } from "@/lib/mechanics/format";
import { StructureView, courseValue, type StructureMode } from "@/components/mechanics/structure-svg";
import { Tex } from "@/components/math";
import { Badge, Callout, Card, CardContent, CardHeader, CardTitle, Label, Segmented, Select } from "@/components/ui";
import { recordSimulatorRun } from "@/lib/progress/store";
import { DEFAULT_SECTION, NumberField, SectionPicker, sectionProps, type SectionState } from "./fields";

function useRunCounter(dep: unknown) {
  const last = useRef(0);
  useEffect(() => {
    const t = setTimeout(() => {
      if (Date.now() - last.current > 4000) {
        last.current = Date.now();
        recordSimulatorRun();
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [dep]);
}

function ReactionsList({ reactions }: { reactions: Record<string, { rx: number; ry: number; mz: number; blocked: { x: boolean; y: boolean; rz: boolean } }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Nœud</th>
            <th className="py-2 pr-3 text-right font-medium">H (kN)</th>
            <th className="py-2 pr-3 text-right font-medium">V (kN)</th>
            <th className="py-2 text-right font-medium">M (kN·m)</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {Object.entries(reactions).map(([id, r]) => (
            <tr key={id} className="border-b border-border/60 last:border-0">
              <td className="py-2 pr-3 font-sans font-semibold">{id}</td>
              <td className="py-2 pr-3 text-right">{r.blocked.x ? fmt(r.rx, 2) : "—"}</td>
              <td className="py-2 pr-3 text-right">{r.blocked.y ? fmt(r.ry, 2) : "—"}</td>
              <td className="py-2 text-right">{r.blocked.rz ? fmt(r.mz, 2) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">Repère global : H positif vers la droite, V vers le haut, M anti-horaire.</p>
    </div>
  );
}

/* ====================================================================== */
/*                                 Portique                                */
/* ====================================================================== */
export function FrameSimulator() {
  const [p, setP] = useState({ span: 8, height: 5, base: "fixed" as "fixed" | "pin", q: 20, H: 15, P: 0 });
  const [colSec, setColSec] = useState<SectionState>({ ...DEFAULT_SECTION, ipe: "IPE 300" });
  const [beamSec, setBeamSec] = useState<SectionState>({ ...DEFAULT_SECTION, ipe: "IPE 360" });
  const [which, setWhich] = useState<"col" | "beam">("col");
  const [mode, setMode] = useState<StructureMode>("M");
  const c = sectionProps(colSec);
  const b = sectionProps(beamSec);
  const structure = useMemo(
    () => portalFrame({ ...p, E: c.E, Ac: c.A, Ic: c.I, Ab: b.A, Ib: b.I }),
    // l'acier de la traverse est supposé de même module que les poteaux si le matériau diffère
    [p, c.E, c.A, c.I, b.A, b.I],
  );
  // module propre à la traverse
  const structureE = useMemo(() => ({ ...structure, members: structure.members.map((m) => (m.id === "BC" ? { ...m, E: b.E } : m)) }), [structure, b.E]);
  const result = useMemo(() => analyze(structureE), [structureE]);
  useRunCounter(structureE);

  const set = (patch: Partial<typeof p>) => setP((x) => ({ ...x, ...patch }));

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Géométrie et liaisons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Portée L" unit="m" value={p.span} min={1} max={40} onChange={(span) => set({ span })} />
              <NumberField label="Hauteur h" unit="m" value={p.height} min={1} max={20} onChange={(height) => set({ height })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="base">Pieds de poteaux</Label>
              <Select id="base" value={p.base} onChange={(e) => set({ base: e.target.value as "fixed" | "pin" })}>
                <option value="fixed">Encastrés (h = 3)</option>
                <option value="pin">Articulés (h = 1)</option>
              </Select>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Charges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <NumberField label="Charge répartie sur la traverse q (vers le bas)" unit="kN/m" value={p.q} min={0} onChange={(q) => set({ q })} />
            <NumberField label="Force horizontale en tête du poteau gauche H" unit="kN" value={p.H} onChange={(H) => set({ H })} />
            <NumberField label="Force verticale à mi-portée P (vers le bas)" unit="kN" value={p.P} min={0} onChange={(P) => set({ P })} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Sections</CardTitle>
            <Segmented
              size="sm"
              value={which}
              onChange={setWhich}
              options={[
                { value: "col", label: "Poteaux" },
                { value: "beam", label: "Traverse" },
              ]}
            />
          </CardHeader>
          <CardContent>{which === "col" ? <SectionPicker value={colSec} onChange={setColSec} /> : <SectionPicker value={beamSec} onChange={setBeamSec} />}</CardContent>
        </Card>
      </div>

      <div className="min-w-0 space-y-4">
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>Portique simple</CardTitle>
            <Segmented
              size="sm"
              value={mode}
              onChange={setMode}
              options={[
                { value: "none", label: "Chargement" },
                { value: "N", label: "N" },
                { value: "T", label: "T" },
                { value: "M", label: "M" },
                { value: "deformee", label: "Déformée" },
              ]}
            />
          </CardHeader>
          <CardContent>
            {result.ok ? (
              <StructureView structure={structureE} result={result} mode={mode} showReactions={mode === "none"} />
            ) : (
              <Callout tone="danger" title="Calcul impossible">
                {result.error}
              </Callout>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Barres orientées de A vers B (poteau gauche), de B vers C (traverse) et de D vers C (poteau droit) ; y local obtenu en tournant x de +90°.
              Diagrammes reportés selon le y local : valeurs positives en bleu, négatives en rouge.
            </p>
          </CardContent>
        </Card>
        {result.ok && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Réactions d&apos;appui</CardTitle>
              </CardHeader>
              <CardContent>
                <ReactionsList reactions={result.reactions} />
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="warning">hyperstatique de degré {result.hyperstaticity.degree}</Badge>
                  <span className="text-xs text-muted-foreground">Les efforts dépendent des rigidités relatives EI des poteaux et de la traverse.</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Efforts aux extrémités des barres</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-2 font-medium">Barre</th>
                      <th className="py-2 pr-2 font-medium">Extr.</th>
                      <th className="py-2 pr-2 text-right font-medium">N</th>
                      <th className="py-2 pr-2 text-right font-medium">T</th>
                      <th className="py-2 text-right font-medium">M</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {structureE.members.flatMap((m) => {
                      const mr = result.members[m.id];
                      const a = mr.forcesAt(0, "right");
                      const z = mr.forcesAt(mr.L, "left");
                      return [
                        <tr key={`${m.id}0`} className="border-t border-border/60">
                          <td className="py-1.5 pr-2 font-sans font-semibold" rowSpan={2}>
                            {m.id}
                          </td>
                          <td className="py-1.5 pr-2 font-sans">{m.i}</td>
                          <td className="py-1.5 pr-2 text-right">{fmt(courseValue(a, "N"), 2)}</td>
                          <td className="py-1.5 pr-2 text-right">{fmt(courseValue(a, "T"), 2)}</td>
                          <td className="py-1.5 text-right">{fmt(courseValue(a, "M"), 2)}</td>
                        </tr>,
                        <tr key={`${m.id}1`}>
                          <td className="py-1.5 pr-2 font-sans">{m.j}</td>
                          <td className="py-1.5 pr-2 text-right">{fmt(courseValue(z, "N"), 2)}</td>
                          <td className="py-1.5 pr-2 text-right">{fmt(courseValue(z, "T"), 2)}</td>
                          <td className="py-1.5 text-right">{fmt(courseValue(z, "M"), 2)}</td>
                        </tr>,
                      ];
                    })}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-muted-foreground">kN et kN·m, convention du cours (dM/dx = −T).</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

/* ====================================================================== */
/*                                 Treillis                                */
/* ====================================================================== */
export function TrussSimulator() {
  const [p, setP] = useState({ type: "pratt" as TrussType, panels: 6, span: 12, height: 2, P: 10, loadedChord: "top" as "top" | "bottom", A: 20, E: 210 });
  const [mode, setMode] = useState<StructureMode>("efforts");
  const structure = useMemo(() => truss({ ...p, E: p.E * 1e6, A: p.A * 1e-4 }), [p]);
  const result = useMemo(() => analyze(structure), [structure]);
  useRunCounter(structure);
  const set = (patch: Partial<typeof p>) => setP((x) => ({ ...x, ...patch }));

  const forces = result.ok ? structure.members.map((m) => ({ m, N: result.members[m.id].forcesAt(result.members[m.id].L / 2).N })) : [];
  const maxT = forces.reduce((a, f) => (f.N > a.N ? f : a), forces[0] ?? { N: 0, m: undefined as never });
  const maxC = forces.reduce((a, f) => (f.N < a.N ? f : a), forces[0] ?? { N: 0, m: undefined as never });
  const h = result.ok ? result.hyperstaticity : null;
  const r = h?.reactions ?? 0;

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Treillis articulé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="ttype">Type</Label>
              <Select id="ttype" value={p.type} onChange={(e) => set({ type: e.target.value as TrussType })}>
                <option value="pratt">Pratt (diagonales tendues)</option>
                <option value="howe">Howe (diagonales comprimées)</option>
                <option value="warren">Warren (sans montants)</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Panneaux" value={p.panels} min={2} max={12} step={1} onChange={(panels) => set({ panels: Math.round(panels) })} />
              <NumberField label="Portée" unit="m" value={p.span} min={2} max={60} onChange={(span) => set({ span })} />
              <NumberField label="Hauteur" unit="m" value={p.height} min={0.3} max={10} onChange={(height) => set({ height })} />
              <NumberField label="Charge par nœud P" unit="kN" value={p.P} min={0} onChange={(P) => set({ P })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="chord">Nœuds chargés</Label>
              <Select id="chord" value={p.loadedChord} onChange={(e) => set({ loadedChord: e.target.value as "top" | "bottom" })}>
                <option value="top">Membrure supérieure</option>
                <option value="bottom">Membrure inférieure</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Section A" unit="cm²" value={p.A} min={0.1} onChange={(A) => set({ A })} />
              <NumberField label="Module E" unit="GPa" value={p.E} min={1} onChange={(E) => set({ E })} />
            </div>
          </CardContent>
        </Card>
        {h && (
          <Card>
            <CardHeader>
              <CardTitle>Isostaticité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Tex display>{`m + r - 2n = ${h.members} + ${r} - 2\\times${h.nodes} = ${h.members + r - 2 * h.nodes}`}</Tex>
              <p className="text-muted-foreground">
                m barres, r réactions, n nœuds. Le treillis est {h.degree === 0 ? "isostatique : la méthode des nœuds suffit" : h.degree > 0 ? "hyperstatique" : "hypostatique"}.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="min-w-0 space-y-4">
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>Efforts dans les barres</CardTitle>
            <Segmented
              size="sm"
              value={mode}
              onChange={setMode}
              options={[
                { value: "efforts", label: "Efforts N" },
                { value: "none", label: "Chargement" },
                { value: "deformee", label: "Déformée" },
              ]}
            />
          </CardHeader>
          <CardContent>
            {result.ok ? (
              <StructureView structure={structure} result={result} mode={mode} showReactions={mode === "none"} nodeLabels={mode !== "efforts"} />
            ) : (
              <Callout tone="danger" title="Calcul impossible">
                {result.error}
              </Callout>
            )}
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-1 w-5 rounded bg-[var(--diag-pos)]" /> traction (N &gt; 0)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-1 w-5 rounded bg-[var(--diag-neg)]" /> compression (N &lt; 0)
              </span>
              <span>épaisseur proportionnelle à |N|, valeurs en kN</span>
            </div>
          </CardContent>
        </Card>
        {result.ok && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Réactions et extrêmes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ReactionsList reactions={result.reactions} />
                {maxT?.m && (
                  <p className="text-sm">
                    Traction maximale : <strong>{fmt(maxT.N, 2)} kN</strong> ({maxT.m.i}–{maxT.m.j}) · Compression maximale :{" "}
                    <strong>{fmt(maxC.N, 2)} kN</strong> ({maxC.m.i}–{maxC.m.j})
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Tableau des efforts</CardTitle>
              </CardHeader>
              <CardContent className="max-h-80 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-2 font-medium">Barre</th>
                      <th className="py-2 pr-2 text-right font-medium">N (kN)</th>
                      <th className="py-2 text-right font-medium">Nature</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forces.map(({ m, N }) => (
                      <tr key={m.id} className="border-b border-border/60">
                        <td className="py-1.5 pr-2">
                          {m.i}–{m.j}
                        </td>
                        <td className="py-1.5 pr-2 text-right font-mono">{fmt(N, 2)}</td>
                        <td className="py-1.5 text-right text-xs">
                          {Math.abs(N) < 1e-6 ? <Badge variant="muted">barre à effort nul</Badge> : N > 0 ? <Badge>traction</Badge> : <Badge variant="danger">compression</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
