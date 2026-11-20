/**
 * Point d'entrée de la version page unique du cahier de mécanique
 * (artefact claude.ai) : l'application seule, plein écran.
 */
import "katex/dist/katex.min.css";
import "@/app/globals.css";
import "./artifact.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { NotebookApp } from "@/components/notebook/notebook-app";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NotebookApp />
  </StrictMode>,
);
