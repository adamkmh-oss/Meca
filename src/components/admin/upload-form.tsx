"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Upload } from "lucide-react";
import { Button, Callout, Input, Label, Select } from "@/components/ui";
import { finalizeUpload, prepareUpload } from "@/app/admin/documents-actions";

export function UploadForm({ subjects }: { subjects: { id: string; title: string }[] }) {
  const router = useRouter();
  const file = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = file.current?.files?.[0];
    if (!f) return setMsg({ ok: false, text: "Choisissez un fichier." });
    setBusy(true);
    setMsg(null);
    try {
      const prep = await prepareUpload({ filename: f.name, mime: f.type, size: f.size });
      if (!prep.ok || !prep.data) return setMsg({ ok: false, text: prep.ok ? "Dépôt refusé." : prep.error });
      const put = await fetch(prep.data.signedUrl, { method: "PUT", headers: { "Content-Type": f.type, "x-upsert": "false" }, body: f });
      if (!put.ok) return setMsg({ ok: false, text: "L'envoi du fichier a échoué." });
      const fin = await finalizeUpload({ path: prep.data.path, originalName: f.name, title: title || f.name, description, subjectId });
      setMsg({ ok: fin.ok, text: fin.ok ? (fin.message ?? "Déposé.") : fin.error });
      if (fin.ok) {
        setTitle("");
        setDescription("");
        if (file.current) file.current.value = "";
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="doc-file">Fichier (PDF, PNG, JPEG, WebP · 20 Mo max.)</Label>
          <Input id="doc-file" ref={file} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="doc-title">Titre</Label>
          <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="ex. Formulaire de RDM" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="doc-subject">Matière</Label>
          <Select id="doc-subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">Générale</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="doc-desc">Description</Label>
          <Input id="doc-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
        </div>
      </div>
      {msg && <Callout tone={msg.ok ? "success" : "danger"}>{msg.text}</Callout>}
      <Button type="submit" disabled={busy}>
        {busy ? <LoaderCircle className="animate-spin" /> : <Upload />} Déposer
      </Button>
    </form>
  );
}
