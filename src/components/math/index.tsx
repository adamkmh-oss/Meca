/**
 * Rendu mathématique : KaTeX (formules) et Markdown + LaTeX (contenus).
 * Compatible composants serveur et client.
 */
import katex from "katex";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";

const macros = {
  "\\dMdx": "\\dfrac{\\mathrm{d}M}{\\mathrm{d}x}",
  "\\ok": "\\;\\checkmark",
};

export function Tex({ children, display = false, className }: { children: string; display?: boolean; className?: string }) {
  const html = katex.renderToString(children, {
    displayMode: display,
    throwOnError: false,
    strict: "ignore",
    macros,
  });
  return (
    <span
      className={cn(display ? "block" : "inline", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** Les blocs `$$…$$` écrits en ligne deviennent des équations centrées. */
function normalizeDisplayMath(src: string) {
  return src.replace(/\$\$([\s\S]+?)\$\$/g, (_, body: string) => `\n\n$$\n${body.trim()}\n$$\n\n`);
}

/** Les tableaux larges défilent dans leur cadre au lieu d'élargir la page (mobile). */
const MD_COMPONENTS: Components = {
  table: ({ node: _node, ...props }) => (
    <div className="table-scroll" role="region" aria-label="Tableau" tabIndex={0}>
      <table {...props} />
    </div>
  ),
};

/** Markdown (GFM) avec maths `$…$` et `$$…$$`. */
export function Md({ children, className }: { children: string; className?: string }) {
  children = normalizeDisplayMath(children);
  return (
    <div className={cn("prose-structura", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore", macros }]]}
        components={MD_COMPONENTS}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
