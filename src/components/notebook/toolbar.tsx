"use client";
/** Barre supérieure (cahier, pages, export, réglages) et barre d'outils. */
import { useState } from "react";
import {
  ArrowLeft,
  Calculator,
  CircleHelp,
  Cloud,
  CloudOff,
  Download,
  Eraser,
  FileDown,
  FilePlus2,
  FileText,
  Hand,
  Highlighter,
  ImagePlus,
  LassoSelect,
  Library,
  Maximize2,
  PanelLeft,
  PenLine,
  Printer,
  Redo2,
  Settings,
  Shapes,
  Sigma,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { makeExport } from "@/lib/notebook/model";
import { inClaudeViewer, type SyncStatus } from "@/lib/notebook/cloud";
import { HIGHLIGHT_COLORS, HIGHLIGHT_SIZES, PAPER_COLORS, PAPERS, PEN_COLORS, PEN_SIZES, ERASER_SIZES } from "@/lib/notebook/paper";
import type { Notebook, Orientation, Page, PaperColor, PaperKind } from "@/lib/notebook/types";
import { cn } from "@/lib/utils";
import { saveFile, safeName } from "./files";
import { ColorDot, MenuItem, MenuLabel, Popover, Segmented, Sep, SizeDot, ToolButton } from "./nb-ui";
import { SHAPE_LABEL, TOOL_LABEL, type DrawShape, type Tool, type ToolSettings } from "./tools";

export function PaperChooser({ value, onChange }: { value: PaperKind; onChange: (k: PaperKind) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {PAPERS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id)}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-border p-1.5 text-[11.5px] hover:bg-muted",
            value === p.id && "border-primary bg-primary-soft text-primary",
          )}
        >
          <PaperIcon kind={p.id} />
          <span className="leading-tight">{p.label}</span>
        </button>
      ))}
    </div>
  );
}

function PaperIcon({ kind }: { kind: PaperKind }) {
  const lines: React.ReactNode[] = [];
  const st = { stroke: "currentColor", strokeWidth: 0.6, opacity: 0.55 };
  if (kind === "ligne" || kind === "seyes") for (let y = 8; y < 44; y += kind === "seyes" ? 3 : 5) lines.push(<line key={y} x1={2} x2={32} y1={y} y2={y} {...st} opacity={kind === "seyes" && (y - 8) % 12 !== 0 ? 0.25 : 0.55} />);
  if (kind === "carreaux" || kind === "millimetre" || kind === "etude-poutre" || kind === "exercice" || kind === "diagrammes")
    for (let k = 0; k <= 34; k += kind === "millimetre" ? 2 : 4) {
      lines.push(<line key={`v${k}`} x1={k} x2={k} y1={0} y2={46} {...st} opacity={0.25} />);
      lines.push(<line key={`h${k}`} x1={0} x2={34} y1={k + 6} y2={k + 6} {...st} opacity={0.25} />);
    }
  if (kind === "points") for (let x = 4; x < 34; x += 5) for (let y = 4; y < 46; y += 5) lines.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={0.6} fill="currentColor" opacity={0.6} />);
  if (kind === "etude-poutre") [4, 14, 24, 33].forEach((y, k) => lines.push(<rect key={`z${k}`} x={3} y={y} width={28} height={8} rx={1} fill="none" stroke="currentColor" strokeWidth={0.8} />));
  if (kind === "diagrammes") [12, 24, 36].forEach((y) => lines.push(<line key={`a${y}`} x1={6} x2={31} y1={y} y2={y} stroke="currentColor" strokeWidth={1} />));
  if (kind === "exercice") [3, 15, 24, 35].forEach((y, k) => lines.push(<rect key={`e${k}`} x={3} y={y} width={28} height={k === 2 ? 8 : 7} rx={1} fill="none" stroke="currentColor" strokeWidth={0.8} />));
  return (
    <svg viewBox="0 0 34 46" className="h-11 w-8 rounded-[3px] bg-white text-slate-500 shadow-sm ring-1 ring-black/10" aria-hidden>
      {lines}
    </svg>
  );
}

export function TopBar(props: {
  title: string;
  onTitle: (t: string) => void;
  onClose: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  saving: "saved" | "pending" | "error";
  persistent: boolean;
  sync: SyncStatus | null;
  page: Page;
  pageIndex: number;
  pageCount: number;
  onPage: (patch: Partial<Page>, all?: boolean) => void;
  onAddPage: (tpl?: Partial<Page>) => void;
  sidebar: boolean;
  onSidebar: () => void;
  drawer: boolean;
  onDrawer: () => void;
  onImport: () => void;
  onPrint: () => void;
  onPrintHtml: () => void;
  notebook: Notebook;
  settings: ToolSettings;
  onSettings: (p: Partial<ToolSettings>) => void;
  zoom: number;
  onZoom: (f: number) => void;
  onFit: () => void;
  onBeam: () => void;
}) {
  const [title, setTitle] = useState(props.title);
  const [applyAll, setApplyAll] = useState(false);
  const p = props.page;
  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b border-border bg-card px-1.5 sm:px-2">
      <ToolButton label="Retour aux cahiers" onClick={props.onClose}>
        <ArrowLeft />
      </ToolButton>
      <ToolButton label="Pages" active={props.sidebar} onClick={props.onSidebar}>
        <PanelLeft />
      </ToolButton>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => props.onTitle(title)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        aria-label="Titre du cahier"
        className="h-9 min-w-[5rem] max-w-[16rem] flex-1 truncate rounded-lg bg-transparent px-2 text-[15px] font-semibold outline-none hover:bg-muted focus:bg-muted"
      />
      <span
        className={cn("hidden size-2 shrink-0 rounded-full sm:inline-block", props.saving === "saved" ? "bg-success" : props.saving === "pending" ? "bg-warning" : "bg-danger")}
        title={props.saving === "saved" ? (props.persistent ? "Enregistré sur cet appareil" : "Stockage indisponible : exportez votre cahier") : props.saving === "pending" ? "Enregistrement…" : "Erreur d'enregistrement"}
      />
      {props.sync && props.sync !== "local" && props.sync !== "connecting" && (
        <span
          className={cn("hidden shrink-0 sm:inline-flex", props.sync === "ok" || props.sync === "syncing" ? "text-muted-foreground" : "text-warning")}
          title={
            props.sync === "ok"
              ? "Synchronisé avec votre compte claude.ai"
              : props.sync === "syncing"
                ? "Synchronisation…"
                : props.sync === "quota"
                  ? "Espace de synchronisation plein"
                  : "Synchronisation indisponible : enregistré sur cet appareil"
          }
        >
          {props.sync === "ok" || props.sync === "syncing" ? <Cloud className={cn("size-4", props.sync === "syncing" && "animate-pulse")} /> : <CloudOff className="size-4" />}
        </span>
      )}
      <div className="ml-auto flex items-center gap-0.5">
        <ToolButton label="Annuler (Ctrl+Z, tape à deux doigts)" disabled={!props.canUndo} onClick={props.onUndo}>
          <Undo2 />
        </ToolButton>
        <ToolButton label="Rétablir (Ctrl+Maj+Z)" disabled={!props.canRedo} onClick={props.onRedo} className="hidden sm:inline-flex">
          <Redo2 />
        </ToolButton>
        <span className="hidden sm:contents">
          <Sep />
        </span>
        <Popover
          align="end"
          className="w-[19rem]"
          trigger={({ toggle, open }) => (
            <ToolButton label="Page : modèle, papier, ajout" active={open} onClick={toggle}>
              <FilePlus2 />
            </ToolButton>
          )}
        >
          {(close) => (
            <div className="space-y-2 p-1">
              <MenuLabel>
                Page {props.pageIndex + 1} / {props.pageCount}
              </MenuLabel>
              <PaperChooser value={p.paper} onChange={(k) => props.onPage({ paper: k }, applyAll)} />
              <div className="flex flex-wrap items-center gap-2 px-1">
                <Segmented<PaperColor>
                  size="sm"
                  value={p.color}
                  onChange={(c) => props.onPage({ color: c }, applyAll)}
                  options={(Object.keys(PAPER_COLORS) as PaperColor[]).map((c) => ({ value: c, label: PAPER_COLORS[c].label }))}
                />
                <Segmented<Orientation>
                  size="sm"
                  value={p.orientation}
                  onChange={(o) => props.onPage({ orientation: o }, applyAll)}
                  options={[
                    { value: "portrait", label: "Portrait" },
                    { value: "paysage", label: "Paysage" },
                  ]}
                />
              </div>
              <label className="flex items-center gap-2 px-1 text-[13px]">
                <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} /> Appliquer à toutes les pages
              </label>
              <div className="border-t border-border pt-1">
                <MenuItem
                  icon={<FilePlus2 />}
                  onClick={() => {
                    props.onAddPage();
                    close();
                  }}
                >
                  Nouvelle page après celle-ci
                </MenuItem>
                <MenuItem
                  icon={<ImagePlus />}
                  onClick={() => {
                    props.onImport();
                    close();
                  }}
                  hint="PDF, image"
                >
                  Importer un sujet (PDF) ou une image
                </MenuItem>
              </div>
            </div>
          )}
        </Popover>
        <ToolButton label="Bibliothèque mécanique" active={props.drawer} onClick={props.onDrawer} className="hidden sm:inline-flex">
          <Library />
        </ToolButton>
        <Popover
          align="end"
          className="w-72"
          trigger={({ toggle, open }) => (
            <ToolButton label="Exporter" active={open} onClick={toggle}>
              <Download />
            </ToolButton>
          )}
        >
          {(close) => (
            <>
              {!inClaudeViewer() && (
                <MenuItem
                  icon={<Printer />}
                  onClick={() => {
                    close();
                    props.onPrint();
                  }}
                >
                  Imprimer / enregistrer en PDF
                </MenuItem>
              )}
              <MenuItem
                icon={<FileText />}
                onClick={() => {
                  close();
                  props.onPrintHtml();
                }}
                hint=".html"
              >
                Version imprimable (page web)
              </MenuItem>
              {inClaudeViewer() && (
                <p className="px-2.5 pb-1 text-[11.5px] leading-snug text-muted-foreground">Ouvrez le fichier dans votre navigateur puis imprimez-le ou enregistrez-le en PDF.</p>
              )}
              <MenuItem
                icon={<FileDown />}
                onClick={() => {
                  close();
                  void saveFile(`${safeName(props.notebook.title)}.cahier.json`, makeExport([props.notebook]), "application/json");
                }}
                hint=".json"
              >
                Sauvegarde du cahier
              </MenuItem>
              <p className="px-2.5 pb-1 pt-1.5 text-[11.5px] leading-snug text-muted-foreground">
                La sauvegarde se réimporte depuis la bibliothèque (sur un autre appareil, par exemple).
              </p>
            </>
          )}
        </Popover>
        <div className="hidden items-center md:flex">
          <ToolButton label="Zoom arrière" onClick={() => props.onZoom(1 / 1.2)}>
            <ZoomOut />
          </ToolButton>
          <button type="button" onClick={props.onFit} className="h-9 w-14 cursor-pointer rounded-lg text-xs font-semibold tabular-nums text-muted-foreground hover:bg-muted" title="Ajuster à la largeur">
            {Math.round(props.zoom * 100)} %
          </button>
          <ToolButton label="Zoom avant" onClick={() => props.onZoom(1.2)}>
            <ZoomIn />
          </ToolButton>
        </div>
        <ToolButton label="Ajuster à la largeur" onClick={props.onFit} className="hidden sm:inline-flex md:hidden">
          <Maximize2 />
        </ToolButton>
        <Popover
          align="end"
          className="w-80"
          trigger={({ toggle, open }) => (
            <ToolButton label="Réglages" active={open} onClick={toggle}>
              <Settings />
            </ToolButton>
          )}
        >
          <div className="space-y-3 p-2 text-[13px]">
            <div>
              <div className="mb-1 font-semibold">Dessiner au doigt</div>
              <Segmented
                value={props.settings.finger}
                onChange={(f) => props.onSettings({ finger: f })}
                options={[
                  { value: "auto", label: "Auto", title: "Tablette : stylet seul. Téléphone : au doigt jusqu'au premier stylet." },
                  { value: "on", label: "Oui" },
                  { value: "off", label: "Stylet seul" },
                ]}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                « Auto » sur iPad et « Stylet seul » : seul l&apos;Apple Pencil écrit ; le doigt fait défiler et zoomer ; la paume est ignorée pendant l&apos;écriture.
              </p>
            </div>
            <div>
              <div className="mb-1 font-semibold">Bouton gomme rapide</div>
              <Segmented
                value={props.settings.quickSide}
                onChange={(q) => props.onSettings({ quickSide: q })}
                options={[
                  { value: "left", label: "À gauche" },
                  { value: "right", label: "À droite" },
                  { value: "off", label: "Masqué" },
                ]}
              />
              <p className="mt-1 text-xs text-muted-foreground">Bascule entre l&apos;outil en cours et la gomme.</p>
            </div>
            <div>
              <div className="mb-1 font-semibold">Double-tape au doigt</div>
              <Segmented
                value={props.settings.fingerDoubleTap}
                onChange={(d) => props.onSettings({ fingerDoubleTap: d })}
                options={[
                  { value: "eraser", label: "Gomme", title: "Outil en cours ⇄ gomme" },
                  { value: "previous", label: "Outil précédent", title: "Outil en cours ⇄ dernier outil utilisé" },
                  { value: "off", label: "Non" },
                ]}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Tapez deux fois la page avec un doigt pour changer d&apos;outil. Safari ne transmet pas le double-tap de l&apos;Apple Pencil aux pages web : ce geste le remplace.
              </p>
            </div>
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-0.5" checked={props.settings.autoShape} onChange={(e) => props.onSettings({ autoShape: e.target.checked })} />
              <span>
                <span className="font-medium">Formes automatiques</span>
                <span className="block text-xs text-muted-foreground">Gardez le stylet immobile près d&apos;une seconde en fin de trait : droite, cercle, rectangle, triangle.</span>
              </span>
            </label>
          </div>
        </Popover>
        <Popover
          align="end"
          className="w-[22rem]"
          trigger={({ toggle, open }) => (
            <ToolButton label="Aide" active={open} onClick={toggle} className="hidden sm:inline-flex">
              <CircleHelp />
            </ToolButton>
          )}
        >
          <HelpContent />
        </Popover>
      </div>
    </header>
  );
}

function HelpContent() {
  const rows: [string, string][] = [
    ["Stylet / souris", "écrire avec l'outil choisi"],
    ["Un doigt", "faire défiler (ou dessiner si « dessin au doigt »)"],
    ["Deux doigts", "zoomer et déplacer"],
    ["Tape à 2 / 3 doigts", "annuler / rétablir"],
    ["Double-tape d'un doigt", "outil ⇄ gomme (ou outil précédent, dans Réglages), à la place du double-tap du Pencil"],
    ["Bouton rond (bas de l'écran)", "outil ⇄ gomme"],
    ["Stylet immobile en fin de trait", "forme parfaite"],
    ["Lasso", "entourer pour sélectionner, toucher un objet, double-toucher pour le modifier"],
    ["Ctrl + molette", "zoom ; Espace + glisser : déplacer"],
    ["Raccourcis", "P stylo · S surligneur · E gomme · L lasso · F formes · T texte · M formule"],
    ["Texte", "Markdown et formules entre $…$"],
  ];
  return (
    <div className="space-y-1.5 p-2 text-[13px]">
      <div className="font-semibold">Gestes et raccourcis</div>
      {rows.map(([a, b]) => (
        <div key={a} className="grid grid-cols-[8.5rem_1fr] gap-2">
          <span className="font-medium text-foreground">{a}</span>
          <span className="text-muted-foreground">{b}</span>
        </div>
      ))}
    </div>
  );
}

const SHAPE_ICONS: Record<DrawShape, React.ReactNode> = {
  line: <path d="M4 20 L20 4" />,
  arrow: <path d="M4 20 L20 4 M12 4 H20 V12" />,
  darrow: <path d="M4 20 L20 4 M12 4 H20 V12 M4 12 V20 H12" />,
  rect: <rect x="4" y="6" width="16" height="12" rx="1" />,
  ellipse: <ellipse cx="12" cy="12" rx="9" ry="7" />,
  triangle: <path d="M12 4 L21 20 H3 Z" />,
  dim: <path d="M3 8 V16 M21 8 V16 M3 12 H21 M3 12 l4 -3 M3 12 l4 3 M21 12 l-4 -3 M21 12 l-4 3" />,
};

const TOOL_ICONS: Record<Tool, React.ReactNode> = {
  pen: <PenLine />,
  highlighter: <Highlighter />,
  eraser: <Eraser />,
  lasso: <LassoSelect />,
  shape: <Shapes />,
  text: <Type />,
  math: <Sigma />,
  hand: <Hand />,
};

/** Icône « treillis » (triangulation et appuis). */
export function TrussIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" strokeLinecap="round" aria-hidden>
      <path d="M3 17 H21 M6 9 H18 M3 17 L6 9 L10 17 L14 9 L17 17 M18 9 L21 17 M6 9 L3 17 M14 9 L17 17" />
      <path d="M3 17 l-1.5 3 h3 Z M21 17 l-1.5 3 h3 Z" />
    </svg>
  );
}

export function ToolIcon({ tool }: { tool: Tool }) {
  return <>{TOOL_ICONS[tool]}</>;
}

export function EditorToolbar({
  tool,
  onTool,
  settings: s,
  onSettings,
  onBeam,
  onTruss,
  onMechanics,
}: {
  tool: Tool;
  onTool: (t: Tool) => void;
  settings: ToolSettings;
  onSettings: (p: Partial<ToolSettings>) => void;
  onBeam: () => void;
  onTruss: () => void;
  onMechanics: () => void;
}) {
  const tools = (Object.keys(TOOL_ICONS) as Tool[]).map((t) => ({ t, icon: TOOL_ICONS[t] }));
  const custom = (key: "penColor" | "hlColor" | "shapeColor" | "textColor") => (
    <label className="relative inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full" title="Autre couleur">
      <span className="size-6 rounded-full border border-black/10" style={{ background: "conic-gradient(#ef4444, #f59e0b, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)" }} />
      <input type="color" value={s[key]} onChange={(e) => onSettings({ [key]: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Autre couleur" />
    </label>
  );
  const colorRow = (key: "penColor" | "shapeColor" | "textColor") => (
    <>
      {PEN_COLORS.slice(0, 6).map((c) => (
        <ColorDot key={c} color={c} active={s[key] === c} onClick={() => onSettings({ [key]: c })} />
      ))}
      {!PEN_COLORS.slice(0, 6).includes(s[key]) && <ColorDot color={s[key]} active onClick={() => {}} />}
      {custom(key)}
    </>
  );

  return (
    <div className="flex h-[52px] shrink-0 items-center gap-0.5 overflow-x-auto border-b border-border bg-card px-1.5 [scrollbar-width:none] sm:px-2">
      {tools.map(({ t, icon }) => (
        <ToolButton key={t} label={TOOL_LABEL[t]} active={tool === t} onClick={() => onTool(t)}>
          {icon}
        </ToolButton>
      ))}
      <Sep />
      <ToolButton label="Bibliothèque mécanique : appuis, charges, coupures, PFS, formulaire" onClick={onMechanics}>
        <Library />
      </ToolButton>
      <ToolButton label="Poutre calculée : réactions, PFS, coupures, diagrammes N, T, M" onClick={onBeam}>
        <Calculator />
      </ToolButton>
      <ToolButton label="Treillis calculé : efforts dans les barres, méthode des nœuds" onClick={onTruss}>
        <TrussIcon />
      </ToolButton>
      <Sep />
      <div className="flex min-w-0 items-center gap-0.5">
        {tool === "pen" && (
          <>
            <Segmented
              size="sm"
              value={s.penType}
              onChange={(v) => onSettings({ penType: v })}
              options={[
                { value: "ball", label: "Bille", title: "Trait régulier, net" },
                { value: "fountain", label: "Plume", title: "Pleins et déliés selon la pression" },
              ]}
            />
            <Sep />
            {colorRow("penColor")}
            <Sep />
            {PEN_SIZES.map((z) => (
              <SizeDot key={z} size={z} active={s.penSize === z} onClick={() => onSettings({ penSize: z })} color={s.penColor} />
            ))}
          </>
        )}
        {tool === "highlighter" && (
          <>
            {HIGHLIGHT_COLORS.map((c) => (
              <ColorDot key={c} color={c} active={s.hlColor === c} onClick={() => onSettings({ hlColor: c })} />
            ))}
            {custom("hlColor")}
            <Sep />
            {HIGHLIGHT_SIZES.map((z) => (
              <SizeDot key={z} size={z / 3} active={s.hlSize === z} onClick={() => onSettings({ hlSize: z })} color={s.hlColor} />
            ))}
          </>
        )}
        {tool === "eraser" && (
          <>
            <Segmented
              value={s.eraserMode}
              onChange={(m) => onSettings({ eraserMode: m })}
              options={[
                { value: "stroke", label: "Trait entier" },
                { value: "precise", label: "Précise" },
              ]}
            />
            <Sep />
            {ERASER_SIZES.map((z) => (
              <SizeDot key={z} size={z / 3} active={s.eraserSize === z} onClick={() => onSettings({ eraserSize: z })} color="#9aa3b5" />
            ))}
            <Sep />
            <label className="flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap px-1 text-[13px]">
              <input type="checkbox" checked={s.eraserHlOnly} onChange={(e) => onSettings({ eraserHlOnly: e.target.checked })} /> Surligneur seulement
            </label>
          </>
        )}
        {tool === "shape" && (
          <>
            {(Object.keys(SHAPE_ICONS) as DrawShape[]).map((k) => (
              <ToolButton key={k} label={SHAPE_LABEL[k]} active={s.shape === k} onClick={() => onSettings({ shape: k })} className="size-9">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  {SHAPE_ICONS[k]}
                </svg>
              </ToolButton>
            ))}
            <Sep />
            <label className="flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap px-1 text-[13px]">
              <input type="checkbox" checked={s.shapeDash} onChange={(e) => onSettings({ shapeDash: e.target.checked })} /> Pointillés
            </label>
            <label className="flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap px-1 text-[13px]">
              <input type="checkbox" checked={s.shapeFill} onChange={(e) => onSettings({ shapeFill: e.target.checked })} /> Rempli
            </label>
            <Sep />
            {colorRow("shapeColor")}
            <Sep />
            {[1.2, 2, 3.2].map((z) => (
              <SizeDot key={z} size={z * 1.3} active={s.shapeSize === z} onClick={() => onSettings({ shapeSize: z })} color={s.shapeColor} />
            ))}
          </>
        )}
        {(tool === "text" || tool === "math") && (
          <>
            {tool === "text" && (
              <Segmented
                value={String(s.textSize)}
                onChange={(v) => onSettings({ textSize: Number(v) })}
                options={[
                  { value: "14", label: "S" },
                  { value: "18", label: "M" },
                  { value: "24", label: "L" },
                  { value: "32", label: "XL" },
                ]}
              />
            )}
            {tool === "text" && <Sep />}
            {colorRow("textColor")}
            <span className="whitespace-nowrap px-2 text-xs text-muted-foreground">{tool === "text" ? "Touchez la page pour écrire · $…$ = formule" : "Touchez la page pour placer une formule"}</span>
          </>
        )}
        {tool === "lasso" && <span className="whitespace-nowrap px-2 text-[13px] text-muted-foreground">Entourez pour sélectionner · touchez un objet · double-touchez pour le modifier</span>}
        {tool === "hand" && <span className="whitespace-nowrap px-2 text-[13px] text-muted-foreground">Glissez pour déplacer la page · pincez pour zoomer</span>}
      </div>
    </div>
  );
}
