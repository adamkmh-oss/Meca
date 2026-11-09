import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/layout/app-shell";
import { TutorChat } from "@/components/tutor/tutor-chat";
import { Card, CardContent } from "@/components/ui";

export const metadata: Metadata = {
  title: "Tuteur IA",
  description: "Assistant pédagogique de mécanique des structures : explications, indices, vérification de raisonnements et calculs vérifiés par le moteur.",
};

export default function TutorPage() {
  return (
    <Container className="max-w-4xl">
      <PageHeader
        eyebrow="Tuteur IA"
        title="Posez vos questions de mécanique"
        description="Le tuteur connaît le cours, les corrigés de TD et leurs conventions. Il explique, donne des indices sans révéler la solution, repère les erreurs de raisonnement et vérifie chaque valeur avec le moteur de calcul."
      />
      <Card>
        <CardContent className="pt-4">
          <TutorChat variant="page" />
        </CardContent>
      </Card>
    </Container>
  );
}
