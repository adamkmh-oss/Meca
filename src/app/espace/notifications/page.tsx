import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Container, PageHeader } from "@/components/layout/app-shell";
import { Badge, Card, CardContent } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { MarkReadButton } from "./mark-read";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  await requireUser("/espace/notifications");
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("id, kind, title, body, href, read_at, created_at").order("created_at", { ascending: false }).limit(100);
  const unread = (data ?? []).filter((n) => !n.read_at).length;
  return (
    <Container className="max-w-3xl">
      <Link href="/espace" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Mon espace
      </Link>
      <PageHeader title="Notifications" description={unread ? `${unread} non lue(s).` : "Tout est lu."} actions={unread ? <MarkReadButton /> : undefined} />
      <Card>
        <CardContent className="divide-y divide-border pt-2">
          {!data?.length && <p className="py-6 text-center text-sm text-muted-foreground">Aucune notification.</p>}
          {data?.map((n) => (
            <div key={n.id} className="space-y-1 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{n.title}</span>
                {!n.read_at && <Badge>nouveau</Badge>}
              </div>
              {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>{new Date(n.created_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" })}</span>
                {n.href && (
                  <Link href={n.href} className="text-primary hover:underline">
                    Ouvrir
                  </Link>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </Container>
  );
}
