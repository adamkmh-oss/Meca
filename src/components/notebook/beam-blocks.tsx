"use client";
/**
 * Blocs calculés du cahier : poutre (schéma, réactions, diagrammes N, T, M,
 * déformée) et coupure préfaite d'un tronçon (partie gauche isolée avec ses
 * efforts et les équations d'équilibre).
 */
import { memo, useMemo, type ReactNode } from "react";
import { analyzeBeam, pointLoadComponents } from "@/lib/mechanics/beam";
import { BeamPlot, BeamSchema, VB_W, xScale } from "@/components/mechanics/beam-svg";
import { Tex } from "@/components/math";
import { cutEquations, namedReactions, polyTexN, texn, txtn } from "@/lib/notebook/beam-notes";
import type { BeamEl, CutEl } from "@/lib/notebook/types";
import { LabelText } from "./symbol-art";

const PLOT = "rounded-none border-0 border-t border-dashed bg-transparent";

export const BeamBlock = memo(function BeamBlock({ el }: { el: BeamEl }) {
  const an = useMemo(() => analyzeBeam(el.model), [el.model]);
  const reacts = useMemo(() => namedReactions(an), [an]);
  const L = el.model.length;
  const { show } = el;
  if (!an.result.ok) {
    return (
      <div className="rounded-md border border-dashed border-[var(--diag-neg)] p-3 text-[13px] text-[var(--diag-neg)]">
        {el.title && <div className="mb-1 font-semibold">{el.title}</div>}
        Calcul impossible : {an.result.error}
      </div>
    );
  }
  const reactionDisplay = reacts.map((r) => ({ x: r.x, rx: r.H ?? 0, ry: r.V ?? 0, mz: r.M ?? 0 }));
  const marks = [...new Set([0, L, ...el.model.supports.map((s) => s.x)])];
  const h = an.result.hyperstaticity;
  return (
    <div className="text-[var(--ink)]">
      {el.title && <div className="px-1 pb-1 text-[15px] font-semibold">{el.title}</div>}
      {show.schema && (
        <BeamSchema model={el.model} reactions={show.reactions ? reactionDisplay : undefined} supportLabels className="block" />
      )}
      {show.reactions && (
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 px-2 pb-1 text-[12.5px]" style={{ color: "var(--reaction)" }}>
          {reacts.map((r) => (
            <span key={r.letter}>
              <b>{r.letter}</b> :{r.H !== undefined && Math.abs(r.H) > 1e-9 ? ` H = ${txtn(r.H, 2)} kN ;` : ""}
              {r.V !== undefined ? ` V = ${txtn(r.V, 2)} kN` : ""}
              {r.M !== undefined ? ` ; M = ${txtn(r.M, 2)} kN·m` : ""}
            </span>
          ))}
          <span className="text-[var(--muted-foreground)]">
            h = {h.degree} ({h.classification})
          </span>
        </div>
      )}
      {show.N && <BeamPlot points={an.points.map((p) => ({ x: p.x, y: p.N }))} L={L} unit="kN" title="N(x)" height={128} marks={marks} className={PLOT} />}
      {show.T && <BeamPlot points={an.points.map((p) => ({ x: p.x, y: -p.V }))} L={L} unit="kN" title="T(x)" height={138} marks={marks} className={PLOT} />}
      {show.M && <BeamPlot points={an.points.map((p) => ({ x: p.x, y: p.M }))} L={L} unit="kN·m" title="M(x)" height={150} marks={marks} className={PLOT} />}
      {show.deformee && (
        <BeamPlot points={an.points.map((p) => ({ x: p.x, y: p.v * 1000 }))} L={L} unit="mm" title="Déformée v(x)" height={120} line color="var(--deformed)" className={PLOT} />
      )}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*                      Coupure préfaite d'un tronçon                   */
/* ------------------------------------------------------------------ */
function Arr({ x1, y1, x2, y2, color, w = 2.2, head = 9 }: { x1: number; y1: number; x2: number; y2: number; color: string; w?: number; head?: number }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const hx = x2 - head * Math.cos(a);
  const hy = y2 - head * Math.sin(a);
  const hw = head * 0.5;
  return (
    <g>
      <line x1={x1} y1={y1} x2={hx} y2={hy} stroke={color} strokeWidth={w} strokeLinecap="round" />
      <polygon points={`${x2},${y2} ${hx + hw * Math.sin(a)},${hy - hw * Math.cos(a)} ${hx - hw * Math.sin(a)},${hy + hw * Math.cos(a)}`} fill={color} />
    </g>
  );
}

function Arc({ cx, cy, r, ccw, color }: { cx: number; cy: number; r: number; ccw: boolean; color: string }) {
  // arc de ±56° autour de l'horizontale, côté droit ; flèche en haut (anti-horaire) ou en bas (horaire)
  const a0 = ccw ? 56 : -56;
  const a1 = ccw ? -56 : 56;
  const rad = (d: number) => (d * Math.PI) / 180;
  const ex = cx + r * Math.cos(rad(a1));
  const ey = cy + r * Math.sin(rad(a1));
  const vx = ccw ? Math.sin(rad(a1)) : -Math.sin(rad(a1));
  const vy = ccw ? -Math.cos(rad(a1)) : Math.cos(rad(a1));
  return (
    <g>
      <path d={`M${cx + r * Math.cos(rad(a0))} ${cy + r * Math.sin(rad(a0))} A${r} ${r} 0 0 ${ccw ? 0 : 1} ${ex - vx * 5} ${ey - vy * 5}`} fill="none" stroke={color} strokeWidth={2.2} />
      <polygon points={`${ex + vx * 4},${ey + vy * 4} ${ex - vx * 6 - vy * 4.5},${ey - vy * 6 + vx * 4.5} ${ex - vx * 6 + vy * 4.5},${ey - vy * 6 - vx * 4.5}`} fill={color} />
    </g>
  );
}

export const CutBlock = memo(function CutBlock({ el }: { el: CutEl }) {
  const an = useMemo(() => analyzeBeam(el.model), [el.model]);
  const cuts = useMemo(() => cutEquations(el.model, an), [el.model, an]);
  const reacts = useMemo(() => namedReactions(an), [an]);
  const c = cuts[el.seg];
  if (!c) return <div className="p-2 text-[13px] text-[var(--muted-foreground)]">Tronçon introuvable (poutre modifiée).</div>;
  const L = el.model.length;
  const { px } = xScale(L);
  const xc = c.x0 + 0.62 * (c.x1 - c.x0);
  const X = px(xc);
  const yB = 120;
  const H = 230;
  const ink = "var(--ink)";
  const load = "var(--load)";
  const reac = "var(--reaction)";
  const cut = "var(--primary)";
  const parts: ReactNode[] = [];

  const maxQ = Math.max(1e-9, ...el.model.loads.flatMap((l) => (l.kind === "dist" ? [Math.abs(l.q1), Math.abs(l.q2)] : [])));
  const qH = (q: number) => (Math.abs(q) / maxQ) * 32;

  for (const r of reacts) {
    if (r.x > xc) continue;
    const x = px(r.x);
    if (r.V !== undefined && Math.abs(r.V) > 1e-9) {
      const up = r.V > 0;
      parts.push(<Arr key={`v${r.letter}`} x1={x} y1={up ? yB + 62 : yB + 8} x2={x} y2={up ? yB + 6 : yB + 60} color={reac} />);
      parts.push(<LabelText key={`tv${r.letter}`} x={x + 7} y={yB + 52} anchor="start" text={`V_${r.letter} = ${txtn(Math.abs(r.V), 2)} kN`} size={13} color={reac} italic={false} />);
    }
    if (r.H !== undefined && Math.abs(r.H) > 1e-9) {
      const right = r.H > 0;
      parts.push(<Arr key={`h${r.letter}`} x1={right ? x - 48 : x - 6} y1={yB} x2={right ? x - 6 : x - 48} y2={yB} color={reac} />);
      parts.push(<LabelText key={`th${r.letter}`} x={x - 27} y={yB - 13} text={`H_${r.letter} = ${txtn(Math.abs(r.H), 2)} kN`} size={12} color={reac} italic={false} />);
    }
    if (r.M !== undefined && Math.abs(r.M) > 1e-9) {
      parts.push(<Arc key={`m${r.letter}`} cx={x - 2} cy={yB} r={26} ccw={r.M > 0} color={reac} />);
      parts.push(<LabelText key={`tm${r.letter}`} x={x + 22} y={yB - 34} anchor="start" text={`M_${r.letter} = ${txtn(Math.abs(r.M), 2)} kN·m`} size={12} color={reac} italic={false} />);
    }
  }
  el.model.loads.forEach((ld, k) => {
    if (ld.kind === "point") {
      if (ld.x > xc) return;
      const { fx, fy } = pointLoadComponents(1, ld.angle);
      const x = px(ld.x);
      const len = 56;
      parts.push(<Arr key={`p${k}`} x1={x - fx * len} y1={yB - 5 + fy * len} x2={x} y2={yB - 5} color={load} />);
      parts.push(<LabelText key={`tp${k}`} x={x - fx * len} y={yB - 14 + fy * len} text={`${txtn(ld.F, 2)} kN`} size={12} color={load} italic={false} />);
    } else if (ld.kind === "moment") {
      if (ld.x > xc) return;
      const x = px(ld.x);
      parts.push(<Arc key={`c${k}`} cx={x} cy={yB} r={18} ccw={ld.M > 0} color={load} />);
      parts.push(<LabelText key={`tc${k}`} x={x} y={yB - 30} text={`${txtn(Math.abs(ld.M), 2)} kN·m`} size={12} color={load} italic={false} />);
    } else {
      const a = Math.min(ld.x1, ld.x2);
      const b = Math.max(ld.x1, ld.x2);
      if (a >= xc) return;
      const [qa, qb] = ld.x1 <= ld.x2 ? [ld.q1, ld.q2] : [ld.q2, ld.q1];
      const q = (x: number) => qa + ((qb - qa) * (x - a)) / (b - a);
      const bb = Math.min(b, xc);
      const X1 = px(a);
      const X2 = px(bb);
      const top = yB - 6;
      const n = Math.max(2, Math.round((X2 - X1) / 24));
      parts.push(<path key={`d${k}`} d={`M${X1} ${top} L${X1} ${top - qH(qa)} L${X2} ${top - qH(q(bb))} L${X2} ${top} Z`} fill={load} fillOpacity={0.1} stroke={load} strokeWidth={1.3} />);
      for (let i = 0; i <= n; i++) {
        const xx = X1 + ((X2 - X1) * i) / n;
        const hh = qH(q(a + ((bb - a) * i) / n));
        if (hh > 4) parts.push(<Arr key={`d${k}-${i}`} x1={xx} y1={top - hh} x2={xx} y2={top} color={load} w={1.2} head={6} />);
      }
      parts.push(
        <LabelText key={`td${k}`} x={(X1 + X2) / 2} y={top - Math.max(qH(qa), qH(q(bb))) - 10} text={Math.abs(qa - qb) < 1e-9 ? `${txtn(qa, 2)} kN/m` : `${txtn(qa, 2)} → ${txtn(qb, 2)} kN/m`} size={12} color={load} italic={false} />,
      );
    }
  });

  return (
    <div className="text-[var(--ink)]">
      <div className="px-1 text-[14px] font-semibold">
        Coupure — tronçon {el.seg + 1} : {txtn(c.x0)} &lt; x &lt; {txtn(c.x1)} m <span className="font-normal text-[var(--muted-foreground)]">(partie gauche isolée)</span>
      </div>
      <svg viewBox={`0 0 ${VB_W} ${H}`} className="block w-full" role="img" aria-label="Partie gauche isolée">
        <rect x={px(0)} y={yB - 3} width={X - px(0)} height={6} fill={ink} />
        <rect x={X} y={yB - 3} width={px(L) - X} height={6} fill={ink} opacity={0.12} />
        <line x1={X} y1={yB - 15} x2={X} y2={yB + 15} stroke={ink} strokeWidth={2} />
        {parts}
        <Arr x1={X + 4} y1={yB} x2={X + 56} y2={yB} color={cut} />
        <Arr x1={X} y1={yB - 8} x2={X} y2={yB - 58} color={cut} />
        <Arc cx={X} cy={yB} r={30} ccw color={cut} />
        <LabelText x={X + 61} y={yB} anchor="start" text="N(x)" size={14} color={cut} />
        <LabelText x={X + 7} y={yB - 58} anchor="start" text="T(x)" size={14} color={cut} />
        <LabelText x={X + 30} y={yB + 34} anchor="start" text="M(x)" size={14} color={cut} />
        <line x1={px(0)} y1={yB + 86} x2={X} y2={yB + 86} stroke={ink} strokeWidth={0.9} />
        <line x1={px(0)} y1={yB + 80} x2={px(0)} y2={yB + 92} stroke={ink} strokeWidth={0.9} />
        <line x1={X} y1={yB + 80} x2={X} y2={yB + 92} stroke={ink} strokeWidth={0.9} />
        <LabelText x={(px(0) + X) / 2} y={yB + 76} text="x" size={14} color={ink} />
      </svg>
      <div className="space-y-0.5 px-1 text-[13px]">
        <Tex display>{c.eqN === "N(x) = 0" ? "\\Sigma F_x = 0 :\\; N(x) = 0" : `\\Sigma F_x = 0 :\\; ${c.eqN} \\;\\Rightarrow\\; N(x) = ${polyTexN(c.N)}`}</Tex>
        <Tex display>{`\\Sigma F_y = 0 :\\; ${c.eqT} \\;\\Rightarrow\\; T(x) = ${polyTexN(c.T)}`}</Tex>
        <Tex display>{`\\Sigma M_{/G} = 0 :\\; ${c.eqM}`}</Tex>
        <Tex display>{`\\Rightarrow\\; M(x) = ${polyTexN(c.M)} \\qquad (\\text{kN, kN·m, } x \\text{ en m})`}</Tex>
        <div className="pt-0.5 text-[12px] text-[var(--muted-foreground)]">
          <Tex>{`M(${texn(c.x0)}) = ${texn(c.M.reduce((s, v, k) => s + v * c.x0 ** k, 0))}`}</Tex> ;{" "}
          <Tex>{`M(${texn(c.x1)}) = ${texn(c.M.reduce((s, v, k) => s + v * c.x1 ** k, 0))}`}</Tex> kN·m
        </div>
      </div>
    </div>
  );
});
