"use client";
/**
 * Impression / export PDF : toutes les pages sont rendues à taille réelle
 * (A4, 96 ppp) dans un conteneur dédié, seul visible à l'impression.
 * Repli : export d'une page HTML autonome à imprimer depuis le navigateur.
 */
import { createPortal } from "react-dom";
import type { Notebook } from "@/lib/notebook/types";
import { PageView } from "./page-view";

export function PrintArea({ notebook }: { notebook: Notebook }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="nb-print" aria-hidden>
      {notebook.pages.map((p) => (
        <div key={p.id} className={`nb-print-page ${p.orientation === "paysage" ? "paysage" : ""}`}>
          <PageView page={p} />
        </div>
      ))}
    </div>,
    document.body,
  );
}

export function printNotebook(done: () => void) {
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    window.removeEventListener("afterprint", finish);
    done();
  };
  window.addEventListener("afterprint", finish);
  try {
    window.print();
  } catch {
    finish();
  }
  // Certains navigateurs n'émettent pas « afterprint » (ou bloquent l'impression).
  setTimeout(finish, 1500);
}

/** Page HTML autonome (styles inclus) de la zone d'impression actuellement rendue. */
export function printableHtml(title: string): string | null {
  const area = document.querySelector(".nb-print");
  if (!area) return null;
  let css = "";
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) css += rule.cssText + "\n";
    } catch {
      /* feuille externe illisible : ignorée */
    }
  }
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  return `<!doctype html><html lang="fr" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${css.replace(/<\/style/gi, "<\\/style")}</style><style>body{margin:0;background:#e5e7eb}.nb-print{display:block!important}.nb-print-page{margin:12px auto;box-shadow:0 1px 4px rgba(0,0,0,.2)}@media print{body{background:none}.nb-print-page{margin:0;box-shadow:none}}</style></head><body>${area.outerHTML.replace(' aria-hidden="true"', "")}</body></html>`;
}
