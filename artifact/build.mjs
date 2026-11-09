/**
 * Construit artifact/dist/structura.html : la page à publier sur claude.ai.
 * Usage : npm run build:artifact
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const vite = path.resolve(here, "../node_modules/.bin/vite");
execFileSync(vite, ["build", "--config", path.join(here, "vite.config.ts")], { stdio: "inherit" });

const out = path.join(here, "dist/build");
// Rien dans le code ne doit pouvoir fermer la balise qui l'entoure.
const js = readFileSync(path.join(out, "app.js"), "utf8").replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--")
  // U+FFFD littéral (micromark) : même valeur, écrite en séquence d'échappement.
  .replace(/\uFFFD/g, "\\uFFFD");
const css = readFileSync(path.join(out, "app.css"), "utf8").replace(/<\/style/gi, "<\\/style");

// Thème : choix mémorisé, sinon celui du lecteur Claude, sinon celui du système.
const theme = `(function(){var d=document.documentElement;d.lang="fr";var t=null;try{t=localStorage.getItem("structura:theme")}catch(e){}if(t!=="light"&&t!=="dark"){t=d.getAttribute("data-theme");if(t!=="light"&&t!=="dark")t=window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}d.setAttribute("data-theme",t)})()`;

const html = `<title>STRUCTURA</title>
<meta name="description" content="Plateforme interactive de mécanique des structures pour le BUT Génie Civil – Construction Durable : cours, simulateur 2D, exercices corrigés, tuteur IA.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300..800&family=JetBrains+Mono:wght@400..700&display=swap">
<script>${theme}</script>
<style>${css}</style>
<div id="root"></div>
<noscript><p style="padding:24px;font-family:system-ui,sans-serif">STRUCTURA a besoin de JavaScript pour fonctionner.</p></noscript>
<script>${js}</script>
`;
const file = path.join(here, "dist/structura.html");
writeFileSync(file, html);
console.log(`\n${path.relative(process.cwd(), file)} : ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} Mo`);
