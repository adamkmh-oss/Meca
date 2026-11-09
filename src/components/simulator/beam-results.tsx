"use client";
/**
 * Affichage des résultats d'une poutre : diagrammes N, T, M, déformée,
 * réactions, valeurs remarquables et calculs détaillés.
 * Convention du cours : T = −(Σ forces à gauche), dM/dx = −T ; valeurs
 * positives reportées vers le haut.
 */
import { useMemo } from "react";
import type { BeamAnalysis } from "@/lib/mechanics/beam";
import { handCalcBeam, polyTex, segmentEquations } from "@/lib/mechanics/beam-equations";
import { fmt, tex } from "@/lib/mechanics/format";
import { BeamPlot } from "@/components/mechanics/beam-svg";
import { Md, Tex } from "@/components/math";
import { Badge, Callout } from "@/components/ui";

const SUPPORT_LABEL: Record<string, string> = {
  roller: "Appui simple",
  pin: "Articulation",
  fixed: "Encastrement",
  rollerX: "Appui simple (plan vertical)",
};

export function useBeamCourseData(an: BeamAnalysis) {
  return useMemo(() => {
    const pts = an.points;
    return {
      N: pts.map((p) => ({ x: p.x, y: p.N })),
      T: pts.map((p) => ({ x: p.x, y: -p.V })),
      M: pts.map((p) => ({ x: p.x, y: p.M })),
      v: pts.map((p) => ({ x: p.x, y: p.v * 1000 })),
    };
  }, [an]);
}

export function BeamDiagrams({ an, show = ["N", "T", "M", "v"] }: { an: BeamAnalysis; show?: ("N" | "T" | "M" | "v")[] }) {
  const d = useBeamCourseData(an);
  const L = an.model.length;
  const marks = an.built.xs;
  return (
    <div className="space-y-2">
      {show.includes("N") && <BeamPlot points={d.N} L={L} unit="kN" title="Effort normal N(x)" marks={marks} height={120} />}
      {show.includes("T") && <BeamPlot points={d.T} L={L} unit="kN" title="Effort tranchant T(x)" marks={marks} />}
      {show.includes("M") && <BeamPlot points={d.M} L={L} unit="kN·m" title="Moment fléchissant M(x)" marks={marks} />}
      {show.includes("v") && <BeamPlot points={d.v} L={L} unit="mm" title="Déformée v(x)" line color="var(--deformed)" decimals={2} height={130} />}
    </div>
  );
}

export function ReactionsTable({ an }: { an: BeamAnalysis }) {
  if (!an.result.ok) return null;
  const res = an.result;
  const rows = an.model.supports
    .slice()
    .sort((a, b) => a.x - b.x)
    .map((s) => {
      const nid = an.built.nodeIdAt(Math.min(Math.max(s.x, 0), an.model.length));
      return { s, r: nid ? res.reactions[nid] : undefined };
    });
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Appui</th>
            <th className="py-2 pr-3 font-medium">x (m)</th>
            <th className="py-2 pr-3 text-right font-medium">H (kN)</th>
            <th className="py-2 pr-3 text-right font-medium">V (kN)</th>
            <th className="py-2 text-right font-medium">M (kN·m)</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {rows.map(({ s, r }) => (
            <tr key={s.id} className="border-b border-border/60 last:border-0">
              <td className="py-2 pr-3 font-sans">
                <span className="font-semibold">{s.id}</span> <span className="text-xs text-muted-foreground">{SUPPORT_LABEL[s.type]}</span>
              </td>
              <td className="py-2 pr-3">{fmt(s.x, 2)}</td>
              <td className="py-2 pr-3 text-right">{r?.blocked.x ? fmt(r.rx, 2) : "—"}</td>
              <td className="py-2 pr-3 text-right">{r?.blocked.y ? fmt(r.ry, 2) : "—"}</td>
              <td className="py-2 text-right">{r?.blocked.rz ? fmt(r.mz, 2) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">Repère global : H positif vers la droite, V positif vers le haut, M positif dans le sens anti-horaire.</p>
    </div>
  );
}

export function KeyValues({ an, W, strength, strengthLabel, A }: { an: BeamAnalysis; W: number; A: number; strength: number; strengthLabel: string }) {
  if (!an.result.ok) return null;
  const e = an.extremes;
  const Mabs = Math.abs(e.Mmax.value) >= Math.abs(e.Mmin.value) ? e.Mmax : e.Mmin;
  const Tmax = Math.max(Math.abs(e.Vmax.value), Math.abs(e.Vmin.value));
  const Nabs = Math.abs(e.Nmax.value) >= Math.abs(e.Nmin.value) ? e.Nmax : e.Nmin;
  const fAbs = Math.abs(e.vmin.value) >= Math.abs(e.vmax.value) ? e.vmin : e.vmax;
  // contrainte normale maximale |N|/A + |M|/W sur toutes les stations
  let sigma = 0;
  for (const p of an.points) sigma = Math.max(sigma, Math.abs(p.N) / A + Math.abs(p.M) / W);
  const sigmaMPa = sigma / 1000;
  const ratio = Math.abs(fAbs.value) > 1e-12 ? an.model.length / Math.abs(fAbs.value) : Infinity;
  const items = [
    { label: "Moment maximal |M|", value: `${fmt(Math.abs(Mabs.value), 2)} kN·m`, sub: `en x = ${fmt(Mabs.x, 2)} m` },
    { label: "Tranchant maximal |T|", value: `${fmt(Tmax, 2)} kN`, sub: "valeur absolue" },
    { label: "Effort normal |N|", value: `${fmt(Math.abs(Nabs.value), 2)} kN`, sub: Nabs.value > 1e-9 ? "traction" : Nabs.value < -1e-9 ? "compression" : "nul" },
    { label: "Flèche maximale", value: `${fmt(Math.abs(fAbs.value) * 1000, 2)} mm`, sub: Number.isFinite(ratio) ? `en x = ${fmt(fAbs.x, 2)} m · L/${fmt(ratio, 0)}` : "nulle" },
    { label: "Contrainte maximale σ", value: `${fmt(sigmaMPa, 1)} MPa`, sub: strength ? `${fmt((100 * sigmaMPa) / strength, 0)} % de ${strengthLabel.replace(/_/g, "")} = ${strength} MPa` : "" },
  ];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {items.map((it) => (
          <div key={it.label} className="rounded-lg border border-border bg-card px-3 py-2.5">
            <div className="text-[11px] font-medium text-muted-foreground">{it.label}</div>
            <div className="mt-0.5 font-mono text-[15px] font-semibold">{it.value}</div>
            <div className="text-[11px] text-muted-foreground">{it.sub}</div>
          </div>
        ))}
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">
        σ = |N|/A + |M|/W : contrainte normale maximale en élasticité, comparée à titre indicatif à la résistance caractéristique du matériau (sans coefficient
        partiel ni vérification réglementaire).
      </p>
    </div>
  );
}

export function BeamCalculations({ an }: { an: BeamAnalysis }) {
  const hand = useMemo(() => handCalcBeam(an.model), [an.model]);
  const eqs = useMemo(() => segmentEquations(an), [an]);
  if (!an.result.ok) return null;
  const res = an.result;
  const h = res.hyperstaticity;

  // comparaison calcul manuel / méthode des déplacements
  const comparisons = hand.applicable
    ? hand.reactions.map((r) => {
        const nid = an.built.nodeIdAt(r.x)!;
        const rr = res.reactions[nid];
        const solver = r.component === "V" ? rr.ry : r.component === "H" ? rr.rx : rr.mz;
        return { ...r, solver, ok: Math.abs(solver - r.value) <= 1e-6 * Math.max(1, Math.abs(r.value)) };
      })
    : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant={h.classification === "isostatique" ? "success" : h.classification === "hyperstatique" ? "warning" : "danger"}>
          {h.classification} {h.degree > 0 ? `de degré ${h.degree}` : ""}
        </Badge>
        <span className="text-muted-foreground">
          <Tex>{`h = 3m - c + r - 3n = 3\\times${h.members} - ${h.releases} + ${h.reactions} - 3\\times${h.nodes} = ${h.degree}`}</Tex>
        </span>
      </div>

      {hand.applicable ? (
        <div className="space-y-4">
          {hand.steps.map((st) => (
            <div key={st.title} className="space-y-1.5">
              <h4 className="text-sm font-semibold">{st.title}</h4>
              {st.text && <Md>{st.text}</Md>}
              {st.latex.map((l, k) => (
                <Tex key={k} display>
                  {l}
                </Tex>
              ))}
            </div>
          ))}
          <Callout tone="success" title="Double calcul">
            {comparisons.every((c) => c.ok)
              ? "Les réactions obtenues par les équations de la statique sont identiques à celles du solveur matriciel (méthode des déplacements)."
              : "Écart entre le calcul manuel et le solveur : vérifiez les données."}
          </Callout>
        </div>
      ) : (
        <Callout tone="info" title="Méthode utilisée">
          {hand.reason} Les résultats sont obtenus par la méthode des déplacements (rigidité des barres, compatibilité des déplacements aux nœuds),
          puis contrôlés par l&apos;équilibre global ci-dessous.
        </Callout>
      )}

      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Équilibre global (contrôle)</h4>
        <Tex display>{`\\Sigma F_x = ${tex(res.equilibrium.sumFx, 6)}\\ \\text{kN} \\qquad \\Sigma F_y = ${tex(res.equilibrium.sumFy, 6)}\\ \\text{kN} \\qquad \\Sigma M_{/O} = ${tex(res.equilibrium.sumM, 6)}\\ \\text{kN·m}`}</Tex>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Équations des efforts internes par tronçon</h4>
        <p className="text-xs text-muted-foreground">
          Abscisse x mesurée depuis l&apos;extrémité gauche, en mètres. Convention du cours :{" "}
          <Tex>{`\\dfrac{\\mathrm{d}M}{\\mathrm{d}x} = -T(x)`}</Tex>.
        </p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Tronçon</th>
                <th className="px-3 py-2 font-medium">N(x) (kN)</th>
                <th className="px-3 py-2 font-medium">T(x) (kN)</th>
                <th className="px-3 py-2 font-medium">M(x) (kN·m)</th>
              </tr>
            </thead>
            <tbody>
              {eqs.map((s, k) => (
                <tr key={k} className="border-t border-border">
                  <td className="whitespace-nowrap px-3 py-2">
                    <Tex>{`${tex(s.x0, 2)} < x < ${tex(s.x1, 2)}`}</Tex>
                  </td>
                  <td className="px-3 py-2">
                    <Tex>{polyTex(s.N, 2)}</Tex>
                  </td>
                  <td className="px-3 py-2">
                    <Tex>{polyTex(s.V.map((c) => -c), 3)}</Tex>
                  </td>
                  <td className="px-3 py-2">
                    <Tex>{polyTex(s.M, 3)}</Tex>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
