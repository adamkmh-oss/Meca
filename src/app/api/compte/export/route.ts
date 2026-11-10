/** Droit d'accès et à la portabilité (RGPD) : export JSON de toutes ses données. */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/env";

export async function GET() {
  if (!supabaseConfigured) return new NextResponse("Indisponible", { status: 404 });
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const { data, error } = await supabase.rpc("export_my_data");
  if (error) return NextResponse.json({ error: "export impossible" }, { status: 500 });
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="structura-mes-donnees-${date}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
