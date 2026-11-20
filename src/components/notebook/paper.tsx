"use client";
/** Fonds de page : papiers classiques et modèles de mécanique. */
import { memo, type ReactNode } from "react";
import { MM, PAPER_COLORS } from "@/lib/notebook/paper";
import type { PaperColor, PaperKind } from "@/lib/notebook/types";

function gridPath(w: number, h: number, step: number, x0 = 0, y0 = 0, x1 = w, y1 = h, skip = 0): string {
  let d = "";
  let k = 0;
  for (let x = x0; x <= x1 + 0.01; x += step, k++) if (!skip || k % skip !== 0) d += `M${x.toFixed(2)} ${y0}V${y1}`;
  k = 0;
  for (let y = y0; y <= y1 + 0.01; y += step, k++) if (!skip || k % skip !== 0) d += `M${x0} ${y.toFixed(2)}H${x1}`;
  return d;
}

function hLines(x0: number, x1: number, y0: number, y1: number, step: number): string {
  let d = "";
  for (let y = y0; y <= y1 + 0.01; y += step) d += `M${x0} ${y.toFixed(2)}H${x1}`;
  return d;
}

function Zone({ x, y, w, h, title, color, print }: { x: number; y: number; w: number; h: number; title: string; color: string; print: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill="none" stroke={color} strokeWidth={1.2} />
      <rect x={x + 10} y={y - 9} width={title.length * 6.6 + 14} height={18} rx={4} fill="var(--card)" />
      <text x={x + 17} y={y + 4} fontSize={11.5} fontWeight={650} fill={print} letterSpacing={0.4} style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
        {title.toUpperCase()}
      </text>
    </g>
  );
}

function Axis({ x0, x1, y, label, color, print }: { x0: number; x1: number; y: number; label: string; color: string; print: string }) {
  return (
    <g>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={print} strokeWidth={1.1} />
      <path d={`M${x1} ${y} l-8 -4 v8 Z`} fill={print} />
      <line x1={x0} y1={y - 55} x2={x0} y2={y + 55} stroke={color} strokeWidth={1} />
      <text x={x0 - 10} y={y + 4} textAnchor="end" fontSize={13} fontStyle="italic" fontWeight={600} fill={print} style={{ fontFamily: "'Times New Roman', serif" }}>
        {label}
      </text>
      <text x={x1 + 6} y={y + 14} fontSize={12} fontStyle="italic" fill={print} style={{ fontFamily: "'Times New Roman', serif" }}>
        x
      </text>
    </g>
  );
}

export const PaperBackground = memo(function PaperBackground({
  kind,
  color,
  w,
  h,
  patternId,
  background,
}: {
  kind: PaperKind;
  color: PaperColor;
  w: number;
  h: number;
  patternId: string;
  background?: string;
}) {
  const t = PAPER_COLORS[color].theme;
  const out: ReactNode[] = [<rect key="bg" x={0} y={0} width={w} height={h} fill={t.bg} />];
  const sq = 5 * MM;
  const line = (d: string, stroke: string, sw: number, key: string, op = 1) => <path key={key} d={d} stroke={stroke} strokeWidth={sw} fill="none" opacity={op} />;

  switch (kind) {
    case "ligne": {
      const top = 28 * MM;
      out.push(line(hLines(0, w, top, h - 12 * MM, 8 * MM), t.strong, 0.8, "l"));
      out.push(line(`M${22 * MM} 0V${h}`, t.margin, 1, "m"));
      break;
    }
    case "carreaux":
      out.push(line(gridPath(w, h, sq), t.line, 0.7, "g"));
      break;
    case "millimetre":
      out.push(line(gridPath(w, h, MM, 0, 0, w, h, 5), t.line, 0.35, "g1", 0.9));
      out.push(line(gridPath(w, h, 5 * MM, 0, 0, w, h, 2), t.strong, 0.55, "g5", 0.75));
      out.push(line(gridPath(w, h, 10 * MM), t.strong, 0.9, "g10"));
      break;
    case "seyes": {
      const big = 8 * MM;
      const top = 3 * big;
      let fine = "";
      let strong = "";
      for (let y = top, k = 0; y <= h - big; y += 2 * MM, k++) (k % 4 === 0 ? (strong += `M0 ${y.toFixed(2)}H${w}`) : (fine += `M0 ${y.toFixed(2)}H${w}`));
      let vert = "";
      for (let x = big * 4; x <= w; x += big) vert += `M${x.toFixed(2)} ${top}V${(h - big).toFixed(2)}`;
      out.push(line(fine, t.line, 0.6, "f"));
      out.push(line(strong + vert, t.strong, 0.75, "s"));
      out.push(line(`M${(big * 3 + 4).toFixed(2)} 0V${h}`, t.margin, 1.1, "m"));
      break;
    }
    case "points":
      out.push(
        <defs key="d">
          <pattern id={patternId} width={sq} height={sq} patternUnits="userSpaceOnUse">
            <circle cx={sq / 2} cy={sq / 2} r={0.95} fill={t.strong} />
          </pattern>
        </defs>,
        <rect key="p" x={0} y={0} width={w} height={h} fill={`url(#${patternId})`} />,
      );
      break;
    case "etude-poutre": {
      out.push(line(gridPath(w, h, sq), t.line, 0.5, "g", 0.75));
      const m = 14 * MM;
      const zw = w - 2 * m;
      const head = 18 * MM;
      out.push(
        <text key="t" x={m} y={head - 14} fontSize={13} fontWeight={650} fill={t.print} style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
          Étude de poutre — Exercice : ………………………………………
        </text>,
        <text key="d" x={w - m} y={head - 14} textAnchor="end" fontSize={12} fill={t.print} style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
          Date : ……………
        </text>,
      );
      const avail = h - head - 10 * MM;
      const z1 = avail * 0.22;
      const z2 = avail * 0.2;
      const z3 = avail * 0.2;
      const z4 = avail - z1 - z2 - z3 - 3 * 6 * MM;
      let y = head + 4 * MM;
      out.push(<Zone key="z1" x={m} y={y} w={zw} h={z1} title="1. Schéma mécanique et données" color={t.strong} print={t.print} />);
      y += z1 + 6 * MM;
      out.push(<Zone key="z2" x={m} y={y} w={zw} h={z2} title="2. Bilan des actions — PFS — réactions" color={t.strong} print={t.print} />);
      y += z2 + 6 * MM;
      out.push(<Zone key="z3" x={m} y={y} w={zw} h={z3} title="3. Coupures — N(x), T(x), M(x)" color={t.strong} print={t.print} />);
      y += z3 + 6 * MM;
      out.push(<Zone key="z4" x={m} y={y} w={zw} h={z4} title="4. Diagrammes" color={t.strong} print={t.print} />);
      const ax0 = m + 30 * MM;
      const ax1 = w - m - 14 * MM;
      const gap = z4 / 3;
      ["N(x)", "T(x)", "M(x)"].forEach((lab, k) => out.push(<Axis key={lab} x0={ax0} x1={ax1} y={y + gap * (k + 0.5)} label={lab} color={t.strong} print={t.print} />));
      break;
    }
    case "diagrammes": {
      out.push(line(gridPath(w, h, sq), t.line, 0.5, "g", 0.6));
      const x0 = 34 * MM;
      const x1 = w - 18 * MM;
      let v = "";
      for (let x = x0; x <= x1 - 10; x += 10 * MM) v += `M${x.toFixed(2)} ${26 * MM}V${h - 12 * MM}`;
      out.push(<path key="v" d={v} stroke={t.strong} strokeWidth={0.7} strokeDasharray="3 4" fill="none" />);
      out.push(
        <text key="t" x={14 * MM} y={14 * MM} fontSize={13} fontWeight={650} fill={t.print} style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
          Schéma mécanique et diagrammes des efforts internes
        </text>,
      );
      const top = 34 * MM;
      out.push(<line key="beam" x1={x0} y1={top + 10 * MM} x2={x1 - 8} y2={top + 10 * MM} stroke={t.strong} strokeWidth={1} strokeDasharray="6 4" />);
      const rest = h - top - 40 * MM;
      ["N(x)", "T(x)", "M(x)"].forEach((lab, k) =>
        out.push(<Axis key={lab} x0={x0} x1={x1} y={top + 36 * MM + (rest / 3) * (k + 0.5)} label={lab} color={t.strong} print={t.print} />),
      );
      break;
    }
    case "exercice": {
      out.push(line(gridPath(w, h, sq), t.line, 0.5, "g", 0.7));
      const m = 14 * MM;
      const zw = w - 2 * m;
      let y = 12 * MM;
      const avail = h - 24 * MM;
      out.push(<Zone key="e" x={m} y={y} w={zw} h={avail * 0.2} title="Énoncé" color={t.strong} print={t.print} />);
      y += avail * 0.2 + 6 * MM;
      const half = (zw - 6 * MM) / 2;
      out.push(<Zone key="d" x={m} y={y} w={half} h={avail * 0.13} title="Données" color={t.strong} print={t.print} />);
      out.push(<Zone key="i" x={m + half + 6 * MM} y={y} w={half} h={avail * 0.13} title="Inconnues" color={t.strong} print={t.print} />);
      y += avail * 0.13 + 6 * MM;
      out.push(<Zone key="h" x={m} y={y} w={zw} h={avail * 0.08} title="Hypothèses" color={t.strong} print={t.print} />);
      y += avail * 0.08 + 6 * MM;
      const resH = avail - (y - 12 * MM) - avail * 0.1 - 6 * MM;
      out.push(<Zone key="r" x={m} y={y} w={zw} h={resH} title="Résolution" color={t.strong} print={t.print} />);
      y += resH + 6 * MM;
      out.push(
        <g key="res">
          <rect x={m} y={y} width={zw} height={avail * 0.1} rx={6} fill="none" stroke={t.print} strokeWidth={2} />
          <rect x={m + 10} y={y - 9} width={88} height={18} rx={4} fill="var(--card)" />
          <text x={m + 17} y={y + 4} fontSize={11.5} fontWeight={700} fill={t.print} letterSpacing={0.4} style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
            RÉSULTAT
          </text>
        </g>,
      );
      break;
    }
  }
  if (background) out.push(<image key="img" href={background} x={0} y={0} width={w} height={h} preserveAspectRatio="xMidYMid meet" />);
  return <g>{out}</g>;
});
