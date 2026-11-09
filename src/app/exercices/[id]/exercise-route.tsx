"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { ExercisePlayer } from "@/components/exercises/exercise-player";

export function ExerciseRoute({ id }: { id: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const raw = Number(params.get("seed"));
  const seed = Number.isInteger(raw) && raw > 0 ? raw : undefined;
  return (
    <ExercisePlayer
      key={seed ?? "random"}
      generatorId={id}
      initialSeed={seed}
      onSeedChange={(s) => router.replace(`/exercices/${id}?seed=${s}`, { scroll: false })}
    />
  );
}
