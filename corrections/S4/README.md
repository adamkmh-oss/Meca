# Structure (S4) — Corrigé

Torseur de cohésion des portiques plans isostatiques — portique à force oblique.
Mise en page identique au corrigé de référence « Structure (S6) — Correction v2 ».

- `Structure_S4_-_Correction.pdf` : le corrigé (A4, 8 pages).
- `corrige-s4.tex` : contenu et figures (TikZ).
- `preambule.tex` : charte commune (cadre, en-tête et logo, pied « n / N »,
  bandeaux de section, encadrés, styles des schémas). Réutilisable pour les
  autres structures.
- `img/` : logo et pictogramme du pied de page, extraits du corrigé de référence.

## Compilation

Polices requises : Liberation Serif, Carlito, Caladea, Latin Modern Math.

```
xelatex corrige-s4.tex
xelatex corrige-s4.tex   # seconde passe pour la pagination « n / N »
```

## Vérification

Réactions et torseurs (N, T, M sur CB, BD, AB) contrôlés numériquement par un
calcul indépendant (méthode des déplacements) pour L = 2 m, H = 3,2 m,
F = 20 kN, α = 30°.
