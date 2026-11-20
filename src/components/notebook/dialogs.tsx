"use client";
/** Dialogue : éditeur de formules (LaTeX). La poutre calculée est dans beam-dialog.tsx. */
import { useMemo, useRef, useState } from "react";
import type { MathEl } from "@/lib/notebook/types";
import { Button } from "@/components/ui";
import { Modal } from "./nb-ui";
import { renderTexLines } from "./page-view";

/* ------------------------------------------------------------------ */
/*                               Formules                               */
/* ------------------------------------------------------------------ */
const PALETTE: { group: string; items: [string, string][] }[] = [
  {
    group: "Mécanique",
    items: [
      ["ΣFx", "\\Sigma F_x = 0"],
      ["ΣFy", "\\Sigma F_y = 0"],
      ["ΣM/A", "\\Sigma M_{/A} = 0"],
      ["V_A", "V_A"],
      ["H_A", "H_A"],
      ["M_A", "M_A"],
      ["N(x)", "N(x)"],
      ["T(x)", "T(x)"],
      ["M(x)", "M(x)"],
      ["dM/dx", "\\dfrac{\\mathrm{d}M}{\\mathrm{d}x} = -T"],
      ["σ = N/A", "\\sigma = \\dfrac{N}{A}"],
      ["σ flexion", "\\sigma = -\\dfrac{M\\,y}{I}"],
      ["I rect", "I = \\dfrac{b\\,h^3}{12}"],
      ["kN", "\\ \\text{kN}"],
      ["kN·m", "\\ \\text{kN·m}"],
      ["MPa", "\\ \\text{MPa}"],
    ],
  },
  {
    group: "Structure",
    items: [
      ["x²", "^{2}"],
      ["xᵢ", "_{i}"],
      ["a/b", "\\dfrac{a}{b}"],
      ["√", "\\sqrt{x}"],
      ["vecteur", "\\vec{F}"],
      ["∫", "\\int_{0}^{L}"],
      ["( )", "\\left( \\right)"],
      ["texte", "\\text{ }"],
      ["espace", "\\quad "],
      ["système", "\\begin{cases} a \\\\ b \\end{cases}"],
      ["matrice", "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}"],
      ["encadré", "\\boxed{}"],
    ],
  },
  {
    group: "Symboles",
    items: [
      ["⇒", "\\Rightarrow "],
      ["⇔", "\\Leftrightarrow "],
      ["≈", "\\approx "],
      ["≤", "\\le "],
      ["≥", "\\ge "],
      ["×", "\\times "],
      ["·", "\\cdot "],
      ["±", "\\pm "],
      ["≠", "\\neq "],
      ["∞", "\\infty "],
      ["✓", "\\checkmark "],
      ["°", "^{\\circ}"],
    ],
  },
  {
    group: "Grec",
    items: ["alpha", "beta", "gamma", "delta", "theta", "lambda", "mu", "nu", "pi", "rho", "sigma", "tau", "varphi", "omega", "varepsilon", "Delta", "Sigma", "Omega"].map((g) => [
      katexGreek(g),
      `\\${g} `,
    ]) as [string, string][],
  },
];

function katexGreek(name: string): string {
  const map: Record<string, string> = {
    alpha: "α",
    beta: "β",
    gamma: "γ",
    delta: "δ",
    theta: "θ",
    lambda: "λ",
    mu: "μ",
    nu: "ν",
    pi: "π",
    rho: "ρ",
    sigma: "σ",
    tau: "τ",
    varphi: "φ",
    omega: "ω",
    varepsilon: "ε",
    Delta: "Δ",
    Sigma: "Σ",
    Omega: "Ω",
  };
  return map[name] ?? name;
}

export function MathDialog({ initial, onSave, onCancel }: { initial?: MathEl; onSave: (p: { tex: string; size: number; boxed?: boolean }) => void; onCancel: () => void }) {
  const [tex, setTex] = useState(initial?.tex ?? "");
  const [size, setSize] = useState(initial?.size ?? 18);
  const [boxed, setBoxed] = useState(!!initial?.boxed);
  const ref = useRef<HTMLTextAreaElement>(null);
  const insert = (snippet: string) => {
    const t = ref.current;
    if (!t) return setTex((v) => v + snippet);
    const a = t.selectionStart;
    const b = t.selectionEnd;
    const next = tex.slice(0, a) + snippet + tex.slice(b);
    setTex(next);
    requestAnimationFrame(() => {
      t.focus();
      const pos = a + snippet.length;
      t.setSelectionRange(pos, pos);
    });
  };
  const html = useMemo(() => renderTexLines(tex), [tex]);
  return (
    <Modal
      title={initial ? "Modifier la formule" : "Nouvelle formule"}
      onClose={onCancel}
      wide
      footer={
        <>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button onClick={() => onSave({ tex, size, boxed: boxed || undefined })}>{initial ? (tex.trim() ? "Enregistrer" : "Supprimer") : "Insérer"}</Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <div className="space-y-2">
          <textarea
            ref={ref}
            value={tex}
            onChange={(e) => setTex(e.target.value)}
            rows={6}
            autoFocus
            spellCheck={false}
            placeholder={"\\Sigma M_{/A} = 0 :\\; V_B \\times 6 - 20 \\times 2 = 0\nV_B = 6{,}67\\ \\text{kN}"}
            className="w-full rounded-lg border border-input bg-background p-2.5 font-mono text-[13px] outline-none focus:ring-2 focus:ring-primary/40"
          />
          <p className="text-xs text-muted-foreground">Une équation par ligne. Virgule décimale : écrire <code>{"6{,}67"}</code>.</p>
          <div className="flex flex-wrap items-center gap-3 text-[13px]">
            <label className="flex items-center gap-2">
              Taille
              <input type="range" min={11} max={40} value={size} onChange={(e) => setSize(Number(e.target.value))} />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={boxed} onChange={(e) => setBoxed(e.target.checked)} /> Encadré
            </label>
          </div>
          <div className="min-h-24 overflow-x-auto rounded-lg border border-dashed border-border bg-white p-3 text-[#0f1a35]" style={{ fontSize: size }} dangerouslySetInnerHTML={{ __html: html || "<span style='opacity:.4;font-size:14px'>Aperçu</span>" }} />
        </div>
        <div className="space-y-2.5">
          {PALETTE.map((g) => (
            <div key={g.group}>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.group}</div>
              <div className="flex flex-wrap gap-1">
                {g.items.map(([label, snip]) => (
                  <button key={label + snip} type="button" onClick={() => insert(snip)} className="h-8 cursor-pointer rounded-md border border-border px-2 text-[12.5px] hover:border-primary hover:bg-primary-soft" title={snip}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

