import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight, Clock, FlaskConical, Lightbulb, ListChecks, PenLine, Target } from "lucide-react";
import type { Block, ChapterContent, ChapterMeta, ModuleMeta } from "@/content/types";
import { LEVEL_LABEL } from "@/content/types";
import { Md, Tex } from "@/components/math";
import { Badge, Callout, Card, CardContent } from "@/components/ui";
import { WidgetMount } from "./widget-mount";
import { ChapterExercises, MasteryBadge, Quiz, ReadMarker } from "./interactive";

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "md":
      return <Md>{block.md}</Md>;
    case "definition":
      return (
        <div className="rounded-xl border-l-4 border-primary bg-primary-soft/50 px-4 py-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Définition — {block.term}</div>
          <Md className="[&_p]:my-1">{block.md}</Md>
        </div>
      );
    case "formula":
      return (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {block.title && <div className="border-b border-border bg-muted px-4 py-2 text-sm font-semibold">{block.title}</div>}
          <div className="px-4 py-3 text-lg">
            <Tex display>{block.tex}</Tex>
          </div>
          <div className="border-t border-border px-4 py-3">
            <table className="w-full text-sm">
              <tbody>
                {block.variables.map((v) => (
                  <tr key={v.symbol} className="align-top">
                    <td className="w-28 py-1 pr-3">
                      <Tex>{v.symbol}</Tex>
                    </td>
                    <td className="py-1 pr-3 text-muted-foreground">{v.meaning}</td>
                    <td className="py-1 text-right text-xs text-muted-foreground">{v.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {block.note && (
              <div className="mt-2 text-sm text-muted-foreground">
                <Md className="[&_p]:m-0">{block.note}</Md>
              </div>
            )}
          </div>
        </div>
      );
    case "callout":
      return (
        <Callout tone={block.tone} title={block.title}>
          <Md className="[&_p]:my-1">{block.md}</Md>
        </Callout>
      );
    case "widget":
      return (
        <figure className="space-y-2">
          <WidgetMount id={block.widget} />
          {block.caption && <figcaption className="text-center text-xs text-muted-foreground">{block.caption}</figcaption>}
        </figure>
      );
    case "example":
      return (
        <div className="rounded-xl border border-success/40 bg-success-soft/40">
          <div className="flex items-center gap-2 border-b border-success/30 px-4 py-2 text-sm font-semibold text-success">
            <Lightbulb className="size-4" /> Exemple — {block.title}
          </div>
          <div className="space-y-3 px-4 py-3">
            <Md>{block.context}</Md>
            <ol className="space-y-2">
              {block.steps.map((s, k) => (
                <li key={k} className="flex gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-success text-xs font-bold text-white">{k + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{s.title}</div>
                    <Md className="[&_p]:my-1">{s.md}</Md>
                  </div>
                </li>
              ))}
            </ol>
            <div className="rounded-lg bg-card px-3 py-2 text-sm">
              <Md className="[&_p]:m-0">{`**Résultat.** ${block.result}`}</Md>
            </div>
          </div>
        </div>
      );
  }
}

function SectionTitle({ icon: Icon, children, id }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; id: string }) {
  return (
    <h2 id={id} className="flex scroll-mt-20 items-center gap-2 text-xl font-bold tracking-tight">
      <Icon className="size-5 text-primary" /> {children}
    </h2>
  );
}

export function ChapterView({
  module,
  chapter,
  content,
  prev,
  next,
}: {
  module: ModuleMeta;
  chapter: ChapterMeta;
  content: ChapterContent;
  prev?: ChapterMeta;
  next?: ChapterMeta;
}) {
  const toc = [
    { id: "objectif", label: "Objectif" },
    ...content.sections.map((s, k) => ({ id: `s${k}`, label: s.title })),
    { id: "retenir", label: "À retenir" },
    { id: "exercices", label: "Exercices" },
    { id: "quiz", label: "Quiz" },
  ];
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_220px]">
      <article className="min-w-0 space-y-8">
        <header className="space-y-3">
          <Link href={`/cours/${module.slug}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-4" /> Module {module.number} · {module.title}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{chapter.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={chapter.level === "debutant" ? "success" : chapter.level === "intermediaire" ? "default" : "warning"}>{LEVEL_LABEL[chapter.level]}</Badge>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Clock className="size-4" /> {chapter.minutes} min
            </span>
            <MasteryBadge chapterId={chapter.id} className="ml-auto" />
          </div>
        </header>

        <section className="space-y-3">
          <SectionTitle icon={Target} id="objectif">
            Objectif du chapitre
          </SectionTitle>
          <Md>{content.intro}</Md>
          <Card>
            <CardContent className="pt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">À la fin de ce chapitre, vous saurez</div>
              <ul className="space-y-1.5 text-sm">
                {chapter.objectives.map((o) => (
                  <li key={o} className="flex gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {o}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        {content.sections.map((s, k) => (
          <section key={k} className="space-y-4">
            <SectionTitle icon={BookOpen} id={`s${k}`}>
              {s.title}
            </SectionTitle>
            {s.blocks.map((b, j) => (
              <BlockView key={j} block={b} />
            ))}
          </section>
        ))}

        <section className="space-y-3">
          <SectionTitle icon={ListChecks} id="retenir">
            Ce qu&apos;il faut retenir
          </SectionTitle>
          <Card>
            <CardContent className="pt-4">
              <ul className="space-y-2">
                {content.keyPoints.map((p) => (
                  <li key={p} className="flex gap-2 text-sm">
                    <span className="mt-0.5 text-primary">▸</span>
                    <Md className="[&_p]:m-0">{p}</Md>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <ReadMarker chapterId={chapter.id} />
        </section>

        <section className="space-y-3">
          <SectionTitle icon={PenLine} id="exercices">
            Exercices progressifs
          </SectionTitle>
          <ChapterExercises ids={content.exercises} />
        </section>

        <section className="space-y-3">
          <SectionTitle icon={ListChecks} id="quiz">
            Quiz de vérification
          </SectionTitle>
          <Quiz chapterId={chapter.id} moduleId={module.id} title={chapter.title} questions={content.quiz} />
        </section>

        <nav className="flex flex-wrap justify-between gap-3 border-t border-border pt-6">
          {prev ? (
            <Link href={`/cours/${module.slug}/${prev.slug}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              <ChevronLeft className="size-4" /> {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/cours/${module.slug}/${next.slug}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              {next.title} <ChevronRight className="size-4" />
            </Link>
          ) : (
            <Link href={`/cours/${module.slug}/examen`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Examen du module <ChevronRight className="size-4" />
            </Link>
          )}
        </nav>
      </article>

      <aside className="hidden lg:block">
        <div className="sticky top-6 space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sur cette page</div>
          <nav className="flex flex-col gap-1.5 border-l border-border pl-3 text-sm">
            {toc.map((t) => (
              <a key={t.id} href={`#${t.id}`} className="text-muted-foreground hover:text-foreground">
                {t.label}
              </a>
            ))}
          </nav>
          <Link href="/simulateur" className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:border-primary/50">
            <FlaskConical className="size-4 text-primary" /> Ouvrir le simulateur
          </Link>
        </div>
      </aside>
    </div>
  );
}
