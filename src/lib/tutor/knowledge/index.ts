/**
 * Base documentaire du tuteur : construite à partir des contenus du site
 * (programme, chapitres, exercices) et des corrigés de référence.
 *
 * Le texte produit est déterministe (aucune date, ordre fixe) : il est placé
 * dans le prompt système et mis en cache côté API.
 */
import { MODULES } from "@/content/modules";
import { CHAPTER_CONTENT } from "@/content/chapters";
import type { Block, ChapterContent } from "@/content/types";
import { LEVEL_LABEL } from "@/content/types";
import { GENERATORS } from "@/lib/exercises/generators";
import { CONVENTIONS_TD, CORRIGE_S4, CORRIGE_S6, FICHE_BARRE_INCLINEE } from "./corriges";

function blockToText(b: Block): string {
  switch (b.type) {
    case "md":
      return b.md;
    case "definition":
      return `**Définition — ${b.term}.** ${b.md}`;
    case "formula":
      return [
        `**Formule${b.title ? ` — ${b.title}` : ""}** : $$${b.tex}$$`,
        ...b.variables.map((v) => `- $${v.symbol}$ : ${v.meaning}${v.unit ? ` (${v.unit})` : ""}`),
        b.note ? `Remarque : ${b.note}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    case "callout":
      return `> **${b.title ?? "À noter"}** — ${b.md.replace(/\n/g, "\n> ")}`;
    case "widget":
      return `[Schéma interactif sur la page : ${b.caption ?? b.widget}]`;
    case "example":
      return [
        `**Exemple — ${b.title}.** ${b.context}`,
        ...b.steps.map((s, k) => `${k + 1}. ${s.title} : ${s.md}`),
        `Résultat : ${b.result}`,
      ].join("\n");
  }
}

function chapterToText(path: string, title: string, c: ChapterContent): string {
  const parts = [`### ${title} (page ${path})`, `Objectif : ${c.intro}`];
  for (const s of c.sections) {
    parts.push(`#### ${s.title}`);
    for (const b of s.blocks) parts.push(blockToText(b));
  }
  parts.push(`**À retenir :**\n${c.keyPoints.map((k) => `- ${k}`).join("\n")}`);
  parts.push(
    `**Questions de quiz du chapitre :**\n${c.quiz
      .map((q) => `- ${q.prompt} → réponse : ${q.choices[q.answer]}. ${q.explanation}`)
      .join("\n")}`,
  );
  return parts.join("\n\n");
}

function programme(): string {
  const lines = ["## Programme de STRUCTURA (6 modules)"];
  for (const m of MODULES) {
    lines.push(`\n### Module ${m.number} — ${m.title} (page /cours/${m.slug})\n${m.description}`);
    for (const c of m.chapters) {
      lines.push(
        `- ${c.title} [${LEVEL_LABEL[c.level]}, ${c.available ? `rédigé : /cours/${m.slug}/${c.slug}` : "en rédaction"}] — objectifs : ${c.objectives.join(" ; ")}`,
      );
    }
  }
  return lines.join("\n");
}

function exercices(): string {
  return [
    "## Exercices à données variables du site (page /exercices/<identifiant>)",
    ...GENERATORS.map((g) => `- ${g.id} — ${g.title} (${LEVEL_LABEL[g.level]}, ${g.calc}) : ${g.description} Compétence : ${g.skill}.`),
  ].join("\n");
}

const GUIDE_SITE = String.raw`
## Guide du site STRUCTURA
- /cours : programme ; chaque chapitre rédigé contient objectif, cours, formules, schémas interactifs, exemple, exercices, quiz. /cours/<module>/examen : examen de validation (8 questions + 2 exercices, 70 %).
- /simulateur : poutre éditable (appuis simples, articulations, encastrements, rotules internes, charges ponctuelles éventuellement inclinées, charges réparties trapézoïdales, couples), portique simple paramétré, treillis Pratt / Howe / Warren. Résultats : réactions, diagrammes N, T, M, déformée, flèche, contrainte maximale, calculs détaillés (PFS pas à pas pour les poutres isostatiques, équations par tronçon).
- /exercices : banque d'exercices filtrable ; correction en six étapes (données, schéma, équations, calculs, résultat, vérification).
- /tableau-de-bord : XP, niveau, série quotidienne, objectif hebdomadaire, maîtrise par chapitre, badges.
- Convention de signe de tout le site : torseur de cohésion appliqué à la partie gauche, N > 0 en traction, T = −(somme des forces selon y à gauche de la coupure), dM/dx = −T, M > 0 tend la fibre inférieure d'une poutre horizontale. Diagrammes : valeurs positives reportées selon +y local. Certains ouvrages utilisent V = −T et dM/dx = V : les moments sont identiques, les tranchants de signe opposé.
- Unités : kN, m, kN·m, kN/m ; contraintes en MPa = N/mm².
`;

let cached: string | null = null;

export function buildKnowledge(): string {
  if (cached) return cached;
  const chapters: string[] = ["## Chapitres rédigés du cours"];
  for (const m of MODULES) {
    for (const c of m.chapters) {
      const content = CHAPTER_CONTENT[c.id];
      if (content) chapters.push(chapterToText(`/cours/${m.slug}/${c.slug}`, `Module ${m.number} — ${c.title}`, content));
    }
  }
  cached = [
    "# DOCUMENTATION DE RÉFÉRENCE",
    GUIDE_SITE.trim(),
    programme(),
    chapters.join("\n\n"),
    exercices(),
    "## Corrigés de TD (Mécanique des Structures 3 — portiques plans isostatiques)",
    CONVENTIONS_TD.trim(),
    CORRIGE_S4.trim(),
    CORRIGE_S6.trim(),
    FICHE_BARRE_INCLINEE.trim(),
  ].join("\n\n");
  return cached;
}
