"use client";
/**
 * Schémas interactifs des chapitres. Chaque widget calcule ses valeurs avec le
 * moteur du simulateur ou avec les formules exactes du cours.
 */
import { useMemo, useState } from "react";
import type { WidgetId } from "@/content/types";
import { analyzeBeam, type BeamModel } from "@/lib/mechanics/beam";
import { analyze } from "@/lib/mechanics/solver";
import { IPE_TABLE, ipe } from "@/lib/mechanics/sections";
import { fmt } from "@/lib/mechanics/format";
import { Arrow, BeamSchema, BeamPlot } from "@/components/mechanics/beam-svg";
import { StructureView } from "@/components/mechanics/structure-svg";
import { BeamDiagrams } from "@/components/simulator/beam-results";
import { Tex } from "@/components/math";
import { Label, Segmented, Select } from "@/components/ui";
import { cn } from "@/lib/utils";

const STEEL = { E: 210e6, A: 53.8e-4, I: 8356e-8 };

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  decimals = 1,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
  decimals?: number;
}) {
  return (
    <label className="block space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold">
          {fmt(value, decimals)} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--primary)]"
      />
    </label>
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-border bg-card p-4", className)}>{children}</div>;
}

function Result({ label, value, tone = "default" }: { label: React.ReactNode; value: React.ReactNode; tone?: "default" | "primary" }) {
  return (
    <div className="rounded-lg bg-muted px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("font-mono text-sm font-semibold", tone === "primary" && "text-primary")}>{value}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                         Convertisseur d'unités                       */
/* ------------------------------------------------------------------ */
const UNIT_SETS: Record<string, { label: string; units: Record<string, number> }> = {
  force: { label: "Force", units: { N: 1, daN: 10, kN: 1e3, MN: 1e6, t: 9810 } },
  longueur: { label: "Longueur", units: { mm: 1e-3, cm: 1e-2, m: 1 } },
  aire: { label: "Aire", units: { "mm²": 1e-6, "cm²": 1e-4, "m²": 1 } },
  inertie: { label: "Moment quadratique", units: { "mm⁴": 1e-12, "cm⁴": 1e-8, "m⁴": 1 } },
  contrainte: { label: "Contrainte / pression", units: { Pa: 1, "kN/m²": 1e3, "N/mm²": 1e6, MPa: 1e6, GPa: 1e9, bar: 1e5 } },
  moment: { label: "Moment", units: { "N·mm": 1e-3, "N·m": 1, "kN·m": 1e3, "MN·m": 1e6 } },
  lineique: { label: "Charge linéique", units: { "N/m": 1, "daN/m": 10, "kN/m": 1e3, "N/mm": 1e3 } },
};

function UnitConverter() {
  const [set, setSet] = useState("contrainte");
  const units = Object.keys(UNIT_SETS[set].units);
  const [from, setFrom] = useState("kN/m²");
  const [to, setTo] = useState("MPa");
  const [val, setVal] = useState(2500);
  const u = UNIT_SETS[set].units;
  const f = u[from] ?? u[units[0]];
  const t = u[to] ?? u[units[1]];
  const out = (val * f) / t;
  return (
    <Panel className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-4">
        <div className="space-y-1">
          <Label>Grandeur</Label>
          <Select
            value={set}
            onChange={(e) => {
              const s = e.target.value;
              const k = Object.keys(UNIT_SETS[s].units);
              setSet(s);
              setFrom(k[0]);
              setTo(k[k.length - 1]);
            }}
          >
            {Object.entries(UNIT_SETS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Valeur</Label>
          <input type="number" value={val} onChange={(e) => setVal(Number(e.target.value))} className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm" />
        </div>
        <div className="space-y-1">
          <Label>De</Label>
          <Select value={u[from] !== undefined ? from : units[0]} onChange={(e) => setFrom(e.target.value)}>
            {units.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Vers</Label>
          <Select value={u[to] !== undefined ? to : units[1]} onChange={(e) => setTo(e.target.value)}>
            {units.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="rounded-lg bg-primary-soft px-4 py-3 text-center font-mono text-lg font-semibold text-primary">
        {val.toLocaleString("fr-FR")} {u[from] !== undefined ? from : units[0]} = {out.toLocaleString("fr-FR", { maximumSignificantDigits: 6 })} {u[to] !== undefined ? to : units[1]}
      </div>
      <p className="text-xs text-muted-foreground">Facteur de conversion : 1 {from} = {(f / t).toLocaleString("fr-FR", { maximumSignificantDigits: 6 })} {to}</p>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/*                           Moment d'une force                         */
/* ------------------------------------------------------------------ */
function MomentLever() {
  const [F, setF] = useState(20);
  const [theta, setTheta] = useState(-60);
  const [d, setD] = useState(2);
  const rad = (theta * Math.PI) / 180;
  const M = d * F * Math.sin(rad);
  const dperp = Math.abs(d * Math.sin(rad));
  const k = 140;
  const O = { x: 90, y: 150 };
  const A = { x: O.x + d * k, y: O.y };
  const len = 90;
  const tail = { x: A.x - len * Math.cos(rad), y: A.y + len * Math.sin(rad) };
  // pied de la perpendiculaire de O sur la ligne d'action
  const ux = Math.cos(rad);
  const uy = -Math.sin(rad);
  const tproj = (O.x - A.x) * ux + (O.y - A.y) * uy;
  const H = { x: A.x + tproj * ux, y: A.y + tproj * uy };
  return (
    <Panel className="@container grid grid-cols-1 gap-4 @2xl:grid-cols-[1fr_240px]">
      <svg viewBox="0 0 560 300" className="w-full text-ink" role="img" aria-label="Moment d'une force">
        <line x1={A.x + tproj * ux * 1.6} y1={A.y + tproj * uy * 1.6} x2={A.x - tproj * ux * 0.6} y2={A.y - tproj * uy * 0.6} stroke="var(--muted-foreground)" strokeDasharray="5 5" opacity={0.6} />
        <line x1={O.x} y1={O.y} x2={H.x} y2={H.y} stroke="var(--primary)" strokeWidth={2} strokeDasharray="4 3" />
        <line x1={O.x} y1={O.y} x2={A.x} y2={A.y} stroke="currentColor" strokeWidth={6} />
        <circle cx={O.x} cy={O.y} r={7} fill="var(--card)" stroke="currentColor" strokeWidth={2} />
        <Arrow x1={tail.x} y1={tail.y} x2={A.x} y2={A.y} width={3} head={12} />
        <text x={O.x - 10} y={O.y - 12} fontSize={15} fontStyle="italic" fill="currentColor">O</text>
        <text x={A.x + 8} y={A.y + 20} fontSize={15} fontStyle="italic" fill="currentColor">A</text>
        <text x={(O.x + H.x) / 2 + 6} y={(O.y + H.y) / 2 - 6} fontSize={13} fill="var(--primary)">d⊥ = {fmt(dperp, 2)} m</text>
        <text x={tail.x} y={tail.y + (Math.sin(rad) < 0 ? -10 : 20)} fontSize={14} fontWeight={600} textAnchor="middle" fill="var(--load)">F</text>
        {Math.abs(M) > 1e-6 && (
          <text x={O.x} y={O.y + 60} fontSize={14} fontWeight={600} textAnchor="middle" fill={M > 0 ? "var(--success)" : "var(--danger)"}>
            {M > 0 ? "↺ anti-horaire" : "↻ horaire"}
          </text>
        )}
      </svg>
      <div className="space-y-3">
        <Slider label="Intensité F" value={F} min={0} max={50} step={1} unit="kN" decimals={0} onChange={setF} />
        <Slider label="Direction θ (depuis +x)" value={theta} min={-180} max={180} step={5} unit="°" decimals={0} onChange={setTheta} />
        <Slider label="Longueur OA" value={d} min={0.5} max={2.5} step={0.1} unit="m" onChange={setD} />
        <Result label="Bras de levier d⊥ = d·|sin θ|" value={`${fmt(dperp, 2)} m`} />
        <Result label="M/O = x_A·F_y − y_A·F_x" value={`${fmt(M, 2)} kN·m`} tone="primary" />
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/*                         Équilibre d'un levier                        */
/* ------------------------------------------------------------------ */
function EquilibriumBeam() {
  const [P, setP] = useState(30);
  const [a, setA] = useState(1.5);
  const [b, setB] = useState(3);
  const F = (P * a) / b;
  const model: BeamModel = { ...STEEL, length: a + b, hinges: [], supports: [{ id: "O", x: a, type: "pin" }], loads: [{ id: "P", kind: "point", x: 0, F: P, angle: -90 }, { id: "F", kind: "point", x: a + b, F, angle: -90 }] };
  const an = analyzeBeam(model);
  const R = an.result.ok ? an.result.reactions[an.built.nodeIdAt(a)!].ry : 0;
  return (
    <Panel className="space-y-3">
      <BeamSchema model={model} reactions={[{ x: a, rx: 0, ry: R, mz: 0 }]} showDims />
      <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          <Slider label="Charge P (en C)" value={P} min={5} max={60} step={1} unit="kN" decimals={0} onChange={setP} />
          <Slider label="Bras de levier a" value={a} min={0.5} max={3} step={0.1} unit="m" onChange={setA} />
          <Slider label="Bras de levier b" value={b} min={0.5} max={4} step={0.1} unit="m" onChange={setB} />
        </div>
        <div className="space-y-2">
          <Tex display>{`\\Sigma M_{/O} = 0 \\Rightarrow P\\,a - F\\,b = 0 \\Rightarrow F = \\frac{${fmt(P, 0)}\\times ${fmt(a, 1).replace(",", "{,}")}}{${fmt(b, 1).replace(",", "{,}")}} = ${fmt(F, 2).replace(",", "{,}")}\\ \\text{kN}`}</Tex>
          <Tex display>{`\\Sigma F_y = 0 \\Rightarrow R_O = P + F = ${fmt(R, 2).replace(",", "{,}")}\\ \\text{kN}`}</Tex>
          <p className="text-xs text-muted-foreground">La réaction R<sub>O</sub> affichée en vert est calculée par le solveur : elle coïncide avec le PFS.</p>
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/*                           Galerie des liaisons                       */
/* ------------------------------------------------------------------ */
const SUPPORTS = [
  { id: "roller", name: "Appui simple", dof: "Bloque : translation perpendiculaire au plan d'appui. Libre : translation parallèle, rotation.", unknowns: ["V"], tex: "\\{V\\}", n: 1 },
  { id: "pin", name: "Articulation (rotule)", dof: "Bloque : les deux translations. Libre : la rotation.", unknowns: ["H", "V"], tex: "\\{H,\\,V\\}", n: 2 },
  { id: "fixed", name: "Encastrement", dof: "Bloque : les deux translations et la rotation. Aucun mouvement possible.", unknowns: ["H", "V", "M"], tex: "\\{H,\\,V,\\,M\\}", n: 3 },
];

function SupportsGallery() {
  const [sel, setSel] = useState("pin");
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {SUPPORTS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => setSel(s.id)}
          className={cn("rounded-xl border bg-card p-4 text-left transition-colors cursor-pointer", sel === s.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40")}
        >
          <svg viewBox="0 0 200 130" className="w-full text-ink" aria-hidden>
            <line x1={20} y1={50} x2={s.id === "fixed" ? 100 : 180} y2={50} stroke="currentColor" strokeWidth={5} />
            {s.id === "fixed" ? (
              <g>
                <line x1={100} y1={22} x2={100} y2={78} stroke="currentColor" strokeWidth={3} />
                {Array.from({ length: 7 }, (_, k) => (
                  <line key={k} x1={100} y1={25 + k * 8} x2={109} y2={32 + k * 8} stroke="currentColor" />
                ))}
              </g>
            ) : (
              <g>
                <path d="M100 54 L86 78 L114 78 Z" fill="var(--card)" stroke="currentColor" strokeWidth={1.6} />
                {s.id === "roller" ? (
                  <>
                    <circle cx={93} cy={83} r={4} fill="var(--card)" stroke="currentColor" />
                    <circle cx={107} cy={83} r={4} fill="var(--card)" stroke="currentColor" />
                    <line x1={80} y1={88} x2={120} y2={88} stroke="currentColor" strokeWidth={1.5} />
                  </>
                ) : (
                  <line x1={80} y1={78} x2={120} y2={78} stroke="currentColor" strokeWidth={1.5} />
                )}
              </g>
            )}
            {sel === s.id && (
              <g>
                <Arrow x1={100} y1={125} x2={100} y2={s.id === "roller" ? 94 : 84} color="var(--danger)" width={2.4} head={9} />
                <text x={108} y={118} fontSize={13} fill="var(--danger)" fontWeight={600}>V</text>
                {s.n >= 2 && (
                  <>
                    <Arrow x1={40} y1={100} x2={s.id === "fixed" ? 92 : 84} y2={100} color="var(--danger)" width={2.4} head={9} />
                    <text x={44} y={94} fontSize={13} fill="var(--danger)" fontWeight={600}>H</text>
                  </>
                )}
                {s.n === 3 && (
                  <>
                    <path d="M128 70 A26 26 0 1 0 128 30" fill="none" stroke="var(--danger)" strokeWidth={2.4} />
                    <polygon points="128,30 118,26 122,36" fill="var(--danger)" />
                    <text x={134} y={24} fontSize={13} fill="var(--danger)" fontWeight={600}>M</text>
                  </>
                )}
              </g>
            )}
          </svg>
          <div className="mt-2 font-semibold">{s.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">{s.dof}</div>
          <div className="mt-2 text-sm">
            {s.n} inconnue{s.n > 1 ? "s" : ""} : <Tex>{s.tex}</Tex>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                        Réactions d'une poutre                        */
/* ------------------------------------------------------------------ */
function ReactionsBeam() {
  const L = 6;
  const [P, setP] = useState(30);
  const [a, setA] = useState(2);
  const model: BeamModel = { ...STEEL, length: L, hinges: [], supports: [{ id: "A", x: 0, type: "pin" }, { id: "B", x: L, type: "roller" }], loads: [{ id: "P", kind: "point", x: a, F: P, angle: -90 }] };
  const an = analyzeBeam(model);
  const VA = an.result.ok ? an.result.reactions.N0.ry : 0;
  const VB = an.result.ok ? an.result.reactions.N1.ry : 0;
  const t = (v: number) => fmt(v, 2).replace(",", "{,}");
  return (
    <Panel className="@container space-y-3">
      <BeamSchema
        model={model}
        reactions={[
          { x: 0, rx: 0, ry: VA, mz: 0 },
          { x: L, rx: 0, ry: VB, mz: 0 },
        ]}
        onDrag={(_, __, x) => setA(Math.min(Math.max(x, 0), L))}
      />
      <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
        <div className="space-y-3">
          <Slider label="Position de la charge a" value={a} min={0} max={L} step={0.05} unit="m" decimals={2} onChange={setA} />
          <Slider label="Intensité P" value={P} min={5} max={60} step={1} unit="kN" decimals={0} onChange={setP} />
          <p className="text-xs text-muted-foreground">Astuce : faites aussi glisser la flèche directement sur le schéma.</p>
        </div>
        <div className="space-y-1">
          <Tex display>{`\\Sigma M_{/A} = 0:\\; V_B\\cdot 6 - ${P}\\times ${t(a)} = 0 \\;\\Rightarrow\\; V_B = ${t(VB)}\\ \\text{kN}`}</Tex>
          <Tex display>{`\\Sigma F_y = 0:\\; V_A = ${P} - ${t(VB)} = ${t(VA)}\\ \\text{kN}`}</Tex>
          <p className="text-xs text-muted-foreground">Observez : la somme des réactions vaut toujours P ; l&apos;appui le plus proche de la charge en reprend la plus grande part.</p>
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/*                    Coupure et torseur de cohésion                    */
/* ------------------------------------------------------------------ */
function CutExplorer() {
  const L = 8;
  const model: BeamModel = useMemo(
    () => ({
      ...STEEL,
      length: L,
      hinges: [],
      supports: [
        { id: "A", x: 0, type: "pin" },
        { id: "B", x: L, type: "roller" },
      ],
      loads: [
        { id: "q", kind: "dist", x1: 0, x2: L, q1: 5, q2: 5 },
        { id: "P", kind: "point", x: 5, F: 20, angle: -90 },
      ],
    }),
    [],
  );
  const an = useMemo(() => analyzeBeam(model), [model]);
  const [x, setX] = useState(3);
  const f = an.at(x);
  const T = -f.V;
  const VA = an.result.ok ? an.result.reactions.N0.ry : 0;
  const leftLoads = 5 * x + (x > 5 ? 20 : 0);
  const k = 600 / L;
  const X = (v: number) => 50 + v * k;
  return (
    <Panel className="space-y-3">
      <svg viewBox="0 0 720 200" className="w-full text-ink" role="img" aria-label="Partie gauche isolée">
        {/* partie gauche isolée */}
        <line x1={X(0)} y1={110} x2={X(x)} y2={110} stroke="currentColor" strokeWidth={5} />
        <line x1={X(x)} y1={110} x2={X(L)} y2={110} stroke="currentColor" strokeWidth={5} opacity={0.15} />
        {Array.from({ length: Math.max(2, Math.round(x / 0.5)) + 1 }, (_, i) => {
          const xx = X((x * i) / Math.max(2, Math.round(x / 0.5)));
          return <Arrow key={i} x1={xx} y1={78} x2={xx} y2={104} width={1.2} head={6} />;
        })}
        <line x1={X(0)} y1={78} x2={X(x)} y2={78} stroke="var(--load)" />
        {x > 5 && <Arrow x1={X(5)} y1={40} x2={X(5)} y2={104} width={2.4} />}
        <Arrow x1={X(0)} y1={170} x2={X(0)} y2={116} color="var(--reaction)" width={2.4} />
        <text x={X(0) + 8} y={168} fontSize={13} fontWeight={600} fill="var(--reaction)">V_A = {fmt(VA, 2)} kN</text>
        {/* torseur sur la coupure (sens positif du repère local) */}
        <rect x={X(x) - 3} y={92} width={6} height={36} fill="var(--card)" stroke="currentColor" />
        <Arrow x1={X(x) + 4} y1={110} x2={X(x) + 60} y2={110} color="var(--primary)" width={2.4} />
        <text x={X(x) + 64} y={114} fontSize={13} fontWeight={600} fill="var(--primary)">N</text>
        <Arrow x1={X(x)} y1={92} x2={X(x)} y2={42} color="var(--primary)" width={2.4} />
        <text x={X(x) + 6} y={46} fontSize={13} fontWeight={600} fill="var(--primary)">T</text>
        <path d={`M${X(x) + 18} ${136} A28 28 0 0 0 ${X(x) + 18} ${84}`} fill="none" stroke="var(--primary)" strokeWidth={2.4} />
        <polygon points={`${X(x) + 18},${84} ${X(x) + 26},${92} ${X(x) + 12},${93}`} fill="var(--primary)" />
        <text x={X(x) + 34} y={148} fontSize={13} fontWeight={600} fill="var(--primary)">M</text>
        <text x={X(0)} y={24} fontSize={12} className="fill-muted-foreground">Partie gauche isolée [0 ; x] — q = 5 kN/m, P = 20 kN en x = 5 m</text>
      </svg>
      <Slider label="Position de la coupure x" value={x} min={0.1} max={7.9} step={0.05} unit="m" decimals={2} onChange={setX} />
      <div className="grid gap-2 sm:grid-cols-3">
        <Result label="N(x)" value={`${fmt(f.N, 2)} kN`} />
        <Result label="T(x) = −(V_A − charges à gauche)" value={`${fmt(T, 2)} kN`} tone="primary" />
        <Result label="M(x)" value={`${fmt(f.M, 2)} kN·m`} tone="primary" />
      </div>
      <Tex display>{`T(x) + V_A - ${fmt(leftLoads, 2).replace(",", "{,}")} = 0 \\;\\Rightarrow\\; T = ${fmt(T, 2).replace(",", "{,}")}\\ \\text{kN} \\qquad M = ${fmt(f.M, 2).replace(",", "{,}")}\\ \\text{kN·m}`}</Tex>
      <BeamPlot points={an.points.map((p) => ({ x: p.x, y: p.M }))} L={L} unit="kN·m" title="M(x) — la coupure parcourt le diagramme" marks={[x]} height={130} />
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/*                           Diagrammes types                           */
/* ------------------------------------------------------------------ */
const DIAG_CASES = {
  "ss-udl": "Appuis simples, charge uniforme",
  "ss-point": "Appuis simples, charge ponctuelle",
  "cant-point": "Console, charge en bout",
  "cant-udl": "Console, charge uniforme",
  overhang: "Poutre à porte-à-faux",
} as const;

function BeamDiagramsWidget() {
  const [c, setC] = useState<keyof typeof DIAG_CASES>("ss-udl");
  const [load, setLoad] = useState(10);
  const [pos, setPos] = useState(2);
  const model: BeamModel = useMemo(() => {
    const base = { ...STEEL, hinges: [] };
    switch (c) {
      case "ss-udl":
        return { ...base, length: 6, supports: [{ id: "A", x: 0, type: "pin" }, { id: "B", x: 6, type: "roller" }], loads: [{ id: "q", kind: "dist", x1: 0, x2: 6, q1: load, q2: load }] };
      case "ss-point":
        return { ...base, length: 6, supports: [{ id: "A", x: 0, type: "pin" }, { id: "B", x: 6, type: "roller" }], loads: [{ id: "P", kind: "point", x: pos, F: load * 3, angle: -90 }] };
      case "cant-point":
        return { ...base, length: 3, supports: [{ id: "A", x: 0, type: "fixed" }], loads: [{ id: "P", kind: "point", x: 3, F: load * 2, angle: -90 }] };
      case "cant-udl":
        return { ...base, length: 3, supports: [{ id: "A", x: 0, type: "fixed" }], loads: [{ id: "q", kind: "dist", x1: 0, x2: 3, q1: load, q2: load }] };
      default:
        return { ...base, length: 8, supports: [{ id: "A", x: 0, type: "pin" }, { id: "B", x: 6, type: "roller" }], loads: [{ id: "q", kind: "dist", x1: 0, x2: 8, q1: load, q2: load }] };
    }
  }, [c, load, pos]);
  const an = useMemo(() => analyzeBeam(model), [model]);
  return (
    <Panel className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <Label>Cas de charge</Label>
          <Select value={c} onChange={(e) => setC(e.target.value as keyof typeof DIAG_CASES)}>
            {Object.entries(DIAG_CASES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
        <Slider label={c.includes("point") ? "Charge (×P)" : "Charge q"} value={load} min={2} max={20} step={1} unit={c.includes("point") ? "" : "kN/m"} decimals={0} onChange={setLoad} />
        {c === "ss-point" && <Slider label="Position de P" value={pos} min={0.5} max={5.5} step={0.1} unit="m" onChange={setPos} />}
      </div>
      <BeamSchema model={model} reactions={an.result.ok ? model.supports.map((s) => {
        const r = an.result.ok ? an.result.reactions[an.built.nodeIdAt(s.x)!] : undefined;
        return { x: s.x, rx: r?.rx ?? 0, ry: r?.ry ?? 0, mz: r?.mz ?? 0 };
      }) : undefined} />
      {an.result.ok && <BeamDiagrams an={an} show={["T", "M"]} />}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/*                        Résultante d'une charge                       */
/* ------------------------------------------------------------------ */
function DistributedLoad() {
  const [q1, setQ1] = useState(4);
  const [q2, setQ2] = useState(12);
  const [l, setL] = useState(5);
  const R = ((q1 + q2) * l) / 2;
  const xG = q1 + q2 > 0 ? (l * (q1 + 2 * q2)) / (3 * (q1 + q2)) : l / 2;
  const x0 = 60;
  const x1 = 560;
  const k = (x1 - x0) / l;
  const yb = 190;
  const kq = 90 / 20;
  return (
    <Panel className="@container grid grid-cols-1 gap-4 @2xl:grid-cols-[1fr_230px]">
      <svg viewBox="0 0 620 240" className="w-full text-ink" role="img" aria-label="Résultante d'une charge répartie">
        <line x1={x0} y1={yb} x2={x1} y2={yb} stroke="currentColor" strokeWidth={5} />
        <path d={`M${x0} ${yb - 6} L${x0} ${yb - 6 - q1 * kq} L${x1} ${yb - 6 - q2 * kq} L${x1} ${yb - 6} Z`} fill="color-mix(in srgb, var(--load) 14%, transparent)" stroke="var(--load)" strokeWidth={1.5} />
        {Array.from({ length: 13 }, (_, i) => {
          const x = x0 + ((x1 - x0) * i) / 12;
          const q = q1 + ((q2 - q1) * i) / 12;
          return q * kq > 5 ? <Arrow key={i} x1={x} y1={yb - 6 - q * kq} x2={x} y2={yb - 6} width={1.2} head={6} /> : null;
        })}
        <line x1={x0 + xG * k} y1={20} x2={x0 + xG * k} y2={yb - 8} stroke="var(--muted-foreground)" strokeWidth={2.2} strokeDasharray="6 4" />
        <polygon points={`${x0 + xG * k},${yb - 6} ${x0 + xG * k - 6},${yb - 18} ${x0 + xG * k + 6},${yb - 18}`} fill="var(--muted-foreground)" />
        <text x={x0 + xG * k + 8} y={34} fontSize={14} className="fill-muted-foreground">({fmt(R, 1)} kN)</text>
        <line x1={x0} y1={yb + 22} x2={x0 + xG * k} y2={yb + 22} stroke="var(--primary)" />
        <text x={x0 + (xG * k) / 2} y={yb + 38} textAnchor="middle" fontSize={13} fill="var(--primary)">x_G = {fmt(xG, 2)} m</text>
      </svg>
      <div className="space-y-3">
        <Slider label="q₁ (gauche)" value={q1} min={0} max={20} step={1} unit="kN/m" decimals={0} onChange={setQ1} />
        <Slider label="q₂ (droite)" value={q2} min={0} max={20} step={1} unit="kN/m" decimals={0} onChange={setQ2} />
        <Slider label="Longueur l" value={l} min={1} max={8} step={0.5} unit="m" onChange={setL} />
        <Result label="R = (q₁ + q₂)·l / 2" value={`${fmt(R, 2)} kN`} tone="primary" />
        <Result label="x_G = l(q₁ + 2q₂) / 3(q₁ + q₂)" value={`${fmt(xG, 3)} m`} tone="primary" />
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/*                          Treillis triangulaire                       */
/* ------------------------------------------------------------------ */
function TrussExplorer() {
  const [c, setC] = useState(2.5);
  const [h, setH] = useState(2);
  const [P, setP] = useState(30);
  const L = 6;
  const bar = (id: string, i: string, j: string) => ({ id, i, j, E: 210e6, A: 10e-4, I: 1e-6, releaseI: true, releaseJ: true });
  const structure = useMemo(
    () => ({
      nodes: [
        { id: "A", x: 0, y: 0, support: "pin" as const },
        { id: "B", x: L, y: 0, support: "roller" as const },
        { id: "C", x: c, y: h },
      ],
      members: [bar("AB", "A", "B"), bar("AC", "A", "C"), bar("BC", "B", "C")],
      loads: [{ kind: "nodal" as const, node: "C", fx: 0, fy: -P, mz: 0 }],
    }),
    [c, h, P],
  );
  const res = useMemo(() => analyze(structure), [structure]);
  return (
    <Panel className="@container grid grid-cols-1 gap-4 @2xl:grid-cols-[1fr_230px]">
      {res.ok && <StructureView structure={structure} result={res} mode="efforts" height={300} />}
      <div className="space-y-3">
        <Slider label="Position du faîtage c" value={c} min={0.5} max={5.5} step={0.1} unit="m" onChange={setC} />
        <Slider label="Hauteur h" value={h} min={0.5} max={4} step={0.1} unit="m" onChange={setH} />
        <Slider label="Charge P" value={P} min={5} max={60} step={1} unit="kN" decimals={0} onChange={setP} />
        {res.ok &&
          ["AC", "BC", "AB"].map((id) => {
            const N = res.members[id].forcesAt(0.1).N;
            return <Result key={id} label={`N${id} (${N >= 0 ? "traction" : "compression"})`} value={`${fmt(N, 2)} kN`} tone="primary" />;
          })}
        <p className="text-xs text-muted-foreground">Abaissez h : les efforts explosent. Une ferme trop plate est très sollicitée.</p>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/*                       Contraintes de flexion                         */
/* ------------------------------------------------------------------ */
function SectionStress() {
  const [b, setB] = useState(20);
  const [h, setH] = useState(40);
  const [M, setM] = useState(60);
  const [N, setN] = useState(0);
  const A = b * h * 100; // mm²
  const I = (b * 10 * (h * 10) ** 3) / 12; // mm⁴
  const v = (h * 10) / 2;
  const sN = (N * 1000) / A;
  const sTop = sN - (M * 1e6 * v) / I; // M > 0 : fibre supérieure comprimée
  const sBot = sN + (M * 1e6 * v) / I;
  const maxS = Math.max(Math.abs(sTop), Math.abs(sBot), 1e-9);
  const H = 200;
  const W = (b / h) * H;
  const cx = 120;
  const top = 30;
  const sx = 250;
  const k = 110 / maxS;
  return (
    <Panel className="@container grid grid-cols-1 gap-4 @2xl:grid-cols-[1fr_240px]">
      <svg viewBox="0 0 520 260" className="w-full text-ink" role="img" aria-label="Diagramme des contraintes normales">
        <rect x={cx - Math.min(W, 160) / 2} y={top} width={Math.min(W, 160)} height={H} fill="color-mix(in srgb, var(--primary) 10%, transparent)" stroke="currentColor" strokeWidth={2} />
        <line x1={cx - 100} y1={top + H / 2} x2={sx + 160} y2={top + H / 2} stroke="var(--muted-foreground)" strokeDasharray="5 4" />
        <text x={cx - 96} y={top + H / 2 - 6} fontSize={11} className="fill-muted-foreground">G</text>
        <line x1={sx} y1={top} x2={sx} y2={top + H} stroke="currentColor" />
        <polygon
          points={`${sx},${top} ${sx + sTop * k},${top} ${sx + sBot * k},${top + H} ${sx},${top + H}`}
          fill={"color-mix(in srgb, var(--primary) 16%, transparent)"}
          stroke="var(--primary)"
          strokeWidth={1.6}
        />
        <text x={sx + sTop * k + (sTop >= 0 ? 6 : -6)} y={top + 4} textAnchor={sTop >= 0 ? "start" : "end"} fontSize={13} fontWeight={600} fill={sTop >= 0 ? "var(--diag-pos)" : "var(--diag-neg)"}>
          {fmt(sTop, 1)} MPa
        </text>
        <text x={sx + sBot * k + (sBot >= 0 ? 6 : -6)} y={top + H} textAnchor={sBot >= 0 ? "start" : "end"} fontSize={13} fontWeight={600} fill={sBot >= 0 ? "var(--diag-pos)" : "var(--diag-neg)"}>
          {fmt(sBot, 1)} MPa
        </text>
        <text x={sx} y={top + H + 22} fontSize={11} className="fill-muted-foreground" textAnchor="middle">σ (traction &gt; 0)</text>
      </svg>
      <div className="space-y-3">
        <Slider label="Largeur b" value={b} min={10} max={50} step={1} unit="cm" decimals={0} onChange={setB} />
        <Slider label="Hauteur h" value={h} min={10} max={80} step={1} unit="cm" decimals={0} onChange={setH} />
        <Slider label="Moment M (> 0 : fibre inf. tendue)" value={M} min={-150} max={150} step={1} unit="kN·m" decimals={0} onChange={setM} />
        <Slider label="Effort normal N (> 0 : traction)" value={N} min={-800} max={800} step={10} unit="kN" decimals={0} onChange={setN} />
        <Result label="I = bh³/12" value={`${fmt(I / 1e4, 0)} cm⁴`} />
        <Result label="σ = N/A ± M·v/I" value={`${fmt(sTop, 1)} / ${fmt(sBot, 1)} MPa`} tone="primary" />
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/*                              Flèche                                  */
/* ------------------------------------------------------------------ */
function DeflectionBeam() {
  const [L, setL] = useState(6);
  const [q, setQ] = useState(10);
  const [prof, setProf] = useState("IPE 300");
  const [kind, setKind] = useState<"ss" | "cant">("ss");
  const sec = ipe(prof);
  const model: BeamModel = {
    E: 210e6,
    A: sec.A,
    I: sec.I,
    length: L,
    hinges: [],
    supports: kind === "ss" ? [{ id: "A", x: 0, type: "pin" }, { id: "B", x: L, type: "roller" }] : [{ id: "A", x: 0, type: "fixed" }],
    loads: [{ id: "q", kind: "dist", x1: 0, x2: L, q1: q, q2: q }],
  };
  const an = analyzeBeam(model);
  const f = Math.abs(an.extremes.vmin.value) * 1000;
  const EI = 210e6 * sec.I;
  const formula = kind === "ss" ? (5 * q * L ** 4) / (384 * EI) : (q * L ** 4) / (8 * EI);
  const lim = (L * 1000) / (kind === "ss" ? 300 : 150);
  return (
    <Panel className="space-y-3">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="space-y-1">
          <Label>Schéma</Label>
          <Segmented size="sm" value={kind} onChange={setKind} options={[{ value: "ss", label: "2 appuis" }, { value: "cant", label: "Console" }]} />
        </div>
        <div className="space-y-1">
          <Label>Profilé</Label>
          <Select value={prof} onChange={(e) => setProf(e.target.value)}>
            {IPE_TABLE.map((r) => (
              <option key={r.name}>{r.name}</option>
            ))}
          </Select>
        </div>
        <Slider label="Portée L" value={L} min={2} max={10} step={0.5} unit="m" onChange={setL} />
        <Slider label="Charge q" value={q} min={1} max={30} step={1} unit="kN/m" decimals={0} onChange={setQ} />
      </div>
      <BeamPlot points={an.points.map((p) => ({ x: p.x, y: p.v * 1000 }))} L={L} unit="mm" title="Déformée v(x)" line color="var(--deformed)" height={140} />
      <div className="grid gap-2 sm:grid-cols-3">
        <Result label={kind === "ss" ? "Formulaire 5qL⁴/384EI" : "Formulaire qL⁴/8EI"} value={`${fmt(formula * 1000, 2)} mm`} />
        <Result label="Calcul (simulateur)" value={`${fmt(f, 2)} mm`} tone="primary" />
        <Result label={kind === "ss" ? "Limite indicative L/300" : "Limite indicative L/150"} value={`${fmt(lim, 1)} mm ${f <= lim ? "✓" : "✗"}`} />
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/*                              Flambement                              */
/* ------------------------------------------------------------------ */
const K_CASES = [
  { id: "bi-articule", K: 1, label: "Articulé – articulé" },
  { id: "encastre-libre", K: 2, label: "Encastré – libre" },
  { id: "encastre-articule", K: 0.7, label: "Encastré – articulé" },
  { id: "bi-encastre", K: 0.5, label: "Encastré – encastré" },
];

function EulerBuckling() {
  const [L, setL] = useState(3);
  const [caseId, setCaseId] = useState("bi-articule");
  const [b, setB] = useState(12);
  const K = K_CASES.find((c) => c.id === caseId)!.K;
  const E = 11000; // MPa (bois C24, valeur moyenne)
  const I = (b * 10) ** 4 / 12; // mm⁴, section carrée b×b
  const Lf = K * L;
  const Ncr = (Math.PI ** 2 * E * I) / (Lf * 1000) ** 2 / 1000;
  const curve = Array.from({ length: 60 }, (_, i) => {
    const lf = 0.8 + (i * 7.2) / 59;
    return { lf, n: (Math.PI ** 2 * E * I) / (lf * 1000) ** 2 / 1000 };
  });
  const nmax = Math.min(Math.max(...curve.map((c) => c.n)), Ncr * 4 + 50);
  const X = (lf: number) => 50 + ((lf - 0.8) / 7.2) * 300;
  const Y = (n: number) => 200 - Math.min(n / nmax, 1.05) * 170;
  // forme du mode de flambement
  const mode = (s: number) => {
    switch (caseId) {
      case "encastre-libre":
        return 1 - Math.cos((Math.PI * s) / 2);
      case "bi-encastre":
        return (1 - Math.cos(2 * Math.PI * s)) / 2;
      case "encastre-articule":
        // encastré en pied (s = 0), articulé en tête : tan β = β, β = 4,4934
        return Math.sin(4.4934 * s) - 4.4934 * Math.cos(4.4934 * s) - 4.4934 * s + 4.4934;
      default:
        return Math.sin(Math.PI * s);
    }
  };
  const pts = Array.from({ length: 41 }, (_, i) => i / 40);
  const amps = pts.map((s) => mode(s));
  const amax = Math.max(...amps.map(Math.abs), 1e-9);
  return (
    <Panel className="grid grid-cols-1 gap-4 lg:grid-cols-[150px_1fr_220px]">
      <svg viewBox="0 0 150 240" className="w-full text-ink" role="img" aria-label="Mode de flambement">
        <line x1={75} y1={20} x2={75} y2={220} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
        <polyline points={pts.map((s, i) => `${75 + (amps[i] / amax) * 34},${220 - s * 200}`).join(" ")} fill="none" stroke="var(--primary)" strokeWidth={4} />
        <text x={75} y={236} textAnchor="middle" fontSize={11} className="fill-muted-foreground">mode de flambement</text>
      </svg>
      <svg viewBox="0 0 380 230" className="w-full text-ink" role="img" aria-label="Charge critique en fonction de la longueur de flambement">
        <line x1={50} y1={200} x2={360} y2={200} stroke="currentColor" />
        <line x1={50} y1={20} x2={50} y2={200} stroke="currentColor" />
        <polyline points={curve.map((c) => `${X(c.lf)},${Y(c.n)}`).join(" ")} fill="none" stroke="var(--primary)" strokeWidth={2} />
        <circle cx={X(Lf)} cy={Y(Ncr)} r={5} fill="var(--load)" />
        <text x={355} y={218} textAnchor="end" fontSize={11} className="fill-muted-foreground">L_f (m)</text>
        <text x={56} y={28} fontSize={11} className="fill-muted-foreground">N_cr (kN)</text>
        <text x={X(Lf) + 8} y={Y(Ncr) - 6} fontSize={12} fontWeight={600} fill="var(--load)">{fmt(Ncr, 0)} kN</text>
      </svg>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label>Liaisons</Label>
          <Select value={caseId} onChange={(e) => setCaseId(e.target.value)}>
            {K_CASES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} (K = {String(c.K).replace(".", ",")})
              </option>
            ))}
          </Select>
        </div>
        <Slider label="Hauteur L" value={L} min={1} max={5} step={0.1} unit="m" onChange={setL} />
        <Slider label="Côté de la section carrée" value={b} min={8} max={25} step={1} unit="cm" decimals={0} onChange={setB} />
        <Result label="L_f = K·L" value={`${fmt(Lf, 2)} m`} />
        <Result label="N_cr = π²EI / L_f²  (E = 11 GPa)" value={`${fmt(Ncr, 1)} kN`} tone="primary" />
      </div>
    </Panel>
  );
}

export function Widget({ id }: { id: WidgetId }) {
  switch (id) {
    case "unit-converter":
      return <UnitConverter />;
    case "moment-lever":
      return <MomentLever />;
    case "equilibrium-beam":
      return <EquilibriumBeam />;
    case "supports-gallery":
      return <SupportsGallery />;
    case "reactions-beam":
      return <ReactionsBeam />;
    case "cut-explorer":
      return <CutExplorer />;
    case "beam-diagrams":
      return <BeamDiagramsWidget />;
    case "distributed-load":
      return <DistributedLoad />;
    case "truss-explorer":
      return <TrussExplorer />;
    case "section-stress":
      return <SectionStress />;
    case "deflection-beam":
      return <DeflectionBeam />;
    case "euler-buckling":
      return <EulerBuckling />;
  }
}
