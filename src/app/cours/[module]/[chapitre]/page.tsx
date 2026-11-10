import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/app-shell";
import { AVAILABLE_CHAPTERS, MODULES, findChapter } from "@/content/modules";
import { CHAPTER_CONTENT } from "@/content/chapters";
import { ChapterView } from "@/components/course/chapter-view";
import { StudyTracker } from "@/components/learning/study-tracker";
import { FavoriteButton, ReportButton } from "@/components/learning/actions-bar";
import { isFavorite } from "@/lib/learning/content";

export const dynamicParams = false;

export function generateStaticParams() {
  return AVAILABLE_CHAPTERS.map((c) => ({ module: MODULES.find((m) => m.id === c.moduleId)!.slug, chapitre: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ module: string; chapitre: string }> }): Promise<Metadata> {
  const { module, chapitre } = await params;
  const f = findChapter(module, chapitre);
  return { title: f ? f.chapter.title : "Chapitre", description: f?.chapter.summary };
}

export default async function ChapterPage({ params }: { params: Promise<{ module: string; chapitre: string }> }) {
  const { module, chapitre } = await params;
  const f = findChapter(module, chapitre);
  const content = f ? CHAPTER_CONTENT[f.chapter.id] : undefined;
  if (!f || !content) notFound();
  const list = f.module.chapters.filter((c) => c.available);
  const k = list.findIndex((c) => c.id === f.chapter.id);
  const href = `/cours/${f.module.slug}/${f.chapter.slug}`;
  const fav = await isFavorite(`chapter:${f.chapter.id}`);
  return (
    <Container className="max-w-6xl">
      <StudyTracker itemKey={`chapter:${f.chapter.id}`} />
      <div className="mb-2 flex flex-wrap justify-end gap-2">
        <FavoriteButton itemKey={`chapter:${f.chapter.id}`} kind="cours" title={f.chapter.title} href={href} initial={fav} />
      </div>
      <ChapterView module={f.module} chapter={f.chapter} content={content} prev={list[k - 1]} next={list[k + 1]} />
      <div className="mt-6 flex justify-end">
        <ReportButton targetType="chapter" targetKey={`chapter:${f.chapter.id}`} targetTitle={f.chapter.title} targetHref={href} />
      </div>
    </Container>
  );
}
