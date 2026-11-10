/**
 * Téléchargement d'un document : droits vérifiés (RLS sur documents et sur
 * storage.objects), puis redirection vers une URL signée valable 60 s.
 * Les fichiers ne sont jamais publics.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/env";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!supabaseConfigured || !z.uuid().safeParse(id).success) return new NextResponse("Introuvable", { status: 404 });
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.redirect(new URL(`/connexion?next=/ressources`, request.url));
  const { data: doc } = await supabase.from("documents").select("storage_path, original_name").eq("id", id).maybeSingle();
  if (!doc) return new NextResponse("Introuvable", { status: 404 });
  const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.storage_path, 60, { download: false });
  if (error || !data) return new NextResponse("Introuvable", { status: 404 });
  return NextResponse.redirect(data.signedUrl, { status: 302, headers: { "Cache-Control": "private, no-store" } });
}
