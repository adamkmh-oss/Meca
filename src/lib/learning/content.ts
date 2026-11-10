import "server-only";
/** Lecture des contenus de la base (toujours via le client de l'utilisateur : la RLS filtre). */
import { cache } from "react";
import { supabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { SubjectRow } from "./stats";

export const getSubjects = cache(async (): Promise<SubjectRow[]> => {
  if (!supabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("subjects").select("id, slug, title, description, icon, position, status, builtin_modules").order("position");
  return (data ?? []) as SubjectRow[];
});

export const getSubject = cache(async (slug: string) => {
  if (!supabaseConfigured || !/^[a-z0-9-]{1,60}$/.test(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("subjects")
    .select("id, slug, title, description, icon, position, status, builtin_modules, chapters(id, slug, title, summary, level, position, status, lessons(id, slug, kind, title, summary, estimated_minutes, position, status), exercises(id, title, difficulty, position, status))")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const chapters = (data.chapters ?? [])
    .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
    .map((c: { lessons: { position: number }[]; exercises: { position: number }[] }) => ({
      ...c,
      lessons: [...c.lessons].sort((a, b) => a.position - b.position),
      exercises: [...c.exercises].sort((a, b) => a.position - b.position),
    }));
  return { ...data, chapters } as unknown as SubjectRow & {
    chapters: {
      id: string;
      slug: string;
      title: string;
      summary: string;
      level: "debutant" | "intermediaire" | "avance";
      status: string;
      lessons: { id: string; slug: string; kind: "cours" | "fiche"; title: string; summary: string; estimated_minutes: number; status: string }[];
      exercises: { id: string; title: string; difficulty: "debutant" | "intermediaire" | "avance"; status: string }[];
    }[];
  };
});

export async function isFavorite(itemKey: string): Promise<boolean> {
  if (!supabaseConfigured) return false;
  const supabase = await createClient();
  const { data } = await supabase.from("favorites").select("item_key").eq("item_key", itemKey).maybeSingle();
  return Boolean(data);
}
