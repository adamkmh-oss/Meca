/**
 * Point d'entrée de la version page unique de STRUCTURA, publiée comme
 * artefact claude.ai (voir artifact/README.md).
 */
import "katex/dist/katex.min.css";
import "@/app/globals.css";
import "./artifact.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "@/components/layout/app-shell";
import { RouteView, installNavigation } from "./router";

installNavigation();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppShell offline>
      <RouteView />
    </AppShell>
  </StrictMode>,
);
