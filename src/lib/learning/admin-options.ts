import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Liste « Matière › Chapitre » pour les sélecteurs de l'administration. */
export async function chapterOptions(supabase: SupabaseClient) {
  const { data } = await supabase.from("chapters").select("id, title, position, subject:subjects(title, position)").order("position");
  return ((data ?? []) as unknown as { id: string; title: string; position: number; subject: { title: string; position: number } }[])
    .sort((a, b) => a.subject.position - b.subject.position || a.position - b.position)
    .map((c) => ({ id: c.id, label: `${c.subject.title} › ${c.title}` }));
}
