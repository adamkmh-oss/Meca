/**
 * Remplacements des modules serveur dans la version page unique (sans
 * comptes ni base de données) : aucune session, aucun favori, actions inertes.
 */
import type { ActionResult } from "@/lib/auth/dal";

const offline = async (): Promise<ActionResult<never>> => ({ ok: false, error: "Indisponible dans la version hors ligne." });

// @/lib/auth/dal
export const getSession = async () => null;
export const requireUser = async () => {
  throw new Error("Version hors ligne : pas de compte.");
};
export const requirePermission = requireUser;
export const actionUser = requireUser;
export class ActionError extends Error {}
export const dbErrorMessage = () => "Indisponible.";

// @/lib/learning/content
export const isFavorite = async () => false;
export const getSubjects = async () => [];
export const getSubject = async () => null;

// @/app/actions/learning et @/app/actions/exercises
export const saveGeneratorAttempt = offline;
export const saveQuizAttempt = offline;
export const saveExamAttempt = offline;
export const trackChapterView = offline;
export const markChapterDone = offline;
export const trackLessonView = offline;
export const toggleFavorite = offline;
export const createReport = offline;
export const markAllNotificationsRead = offline;
export const submitExercise = offline;
