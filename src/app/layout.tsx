import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "katex/dist/katex.min.css";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { ViewerProvider, type Viewer } from "@/components/layout/viewer";
import { getSession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: "STRUCTURA — Apprendre le génie civil",
    template: "%s · STRUCTURA",
  },
  description:
    "Plateforme d'apprentissage du BUT Génie Civil – Construction Durable : mécanique des structures, RDM, statique, béton armé, géotechnique, thermique… Cours, simulateurs, exercices corrigés et suivi de progression.",
  applicationName: "STRUCTURA",
  openGraph: { type: "website", locale: "fr_FR", siteName: "STRUCTURA" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fc" },
    { media: "(prefers-color-scheme: dark)", color: "#060b1a" },
  ],
};

// Applique le thème avant le premier rendu (évite le flash clair/sombre).
const themeScript = `(function(){try{var t=localStorage.getItem("structura:theme");if(!t){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})()`;

async function loadViewer(): Promise<Viewer | null> {
  const s = await getSession();
  if (!s || s.mfaPending || s.status !== "active") return null;
  const supabase = await createClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  return { id: s.id, displayName: s.displayName, role: s.role, permissions: s.permissions, unread: count ?? 0 };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const viewer = await loadViewer();
  return (
    <html lang="fr" data-theme="light" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <ViewerProvider viewer={viewer}>
          <AppShell>{children}</AppShell>
        </ViewerProvider>
      </body>
    </html>
  );
}
