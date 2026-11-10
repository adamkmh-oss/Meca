"use client";
import { useState, useTransition } from "react";
import { CircleCheck, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { useViewer } from "@/components/layout/viewer";
import { trackLessonView } from "@/app/actions/learning";

export function CompleteButton({ lessonId }: { lessonId: string }) {
  const viewer = useViewer();
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  if (!viewer) return <span />;
  if (done)
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
        <CircleCheck className="size-4" /> Leçon terminée
      </span>
    );
  return (
    <Button variant="secondary" disabled={pending} onClick={() => start(async () => { const r = await trackLessonView(lessonId, true); if (r.ok) setDone(true); })}>
      {pending ? <LoaderCircle className="animate-spin" /> : <CircleCheck />} Marquer comme terminée
    </Button>
  );
}
