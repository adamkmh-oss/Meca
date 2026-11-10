import Link from "next/link";
import { Container } from "@/components/layout/app-shell";

export default function NotFound() {
  return (
    <Container className="max-w-xl">
      <div className="space-y-3 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Erreur 404</p>
        <h1 className="text-2xl font-bold">Page introuvable</h1>
        <p className="text-muted-foreground">Le lien est peut-être incomplet, ou le contenu n&apos;est pas (encore) publié.</p>
        <div className="flex justify-center gap-4">
          <Link href="/" className="text-primary underline">Accueil</Link>
          <Link href="/matieres" className="text-primary underline">Matières</Link>
        </div>
      </div>
    </Container>
  );
}
