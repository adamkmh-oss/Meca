"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  Bot,
  BookOpen,
  FileText,
  FlaskConical,
  Flame,
  Home,
  Library,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  NotebookTabs,
  PenLine,
  Shield,
  Sparkles,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { useViewer, type Viewer } from "./viewer";
import { ROLE_LABEL, isStaff } from "@/lib/auth/permissions";
import { TutorLauncher } from "@/components/tutor/tutor-launcher";
import { cn } from "@/lib/utils";
import { levelFromXp, streak, useProgress } from "@/lib/progress/store";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
}

/** Navigation selon le contexte : visiteur, étudiant connecté, équipe pédagogique, version hors ligne. */
function navFor(viewer: Viewer | null, offline: boolean): NavItem[] {
  if (offline) {
    return [
      { href: "/", label: "Accueil", icon: Home, exact: true },
      { href: "/tableau-de-bord", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/cours", label: "Cours", icon: BookOpen },
      { href: "/simulateur", label: "Simulateur", icon: FlaskConical },
      { href: "/exercices", label: "Exercices", icon: PenLine },
      { href: "/tuteur", label: "Tuteur IA", icon: Bot },
    ];
  }
  const items: NavItem[] = [
    { href: "/", label: "Accueil", icon: Home, exact: true },
    viewer ? { href: "/espace", label: "Mon espace", icon: LayoutDashboard } : { href: "/tableau-de-bord", label: "Ma progression", icon: LayoutDashboard },
    { href: "/matieres", label: "Matières", icon: Library },
    { href: "/cours", label: "Cours de mécanique", icon: BookOpen },
    { href: "/simulateur", label: "Simulateur", icon: FlaskConical },
    { href: "/exercices", label: "Exercices", icon: PenLine },
    { href: "/fiches", label: "Fiches de révision", icon: NotebookTabs },
  ];
  if (viewer) items.push({ href: "/ressources", label: "Ressources", icon: FileText });
  items.push({ href: "/tuteur", label: "Tuteur IA", icon: Bot });
  if (viewer && isStaff(viewer.permissions)) items.push({ href: "/admin", label: "Administration", icon: Shield });
  return items;
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="STRUCTURA — accueil">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-[#0b1530] dark:fill-[#1a2a5c]" />
        <path d="M6 22 L16 9 L26 22 Z" fill="none" stroke="#4d84ff" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M6 22 H26 M16 9 V22 M11 15.5 L16 22 L21 15.5" fill="none" stroke="#ffffff" strokeWidth="1.3" strokeLinejoin="round" opacity="0.9" />
      </svg>
      <span className="text-[15px] font-bold tracking-[0.14em]">STRUCTURA</span>
    </Link>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("structura:theme", next);
    } catch {}
    setTheme(next);
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className={cn("inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer", className)}
      aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
      title={theme === "dark" ? "Mode clair" : "Mode sombre"}
    >
      {theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  );
}

function XpPill() {
  const s = useProgress();
  const lv = levelFromXp(s.xp);
  const st = streak(s);
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="inline-flex items-center gap-1 font-semibold text-warning" title="Série de jours d'apprentissage">
        <Flame className="size-4" /> {st.current}
      </span>
      <span className="inline-flex items-center gap-1 font-semibold text-primary" title={`Niveau ${lv.level}`}>
        <Sparkles className="size-4" /> {s.xp} XP
      </span>
    </div>
  );
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Navigation principale">
      {items.map((n) => {
        const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <n.icon className="size-[18px]" />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

function AccountBox({ viewer }: { viewer: Viewer | null }) {
  if (!viewer) {
    return (
      <div className="flex gap-2 px-1">
        <Link href="/connexion" className="flex-1 rounded-lg border border-border px-3 py-1.5 text-center text-sm font-medium hover:bg-muted">
          Connexion
        </Link>
        <Link href="/inscription" className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90">
          S&apos;inscrire
        </Link>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-1">
      <Link href="/compte" className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 hover:bg-muted" title="Mon compte">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <UserRound className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{viewer.displayName}</span>
          <span className="block text-[11px] text-muted-foreground">{ROLE_LABEL[viewer.role]}</span>
        </span>
      </Link>
      <NotificationsLink unread={viewer.unread} />
      <form action="/auth/deconnexion" method="post">
        <button type="submit" className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer" aria-label="Se déconnecter" title="Se déconnecter">
          <LogOut className="size-[18px]" />
        </button>
      </form>
    </div>
  );
}

function NotificationsLink({ unread }: { unread: number }) {
  return (
    <Link
      href="/espace/notifications"
      className="relative inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label={unread ? `Notifications : ${unread} non lue(s)` : "Notifications"}
    >
      <Bell className="size-[18px]" />
      {unread > 0 && (
        <span className="absolute right-1 top-1 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-bold leading-4 text-white">{unread > 9 ? "9+" : unread}</span>
      )}
    </Link>
  );
}

export function AppShell({ children, offline = false }: { children: React.ReactNode; offline?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const viewer = useViewer();
  const items = navFor(viewer, offline);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2 focus:shadow">
        Aller au contenu
      </a>
      {/* Barre latérale (ordinateur) */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 overflow-y-auto border-r border-border bg-card px-4 py-5 lg:flex">
        <div className="px-1">
          <Logo />
        </div>
        <NavLinks items={items} />
        <div className="mt-auto space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between px-1">
            <XpPill />
            <ThemeToggle />
          </div>
          {!offline && <AccountBox viewer={viewer} />}
          <p className="px-1 text-[11px] leading-snug text-muted-foreground">BUT Génie Civil – Construction Durable</p>
        </div>
      </aside>

      {/* Barre supérieure (mobile, tablette) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur lg:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          <XpPill />
          {viewer && !offline && <NotificationsLink unread={viewer.unread} />}
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted cursor-pointer"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-x-0 top-14 z-20 max-h-[calc(100dvh-3.5rem)] space-y-3 overflow-y-auto border-b border-border bg-card p-3 shadow-lg lg:hidden">
          <NavLinks items={items} onNavigate={() => setOpen(false)} />
          {!offline && (
            <div className="border-t border-border pt-3">
              <AccountBox viewer={viewer} />
            </div>
          )}
        </div>
      )}

      <main id="contenu" className="min-w-0">
        {children}
      </main>
      <TutorLauncher />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1.5">
        {eyebrow && <div className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</div>}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10", className)}>{children}</div>;
}
