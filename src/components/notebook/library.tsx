"use client";
/** Bibliothèque : liste des cahiers, création, recherche, import / export. */
import { useMemo, useState } from "react";
import { ArrowLeft, Cloud, CloudOff, Copy, Download, FileDown, MoreHorizontal, NotebookPen, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { makeExport, newNotebook, parseExport, uid } from "@/lib/notebook/model";
import { COVERS } from "@/lib/notebook/paper";
import type { NotebookStore } from "@/lib/notebook/storage";
import type { SyncStatus } from "@/lib/notebook/cloud";
import type { Notebook, NotebookMeta, PaperColor, PaperKind } from "@/lib/notebook/types";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { pickFiles, safeName, saveFile } from "./files";
import { MenuItem, Modal, Popover, Segmented, ThemeToggle } from "./nb-ui";
import { PaperChooser } from "./toolbar";

function Cover({ meta, onOpen }: { meta: NotebookMeta; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="group relative block aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-r-xl rounded-l-md text-left shadow-md ring-1 ring-black/10 transition hover:-translate-y-0.5 hover:shadow-lg" style={{ background: meta.cover }}>
      <span className="absolute inset-y-0 left-0 w-3 bg-black/20" />
      <span className="absolute inset-y-0 left-3 w-px bg-white/25" />
      <svg viewBox="0 0 120 40" className="absolute inset-x-5 top-6 h-10 w-[calc(100%-2.5rem)] opacity-70" aria-hidden>
        <path d="M6 22 H114" stroke="#fff" strokeWidth="3" />
        <path d="M14 22 L6 34 H22 Z M106 22 L98 34 H114 Z" fill="none" stroke="#fff" strokeWidth="1.6" />
        {[30, 45, 60, 75, 90].map((x) => (
          <path key={x} d={`M${x} 4 V18 M${x - 3} 14 L${x} 18 L${x + 3} 14`} stroke="#fff" strokeWidth="1.4" fill="none" />
        ))}
      </svg>
      <span className="absolute inset-x-5 bottom-5 block">
        <span className="line-clamp-3 text-[15px] font-semibold leading-snug text-white drop-shadow-sm">{meta.title}</span>
      </span>
    </button>
  );
}

export function Library({
  store,
  metas,
  onOpen,
  onRefresh,
  homeHref,
  sync,
}: {
  sync?: SyncStatus | null;
  store: NotebookStore;
  metas: NotebookMeta[];
  onOpen: (id: string) => void;
  onRefresh: () => Promise<void>;
  homeHref?: string;
}) {
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<NotebookMeta | null>(null);
  const [deleting, setDeleting] = useState<NotebookMeta | null>(null);
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const list = useMemo(() => (q ? metas.filter((m) => norm(m.searchText).includes(norm(q))) : metas), [metas, q]);

  const importFiles = async () => {
    const files = await pickFiles(".json,application/json");
    if (!files[0]) return;
    const res = parseExport(await files[0].text());
    if (!res.ok) return setMsg(res.error);
    for (const nb of res.notebooks) await store.save(nb);
    await onRefresh();
    setMsg(`${res.notebooks.length} cahier(s) importé(s).`);
  };

  const exportAll = async () => {
    const all: Notebook[] = [];
    for (const m of metas) {
      const nb = await store.load(m.id);
      if (nb) all.push(nb);
    }
    if (all.length) await saveFile(`cahiers-meca-${new Date().toISOString().slice(0, 10)}.cahier.json`, makeExport(all), "application/json");
  };

  return (
    <div className="nb-root fixed inset-0 z-40 overflow-y-auto bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-6">
        {homeHref && (
          <a href={homeHref} className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> STRUCTURA
          </a>
        )}
        <header className="flex flex-wrap items-center gap-3 pb-5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <NotebookPen className="size-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Cahiers de mécanique</h1>
              <p className="text-[13px] text-muted-foreground">Prise de notes manuscrite, symboles mécaniques, PFS, coupures et diagrammes calculés</p>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button onClick={() => setCreating(true)}>
              <Plus /> Nouveau cahier
            </Button>
            <Button variant="outline" onClick={importFiles} title="Importer une sauvegarde (.json)">
              <Upload /> Importer
            </Button>
            <Button variant="outline" onClick={exportAll} disabled={!metas.length} title="Sauvegarder tous les cahiers dans un fichier">
              <Download /> Tout sauvegarder
            </Button>
            <ThemeToggle />
          </div>
        </header>

        {sync && sync !== "local" && <SyncBanner status={sync} />}
        {!store.persistent && (
          <div className="mb-4 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-[13.5px] text-warning">
            Ce navigateur ne permet pas d&apos;enregistrer les cahiers sur l&apos;appareil (navigation privée ?). Pensez à les sauvegarder en fichier avant de fermer la page.
          </div>
        )}
        {msg && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 text-[13.5px]" role="status">
            {msg}
            <button type="button" onClick={() => setMsg(null)} className="cursor-pointer text-muted-foreground hover:text-foreground" aria-label="Fermer">
              ✕
            </button>
          </div>
        )}

        <label className="mb-5 flex h-10 max-w-md items-center gap-2 rounded-xl border border-input bg-card px-3">
          <Search className="size-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher dans les titres, textes et formules" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>

        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
            <p className="text-muted-foreground">{q ? "Aucun cahier ne correspond." : "Aucun cahier pour l'instant."}</p>
            {!q && (
              <Button className="mt-4" onClick={() => setCreating(true)}>
                <Plus /> Créer mon premier cahier
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {list.map((m) => (
              <div key={m.id}>
                <Cover meta={m} onOpen={() => onOpen(m.id)} />
                <div className="mt-2 flex items-start gap-1">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium">{m.title}</div>
                    <div className="text-[12px] text-muted-foreground">
                      {m.pageCount} page{m.pageCount > 1 ? "s" : ""} · {new Date(m.updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </div>
                  </div>
                  <Popover
                    align="end"
                    className="w-52"
                    trigger={({ toggle }) => (
                      <button type="button" onClick={toggle} className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted" aria-label={`Actions : ${m.title}`}>
                        <MoreHorizontal className="size-4" />
                      </button>
                    )}
                  >
                    {(close) => (
                      <>
                        <MenuItem
                          icon={<Pencil />}
                          onClick={() => {
                            close();
                            setRenaming(m);
                          }}
                        >
                          Renommer
                        </MenuItem>
                        <MenuItem
                          icon={<Copy />}
                          onClick={async () => {
                            close();
                            const nb = await store.load(m.id);
                            if (nb) await store.save({ ...nb, id: uid("n"), title: `${nb.title} (copie)`, createdAt: Date.now(), updatedAt: Date.now() });
                            await onRefresh();
                          }}
                        >
                          Dupliquer
                        </MenuItem>
                        <MenuItem
                          icon={<FileDown />}
                          onClick={async () => {
                            close();
                            const nb = await store.load(m.id);
                            if (nb) await saveFile(`${safeName(nb.title)}.cahier.json`, makeExport([nb]), "application/json");
                          }}
                        >
                          Sauvegarder (.json)
                        </MenuItem>
                        <MenuItem
                          icon={<Trash2 />}
                          danger
                          onClick={() => {
                            close();
                            setDeleting(m);
                          }}
                        >
                          Supprimer
                        </MenuItem>
                      </>
                    )}
                  </Popover>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-10 text-center text-xs text-muted-foreground">
          {sync && sync !== "local" && sync !== "readonly"
            ? "Copie de travail sur cet appareil, synchronisée avec votre espace privé claude.ai. « Tout sauvegarder » en garde en plus une copie en fichier."
            : "Les cahiers sont enregistrés dans ce navigateur, sur cet appareil. Utilisez « Tout sauvegarder » pour en garder une copie ou les transférer."}
        </p>
      </div>
      {renaming && (
        <RenameDialog
          title={renaming.title}
          onCancel={() => setRenaming(null)}
          onSave={async (t) => {
            const id = renaming.id;
            setRenaming(null);
            const nb = await store.load(id);
            if (nb) await store.save({ ...nb, title: t.trim() || "Sans titre", updatedAt: Date.now() });
            await onRefresh();
          }}
        />
      )}
      {deleting && (
        <Modal
          title="Supprimer le cahier"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setDeleting(null)}>
                Annuler
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  const id = deleting.id;
                  setDeleting(null);
                  await store.remove(id);
                  await onRefresh();
                }}
              >
                <Trash2 /> Supprimer
              </Button>
            </>
          }
        >
          <p className="text-sm">
            « {deleting.title} » ({deleting.pageCount} page{deleting.pageCount > 1 ? "s" : ""}) sera supprimé définitivement, sur tous vos appareils. Pour en garder une copie, sauvegardez-le d&apos;abord en fichier.
          </p>
        </Modal>
      )}
      {creating && (
        <NewNotebookDialog
          onCancel={() => setCreating(false)}
          onCreate={async (title, cover, paper, color) => {
            const nb = newNotebook(title, cover, paper, color);
            await store.save(nb);
            setCreating(false);
            await onRefresh();
            onOpen(nb.id);
          }}
        />
      )}
    </div>
  );
}

function NewNotebookDialog({ onCancel, onCreate }: { onCancel: () => void; onCreate: (title: string, cover: string, paper: PaperKind, color: PaperColor) => void }) {
  const [title, setTitle] = useState("");
  const [cover, setCover] = useState(COVERS[0]);
  const [paper, setPaper] = useState<PaperKind>("carreaux");
  const [color, setColor] = useState<PaperColor>("blanc");
  return (
    <Modal
      title="Nouveau cahier"
      onClose={onCancel}
      footer={
        <>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button onClick={() => onCreate(title || "Mécanique des structures", cover, paper, color)}>Créer</Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block text-[13px] font-medium">
          Titre
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onCreate(title || "Mécanique des structures", cover, paper, color)}
            placeholder="MS2 — Efforts internes"
            className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <div>
          <div className="mb-1.5 text-[13px] font-medium">Couverture</div>
          <div className="flex flex-wrap gap-2">
            {COVERS.map((c) => (
              <button key={c} type="button" onClick={() => setCover(c)} aria-label={`Couverture ${c}`} className={cn("size-9 cursor-pointer rounded-lg ring-1 ring-black/10", cover === c && "ring-2 ring-primary ring-offset-2 ring-offset-card")} style={{ background: c }} />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-[13px] font-medium">Papier</div>
          <PaperChooser value={paper} onChange={setPaper} />
          <div className="mt-2">
            <Segmented
              size="sm"
              value={color}
              onChange={setColor}
              options={[
                { value: "blanc", label: "Blanc" },
                { value: "creme", label: "Crème" },
                { value: "ardoise", label: "Ardoise" },
              ]}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

const SYNC_TEXT: Record<Exclude<SyncStatus, "local">, { text: string; tone: "ok" | "info" | "warn" }> = {
  connecting: { text: "Connexion à votre espace claude.ai…", tone: "info" },
  syncing: { text: "Synchronisation avec votre compte claude.ai…", tone: "info" },
  ok: { text: "Synchronisé avec votre compte claude.ai : vos cahiers vous suivent sur tous vos appareils. Cet espace est privé, personne d'autre ne peut le lire.", tone: "ok" },
  offline: { text: "Votre compte claude.ai ne répond pas pour l'instant : les cahiers restent enregistrés sur cet appareil et seront synchronisés plus tard.", tone: "warn" },
  readonly: { text: "Votre accès à cette page ne permet pas la synchronisation : les cahiers restent sur cet appareil. Pensez à les sauvegarder en fichier.", tone: "warn" },
  quota: { text: "Espace de synchronisation plein : supprimez d'anciens cahiers ou des PDF importés. Les modifications restent enregistrées sur cet appareil.", tone: "warn" },
};

function SyncBanner({ status }: { status: Exclude<SyncStatus, "local"> }) {
  const s = SYNC_TEXT[status];
  return (
    <div
      className={cn(
        "mb-4 flex items-start gap-2 rounded-xl border px-4 py-2.5 text-[13px]",
        s.tone === "ok" && "border-success/30 bg-success-soft text-success",
        s.tone === "info" && "border-border bg-card text-muted-foreground",
        s.tone === "warn" && "border-warning/40 bg-warning-soft text-warning",
      )}
      role="status"
    >
      {s.tone === "warn" ? <CloudOff className="mt-0.5 size-4 shrink-0" /> : <Cloud className="mt-0.5 size-4 shrink-0" />}
      <span>{s.text}</span>
    </div>
  );
}

function RenameDialog({ title, onSave, onCancel }: { title: string; onSave: (t: string) => void; onCancel: () => void }) {
  const [t, setT] = useState(title);
  return (
    <Modal
      title="Renommer le cahier"
      onClose={onCancel}
      footer={
        <>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button onClick={() => onSave(t)}>Renommer</Button>
        </>
      }
    >
      <input
        id="nb-rename"
        autoFocus
        value={t}
        onChange={(e) => setT(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSave(t)}
        aria-label="Titre du cahier"
        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
      />
    </Modal>
  );
}
