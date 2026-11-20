"use client";
/** Panneaux de l'éditeur : pages, bibliothèque mécanique, barre de sélection, propriétés. */
import { memo, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronDown,
  ChevronUp,
  Copy,
  Files,
  Group,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  RotateCw,
  Scissors,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import katex from "katex";
import { SNIPPETS, SNIPPET_CATEGORIES } from "@/lib/notebook/formulas";
import { PEN_COLORS } from "@/lib/notebook/paper";
import { SYMBOLS, SYMBOL_CATEGORIES, symbolDef } from "@/lib/notebook/symbols";
import type { NoteElement, Page } from "@/lib/notebook/types";
import { BEAM_PRESETS } from "@/components/simulator/beam-presets";
import { cn } from "@/lib/utils";
import { ColorDot, MenuItem, Popover, Segmented, ToolButton } from "./nb-ui";
import { PageThumb } from "./page-view";
import { PaperChooser } from "./toolbar";
import { SymbolPreview } from "./symbol-art";

/* ------------------------------------------------------------------ */
/*                              Pages                                   */
/* ------------------------------------------------------------------ */
export interface PageActions {
  add: (after: number, template?: Partial<Page>) => void;
  duplicate: (i: number) => void;
  remove: (i: number) => void;
  move: (i: number, dir: -1 | 1) => void;
  update: (i: number, patch: Partial<Page>, all?: boolean) => void;
  goTo: (i: number) => void;
}

export function PagesSidebar({ pages, current, actions, onClose }: { pages: Page[]; current: number; actions: PageActions; onClose: () => void }) {
  return (
    <aside className="absolute inset-y-0 left-0 z-30 flex w-[188px] flex-col border-r border-border bg-card shadow-lg sm:static sm:shadow-none" aria-label="Pages du cahier">
      <div className="flex h-10 items-center justify-between border-b border-border px-3 text-[13px] font-semibold">
        Pages ({pages.length})
        <button type="button" onClick={onClose} className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md hover:bg-muted sm:hidden" aria-label="Fermer">
          <X className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {pages.map((p, i) => (
          <PageItem key={p.id} page={p} index={i} current={i === current} count={pages.length} actions={actions} />
        ))}
      </div>
      <div className="border-t border-border p-2">
        <Popover
          className="bottom-full top-auto mb-1.5 w-[17rem]"
          trigger={({ toggle }) => (
            <button type="button" onClick={toggle} className="flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary text-[13px] font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="size-4" /> Nouvelle page
            </button>
          )}
        >
          {(close) => (
            <div className="p-1">
              <PaperChooser
                value={pages[current]?.paper ?? "carreaux"}
                onChange={(k) => {
                  actions.add(current, { paper: k });
                  close();
                }}
              />
            </div>
          )}
        </Popover>
      </div>
    </aside>
  );
}

const PageItem = memo(function PageItem({ page, index, current, count, actions }: { page: Page; index: number; current: boolean; count: number; actions: PageActions }) {
  return (
    <div className="group">
      <button
        type="button"
        onClick={() => actions.goTo(index)}
        className={cn("block w-full cursor-pointer overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-black/10 transition", current && "ring-2 ring-primary")}
        aria-label={`Aller à la page ${index + 1}`}
        aria-current={current ? "page" : undefined}
      >
        <PageThumb page={page} />
      </button>
      <div className="mt-1 flex items-center gap-1">
        <span className={cn("text-xs tabular-nums", current ? "font-semibold text-primary" : "text-muted-foreground")}>{index + 1}</span>
        <input
          defaultValue={page.title ?? ""}
          placeholder="Titre"
          onBlur={(e) => e.target.value !== (page.title ?? "") && actions.update(index, { title: e.target.value || undefined })}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="h-6 min-w-0 flex-1 rounded bg-transparent px-1 text-xs outline-none hover:bg-muted focus:bg-muted"
          aria-label={`Titre de la page ${index + 1}`}
        />
        <Popover
          align="end"
          className="w-48"
          trigger={({ toggle }) => (
            <button type="button" onClick={toggle} className="inline-flex size-6 cursor-pointer items-center justify-center rounded hover:bg-muted" aria-label="Actions de la page">
              <MoreHorizontal className="size-4" />
            </button>
          )}
        >
          {(close) => (
            <>
              <MenuItem icon={<Copy />} onClick={() => (actions.duplicate(index), close())}>
                Dupliquer
              </MenuItem>
              <MenuItem icon={<Plus />} onClick={() => (actions.add(index), close())}>
                Page vierge après
              </MenuItem>
              {index > 0 && (
                <MenuItem icon={<ChevronUp />} onClick={() => (actions.move(index, -1), close())}>
                  Monter
                </MenuItem>
              )}
              {index < count - 1 && (
                <MenuItem icon={<ChevronDown />} onClick={() => (actions.move(index, 1), close())}>
                  Descendre
                </MenuItem>
              )}
              <MenuItem
                icon={<Trash2 />}
                danger
                onClick={() => {
                  close();
                  // annulable (Ctrl+Z, tape à deux doigts, bouton Annuler)
                  actions.remove(index);
                }}
              >
                Supprimer
              </MenuItem>
            </>
          )}
        </Popover>
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*                       Bibliothèque mécanique                         */
/* ------------------------------------------------------------------ */
const snippetPreview = new Map<string, string>();
function previewHtml(id: string, tex: string) {
  let h = snippetPreview.get(id);
  if (!h) {
    h = katex.renderToString(tex, { displayMode: false, throwOnError: false, strict: "ignore" });
    snippetPreview.set(id, h);
  }
  return h;
}

export function MechanicsDrawer({
  onClose,
  onSymbol,
  onSnippet,
  onBeam,
  onPage,
}: {
  onClose: () => void;
  onSymbol: (kind: string) => void;
  onSnippet: (kind: "math" | "text", content: string) => void;
  onBeam: (presetId?: string) => void;
  onPage: (tpl: Partial<Page>) => void;
}) {
  const [tab, setTab] = useState<"symboles" | "blocs" | "poutres">("symboles");
  const [q, setQ] = useState("");
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const symbols = useMemo(() => SYMBOLS.filter((s) => !q || norm(s.name + " " + s.category).includes(norm(q))), [q]);
  const snippets = useMemo(() => SNIPPETS.filter((s) => !q || norm(s.title + " " + s.category + " " + s.content).includes(norm(q))), [q]);
  return (
    <aside className="absolute inset-y-0 right-0 z-30 flex w-[min(340px,92vw)] flex-col border-l border-border bg-card shadow-xl lg:static lg:shadow-none" aria-label="Bibliothèque mécanique">
      <div className="flex h-11 items-center justify-between gap-2 border-b border-border px-3">
        <span className="text-[14px] font-semibold">Bibliothèque mécanique</span>
        <button type="button" onClick={onClose} className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg hover:bg-muted" aria-label="Fermer">
          <X className="size-4" />
        </button>
      </div>
      <div className="space-y-2 border-b border-border p-2.5">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "symboles", label: "Symboles" },
            { value: "blocs", label: "PFS & formules" },
            { value: "poutres", label: "Poutres" },
          ]}
        />
        {tab !== "poutres" && (
          <label className="flex h-8 items-center gap-2 rounded-lg border border-input bg-background px-2">
            <Search className="size-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (appui, coupure, flèche…)" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none" />
          </label>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
        {tab === "symboles" &&
          SYMBOL_CATEGORIES.map((cat) => {
            const list = symbols.filter((s) => s.category === cat);
            if (!list.length) return null;
            return (
              <section key={cat} className="mb-3">
                <h3 className="mb-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{cat}</h3>
                <div className="grid grid-cols-3 gap-1.5">
                  {list.map((s) => (
                    <button
                      key={s.kind}
                      type="button"
                      onClick={() => onSymbol(s.kind)}
                      title={s.hint ? `${s.name} — ${s.hint}` : s.name}
                      className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-border bg-white p-1.5 text-center text-[10.5px] leading-tight text-slate-700 hover:border-primary hover:bg-primary-soft"
                    >
                      <SymbolPreview kind={s.kind} className="h-12 w-full" />
                      <span className="line-clamp-2">{s.name}</span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        {tab === "blocs" &&
          SNIPPET_CATEGORIES.map((cat) => {
            const list = snippets.filter((s) => s.category === cat);
            if (!list.length) return null;
            return (
              <section key={cat} className="mb-3">
                <h3 className="mb-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{cat}</h3>
                <div className="space-y-1.5">
                  {list.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onSnippet(s.kind, s.content)}
                      className="block w-full cursor-pointer rounded-lg border border-border px-2.5 py-2 text-left hover:border-primary hover:bg-primary-soft"
                    >
                      <div className="text-[13px] font-medium">{s.title}</div>
                      {s.kind === "math" && (
                        <div className="mt-0.5 overflow-hidden text-[12px] text-muted-foreground" dangerouslySetInnerHTML={{ __html: previewHtml(s.id, s.content.split("\n")[0]) }} />
                      )}
                      {s.kind === "text" && <div className="mt-0.5 line-clamp-2 text-[11.5px] text-muted-foreground">{s.content.replace(/[*$\\]/g, "").split("\n").slice(1, 3).join(" · ")}</div>}
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        {tab === "poutres" && (
          <div className="space-y-3">
            <button type="button" onClick={() => onBeam()} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-[13.5px] font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="size-4" /> Nouvelle poutre calculée
            </button>
            <p className="text-[12px] leading-snug text-muted-foreground">
              Saisissez appuis et charges : le cahier dessine le schéma, calcule les réactions (PFS), écrit les coupures tronçon par tronçon et trace N(x), T(x), M(x). Double-touchez la poutre pour la modifier, tout se recalcule.
            </p>
            <div>
              <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cas types</h3>
              <div className="space-y-1">
                {BEAM_PRESETS.map((p) => (
                  <MenuItem key={p.id} onClick={() => onBeam(p.id)}>
                    {p.label}
                  </MenuItem>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pages types</h3>
              <MenuItem icon={<Files />} onClick={() => onPage({ paper: "etude-poutre" })}>
                Étude de poutre (schéma, PFS, coupures, diagrammes)
              </MenuItem>
              <MenuItem icon={<Files />} onClick={() => onPage({ paper: "diagrammes" })}>
                Diagrammes N, T, M alignés
              </MenuItem>
              <MenuItem icon={<Files />} onClick={() => onPage({ paper: "exercice" })}>
                Fiche exercice (énoncé, données, résolution)
              </MenuItem>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*                         Barre de sélection                           */
/* ------------------------------------------------------------------ */
export function SelectionBar(props: {
  x: number;
  top: number;
  bottom: number;
  vpW: number;
  vpH: number;
  elements: NoteElement[];
  onDelete: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onCut: () => void;
  onColor: (c: string) => void;
  onFront: () => void;
  onBack: () => void;
  onRotate: (deg: number) => void;
  onEdit?: () => void;
  onProps: () => void;
  onSelectGroup?: () => void;
}) {
  const W = 420;
  const above = props.top > 64;
  const y = above ? props.top - 54 : Math.min(props.bottom + 10, props.vpH - 52);
  const left = Math.min(Math.max(8, props.x - W / 2), Math.max(8, props.vpW - W - 8));
  const hasSymbol = props.elements.some((e) => e.type === "symbol");
  const colorable = props.elements.some((e) => e.type !== "image" && e.type !== "beam" && e.type !== "cut");
  const single = props.elements.length === 1 ? props.elements[0] : null;
  return (
    <div
      data-nb-ui
      className="absolute z-20 flex max-w-[calc(100%-16px)] items-center gap-0.5 overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-xl [scrollbar-width:none]"
      style={{ left, top: Math.max(6, y) }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {props.onEdit && single && (single.type === "text" || single.type === "math" || single.type === "beam") && (
        <ToolButton label="Modifier" onClick={props.onEdit} className="size-9">
          <Pencil />
        </ToolButton>
      )}
      {single && single.type !== "image" && (
        <ToolButton label="Propriétés" onClick={props.onProps} className="size-9">
          <SlidersHorizontal />
        </ToolButton>
      )}
      {colorable && (
        <Popover
          trigger={({ toggle }) => (
            <ToolButton label="Couleur" onClick={toggle} className="size-9">
              <span className="size-5 rounded-full ring-1 ring-black/15" style={{ background: "conic-gradient(#111827 0 25%, #1f5eff 0 50%, #d9322b 0 75%, #0f9f58 0)" }} />
            </ToolButton>
          )}
        >
          {(close) => (
            <div className="flex gap-1 p-1">
              {PEN_COLORS.map((c) => (
                <ColorDot key={c} color={c} onClick={() => (props.onColor(c), close())} />
              ))}
            </div>
          )}
        </Popover>
      )}
      {hasSymbol && (
        <>
          <ToolButton label="Pivoter de −15°" onClick={() => props.onRotate(-15)} className="size-9">
            <RotateCcw />
          </ToolButton>
          <ToolButton label="Pivoter de +15° (Maj : 90°)" onClick={() => props.onRotate(15)} className="size-9">
            <RotateCw />
          </ToolButton>
          <button type="button" onClick={() => props.onRotate(90)} className="h-9 shrink-0 cursor-pointer rounded-lg px-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted" title="Pivoter de 90°">
            90°
          </button>
        </>
      )}
      <ToolButton label="Dupliquer (Ctrl+D)" onClick={props.onDuplicate} className="size-9">
        <Copy />
      </ToolButton>
      <ToolButton label="Couper (Ctrl+X)" onClick={props.onCut} className="size-9">
        <Scissors />
      </ToolButton>
      <ToolButton label="Premier plan" onClick={props.onFront} className="size-9">
        <ArrowUpToLine />
      </ToolButton>
      <ToolButton label="Arrière-plan" onClick={props.onBack} className="size-9">
        <ArrowDownToLine />
      </ToolButton>
      {props.onSelectGroup && (
        <ToolButton label="Sélectionner tout le bloc calculé" onClick={props.onSelectGroup} className="size-9">
          <Group />
        </ToolButton>
      )}
      <ToolButton label="Supprimer (Suppr)" onClick={props.onDelete} className="size-9 text-danger hover:bg-danger-soft">
        <Trash2 />
      </ToolButton>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                            Propriétés                                */
/* ------------------------------------------------------------------ */
function Range({ label, value, min, max, step = 1, onChange, unit }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <label className="block text-[12px]">
      <span className="flex justify-between text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums text-foreground">
          {Math.round(value * 100) / 100}
          {unit}
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
    </label>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-[12px] text-muted-foreground">
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-0.5 h-8 w-full rounded-lg border border-input bg-background px-2 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-primary/40" />
    </label>
  );
}

export function PropsPanel({ el, onChange, onClose, onEdit }: { el: NoteElement; onChange: (patch: Partial<NoteElement>) => void; onClose: () => void; onEdit: () => void }) {
  const set = (p: Record<string, unknown>) => onChange(p as Partial<NoteElement>);
  let title = "Propriétés";
  let body: React.ReactNode = null;
  const colors = (cur: string) => (
    <div className="flex flex-wrap gap-0.5">
      {PEN_COLORS.map((c) => (
        <ColorDot key={c} color={c} active={cur === c} onClick={() => set({ color: c })} />
      ))}
    </div>
  );
  if (el.type === "symbol") {
    const def = symbolDef(el.kind);
    title = def.name;
    body = (
      <>
        {def.hint && <p className="rounded-lg bg-muted px-2 py-1.5 text-[12px] leading-snug text-muted-foreground">{def.hint}</p>}
        {def.params.label && <TextInput label={def.params.label} value={el.label ?? ""} onChange={(v) => set({ label: v })} />}
        {def.params.label2 && <TextInput label={def.params.label2} value={el.label2 ?? ""} onChange={(v) => set({ label2: v })} />}
        {def.params.len && <Range label={def.params.len} value={el.len ?? def.defaults.len ?? 100} min={20} max={700} onChange={(v) => set({ len: v })} />}
        {def.params.h && <Range label={def.params.h} value={el.h ?? def.defaults.h ?? 40} min={def.params.h.includes("°") ? 5 : 4} max={def.params.h.includes("°") ? 85 : 300} onChange={(v) => set({ h: v })} />}
        {def.params.h2 && <Range label={def.params.h2} value={el.h2 ?? def.defaults.h2 ?? 40} min={4} max={300} onChange={(v) => set({ h2: v })} />}
        <Range label="Échelle" value={el.scale} min={0.3} max={3} step={0.05} onChange={(v) => set({ scale: v })} />
        <Range label="Rotation" value={el.rot} min={0} max={359} unit="°" onChange={(v) => set({ rot: v })} />
        {colors(el.color)}
      </>
    );
  } else if (el.type === "text") {
    title = "Texte";
    body = (
      <>
        <Range label="Taille" value={el.size} min={9} max={64} onChange={(v) => set({ size: v })} />
        <Range label="Largeur" value={el.w} min={60} max={760} onChange={(v) => set({ w: v })} />
        <Segmented
          size="sm"
          value={el.font ?? "sans"}
          onChange={(f) => set({ font: f })}
          options={[
            { value: "sans", label: "Sans" },
            { value: "serif", label: "Serif" },
            { value: "mono", label: "Mono" },
          ]}
        />
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={!!el.boxed} onChange={(e) => set({ boxed: e.target.checked || undefined })} /> Encadré (résultat)
        </label>
        {colors(el.color)}
        <button type="button" onClick={onEdit} className="h-8 w-full cursor-pointer rounded-lg border border-border text-[13px] hover:bg-muted">
          Modifier le texte
        </button>
      </>
    );
  } else if (el.type === "math") {
    title = "Formule";
    body = (
      <>
        <Range label="Taille" value={el.size} min={9} max={60} onChange={(v) => set({ size: v })} />
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={!!el.boxed} onChange={(e) => set({ boxed: e.target.checked || undefined })} /> Encadré (résultat)
        </label>
        {colors(el.color)}
        <button type="button" onClick={onEdit} className="h-8 w-full cursor-pointer rounded-lg border border-border text-[13px] hover:bg-muted">
          Modifier la formule
        </button>
      </>
    );
  } else if (el.type === "beam") {
    title = "Poutre calculée";
    const toggle = (k: keyof typeof el.show, label: string) => (
      <label key={k} className="flex items-center gap-2 text-[13px]">
        <input type="checkbox" checked={el.show[k]} onChange={(e) => set({ show: { ...el.show, [k]: e.target.checked } })} /> {label}
      </label>
    );
    body = (
      <>
        <div className="grid grid-cols-2 gap-1">
          {toggle("schema", "Schéma")}
          {toggle("reactions", "Réactions")}
          {toggle("N", "N(x)")}
          {toggle("T", "T(x)")}
          {toggle("M", "M(x)")}
          {toggle("deformee", "Déformée")}
        </div>
        <Range label="Largeur" value={el.w} min={200} max={760} onChange={(v) => set({ w: v })} />
        <button type="button" onClick={onEdit} className="h-8 w-full cursor-pointer rounded-lg bg-primary text-[13px] font-medium text-primary-foreground hover:bg-primary/90">
          Modifier appuis et charges
        </button>
      </>
    );
  } else if (el.type === "cut") {
    title = "Coupure";
    body = <Range label="Largeur" value={el.w} min={200} max={760} onChange={(v) => set({ w: v })} />;
  } else if (el.type === "shape") {
    title = "Forme";
    body = (
      <>
        {el.shape === "dim" && <TextInput label="Valeur de la cote" value={el.label ?? ""} onChange={(v) => set({ label: v })} />}
        <Range label="Épaisseur" value={el.size} min={0.6} max={8} step={0.2} onChange={(v) => set({ size: v })} />
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={!!el.dash} onChange={(e) => set({ dash: e.target.checked || undefined })} /> Pointillés
        </label>
        {(el.shape === "rect" || el.shape === "ellipse" || el.shape === "triangle" || el.shape === "polygon") && (
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={!!el.fill} onChange={(e) => set({ fill: e.target.checked || undefined })} /> Rempli
          </label>
        )}
        {colors(el.color)}
      </>
    );
  } else if (el.type === "stroke") {
    title = el.tool === "highlighter" ? "Surlignage" : "Trait";
    body = (
      <>
        <Range label="Épaisseur" value={el.size} min={0.6} max={40} step={0.2} onChange={(v) => set({ size: v })} />
        {colors(el.color)}
      </>
    );
  } else return null;
  return (
    <div data-nb-ui className="absolute bottom-12 right-3 z-20 w-64 space-y-2.5 rounded-xl border border-border bg-card p-3 shadow-xl" onPointerDown={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <span className="text-[13.5px] font-semibold">{title}</span>
        <button type="button" onClick={onClose} className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md hover:bg-muted" aria-label="Fermer">
          <X className="size-4" />
        </button>
      </div>
      {body}
    </div>
  );
}
