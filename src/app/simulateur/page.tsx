import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/layout/app-shell";
import { SimulatorTabs } from "@/components/simulator/simulator-tabs";

export const metadata: Metadata = {
  title: "Simulateur 2D",
  description: "Poutres, portiques et treillis : réactions, diagrammes N, T, M et déformée calculés par la méthode des déplacements.",
};

export default function SimulatorPage() {
  return (
    <Container className="max-w-7xl">
      <PageHeader
        eyebrow="Simulateur de structures 2D"
        title="Construisez, chargez, calculez"
        description="Les résultats sont calculés par la méthode des déplacements (poutres d'Euler–Bernoulli, élasticité linéaire) et, pour les poutres isostatiques, recoupés par les équations de la statique."
      />
      <SimulatorTabs />
    </Container>
  );
}
