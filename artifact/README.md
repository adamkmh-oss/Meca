# STRUCTURA — version publiée sur claude.ai

Version « page unique » du site, publiée comme artefact privé sur claude.ai.
Mêmes pages, composants, contenus et moteur de calcul que le site Next.js ;
seuls la navigation et le tuteur sont adaptés.

## Mettre à jour la version en ligne

```bash
npm run build:artifact      # → artifact/dist/structura.html
```

puis republier ce fichier sur le même artefact (dans Claude Code : « republie
STRUCTURA »). L'adresse du lien ne change pas et la progression des
étudiants (stockée dans leur navigateur) est conservée.

## Ce qui change par rapport au site Next.js

| | Site Next.js | Version claude.ai |
|---|---|---|
| Adresses | `/cours/rdm/fleche` | `#cours--rdm--fleche` (`artifact/paths.ts`) |
| Liens | `next/link` | `artifact/shims/next-link.tsx` |
| Tuteur | route `/api/tuteur` + clé `ANTHROPIC_API_KEY` | capacité `sample` : Claude du lecteur, aucune clé (`artifact/sample-transport.ts`) |
| Outils du tuteur | exécutés sur le serveur | exécutés dans la page (même code) |

## Partager avec les étudiants

L'artefact est privé à sa création : seul son propriétaire peut l'ouvrir.
Pour le donner aux étudiants, utiliser le menu **Partager** de la page sur
claude.ai. Le tuteur demande à chaque personne, au premier message,
l'autorisation d'utiliser son compte Claude.

## Fichiers

- `main.tsx` : point d'entrée (styles, coque de l'application, routeur)
- `router.tsx` : correspondance adresse → page de `src/app`, page introuvable
- `paths.ts` : adresse ↔ fragment d'URL
- `shims/` : remplacements de `next/link` et `next/navigation`
- `sample-transport.ts` : tuteur par la capacité `sample`
- `vite.config.ts`, `build.mjs` : build et assemblage de la page
- `__tests__/` : adresses, limites des outils, transport du tuteur
