"use client";
/**
 * Dessins des blocs calculés en littéral : schéma de poutre étiqueté avec
 * des lettres, diagrammes dont les valeurs remarquables sont écrites en
 * lettres (qL²/8…), coupure préfaite littérale.
 * L'allure des courbes vient du calcul aux valeurs de dessin.
 */
import { memo, useMemo, type ReactNode } from "react";
import katex from "katex";
import { analyzeBeam, type BeamModel } from "@/lib/mechanics/beam";
import { Arrow, SupportGlyph, VB_W, xScale } from "@/components/mechanics/beam-svg";
import { Tex } from "@/components/math";
import { litBounds, litCuts, litKeyValues, litReactions, parseBeam, solveStatics, type KeyValue, type LitBeam } from "@/lib/notebook/literal-beam";
import { Ex, plain, tex, texInX } from "@/lib/notebook/symbolic";
import type { BeamShow } from "@/lib/notebook/types";
import { LabelText } from "./symbol-art";

const kt = (s: string) => katex.renderToString(s, { throwOnError: false, strict: "ignore" });

function Arc({ cx, cy, r, ccw, color }: { cx: number; cy: number; r: number; ccw: boolean; color: string }) {
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

/* ------------------------------------------------------------------ */
/*                       Schéma de poutre littéral                      */
/* ------------------------------------------------------------------ */
export function LitBeamSchema({ lit, model, reactions = true, cutAt }: { lit: LitBeam; model: BeamModel; reactions?: boolean; cutAt?: number }) {
  const parsed = useMemo(() => parseBeam(lit), [lit]);
  const an = useMemo(() => analyzeBeam(model), [model]);
  if (!parsed.ok) return <div className="p-2 text-[12px] text-[var(--diag-neg)]">{parsed.errors.join(" ; ")}</div>;
  const p = parsed.p;
  const L = model.length;
  const { px } = xScale(L);
  const yB = 112;
  const H = 250;
  const ink = "var(--ink)";
  const load = "var(--load)";
  const reac = "var(--reaction)";
  const parts: ReactNode[] = [];
  const xMax = cutAt ?? L;
  const vis = (x: number) => x <= xMax + 1e-9;

  const maxQ = Math.max(1e-9, ...model.loads.flatMap((l) => (l.kind === "dist" ? [Math.abs(l.q1), Math.abs(l.q2)] : [])));
  const qH = (q: number) => (Math.abs(q) / maxQ) * 34;

  p.loads.forEach((l, k) => {
    const m = model.loads[k];
    if (l.kind === "point" && m.kind === "point") {
      if (!vis(l.xv)) return;
      const a = (m.angle * Math.PI) / 180;
      const ux = Math.cos(a);
      const uy = Math.sin(a);
      const under = model.loads.some((o) => o.kind === "dist" && m.x >= Math.min(o.x1, o.x2) - 1e-9 && m.x <= Math.max(o.x1, o.x2) + 1e-9);
      const len = under && uy < 0 ? 90 : 58;
      const x = px(l.xv);
      parts.push(<Arrow key={`p${k}`} x1={x - ux * len} y1={yB - 4 + uy * len} x2={x} y2={yB - 4} color={load} />);
      parts.push(<LabelText key={`tp${k}`} x={x - ux * len + (ux > 0.3 ? -10 : ux < -0.3 ? 10 : 0)} y={yB - 14 + uy * len} text={plain(l.F)} size={15} color={load} />);
    } else if (l.kind === "moment") {
      if (!vis(l.xv)) return;
      const x = px(l.xv);
      const ccw = l.M.eval(p.vals) >= 0;
      parts.push(<Arc key={`c${k}`} cx={x} cy={yB} r={18} ccw={ccw} color={load} />);
      parts.push(<LabelText key={`tc${k}`} x={x} y={yB - 30} text={plain(ccw ? l.M : l.M.neg())} size={15} color={load} />);
    } else if (l.kind === "dist" && m.kind === "dist") {
      if (!vis(l.av)) return;
      const a = l.av;
      const b = Math.min(l.bv, xMax);
      const qa = l.qa.eval(p.vals);
      const qbFull = l.qb.eval(p.vals);
      const q = (x: number) => qa + ((qbFull - qa) * (x - l.av)) / (l.bv - l.av);
      const X1 = px(a);
      const X2 = px(b);
      const top = yB - 6;
      const n = Math.max(2, Math.round((X2 - X1) / 24));
      parts.push(<path key={`d${k}`} d={`M${X1} ${top} L${X1} ${top - qH(qa)} L${X2} ${top - qH(q(b))} L${X2} ${top} Z`} fill={load} fillOpacity={0.1} stroke={load} strokeWidth={1.3} />);
      for (let i = 0; i <= n; i++) {
        const xx = X1 + ((X2 - X1) * i) / n;
        const hh = qH(q(a + ((b - a) * i) / n));
        if (hh > 4) parts.push(<Arrow key={`d${k}-${i}`} x1={xx} y1={top - hh} x2={xx} y2={top} color={load} width={1.2} head={6} />);
      }
      const uniform = l.qa.equals(l.qb);
      const label = uniform ? plain(l.qa) : `${plain(l.qa)} → ${plain(l.qb)}`;
      parts.push(<LabelText key={`td${k}`} x={(X1 + X2) / 2} y={top - Math.max(qH(qa), qH(q(b))) - 11} text={label} size={15} color={load} />);
    }
  });

  // appuis (ou réactions sur une coupure)
  const st = solveStatics(p);
  p.supports.forEach((s) => {
    if (!vis(s.xv)) return;
    const x = px(s.xv);
    const side = s.xv <= 1e-9 ? "left" : s.xv >= L - 1e-9 ? "right" : "mid";
    if (!cutAt) parts.push(<SupportGlyph key={`s${s.id}`} type={s.type} x={x} y={yB} side={side} />);
    parts.push(<LabelText key={`l${s.id}`} x={x + (cutAt ? -10 : 0)} y={cutAt ? yB + 16 : yB + 58} text={s.letter} size={14} color={ink} italic={false} />);
    if (!reactions || !st.ok) return;
    for (const u of st.unknowns.filter((u) => u.letter === s.letter)) {
      const v = st.values.get(u.sym)!.eval(p.vals);
      if (Math.abs(v) < 1e-9) continue;
      if (u.comp === "V") {
        const up = v > 0;
        const ax = x + (x < VB_W - 120 ? 26 : -26);
        parts.push(<Arrow key={`rv${s.id}`} x1={ax} y1={up ? yB + 64 : yB + 10} x2={ax} y2={up ? yB + 10 : yB + 64} color={reac} width={2} head={8} />);
        parts.push(<LabelText key={`rvt${s.id}`} x={ax + (x < VB_W - 120 ? 8 : -8)} y={yB + 46} anchor={x < VB_W - 120 ? "start" : "end"} text={u.sym} size={14} color={reac} />);
      } else if (u.comp === "H") {
        const right = v > 0;
        parts.push(<Arrow key={`rh${s.id}`} x1={x + (right ? -50 : 50)} y1={yB + (cutAt ? 0 : 20)} x2={x + (right ? -8 : 8)} y2={yB + (cutAt ? 0 : 20)} color={reac} width={2} head={8} />);
        parts.push(<LabelText key={`rht${s.id}`} x={x + (right ? -30 : 30)} y={yB + (cutAt ? -12 : 34)} text={u.sym} size={14} color={reac} />);
      } else {
        parts.push(<Arc key={`rm${s.id}`} cx={x} cy={yB} r={30} ccw={v > 0} color={reac} />);
        parts.push(<LabelText key={`rmt${s.id}`} x={x + 36} y={yB - 36} anchor="start" text={u.sym} size={14} color={reac} />);
      }
    }
  });
  // rotules
  p.hinges.forEach((h) => vis(h.xv) && parts.push(<circle key={`h${h.id}`} cx={px(h.xv)} cy={yB} r={6} fill="var(--card)" stroke={ink} strokeWidth={2} />));

  // cotes en lettres
  const bounds = litBounds(p).filter((b) => vis(b.xv));
  if (cutAt === undefined) {
    const yD = yB + 92;
    parts.push(<line key="dim" x1={px(0)} y1={yD} x2={px(L)} y2={yD} stroke={ink} strokeWidth={0.8} opacity={0.7} />);
    bounds.forEach((b, k) => {
      parts.push(<line key={`tk${k}`} x1={px(b.xv)} y1={yD - 5} x2={px(b.xv)} y2={yD + 5} stroke={ink} strokeWidth={0.8} opacity={0.7} />);
      if (k < bounds.length - 1) {
        const nb = bounds[k + 1];
        if (px(nb.xv) - px(b.xv) > 28) parts.push(<LabelText key={`dl${k}`} x={(px(b.xv) + px(nb.xv)) / 2} y={yD - 10} text={plain(nb.x.sub(b.x))} size={13} color={ink} />);
      }
    });
    if (bounds.length > 2) {
      parts.push(<line key="dim2" x1={px(0)} y1={yD + 24} x2={px(L)} y2={yD + 24} stroke={ink} strokeWidth={0.8} opacity={0.7} />);
      parts.push(<LabelText key="dlL" x={(px(0) + px(L)) / 2} y={yD + 14} text={plain(p.L)} size={13} color={ink} />);
    }
  }
  return (
    <svg viewBox={`0 0 ${VB_W} ${cutAt === undefined ? H : 200}`} className="block w-full" role="img" aria-label="Schéma de la poutre">
      <rect x={px(0)} y={yB - 3} width={px(xMax) - px(0)} height={6} fill={ink} />
      {cutAt !== undefined && <rect x={px(xMax)} y={yB - 3} width={px(L) - px(xMax)} height={6} fill={ink} opacity={0.12} />}
      {parts}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*                    Diagramme à valeurs littérales                    */
/* ------------------------------------------------------------------ */
interface LabelBox {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Ancrage horizontal du texte réellement affiché (la largeur exacte n'est connue qu'au rendu). */
  ax: "l" | "r" | "c";
  above: boolean;
  k: KeyValue;
}

/** Place les étiquettes des valeurs remarquables sans chevauchement (essais successifs, sinon on renonce). */
function placeLabels(keys: KeyValue[], px: (x: number) => number, Y: (v: number) => number, height: number): LabelBox[] {
  const S = VB_W / 640; // unités du schéma pour 1 px de texte (bloc de 640 px de large)
  const blocked: { x: number; y: number; w: number; h: number }[] = [{ x: 0, y: 0, w: 70, h: 26 }];
  const hit = (b: { x: number; y: number; w: number; h: number }) => blocked.some((o) => b.x < o.x + o.w && o.x < b.x + b.w && b.y < o.y + o.h && o.y < b.y + b.h);
  const out: LabelBox[] = [];
  // les valeurs extrêmes d'abord : ce sont elles qu'on veut voir en priorité
  const order = [...keys].sort((a, b) => Math.abs(b.yv) - Math.abs(a.yv));
  for (const k of order) {
    const x = px(k.xv);
    const y = Y(k.yv);
    const w = (k.plain.length * 6.4 + 8) * S;
    const h = 19 * S;
    const sides: ("l" | "r" | "c")[] = k.side === "c" ? ["c", "r", "l"] : [k.side, "c", k.side === "l" ? "r" : "l"];
    const verticals = k.yv >= 0 ? [true, false] : [false, true];
    let done = false;
    for (const above of verticals) {
      for (const side of sides) {
        let bx = side === "r" ? x + 5 : side === "l" ? x - 5 - w : x - w / 2;
        bx = Math.min(Math.max(bx, 4), VB_W - 4 - w);
        let by = above ? y - 5 - h : y + 5;
        by = Math.min(Math.max(by, 0), height - h);
        const box = { x: bx, y: by, w, h };
        if (hit(box)) continue;
        blocked.push(box);
        out.push({ ...box, ax: side, above, k });
        done = true;
        break;
      }
      if (done) break;
    }
  }
  return out;
}

export function LitPlot({ points, L, title, keys, height = 150, color }: { points: { x: number; y: number }[]; L: number; title: string; keys: KeyValue[]; height?: number; color?: string }) {
  const { px } = xScale(L);
  const top = 38;
  const bottom = height - 32;
  const y0 = (top + bottom) / 2;
  const amp = (bottom - top) / 2;
  const maxAbs = Math.max(1e-12, ...points.map((p) => Math.abs(p.y)));
  const k = maxAbs > 1e-9 ? amp / maxAbs : 0;
  const Y = (v: number) => y0 - v * k;
  const poly = points.map((p) => `${px(p.x).toFixed(2)},${Y(p.y).toFixed(2)}`).join(" ");
  const area = `${px(points[0]?.x ?? 0)},${y0} ${poly} ${px(points[points.length - 1]?.x ?? L)},${y0}`;
  const zero = maxAbs < 1e-7;
  const id = useMemo(() => Math.random().toString(36).slice(2), []);
  const placed = placeLabels(zero ? [] : keys, px, Y, height);
  return (
    <div className="relative border-t border-dashed border-[var(--border)]">
      <svg viewBox={`0 0 ${VB_W} ${height}`} className="block w-full" role="img" aria-label={`Diagramme ${title}`}>
        <defs>
          <clipPath id={`p${id}`}>
            <rect x={0} y={0} width={VB_W} height={y0} />
          </clipPath>
          <clipPath id={`n${id}`}>
            <rect x={0} y={y0} width={VB_W} height={height - y0} />
          </clipPath>
        </defs>
        <text x={10} y={18} fontSize={14} fontWeight={650} fontStyle="italic" fill="var(--ink)" style={{ fontFamily: "'Times New Roman', serif" }}>
          {title}
        </text>
        <line x1={px(0)} y1={y0} x2={px(L)} y2={y0} stroke="var(--ink)" strokeWidth={1.2} opacity={0.75} />
        {!zero && !color && (
          <>
            <polygon points={area} fill="var(--diag-pos-fill)" clipPath={`url(#p${id})`} />
            <polygon points={area} fill="var(--diag-neg-fill)" clipPath={`url(#n${id})`} />
            <polyline points={poly} fill="none" stroke="var(--diag-pos)" strokeWidth={1.8} clipPath={`url(#p${id})`} strokeLinejoin="round" />
            <polyline points={poly} fill="none" stroke="var(--diag-neg)" strokeWidth={1.8} clipPath={`url(#n${id})`} strokeLinejoin="round" />
          </>
        )}
        {!zero && color && <polyline points={poly} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" />}
        {zero && (
          <text x={VB_W / 2} y={y0 - 8} textAnchor="middle" fontSize={12} fill="var(--muted-foreground)">
            nul sur toute la longueur
          </text>
        )}
        {placed.map((p, i) => (
          <circle key={i} cx={px(p.k.xv)} cy={Y(p.k.yv)} r={2.6} fill={p.k.yv >= 0 ? "var(--diag-pos)" : "var(--diag-neg)"} />
        ))}
      </svg>
      {placed.map((p, i) => {
        const left = p.ax === "r" ? p.x : p.ax === "l" ? p.x + p.w : p.x + p.w / 2;
        const topY = p.above ? p.y + p.h : p.y;
        return (
          <div
            key={i}
            className="pointer-events-none absolute whitespace-nowrap text-[12px] leading-none text-[var(--ink)]"
            style={{
              left: `${(left / VB_W) * 100}%`,
              top: `${(topY / height) * 100}%`,
              transform: `translate(${p.ax === "r" ? "0" : p.ax === "l" ? "-100%" : "-50%"}, ${p.above ? "-100%" : "0"})`,
              textShadow: "0 0 3px var(--card), 0 0 3px var(--card)",
            }}
            dangerouslySetInnerHTML={{ __html: kt(p.k.tex.replace(/\\dfrac/g, "\\tfrac")) }}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                         Bloc poutre littérale                        */
/* ------------------------------------------------------------------ */
export const LitBeamBlock = memo(function LitBeamBlock({ lit, model, show, title }: { lit: LitBeam; model: BeamModel; show: BeamShow; title?: string }) {
  const an = useMemo(() => analyzeBeam(model), [model]);
  const reacts = useMemo(() => litReactions(lit), [lit]);
  const st = useMemo(() => {
    const r = parseBeam(lit);
    return r.ok ? solveStatics(r.p) : null;
  }, [lit]);
  const keys = useMemo(() => ({ N: show.N ? litKeyValues(lit, "N") : [], T: show.T ? litKeyValues(lit, "T") : [], M: show.M ? litKeyValues(lit, "M") : [] }), [lit, show.N, show.T, show.M]);
  const L = model.length;
  return (
    <div className="text-[var(--ink)]">
      {title && <div className="px-1 pb-1 text-[15px] font-semibold">{title}</div>}
      {show.schema && <LitBeamSchema lit={lit} model={model} reactions={show.reactions} />}
      {show.reactions && st && !st.ok && <div className="px-2 pb-1 text-[12.5px] text-[var(--diag-neg)]">{st.reason}</div>}
      {show.reactions && reacts.length > 0 && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 px-2 pb-1.5 text-[13px]" style={{ color: "var(--reaction)" }}>
          {reacts
            .filter((r) => r.tex !== "0" || !r.sym.startsWith("H"))
            .map((r) => (
              <span key={r.sym} dangerouslySetInnerHTML={{ __html: kt(`${tex(Ex.s(r.sym))} = ${r.tex}`) }} />
            ))}
        </div>
      )}
      {an.result.ok && (
        <>
          {show.N && <LitPlot points={an.points.map((p) => ({ x: p.x, y: p.N }))} L={L} title="N(x)" keys={keys.N} height={140} />}
          {show.T && <LitPlot points={an.points.map((p) => ({ x: p.x, y: -p.V }))} L={L} title="T(x)" keys={keys.T} height={160} />}
          {show.M && <LitPlot points={an.points.map((p) => ({ x: p.x, y: p.M }))} L={L} title="M(x)" keys={keys.M} height={172} />}
          {show.deformee && <LitPlot points={an.points.map((p) => ({ x: p.x, y: p.v }))} L={L} title="Déformée (allure)" keys={[]} height={110} color="var(--deformed)" />}
        </>
      )}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*                        Coupure littérale                             */
/* ------------------------------------------------------------------ */
export const LitCutBlock = memo(function LitCutBlock({ lit, model, seg }: { lit: LitBeam; model: BeamModel; seg: number }) {
  const data = useMemo(() => {
    const r = parseBeam(lit);
    if (!r.ok) return null;
    const st = solveStatics(r.p);
    if (!st.ok) return { reason: st.reason };
    return { cuts: litCuts(r.p, st), p: r.p };
  }, [lit]);
  if (!data || !("cuts" in data) || !data.cuts) return <div className="p-2 text-[13px] text-[var(--muted-foreground)]">{data && "reason" in data ? data.reason : "Coupure indisponible."}</div>;
  const c = data.cuts[seg];
  if (!c) return <div className="p-2 text-[13px] text-[var(--muted-foreground)]">Tronçon introuvable (poutre modifiée).</div>;
  const xc = c.x0v + 0.62 * (c.x1v - c.x0v);
  const { px } = xScale(model.length);
  const X = px(xc);
  const yB = 112;
  const cut = "var(--primary)";
  return (
    <div className="text-[var(--ink)]">
      <div className="px-1 text-[14px] font-semibold">
        Coupure — tronçon {seg + 1} : <Tex>{`${tex(c.x0)} < x < ${tex(c.x1)}`}</Tex> <span className="font-normal text-[var(--muted-foreground)]">(partie gauche isolée)</span>
      </div>
      <div className="relative">
        <LitBeamSchema lit={lit} model={model} cutAt={xc} />
        <svg viewBox={`0 0 ${VB_W} 200`} className="pointer-events-none absolute inset-0 block w-full" aria-hidden>
          <line x1={X} y1={yB - 15} x2={X} y2={yB + 15} stroke="var(--ink)" strokeWidth={2} />
          <Arrow x1={X + 4} y1={yB} x2={X + 56} y2={yB} color={cut} />
          <Arrow x1={X} y1={yB - 8} x2={X} y2={yB - 58} color={cut} />
          <Arc cx={X} cy={yB} r={30} ccw color={cut} />
          <LabelText x={X + 61} y={yB} anchor="start" text="N(x)" size={14} color={cut} />
          <LabelText x={X + 7} y={yB - 58} anchor="start" text="T(x)" size={14} color={cut} />
          <LabelText x={X + 30} y={yB + 34} anchor="start" text="M(x)" size={14} color={cut} />
          <line x1={px(0)} y1={yB + 76} x2={X} y2={yB + 76} stroke="var(--ink)" strokeWidth={0.9} />
          <line x1={px(0)} y1={yB + 70} x2={px(0)} y2={yB + 82} stroke="var(--ink)" strokeWidth={0.9} />
          <line x1={X} y1={yB + 70} x2={X} y2={yB + 82} stroke="var(--ink)" strokeWidth={0.9} />
          <LabelText x={(px(0) + X) / 2} y={yB + 66} text="x" size={14} color="var(--ink)" />
        </svg>
      </div>
      <div className="space-y-0.5 px-1 text-[13px]">
        <Tex display>{c.eqN === "N(x) = 0" ? "\\Sigma F_x = 0 :\\; N(x) = 0" : `\\Sigma F_x = 0 :\\; ${c.eqN} \\;\\Rightarrow\\; N(x) = ${texInX(c.N)}`}</Tex>
        <Tex display>{`\\Sigma F_y = 0 :\\; ${c.eqT} \\;\\Rightarrow\\; T(x) = ${texInX(c.T)}`}</Tex>
        <Tex display>{`\\Sigma M_{/G} = 0 :\\; ${c.eqM}`}</Tex>
        <Tex display>{`\\Rightarrow\\; M(x) = ${texInX(c.M)}`}</Tex>
        <div className="pt-0.5 text-[12px] text-[var(--muted-foreground)]">
          <Tex>{`M(${tex(c.x0)}) = ${tex(c.M.subst("x", c.x0))}`}</Tex> ; <Tex>{`M(${tex(c.x1)}) = ${tex(c.M.subst("x", c.x1))}`}</Tex>
        </div>
      </div>
    </div>
  );
});
