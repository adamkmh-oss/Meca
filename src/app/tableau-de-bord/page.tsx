import type { Metadata } from "next";
import { Container } from "@/components/layout/app-shell";
import { Dashboard } from "@/components/dashboard/dashboard";

export const metadata: Metadata = { title: "Tableau de bord" };

export default function DashboardPage() {
  return (
    <Container>
      <Dashboard />
    </Container>
  );
}
