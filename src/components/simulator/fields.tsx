"use client";
import { useEffect, useState } from "react";
import { Input, Label, Select } from "@/components/ui";
import { IPE_TABLE, MATERIALS, circle, ipe, rectangle, type SectionProps } from "@/lib/mechanics/sections";
import { fmt, fmtSig } from "@/lib/mechanics/format";
import { cn } from "@/lib/utils";

/** Nombre décimal saisi à la française (virgule acceptée). */
export function parseNum(s: string): number | null {
  const t = s.replace(/\s/g, "").replace(",", ".");
  if (t === "" || t === "-" || t === ".") return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}

export function NumberField({
  label,
  value,
  onChange,
  unit,
  min,
  max,
  step = 0.1,
  className,
  id,
}: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  id?: string;
}) {
  const [text, setText] = useState(String(value).replace(".", ","));
  useEffect(() => {
    const cur = parseNum(text);
    if (cur === null || Math.abs(cur - value) > 1e-9) setText(String(+value.toFixed(6)).replace(".", ","));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const invalid = (() => {
    const v = parseNum(text);
    return v === null || (min !== undefined && v < min) || (max !== undefined && v > max);
  })();
  return (
    <div className={cn("space-y-1", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          value={text}
          aria-invalid={invalid}
          className={cn(unit && "pr-14", invalid && "border-danger focus-visible:border-danger")}
          onChange={(e) => {
            setText(e.target.value);
            const v = parseNum(e.target.value);
            if (v !== null && (min === undefined || v >= min) && (max === undefined || v <= max)) onChange(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              const v = (parseNum(text) ?? value) + (e.key === "ArrowUp" ? step : -step);
              const c = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, +v.toFixed(6)));
              setText(String(c).replace(".", ","));
              onChange(c);
            }
          }}
        />
        {unit && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                       Matériau et section droite                     */
/* ------------------------------------------------------------------ */
export type SectionKind = "rect" | "circle" | "ipe" | "custom";

export interface SectionState {
  materialId: string;
  E: number; // GPa
  kind: SectionKind;
  b: number; // cm
  h: number; // cm
  d: number; // cm
  ipe: string;
  A: number; // cm²
  I: number; // cm⁴
  v: number; // cm
}

export const DEFAULT_SECTION: SectionState = {
  materialId: "S235",
  E: 210,
  kind: "ipe",
  b: 20,
  h: 40,
  d: 20,
  ipe: "IPE 300",
  A: 50,
  I: 5000,
  v: 15,
};

/** Caractéristiques en unités SI internes (m², m⁴, m) + E en kN/m². */
export function sectionProps(s: SectionState): SectionProps & { E: number; strength: number; strengthLabel: string } {
  let p: SectionProps;
  if (s.kind === "rect") p = rectangle(s.b / 100, s.h / 100);
  else if (s.kind === "circle") p = circle(s.d / 100);
  else if (s.kind === "ipe") p = ipe(s.ipe);
  else p = { A: s.A * 1e-4, I: s.I * 1e-8, v: s.v / 100, W: (s.I * 1e-8) / (s.v / 100), h: (2 * s.v) / 100, label: "Section personnalisée" };
  const mat = MATERIALS.find((m) => m.id === s.materialId);
  return { ...p, E: s.E * 1e6, strength: mat?.strength ?? 0, strengthLabel: mat?.strengthLabel ?? "" };
}

export function SectionPicker({ value, onChange }: { value: SectionState; onChange: (s: SectionState) => void }) {
  const set = (patch: Partial<SectionState>) => onChange({ ...value, ...patch });
  const p = sectionProps(value);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="mat">Matériau</Label>
          <Select
            id="mat"
            value={value.materialId}
            onChange={(e) => {
              const m = MATERIALS.find((x) => x.id === e.target.value)!;
              const patch: Partial<SectionState> = { materialId: m.id, E: m.E };
              if (m.id.startsWith("C") && value.kind === "ipe") Object.assign(patch, { kind: "rect", b: 25, h: 50 });
              if ((m.id === "C24" || m.id === "GL24h") && value.kind === "ipe") Object.assign(patch, { kind: "rect", b: 10, h: 22 });
              set(patch);
            }}
          >
            {MATERIALS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </div>
        <NumberField label="Module d'Young E" unit="GPa" value={value.E} min={0.1} onChange={(E) => set({ E })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="sec">Section</Label>
        <Select id="sec" value={value.kind} onChange={(e) => set({ kind: e.target.value as SectionKind })}>
          <option value="ipe">Profilé IPE</option>
          <option value="rect">Rectangle (béton, bois)</option>
          <option value="circle">Disque plein</option>
          <option value="custom">Personnalisée (A, I, v)</option>
        </Select>
      </div>
      {value.kind === "ipe" && (
        <Select aria-label="Profilé" value={value.ipe} onChange={(e) => set({ ipe: e.target.value })}>
          {IPE_TABLE.map((r) => (
            <option key={r.name} value={r.name}>
              {r.name}
            </option>
          ))}
        </Select>
      )}
      {value.kind === "rect" && (
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Largeur b" unit="cm" value={value.b} min={0.1} onChange={(b) => set({ b })} />
          <NumberField label="Hauteur h" unit="cm" value={value.h} min={0.1} onChange={(h) => set({ h })} />
        </div>
      )}
      {value.kind === "circle" && <NumberField label="Diamètre d" unit="cm" value={value.d} min={0.1} onChange={(d) => set({ d })} />}
      {value.kind === "custom" && (
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="A" unit="cm²" value={value.A} min={0.01} onChange={(A) => set({ A })} />
          <NumberField label="I" unit="cm⁴" value={value.I} min={0.01} onChange={(I) => set({ I })} />
          <NumberField label="v" unit="cm" value={value.v} min={0.01} onChange={(v) => set({ v })} />
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted px-3 py-2 text-xs">
        <div>
          <div className="text-muted-foreground">A</div>
          <div className="font-mono font-medium">{fmtSig(p.A * 1e4, 4)} cm²</div>
        </div>
        <div>
          <div className="text-muted-foreground">I</div>
          <div className="font-mono font-medium">{fmtSig(p.I * 1e8, 4)} cm⁴</div>
        </div>
        <div>
          <div className="text-muted-foreground">W = I/v</div>
          <div className="font-mono font-medium">{fmtSig(p.W * 1e6, 4)} cm³</div>
        </div>
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">
        EI = {fmt((p.E * p.I) / 1000, 1)} MN·m². Valeurs IPE issues des catalogues de profilés laminés.
      </p>
    </div>
  );
}
