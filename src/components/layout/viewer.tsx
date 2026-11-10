"use client";
/**
 * Informations non sensibles sur la personne connectée, transmises par le
 * serveur aux composants client (aucun jeton, aucune donnée d'autrui).
 */
import { createContext, useContext, type ReactNode } from "react";
import type { AppRole, Permission } from "@/lib/auth/permissions";

export interface Viewer {
  id: string;
  displayName: string;
  role: AppRole;
  permissions: Permission[];
  unread: number;
}

const Ctx = createContext<Viewer | null>(null);

export function ViewerProvider({ viewer, children }: { viewer: Viewer | null; children: ReactNode }) {
  return <Ctx.Provider value={viewer}>{children}</Ctx.Provider>;
}

/** null : visiteur non connecté (ou comptes non configurés). */
export function useViewer(): Viewer | null {
  return useContext(Ctx);
}
