/**
 * Build de la version page unique (artefact claude.ai) : un seul fichier JS
 * et un seul fichier CSS (polices KaTeX incluses), assemblés ensuite en une
 * page HTML autonome par build.mjs.
 */
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";

const root = path.resolve(__dirname, "..");
const r = (p: string) => path.resolve(root, p);

/** KaTeX : ne garder que les polices woff2 (les formats woff/ttf triplent le poids). */
function katexWoff2Only(): Plugin {
  return {
    name: "katex-woff2-only",
    enforce: "pre",
    transform(code, id) {
      if (!/katex(\.min)?\.css/.test(id)) return null;
      return code.replace(/,\s*url\([^)]*\.woff\)\s*format\("woff"\)/g, "").replace(/,\s*url\([^)]*\.ttf\)\s*format\("truetype"\)/g, "");
    },
  };
}

export default defineConfig({
  root,
  publicDir: false,
  plugins: [katexWoff2Only(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^next\/link$/, replacement: r("artifact/shims/next-link.tsx") },
      { find: /^next\/navigation$/, replacement: r("artifact/shims/next-navigation.ts") },
      { find: /^@\/lib\/tutor\/transport$/, replacement: r("artifact/sample-transport.ts") },
      { find: /^@\//, replacement: r("src") + "/" },
    ],
  },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: r("artifact/dist/build"),
    emptyOutDir: true,
    target: "es2022",
    cssCodeSplit: false,
    assetsInlineLimit: () => true,
    modulePreload: false,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      input: r("artifact/main.tsx"),
      // Les directives "use client" des composants n'ont pas de sens hors de Next.js.
      onLog(level, log, handler) {
        if (log.code === "MODULE_LEVEL_DIRECTIVE") return;
        handler(level, log);
      },
      output: {
        format: "iife",
        entryFileNames: "app.js",
        assetFileNames: (a) => (a.names?.[0]?.endsWith(".css") ? "app.css" : "[name][extname]"),
      },
    },
  },
});
