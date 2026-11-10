"use server";
/** Exercices de la base : correction par la fonction submit_attempt (réponses jamais exposées avant). */
import { z } from "zod";
import { actionUser, ActionError, dbErrorMessage, type ActionResult } from "@/lib/auth/dal";

const responses = z.record(
  z.uuid(),
  z.union([
    z.object({ choices: z.array(z.uuid()).max(20) }),
    z.object({ value: z.number().finite().nullable() }),
    z.object({ text: z.string().max(4000) }),
  ]),
);

export interface GradeResult {
  score: number;
  max: number;
  results: {
    question_id: string;
    kind: "qcm" | "numeric" | "free";
    correct: boolean | null;
    points: number;
    earned: number;
    correct_answer_ids: string[] | null;
    expected_value: number | null;
    unit: string;
    model_answer_md: string;
    explanation_md: string;
  }[];
  correction: Record<string, string> | null;
}

export async function submitExercise(input: { exerciseId: string; responses: Record<string, unknown>; durationSeconds?: number }): Promise<ActionResult<GradeResult>> {
  try {
    const p = z.object({ exerciseId: z.uuid(), responses, durationSeconds: z.number().int().min(0).max(86400).optional() }).parse(input);
    const { supabase } = await actionUser("learning.track");
    const { data, error } = await supabase.rpc("submit_attempt", { p_exercise_id: p.exerciseId, p_responses: p.responses, p_duration_seconds: p.durationSeconds ?? null });
    if (error) return { ok: false, error: dbErrorMessage(error, "La correction n'a pas pu être enregistrée.") };
    return { ok: true, data: data as GradeResult };
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, error: e.message };
    return { ok: false, error: "Réponses invalides." };
  }
}
