import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/layout/app-shell";
import { ExerciseBank } from "@/components/exercises/exercise-bank";

export const metadata: Metadata = {
  title: "Exercices",
  description: "Banque d'exercices de mécanique des structures à données variables, avec correction détaillée.",
};

export default function ExercisesPage() {
  return (
    <Container>
      <PageHeader
        eyebrow="Banque d'exercices"
        title="S'entraîner, se tromper, comprendre"
        description="Saisissez vos résultats : la correction indique ce qui est juste, propose des indices, puis détaille le raisonnement en six étapes, de la mise en équation à la vérification."
      />
      <ExerciseBank />
    </Container>
  );
}
