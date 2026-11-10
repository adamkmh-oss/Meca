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
import { COURS_ENSEIGNANT } from "../../../../supabase/content/cours-enseignant.mjs";

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

const ECARTS_ENSEIGNANT = String.raw`
### Conventions et écarts à connaître (cours MS1–MS3)
- **Vocabulaire des appuis (MS1).** « Appui simple ou pivot » = 2 inconnues ($X$, $Y$) ; « appui simple glissant » = 1 inconnue ($Y$) ; « appui plan » (glissière) = $X$ et $M_z$ ; encastrement = 3. Les modules interactifs du site appellent « appui simple » la liaison à 1 inconnue et « articulation » le pivot. Quand un étudiant cite le cours MS1, raisonne avec le vocabulaire MS1 et signale la différence.
- **Treillis (MS1 ch. 2).** Le cours compte l'effort dans une barre positif en **compression** ; le simulateur et les modules du site prennent $N > 0$ en **traction**. Donne toujours la nature (traction/compression) avec la valeur. Isostaticité intérieure : $b = 2n - 3$ (équivalent à $m + r = 2n$ avec $r = 3$).
- **Écart relevé dans le polycopié MS1 ch. 2 (coupure de Ritter, poutre Warren).** Le polycopié donne $F_5 = -F$ et $F_6 = (3 + 4\sqrt3)F/6$ ; sa propre équation $\Sigma F_y$ donne $F_5 = -F/\sqrt3$, d'où $F_6 = 5F/(2\sqrt3)$ (traction) ; $F_4 = -2F\sqrt3/3$ est juste. Vérifié par la méthode des nœuds et par le solveur. Présente-le comme un écart à faire confirmer par l'enseignant, sans dénigrer le cours.
- **Torseur de cohésion (MS1).** Actions du tronçon droit sur le tronçon gauche, en $G$, repère local : $(N, T_y, M_{fz})$ dans le plan. $T_y$ du cours $= -$(somme des forces selon $y$ sur la partie gauche), comme le $T$ du site.
- **Sections (MS2 ch. 1).** $\vec y$ vertical, $\vec z$ horizontal : la flexion dans le plan vertical utilise $I_{Gz} = \int y^2 dS$. Les catalogues (Eurocode 3) appellent $I_y$ l'inertie forte.
- **Flambement (MS3).** $\lambda_k = \pi\sqrt{E/f_e}$ vaut 93,9 pour l'acier S235 (le polycopié écrit « ≅ 93 »). Longueurs de flambement : bi-articulée $L$ ; articulée–encastrée $\approx 0{,}7L$ ; bi-encastrée $L/2$ ; console $2L$ ; encastrée–encastrée à tête guidée $L$.
- **Pages manquantes.** MS2 ch. 2 « Théorie des poutres » : seules les pages 3 à 5 ont été transmises (pages 2 et 6 à 17 absentes). MS2 ch. 3 « Calcul de déplacements sur des poutres rectilignes » : seule la page de garde. Pour ces parties, ne prétends pas citer le cours de l'enseignant : appuie-toi sur les chapitres du site et dis-le.
`;

/** Fiches de synthèse et exercices tirés des cours de l'enseignant (chargés en base). */
function coursEnseignant(): string {
  const parts = [
    "## Cours de l'enseignant (MS1, MS2, MS3 — Y. Pouliquen, IUT di Corsica)",
    "Ces cours ont été reformulés en leçons, fiches et exercices corrigés dans les matières Statique, Mécanique des structures et RDM (pages /matieres/<matière>/<chapitre>/<leçon>). Cite-les comme « le cours MS1 », « le cours MS2 », « le cours MS3 ».",
    ECARTS_ENSEIGNANT.trim(),
  ];
  for (const item of COURS_ENSEIGNANT) {
    parts.push(`### ${item.chapter.title} (/matieres/${item.subject}/${item.chapter.slug})\n${item.chapter.summary}`);
    parts.push(`Leçons : ${item.lessons.map((l) => `${l.title} (/matieres/${item.subject}/${item.chapter.slug}/${l.slug})`).join(" ; ")}.`);
    for (const l of item.lessons.filter((x) => x.kind === "fiche")) parts.push(`**${l.title}**\n${l.body.split("\n\n---\n")[0]}`);
    parts.push(`Exercices corrigés : ${item.exercises.map((e) => e.title).join(" ; ")}.`);
  }
  return parts.join("\n\n");
}

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
    coursEnseignant(),
    "## Corrigés de TD (Mécanique des Structures 3 — portiques plans isostatiques)",
    CONVENTIONS_TD.trim(),
    CORRIGE_S4.trim(),
    CORRIGE_S6.trim(),
    FICHE_BARRE_INCLINEE.trim(),
  ].join("\n\n");
  return cached;
}
