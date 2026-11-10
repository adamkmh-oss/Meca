/** Temps d'étude (envoyé par le navigateur toutes les minutes ou à la fermeture de l'onglet). */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sameOrigin } from "@/lib/security/request";
import { supabaseConfigured } from "@/lib/env";

const Body = z.object({ itemKey: z.string().regex(/^(chapter|lesson):[A-Za-z0-9_-]{1,80}$/), seconds: z.number().int().min(1).max(600) });

export async function POST(request: Request) {
  if (!supabaseConfigured) return new NextResponse(null, { status: 204 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "origine refusée" }, { status: 403 });
  const text = await request.text();
  if (text.length > 500) return NextResponse.json({ error: "requête trop volumineuse" }, { status: 413 });
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(JSON.parse(text));
  } catch {
    return NextResponse.json({ error: "requête invalide" }, { status: 400 });
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  await supabase.rpc("track_time", { p_item_key: body.itemKey, p_seconds: body.seconds });
  return new NextResponse(null, { status: 204 });
}
