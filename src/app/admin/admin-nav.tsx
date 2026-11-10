"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Vue d'ensemble", perm: "stats.read", exact: true },
  { href: "/admin/contenus", label: "Contenus", perm: "content.write" },
  { href: "/admin/documents", label: "Documents", perm: "documents.manage" },
  { href: "/admin/signalements", label: "Signalements", perm: "reports.moderate" },
  { href: "/admin/utilisateurs", label: "Utilisateurs", perm: "users.read" },
  { href: "/admin/journal", label: "Journal d'audit", perm: "audit.read" },
];

export function AdminNav({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-border pb-px" aria-label="Administration">
      {ITEMS.filter((i) => permissions.includes(i.perm)).map((i) => {
        const active = i.exact ? pathname === i.href : pathname.startsWith(i.href) || (i.href === "/admin/contenus" && /^\/admin\/(matieres|chapitres|lecons|exercices)/.test(pathname));
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn("shrink-0 border-b-2 px-3 py-2 text-sm font-medium", active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
