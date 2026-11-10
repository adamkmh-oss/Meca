/**
 * Rôles et permissions (miroir en lecture des tables roles / role_permissions,
 * utilisé pour l'affichage). La source de vérité est la base : toute
 * vérification d'accès passe par le serveur et la RLS.
 */
export type AppRole = "student" | "teacher" | "admin";
export type Permission =
  | "learning.track"
  | "reports.create"
  | "ai.use"
  | "content.read_drafts"
  | "content.write"
  | "content.publish"
  | "subjects.manage"
  | "documents.manage"
  | "reports.moderate"
  | "stats.read"
  | "users.read"
  | "users.manage"
  | "audit.read";

export const ROLE_LABEL: Record<AppRole, string> = { student: "Étudiant", teacher: "Enseignant", admin: "Administrateur" };

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  student: ["learning.track", "reports.create", "ai.use"],
  teacher: ["learning.track", "reports.create", "ai.use", "content.read_drafts", "content.write", "content.publish", "documents.manage", "reports.moderate", "stats.read"],
  admin: [
    "learning.track", "reports.create", "ai.use", "content.read_drafts", "content.write", "content.publish", "documents.manage",
    "reports.moderate", "stats.read", "subjects.manage", "users.read", "users.manage", "audit.read",
  ],
};

export const STAFF_PERMISSIONS: Permission[] = ["content.write", "documents.manage", "reports.moderate", "stats.read", "users.read"];

export function isStaff(perms: readonly string[]): boolean {
  return STAFF_PERMISSIONS.some((p) => perms.includes(p));
}

export const STUDY_YEARS = [
  { value: "BUT1", label: "BUT 1re année" },
  { value: "BUT2", label: "BUT 2e année" },
  { value: "BUT3", label: "BUT 3e année" },
  { value: "autre", label: "Autre" },
] as const;
export type StudyYear = (typeof STUDY_YEARS)[number]["value"];
