"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, FlaskConical, Flame, Home, LayoutDashboard, Menu, Moon, PenLine, Sparkles, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { levelFromXp, streak, useProgress } from "@/lib/progress/store";

const NAV = [
  { href: "/", label: "Accueil", icon: Home, exact: true },
  { href: "/tableau-de-bord", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/cours", label: "Cours", icon: BookOpen },
  { href: "/simulateur", label: "Simulateur", icon: FlaskConical },
  { href: "/exercices", label: "Exercices", icon: PenLine },
];

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

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((n) => {
        const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      {/* Barre latérale (ordinateur) */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-border bg-card px-4 py-5 lg:flex">
        <div className="px-1">
          <Logo />
        </div>
        <NavLinks />
        <div className="mt-auto space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between px-1">
            <XpPill />
            <ThemeToggle />
          </div>
          <p className="px-1 text-[11px] leading-snug text-muted-foreground">BUT Génie Civil – Construction Durable</p>
        </div>
      </aside>

      {/* Barre supérieure (mobile, tablette) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur lg:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          <XpPill />
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
        <div className="fixed inset-x-0 top-14 z-20 border-b border-border bg-card p-3 shadow-lg lg:hidden">
          <NavLinks onNavigate={() => setOpen(false)} />
        </div>
      )}

      <main className="min-w-0">{children}</main>
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
