"use client";
import type { ExerciseFigure } from "@/lib/exercises/types";
import { BeamSchema, Arrow } from "@/components/mechanics/beam-svg";
import { StructureView } from "@/components/mechanics/structure-svg";
import { fmt } from "@/lib/mechanics/format";

function LeverFigure({ d, F, alpha }: { d: number; F: number; alpha: number }) {
  const O = { x: 90, y: 110 };
  const A = { x: 470, y: 110 };
  const a = (alpha * Math.PI) / 180;
  const len = 95;
  const tail = { x: A.x - len * Math.cos(a), y: A.y - len * Math.sin(a) };
  return (
    <svg viewBox="0 0 600 220" className="w-full max-w-xl text-ink" role="img" aria-label="Barre OA et force inclinée">
      <line x1={O.x} y1={O.y} x2={A.x} y2={A.y} stroke="currentColor" strokeWidth={6} />
      <circle cx={O.x} cy={O.y} r={8} fill="var(--card)" stroke="currentColor" strokeWidth={2} />
      <path d={`M${O.x - 26} ${O.y + 30} H${O.x + 26}`} stroke="currentColor" strokeWidth={2} />
      <path d={`M${O.x} ${O.y + 8} L${O.x - 16} ${O.y + 30} L${O.x + 16} ${O.y + 30} Z`} fill="none" stroke="currentColor" strokeWidth={1.6} />
      <text x={O.x - 6} y={O.y - 14} fontSize={15} fontStyle="italic" fill="currentColor">O</text>
      <text x={A.x + 10} y={A.y + 22} fontSize={15} fontStyle="italic" fill="currentColor">A</text>
      <Arrow x1={tail.x} y1={tail.y} x2={A.x} y2={A.y} width={3} head={12} />
      <text x={tail.x - 8} y={tail.y - 6} fontSize={15} fontWeight={600} textAnchor="end" fill="var(--load)">
        F = {fmt(F, 0)} kN
      </text>
      <line x1={A.x - 70} y1={A.y} x2={A.x - 70} y2={A.y} />
      <path d={`M${A.x - 55} ${A.y} A55 55 0 0 1 ${A.x - 55 * Math.cos(a)} ${A.y - 55 * Math.sin(a)}`} fill="none" stroke="currentColor" strokeWidth={1.2} />
      <text x={A.x - 72} y={A.y - 14} fontSize={14} fill="currentColor">α = {alpha}°</text>
      <line x1={O.x} y1={O.y + 52} x2={A.x} y2={A.y + 52} stroke="var(--muted-foreground)" strokeWidth={1} />
      <line x1={O.x} y1={O.y + 44} x2={O.x} y2={O.y + 60} stroke="var(--muted-foreground)" />
      <line x1={A.x} y1={A.y + 44} x2={A.x} y2={A.y + 60} stroke="var(--muted-foreground)" />
      <text x={(O.x + A.x) / 2} y={O.y + 47} textAnchor="middle" fontSize={13} className="fill-muted-foreground">
        d = {fmt(d, 2)} m
      </text>
    </svg>
  );
}

function SectionFigure({ b, h }: { b: number; h: number }) {
  const k = 150 / Math.max(b, h);
  const W = b * k;
  const H = h * k;
  const x0 = 150 - W / 2;
  const y0 = 100 - H / 2;
  return (
    <svg viewBox="0 0 300 210" className="mx-auto w-full max-w-xs text-ink" role="img" aria-label="Section rectangulaire">
      <rect x={x0} y={y0} width={W} height={H} fill="color-mix(in srgb, var(--load) 18%, transparent)" stroke="currentColor" strokeWidth={2} />
      <line x1={x0 - 12} y1={100} x2={x0 + W + 12} y2={100} stroke="var(--primary)" strokeDasharray="5 4" />
      <text x={x0 + W + 16} y={104} fontSize={12} fill="var(--primary)">axe neutre</text>
      <text x={150} y={y0 + H + 18} textAnchor="middle" fontSize={13} fill="currentColor">b = {fmt(b, 1)} cm</text>
      <text x={x0 - 10} y={100} textAnchor="end" fontSize={13} fill="currentColor" transform={`rotate(-90 ${x0 - 10} 100)`}>
        h = {fmt(h, 1)} cm
      </text>
    </svg>
  );
}

function ColumnFigure({ L, support }: { L: number; support: string }) {
  const top = 30;
  const bottom = 230;
  const x = 150;
  const base = support === "bi-articule" ? "pin" : "fixed";
  const head = support === "encastre-libre" ? "free" : support === "bi-encastre" ? "fixed" : "pin";
  return (
    <svg viewBox="0 0 300 270" className="mx-auto w-full max-w-[220px] text-ink" role="img" aria-label="Poteau comprimé">
      <line x1={x} y1={top} x2={x} y2={bottom} stroke="currentColor" strokeWidth={6} />
      <Arrow x1={x} y1={top - 28} x2={x} y2={top - 2} width={3} head={10} />
      <text x={x + 10} y={top - 12} fontSize={14} fontWeight={600} fill="var(--load)">N</text>
      {base === "fixed" ? (
        <path d={`M${x - 30} ${bottom} H${x + 30} M${x - 26} ${bottom} l-8 10 M${x - 14} ${bottom} l-8 10 M${x - 2} ${bottom} l-8 10 M${x + 10} ${bottom} l-8 10 M${x + 22} ${bottom} l-8 10`} stroke="currentColor" strokeWidth={2} />
      ) : (
        <>
          <circle cx={x} cy={bottom} r={6} fill="var(--card)" stroke="currentColor" strokeWidth={2} />
          <path d={`M${x} ${bottom + 6} L${x - 16} ${bottom + 26} H${x + 16} Z`} fill="none" stroke="currentColor" strokeWidth={1.6} />
        </>
      )}
      {head === "fixed" && <path d={`M${x - 30} ${top} H${x + 30}`} stroke="currentColor" strokeWidth={3} />}
      {head === "pin" && (
        <>
          <circle cx={x} cy={top} r={6} fill="var(--card)" stroke="currentColor" strokeWidth={2} />
          <path d={`M${x - 26} ${top - 4} H${x - 10} M${x + 10} ${top - 4} H${x + 26}`} stroke="currentColor" strokeWidth={2} />
        </>
      )}
      <line x1={x + 50} y1={top} x2={x + 50} y2={bottom} stroke="var(--muted-foreground)" />
      <text x={x + 58} y={(top + bottom) / 2} fontSize={13} className="fill-muted-foreground">
        L = {fmt(L, 2)} m
      </text>
    </svg>
  );
}

function TrapezoidFigure({ l, q1, q2 }: { l: number; q1: number; q2: number }) {
  const x0 = 60;
  const x1 = 540;
  const yb = 150;
  const k = 90 / Math.max(q1, q2);
  const n = 12;
  return (
    <svg viewBox="0 0 600 200" className="w-full max-w-xl text-ink" role="img" aria-label="Charge répartie trapézoïdale">
      <line x1={x0} y1={yb} x2={x1} y2={yb} stroke="currentColor" strokeWidth={5} />
      <path d={`M${x0} ${yb - 6} L${x0} ${yb - 6 - q1 * k} L${x1} ${yb - 6 - q2 * k} L${x1} ${yb - 6} Z`} fill="color-mix(in srgb, var(--load) 12%, transparent)" stroke="var(--load)" strokeWidth={1.5} />
      {Array.from({ length: n + 1 }, (_, i) => {
        const x = x0 + ((x1 - x0) * i) / n;
        const q = q1 + ((q2 - q1) * i) / n;
        return q * k > 4 ? <Arrow key={i} x1={x} y1={yb - 6 - q * k} x2={x} y2={yb - 6} width={1.3} head={6} /> : null;
      })}
      <text x={x0} y={yb - 14 - q1 * k} fontSize={13} fontWeight={600} fill="var(--load)">q₁ = {fmt(q1, 1)} kN/m</text>
      <text x={x1} y={yb - 14 - q2 * k} fontSize={13} fontWeight={600} textAnchor="end" fill="var(--load)">q₂ = {fmt(q2, 1)} kN/m</text>
      <text x={(x0 + x1) / 2} y={yb + 26} textAnchor="middle" fontSize={13} className="fill-muted-foreground">l = {fmt(l, 2)} m</text>
    </svg>
  );
}

export function ExerciseFigureView({ figure }: { figure: ExerciseFigure }) {
  switch (figure.kind) {
    case "beam":
      return <BeamSchema model={figure.model} />;
    case "structure":
      return <StructureView structure={figure.structure} height={320} />;
    case "lever":
      return <LeverFigure {...figure} />;
    case "section":
      return <SectionFigure b={figure.b} h={figure.h} />;
    case "column":
      return <ColumnFigure L={figure.L} support={figure.support} />;
    case "trapezoid":
      return <TrapezoidFigure {...figure} />;
  }
}
