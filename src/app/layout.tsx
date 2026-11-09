import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "katex/dist/katex.min.css";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: {
    default: "STRUCTURA — Mécanique des structures",
    template: "%s · STRUCTURA",
  },
  description:
    "Plateforme interactive pour apprendre la mécanique des structures en BUT Génie Civil – Construction Durable : cours, simulateur 2D, exercices corrigés.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fc" },
    { media: "(prefers-color-scheme: dark)", color: "#060b1a" },
  ],
};

// Applique le thème avant le premier rendu (évite le flash clair/sombre).
const themeScript = `(function(){try{var t=localStorage.getItem("structura:theme");if(!t){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
