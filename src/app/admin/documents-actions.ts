"use server";
/**
 * Dépôt de documents en deux temps (compatible avec les limites des
 * fonctions serverless) :
 *  1. prepareUpload : droits + contrôle déclaratif, nom généré par le
 *     serveur (uploads/AAAA/<uuid>.<ext>), URL de dépôt signée à usage unique ;
 *  2. finalizeUpload : relecture du fichier déposé, contrôle de la signature
 *     binaire, empreinte SHA-256, antivirus éventuel, puis enregistrement en
 *     brouillon. En cas d'échec, le fichier est supprimé.
 */
import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionUser, ActionError, dbErrorMessage, type ActionResult } from "@/lib/auth/dal";
import { checkContent, checkDeclared, type AllowedExt, ALLOWED } from "@/lib/security/files";
import { scanBuffer } from "@/lib/security/antivirus";
import { serverEnv } from "@/lib/env.server";
import { throttle } from "@/lib/security/rate-limit";

const PATH = /^uploads\/[0-9]{4}\/[0-9a-f-]{36}\.(pdf|png|jpg|webp)$/;

export async function prepareUpload(input: { filename: string; mime: string; size: number }): Promise<ActionResult<{ path: string; signedUrl: string }>> {
  try {
    const p = z.object({ filename: z.string().min(1).max(200), mime: z.string().max(100), size: z.number().int() }).parse(input);
    const { supabase, session } = await actionUser("documents.manage");
    if (!(await throttle("upload", session.id, 30, 3600))) return { ok: false, error: "Trop de dépôts en peu de temps." };
    const check = checkDeclared(p.filename, p.mime, p.size);
    if (!check.ok) return { ok: false, error: check.error! };
    const path = `uploads/${new Date().getFullYear()}/${randomUUID()}.${check.ext}`;
    const { data, error } = await supabase.storage.from("documents").createSignedUploadUrl(path);
    if (error || !data) return { ok: false, error: "Dépôt refusé." };
    return { ok: true, data: { path, signedUrl: data.signedUrl } };
  } catch (e) {
    return { ok: false, error: e instanceof ActionError ? e.message : "Fichier invalide." };
  }
}

const finalizeSchema = z.object({
  path: z.string().regex(PATH),
  originalName: z.string().max(200),
  title: z.string().trim().min(2, "Titre requis.").max(160),
  description: z.string().max(1000).default(""),
  subjectId: z.uuid().optional().or(z.literal("")),
});

export async function finalizeUpload(input: z.input<typeof finalizeSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const p = finalizeSchema.parse(input);
    const { supabase } = await actionUser("documents.manage");
    const ext = p.path.split(".").pop() as AllowedExt;
    const remove = () => supabase.storage.from("documents").remove([p.path]);
    const { data: blob, error } = await supabase.storage.from("documents").download(p.path);
    if (error || !blob) return { ok: false, error: "Fichier introuvable : recommencez le dépôt." };
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const check = checkContent(bytes, ext);
    if (!check.ok) {
      await remove();
      return { ok: false, error: check.error! };
    }
    const av = await scanBuffer(bytes);
    if (serverEnv.clamavHost && (!av.scanned || !av.clean)) {
      await remove();
      return { ok: false, error: av.scanned ? "Fichier refusé par l'antivirus." : "Antivirus indisponible : dépôt annulé, réessayez plus tard." };
    }
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const { data, error: insErr } = await supabase
      .from("documents")
      .insert({
        storage_path: p.path,
        original_name: p.originalName.replace(/[^\p{L}\p{N} ._()-]/gu, "_").slice(0, 200),
        title: p.title,
        description: p.description,
        subject_id: p.subjectId || null,
        mime_type: ALLOWED[ext],
        size_bytes: bytes.length,
        sha256,
      })
      .select("id")
      .single();
    if (insErr) {
      await remove();
      return { ok: false, error: dbErrorMessage(insErr) };
    }
    revalidatePath("/admin/documents");
    return { ok: true, data: { id: data.id }, message: "Document déposé (en brouillon)." };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Formulaire invalide." };
    return { ok: false, error: e instanceof ActionError ? e.message : "Le dépôt n'a pas abouti." };
  }
}
