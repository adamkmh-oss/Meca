import type { Metadata, Viewport } from "next";
import { NotebookApp } from "@/components/notebook/notebook-app";

export const metadata: Metadata = {
  title: "Cahier de mécanique",
  description:
    "Prise de notes manuscrite pour la mécanique des structures : stylo, surligneur, gomme, lasso, formes, texte et formules, appuis et charges préfaits, coupures, PFS et diagrammes N, T, M calculés.",
};

// L'application gère elle-même le zoom (pincement sur la page) : pas de zoom du navigateur.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function CahierPage() {
  return <NotebookApp homeHref="/" />;
}
