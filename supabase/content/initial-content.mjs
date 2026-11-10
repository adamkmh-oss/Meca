/**
 * Contenu initial des matières sans cursus intégré : un chapitre, un cours,
 * une fiche de révision et un exercice corrigé par matière. Chargé par
 * `npm run content:load` (insère seulement ce qui manque : ne remplace
 * jamais une modification faite depuis l'administration).
 *
 * Valeurs normatives : Eurocodes (NF EN 1990, NF EN 1992-1-1), NF EN ISO 6946,
 * RE2020. À relire et enrichir par l'équipe pédagogique.
 */
const NOTE = "\n\n---\n*Contenu initial de la plateforme : à relire, compléter et adapter par l'équipe pédagogique.*";

export const CONTENT = [
  /* ------------------------------------------------------------------ */
  {
    subject: "beton-arme",
    chapter: { slug: "bases-eurocode-2", title: "Bases du béton armé (Eurocode 2)", summary: "Matériaux, résistances de calcul et combinaisons d'actions.", level: "debutant" },
    lessons: [
      {
        slug: "materiaux-resistances-calcul",
        kind: "cours",
        title: "Matériaux et résistances de calcul",
        summary: "Pourquoi associer béton et acier, et comment passer des valeurs caractéristiques aux valeurs de calcul.",
        minutes: 25,
        body: String.raw`## Le principe du béton armé

Le béton résiste bien en **compression** mais mal en **traction** : pour un C25/30, la résistance moyenne en traction vaut seulement $f_{ctm} \approx 2{,}6$ MPa, environ dix fois moins que sa résistance en compression. Dans une poutre fléchie, la partie tendue fissure : on y place des **armatures en acier**, qui reprennent la traction. Le béton protège l'acier de la corrosion et du feu ; l'adhérence entre les deux matériaux assure le travail commun.

## Classes de résistance

Une classe **C25/30** signifie :

- $f_{ck} = 25$ MPa : résistance caractéristique en compression mesurée sur **cylindre** (16 × 32 cm), à 28 jours ;
- $30$ MPa : la même résistance mesurée sur **cube** de 15 cm.

L'acier courant est le **B500B** : limite d'élasticité caractéristique $f_{yk} = 500$ MPa, module $E_s = 200$ GPa.

## Valeurs de calcul (ELU, situations durables)

On divise les valeurs caractéristiques par des **coefficients partiels de sécurité** :

$$f_{cd} = \alpha_{cc}\,\frac{f_{ck}}{\gamma_c} \qquad f_{yd} = \frac{f_{yk}}{\gamma_s}$$

| Grandeur | Valeur |
|---|---|
| $\gamma_c$ (béton) | 1,5 |
| $\gamma_s$ (acier) | 1,15 |
| $\alpha_{cc}$ (annexe nationale française) | 1 |

Exemples : C25/30 → $f_{cd} = 25/1{,}5 = 16{,}7$ MPa ; B500 → $f_{yd} = 500/1{,}15 = 434{,}8$ MPa.

## Combinaisons d'actions (NF EN 1990)

Avec $G$ les charges permanentes et $Q$ une seule charge variable :

- **ELU** (résistance) : $1{,}35\,G + 1{,}5\,Q$ ;
- **ELS caractéristique** (fissuration, déformations) : $G + Q$.

## Enrobage

L'enrobage nominal $c_{nom} = c_{min} + \Delta c_{dev}$ (avec $\Delta c_{dev} = 10$ mm en général) protège les armatures et garantit l'adhérence. $c_{min}$ dépend de la classe d'exposition (ex. XC1 intérieur sec) et du diamètre des barres.` + NOTE,
      },
      {
        slug: "fiche-resistances-combinaisons",
        kind: "fiche",
        title: "Fiche — résistances de calcul et combinaisons",
        summary: "Les valeurs à connaître par cœur pour le béton armé.",
        minutes: 5,
        body: String.raw`- C$f_{ck}$/$f_{ck,cube}$ : $f_{ck}$ = résistance sur cylindre, en MPa.
- $f_{cd} = f_{ck}/1{,}5$ (avec $\alpha_{cc} = 1$) ; $f_{yd} = f_{yk}/1{,}15$.
- B500 : $f_{yd} = 434{,}8$ MPa ; $E_s = 200$ GPa.
- ELU : $p_u = 1{,}35\,g + 1{,}5\,q$ ; ELS : $p_{ser} = g + q$.
- Le béton ne reprend pas la traction : les aciers se placent du côté **tendu** (en bas en travée d'une poutre sur deux appuis, en haut sur appui d'une console).
- Unités : 1 MPa = 1 N/mm² = 1000 kN/m².` + NOTE,
      },
    ],
    exercise: {
      title: "Résistances de calcul et charge ELU d'une poutre",
      difficulty: "debutant",
      statement: String.raw`Une poutre de plancher en béton armé, sur deux appuis, porte une charge permanente répartie (poids propre compris) et une charge d'exploitation répartie. Elle est en béton C30/37 armé d'aciers B500B. Situation de projet durable, coefficients partiels de l'Eurocode (annexe nationale française).`,
      data: String.raw`- Béton C30/37, $\alpha_{cc} = 1$, $\gamma_c = 1{,}5$
- Acier B500B, $\gamma_s = 1{,}15$
- $g = 12$ kN/m ; $q = 5$ kN/m`,
      questions: [
        { kind: "numeric", prompt: String.raw`Calculer la résistance de calcul du béton $f_{cd}$.`, unit: "MPa", expected: 20, tol: 0.01, explanation: String.raw`$f_{cd} = 1 \times 30/1{,}5 = 20$ MPa.` },
        { kind: "numeric", prompt: String.raw`Calculer la limite d'élasticité de calcul de l'acier $f_{yd}$.`, unit: "MPa", expected: 434.78, tol: 0.005, explanation: String.raw`$f_{yd} = 500/1{,}15 = 434{,}8$ MPa.` },
        { kind: "numeric", prompt: String.raw`Calculer la charge linéique de calcul à l'ELU $p_u$.`, unit: "kN/m", expected: 23.7, tol: 0.01, explanation: String.raw`$p_u = 1{,}35 \times 12 + 1{,}5 \times 5 = 16{,}2 + 7{,}5 = 23{,}7$ kN/m.` },
        {
          kind: "qcm",
          prompt: "En travée, où placer les armatures principales de cette poutre sur deux appuis ?",
          choices: [
            { label: "En partie inférieure, zone tendue", correct: true },
            { label: "En partie supérieure, zone comprimée", correct: false },
            { label: "À mi-hauteur, sur l'axe neutre", correct: false },
          ],
          explanation: "Le moment est positif en travée : la fibre inférieure est tendue. Le béton ne reprenant pas la traction, l'acier y est indispensable.",
        },
      ],
      correction: {
        donnees: String.raw`C30/37 : $f_{ck} = 30$ MPa ; B500B : $f_{yk} = 500$ MPa ; $g = 12$ kN/m ; $q = 5$ kN/m.`,
        schema: "Poutre isostatique sur deux appuis, charges uniformément réparties dirigées vers le bas. Unités : MPa pour les contraintes, kN/m pour les charges linéiques.",
        equations: String.raw`$f_{cd} = \alpha_{cc} f_{ck}/\gamma_c$ ; $f_{yd} = f_{yk}/\gamma_s$ ; $p_u = 1{,}35\,g + 1{,}5\,q$ (NF EN 1990, combinaison fondamentale avec une seule action variable).`,
        calculs: String.raw`$f_{cd} = 30/1{,}5 = 20{,}0$ MPa

$f_{yd} = 500/1{,}15 = 434{,}8$ MPa

$p_u = 1{,}35 \times 12 + 1{,}5 \times 5 = 23{,}7$ kN/m`,
        resultat: String.raw`$f_{cd} = 20{,}0$ MPa ; $f_{yd} = 434{,}8$ MPa ; $p_u = 23{,}7$ kN/m ; armatures principales en fibre inférieure.`,
        verification: String.raw`Ordres de grandeur : $f_{cd} < f_{ck}$ et $f_{yd} < f_{yk}$ (la sécurité réduit les résistances) ; $p_u / (g+q) = 23{,}7/17 \approx 1{,}39$, compris entre 1,35 et 1,5 comme attendu.`,
      },
    },
  },
  /* ------------------------------------------------------------------ */
  {
    subject: "geotechnique",
    chapter: { slug: "identification-contraintes", title: "Identification des sols et contraintes", summary: "Paramètres d'état, poids volumiques, contraintes totales et effectives.", level: "debutant" },
    lessons: [
      {
        slug: "phases-contraintes-effectives",
        kind: "cours",
        title: "Les trois phases du sol et la contrainte effective",
        summary: "Poids volumiques, teneur en eau, indice des vides, principe de Terzaghi.",
        minutes: 30,
        body: String.raw`## Un sol, trois phases

Un sol est un assemblage de **grains solides**, d'**eau** et d'**air**. On note $W$ les poids, $V$ les volumes, $s$ les solides, $w$ l'eau, $v$ les vides (eau + air).

| Paramètre | Définition | Unité |
|---|---|---|
| Teneur en eau | $w = W_w / W_s$ | % |
| Poids volumique | $\gamma = W / V$ | kN/m³ |
| Poids volumique sec | $\gamma_d = W_s / V = \dfrac{\gamma}{1 + w}$ | kN/m³ |
| Indice des vides | $e = V_v / V_s$ | — |
| Porosité | $n = V_v / V = \dfrac{e}{1 + e}$ | — |
| Degré de saturation | $S_r = V_w / V_v$ | % |

Ordres de grandeur : $\gamma \approx 17$ à $21$ kN/m³ ; poids volumique de l'eau $\gamma_w \approx 10$ kN/m³.

## Contrainte totale verticale

À la profondeur $z$, sous des couches d'épaisseur $h_i$ et de poids volumique $\gamma_i$ :

$$\sigma_v = \sum_i \gamma_i\,h_i$$

Sous la nappe, on utilise le poids volumique **saturé** $\gamma_{sat}$.

## Pression interstitielle

En régime hydrostatique, à une hauteur d'eau $h_w$ sous la surface de la nappe : $u = \gamma_w\,h_w$.

## Principe de la contrainte effective (Terzaghi)

$$\sigma' = \sigma - u$$

C'est la contrainte **effective** $\sigma'$, transmise par le squelette granulaire, qui gouverne la résistance et les tassements du sol. Sous la nappe, on peut aussi écrire $\gamma' = \gamma_{sat} - \gamma_w$ (poids volumique déjaugé).` + NOTE,
      },
      {
        slug: "fiche-parametres-sol",
        kind: "fiche",
        title: "Fiche — paramètres d'un sol",
        summary: "Formules d'identification et de contraintes.",
        minutes: 5,
        body: String.raw`- $w = W_w/W_s$ ; $\gamma_d = \gamma/(1+w)$ ; $n = e/(1+e)$ ; $S_r = V_w/V_v$.
- $\sigma_v = \sum \gamma_i h_i$ ($\gamma_{sat}$ sous la nappe).
- $u = \gamma_w h_w$ avec $\gamma_w \approx 10$ kN/m³.
- $\sigma' = \sigma - u$ ; $\gamma' = \gamma_{sat} - \gamma_w$.
- 1 kPa = 1 kN/m².` + NOTE,
      },
    ],
    exercise: {
      title: "Contraintes dans un sol avec nappe",
      difficulty: "debutant",
      statement: String.raw`Un terrain est constitué d'un sable homogène. La nappe phréatique se trouve à 2 m sous la surface du terrain naturel. On étudie le point M situé à 5 m de profondeur. Un échantillon prélevé au-dessus de la nappe a un poids volumique de 19 kN/m³ et une teneur en eau de 15 %.`,
      data: String.raw`- Au-dessus de la nappe : $\gamma = 18$ kN/m³ (pour le calcul des contraintes)
- Sous la nappe : $\gamma_{sat} = 20$ kN/m³
- $\gamma_w = 10$ kN/m³
- Échantillon : $\gamma = 19$ kN/m³, $w = 15$ %`,
      questions: [
        { kind: "numeric", prompt: String.raw`Contrainte totale verticale $\sigma_v$ en M.`, unit: "kPa", expected: 96, tol: 0.01, explanation: String.raw`$\sigma_v = 2 \times 18 + 3 \times 20 = 96$ kPa.` },
        { kind: "numeric", prompt: String.raw`Pression interstitielle $u$ en M.`, unit: "kPa", expected: 30, tol: 0.01, explanation: String.raw`$u = 10 \times (5 - 2) = 30$ kPa.` },
        { kind: "numeric", prompt: String.raw`Contrainte effective $\sigma'_v$ en M.`, unit: "kPa", expected: 66, tol: 0.01, explanation: String.raw`$\sigma' = 96 - 30 = 66$ kPa.` },
        { kind: "numeric", prompt: String.raw`Poids volumique sec $\gamma_d$ de l'échantillon.`, unit: "kN/m³", expected: 16.52, tol: 0.005, explanation: String.raw`$\gamma_d = 19 / 1{,}15 = 16{,}52$ kN/m³.` },
        {
          kind: "qcm",
          prompt: "Quelle contrainte gouverne la résistance et les tassements d'un sol ?",
          choices: [
            { label: "La contrainte effective σ' = σ − u", correct: true },
            { label: "La contrainte totale σ", correct: false },
            { label: "La pression interstitielle u", correct: false },
          ],
          explanation: "Principe de Terzaghi : seul le squelette granulaire, qui porte σ', se déforme et frotte.",
        },
      ],
      correction: {
        donnees: String.raw`Nappe à 2 m ; M à 5 m ; $\gamma = 18$ kN/m³ hors nappe ; $\gamma_{sat} = 20$ kN/m³ ; $\gamma_w = 10$ kN/m³.`,
        schema: "Coupe verticale : 0 à 2 m sable non saturé, 2 à 5 m sable saturé, M à 5 m. Régime hydrostatique, contraintes en kPa, positives en compression.",
        equations: String.raw`$\sigma_v = \sum \gamma_i h_i$ ; $u = \gamma_w h_w$ ; $\sigma' = \sigma - u$ ; $\gamma_d = \gamma/(1+w)$.`,
        calculs: String.raw`$\sigma_v = 2 \times 18 + 3 \times 20 = 36 + 60 = 96$ kPa

$u = 10 \times 3 = 30$ kPa

$\sigma' = 96 - 30 = 66$ kPa

$\gamma_d = 19/1{,}15 = 16{,}52$ kN/m³`,
        resultat: String.raw`$\sigma_v = 96$ kPa ; $u = 30$ kPa ; $\sigma'_v = 66$ kPa ; $\gamma_d = 16{,}5$ kN/m³.`,
        verification: String.raw`Contrôle par le poids déjaugé : $\sigma' = 2 \times 18 + 3 \times (20 - 10) = 36 + 30 = 66$ kPa : identique.`,
      },
    },
  },
  /* ------------------------------------------------------------------ */
  {
    subject: "materiaux",
    chapter: { slug: "proprietes-mecaniques", title: "Propriétés des matériaux de construction", summary: "Masse volumique, module d'Young, essais et classes.", level: "debutant" },
    lessons: [
      {
        slug: "masse-volumique-elasticite",
        kind: "cours",
        title: "Masse volumique, élasticité et essais",
        summary: "Comparer béton, acier et bois ; lire une classe de résistance ; utiliser la loi de Hooke.",
        minutes: 20,
        body: String.raw`## Masse volumique et poids volumique

$\rho = m/V$ (kg/m³) ; le poids volumique vaut $\gamma = \rho\,g \approx \rho / 100$ en kN/m³ (avec $g \approx 9{,}81$ m/s², arrondi à 10 dans les calculs courants).

| Matériau | $\rho$ (kg/m³) | Poids volumique de calcul (kN/m³) | Module $E$ |
|---|---|---|---|
| Béton armé | ≈ 2 500 | 25 | $E_{cm} \approx 31$ GPa (C25/30) |
| Acier | 7 850 | 78,5 | 210 GPa |
| Bois résineux C24 | ≈ 420 (moyenne) | ≈ 4,2 | $E_{0,mean} = 11$ GPa |

## Loi de Hooke

Dans le domaine élastique : $\sigma = E\,\varepsilon$ avec $\sigma = N/A$ et $\varepsilon = \Delta L / L$. D'où l'allongement d'une barre :

$$\Delta L = \frac{N\,L}{E\,A}$$

## Essais et classes

- **Béton** : écrasement d'éprouvettes cylindriques 16 × 32 cm à 28 jours → classe C$f_{ck}$/$f_{ck,cube}$ (ex. C25/30). Consistance au **cône d'Abrams** (affaissement, classes S1 à S5).
- **Acier** : essai de traction → limite d'élasticité $f_{yk}$ (500 MPa pour B500), allongement à rupture.
- **Bois** : classes de résistance C (résineux) et D (feuillus), ex. C24 : résistance en flexion caractéristique de 24 MPa.` + NOTE,
      },
      {
        slug: "fiche-ordres-grandeur",
        kind: "fiche",
        title: "Fiche — ordres de grandeur des matériaux",
        summary: "Densités, modules et classes à connaître.",
        minutes: 5,
        body: String.raw`- Béton armé 25 kN/m³ ; acier 78,5 kN/m³ ; bois résineux ≈ 4 à 5 kN/m³.
- $E$ : acier 210 GPa ; béton ≈ 30 GPa ; bois ≈ 11 GPa.
- $\sigma = N/A$ ; $\varepsilon = \Delta L/L$ ; $\Delta L = NL/(EA)$.
- C25/30 : 25 MPa sur cylindre, 30 MPa sur cube.
- Aire d'une barre : $A = \pi \varnothing^2/4$ (Ø20 → 314 mm²).` + NOTE,
      },
    ],
    exercise: {
      title: "Allongement d'un tirant et poids d'une poutre",
      difficulty: "debutant",
      statement: String.raw`Un tirant en acier de diamètre 20 mm et de longueur 3 m est soumis à un effort de traction de 50 kN. Par ailleurs, une poutre en béton armé a une section de 20 × 50 cm et une longueur de 6 m.`,
      data: String.raw`- Tirant : Ø20 ($A = 314$ mm²), $L = 3$ m, $N = 50$ kN, $E = 210$ GPa
- Poutre : $b = 0{,}20$ m, $h = 0{,}50$ m, $L = 6$ m, $\gamma = 25$ kN/m³`,
      questions: [
        { kind: "numeric", prompt: "Contrainte normale dans le tirant.", unit: "MPa", expected: 159.24, tol: 0.01, explanation: String.raw`$\sigma = 50\,000 / 314 = 159{,}2$ N/mm².` },
        { kind: "numeric", prompt: "Allongement du tirant.", unit: "mm", expected: 2.275, tol: 0.01, explanation: String.raw`$\Delta L = \sigma L / E = 159{,}2 \times 3000 / 210\,000 = 2{,}27$ mm.` },
        { kind: "numeric", prompt: "Poids propre total de la poutre.", unit: "kN", expected: 15, tol: 0.01, explanation: String.raw`$V = 0{,}20 \times 0{,}50 \times 6 = 0{,}6$ m³ ; $P = 0{,}6 \times 25 = 15$ kN.` },
        {
          kind: "qcm",
          prompt: "Que signifie la classe de béton C25/30 ?",
          choices: [
            { label: "25 MPa sur cylindre et 30 MPa sur cube (résistances caractéristiques en compression)", correct: true },
            { label: "Entre 25 et 30 % de ciment", correct: false },
            { label: "Résistance en traction de 25 à 30 MPa", correct: false },
          ],
          explanation: "Le premier nombre est la résistance caractéristique sur cylindre, utilisée dans les calculs Eurocode.",
        },
      ],
      correction: {
        donnees: String.raw`$N = 50$ kN, $A = 314$ mm², $L = 3000$ mm, $E = 210\,000$ MPa ; poutre 0,20 × 0,50 × 6 m, $\gamma = 25$ kN/m³.`,
        schema: "Tirant en traction simple (N > 0). Unités cohérentes : N et mm donnent des MPa.",
        equations: String.raw`$\sigma = N/A$ ; $\Delta L = \sigma L/E$ ; $P = \gamma\,V$.`,
        calculs: String.raw`$\sigma = 50\,000/314 = 159{,}2$ MPa

$\Delta L = 159{,}2 \times 3000/210\,000 = 2{,}27$ mm

$V = 0{,}6$ m³ ; $P = 15$ kN`,
        resultat: String.raw`$\sigma = 159$ MPa ; $\Delta L = 2{,}3$ mm ; $P = 15$ kN.`,
        verification: String.raw`$\sigma = 159$ MPa $< f_{yd} = 435$ MPa : l'acier reste élastique, la loi de Hooke s'applique. $\varepsilon = 7{,}6 \times 10^{-4}$, ordre de grandeur habituel.`,
      },
    },
  },
  /* ------------------------------------------------------------------ */
  {
    subject: "topographie",
    chapter: { slug: "nivellement-direct", title: "Nivellement direct", summary: "Lectures arrière et avant, altitudes, contrôle de fermeture, pentes.", level: "debutant" },
    lessons: [
      {
        slug: "nivellement-par-cheminement",
        kind: "cours",
        title: "Le nivellement par cheminement",
        summary: "Déterminer des altitudes avec un niveau et une mire.",
        minutes: 20,
        body: String.raw`## Principe

Le **niveau** définit un plan de visée horizontal. Sur une **mire** verticale posée sur un point, on lit la hauteur de ce plan au-dessus du point.

- **Lecture arrière** $L_{AR}$ : sur le point d'altitude connue ;
- **Lecture avant** $L_{AV}$ : sur le point à déterminer.

La dénivelée de A vers B vaut :

$$\Delta H_{AB} = L_{AR} - L_{AV} \qquad H_B = H_A + \Delta H_{AB}$$

Une dénivelée positive signifie que B est **plus haut** que A.

## Cheminement et contrôle

Pour de longues distances, on enchaîne plusieurs stations. Sur un cheminement fermé (retour au point de départ ou arrivée sur un repère connu) :

$$\sum L_{AR} - \sum L_{AV} = H_{arrivée} - H_{départ}$$

L'écart constaté est la **fermeture** ; s'il est inférieur à la tolérance, on le répartit (compensation), sinon on recommence.

## Pente

$p = \Delta H / D_h$ (en % ou en ‰), avec $D_h$ la distance horizontale.

## Angles

En topographie, on mesure souvent en **grades** (gon) : un tour = 400 gon, un angle droit = 100 gon.` + NOTE,
      },
      {
        slug: "fiche-nivellement",
        kind: "fiche",
        title: "Fiche — nivellement",
        summary: "Formules et pièges.",
        minutes: 5,
        body: String.raw`- $\Delta H = L_{AR} - L_{AV}$ ; $H_B = H_A + \Delta H$.
- Contrôle : $\sum L_{AR} - \sum L_{AV} = H_{arr} - H_{dép}$.
- Pente : $p = \Delta H/D_h$.
- 400 gon = 360° ; 100 gon = angle droit.
- Piège : lire en mètres avec 3 décimales (le millimètre).` + NOTE,
      },
    ],
    exercise: {
      title: "Altitude d'un point et pente",
      difficulty: "debutant",
      statement: String.raw`Depuis une station unique, on vise la mire posée sur le repère A puis sur le point B. La distance horizontale entre A et B est de 40 m.`,
      data: String.raw`- $H_A = 100{,}000$ m
- Lecture sur A : $1{,}532$ m ; lecture sur B : $0{,}874$ m
- $D_h(AB) = 40$ m`,
      questions: [
        { kind: "numeric", prompt: "Dénivelée de A vers B.", unit: "m", expected: 0.658, tol: 0.002, explanation: String.raw`$\Delta H = 1{,}532 - 0{,}874 = +0{,}658$ m.` },
        { kind: "numeric", prompt: "Altitude de B.", unit: "m", expected: 100.658, tol: 0.00001, explanation: String.raw`$H_B = 100{,}000 + 0{,}658 = 100{,}658$ m.` },
        { kind: "numeric", prompt: "Pente de A vers B.", unit: "%", expected: 1.645, tol: 0.003, explanation: String.raw`$p = 0{,}658 / 40 = 1{,}645$ %.` },
        {
          kind: "qcm",
          prompt: "Combien vaut un angle droit en grades ?",
          choices: [
            { label: "100 gon", correct: true },
            { label: "90 gon", correct: false },
            { label: "200 gon", correct: false },
          ],
          explanation: "Un tour complet vaut 400 gon.",
        },
      ],
      correction: {
        donnees: String.raw`$H_A = 100{,}000$ m ; $L_{AR} = 1{,}532$ m (sur A) ; $L_{AV} = 0{,}874$ m (sur B) ; $D_h = 40$ m.`,
        schema: "Niveau stationné entre A et B ; plan de visée horizontal ; mire verticale. Altitudes en mètres, trois décimales.",
        equations: String.raw`$\Delta H = L_{AR} - L_{AV}$ ; $H_B = H_A + \Delta H$ ; $p = \Delta H / D_h$.`,
        calculs: String.raw`$\Delta H = 1{,}532 - 0{,}874 = 0{,}658$ m

$H_B = 100{,}658$ m

$p = 0{,}658/40 = 0{,}01645 = 1{,}645$ %`,
        resultat: String.raw`$H_B = 100{,}658$ m ; pente montante de 1,65 % de A vers B.`,
        verification: "La lecture sur B est plus petite que sur A : la mire sort moins du plan de visée, donc B est plus haut. Le signe positif est cohérent.",
      },
    },
  },
  /* ------------------------------------------------------------------ */
  {
    subject: "thermique",
    chapter: { slug: "conduction-parois", title: "Conduction et résistances thermiques", summary: "Résistance thermique, coefficient U, déperditions d'une paroi.", level: "debutant" },
    lessons: [
      {
        slug: "resistance-thermique-coefficient-u",
        kind: "cours",
        title: "Résistance thermique et coefficient U d'une paroi",
        summary: "Calculer les déperditions par conduction à travers un mur multicouche.",
        minutes: 25,
        body: String.raw`## Conductivité et résistance d'une couche

La **conductivité thermique** $\lambda$ (W/(m·K)) caractérise un matériau : plus elle est faible, plus il isole. Pour une couche homogène d'épaisseur $e$ (m) :

$$R = \frac{e}{\lambda} \quad \text{en m}^2\text{·K/W}$$

| Matériau | $\lambda$ (W/(m·K)) |
|---|---|
| Béton armé | ≈ 2,3 |
| Béton plein courant | ≈ 1,75 à 2,0 |
| Laine minérale | 0,030 à 0,040 |
| Polystyrène expansé | 0,030 à 0,038 |
| Bois résineux | ≈ 0,13 |

## Paroi multicouche

Les résistances s'ajoutent, avec les **résistances superficielles** intérieure $R_{si}$ et extérieure $R_{se}$ (NF EN ISO 6946). Pour une paroi verticale (flux horizontal) : $R_{si} = 0{,}13$ et $R_{se} = 0{,}04$ m²·K/W.

$$R_T = R_{si} + \sum \frac{e_i}{\lambda_i} + R_{se} \qquad U = \frac{1}{R_T} \quad \text{en W/(m}^2\text{·K)}$$

## Déperditions

Pour une surface $A$ et un écart de température $\Delta T = T_{int} - T_{ext}$ :

$$\Phi = U\,A\,\Delta T \quad \text{en W}$$

Les **ponts thermiques** (liaisons plancher-façade, tableaux de fenêtres) ajoutent des déperditions linéiques $\psi\,L$ et ponctuelles $\chi$.` + NOTE,
      },
      {
        slug: "fiche-thermique-parois",
        kind: "fiche",
        title: "Fiche — thermique des parois",
        summary: "R, U, Φ en un coup d'œil.",
        minutes: 5,
        body: String.raw`- $R = e/\lambda$ (m²·K/W), $e$ en mètres.
- $R_T = R_{si} + \sum e_i/\lambda_i + R_{se}$ ; mur : $R_{si} = 0{,}13$, $R_{se} = 0{,}04$.
- $U = 1/R_T$ (W/(m²·K)) ; $\Phi = U A \Delta T$ (W).
- L'isolant fait presque toute la résistance d'un mur isolé.
- Piège : épaisseur en cm → convertir en m.` + NOTE,
      },
    ],
    exercise: {
      title: "Coefficient U d'un mur béton isolé",
      difficulty: "intermediaire",
      statement: String.raw`Un mur extérieur est composé de 20 cm de béton et de 12 cm de laine minérale (isolation par l'intérieur, parement négligé). On néglige les ponts thermiques. Surface du mur : 25 m² ; température intérieure 20 °C, extérieure 0 °C.`,
      data: String.raw`- Béton : $e = 0{,}20$ m, $\lambda = 2{,}0$ W/(m·K)
- Laine minérale : $e = 0{,}12$ m, $\lambda = 0{,}035$ W/(m·K)
- $R_{si} = 0{,}13$ ; $R_{se} = 0{,}04$ m²·K/W
- $A = 25$ m² ; $\Delta T = 20$ K`,
      questions: [
        { kind: "numeric", prompt: "Résistance thermique totale $R_T$ de la paroi.", unit: "m²·K/W", expected: 3.6986, tol: 0.005, explanation: String.raw`$R_T = 0{,}13 + 0{,}10 + 3{,}429 + 0{,}04 = 3{,}699$.` },
        { kind: "numeric", prompt: "Coefficient de transmission $U$.", unit: "W/(m²·K)", expected: 0.2704, tol: 0.005, explanation: String.raw`$U = 1/3{,}699 = 0{,}270$.` },
        { kind: "numeric", prompt: "Flux de chaleur perdu à travers le mur.", unit: "W", expected: 135.2, tol: 0.005, explanation: String.raw`$\Phi = 0{,}2704 \times 25 \times 20 = 135$ W.` },
        {
          kind: "qcm",
          prompt: "Quelle est l'unité de la résistance thermique R ?",
          choices: [
            { label: "m²·K/W", correct: true },
            { label: "W/(m·K)", correct: false },
            { label: "W/(m²·K)", correct: false },
          ],
          explanation: "W/(m·K) est l'unité de λ, W/(m²·K) celle de U = 1/R.",
        },
      ],
      correction: {
        donnees: String.raw`Béton 0,20 m, $\lambda = 2{,}0$ ; laine 0,12 m, $\lambda = 0{,}035$ ; $R_{si} = 0{,}13$ ; $R_{se} = 0{,}04$ ; $A = 25$ m² ; $\Delta T = 20$ K.`,
        schema: "Paroi verticale, flux horizontal de l'intérieur vers l'extérieur, régime permanent, conduction unidimensionnelle.",
        equations: String.raw`$R_i = e_i/\lambda_i$ ; $R_T = R_{si} + \sum R_i + R_{se}$ ; $U = 1/R_T$ ; $\Phi = U A \Delta T$.`,
        calculs: String.raw`$R_{béton} = 0{,}20/2{,}0 = 0{,}100$

$R_{isolant} = 0{,}12/0{,}035 = 3{,}429$

$R_T = 0{,}13 + 0{,}100 + 3{,}429 + 0{,}04 = 3{,}699$ m²·K/W

$U = 1/3{,}699 = 0{,}270$ W/(m²·K)

$\Phi = 0{,}270 \times 25 \times 20 = 135$ W`,
        resultat: String.raw`$R_T = 3{,}70$ m²·K/W ; $U = 0{,}27$ W/(m²·K) ; $\Phi \approx 135$ W.`,
        verification: String.raw`L'isolant représente $3{,}43/3{,}70 \approx 93$ % de la résistance : cohérent. Sans isolant, $U = 1/0{,}27 \approx 3{,}7$ W/(m²·K), soit environ 14 fois plus de pertes.`,
      },
    },
  },
  /* ------------------------------------------------------------------ */
  {
    subject: "construction-durable",
    chapter: { slug: "acv-re2020", title: "Analyse de cycle de vie et RE2020", summary: "Étapes du cycle de vie, FDES, indicateurs de la RE2020.", level: "debutant" },
    lessons: [
      {
        slug: "acv-batiment-re2020",
        kind: "cours",
        title: "L'analyse de cycle de vie d'un bâtiment et la RE2020",
        summary: "Comprendre d'où viennent les émissions d'un bâtiment et ce que mesure la réglementation.",
        minutes: 25,
        body: String.raw`## Analyse de cycle de vie (ACV)

L'ACV évalue les impacts environnementaux d'un ouvrage **de l'extraction des matières premières à la fin de vie**. Les normes NF EN 15804 (produits) et NF EN 15978 (bâtiments) découpent le cycle de vie en modules :

| Module | Étape |
|---|---|
| A1 à A3 | Production des produits (extraction, transport vers l'usine, fabrication) |
| A4 – A5 | Transport vers le chantier, mise en œuvre |
| B1 à B7 | Vie en œuvre : entretien, remplacement, consommations d'énergie et d'eau |
| C1 à C4 | Fin de vie : démolition, transport, traitement, élimination |
| D | Bénéfices et charges au-delà du cycle (réemploi, recyclage) |

Les données des produits figurent dans les **FDES** (fiches de déclaration environnementale et sanitaire) et les **PEP** pour les équipements, publiées dans la base INIES. L'indicateur principal est le **changement climatique**, en kg éq. CO₂.

## La RE2020 (bâtiments neufs)

La réglementation environnementale 2020 fixe des seuils sur plusieurs indicateurs :

- **Bbio** : besoin bioclimatique (qualité de la conception et de l'enveloppe) ;
- **Cep** et **Cep,nr** : consommation d'énergie primaire totale et non renouvelable ;
- **Ic énergie** : impact carbone des consommations d'énergie sur 50 ans ;
- **Ic construction** : impact carbone des produits, équipements et du chantier (kg éq. CO₂/m²), avec des seuils qui se durcissent par étapes ;
- **DH** : degrés-heures d'inconfort, pour le **confort d'été**.

L'ACV de la RE2020 est **dynamique simplifiée** : une émission évitée aujourd'hui compte davantage qu'une émission lointaine, ce qui valorise le stockage temporaire de carbone biogénique des matériaux biosourcés (bois, paille, chanvre).

## Leviers de conception

Sobriété (surfaces et matières utiles), choix de matériaux bas carbone ou biosourcés, réemploi, conception bioclimatique, durabilité et démontabilité.` + NOTE,
      },
      {
        slug: "fiche-re2020",
        kind: "fiche",
        title: "Fiche — indicateurs de la RE2020",
        summary: "Qui mesure quoi.",
        minutes: 5,
        body: String.raw`- **Bbio** : besoins (conception, enveloppe). **Cep / Cep,nr** : énergie primaire.
- **Ic énergie** / **Ic construction** : carbone (kg éq. CO₂/m²).
- **DH** : inconfort d'été (degrés-heures).
- ACV : A1-A3 produits, A4-A5 chantier, B vie en œuvre, C fin de vie, D au-delà.
- Données produits : FDES (base INIES).
- Impact = quantité × facteur d'émission.` + NOTE,
      },
    ],
    exercise: {
      title: "Impact carbone d'un lot de béton",
      difficulty: "debutant",
      statement: String.raw`On estime l'impact carbone (modules A1 à A3) du béton des fondations d'une maison. Les facteurs d'émission sont **ceux de l'énoncé**, fournis pour l'exercice : pour un projet réel, ils proviennent des FDES du produit choisi.`,
      data: String.raw`- Volume de béton : 18 m³
- Facteur d'émission du béton (énoncé) : 260 kg éq. CO₂/m³
- Surface de référence du logement : 120 m²`,
      questions: [
        { kind: "numeric", prompt: "Émissions du béton des fondations.", unit: "kg éq. CO₂", expected: 4680, tol: 0.005, explanation: String.raw`$18 \times 260 = 4\,680$ kg éq. CO₂.` },
        { kind: "numeric", prompt: "Émissions rapportées à la surface du logement.", unit: "kg éq. CO₂/m²", expected: 39, tol: 0.005, explanation: String.raw`$4\,680 / 120 = 39$ kg éq. CO₂/m².` },
        {
          kind: "qcm",
          prompt: "Quel indicateur de la RE2020 évalue le confort d'été ?",
          choices: [
            { label: "DH (degrés-heures d'inconfort)", correct: true },
            { label: "Bbio", correct: false },
            { label: "Ic construction", correct: false },
          ],
          explanation: "Le Bbio évalue les besoins énergétiques ; Ic construction l'impact carbone des produits.",
        },
        { kind: "free", prompt: "Proposez deux leviers pour réduire cet impact.", model: "Exemples : béton bas carbone (ciment à faible clinker), optimisation des sections et des volumes, fondations adaptées au sol (éviter le surdimensionnement), recours à des matériaux biosourcés pour le reste de l'ouvrage." },
      ],
      correction: {
        donnees: "18 m³ de béton ; 260 kg éq. CO₂/m³ (valeur d'énoncé) ; 120 m².",
        schema: "Périmètre : modules A1 à A3 (production) du seul béton des fondations.",
        equations: String.raw`Impact = quantité × facteur d'émission ; indicateur surfacique = impact / surface.`,
        calculs: String.raw`$I = 18 \times 260 = 4\,680$ kg éq. CO₂

$I/S = 4\,680/120 = 39$ kg éq. CO₂/m²`,
        resultat: "4 680 kg éq. CO₂, soit 39 kg éq. CO₂ par m² de logement pour ce seul lot.",
        verification: "Unités : (m³) × (kg éq. CO₂/m³) = kg éq. CO₂. Le résultat ne vaut que pour le facteur de l'énoncé : avec une FDES réelle, reprendre le calcul.",
      },
    },
  },
  /* ------------------------------------------------------------------ */
  {
    subject: "lecture-plans",
    chapter: { slug: "echelles-vues-cotation", title: "Échelles, vues et cotation", summary: "Lire un plan de bâtiment et un plan de structure.", level: "debutant" },
    lessons: [
      {
        slug: "lire-un-plan",
        kind: "cours",
        title: "Lire un plan : échelles, vues, cotation",
        summary: "Passer du dessin à l'ouvrage réel sans erreur.",
        minutes: 20,
        body: String.raw`## Échelle

$$\text{échelle} = \frac{\text{dimension sur le plan}}{\text{dimension réelle}}$$

À l'échelle 1/50, 1 cm sur le plan représente 50 cm en réalité. Échelles usuelles :

| Échelle | Usage courant |
|---|---|
| 1/500, 1/200 | Plan de masse, plan de situation |
| 1/100 | Plans d'ensemble, permis de construire |
| 1/50 | Plans d'exécution, plans de coffrage |
| 1/20, 1/10, 1/5 | Détails (ferraillage, liaisons, menuiseries) |

## Les vues

- **Plan de niveau** : coupe horizontale imaginaire à environ 1 m au-dessus du plancher, vue de dessus ;
- **Coupe** : section verticale, repérée sur le plan par un trait d'axe et des flèches (A-A, B-B) ;
- **Façade (élévation)** : vue extérieure d'un côté du bâtiment.

## Cotation et niveaux

Les cotes donnent les **dimensions réelles**, quelle que soit l'échelle : on ne mesure pas sur un plan quand une cote existe. Les plans d'architecte sont souvent cotés en cm ; les **niveaux** (altitudes) en mètres, par rapport au niveau ±0,00 du rez-de-chaussée fini ou au système NGF.

## Plans de structure

Le **plan de coffrage** donne la géométrie du béton (sections, réservations, niveaux) ; le **plan de ferraillage** donne les armatures (nombre, diamètre, façonnage, enrobage) avec une nomenclature.` + NOTE,
      },
      {
        slug: "fiche-lecture-plans",
        kind: "fiche",
        title: "Fiche — lecture de plans",
        summary: "Conversions d'échelle et vocabulaire.",
        minutes: 5,
        body: String.raw`- Réel = plan ÷ échelle ; plan = réel × échelle.
- 1/50 : 1 cm → 0,50 m ; 1/100 : 1 cm → 1 m.
- Plan de niveau = coupe horizontale à ≈ 1 m.
- Toujours lire la cote plutôt que mesurer.
- Coffrage = géométrie du béton ; ferraillage = armatures.` + NOTE,
      },
    ],
    exercise: {
      title: "Conversions d'échelle",
      difficulty: "debutant",
      statement: String.raw`On travaille sur un plan d'exécution au 1/50 et sur un plan d'ensemble au 1/100.`,
      data: String.raw`- Au 1/50, un mur mesure 12,4 cm sur le plan.
- Une baie réelle de 4,50 m doit être dessinée au 1/100.`,
      questions: [
        { kind: "numeric", prompt: "Longueur réelle du mur.", unit: "m", expected: 6.2, tol: 0.005, explanation: String.raw`$12{,}4 \times 50 = 620$ cm = 6,20 m.` },
        { kind: "numeric", prompt: "Longueur de la baie sur le plan au 1/100.", unit: "cm", expected: 4.5, tol: 0.005, explanation: String.raw`$450 / 100 = 4{,}5$ cm.` },
        {
          kind: "qcm",
          prompt: "Qu'est-ce qu'un plan de niveau ?",
          choices: [
            { label: "Une coupe horizontale à environ 1 m au-dessus du plancher, vue de dessus", correct: true },
            { label: "Une vue de la façade principale", correct: false },
            { label: "Le plan des altitudes du terrain", correct: false },
          ],
          explanation: "La coupe passe au travers des murs, portes et fenêtres pour les montrer en plan.",
        },
      ],
      correction: {
        donnees: "Plan au 1/50 : 12,4 cm ; baie réelle de 4,50 m à dessiner au 1/100.",
        schema: "Échelle = plan / réel. Travailler dans la même unité (cm) avant de convertir.",
        equations: String.raw`réel = plan / échelle ; plan = réel × échelle.`,
        calculs: String.raw`Mur : $12{,}4 / (1/50) = 620$ cm = 6,20 m

Baie : $450 \times (1/100) = 4{,}5$ cm`,
        resultat: "Mur de 6,20 m ; baie de 4,5 cm sur le plan au 1/100.",
        verification: "Au 1/100, 1 cm vaut 1 m : 4,5 cm ↔ 4,50 m, cohérent. Sur le plan, la cote écrite prévaut toujours sur la mesure.",
      },
    },
  },
];
