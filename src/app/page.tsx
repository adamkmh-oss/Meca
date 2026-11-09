import Link from "next/link";
import * as Icons from "lucide-react";
import { ArrowRight, BookOpen, FlaskConical, LayoutDashboard, PenLine } from "lucide-react";
import { Container } from "@/components/layout/app-shell";
import { MODULES, AVAILABLE_CHAPTERS } from "@/content/modules";
import { GENERATORS } from "@/lib/exercises/generators";
import { Button, Card, CardContent } from "@/components/ui";
import { WidgetMount } from "@/components/course/widget-mount";
import { ContinueCard } from "@/components/dashboard/continue-card";

const FEATURES = [
  { icon: BookOpen, title: "Cours interactifs", text: "Définitions, formules expliquées variable par variable, schémas manipulables et exemples tirés du génie civil.", href: "/cours" },
  { icon: FlaskConical, title: "Simulateur 2D", text: "Poutres, portiques et treillis : réactions, diagrammes N, T, M et déformée calculés par la méthode des déplacements.", href: "/simulateur" },
  { icon: PenLine, title: "Exercices à données variables", text: "Saisissez vos résultats : indices, correction en six étapes et vérification indépendante par le solveur.", href: "/exercices" },
  { icon: LayoutDashboard, title: "Progression", text: "XP, série quotidienne, badges, objectif hebdomadaire et maîtrise de chaque chapitre.", href: "/tableau-de-bord" },
];

export default function Home() {
  return (
    <Container className="space-y-12">
      <section className="grid grid-cols-1 items-center gap-8 pt-2 lg:grid-cols-[1.05fr_1fr]">
        <div className="space-y-5 animate-rise">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" /> BUT Génie Civil – Construction Durable
          </div>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            La mécanique des structures, <span className="text-primary">en la manipulant.</span>
          </h1>
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            Déplacez une charge, regardez les réactions changer. Coupez une poutre, voyez apparaître N, T et M. STRUCTURA relie chaque formule à ce qu&apos;elle
            décrit — et chaque résultat à un calcul vérifiable.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/cours">
                Commencer le cours <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/simulateur">
                <FlaskConical /> Ouvrir le simulateur
              </Link>
            </Button>
          </div>
          <div className="flex gap-6 pt-1 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{MODULES.length}</strong> modules
            </span>
            <span>
              <strong className="text-foreground">{AVAILABLE_CHAPTERS.length}</strong> chapitres interactifs
            </span>
            <span>
              <strong className="text-foreground">{GENERATORS.length}</strong> types d&apos;exercices
            </span>
          </div>
        </div>
        <div className="animate-rise [animation-delay:120ms]">
          <WidgetMount id="reactions-beam" />
          <p className="mt-2 text-center text-xs text-muted-foreground">Essayez : faites glisser la charge.</p>
        </div>
      </section>

      <ContinueCard />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <Link key={f.title} href={f.href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/50">
              <CardContent className="space-y-2 pt-5">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <f.icon className="size-5" />
                </span>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.text}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-bold tracking-tight">Le programme</h2>
          <Link href="/cours" className="text-sm font-medium text-primary hover:underline">
            Voir tous les chapitres
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => {
            const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[m.icon] ?? BookOpen;
            return (
              <Link key={m.id} href={`/cours/${m.slug}`} className="group">
                <Card className="h-full transition-colors group-hover:border-primary/50">
                  <CardContent className="flex gap-3 pt-5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#0b1530] text-white dark:bg-primary">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-primary">Module {m.number}</div>
                      <div className="font-semibold">{m.title}</div>
                      <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </Container>
  );
}
