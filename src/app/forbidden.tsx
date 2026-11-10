import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Container } from "@/components/layout/app-shell";

export default function Forbidden() {
  return (
    <Container className="max-w-xl">
      <div className="space-y-3 py-16 text-center">
        <ShieldAlert className="mx-auto size-10 text-danger" />
        <h1 className="text-2xl font-bold">Accès refusé</h1>
        <p className="text-muted-foreground">Cette partie est réservée à l&apos;équipe pédagogique et aux administrateurs.</p>
        <Link href="/espace" className="text-primary underline">
          Retour à mon espace
        </Link>
      </div>
    </Container>
  );
}
