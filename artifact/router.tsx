/**
 * Routeur de la version « page unique » (publication sur claude.ai).
 *
 * Les pages de src/app sont réutilisées telles quelles : ce sont des
 * composants serveur sans hook, qu'on appelle comme des fonctions (async ou
 * non) pour obtenir leur arbre React.
 *
 * L'adresse courante vit dans le fragment de l'URL sous une forme que le
 * lecteur d'artefacts transmet (lettres, chiffres, tirets) :
 *   /                               ↔ #accueil
 *   /cours/rdm/fleche               ↔ #cours--rdm--fleche
 *   /exercices/unites?seed=4821     ↔ #exercices--unites--4821
 */
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/app-shell";
import { Button } from "@/components/ui";

import * as HomePage from "@/app/page";
import * as CoursesPage from "@/app/cours/page";
import * as ModulePage from "@/app/cours/[module]/page";
import * as ExamPage from "@/app/cours/[module]/examen/page";
import * as ChapterPage from "@/app/cours/[module]/[chapitre]/page";
import * as ExercisesPage from "@/app/exercices/page";
import * as ExercisePage from "@/app/exercices/[id]/page";
import * as SimulatorPage from "@/app/simulateur/page";
import * as DashboardPage from "@/app/tableau-de-bord/page";
import * as TutorPage from "@/app/tuteur/page";

import { decodeHash, encodePath } from "./paths";

export { decodeHash, encodePath };

/** Résout un lien relatif ou absolu du site en chemin interne ("/cours?x=1"). */
function normalize(href: string): string {
  try {
    const u = new URL(href, "https://structura.local" + current.split("?")[0]);
    return u.pathname + u.search;
  } catch {
    return "/";
  }
}

/* ------------------------------------------------------------------ */
/*                          Store de navigation                         */
/* ------------------------------------------------------------------ */
let current = typeof location === "undefined" ? "/" : decodeHash(location.hash);
const listeners = new Set<() => void>();

function setCurrent(path: string) {
  if (path === current) return;
  current = path;
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useLocation(): string {
  return useSyncExternalStore(subscribe, () => current, () => current);
}

export interface NavigateOptions {
  replace?: boolean;
  scroll?: boolean;
}

export function navigate(href: string, { replace = false, scroll = true }: NavigateOptions = {}) {
  const path = normalize(href);
  const hash = "#" + encodePath(path);
  if (replace) {
    try {
      history.replaceState(history.state, "", hash);
    } catch {
      location.replace(hash);
    }
  } else if (location.hash !== hash) {
    location.hash = hash;
  }
  setCurrent(path);
  if (scroll) window.scrollTo(0, 0);
}

let installed = false;
/** Écoute le fragment et intercepte les liens internes rendus hors de <Link> (Markdown, réponses du tuteur). */
export function installNavigation() {
  if (installed) return;
  installed = true;
  window.addEventListener("hashchange", () => {
    const path = decodeHash(location.hash);
    if (path !== current) {
      setCurrent(path);
      window.scrollTo(0, 0);
    }
  });
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.("a");
    if (!a || a.hasAttribute("data-spa-link")) return;
    const href = a.getAttribute("href");
    if (!href) return;
    if (href.startsWith("#")) {
      // ancre interne à la page (sommaire d'un chapitre)
      const el = document.getElementById(decodeURIComponent(href.slice(1)));
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      }
      return;
    }
    if (href.startsWith("/") && !href.startsWith("//")) {
      e.preventDefault();
      navigate(href);
    }
  });
}

/* ------------------------------------------------------------------ */
/*                               Pages                                  */
/* ------------------------------------------------------------------ */
export class NotFoundError extends Error {
  constructor() {
    super("NEXT_NOT_FOUND");
    this.name = "NotFoundError";
  }
}

type Params = Record<string, string>;
interface PageModule {
  default: (props: { params: Promise<Params>; searchParams: Promise<Params> }) => ReactNode | Promise<ReactNode>;
  metadata?: { title?: unknown };
  generateMetadata?: (props: { params: Promise<Params> }) => Promise<{ title?: unknown }>;
}

function match(pathname: string): { mod: PageModule; params: Params } | null {
  const s = pathname.split("/").filter(Boolean);
  const m = (mod: unknown, params: Params = {}) => ({ mod: mod as PageModule, params });
  if (s.length === 0) return m(HomePage);
  switch (s[0]) {
    case "cours":
      if (s.length === 1) return m(CoursesPage);
      if (s.length === 2) return m(ModulePage, { module: s[1] });
      if (s.length === 3 && s[2] === "examen") return m(ExamPage, { module: s[1] });
      if (s.length === 3) return m(ChapterPage, { module: s[1], chapitre: s[2] });
      return null;
    case "exercices":
      if (s.length === 1) return m(ExercisesPage);
      if (s.length === 2) return m(ExercisePage, { id: s[1] });
      return null;
    case "simulateur":
      return s.length === 1 ? m(SimulatorPage) : null;
    case "tableau-de-bord":
      return s.length === 1 ? m(DashboardPage) : null;
    case "tuteur":
      return s.length === 1 ? m(TutorPage) : null;
  }
  return null;
}

const SITE_TITLE = "STRUCTURA — Mécanique des structures";

function NotFound() {
  return (
    <Container className="max-w-2xl">
      <div className="space-y-4 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Page introuvable</p>
        <h1 className="text-2xl font-bold tracking-tight">Cette page n&apos;existe pas (ou plus).</h1>
        <p className="text-muted-foreground">Le lien est peut-être incomplet. Repartez de l&apos;accueil ou du programme des cours.</p>
        <div className="flex justify-center gap-2">
          <Button asChild>
            <Link href="/">Accueil</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/cours">Cours</Link>
          </Button>
        </div>
      </div>
    </Container>
  );
}

async function resolve(loc: string): Promise<{ node: ReactNode; title: string }> {
  const [pathname, query = ""] = loc.split("?");
  const found = match(pathname);
  if (!found) return { node: <NotFound />, title: "Page introuvable · STRUCTURA" };
  const params = Promise.resolve(found.params);
  try {
    const node = await found.mod.default({ params, searchParams: Promise.resolve(Object.fromEntries(new URLSearchParams(query))) });
    const meta = found.mod.generateMetadata ? await found.mod.generateMetadata({ params }) : found.mod.metadata;
    const t = typeof meta?.title === "string" ? meta.title : null;
    return { node, title: t ? `${t} · STRUCTURA` : SITE_TITLE };
  } catch (e) {
    if (e instanceof NotFoundError) return { node: <NotFound />, title: "Page introuvable · STRUCTURA" };
    throw e;
  }
}

export function RouteView() {
  const loc = useLocation();
  const [view, setView] = useState<ReactNode>(null);
  useEffect(() => {
    let alive = true;
    resolve(loc).then(
      ({ node, title }) => {
        if (!alive) return;
        document.title = title;
        setView(node);
      },
      (err) => {
        console.error(err);
        if (alive) setView(<NotFound />);
      },
    );
    return () => {
      alive = false;
    };
  }, [loc]);
  return <>{view}</>;
}
