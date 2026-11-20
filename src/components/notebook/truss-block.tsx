"use client";
/** Treillis calculé dans la page : barres colorées (traction / compression), efforts, réactions. */
import { memo, useMemo } from "react";
import { StructureView } from "@/components/mechanics/structure-svg";
import { analyzeTruss, barName } from "@/lib/notebook/truss";
import { txtn } from "@/lib/notebook/beam-notes";
import type { TrussEl } from "@/lib/notebook/types";
import katex from "katex";
import { parseTruss, solveLitTruss, type LitTruss } from "@/lib/notebook/literal-truss";
import { Ex, plain, tex } from "@/lib/notebook/symbolic";

export const TrussBlock = memo(function TrussBlock({ el }: { el: TrussEl }) {
  if (el.lit) return <LitTrussBlock el={el} lit={el.lit} />;
  return <NumTrussBlock el={el} />;
});

/** Treillis en lettres : efforts et charges écrits littéralement sur le dessin. */
const LitTrussBlock = memo(function LitTrussBlock({ el, lit }: { el: TrussEl; lit: LitTruss }) {
  const an = useMemo(() => analyzeTruss(el.model), [el.model]);
  const sol = useMemo(() => {
    const r = parseTruss(lit);
    return r.ok ? { p: r.p, s: solveLitTruss(r.p) } : null;
  }, [lit]);
  const memberText = (id: string) => {
    const b = lit.bars.find((x) => x.id === id);
    const v = sol?.s.N.get(id);
    if (!b) return "";
    if (!v) return barName(b);
    const t = plain(v);
    return t.length <= 16 ? t : barName(b);
  };
  return (
    <div className="text-[var(--ink)]">
      {el.title && <div className="px-1 pb-1 text-[15px] font-semibold">{el.title}</div>}
      <StructureView
        structure={an.structure}
        result={an.result.ok ? an.result : null}
        mode={an.result.ok && el.show.efforts ? "efforts" : "none"}
        showReactions={an.result.ok && el.show.reactions}
        nodeLabels={el.show.labels}
        memberText={memberText}
        loadText={(k) => {
          const l = sol?.p.loads.filter((x) => !(x.fx.isZero() && x.fy.isZero()))[k];
          return l ? plain(l.F) : "";
        }}
        reactionText={(node, comp) => `${comp}_${node}`}
        className="block"
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 px-2 pb-1 text-[12.5px]">
        {an.result.ok && el.show.efforts && (
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-1 w-5 rounded" style={{ background: "var(--diag-pos)" }} /> traction
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-1 w-5 rounded" style={{ background: "var(--diag-neg)" }} /> compression
            </span>
          </>
        )}
        {sol?.p.angles.map((g) => (
          <span key={g.name} dangerouslySetInnerHTML={{ __html: katex.renderToString(`\\tan ${tex(Ex.s(g.name))} = ${g.tanTex}`, { throwOnError: false }) }} />
        ))}
        {sol && !sol.s.ok && <span className="text-[var(--diag-neg)]">{sol.s.reason}</span>}
      </div>
    </div>
  );
});

const NumTrussBlock = memo(function NumTrussBlock({ el }: { el: TrussEl }) {
  const an = useMemo(() => analyzeTruss(el.model), [el.model]);
  const ext = useMemo(() => {
    let t: { id: string; N: number } | null = null;
    let c: { id: string; N: number } | null = null;
    for (const b of el.model.bars) {
      const N = an.N[b.id];
      if (N === undefined) continue;
      if (!t || N > t.N) t = { id: barName(b), N };
      if (!c || N < c.N) c = { id: barName(b), N };
    }
    return { t, c };
  }, [an, el.model.bars]);
  return (
    <div className="text-[var(--ink)]">
      {el.title && <div className="px-1 pb-1 text-[15px] font-semibold">{el.title}</div>}
      <StructureView
        structure={an.structure}
        result={an.result.ok ? an.result : null}
        mode={an.result.ok && el.show.efforts ? "efforts" : "none"}
        showReactions={an.result.ok && el.show.reactions}
        nodeLabels={el.show.labels}
        className="block"
      />
      {an.result.ok ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 px-2 pb-1 text-[12.5px]">
          {el.show.efforts && (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-1 w-5 rounded" style={{ background: "var(--diag-pos)" }} /> traction (N &gt; 0)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-1 w-5 rounded" style={{ background: "var(--diag-neg)" }} /> compression (N &lt; 0)
              </span>
            </>
          )}
          {ext.t && ext.t.N > 1e-9 && (
            <span>
              Traction max : <b>{ext.t.id}</b> = {txtn(ext.t.N, 2)} kN
            </span>
          )}
          {ext.c && ext.c.N < -1e-9 && (
            <span>
              Compression max : <b>{ext.c.id}</b> = {txtn(ext.c.N, 2)} kN
            </span>
          )}
          <span className="text-[var(--muted-foreground)]">
            b + r − 2n = {an.degree} ({an.degree === 0 ? "isostatique" : an.degree > 0 ? "hyperstatique" : "mécanisme"})
          </span>
        </div>
      ) : (
        <div className="px-2 pb-1 text-[12.5px] text-[var(--diag-neg)]">Calcul impossible : {an.error}</div>
      )}
    </div>
  );
});
