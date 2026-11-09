import type { ChapterContent } from "../types";
import { m1Equilibre, m1Moment, m1Unites } from "./m1";
import { m2Liaisons, m2Reactions, m3Diagrammes, m3Torseur } from "./m2-m3";
import { m4Charges, m4Treillis, m5Fleche, m5Flexion, m6Flambement } from "./m4-m6";

const ALL: ChapterContent[] = [
  m1Unites,
  m1Moment,
  m1Equilibre,
  m2Liaisons,
  m2Reactions,
  m3Torseur,
  m3Diagrammes,
  m4Charges,
  m4Treillis,
  m5Flexion,
  m5Fleche,
  m6Flambement,
];

export const CHAPTER_CONTENT: Record<string, ChapterContent> = Object.fromEntries(ALL.map((c) => [c.id, c]));
