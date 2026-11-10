"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui";
import { markAllNotificationsRead } from "@/app/actions/learning";

export function MarkReadButton() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button variant="outline" disabled={pending} onClick={() => start(async () => { await markAllNotificationsRead(); router.refresh(); })}>
      <CheckCheck /> Tout marquer comme lu
    </Button>
  );
}
