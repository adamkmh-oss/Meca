"use client";
/**
 * Dessins SVG d'une poutre droite : schéma mécanique (appuis, charges, cotes)
 * et diagrammes alignés sur la même échelle horizontale.
 */
import { useId, useMemo, useRef, useState } from "react";
import type { BeamLoad, BeamModel } from "@/lib/mechanics/beam";
import { pointLoadComponents } from "@/lib/mechanics/beam";
import { fmt, fmtSig } from "@/lib/mechanics/format";
import { cn } from "@/lib/utils";

export const VB_W = 820;
export const MARGIN = 56;

export function xScale(L: number) {
  const k = (VB_W - 2 * MARGIN) / L;
  return { px: (x: number) => MARGIN + x * k, mx: (p: number) => (p - MARGIN) / k, k };
}

/* ------------------------------------------------------------------ */
/*                          Symboles d'appuis                          */
/* ------------------------------------------------------------------ */
export function SupportGlyph({ type, x, y, side }: { type: string; x: number; y: number; side?: "left" | "right" | "mid" }) {
  if (type === "fixed") {
    const wx = side === "right" ? x : side === "left" ? x : x;
    const sgn = side === "right" ? 1 : -1;
    return (
      <g className="text-ink">
        <line x1={wx} y1={y - 26} x2={wx} y2={y + 26} stroke="currentColor" strokeWidth={3} />
        {Array.from({ length: 7 }, (_, k) => (
          <line key={k} x1={wx} y1={y - 22 + k * 7.5} x2={wx + sgn * 9} y2={y - 22 + k * 7.5 + 7} stroke="currentColor" strokeWidth={1} opacity={0.6} />
        ))}
      </g>
    );
  }
  const triH = 22;
  const half = 13;
  const base = y + 4 + triH;
  return (
    <g className="text-ink">
      <path d={`M${x} ${y + 4} L${x - half} ${base} L${x + half} ${base} Z`} fill="var(--card)" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" />
      {type === "roller" ? (
        <>
          <circle cx={x - 6.5} cy={base + 4.5} r={4} fill="var(--card)" stroke="currentColor" strokeWidth={1.4} />
          <circle cx={x + 6.5} cy={base + 4.5} r={4} fill="var(--card)" stroke="currentColor" strokeWidth={1.4} />
          <line x1={x - 18} y1={base + 9} x2={x + 18} y2={base + 9} stroke="currentColor" strokeWidth={1.5} />
          {Array.from({ length: 6 }, (_, k) => (
            <line key={k} x1={x - 16 + k * 6.5} y1={base + 9} x2={x - 21 + k * 6.5} y2={base + 15} stroke="currentColor" strokeWidth={1} opacity={0.6} />
          ))}
        </>
      ) : (
        <>
          <line x1={x - 18} y1={base} x2={x + 18} y2={base} stroke="currentColor" strokeWidth={1.5} />
          {Array.from({ length: 6 }, (_, k) => (
            <line key={k} x1={x - 16 + k * 6.5} y1={base} x2={x - 21 + k * 6.5} y2={base + 6} stroke="currentColor" strokeWidth={1} opacity={0.6} />
          ))}
        </>
      )}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*                              Flèches                                */
/* ------------------------------------------------------------------ */
export function Arrow({
  x1,
  y1,
  x2,
  y2,
  color = "var(--load)",
  width = 2.2,
  head = 9,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  width?: number;
  head?: number;
}) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const hx = x2 - head * Math.cos(ang);
  const hy = y2 - head * Math.sin(ang);
  const w = head * 0.55;
  const p1 = `${hx + w * Math.sin(ang)},${hy - w * Math.cos(ang)}`;
  const p2 = `${hx - w * Math.sin(ang)},${hy + w * Math.cos(ang)}`;
  return (
    <g>
      <line x1={x1} y1={y1} x2={hx} y2={hy} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <polygon points={`${x2},${y2} ${p1} ${p2}`} fill={color} />
    </g>
  );
}

function MomentArc({ cx, cy, r, ccw, color = "var(--load)" }: { cx: number; cy: number; r: number; ccw: boolean; color?: string }) {
  // arc de 220° autour du point ; flèche au bout dans le sens du couple
  const a0 = ccw ? -200 : 20;
  const a1 = ccw ? 20 : -200;
  const pt = (a: number) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const [sx, sy] = pt(a0);
  const [ex, ey] = pt(a1);
  // en SVG l'axe y descend : anti-horaire à l'écran = sweep 0
  const d = `M${sx} ${sy} A${r} ${r} 0 1 ${ccw ? 0 : 1} ${ex} ${ey}`;
  const tang = ((a1 + (ccw ? -90 : 90)) * Math.PI) / 180;
  const hx = ex - 8 * Math.cos(tang);
  const hy = ey - 8 * Math.sin(tang);
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth={2.2} />
      <polygon
        points={`${ex + 4 * Math.cos(tang)},${ey + 4 * Math.sin(tang)} ${hx + 4.5 * Math.sin(tang)},${hy - 4.5 * Math.cos(tang)} ${hx - 4.5 * Math.sin(tang)},${hy + 4.5 * Math.cos(tang)}`}
        fill={color}
      />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*                           Schéma de poutre                          */
/* ------------------------------------------------------------------ */
export interface ReactionDisplay {
  x: number;
  rx: number;
  ry: number;
  mz: number;
}

export function BeamSchema({
  model,
  reactions,
  showDims = true,
  selectedId,
  onSelect,
  onDrag,
  className,
  compact = false,
}: {
  model: BeamModel;
  reactions?: ReactionDisplay[];
  showDims?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  /** Déplacement d'un élément (charge ou appui) à l'abscisse x (m). */
  onDrag?: (id: string, kind: "load" | "load2" | "support" | "hinge", x: number) => void;
  className?: string;
  compact?: boolean;
}) {
  const L = model.length;
  const { px, mx } = xScale(L);
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ id: string; kind: "load" | "load2" | "support" | "hinge" } | null>(null);
  const yBeam = compact ? 92 : 112;
  const H = compact ? 168 : showDims ? 238 : 200;
  const interactive = !!onDrag;

  const toModelX = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return 0;
    const p = pt.matrixTransform(ctm.inverse());
    const x = Math.round(mx(p.x) / 0.05) * 0.05;
    return Math.min(Math.max(x, 0), L);
  };

  const startDrag = (id: string, kind: "load" | "load2" | "support" | "hinge") => (e: React.PointerEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDrag({ id, kind });
    onSelect?.(id);
  };

  const maxQ = Math.max(1e-9, ...model.loads.filter((l) => l.kind === "dist").flatMap((l) => (l.kind === "dist" ? [Math.abs(l.q1), Math.abs(l.q2)] : [])));
  const qH = (q: number) => (Math.abs(q) / maxQ) * 34;

  const handleCls = interactive ? "cursor-ew-resize" : "";

  const renderLoad = (ld: BeamLoad) => {
    const sel = selectedId === ld.id;
    const color = sel ? "var(--primary)" : "var(--load)";
    if (ld.kind === "point") {
      const { fx, fy } = pointLoadComponents(1, ld.angle);
      // flèche allongée si la force tombe dans une charge répartie (étiquettes séparées)
      const under = model.loads.some((o) => o.kind === "dist" && ld.x >= Math.min(o.x1, o.x2) - 1e-9 && ld.x <= Math.max(o.x1, o.x2) + 1e-9);
      const len = under && fy < 0 ? 58 + 34 + 16 : 58;
      const x = px(ld.x);
      const tip = { x, y: yBeam - 4 };
      const tail = { x: tip.x - fx * len, y: tip.y + fy * len };
      const lx = tail.x + (fx > 0.3 ? -8 : fx < -0.3 ? 8 : 0);
      return (
        <g key={ld.id} onPointerDown={startDrag(ld.id, "load")} className={handleCls}>
          <line x1={tail.x} y1={tail.y} x2={tip.x} y2={tip.y} stroke="transparent" strokeWidth={18} />
          <Arrow x1={tail.x} y1={tail.y} x2={tip.x} y2={tip.y} color={color} />
          <text x={lx} y={tail.y - 7} textAnchor="middle" fontSize={13} fontWeight={600} fill={color}>
            {fmtSig(ld.F, 3)} kN
          </text>
        </g>
      );
    }
    if (ld.kind === "moment") {
      const x = px(ld.x);
      return (
        <g key={ld.id} onPointerDown={startDrag(ld.id, "load")} className={handleCls}>
          <circle cx={x} cy={yBeam} r={20} fill="transparent" />
          <MomentArc cx={x} cy={yBeam} r={17} ccw={ld.M >= 0} color={color} />
          <text x={x} y={yBeam - 26} textAnchor="middle" fontSize={13} fontWeight={600} fill={color}>
            {fmtSig(Math.abs(ld.M), 3)} kN·m
          </text>
        </g>
      );
    }
    const xa = Math.min(ld.x1, ld.x2);
    const xb = Math.max(ld.x1, ld.x2);
    const [qa, qb] = ld.x1 <= ld.x2 ? [ld.q1, ld.q2] : [ld.q2, ld.q1];
    const X1 = px(xa);
    const X2 = px(xb);
    const top = yBeam - 6;
    const n = Math.max(2, Math.round((X2 - X1) / 26));
    const arrows = [];
    for (let k = 0; k <= n; k++) {
      const xx = X1 + ((X2 - X1) * k) / n;
      const q = qa + ((qb - qa) * k) / n;
      const h = qH(q);
      if (h > 3) arrows.push(<Arrow key={k} x1={xx} y1={top - h} x2={xx} y2={top} color={color} width={1.3} head={6} />);
    }
    const label =
      Math.abs(qa - qb) < 1e-9 ? `${fmtSig(qa, 3)} kN/m` : `${fmtSig(qa, 3)} → ${fmtSig(qb, 3)} kN/m`;
    return (
      <g key={ld.id}>
        <path
          d={`M${X1} ${top} L${X1} ${top - qH(qa)} L${X2} ${top - qH(qb)} L${X2} ${top} Z`}
          fill={sel ? "color-mix(in srgb, var(--primary) 14%, transparent)" : "color-mix(in srgb, var(--load) 12%, transparent)"}
          stroke={color}
          strokeWidth={1.4}
          onPointerDown={(e) => {
            e.stopPropagation();
            onSelect?.(ld.id);
          }}
        />
        {arrows}
        <text x={(X1 + X2) / 2} y={top - Math.max(qH(qa), qH(qb)) - 7} textAnchor="middle" fontSize={13} fontWeight={600} fill={color}>
          {label}
        </text>
        {interactive && (
          <>
            <rect x={X1 - 5} y={top - qH(qa) - 6} width={10} height={qH(qa) + 12} rx={3} fill={color} opacity={0.35} className="cursor-ew-resize" onPointerDown={startDrag(ld.id, "load")} />
            <rect x={X2 - 5} y={top - qH(qb) - 6} width={10} height={qH(qb) + 12} rx={3} fill={color} opacity={0.35} className="cursor-ew-resize" onPointerDown={startDrag(ld.id, "load2")} />
          </>
        )}
      </g>
    );
  };

  // positions remarquables pour la cotation
  const ticks = useMemo(() => {
    const s = new Set<number>([0, L]);
    model.supports.forEach((p) => s.add(Math.min(Math.max(p.x, 0), L)));
    model.loads.forEach((l) => {
      if (l.kind === "dist") {
        s.add(l.x1);
        s.add(l.x2);
      } else s.add(l.x);
    });
    return [...s].sort((a, b) => a - b).filter((v, k, arr) => k === 0 || v - arr[k - 1] > 1e-6);
  }, [model, L]);

  const yDim = yBeam + 70;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VB_W} ${H}`}
      className={cn("w-full select-none touch-none text-ink", className)}
      onPointerMove={(e) => {
        if (!drag || !onDrag) return;
        onDrag(drag.id, drag.kind, toModelX(e.clientX, e.clientY));
      }}
      onPointerUp={() => setDrag(null)}
      onPointerLeave={() => setDrag(null)}
      onPointerDown={() => onSelect?.(null)}
      role="img"
      aria-label="Schéma mécanique de la poutre"
    >
      {/* poutre */}
      <line x1={px(0)} y1={yBeam} x2={px(L)} y2={yBeam} stroke="currentColor" strokeWidth={5} strokeLinecap="butt" />
      {/* appuis */}
      {model.supports.map((s) => {
        const side = s.x <= 1e-6 ? "left" : s.x >= L - 1e-6 ? "right" : "mid";
        const x = px(Math.min(Math.max(s.x, 0), L));
        const sel = selectedId === s.id;
        return (
          <g key={s.id} onPointerDown={startDrag(s.id, "support")} className={cn(handleCls, sel && "text-primary")} style={sel ? { color: "var(--primary)" } : undefined}>
            <rect x={x - 18} y={yBeam - 4} width={36} height={44} fill="transparent" />
            <SupportGlyph type={s.type} x={x} y={yBeam} side={side} />
          </g>
        );
      })}
      {/* rotules */}
      {model.hinges.map((h) => (
        <g key={h.id} onPointerDown={startDrag(h.id, "hinge")} className={handleCls}>
          <circle cx={px(h.x)} cy={yBeam} r={6} fill="var(--card)" stroke={selectedId === h.id ? "var(--primary)" : "currentColor"} strokeWidth={2} />
        </g>
      ))}
      {/* charges */}
      {model.loads.map(renderLoad)}
      {/* réactions */}
      {reactions?.map((r, k) => {
        const x = px(r.x);
        const out = [];
        if (Math.abs(r.ry) > 1e-6) {
          const up = r.ry > 0;
          const y0 = yBeam + (up ? 62 : 8);
          const y1 = yBeam + (up ? 8 : 62);
          const right = x < VB_W - 120;
          const ax = right ? x + 26 : x - 26;
          out.push(<Arrow key="y" x1={ax} y1={y0} x2={ax} y2={y1} color="var(--reaction)" width={2} head={8} />);
          out.push(
            <text key="ty" x={right ? ax + 6 : ax - 6} y={yBeam + 40} textAnchor={right ? "start" : "end"} fontSize={12} fontWeight={600} fill="var(--reaction)">
              {fmt(Math.abs(r.ry), 2)} kN
            </text>,
          );
        }
        if (Math.abs(r.rx) > 1e-6) {
          const right = r.rx > 0;
          out.push(<Arrow key="x" x1={x + (right ? -46 : 46)} y1={yBeam + 18} x2={x + (right ? -8 : 8)} y2={yBeam + 18} color="var(--reaction)" width={2} head={8} />);
          out.push(
            <text key="tx" x={x + (right ? -46 : 10)} y={yBeam + 33} fontSize={12} fontWeight={600} fill="var(--reaction)">
              {fmt(Math.abs(r.rx), 2)} kN
            </text>,
          );
        }
        if (Math.abs(r.mz) > 1e-6) {
          out.push(<MomentArc key="m" cx={x} cy={yBeam} r={30} ccw={r.mz > 0} color="var(--reaction)" />);
          out.push(
            <text key="tm" x={x + (x < VB_W / 2 ? 34 : -34)} y={yBeam - 34} textAnchor={x < VB_W / 2 ? "start" : "end"} fontSize={12} fontWeight={600} fill="var(--reaction)">
              {fmt(Math.abs(r.mz), 2)} kN·m
            </text>,
          );
        }
        return <g key={k}>{out}</g>;
      })}
      {/* cotation */}
      {showDims && !compact && (
        <g className="text-muted-foreground" fontSize={12}>
          <line x1={px(0)} y1={yDim} x2={px(L)} y2={yDim} stroke="currentColor" strokeWidth={0.8} />
          {ticks.map((t) => (
            <g key={t}>
              <line x1={px(t)} y1={yDim - 5} x2={px(t)} y2={yDim + 5} stroke="currentColor" strokeWidth={0.8} />
            </g>
          ))}
          {ticks.slice(0, -1).map((t, k) => {
            const t2 = ticks[k + 1];
            const w = px(t2) - px(t);
            if (w < 26) return null;
            return (
              <text key={`l${t}`} x={(px(t) + px(t2)) / 2} y={yDim - 6} textAnchor="middle" fill="currentColor">
                {fmt(t2 - t, 2)}
              </text>
            );
          })}
          <text x={px(L)} y={yDim + 20} textAnchor="end" fill="currentColor">
            L = {fmt(L, 2)} m
          </text>
        </g>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*                            Diagrammes                               */
/* ------------------------------------------------------------------ */
export interface PlotPoint {
  x: number;
  y: number;
}

/**
 * Diagramme d'une grandeur le long de la poutre. Les valeurs positives sont
 * reportées vers le haut (y local), les négatives vers le bas ; le signe est
 * aussi indiqué par ⊕ / ⊖.
 */
export function BeamPlot({
  points,
  L,
  unit,
  title,
  decimals = 2,
  height = 150,
  line = false,
  color,
  marks,
  className,
}: {
  points: PlotPoint[];
  L: number;
  unit: string;
  title: string;
  decimals?: number;
  height?: number;
  /** Tracé en trait seul (déformée). */
  line?: boolean;
  color?: string;
  /** Abscisses où afficher la valeur (en plus des extrema). */
  marks?: number[];
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const { px, mx } = xScale(L);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const top = 26;
  const bottom = height - 22;
  const y0 = (top + bottom) / 2;
  const amp = (bottom - top) / 2 - 6;
  const maxAbs = Math.max(1e-12, ...points.map((p) => Math.abs(p.y)));
  const scale = maxAbs > 1e-9 ? amp / maxAbs : 0;
  const Y = (v: number) => y0 - v * scale;
  const isZero = maxAbs < 1e-7;

  const poly = points.map((p) => `${px(p.x).toFixed(2)},${Y(p.y).toFixed(2)}`).join(" ");
  const area = `${px(points[0]?.x ?? 0)},${y0} ${poly} ${px(points[points.length - 1]?.x ?? L)},${y0}`;

  const valueAt = (x: number) => {
    // interpolation linéaire entre stations
    let best = points[0];
    for (let k = 0; k < points.length - 1; k++) {
      const a = points[k];
      const b = points[k + 1];
      if (x >= a.x && x <= b.x) {
        if (b.x - a.x < 1e-12) return b.y;
        return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
      }
      best = b;
    }
    return best?.y ?? 0;
  };

  // étiquettes : extrema + valeurs aux discontinuités + marques demandées
  const labels = useMemo(() => {
    if (isZero) return [];
    const cands: { x: number; y: number }[] = [];
    let iMax = 0;
    let iMin = 0;
    points.forEach((p, k) => {
      if (p.y > points[iMax].y) iMax = k;
      if (p.y < points[iMin].y) iMin = k;
    });
    cands.push(points[iMax], points[iMin]);
    for (let k = 0; k < points.length - 1; k++) {
      const a = points[k];
      const b = points[k + 1];
      if (Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) > 1e-6 * maxAbs) cands.push(a, b);
    }
    (marks ?? []).forEach((x) => cands.push({ x, y: valueAt(x) }));
    cands.push(points[0], points[points.length - 1]);
    const out: { x: number; y: number }[] = [];
    for (const c of cands) {
      if (Math.abs(c.y) < 1e-3 * maxAbs) continue;
      if (out.some((o) => Math.abs(px(o.x) - px(c.x)) < 34 && Math.abs(Y(o.y) - Y(c.y)) < 16)) continue;
      out.push(c);
      if (out.length >= 7) break;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, marks]);

  const stroke = color ?? "var(--diag-pos)";

  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${height}`}
        className="w-full touch-none text-ink"
        onPointerMove={(e) => {
          const svg = svgRef.current;
          if (!svg) return;
          const pt = svg.createSVGPoint();
          pt.x = e.clientX;
          pt.y = e.clientY;
          const ctm = svg.getScreenCTM();
          if (!ctm) return;
          const p = pt.matrixTransform(ctm.inverse());
          const x = mx(p.x);
          setHover(x >= 0 && x <= L ? x : null);
        }}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Diagramme : ${title}`}
      >
        <defs>
          <clipPath id={`pos${uid}`}>
            <rect x={0} y={0} width={VB_W} height={y0} />
          </clipPath>
          <clipPath id={`neg${uid}`}>
            <rect x={0} y={y0} width={VB_W} height={height - y0} />
          </clipPath>
        </defs>
        <text x={10} y={17} fontSize={13} fontWeight={650} fill="currentColor">
          {title}
        </text>
        <text x={VB_W - 10} y={17} fontSize={11} textAnchor="end" className="fill-muted-foreground">
          {unit}
        </text>
        {/* axe */}
        <line x1={px(0)} y1={y0} x2={px(L)} y2={y0} stroke="currentColor" strokeWidth={1.2} opacity={0.75} />
        {!isZero && !line && (
          <>
            <polygon points={area} fill="var(--diag-pos-fill)" clipPath={`url(#pos${uid})`} />
            <polygon points={area} fill="var(--diag-neg-fill)" clipPath={`url(#neg${uid})`} />
            <polyline points={poly} fill="none" stroke="var(--diag-pos)" strokeWidth={1.8} clipPath={`url(#pos${uid})`} strokeLinejoin="round" />
            <polyline points={poly} fill="none" stroke="var(--diag-neg)" strokeWidth={1.8} clipPath={`url(#neg${uid})`} strokeLinejoin="round" />
          </>
        )}
        {!isZero && line && <polyline points={poly} fill="none" stroke={stroke} strokeWidth={2.2} strokeLinejoin="round" />}
        {isZero && (
          <text x={VB_W / 2} y={y0 - 8} textAnchor="middle" fontSize={12} className="fill-muted-foreground">
            nul sur toute la longueur
          </text>
        )}
        {/* signes */}
        {!isZero && !line && <SignMarks points={points} px={px} Y={Y} y0={y0} maxAbs={maxAbs} />}
        {/* étiquettes */}
        {labels.map((l, k) => {
          const above = l.y >= 0;
          return (
            <g key={k}>
              <circle cx={px(l.x)} cy={Y(l.y)} r={2.6} fill={line ? stroke : l.y >= 0 ? "var(--diag-pos)" : "var(--diag-neg)"} />
              <text
                x={Math.min(Math.max(px(l.x), 40), VB_W - 40)}
                y={Y(l.y) + (above ? -7 : 16)}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                fill="currentColor"
              >
                {fmt(l.y, decimals)}
              </text>
            </g>
          );
        })}
        {/* lecture au survol */}
        {hover !== null && !isZero && (
          <g>
            <line x1={px(hover)} y1={top - 4} x2={px(hover)} y2={bottom + 4} stroke="var(--primary)" strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={px(hover)} cy={Y(valueAt(hover))} r={3.5} fill="var(--primary)" />
            <g transform={`translate(${Math.min(px(hover) + 8, VB_W - 150)}, ${bottom - 2})`}>
              <rect x={0} y={-15} width={142} height={19} rx={4} fill="var(--card)" stroke="var(--border)" />
              <text x={6} y={-1} fontSize={11.5} fill="currentColor">
                x = {fmt(hover, 2)} m : {fmt(valueAt(hover), decimals)}
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}

function SignMarks({
  points,
  px,
  Y,
  y0,
  maxAbs,
}: {
  points: PlotPoint[];
  px: (x: number) => number;
  Y: (v: number) => number;
  y0: number;
  maxAbs: number;
}) {
  // zones de signe constant suffisamment larges
  const zones: { x0: number; x1: number; sign: 1 | -1; peak: PlotPoint }[] = [];
  let cur: (typeof zones)[number] | null = null;
  for (const p of points) {
    const s = Math.abs(p.y) < 1e-6 * maxAbs ? 0 : p.y > 0 ? 1 : -1;
    if (s === 0) {
      cur = null;
      continue;
    }
    if (!cur || cur.sign !== s) {
      cur = { x0: p.x, x1: p.x, sign: s as 1 | -1, peak: p };
      zones.push(cur);
    } else {
      cur.x1 = p.x;
      if (Math.abs(p.y) > Math.abs(cur.peak.y)) cur.peak = p;
    }
  }
  return (
    <>
      {zones
        .filter((z) => px(z.x1) - px(z.x0) > 30 && Math.abs(z.peak.y) > 0.12 * maxAbs)
        .map((z, k) => {
          const xm = (px(z.x0) + px(z.x1)) / 2;
          const ym = y0 + (Y(z.peak.y) - y0) * 0.42;
          return (
            <g key={k}>
              <circle cx={xm} cy={ym} r={8} fill="var(--card)" stroke="currentColor" strokeWidth={1} />
              <text x={xm} y={ym + 4.2} textAnchor="middle" fontSize={13} fontWeight={700} fill="currentColor">
                {z.sign > 0 ? "+" : "−"}
              </text>
            </g>
          );
        })}
    </>
  );
}
