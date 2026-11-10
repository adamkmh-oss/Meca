import Link from "next/link";
import type { ReactNode } from "react";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-md flex-col justify-center px-4 py-10 lg:min-h-dvh">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div>}
      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link href="/confidentialite" className="underline underline-offset-2">
          Confidentialité
        </Link>{" "}
        ·{" "}
        <Link href="/mentions-legales" className="underline underline-offset-2">
          Mentions légales
        </Link>
      </p>
    </div>
  );
}
