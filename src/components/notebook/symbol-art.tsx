"use client";
/**
 * Dessin des symboles mécaniques du cahier (repère local, origine au point
 * d'accroche). Les étiquettes restent droites quelle que soit la rotation.
 * Boîtes englobantes correspondantes : src/lib/notebook/symbols.ts.
 */
import type { ReactNode } from "react";
import { symbolToPage } from "@/lib/notebook/geometry";
import { displayColor } from "@/lib/notebook/paper";
import { REACTION, symbolDef } from "@/lib/notebook/symbols";
import type { SymbolEl } from "@/lib/notebook/types";

const SW = 1.7;

/* ------------------------------------------------------------------ */
/*                             Primitives                               */
/* ------------------------------------------------------------------ */
function Arrow({ x1, y1, x2, y2, head = 10, w = 2, color = "currentColor", dash }: { x1: number; y1: number; x2: number; y2: number; head?: number; w?: number; color?: string; dash?: string }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const hx = x2 - head * Math.cos(a);
  const hy = y2 - head * Math.sin(a);
  const hw = head * 0.5;
  return (
    <g>
      <line x1={x1} y1={y1} x2={hx} y2={hy} stroke={color} strokeWidth={w} strokeLinecap="round" strokeDasharray={dash} />
      <polygon
        points={`${x2},${y2} ${hx + hw * Math.sin(a)},${hy - hw * Math.cos(a)} ${hx - hw * Math.sin(a)},${hy + hw * Math.cos(a)}`}
        fill={color}
      />
    </g>
  );
}

/** Arc fléché de a0 à a1 (degrés, repère écran : y vers le bas). a1 < a0 : sens anti-horaire à l'écran. */
function ArcArrow({ cx = 0, cy = 0, r, a0, a1, color = "currentColor", w = 2 }: { cx?: number; cy?: number; r: number; a0: number; a1: number; color?: string; w?: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const sx = cx + r * Math.cos(rad(a0));
  const sy = cy + r * Math.sin(rad(a0));
  const ex = cx + r * Math.cos(rad(a1));
  const ey = cy + r * Math.sin(rad(a1));
  const ccw = a1 < a0;
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  // tangente au point d'arrivée, dans le sens du parcours
  const t = rad(a1);
  const vx = ccw ? Math.sin(t) : -Math.sin(t);
  const vy = ccw ? -Math.cos(t) : Math.cos(t);
  const head = 9;
  const bx = ex - vx * head * 0.6;
  const by = ey - vy * head * 0.6;
  const tipx = ex + vx * head * 0.4;
  const tipy = ey + vy * head * 0.4;
  const hw = head * 0.5;
  return (
    <g>
      <path d={`M${sx} ${sy} A${r} ${r} 0 ${large} ${ccw ? 0 : 1} ${bx} ${by}`} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" />
      <polygon points={`${tipx},${tipy} ${bx - vy * hw},${by + vx * hw} ${bx + vy * hw},${by - vx * hw}`} fill={color} />
    </g>
  );
}

function Hatch({ x1, x2, y, dir = 1, len = 7, step = 6.5 }: { x1: number; x2: number; y: number; dir?: 1 | -1; len?: number; step?: number }) {
  const out: ReactNode[] = [];
  for (let x = x1 + 2; x <= x2; x += step) out.push(<line key={x} x1={x} y1={y} x2={x - len * 0.75} y2={y + dir * len} stroke="currentColor" strokeWidth={1} opacity={0.7} />);
  return <g>{out}</g>;
}

function HatchV({ y1, y2, x, dir = -1, len = 9, step = 7 }: { y1: number; y2: number; x: number; dir?: 1 | -1; len?: number; step?: number }) {
  const out: ReactNode[] = [];
  for (let y = y1 + 2; y <= y2; y += step) out.push(<line key={y} x1={x} y1={y} x2={x + dir * len} y2={y + len * 0.8} stroke="currentColor" strokeWidth={1} opacity={0.7} />);
  return <g>{out}</g>;
}

function Pin({ x = 0, y = 0, r = 3.5 }: { x?: number; y?: number; r?: number }) {
  return <circle cx={x} cy={y} r={r} fill="var(--card)" stroke="currentColor" strokeWidth={1.6} />;
}

function Roller({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0 L-14 24 L14 24 Z" fill="var(--card)" stroke="currentColor" strokeWidth={SW} strokeLinejoin="round" />
      <circle cx={-7} cy={28.5} r={4} fill="var(--card)" stroke="currentColor" strokeWidth={1.4} />
      <circle cx={7} cy={28.5} r={4} fill="var(--card)" stroke="currentColor" strokeWidth={1.4} />
      <line x1={-20} y1={33} x2={20} y2={33} stroke="currentColor" strokeWidth={1.6} />
      <Hatch x1={-18} x2={22} y={33} />
    </g>
  );
}

function PinSupport({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0 L-14 24 L14 24 Z" fill="var(--card)" stroke="currentColor" strokeWidth={SW} strokeLinejoin="round" />
      <line x1={-20} y1={24} x2={20} y2={24} stroke="currentColor" strokeWidth={1.6} />
      <Hatch x1={-18} x2={22} y={24} />
      <Pin />
    </g>
  );
}

function Wall({ x = 0, y = 0, flip = false }: { x?: number; y?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) ${flip ? "scale(-1 1)" : ""}`}>
      <line x1={0} y1={-28} x2={0} y2={28} stroke="currentColor" strokeWidth={2.6} />
      <HatchV y1={-28} y2={22} x={0} dir={-1} len={10} />
    </g>
  );
}

function Ground({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <line x1={-28} y1={0} x2={28} y2={0} stroke="currentColor" strokeWidth={2.6} />
      <Hatch x1={-26} x2={30} y={0} len={9} />
    </g>
  );
}

function Beam({ x0 = 0, x1, y = 0, t = 6, color = "currentColor" }: { x0?: number; x1: number; y?: number; t?: number; color?: string }) {
  return <rect x={x0} y={y - t / 2} width={x1 - x0} height={t} fill={color} rx={0.5} />;
}

function Dim({ x1, x2, y, color = "currentColor" }: { x1: number; x2: number; y: number; color?: string }) {
  return (
    <g>
      <line x1={x1} y1={y - 6} x2={x1} y2={y + 6} stroke={color} strokeWidth={1} />
      <line x1={x2} y1={y - 6} x2={x2} y2={y + 6} stroke={color} strokeWidth={1} />
      <Arrow x1={(x1 + x2) / 2} y1={y} x2={x1} y2={y} head={7} w={1.1} color={color} />
      <Arrow x1={(x1 + x2) / 2} y1={y} x2={x2} y2={y} head={7} w={1.1} color={color} />
    </g>
  );
}

function DimV({ y1, y2, x, color = "currentColor" }: { y1: number; y2: number; x: number; color?: string }) {
  return (
    <g>
      <line x1={x - 6} y1={y1} x2={x + 6} y2={y1} stroke={color} strokeWidth={1} />
      <line x1={x - 6} y1={y2} x2={x + 6} y2={y2} stroke={color} strokeWidth={1} />
      <Arrow x1={x} y1={(y1 + y2) / 2} x2={x} y2={y1} head={7} w={1.1} color={color} />
      <Arrow x1={x} y1={(y1 + y2) / 2} x2={x} y2={y2} head={7} w={1.1} color={color} />
    </g>
  );
}

function SectionAxes({ halfW, halfH, gy = 0 }: { halfW: number; halfH: number; gy?: number }) {
  return (
    <g opacity={0.8}>
      <line x1={-halfW - 14} y1={gy} x2={halfW + 12} y2={gy} stroke="currentColor" strokeWidth={0.9} strokeDasharray="7 3 2 3" />
      <line x1={0} y1={halfH + 10} x2={0} y2={-halfH - 14} stroke="currentColor" strokeWidth={0.9} strokeDasharray="7 3 2 3" />
      <circle cx={0} cy={gy} r={2.6} fill="currentColor" />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*                     Étiquettes (indices, exposants)                   */
/* ------------------------------------------------------------------ */
interface Label {
  x: number;
  y: number;
  text: string;
  anchor?: "start" | "middle" | "end";
  color?: string;
  italic?: boolean;
}

/** « V_A », « M_{max} », « x^2 » → texte SVG avec indices. */
export function LabelText({ x, y, text, anchor = "middle", size, color, italic = true }: { x: number; y: number; text: string; anchor?: string; size: number; color: string; italic?: boolean }) {
  const parts: { t: string; sub?: boolean; sup?: boolean }[] = [];
  const re = /([_^])(\{[^}]*\}|.)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ t: text.slice(last, m.index) });
    const body = m[2].startsWith("{") ? m[2].slice(1, -1) : m[2];
    parts.push(m[1] === "_" ? { t: body, sub: true } : { t: body, sup: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ t: text.slice(last) });
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor as "start"}
      dominantBaseline="middle"
      fontSize={size}
      fontWeight={600}
      fontStyle={italic ? "italic" : undefined}
      fill={color}
      style={{ fontFamily: "'Cambria Math', 'STIX Two Math', 'Times New Roman', serif" }}
      paintOrder="stroke"
      stroke="var(--card)"
      strokeWidth={size * 0.22}
      strokeLinejoin="round"
    >
      {parts.map((p, k) =>
        p.sub || p.sup ? (
          <tspan key={k} fontSize={size * 0.68} dy={p.sub ? size * 0.3 : -size * 0.38} fontStyle="normal">
            {p.t}
          </tspan>
        ) : (
          <tspan key={k} dy={k > 0 && (parts[k - 1].sub || parts[k - 1].sup) ? (parts[k - 1].sub ? -size * 0.3 : size * 0.38) : undefined}>
            {p.t}
          </tspan>
        ),
      )}
    </text>
  );
}

/* ------------------------------------------------------------------ */
/*                               Dessins                                */
/* ------------------------------------------------------------------ */
function draw(s: SymbolEl): { body: ReactNode; labels: Label[] } {
  const len = s.len ?? symbolDef(s.kind).defaults.len ?? 100;
  const h = s.h ?? symbolDef(s.kind).defaults.h ?? 40;
  const h2 = s.h2 ?? symbolDef(s.kind).defaults.h2 ?? 40;
  const lab = s.label ?? "";
  const lab2 = s.label2 ?? "";
  switch (s.kind) {
    /* ------------------------- Structures types ------------------------- */
    case "poutre-2-appuis":
      return {
        body: (
          <>
            <PinSupport x={0} y={3} />
            <Roller x={len} y={3} />
            <Beam x1={len} />
          </>
        ),
        labels: [
          { x: -10, y: -13, text: lab, anchor: "middle" },
          { x: len + 10, y: -13, text: lab2, anchor: "middle" },
        ],
      };
    case "poutre-porte-a-faux":
      return {
        body: (
          <>
            <PinSupport x={0} y={3} />
            <Roller x={len * 0.7} y={3} />
            <Beam x1={len} />
          </>
        ),
        labels: [
          { x: -10, y: -13, text: lab },
          { x: len * 0.7, y: -13, text: lab2 },
        ],
      };
    case "console":
      return {
        body: (
          <>
            <Wall />
            <Beam x1={len} />
          </>
        ),
        labels: [
          { x: 9, y: -13, text: lab, anchor: "start" },
          { x: len + 2, y: -13, text: lab2 },
        ],
      };
    case "portique":
      return {
        body: (
          <>
            <path d={`M0 0 L0 ${-h} L${len} ${-h} L${len} 0`} fill="none" stroke="currentColor" strokeWidth={5} strokeLinejoin="miter" />
            <Ground x={0} y={0} />
            <Ground x={len} y={0} />
          </>
        ),
        labels: [
          { x: -14, y: -10, text: lab, anchor: "end" },
          { x: len + 14, y: -10, text: lab2, anchor: "start" },
          { x: -10, y: -h - 10, text: "B", anchor: "end" },
          { x: len + 10, y: -h - 10, text: "C", anchor: "start" },
        ],
      };
    case "treillis": {
      const n = 4;
      const p = len / n;
      const bars: ReactNode[] = [];
      const nodes: [number, number][] = [];
      for (let i = 0; i <= n; i++) nodes.push([i * p, 0]);
      for (let i = 0; i < n; i++) nodes.push([(i + 0.5) * p, -h]);
      bars.push(<line key="b" x1={0} y1={0} x2={len} y2={0} stroke="currentColor" strokeWidth={2.4} />);
      bars.push(<line key="t" x1={0.5 * p} y1={-h} x2={(n - 0.5) * p} y2={-h} stroke="currentColor" strokeWidth={2.4} />);
      for (let i = 0; i < n; i++) {
        bars.push(<line key={`d${i}`} x1={i * p} y1={0} x2={(i + 0.5) * p} y2={-h} stroke="currentColor" strokeWidth={2.4} />);
        bars.push(<line key={`e${i}`} x1={(i + 0.5) * p} y1={-h} x2={(i + 1) * p} y2={0} stroke="currentColor" strokeWidth={2.4} />);
      }
      return {
        body: (
          <>
            {bars}
            <PinSupport x={0} y={3.5} />
            <Roller x={len} y={3.5} />
            {nodes.map(([x, y], k) => (
              <Pin key={k} x={x} y={y} r={3.2} />
            ))}
          </>
        ),
        labels: [
          { x: -14, y: -8, text: lab, anchor: "end" },
          { x: len + 14, y: -8, text: lab2, anchor: "start" },
        ],
      };
    }
    case "poutre":
      return {
        body: <Beam x1={len} />,
        labels: [
          { x: 0, y: -14, text: lab },
          { x: len, y: -14, text: lab2 },
        ],
      };

    /* ------------------------------ Appuis ------------------------------ */
    case "appui-simple":
      return { body: <Roller />, labels: [] };
    case "articulation":
      return { body: <PinSupport />, labels: [] };
    case "encastrement":
      return { body: <Wall />, labels: [] };
    case "encastrement-sol":
      return { body: <Ground />, labels: [] };
    case "glissiere":
      return {
        body: (
          <>
            <line x1={0} y1={-22} x2={0} y2={22} stroke="currentColor" strokeWidth={3} />
            <circle cx={-7.5} cy={-11} r={5} fill="var(--card)" stroke="currentColor" strokeWidth={1.4} />
            <circle cx={-7.5} cy={11} r={5} fill="var(--card)" stroke="currentColor" strokeWidth={1.4} />
            <line x1={-13.5} y1={-24} x2={-13.5} y2={24} stroke="currentColor" strokeWidth={1.8} />
            <HatchV y1={-24} y2={18} x={-13.5} dir={-1} len={9} />
          </>
        ),
        labels: [],
      };
    case "rotule":
      return { body: <circle cx={0} cy={0} r={5} fill="var(--card)" stroke="currentColor" strokeWidth={2} />, labels: [] };
    case "ressort": {
      const zz: string[] = ["M0 0 L0 6"];
      for (let i = 0; i < 7; i++) zz.push(`L${i % 2 === 0 ? 8 : -8} ${6 + 4 * i + 2}`);
      zz.push("L0 36 L0 40");
      return {
        body: (
          <>
            <path d={zz.join(" ")} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" />
            <line x1={-18} y1={40} x2={18} y2={40} stroke="currentColor" strokeWidth={1.6} />
            <Hatch x1={-16} x2={20} y={40} />
          </>
        ),
        labels: [{ x: 13, y: 20, text: lab, anchor: "start" }],
      };
    }
    case "bielle":
      return {
        body: (
          <>
            <line x1={0} y1={0} x2={0} y2={40} stroke="currentColor" strokeWidth={2.6} />
            <Pin x={0} y={0} />
            <Pin x={0} y={40} />
            <line x1={-18} y1={44} x2={18} y2={44} stroke="currentColor" strokeWidth={1.6} />
            <Hatch x1={-16} x2={20} y={44} />
          </>
        ),
        labels: [],
      };

    /* ------------------------------ Charges ------------------------------ */
    case "force":
      return { body: <Arrow x1={0} y1={-len} x2={0} y2={0} w={2.4} head={11} />, labels: [{ x: 0, y: -len - 11, text: lab }] };
    case "force-composantes": {
      const a = (h * Math.PI) / 180;
      const tx = -len * Math.cos(a);
      const ty = -len * Math.sin(a);
      const r = 24;
      return {
        body: (
          <>
            <line x1={tx} y1={ty} x2={tx} y2={0} stroke="currentColor" strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
            <line x1={tx} y1={ty} x2={0} y2={ty} stroke="currentColor" strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
            <Arrow x1={tx} y1={0} x2={0} y2={0} w={1.6} head={9} dash="5 3" />
            <Arrow x1={0} y1={ty} x2={0} y2={0} w={1.6} head={9} dash="5 3" />
            <Arrow x1={tx} y1={ty} x2={0} y2={0} w={2.4} head={11} />
            <path d={`M${-r} 0 A${r} ${r} 0 0 1 ${r * Math.cos(Math.PI + a)} ${r * Math.sin(Math.PI + a)}`} fill="none" stroke="currentColor" strokeWidth={1.1} />
          </>
        ),
        labels: [
          { x: tx - 8, y: ty - 8, text: lab, anchor: "end" },
          { x: tx / 2, y: 13, text: `${lab}_x` },
          { x: 10, y: ty / 2, text: `${lab}_y`, anchor: "start" },
          { x: (r + 11) * Math.cos(Math.PI + a / 2), y: (r + 11) * Math.sin(Math.PI + a / 2), text: "α" },
        ],
      };
    }
    case "couple-ah":
      return { body: <ArcArrow r={17} a0={150} a1={-150} w={2.2} />, labels: [{ x: 0, y: -27, text: lab }] };
    case "couple-h":
      return { body: <ArcArrow r={17} a0={-150} a1={150} w={2.2} />, labels: [{ x: 0, y: -27, text: lab }] };
    case "charge-uniforme":
    case "charge-triangle":
    case "charge-triangle-dec":
    case "charge-trapeze": {
      const [ha, hb] = s.kind === "charge-uniforme" ? [h, h] : s.kind === "charge-triangle" ? [0, h] : s.kind === "charge-triangle-dec" ? [h, 0] : [h, h2];
      const n = Math.max(2, Math.round(len / 22));
      const arrows: ReactNode[] = [];
      for (let k = 0; k <= n; k++) {
        const x = (len * k) / n;
        const hh = ha + ((hb - ha) * k) / n;
        if (hh > 5) arrows.push(<Arrow key={k} x1={x} y1={-hh} x2={x} y2={-1} w={1.3} head={6.5} />);
      }
      const labels: Label[] =
        s.kind === "charge-trapeze"
          ? [
              { x: 0, y: -ha - 11, text: lab, anchor: "middle" },
              { x: len, y: -hb - 11, text: lab2, anchor: "middle" },
            ]
          : s.kind === "charge-uniforme"
            ? [{ x: len / 2, y: -h - 11, text: lab }]
            : [{ x: s.kind === "charge-triangle" ? len : 0, y: -h - 11, text: lab }];
      return {
        body: (
          <>
            <path d={`M0 0 L0 ${-ha} L${len} ${-hb} L${len} 0 Z`} fill="currentColor" opacity={0.09} />
            <line x1={0} y1={-ha} x2={len} y2={-hb} stroke="currentColor" strokeWidth={1.6} />
            {arrows}
          </>
        ),
        labels,
      };
    }

    /* ----------------------------- Réactions ----------------------------- */
    case "reaction-v":
      return { body: <Arrow x1={0} y1={len} x2={0} y2={0} w={2.4} head={11} />, labels: [{ x: 9, y: len - 6, text: lab, anchor: "start" }] };
    case "reaction-h":
      return { body: <Arrow x1={-len} y1={0} x2={0} y2={0} w={2.4} head={11} />, labels: [{ x: -len / 2, y: -12, text: lab }] };
    case "reaction-m":
      return { body: <ArcArrow r={24} a0={160} a1={-160} w={2.2} />, labels: [{ x: 0, y: -35, text: lab }] };

    /* ----------------------------- Coupures ----------------------------- */
    case "coupure":
      return {
        body: (
          <>
            <line x1={0} y1={-h} x2={0} y2={h} stroke="currentColor" strokeWidth={1.8} strokeDasharray="7 4" />
            <line x1={-7} y1={-h} x2={7} y2={-h} stroke="currentColor" strokeWidth={1.8} />
            <line x1={-7} y1={h} x2={7} y2={h} stroke="currentColor" strokeWidth={1.8} />
          </>
        ),
        labels: [
          { x: 0, y: -h - 12, text: lab },
          { x: 0, y: h + 13, text: lab2 },
        ],
      };
    case "torseur-gauche":
      return {
        body: (
          <>
            <Beam x0={-70} x1={0} color="var(--ink)" />
            <line x1={0} y1={-14} x2={0} y2={14} stroke="var(--ink)" strokeWidth={2} />
            <Arrow x1={4} y1={0} x2={58} y2={0} w={2.3} />
            <Arrow x1={0} y1={-6} x2={0} y2={-56} w={2.3} />
            <ArcArrow r={29} a0={56} a1={-56} w={2.2} />
          </>
        ),
        labels: [
          { x: 63, y: 0, text: "N(x)", anchor: "start" },
          { x: 7, y: -54, text: "T(x)", anchor: "start" },
          { x: 30, y: 30, text: "M(x)", anchor: "start" },
        ],
      };
    case "torseur-droite":
      return {
        body: (
          <>
            <Beam x0={0} x1={70} color="var(--ink)" />
            <line x1={0} y1={-14} x2={0} y2={14} stroke="var(--ink)" strokeWidth={2} />
            <Arrow x1={-58} y1={0} x2={-4} y2={0} w={2.3} />
            <Arrow x1={0} y1={-6} x2={0} y2={-56} w={2.3} />
            <ArcArrow r={29} a0={236} a1={124} w={2.2} />
          </>
        ),
        labels: [
          { x: -38, y: -12, text: "−N(x)" },
          { x: 7, y: -54, text: "−T(x)", anchor: "start" },
          { x: -30, y: 30, text: "−M(x)", anchor: "end" },
        ],
      };
    case "troncon-gauche":
      return {
        body: (
          <>
            <Beam x1={len} color="var(--ink)" />
            <line x1={len} y1={-14} x2={len} y2={14} stroke="var(--ink)" strokeWidth={2} />
            <Arrow x1={0} y1={56} x2={0} y2={5} w={2.3} color={REACTION} />
            <Arrow x1={-52} y1={0} x2={-5} y2={0} w={2.3} color={REACTION} />
            <Arrow x1={len + 4} y1={0} x2={len + 54} y2={0} w={2.3} />
            <Arrow x1={len} y1={-6} x2={len} y2={-54} w={2.3} />
            <ArcArrow cx={len} r={29} a0={56} a1={-56} w={2.2} />
            <Dim x1={0} x2={len} y={70} color="var(--ink)" />
          </>
        ),
        labels: [
          { x: -8, y: 15, text: lab, anchor: "end", color: "var(--ink)" },
          { x: 8, y: 46, text: `V_${lab || "A"}`, anchor: "start", color: REACTION },
          { x: -30, y: -12, text: `H_${lab || "A"}`, color: REACTION },
          { x: len + 59, y: 0, text: "N(x)", anchor: "start" },
          { x: len + 7, y: -52, text: "T(x)", anchor: "start" },
          { x: len + 30, y: 30, text: "M(x)", anchor: "start" },
          { x: len / 2, y: 60, text: "x", color: "var(--ink)" },
        ],
      };
    case "troncon-droit":
      return {
        body: (
          <>
            <Beam x1={len} color="var(--ink)" />
            <line x1={0} y1={-14} x2={0} y2={14} stroke="var(--ink)" strokeWidth={2} />
            <Arrow x1={len} y1={56} x2={len} y2={5} w={2.3} color={REACTION} />
            <Arrow x1={-56} y1={0} x2={-4} y2={0} w={2.3} />
            <Arrow x1={0} y1={-6} x2={0} y2={-54} w={2.3} />
            <ArcArrow r={29} a0={236} a1={124} w={2.2} />
            <Dim x1={0} x2={len} y={70} color="var(--ink)" />
          </>
        ),
        labels: [
          { x: len + 8, y: 15, text: lab, anchor: "start", color: "var(--ink)" },
          { x: len - 8, y: 46, text: `V_${lab || "B"}`, anchor: "end", color: REACTION },
          { x: -36, y: -12, text: "−N(x)" },
          { x: 7, y: -52, text: "−T(x)", anchor: "start" },
          { x: -30, y: 30, text: "−M(x)", anchor: "end" },
          { x: len / 2, y: 60, text: "L − x", color: "var(--ink)" },
        ],
      };

    /* ----------------------------- Éléments ----------------------------- */
    case "barre":
      return {
        body: (
          <>
            <line x1={0} y1={0} x2={len} y2={0} stroke="currentColor" strokeWidth={2.6} />
            <Pin x={0} y={0} />
            <Pin x={len} y={0} />
          </>
        ),
        labels: [{ x: len / 2, y: -11, text: lab, italic: false }],
      };
    case "noeud":
      return { body: <circle cx={0} cy={0} r={3.4} fill="currentColor" />, labels: [{ x: 8, y: -11, text: lab, anchor: "start" }] };
    case "repere":
      return {
        body: (
          <>
            <Arrow x1={0} y1={0} x2={len} y2={0} w={1.6} head={9} />
            <Arrow x1={0} y1={0} x2={0} y2={-len} w={1.6} head={9} />
            <circle cx={0} cy={0} r={2.4} fill="currentColor" />
          </>
        ),
        labels: [
          { x: len + 7, y: 2, text: lab, anchor: "start" },
          { x: 0, y: -len - 10, text: lab2 },
          { x: -8, y: 10, text: "O", anchor: "end" },
        ],
      };
    case "cote":
      return {
        body: (
          <>
            <line x1={0} y1={-10} x2={0} y2={8} stroke="currentColor" strokeWidth={1} />
            <line x1={len} y1={-10} x2={len} y2={8} stroke="currentColor" strokeWidth={1} />
            <Arrow x1={len / 2} y1={0} x2={0} y2={0} w={1.2} head={8} />
            <Arrow x1={len / 2} y1={0} x2={len} y2={0} w={1.2} head={8} />
          </>
        ),
        labels: [{ x: len / 2, y: -11, text: lab }],
      };
    case "angle": {
      const a = (-h * Math.PI) / 180;
      return {
        body: (
          <>
            <line x1={0} y1={0} x2={60} y2={0} stroke="currentColor" strokeWidth={1.4} />
            <line x1={0} y1={0} x2={60 * Math.cos(a)} y2={60 * Math.sin(a)} stroke="currentColor" strokeWidth={1.4} />
            <path d={`M30 0 A30 30 0 0 0 ${30 * Math.cos(a)} ${30 * Math.sin(a)}`} fill="none" stroke="currentColor" strokeWidth={1.2} />
          </>
        ),
        labels: [{ x: 42 * Math.cos(a / 2), y: 42 * Math.sin(a / 2), text: lab }],
      };
    }
    case "centre-gravite":
      return {
        body: (
          <>
            <circle cx={0} cy={0} r={7} fill="var(--card)" stroke="currentColor" strokeWidth={1.4} />
            <path d="M0 0 L7 0 A7 7 0 0 0 0 -7 Z" fill="currentColor" />
            <path d="M0 0 L-7 0 A7 7 0 0 0 0 7 Z" fill="currentColor" />
          </>
        ),
        labels: [{ x: 11, y: -12, text: lab, anchor: "start" }],
      };

    /* ----------------------------- Sections ----------------------------- */
    case "section-rect":
    case "section-caisson": {
      const b = len;
      const t = Math.max(5, Math.min(b, h) * 0.1);
      const outer = `M${-b / 2} ${-h / 2} h${b} v${h} h${-b} Z`;
      const inner = `M${-b / 2 + t} ${-h / 2 + t} v${h - 2 * t} h${b - 2 * t} v${-(h - 2 * t)} Z`;
      return {
        body: (
          <>
            <path d={s.kind === "section-caisson" ? outer + " " + inner : outer} fill="currentColor" fillOpacity={0.1} fillRule="evenodd" stroke="currentColor" strokeWidth={SW} />
            <SectionAxes halfW={b / 2} halfH={h / 2} />
            <Dim x1={-b / 2} x2={b / 2} y={h / 2 + 15} />
            <DimV y1={-h / 2} y2={h / 2} x={b / 2 + 22} />
          </>
        ),
        labels: [
          { x: 0, y: h / 2 + 27, text: lab },
          { x: b / 2 + 30, y: 0, text: lab2, anchor: "start" },
          { x: 6, y: -h / 2 - 12, text: "y", anchor: "start" },
          { x: -b / 2 - 16, y: -8, text: "z" },
          { x: 6, y: -8, text: "G", anchor: "start" },
        ],
      };
    }
    case "section-i": {
      const b = len;
      const tf = Math.max(6, h * 0.09);
      const tw = Math.max(4, b * 0.09);
      const d = `M${-b / 2} ${-h / 2} h${b} v${tf} h${-(b - tw) / 2} v${h - 2 * tf} h${(b - tw) / 2} v${tf} h${-b} v${-tf} h${(b - tw) / 2} v${-(h - 2 * tf)} h${-(b - tw) / 2} Z`;
      return {
        body: (
          <>
            <path d={d} fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeWidth={SW} strokeLinejoin="round" />
            <SectionAxes halfW={b / 2} halfH={h / 2} />
            <Dim x1={-b / 2} x2={b / 2} y={h / 2 + 15} />
            <DimV y1={-h / 2} y2={h / 2} x={b / 2 + 22} />
          </>
        ),
        labels: [
          { x: 0, y: h / 2 + 27, text: lab },
          { x: b / 2 + 30, y: 0, text: lab2, anchor: "start" },
          { x: 6, y: -h / 2 - 12, text: "y", anchor: "start" },
          { x: -b / 2 - 16, y: -8, text: "z" },
        ],
      };
    }
    case "section-t": {
      const b = len;
      const tf = Math.max(8, h * 0.15);
      const tw = Math.max(6, b * 0.18);
      const yG = (b * tf * (tf / 2) + tw * (h - tf) * (tf + (h - tf) / 2)) / (b * tf + tw * (h - tf)) - h / 2;
      const d = `M${-b / 2} ${-h / 2} h${b} v${tf} h${-(b - tw) / 2} v${h - tf} h${-tw} v${-(h - tf)} h${-(b - tw) / 2} Z`;
      return {
        body: (
          <>
            <path d={d} fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeWidth={SW} strokeLinejoin="round" />
            <SectionAxes halfW={b / 2} halfH={h / 2} gy={yG} />
            <Dim x1={-b / 2} x2={b / 2} y={h / 2 + 15} />
            <DimV y1={-h / 2} y2={h / 2} x={b / 2 + 22} />
          </>
        ),
        labels: [
          { x: 0, y: h / 2 + 27, text: lab },
          { x: b / 2 + 30, y: 0, text: lab2, anchor: "start" },
          { x: 6, y: yG - 9, text: "G", anchor: "start" },
          { x: -b / 2 - 16, y: yG - 8, text: "z" },
        ],
      };
    }
    case "section-circ":
    case "section-tube": {
      const R = len / 2;
      const ri = Math.min(h / 2, R - 3);
      return {
        body: (
          <>
            <path
              d={`M${-R} 0 a${R} ${R} 0 1 0 ${2 * R} 0 a${R} ${R} 0 1 0 ${-2 * R} 0 Z${s.kind === "section-tube" ? ` M${-ri} 0 a${ri} ${ri} 0 1 1 ${2 * ri} 0 a${ri} ${ri} 0 1 1 ${-2 * ri} 0 Z` : ""}`}
              fill="currentColor"
              fillOpacity={0.12}
              fillRule="evenodd"
              stroke="currentColor"
              strokeWidth={SW}
            />
            {s.kind === "section-circ" ? <SectionAxes halfW={R} halfH={R} /> : <Dim x1={-ri} x2={ri} y={0} />}
            <Dim x1={-R} x2={R} y={R + 15} />
          </>
        ),
        labels: [{ x: 0, y: R + 27, text: lab }, ...(s.kind === "section-tube" ? [{ x: 0, y: -10, text: lab2 }] : [{ x: 6, y: -8, text: "G", anchor: "start" as const }])],
      };
    }

    /* ---------------------------- Diagrammes ---------------------------- */
    case "axes-ntm":
    case "axe": {
      const names = s.kind === "axe" ? [lab || "M(x)"] : ["N(x)", "T(x)", "M(x)"];
      return {
        body: (
          <>
            {names.map((_, i) => (
              <g key={i}>
                <Arrow x1={0} y1={i * h} x2={len + 16} y2={i * h} w={1.3} head={8} />
                <line x1={0} y1={i * h - 32} x2={0} y2={i * h + 32} stroke="currentColor" strokeWidth={1} />
              </g>
            ))}
          </>
        ),
        labels: names.flatMap((n, i) => [
          { x: -8, y: i * h, text: n, anchor: "end" as const },
          { x: len + 20, y: i * h + 10, text: "x", anchor: "start" as const },
        ]),
      };
    }
    case "diagramme-parabole":
    case "diagramme-triangle":
    case "diagramme-rectangle": {
      const d =
        s.kind === "diagramme-parabole"
          ? `M0 0 Q${len / 2} ${-2 * h} ${len} 0 Z`
          : s.kind === "diagramme-triangle"
            ? `M0 0 L${len / 2} ${-h} L${len} 0 Z`
            : `M0 0 L0 ${-h} L${len} ${-h} L${len} 0 Z`;
      return {
        body: (
          <>
            <path d={d} fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" />
            <line x1={0} y1={0} x2={len} y2={0} stroke="var(--ink)" strokeWidth={1.2} />
            <circle cx={len / 2} cy={-h * 0.42} r={7} fill="var(--card)" stroke="currentColor" strokeWidth={1} />
            <text x={len / 2} y={-h * 0.42 + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="currentColor">
              +
            </text>
          </>
        ),
        labels: [{ x: len / 2, y: -h - 11, text: lab }],
      };
    }
  }
  return { body: <rect x={-10} y={-10} width={20} height={20} fill="none" stroke="currentColor" />, labels: [] };
}

/** Symbole placé sur la page (coordonnées page). */
export function SymbolArt({ el, dark }: { el: SymbolEl; dark: boolean }) {
  const color = displayColor(el.color, dark);
  const { body, labels } = draw(el);
  const size = 15 * el.scale;
  return (
    <g color={color}>
      <g transform={`translate(${el.x} ${el.y}) rotate(${el.rot}) scale(${el.scale})`}>{body}</g>
      {labels
        .filter((l) => l.text)
        .map((l, k) => {
          const [x, y] = symbolToPage(el, l.x, l.y);
          return <LabelText key={k} x={x} y={y} text={l.text} anchor={l.anchor} size={size} color={l.color ?? color} italic={l.italic} />;
        })}
    </g>
  );
}

/** Aperçu d'un symbole (palette). */
export function SymbolPreview({ kind, className }: { kind: string; className?: string }) {
  const def = symbolDef(kind);
  const el: SymbolEl = { id: "preview", type: "symbol", kind, x: 0, y: 0, rot: 0, scale: 1, ...def.defaults };
  const b = def.box(el);
  const pad = 8;
  return (
    <svg viewBox={`${b.x - pad} ${b.y - pad} ${b.w + 2 * pad} ${b.h + 2 * pad}`} className={className} aria-hidden>
      <SymbolArt el={el} dark={false} />
    </svg>
  );
}
