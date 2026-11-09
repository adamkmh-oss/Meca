"use client";
/**
 * Dessin d'une structure plane quelconque (portique, treillis) avec ses
 * diagrammes N, T, M tracés selon le y local de chaque barre, sa déformée et,
 * pour les treillis, les efforts dans les barres.
 */
import { useMemo } from "react";
import type { AnalysisSuccess, Structure } from "@/lib/mechanics/types";
import { fmt } from "@/lib/mechanics/format";
import { Arrow } from "./beam-svg";
import { cn } from "@/lib/utils";

export type StructureMode = "none" | "N" | "T" | "M" | "deformee" | "efforts";

const W = 820;

/** Valeur dans la convention du cours : T = −(Σ forces à gauche selon y). */
export function courseValue(f: { N: number; V: number; M: number }, q: "N" | "T" | "M") {
  return q === "N" ? f.N : q === "T" ? -f.V : f.M;
}

export function StructureView({
  structure,
  result,
  mode = "none",
  showLoads = true,
  showReactions = false,
  nodeLabels = true,
  className,
  height,
}: {
  structure: Structure;
  result?: AnalysisSuccess | null;
  mode?: StructureMode;
  showLoads?: boolean;
  showReactions?: boolean;
  nodeLabels?: boolean;
  className?: string;
  height?: number;
}) {
  const geom = useMemo(() => {
    const xs = structure.nodes.map((n) => n.x);
    const ys = structure.nodes.map((n) => n.y);
    const xmin = Math.min(...xs);
    const xmax = Math.max(...xs);
    const ymin = Math.min(...ys);
    const ymax = Math.max(...ys);
    const dx = Math.max(xmax - xmin, 1e-6);
    const dy = Math.max(ymax - ymin, 1e-6);
    const m = 92;
    const Hc = height ?? Math.min(560, Math.max(300, ((W - 2 * m) * dy) / dx + 2 * m));
    const s = Math.min((W - 2 * m) / dx, (Hc - 2 * m) / (dy || 1));
    const ox = (W - dx * s) / 2;
    const oy = (Hc - dy * s) / 2;
    const P = (x: number, y: number) => ({ X: ox + (x - xmin) * s, Y: Hc - oy - (y - ymin) * s });
    return { P, s, H: Hc, size: Math.max(dx, dy) };
  }, [structure, height]);
  const { P, H } = geom;
  const node = (id: string) => structure.nodes.find((n) => n.id === id)!;

  /* ------------------------------ diagrammes ------------------------------ */
  const diagram = useMemo(() => {
    if (!result || (mode !== "N" && mode !== "T" && mode !== "M")) return null;
    let maxAbs = 0;
    for (const m of structure.members) {
      for (const st of result.members[m.id].stations) maxAbs = Math.max(maxAbs, Math.abs(courseValue(st, mode)));
    }
    const k = maxAbs > 1e-9 ? 62 / maxAbs : 0;
    const shapes: React.ReactNode[] = [];
    const labels: { X: number; Y: number; v: number }[] = [];
    for (const m of structure.members) {
      const mr = result.members[m.id];
      const ni = node(m.i);
      const { c, s } = mr;
      const base = (x: number) => P(ni.x + c * x, ni.y + s * x);
      // décalage selon +y local (−s, c) ; en écran Y est inversé
      const off = (x: number, v: number) => {
        const b = base(x);
        return { X: b.X + -s * v * k, Y: b.Y - c * v * k };
      };
      const st = mr.stations;
      for (let q = 0; q < st.length - 1; q++) {
        const a = st[q];
        const b = st[q + 1];
        const va = courseValue(a, mode);
        const vb = courseValue(b, mode);
        const quad = (x0: number, v0: number, x1: number, v1: number, key: string) => {
          const sign = (v0 + v1) / 2 >= 0;
          const p0 = base(x0);
          const p1 = base(x1);
          const o0 = off(x0, v0);
          const o1 = off(x1, v1);
          shapes.push(
            <polygon
              key={`${m.id}-${key}`}
              points={`${p0.X},${p0.Y} ${o0.X},${o0.Y} ${o1.X},${o1.Y} ${p1.X},${p1.Y}`}
              fill={sign ? "var(--diag-pos-fill)" : "var(--diag-neg-fill)"}
              stroke="none"
            />,
          );
        };
        if (va * vb < 0) {
          const xz = a.x + ((b.x - a.x) * va) / (va - vb);
          quad(a.x, va, xz, 0, `${q}a`);
          quad(xz, 0, b.x, vb, `${q}b`);
        } else quad(a.x, va, b.x, vb, `${q}`);
      }
      const outline = st.map((p) => {
        const o = off(p.x, courseValue(p, mode));
        return `${o.X},${o.Y}`;
      });
      const b0 = base(0);
      const b1 = base(mr.L);
      shapes.push(
        <polyline key={`${m.id}-ol`} points={[`${b0.X},${b0.Y}`, ...outline, `${b1.X},${b1.Y}`].join(" ")} fill="none" stroke="var(--ink)" strokeWidth={1} opacity={0.75} />,
      );
      // étiquettes : extrémités et extremum intérieur
      const ends = [st[0], st[st.length - 1]];
      let ext = st[0];
      for (const p of st) if (Math.abs(courseValue(p, mode)) > Math.abs(courseValue(ext, mode))) ext = p;
      for (const p of [...ends, ext]) {
        const v = courseValue(p, mode);
        if (Math.abs(v) < 1e-6 * maxAbs || maxAbs < 1e-9) continue;
        const o = off(p.x, v);
        const nudge = off(p.x, v * 1.0 + Math.sign(v) * (14 / (k || 1)));
        if (labels.some((l) => Math.hypot(l.X - nudge.X, l.Y - nudge.Y) < 26)) continue;
        labels.push({ X: nudge.X, Y: nudge.Y, v });
        void o;
      }
    }
    return { shapes, labels };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, mode, structure, P]);

  /* ------------------------------- déformée ------------------------------- */
  const deformed = useMemo(() => {
    if (!result || mode !== "deformee") return null;
    let maxD = 0;
    for (const m of structure.members) for (const st of result.members[m.id].stations) maxD = Math.max(maxD, Math.hypot(st.u, st.v));
    if (maxD < 1e-12) return { paths: [] as string[], amp: 0, maxD };
    const amp = (0.09 * geom.size) / maxD;
    const paths = structure.members.map((m) => {
      const mr = result.members[m.id];
      const ni = node(m.i);
      const { c, s } = mr;
      return mr.stations
        .map((st) => {
          const gx = ni.x + c * st.x + amp * (c * st.u - s * st.v);
          const gy = ni.y + s * st.x + amp * (s * st.u + c * st.v);
          const p = P(gx, gy);
          return `${p.X},${p.Y}`;
        })
        .join(" ");
    });
    return { paths, amp, maxD };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, mode, structure, P, geom.size]);

  /* ---------------------------- efforts treillis ---------------------------- */
  const forces = result && mode === "efforts" ? structure.members.map((m) => ({ id: m.id, N: result.members[m.id].forcesAt(result.members[m.id].L / 2).N })) : null;
  const maxN = forces ? Math.max(1e-9, ...forces.map((f) => Math.abs(f.N))) : 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("w-full text-ink", className)} role="img" aria-label="Schéma de la structure">
      {/* diagrammes sous les barres */}
      {diagram?.shapes}
      {/* barres */}
      {structure.members.map((m) => {
        const a = P(node(m.i).x, node(m.i).y);
        const b = P(node(m.j).x, node(m.j).y);
        let stroke = "currentColor";
        let width = mode === "efforts" ? 3.2 : 4.2;
        let opacity = mode === "deformee" ? 0.35 : 1;
        const f = forces?.find((x) => x.id === m.id);
        if (f) {
          const mag = Math.abs(f.N) / maxN;
          stroke = Math.abs(f.N) < 1e-6 * maxN ? "var(--muted-foreground)" : f.N > 0 ? "var(--diag-pos)" : "var(--diag-neg)";
          width = 2 + 4 * mag;
          opacity = 1;
        }
        return <line key={m.id} x1={a.X} y1={a.Y} x2={b.X} y2={b.Y} stroke={stroke} strokeWidth={width} strokeLinecap="round" opacity={opacity} />;
      })}
      {/* rotules d'extrémité */}
      {structure.members.flatMap((m) => {
        const out = [];
        const len = Math.hypot(node(m.j).x - node(m.i).x, node(m.j).y - node(m.i).y);
        const d = Math.min(0.06 * len, 0.25);
        const cx = (node(m.j).x - node(m.i).x) / len;
        const cy = (node(m.j).y - node(m.i).y) / len;
        const isTruss = m.releaseI && m.releaseJ;
        if (m.releaseI && !isTruss) {
          const p = P(node(m.i).x + cx * d, node(m.i).y + cy * d);
          out.push(<circle key={`${m.id}i`} cx={p.X} cy={p.Y} r={5} fill="var(--card)" stroke="currentColor" strokeWidth={1.6} />);
        }
        if (m.releaseJ && !isTruss) {
          const p = P(node(m.j).x - cx * d, node(m.j).y - cy * d);
          out.push(<circle key={`${m.id}j`} cx={p.X} cy={p.Y} r={5} fill="var(--card)" stroke="currentColor" strokeWidth={1.6} />);
        }
        return out;
      })}
      {/* nœuds de treillis */}
      {structure.members.every((m) => m.releaseI && m.releaseJ) &&
        structure.nodes.map((n) => {
          const p = P(n.x, n.y);
          return <circle key={n.id} cx={p.X} cy={p.Y} r={3.6} fill="var(--card)" stroke="currentColor" strokeWidth={1.4} />;
        })}
      {/* déformée */}
      {deformed?.paths.map((d, k) => (
        <polyline key={k} points={d} fill="none" stroke="var(--deformed)" strokeWidth={2.4} strokeLinejoin="round" />
      ))}
      {/* appuis */}
      {structure.nodes
        .filter((n) => n.support && n.support !== "free")
        .map((n) => {
          const p = P(n.x, n.y);
          if (n.support === "fixed") {
            return (
              <g key={n.id}>
                <line x1={p.X - 20} y1={p.Y + 2} x2={p.X + 20} y2={p.Y + 2} stroke="currentColor" strokeWidth={3} />
                {Array.from({ length: 6 }, (_, k) => (
                  <line key={k} x1={p.X - 18 + k * 7} y1={p.Y + 3} x2={p.X - 24 + k * 7} y2={p.Y + 11} stroke="currentColor" strokeWidth={1} opacity={0.6} />
                ))}
              </g>
            );
          }
          const base = p.Y + 22;
          return (
            <g key={n.id}>
              <path d={`M${p.X} ${p.Y + 2} L${p.X - 12} ${base} L${p.X + 12} ${base} Z`} fill="var(--card)" stroke="currentColor" strokeWidth={1.5} />
              {n.support === "roller" && (
                <>
                  <circle cx={p.X - 6} cy={base + 4} r={3.6} fill="var(--card)" stroke="currentColor" strokeWidth={1.2} />
                  <circle cx={p.X + 6} cy={base + 4} r={3.6} fill="var(--card)" stroke="currentColor" strokeWidth={1.2} />
                </>
              )}
              <line x1={p.X - 17} y1={base + (n.support === "roller" ? 8 : 0)} x2={p.X + 17} y2={base + (n.support === "roller" ? 8 : 0)} stroke="currentColor" strokeWidth={1.4} />
            </g>
          );
        })}
      {/* charges */}
      {showLoads &&
        structure.loads.map((ld, k) => {
          if (ld.kind === "nodal") {
            const n = node(ld.node);
            const p = P(n.x, n.y);
            const mag = Math.hypot(ld.fx, ld.fy);
            if (mag < 1e-9) return null;
            const ux = ld.fx / mag;
            const uy = ld.fy / mag;
            const len = 52;
            const tail = { X: p.X - ux * len, Y: p.Y + uy * len };
            const tip = { X: p.X - ux * 5, Y: p.Y + uy * 5 };
            return (
              <g key={k}>
                <Arrow x1={tail.X} y1={tail.Y} x2={tip.X} y2={tip.Y} />
                <text x={tail.X + (ux > 0.5 ? -4 : 4)} y={tail.Y - 6} textAnchor={ux > 0.5 ? "end" : "middle"} fontSize={12} fontWeight={600} fill="var(--load)">
                  {fmt(mag, 1)} kN
                </text>
              </g>
            );
          }
          if (ld.kind === "dist" && ld.dir === "gy") {
            const m = structure.members.find((x) => x.id === ld.member)!;
            const ni = node(m.i);
            const nj = node(m.j);
            const L = Math.hypot(nj.x - ni.x, nj.y - ni.y);
            const c = (nj.x - ni.x) / L;
            const s = (nj.y - ni.y) / L;
            const n = 9;
            const arrows = [];
            const pts: string[] = [];
            for (let q = 0; q <= n; q++) {
              const t = ld.a + ((ld.b - ld.a) * q) / n;
              const p = P(ni.x + c * t, ni.y + s * t);
              const qq = ld.q1 + ((ld.q2 - ld.q1) * q) / n;
              const h = 30 * Math.sign(-qq || 1);
              arrows.push(<Arrow key={q} x1={p.X} y1={p.Y - h - 4} x2={p.X} y2={p.Y - 4} width={1.2} head={6} />);
              pts.push(`${p.X},${p.Y - h - 4}`);
            }
            const mid = P(ni.x + c * (ld.a + ld.b) / 2, ni.y + s * (ld.a + ld.b) / 2);
            return (
              <g key={k}>
                <polyline points={pts.join(" ")} fill="none" stroke="var(--load)" strokeWidth={1.3} />
                {arrows}
                <text x={mid.X} y={mid.Y - 42} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--load)">
                  {fmt(Math.abs(ld.q1), 1)} kN/m
                </text>
              </g>
            );
          }
          if (ld.kind === "point") {
            const m = structure.members.find((x) => x.id === ld.member)!;
            const ni = node(m.i);
            const nj = node(m.j);
            const L = Math.hypot(nj.x - ni.x, nj.y - ni.y);
            const p = P(ni.x + ((nj.x - ni.x) * ld.a) / L, ni.y + ((nj.y - ni.y) * ld.a) / L);
            const mag = Math.hypot(ld.fx, ld.fy);
            const ux = ld.fx / mag;
            const uy = ld.fy / mag;
            return (
              <g key={k}>
                <Arrow x1={p.X - ux * 52} y1={p.Y + uy * 52} x2={p.X - ux * 5} y2={p.Y + uy * 5} />
                <text x={p.X + 6} y={p.Y + uy * 52 - 6} fontSize={12} fontWeight={600} fill="var(--load)">
                  {fmt(mag, 1)} kN
                </text>
              </g>
            );
          }
          return null;
        })}
      {/* réactions */}
      {showReactions &&
        result &&
        Object.entries(result.reactions).map(([id, r]) => {
          const n = node(id);
          const p = P(n.x, n.y);
          const out = [];
          if (Math.abs(r.ry) > 1e-6) {
            const up = r.ry > 0;
            out.push(<Arrow key="y" x1={p.X + 24} y1={p.Y + (up ? 64 : 14)} x2={p.X + 24} y2={p.Y + (up ? 14 : 64)} color="var(--reaction)" width={2} head={8} />);
            out.push(
              <text key="ty" x={p.X + 30} y={p.Y + 46} fontSize={12} fontWeight={600} fill="var(--reaction)">
                {fmt(Math.abs(r.ry), 2)} kN
              </text>,
            );
          }
          if (Math.abs(r.rx) > 1e-6) {
            const right = r.rx > 0;
            out.push(<Arrow key="x" x1={p.X + (right ? -64 : 64)} y1={p.Y + 30} x2={p.X + (right ? -12 : 12)} y2={p.Y + 30} color="var(--reaction)" width={2} head={8} />);
            out.push(
              <text key="tx" x={p.X + (right ? -64 : 14)} y={p.Y + 46} fontSize={12} fontWeight={600} fill="var(--reaction)">
                {fmt(Math.abs(r.rx), 2)} kN
              </text>,
            );
          }
          if (Math.abs(r.mz) > 1e-6) {
            out.push(
              <text key="tm" x={p.X - 28} y={p.Y + 46} textAnchor="end" fontSize={12} fontWeight={600} fill="var(--reaction)">
                M = {fmt(Math.abs(r.mz), 2)} kN·m {r.mz > 0 ? "↺" : "↻"}
              </text>,
            );
          }
          return <g key={id}>{out}</g>;
        })}
      {/* étiquettes des diagrammes */}
      {diagram?.labels.map((l, k) => (
        <text key={k} x={l.X} y={l.Y + 4} textAnchor="middle" fontSize={11.5} fontWeight={600} fill="currentColor" paintOrder="stroke" stroke="var(--card)" strokeWidth={3}>
          {fmt(l.v, 2)}
        </text>
      ))}
      {/* efforts dans les barres de treillis */}
      {forces?.map((f) => {
        const m = structure.members.find((x) => x.id === f.id)!;
        const a = P(node(m.i).x, node(m.i).y);
        const b = P(node(m.j).x, node(m.j).y);
        return (
          <text
            key={f.id}
            x={(a.X + b.X) / 2}
            y={(a.Y + b.Y) / 2 + 4}
            textAnchor="middle"
            fontSize={11}
            fontWeight={600}
            fill="currentColor"
            paintOrder="stroke"
            stroke="var(--card)"
            strokeWidth={4}
          >
            {fmt(f.N, 1)}
          </text>
        );
      })}
      {/* noms des nœuds */}
      {nodeLabels &&
        structure.nodes.map((n) => {
          const p = P(n.x, n.y);
          return (
            <text key={n.id} x={p.X - 8} y={p.Y - 8} textAnchor="end" fontSize={11} fontStyle="italic" className="fill-muted-foreground">
              {n.id}
            </text>
          );
        })}
      {deformed && deformed.amp > 0 && (
        <text x={W - 12} y={H - 10} textAnchor="end" fontSize={11} className="fill-muted-foreground">
          déformée amplifiée × {fmt(deformed.amp, 0)}
        </text>
      )}
    </svg>
  );
}
