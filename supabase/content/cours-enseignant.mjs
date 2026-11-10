/**
 * Cours de l'enseignant (MS1, MS2, MS3 — Y. Pouliquen, IUT di Corsica),
 * reformulés en leçons, fiches et exercices corrigés. Chargé par
 * `npm run content:load` avec le contenu initial (insère seulement ce qui
 * manque).
 *
 * Les valeurs attendues des exercices sont recalculées par les tests
 * (src/lib/learning/__tests__/cours-enseignant.test.ts) avec le moteur de
 * calcul du site ou les formules du cours.
 *
 * Écarts relevés dans les polycopiés et signalés dans les leçons :
 *  - MS1 ch. 2, coupure de Ritter : F5 et F6 (voir la leçon « méthodes »).
 *  - MS1 : vocabulaire des appuis (« appui simple » = pivot à 2 inconnues).
 *  - MS1 ch. 2 : effort dans une barre compté positif en compression.
 *  - MS3 : λk = π√(210000/235) vaut 93,9 (le polycopié indique ≅ 93).
 *
 * Chapitres incomplets dans les fichiers transmis : MS2 ch. 2 (pages 2 et
 * 6 à 17 absentes), MS2 ch. 3 (seule la page de garde).
 */

const source = (ref) =>
  `\n\n---\n*Reformulé d'après le cours ${ref} de Y. Pouliquen (IUT di Corsica). Les figures du polycopié ne sont pas reproduites ; les exemples chiffrés signalés « plateforme » ont été ajoutés par la plateforme et vérifiés par ses tests automatiques.*`;

const MS1_1 = source("MS1 (R1.09), chapitre 1 « Notions de base »");
const MS1_2 = source("MS1 (R1.09), chapitre 2 « Les systèmes réticulés »");
const MS2_1 = source("MS2 (R2-08), chapitre 1 « Caractéristiques des sections de poutres rectilignes »");
const MS2_2 = source("MS2 (R2-08), chapitre 2 « Théorie des poutres » (pages 3 à 5)");
const MS3_1 = source("MS3 (R3.081), chapitre « Le flambement des poteaux »");

export const COURS_ENSEIGNANT = [
  /* ================================================================== */
  /* STATIQUE — MS1 chapitre 1                                           */
  /* ================================================================== */
  {
    subject: "statique",
    chapter: {
      slug: "ms1-notions-de-base",
      title: "MS1 — Notions de base : torseurs, liaisons, PFS, cohésion",
      summary: "Cours MS1, chapitre 1 : actions mécaniques et torseurs, liaisons normalisées, principe fondamental de la statique, torseur des actions de cohésion.",
      level: "debutant",
      position: 1,
    },
    lessons: [
      {
        slug: "actions-mecaniques-torseurs",
        kind: "cours",
        title: "Actions mécaniques et torseurs",
        summary: "Système matériel, solide, repère galiléen, actions mécaniques, torseur, formule de Varignon, glisseur et couple, actions réparties.",
        minutes: 35,
        body: String.raw`## La statique

La **statique** étudie l'équilibre des systèmes matériels **au repos** par rapport à un repère fixe, ou en mouvement de translation uniforme.

- **Système matériel** : ensemble de matière (une grue, un camion, un pont…).
- **Solide** : système matériel idéalisé, **indéformable** (la distance $AB$ entre deux points quelconques reste constante au cours du temps), homogène et isotrope. Une structure est un ensemble de solides reliés par des **liaisons**.
- **Repère** $\mathcal R = (O, \vec x, \vec y, \vec z)$. Un **repère galiléen** est un repère dans lequel le principe fondamental de la dynamique est valable (espace homogène et isotrope, temps uniforme, tout corps libre y est en mouvement rectiligne uniforme).

## Actions mécaniques

Une **action mécanique** est toute cause capable de maintenir un système au repos, ou de modifier son état de repos ou de mouvement (ou celui de certaines de ses parties) : poids, poussée du vent, effort d'un vérin, appui d'un mur…

- Elle s'exerce **par contact** (pression) ou **à distance** (pesanteur, champ magnétique).
- Elle s'applique sur une **surface** ou un **volume** ; on parle de force ponctuelle quand ce volume est négligeable.
- Elle met toujours en jeu **deux corps** : l'un l'exerce, l'autre la subit.
- Elle est **intérieure** ou **extérieure** selon le système que l'on isole.

La **force élémentaire** $\vec F_{B \to A}$ appliquée en $A$ (unité : le newton, N) est un **vecteur lié** au point $A$ — indispensable en résistance des matériaux, car le point d'application change les déformations — ou un **vecteur glissant** sur sa ligne d'action, ce qui n'est admis que pour des solides indéformables.

Une action mécanique réelle est un **ensemble de forces** : on la représente par un **torseur**.

## Pourquoi un torseur ?

Une planche de balançoire repose sur un appui $B$. Une force $\vec R$ appliquée en $A$, loin de $B$, fait pivoter la planche ; la même force appliquée en $B$ ne la fait pas tourner. Pour décrire **en $B$** une action équivalente à $\vec R$ appliquée en $A$, il faut ajouter à $\vec R$ un **moment**. Le torseur regroupe ces deux informations.

## Définition

Un torseur est formé de deux vecteurs, sa **résultante** $\vec R$ et son **moment** $\vec M_P$, exprimés en un point $P$ : ce sont ses **éléments de réduction** en $P$.

$$\left\{\mathcal T_{\text{ext} \to S}\right\}_P = \begin{Bmatrix} \vec R \\ \vec M_P \end{Bmatrix}_P$$

**Changement de point — formule de Varignon** (moyen mnémotechnique « BABAR ») :

$$\vec M_B = \vec M_A + \overrightarrow{BA} \wedge \vec R$$

Le champ des moments est **équiprojectif** : $\overrightarrow{AB} \cdot \vec M_A = \overrightarrow{AB} \cdot \vec M_B$ pour tous points $A$, $B$.

## Propriétés

- **Égalité** : deux torseurs sont égaux si leurs résultantes et leurs moments **au même point** sont égaux.
- **Somme** : on n'additionne que des torseurs **exprimés au même point**.
- **Torseur nul** $\{0\}$ : résultante et moment nuls.
- **Comoment** (au même point) : $\{\mathcal T_1\}_P \odot \{\mathcal T_2\}_P = \vec R_1 \cdot \vec M_2 + \vec M_1 \cdot \vec R_2$.
- **Invariants** : la résultante (invariant vectoriel) et l'**automoment** $\vec M_A \cdot \vec R$, identique en tout point (invariant scalaire).
- **Axe central** : ensemble des points $A$ où $\vec R \wedge \vec M_A = \vec 0$ ; c'est une droite parallèle à $\vec R$.

## Glisseur et couple

- Un **glisseur** est un torseur dont le moment est nul en un point $M$ : $\{\vec R \,;\, \vec 0\}_M$. C'est une force $\vec R$ dont la ligne d'action passe par $M$.
- Un **couple** est un torseur de résultante nulle $\{\vec 0 \,;\, \vec M\}$ : son moment est le même en tout point (vecteur libre).
- Tout torseur se décompose en un glisseur et un couple.

Pour la balançoire : en $A$, l'action est un glisseur $\{\vec R \,;\, \vec 0\}_A$. Transportée en $B$, elle devient $\{\vec R \,;\, \overrightarrow{BA} \wedge \vec R\}_B$ : une force en $B$ **plus** un moment.

## Actions ponctuelles et réparties

| Action | Densité | Résultante | Moment en $A$ |
|---|---|---|---|
| ponctuelle | — | $\vec R$ | $\vec M_A$ |
| linéique (le long de $L$) | $\vec p$ (N/m) | $\int_L \vec p \, dx$ | $\int_L \overrightarrow{AM} \wedge \vec p \, dx$ |
| surfacique | $\vec p$ (N/m²) | $\int_S \vec p \, ds$ | $\int_S \overrightarrow{AM} \wedge \vec p \, ds$ |
| volumique | $\vec p$ (N/m³) | $\int_V \vec p \, dv$ | $\int_V \overrightarrow{AM} \wedge \vec p \, dv$ |

**Pesanteur** : $d\vec P = \vec g \, dm = \rho \, \vec g \, dv$. Pour un solide homogène de masse $m$ et de centre de masse $G$, dans un champ $\vec g$ uniforme : $\{m\vec g \,;\, m\,\overrightarrow{AG} \wedge \vec g\}_A$, soit en $G$ le glisseur $\{m\vec g \,;\, \vec 0\}_G$.

**Torseur des actions extérieures** sur $(S)$ : on ramène tous les torseurs (connus et inconnus) en un même point $P$, le « centre des moments », puis on les additionne.

## En modélisation plane

Toutes les forces sont dans le plan $(\vec x, \vec y)$ et les moments portés par $\vec z$. Le moment en $P$ d'une force $\vec F = (F_x, F_y)$ appliquée en $A$ vaut :

$$M_{P,z} = (x_A - x_P)\,F_y - (y_A - y_P)\,F_x$$

Positif dans le sens trigonométrique (anti-horaire).

**Exemple (plateforme).** Une force de 400 N verticale vers le bas est appliquée en $A$, à 2 m à droite d'un point $B$ sur la même horizontale. $M_{B,z} = 2 \times (-400) - 0 = -800$ N·m : la force tend à faire tourner la planche dans le sens horaire autour de $B$.` + MS1_1,
      },
      {
        slug: "liaisons-principe-fondamental",
        kind: "cours",
        title: "Liaisons et principe fondamental de la statique",
        summary: "Torseur cinématique, degrés de liberté, actions de liaison, dualité, liaisons normalisées, PFS, isostaticité, méthodologie.",
        minutes: 35,
        body: String.raw`## Deux points de vue sur une liaison

Une **liaison** est une relation entre deux solides. On l'étudie :

- du point de vue **cinématique** : quels mouvements relatifs autorise-t-elle ?
- du point de vue **mécanique** : quelles actions transmet-elle ?

## Point de vue cinématique

Le **torseur cinématique** d'un solide $(S)$ par rapport au repère $\mathcal R$ s'écrit $\{\mathcal V_{S/\mathcal R}\}_A = \{\vec\Omega \,;\, \vec V_A\}$ : la résultante est le vecteur rotation $\vec\Omega$ (indépendant du point), le moment est la vitesse du point $A$ du solide. Le champ des vitesses est équiprojectif : $\vec V_B = \vec V_A + \overrightarrow{BA} \wedge \vec\Omega$.

En génie civil, la **modélisation plane** est quasi systématique : plan $(\vec x, \vec y)$, 3 composantes ($\omega_z$, $V_x$, $V_y$) au lieu de 6.

La **matrice des degrés de liberté** liste les déplacements permis : translations $u, v, w$ (en m) suivant $x, y, z$ et rotations $\theta_x, \theta_y, \theta_z$ (en rad). Dans le plan : $(u, v, \theta_z)$. Ce n'est pas un torseur (pas d'équiprojectivité) : c'est un simple tableau des mouvements autorisés, même si le langage courant du génie civil les confond.

## Point de vue mécanique

Une liaison **transmet des actions dans les directions où elle empêche le déplacement**. Torseur des actions de liaison (ou des efforts transmissibles) de $(S_2)$ sur $(S_1)$ :

$$\{\mathcal T_{2 \to 1}\}_A = \begin{Bmatrix} \vec R \\ \vec M_A \end{Bmatrix}_A \qquad \text{dans le plan : } (X, Y, M_z)$$

## Liaison parfaite et dualité

La **puissance des inter-efforts** est le comoment des deux torseurs : $\mathcal P = \vec R \cdot \vec V_A + \vec M_A \cdot \vec\Omega$.

Une liaison **parfaite** (sans frottement) a une puissance nulle pour tout mouvement permis :

$$u\,X + v\,Y + w\,Z + \theta_x M_x + \theta_y M_y + \theta_z M_z = 0$$

Les termes étant indépendants (sauf liaison hélicoïdale), chacun est nul : **si un mouvement est permis, l'action correspondante est nulle ; si une action est transmise, le mouvement correspondant est bloqué**. La matrice des degrés de liberté donne donc directement la forme du torseur des actions de liaison : c'est la **dualité**.

Exemple : liaison pivot glissant d'axe $\vec x$. Mouvements permis $(u, 0, 0 \,;\, \theta_x, 0, 0)$, actions transmises $(0, Y, Z \,;\, 0, M_y, M_z)$.

## Liaisons normalisées du génie civil (modélisation plane)

| Liaison (vocabulaire du cours MS1) | Mouvements permis | Actions transmises | Inconnues |
|---|---|---|---|
| Appui simple **glissant** (sur rouleaux) | $u$, $\theta_z$ | $Y$ | 1 |
| Appui simple **ou pivot** (articulation) | $\theta_z$ | $X$, $Y$ | 2 |
| Appui plan (glissière) | $v$ | $X$, $M_z$ | 2 |
| Encastrement | aucun | $X$, $Y$, $M_z$ | 3 |

> **Attention au vocabulaire.** Dans le cours MS1, l'« appui simple » est le **pivot** (2 inconnues) ; la liaison à **une** inconnue s'appelle « appui simple **glissant** ». Les modules interactifs du site, comme beaucoup d'ouvrages, appellent « appui simple » la liaison à une inconnue et « articulation » le pivot. Raisonnez toujours sur les **mouvements bloqués**, pas sur le nom.

**Liaisons extérieures** (avec le bâti, représenté hachuré : déplacements mesurés par rapport au repère fixe) et **liaisons intérieures** (entre deux solides de la structure : déplacements relatifs). Exemples intérieurs : le nœud rigide (transmet $X$, $Y$, $M_z$) et la **rotule** (transmet $X$, $Y$, mais pas de moment).

## Le principe fondamental de la statique (PFS)

Un système $(S)$ est **en équilibre** par rapport à $\mathcal R$ si chacun de ses points garde une position fixe dans $\mathcal R$.

> **PFS.** Si $(S)$ est au repos (ou en translation uniforme) par rapport à un repère galiléen, le torseur des actions de l'extérieur $(\overline S)$ sur $(S)$ est **nul en tout point** : $\{\mathcal T_{\overline S \to S}\} = \sum_i \{\mathcal T_i\}_P = \{0\}$.

- **Théorème de la résultante statique** : $\vec R_{\overline S \to S} = \vec 0$.
- **Théorème du moment statique** : $\vec M_{P, \overline S \to S} = \vec 0$ en tout point $P$.

Cela fait 6 équations scalaires dans l'espace et **3 en modélisation plane** : $\Sigma F_x = 0$, $\Sigma F_y = 0$, $\Sigma M_{P,z} = 0$.

## Isostatique, hyperstatique, hypostatique

On compare le nombre d'**inconnues** de liaison au nombre d'**équations indépendantes** (3 par solide dans le plan) :

- autant d'inconnues que d'équations : **isostatique** (solution unique par la statique) ;
- plus d'inconnues : **hyperstatique**, de degré égal à la différence (il faudra les déformations) ;
- moins d'inconnues : **hypostatique** (mécanisme), de degré de mobilité égal à la différence.

Exemples : poutre sur un pivot et un appui simple glissant : $2 + 1 = 3$ inconnues, isostatique. Poutre sur deux appuis simples glissants : 2 inconnues pour 3 équations, mécanisme (rien n'empêche la translation horizontale).

## Actions mutuelles et signe des inconnues

**Actions mutuelles** (action–réaction) : $\{\mathcal T_{2 \to 1}\}_A = -\{\mathcal T_{1 \to 2}\}_A$.

**Ne devinez jamais le sens d'une inconnue.** Nommez-la et dessinez-la **positive** dans le repère d'étude ($X_A$ vers $+\vec x$, $Y_A$ vers $+\vec y$, $M_A$ anti-horaire). Le signe du résultat donne le sens réel. Pour l'action réciproque, un simple signe moins suffit.

## Méthode

1. **Isoler** un solide : le dessiner seul, dans la même position.
2. Repérer **toutes** ses zones de contact.
3. Pour chaque contact, identifier la liaison et la **remplacer par ses actions de liaison** (inconnues dessinées positives).
4. Ajouter les **actions à distance** (poids…).
5. Faire le **bilan** des actions extérieures.
6. Autant d'équations indépendantes que d'inconnues ? Sinon, isoler aussi les solides voisins et utiliser les actions mutuelles.
7. Appliquer le **PFS** à chaque solide isolé et résoudre.
8. **Redessiner** chaque solide avec les actions dans leur sens réel (sans signe moins) et contrôler la cohérence de chaque équilibre.` + MS1_1,
      },
      {
        slug: "torseur-de-cohesion",
        kind: "cours",
        title: "Le torseur des actions de cohésion",
        summary: "Principe de la coupure, définition (actions du tronçon droit sur le tronçon gauche), composantes N, T, Mt, Mf, exemples de consoles.",
        minutes: 30,
        body: String.raw`## Ce que la statique ne dit pas encore

Une console $AB$ de longueur $L$ est encastrée en $A$ et porte une force $F$ verticale vers le bas en $B$. La statique donne les réactions en $A$ : une force $F$ vers le haut et un moment $FL$ (sens anti-horaire). Mais que se passe-t-il **entre** $A$ et $B$ ?

La poutre ne se rompt pas : elle se déforme en gardant une ligne moyenne continue et dérivable. À l'intérieur de la matière, chaque partie retient l'autre comme le ferait un **encastrement invisible**. Les actions correspondantes sont les **actions de cohésion**. Ce résultat fondamental de la résistance des matériaux s'établit avec la seule statique.

## Principe de la coupure

On coupe fictivement la poutre par un plan $(\Pi)$ perpendiculaire à la ligne moyenne, au point $G$ d'abscisse $s$. On obtient un tronçon **gauche** $(E_g)$ et un tronçon **droit** $(E_d)$, gauche et droite étant définis par l'orientation du repère local. Les deux tronçons sont, eux aussi, en équilibre.

## Définition (convention du cours)

> Le **torseur des actions de cohésion** est le torseur des actions exercées par le tronçon **droit** $(E_d)$ sur le tronçon **gauche** $(E_g)$, réduit au centre de gravité $G$ de la section, dans le repère local ($\vec x$ tangent à la ligne moyenne).

$$\{\mathcal T_{coh}\}_G = \{\mathcal T_{E_d \to E_g}\}_G = \begin{Bmatrix} N & M_T \\ T_y & M_{fy} \\ T_z & M_{fz} \end{Bmatrix}_G$$

- $N$ : effort normal ; $T_y$, $T_z$ : efforts tranchants ;
- $M_T$ : moment de torsion ; $M_{fy}$, $M_{fz}$ : moments fléchissants.

C'est le torseur d'une liaison encastrement : six composantes dans l'espace, **trois dans le plan** ($N$, $T_y$, $M_{fz}$).

## Conséquences et calcul pratique

- L'action de $(E_g)$ sur $(E_d)$ vaut $-\{\mathcal T_{coh}\}_G$ (actions mutuelles).
- Les composantes dépendent de l'abscisse : $N(s)$, $T_y(s)$, $M_{fz}(s)$… On en trace les **diagrammes**.
- Le PFS appliqué à $(E_g)$ puis à la poutre entière donne :

$$\{\mathcal T_{coh}\}_G = -\{\mathcal T_{\text{ext} \to E_g}\}_G = +\{\mathcal T_{\text{ext} \to E_d}\}_G$$

On choisit le côté qui porte le moins d'actions.

## Exemple 1 (plateforme) : console sous une force en bout

Repère : $\vec x$ de $A$ vers $B$, $\vec y$ vers le haut. Coupure à l'abscisse $x$ ($0 < x < L$). Le tronçon droit ne porte que $F$, appliquée en $B$ :

- $N(x) = 0$ ;
- $T_y(x) = -F$ ;
- $M_{fz}(x) = (L - x) \times (-F) = -F\,(L - x)$.

Vérification par le tronçon gauche (réactions $Y_A = F$, $M_A = FL$) : $T_y = -F$ et $M_{fz} = -(FL - F\,x)$. ✓

Le moment est maximal en valeur absolue à l'encastrement ($-FL$) et nul en bout. Un moment négatif tend la fibre **supérieure** : c'est le cas de toute console.

## Exemple 2 (application du polycopié, résolution plateforme)

Console $ABC$ encastrée en $A$, $AB = BC = L$, charge répartie $p$ sur $AC$ et forces $F$ verticales vers le bas en $B$ et en $C$. Avec le tronçon droit :

- pour $L < x < 2L$ : $T_y = -p\,(2L - x) - F$ et $M_{fz} = -\dfrac{p\,(2L - x)^2}{2} - F\,(2L - x)$ ;
- pour $0 < x < L$ : $T_y = -p\,(2L - x) - 2F$ et $M_{fz} = -\dfrac{p\,(2L - x)^2}{2} - F\,(2L - x) - F\,(L - x)$.

À l'encastrement : $T_y(0) = -2pL - 2F$ et $M_{fz}(0) = -2pL^2 - 3FL$, ce qui correspond bien aux réactions $Y_A = 2pL + 2F$ et $M_A = 2pL^2 + 3FL$. L'effort tranchant saute de $F$ au passage de $B$.

Le polycopié propose aussi un portique (poteau encastré, traverse avec rotule interne et appui simple glissant) à traiter avec plusieurs repères locaux : un repère par barre, $\vec x$ orienté le long de chaque barre.` + MS1_1,
      },
      {
        slug: "fiche-statique-ms1",
        kind: "fiche",
        title: "Fiche — torseurs, liaisons, PFS, cohésion (MS1)",
        summary: "L'essentiel du chapitre 1 de MS1 sur une page.",
        minutes: 6,
        body: String.raw`- Torseur en $P$ : $\{\vec R \,;\, \vec M_P\}_P$. Changement de point : $\vec M_B = \vec M_A + \overrightarrow{BA} \wedge \vec R$ (« BABAR »).
- On n'additionne que des torseurs **au même point**. Invariants : $\vec R$ et $\vec M \cdot \vec R$.
- Glisseur $\{\vec R \,;\, \vec 0\}_M$ = force passant par $M$ ; couple $\{\vec 0 \,;\, \vec M\}$ = même moment partout.
- Plan : $M_{P,z} = (x_A - x_P)F_y - (y_A - y_P)F_x$, positif anti-horaire.
- Dualité : mouvement permis ⇔ action nulle ; mouvement bloqué ⇔ action transmise.

| Liaison (cours MS1) | Actions | Inconnues |
|---|---|---|
| appui simple glissant | $Y$ | 1 |
| appui simple ou pivot | $X$, $Y$ | 2 |
| appui plan | $X$, $M_z$ | 2 |
| encastrement | $X$, $Y$, $M_z$ | 3 |

- ⚠ « Appui simple » du cours MS1 = pivot (2 inconnues). Sur les modules interactifs du site, « appui simple » = 1 inconnue.
- PFS : $\Sigma F_x = 0$, $\Sigma F_y = 0$, $\Sigma M_{P,z} = 0$ (3 équations par solide dans le plan).
- Inconnues = équations : isostatique ; plus : hyperstatique (degré = différence) ; moins : mécanisme.
- Inconnues dessinées **positives** ; actions mutuelles : $\{\mathcal T_{2\to1}\} = -\{\mathcal T_{1\to2}\}$.
- Cohésion : actions de $E_d$ sur $E_g$ en $G$ : $(N, T_y, M_{fz})$ dans le plan $= +$ actions extérieures sur $E_d$ $= -$ actions extérieures sur $E_g$.
- Console de longueur $L$, force $F$ en bout : $T_y = -F$, $M_{fz}(x) = -F(L - x)$, $|M|_{max} = FL$ à l'encastrement.` + MS1_1,
      },
    ],
    exercises: [
      {
        title: "Torseurs et liaisons (MS1)",
        difficulty: "debutant",
        statement: String.raw`Une planche repose sur un pivot en $B$. Une force verticale vers le bas est appliquée en $A$, sur la même horizontale que $B$, à droite de $B$. On travaille dans le plan $(\vec x, \vec y)$, $\vec x$ vers la droite, $\vec y$ vers le haut, moments positifs dans le sens anti-horaire.

Questions 3 et 4 : on s'intéresse ensuite au type de liaison d'une poutre et à son degré d'hyperstaticité.`,
        data: String.raw`- $\|\vec R\| = 600$ N, verticale vers le bas, appliquée en $A$
- $BA = 1{,}5$ m (A à droite de B)
- Liaisons (vocabulaire du cours MS1)`,
        questions: [
          {
            kind: "numeric",
            prompt: String.raw`Calculer la composante $M_{B,z}$ du moment en $B$ de l'action appliquée en $A$ (signe compris).`,
            unit: "N·m",
            expected: -900,
            tol: 0.01,
            explanation: String.raw`$\vec M_B = \vec M_A + \overrightarrow{BA} \wedge \vec R$ avec $\vec M_A = \vec 0$, $\overrightarrow{BA} = (1{,}5 \,;\, 0)$ et $\vec R = (0 \,;\, -600)$ : $M_{B,z} = 1{,}5 \times (-600) - 0 \times 0 = -900$ N·m (sens horaire).`,
          },
          {
            kind: "qcm",
            prompt: "Pour transporter ce glisseur de A en B, il faut :",
            choices: [
              { label: "garder la même résultante et ajouter le moment $\\overrightarrow{BA} \\wedge \\vec R$", correct: true },
              { label: "garder la même résultante, le moment restant nul", correct: false },
              { label: "changer le sens de la résultante", correct: false },
              { label: "additionner directement les torseurs exprimés en A et en B", correct: false },
            ],
            explanation: "La résultante est un invariant ; seul le moment change avec le point (formule de Varignon). On n'additionne jamais des torseurs exprimés en des points différents.",
          },
          {
            kind: "qcm",
            prompt: "Combien d'inconnues de liaison introduit un « appui plan » (glissière) en modélisation plane ?",
            choices: [
              { label: "1 : $Y$", correct: false },
              { label: "2 : $X$ et $M_z$", correct: true },
              { label: "2 : $X$ et $Y$", correct: false },
              { label: "3 : $X$, $Y$ et $M_z$", correct: false },
            ],
            explanation: "L'appui plan laisse libre la translation $v$ : il bloque $u$ et $\\theta_z$, donc transmet $X$ et $M_z$ (dualité).",
          },
          {
            kind: "numeric",
            prompt: "Une poutre est encastrée en A et repose en B sur un appui simple glissant. Quel est son degré d'hyperstaticité ?",
            unit: "",
            expected: 1,
            tol: 0,
            explanation: String.raw`Inconnues : $3$ (encastrement) $+ 1$ (appui simple glissant) $= 4$ ; équations : $3$. Degré $= 4 - 3 = 1$.`,
          },
        ],
        correction: {
          donnees: String.raw`Force $\vec R = (0 \,;\, -600)$ N en $A$ ; $\overrightarrow{BA} = (1{,}5 \,;\, 0)$ m ; liaisons de la poutre : encastrement en $A$, appui simple glissant en $B$.`,
          schema: String.raw`Planche horizontale, pivot en $B$, force verticale descendante en $A$ à 1,5 m à droite. Repère $\vec x$ vers la droite, $\vec y$ vers le haut, $\vec z$ sortant ; moments positifs anti-horaires.`,
          equations: String.raw`Varignon : $\vec M_B = \vec M_A + \overrightarrow{BA} \wedge \vec R$. En plan : $M_{B,z} = (x_A - x_B)R_y - (y_A - y_B)R_x$.

Dualité des liaisons : chaque mouvement bloqué apporte une inconnue. Degré d'hyperstaticité $h$ = inconnues − équations (3 pour un solide plan).`,
          calculs: String.raw`$M_{B,z} = 1{,}5 \times (-600) - 0 = -900$ N·m.

Appui plan : $v$ libre, $u$ et $\theta_z$ bloqués → $X$, $M_z$ (2 inconnues).

Poutre : $3 + 1 = 4$ inconnues, $h = 4 - 3 = 1$.`,
          resultat: String.raw`$\{\mathcal T\}_B = \{(0 \,;\, -600 \text{ N}) \,;\, M_{B,z} = -900 \text{ N·m}\}_B$. Appui plan : 2 inconnues. Poutre encastrée + appui simple glissant : hyperstatique de degré 1.`,
          verification: String.raw`Sens physique : une force vers le bas à droite du pivot fait tourner la planche dans le sens horaire, d'où le moment négatif. Le module de 900 N·m vaut bien force × bras de levier ($600 \times 1{,}5$).`,
        },
      },
      {
        title: "Torseur de cohésion d'une console (MS1)",
        difficulty: "intermediaire",
        statement: String.raw`Une console $AB$ horizontale est encastrée en $A$ et porte en $B$ une force verticale dirigée vers le bas. Repère : $\vec x$ de $A$ vers $B$, $\vec y$ vers le haut, moments positifs dans le sens anti-horaire. Le torseur de cohésion est, selon la convention du cours, l'action du tronçon **droit** sur le tronçon **gauche**.`,
        data: String.raw`- $L = AB = 3$ m
- $F = 10$ kN, verticale vers le bas, en $B$`,
        questions: [
          { kind: "numeric", prompt: String.raw`Réaction verticale $Y_A$ de l'encastrement.`, unit: "kN", expected: 10, tol: 0.01, explanation: String.raw`$\Sigma F_y = 0$ : $Y_A - 10 = 0$, $Y_A = 10$ kN (vers le haut).` },
          { kind: "numeric", prompt: String.raw`Moment d'encastrement $M_A$ (signe compris).`, unit: "kN·m", expected: 30, tol: 0.01, explanation: String.raw`$\Sigma M_{A,z} = 0$ : $M_A + 3 \times (-10) = 0$, $M_A = +30$ kN·m (anti-horaire).` },
          { kind: "numeric", prompt: String.raw`Effort tranchant $T_y$ dans une section courante ($0 < x < 3$ m).`, unit: "kN", expected: -10, tol: 0.01, explanation: String.raw`Tronçon droit : seule la force $F$ ; $T_y = -10$ kN.` },
          { kind: "numeric", prompt: String.raw`Moment fléchissant $M_{fz}$ à l'abscisse $x = 1$ m.`, unit: "kN·m", expected: -20, tol: 0.01, explanation: String.raw`$M_{fz}(x) = -F\,(L - x) = -10 \times 2 = -20$ kN·m.` },
          {
            kind: "qcm",
            prompt: "Quelle fibre de la console est tendue ?",
            choices: [
              { label: "la fibre supérieure", correct: true },
              { label: "la fibre inférieure", correct: false },
              { label: "aucune : la console n'est pas fléchie", correct: false },
            ],
            explanation: "Le moment fléchissant est négatif sur toute la longueur : la fibre supérieure est tendue, comme pour toute console chargée vers le bas.",
          },
        ],
        correction: {
          donnees: String.raw`$L = 3$ m ; $F = 10$ kN vers le bas en $B$ ; encastrement en $A$ ($X_A$, $Y_A$, $M_A$).`,
          schema: String.raw`Console horizontale, encastrement à gauche ($A$), force en bout ($B$). Inconnues dessinées positives : $X_A$ vers $+\vec x$, $Y_A$ vers $+\vec y$, $M_A$ anti-horaire. Coupure en $G$ d'abscisse $x$.`,
          equations: String.raw`PFS global : $X_A = 0$ ; $Y_A - F = 0$ ; $M_A - F\,L = 0$.

Cohésion (tronçon droit) : $N = 0$, $T_y = -F$, $M_{fz} = -F\,(L - x)$.`,
          calculs: String.raw`$Y_A = 10$ kN ; $M_A = 10 \times 3 = 30$ kN·m.

$T_y = -10$ kN ; $M_{fz}(1) = -10 \times (3 - 1) = -20$ kN·m ; $M_{fz}(0) = -30$ kN·m ; $M_{fz}(3) = 0$.`,
          resultat: String.raw`$Y_A = 10$ kN, $M_A = 30$ kN·m. $N = 0$, $T_y = -10$ kN, $M_{fz}(x) = -10\,(3 - x)$ kN·m ; $M_{fz}(1\text{ m}) = -20$ kN·m.`,
          verification: String.raw`Avec le tronçon gauche : $\{\mathcal T_{coh}\} = -\{\text{actions sur } E_g\}$ : $T_y = -Y_A = -10$ kN et $M_{fz} = -(M_A - x\,Y_A) = -(30 - 10x)$ ; en $x = 1$ : $-20$ kN·m. ✓ Relation $dM_{fz}/dx = -T_y$ : $+10 = -(-10)$. ✓`,
        },
      },
    ],
  },

  /* ================================================================== */
  /* MÉCANIQUE DES STRUCTURES — MS1 chapitre 2 et MS3                    */
  /* ================================================================== */
  {
    subject: "mecanique-structures",
    chapter: {
      slug: "ms1-systemes-reticules",
      title: "MS1 — Les systèmes réticulés (treillis)",
      summary: "Cours MS1, chapitre 2 : hypothèses, isostaticité intérieure et extérieure, méthode des nœuds, épure de Cremona, coupures de Ritter.",
      level: "intermediaire",
      position: 1,
    },
    lessons: [
      {
        slug: "systemes-reticules-isostaticite",
        kind: "cours",
        title: "Systèmes réticulés : hypothèses et isostaticité",
        summary: "Définition, barre soumise à deux forces, traction ou compression, b = 2n − 3.",
        minutes: 25,
        body: String.raw`## Définition

Un **système réticulé** (ou treillis) est un assemblage de **barres rectilignes articulées entre elles à leurs extrémités**. Les points d'articulation, communs à plusieurs barres, sont les **nœuds** ; ce sont des liaisons pivot. Par hypothèse, **les forces extérieures sont appliquées aux nœuds**.

Exemple : la poutre **Warren**, formée de triangles équilatéraux. Membrure inférieure $A$–$D$–$F$–$B$ (trois travées de longueur $L$), membrure supérieure $C$–$E$–$G$, forces $F$ verticales vers le bas en $C$, $E$ et $G$ ; pivot en $A$, appui simple glissant en $B$.

## Une barre ne transmet qu'un effort normal

Isolons une barre $AB$ de longueur $L$, inclinée d'un angle $\alpha$ : elle n'est soumise qu'à **deux forces**, appliquées en $A$ et en $B$ (4 composantes $X_A$, $Y_A$, $X_B$, $Y_B$).

Écrites dans le repère local de la barre ($\vec x$ le long de la barre), les équations d'équilibre donnent $A_y = B_y = 0$ et $A_x + B_x = 0$ : les deux forces sont **portées par l'axe de la barre, égales et opposées**.

- forces dirigées **vers** la barre : barre **comprimée** ;
- forces **sortantes** : barre **tendue**.

Chaque barre travaille donc en traction ou en compression pure ; on appelle « effort dans la barre » cette force normale.

> **Convention de signe.** Le cours MS1 compte l'effort dans une barre **positif en compression** et négatif en traction. Le simulateur et les modules interactifs du site utilisent la convention de la RDM : **$N > 0$ en traction**. Les valeurs ont donc des signes opposés : indiquez toujours « traction » ou « compression » à côté du nombre.

Le cours se limite aux treillis **plans**, **isostatiques** intérieurement et extérieurement.

## Isostaticité extérieure

On compte les inconnues de liaison avec l'extérieur : 3 inconnues bien disposées (par exemple un pivot et un appui simple glissant) → isostatique extérieurement ; plus de 3 → hyperstatique extérieurement.

## Isostaticité intérieure

La structure isostatique élémentaire est le **triangle** (3 barres, 3 nœuds). On l'agrandit en ajoutant **un nœud et deux barres** (un nouveau triangle). Après $i$ ajouts : $n = 3 + i$ nœuds et $b = 3 + 2i$ barres, d'où :

$$b = 2n - 3 \quad \text{(isostatique intérieurement)}$$

- $b > 2n - 3$ : **hyperstatique intérieurement** (barres surabondantes, par exemple des diagonales croisées dans un panneau) ;
- $b < 2n - 3$ : **mécanisme**.

C'est une condition nécessaire : le treillis doit aussi être correctement triangulé.

**Lien avec la formule des modules interactifs.** Avec $r$ inconnues de liaison extérieures, l'isostaticité globale s'écrit $b + r = 2n$ (deux équations par nœud). Pour $r = 3$, on retrouve $b = 2n - 3$.

**Exemple.** Poutre Warren à trois travées : $n = 7$ nœuds, $b = 11$ barres, $2n - 3 = 11$ : isostatique intérieurement ; un pivot et un appui simple glissant ($r = 3$) : isostatique extérieurement.` + MS1_2,
      },
      {
        slug: "methodes-noeuds-cremona-ritter",
        kind: "cours",
        title: "Méthode des nœuds, épure de Cremona, coupures de Ritter",
        summary: "Calculer les efforts dans les barres : équilibre des nœuds, polygone des forces, notation de Bow, coupure à trois barres.",
        minutes: 40,
        body: String.raw`On reprend la poutre Warren (triangles équilatéraux de côté $L$, hauteur $h = L\sin 60° = L\sqrt3/2$). Les barres sont numérotées : 1 = $AC$, 2 = $AD$, 3 = $CD$, 4 = $CE$, 5 = $DE$, 6 = $DF$, 7 = $EF$, 8 = $EG$, 9 = $FG$, 10 = $FB$, 11 = $GB$.

**Réactions** (symétrie) : $Y_A = Y_B = 3F/2$, $X_A = 0$.

## 1. Méthode des nœuds (analytique)

On isole chaque nœud. Les forces y sont **concourantes** : l'équation de moment est toujours $0 = 0$, il reste **deux équations par nœud** ($\Sigma F_x = 0$, $\Sigma F_y = 0$). On commence par un nœud où arrivent au plus deux barres inconnues.

**Nœud A.** Notons $F_{1\to A}$ et $F_{2\to A}$ les efforts des barres 1 et 2 **sur le nœud**, comptés positifs dans le sens qui va de $A$ vers l'autre extrémité de la barre :

$$F_{2\to A} + \tfrac12 F_{1\to A} = 0 \qquad \tfrac{3F}{2} + \tfrac{\sqrt3}{2} F_{1\to A} = 0$$

d'où $F_{1\to A} = -F\sqrt3$ et $F_{2\to A} = F\sqrt3/2$.

Attention : ce sont les efforts **des barres sur le nœud**. Par les actions mutuelles, le nœud exerce sur les barres $F_{A\to 1} = F\sqrt3$ et $F_{A\to 2} = -F\sqrt3/2$.

- La barre 1 **pousse** sur le nœud : elle est **comprimée**, effort $F\sqrt3$.
- La barre 2 **tire** sur le nœud : elle est **tendue**, effort $F\sqrt3/2$.

On poursuit de proche en proche (nœud $C$, puis $D$…).

**Astuce pratique** : en dessinant chaque inconnue comme une barre qui **tire** sur le nœud, un résultat positif signifie traction (convention $N > 0$ en traction du simulateur) et un résultat négatif compression.

## 2. Méthode des nœuds (graphique)

Au nœud, la somme vectorielle des forces est nulle : le **polygone des forces** se ferme. Au nœud $A$ : on trace la réaction $3F/2$ à l'échelle, puis les directions des barres 1 et 2 ; le triangle refermé donne l'intensité et le sens des efforts **des barres sur le nœud**. On procède nœud par nœud, tant qu'il n'y a pas plus de deux inconnues.

## 3. Épure de Cremona

Méthode graphique systématique pour tout treillis isostatique, une fois les réactions connues.

1. **Notation de Bow** : on divise le plan en **zones** séparées par les lignes d'action de toutes les forces extérieures et par les barres. Les zones extérieures (entre deux forces) et intérieures (chaque triangle) reçoivent une lettre.
2. À chaque nœud, on **tourne toujours dans le sens trigonométrique** et on note les zones traversées.
3. Chaque force ou barre séparant deux zones devient, dans l'épure, un segment reliant les deux points-zones, parallèle à la force ou à la barre.
4. Les forces extérieures, connues, forment une ligne (ici verticale) ; les points des zones intérieures s'obtiennent par intersection des directions des barres.

**Lecture** : pour une barre, on tourne autour d'un de ses nœuds dans le sens positif ; le vecteur de l'épure parcouru dans ce sens donne l'effort **de la barre sur le nœud**. S'il est dirigé **vers le nœud**, la barre le pousse : **compression** ; s'il s'en éloigne, la barre le tire : **traction**. La longueur du segment donne l'intensité.

## 4. Méthode des coupures (Ritter)

Utile quand on ne cherche que quelques barres. Après calcul des réactions, on fait une **coupure fictive qui ne coupe pas plus de trois barres** (non concourantes) et on isole l'une des deux parties, exactement comme pour le torseur de cohésion d'une poutre.

**Coupure à travers les barres 4 ($CE$), 5 ($DE$) et 6 ($DF$)**, partie gauche isolée. Inconnues : $F_4$, $F_5$, $F_6$, actions de la partie droite sur la partie gauche, dirigées suivant les barres, positives vers $+\vec x$ pour 4 et 6 et de $D$ vers $E$ pour 5 (donc positives en **traction**) :

$$\begin{aligned} \Sigma F_x = 0 &: \; F_4 + F_5 \cos 60° + F_6 = 0 \\ \Sigma F_y = 0 &: \; \tfrac{3F}{2} - F + F_5 \sin 60° = 0 \\ \Sigma M_{D} = 0 &: \; -\tfrac{3FL}{2} + \tfrac{FL}{2} - h\,F_4 = 0 \end{aligned}$$

Résolution :

- moments en $D$ : $F_4 = -\dfrac{FL}{h} = -\dfrac{2F}{\sqrt3} = -\dfrac{2\sqrt3}{3}F \approx -1{,}155\,F$ (compression) ;
- projection verticale : $F_5 = -\dfrac{F/2}{\sqrt3/2} = -\dfrac{F}{\sqrt3} \approx -0{,}577\,F$ (compression) ;
- projection horizontale : $F_6 = -F_4 - \dfrac{F_5}{2} = \dfrac{5F}{2\sqrt3} = \dfrac{5\sqrt3}{6}F \approx 1{,}443\,F$ (traction).

> **Écart relevé dans le polycopié.** Le polycopié donne $F_4 = -2F\sqrt3/3$ (identique), mais $F_5 = -F$ et $F_6 = (3 + 4\sqrt3)F/6$. Or sa propre équation de projection verticale, $F/2 + F_5\sqrt3/2 = 0$, donne $F_5 = -F/\sqrt3$, et $F_6$ en découle. Les valeurs ci-dessus sont confirmées par la méthode des nœuds ($C$ puis $D$) et par le solveur du site. À faire confirmer par l'enseignant.

L'intérêt de la méthode : l'équation de moments **au point de concours de deux des barres coupées** donne directement l'effort dans la troisième.` + MS1_2,
      },
      {
        slug: "fiche-treillis-ms1",
        kind: "fiche",
        title: "Fiche — systèmes réticulés (MS1)",
        summary: "Hypothèses, isostaticité, méthodes de calcul et conventions.",
        minutes: 5,
        body: String.raw`- Barres rectilignes, articulées aux nœuds, charges aux nœuds ⇒ chaque barre est en **traction ou compression pure**.
- ⚠ Cours MS1 : effort **positif en compression**. Simulateur du site : $N > 0$ en **traction**. Toujours écrire « traction » ou « compression ».
- Isostaticité intérieure : $b = 2n - 3$ ($b$ barres, $n$ nœuds) ; $b > 2n - 3$ hyperstatique ; $b < 2n - 3$ mécanisme. Globalement : $b + r = 2n$.
- Méthode des nœuds : 2 équations par nœud ($\Sigma F_x$, $\Sigma F_y$) ; partir d'un nœud à 2 inconnues ; effort barre → nœud = − effort nœud → barre.
- La barre **pousse** le nœud : compression ; elle le **tire** : traction.
- Cremona : zones (notation de Bow), rotation dans le sens trigonométrique autour de chaque nœud, segments parallèles aux barres.
- Ritter : coupure de 3 barres au plus ; moments au point de concours de deux barres ⇒ effort de la troisième.
- Warren (triangles équilatéraux, 3 forces $F$ en membrure supérieure) : $AC$ comprimée $F\sqrt3$ ; $AD$ tendue $F\sqrt3/2$ ; $CE$ comprimée $2F/\sqrt3$ ; $DE$ comprimée $F/\sqrt3$ ; $DF$ tendue $5F/(2\sqrt3)$.` + MS1_2,
      },
    ],
    exercises: [
      {
        title: "Treillis Warren : nœuds et coupure de Ritter (MS1)",
        difficulty: "intermediaire",
        statement: String.raw`Poutre Warren à trois travées, formée de triangles équilatéraux de côté $L$ : membrure inférieure $A$–$D$–$F$–$B$, membrure supérieure $C$–$E$–$G$. Pivot en $A$, appui simple glissant en $B$. Trois forces $F$ verticales vers le bas en $C$, $E$ et $G$.

Barres : 1 = $AC$, 2 = $AD$, 3 = $CD$, 4 = $CE$, 5 = $DE$, 6 = $DF$… (11 barres).

Donner les **intensités** (valeurs positives) des efforts et préciser leur nature.`,
        data: String.raw`- $F = 12$ kN
- $L = 3$ m ; $h = L\sqrt3/2 = 2{,}598$ m`,
        questions: [
          { kind: "numeric", prompt: String.raw`Réaction verticale en $A$.`, unit: "kN", expected: 18, tol: 0.005, explanation: String.raw`Symétrie : $Y_A = Y_B = 3F/2 = 18$ kN.` },
          {
            kind: "qcm",
            prompt: "Avec n = 7 nœuds et b = 11 barres, le treillis est :",
            choices: [
              { label: "isostatique intérieurement ($b = 2n - 3$)", correct: true },
              { label: "hyperstatique intérieurement de degré 1", correct: false },
              { label: "un mécanisme", correct: false },
            ],
            explanation: "$2n - 3 = 2 \\times 7 - 3 = 11 = b$.",
          },
          { kind: "numeric", prompt: String.raw`Intensité de l'effort dans la barre 1 ($AC$).`, unit: "kN", expected: 20.785, tol: 0.005, explanation: String.raw`Nœud $A$ : $\tfrac{3F}{2} + \tfrac{\sqrt3}{2}F_{1\to A} = 0$ ⇒ $|F_1| = F\sqrt3 = 20{,}78$ kN.` },
          {
            kind: "qcm",
            prompt: "Nature de l'effort dans la barre 1 (AC) :",
            choices: [
              { label: "compression", correct: true },
              { label: "traction", correct: false },
              { label: "effort nul", correct: false },
            ],
            explanation: "La barre pousse sur le nœud A ($F_{1\\to A} = -F\\sqrt3$ dans le sens de A vers C).",
          },
          { kind: "numeric", prompt: String.raw`Intensité de l'effort dans la barre 2 ($AD$), tendue.`, unit: "kN", expected: 10.392, tol: 0.005, explanation: String.raw`$F_{2\to A} = -\tfrac12 F_{1\to A} = F\sqrt3/2 = 10{,}39$ kN (traction).` },
          { kind: "numeric", prompt: String.raw`Coupure de Ritter à travers 4, 5, 6 : intensité de l'effort dans la barre 4 ($CE$).`, unit: "kN", expected: 13.856, tol: 0.005, explanation: String.raw`Moments en $D$ : $F_4 = -FL/h = -2F/\sqrt3 = -13{,}86$ kN (compression).` },
          { kind: "numeric", prompt: String.raw`Intensité de l'effort dans la barre 5 ($DE$).`, unit: "kN", expected: 6.928, tol: 0.005, explanation: String.raw`$\Sigma F_y$ : $F/2 + F_5\sqrt3/2 = 0$ ⇒ $F_5 = -F/\sqrt3 = -6{,}93$ kN (compression).` },
          { kind: "numeric", prompt: String.raw`Intensité de l'effort dans la barre 6 ($DF$).`, unit: "kN", expected: 17.321, tol: 0.005, explanation: String.raw`$\Sigma F_x$ : $F_6 = -F_4 - F_5/2 = 5F/(2\sqrt3) = 17{,}32$ kN (traction).` },
        ],
        correction: {
          donnees: String.raw`$F = 12$ kN en $C$, $E$, $G$ ; $L = 3$ m ; $h = 2{,}598$ m ; angles des diagonales : 60°.`,
          schema: String.raw`Treillis Warren, pivot en $A$ (gauche), appui simple glissant en $B$ (droite). Coupure de Ritter verticale entre $C$ et $E$, coupant les barres 4 ($CE$), 5 ($DE$) et 6 ($DF$) ; partie gauche isolée, inconnues dirigées vers l'extérieur de la partie gauche (positives en traction).`,
          equations: String.raw`Réactions : $Y_A = Y_B = 3F/2$.

Nœud $A$ : $F_{2\to A} + \tfrac12 F_{1\to A} = 0$ ; $\tfrac{3F}{2} + \tfrac{\sqrt3}{2}F_{1\to A} = 0$.

Ritter : $F_4 + F_5\cos60° + F_6 = 0$ ; $\tfrac{3F}{2} - F + F_5\sin60° = 0$ ; $-\tfrac{3FL}{2} + \tfrac{FL}{2} - h F_4 = 0$.`,
          calculs: String.raw`$Y_A = 18$ kN.

$F_{1\to A} = -F\sqrt3 = -20{,}785$ kN ; $F_{2\to A} = 10{,}392$ kN.

$F_4 = -FL/h = -12 \times 3 / 2{,}598 = -13{,}856$ kN.

$F_5 = -(F/2)/(\sqrt3/2) = -6/0{,}866 = -6{,}928$ kN.

$F_6 = 13{,}856 + 3{,}464 = 17{,}321$ kN.`,
          resultat: String.raw`Barre 1 : 20,78 kN en compression. Barre 2 : 10,39 kN en traction. Barre 4 : 13,86 kN en compression. Barre 5 : 6,93 kN en compression. Barre 6 : 17,32 kN en traction.

Avec la convention du cours MS1 (compression positive) : $+20{,}78$ ; $-10{,}39$ ; $+13{,}86$ ; $+6{,}93$ ; $-17{,}32$ kN. Avec celle du simulateur ($N > 0$ en traction) : signes opposés.`,
          verification: String.raw`Méthode des nœuds au nœud $C$ : $\Sigma F_y$ donne $N_3 = F/\sqrt3$ (traction), $\Sigma F_x$ donne $N_4 = -2F/\sqrt3$ ✓ ; au nœud $D$ : $N_5 = -F/\sqrt3$ et $N_6 = 5F/(2\sqrt3)$ ✓. Le solveur du site (treillis Warren, 3 panneaux, $P = 12$ kN en membrure supérieure) donne les mêmes valeurs. Remarque : le polycopié indique $F_5 = -F$ et $F_6 = (3+4\sqrt3)F/6$ ; ces valeurs ne vérifient pas l'équation de projection verticale.`,
        },
      },
    ],
  },
  {
    subject: "mecanique-structures",
    chapter: {
      slug: "ms3-flambement-poteaux",
      title: "MS3 — Le flambement des poteaux",
      summary: "Cours MS3 : instabilité élastique, charge critique d'Euler, poteau console, contrainte critique, élancement, longueur de flambement.",
      level: "avance",
      position: 2,
    },
    lessons: [
      {
        slug: "flambement-euler",
        kind: "cours",
        title: "Flambement d'Euler : poteau bi-articulé et poteau console",
        summary: "Mise en équation, solution, efforts critiques, modes de flambement.",
        minutes: 35,
        body: String.raw`## Une instabilité élastique

Le **flambement** est un phénomène d'**instabilité élastique**, comme le voilement et le déversement. Au-delà d'un certain seuil, les déformations deviennent grandes et modifient profondément les sollicitations : il faudrait calculer sur la configuration **déformée**. On se place ici **juste avant** ce seuil et on détermine ce seuil avec l'hypothèse des petites déformations.

Le flambement simple affecte les poutres en **compression simple**. Il se produit dans le plan où l'**inertie est la plus faible** (pour un profilé en I : autour de l'axe faible).

## Hypothèses d'Euler

- poutre **bi-articulée**, de longueur $L$, de module d'Young $E$ ;
- effort normal de **compression centré** $N$ suivant l'axe $(Ox)$ ;
- dimensions transversales faibles devant la longueur ;
- étude dans le plan $(x, y)$, celui de l'inertie minimale $I$.

## Mise en équation

Déformée $y(x)$, petite. On coupe la poutre à l'abscisse $x$ et on isole le tronçon droit. L'équilibre des moments au point de coupure donne :

$$M(x) = -N\,y(x)$$

La relation de comportement de la flexion (cours de théorie des poutres) s'écrit $EI\,y''(x) = M(x)$, d'où :

$$y'' + \omega^2 y = 0 \qquad \text{avec} \qquad \omega^2 = \frac{N}{EI}$$

## Solution et efforts critiques

Solution générale : $y(x) = A\cos(\omega x) + B\sin(\omega x)$.

- $y(0) = 0$ ⇒ $A = 0$ ;
- $y(L) = 0$ ⇒ $B\sin(\omega L) = 0$.

Si $B = 0$, la poutre reste droite. Une déformée non nulle ($B \neq 0$) n'existe que si $\sin(\omega L) = 0$, soit $\omega L = k\pi$ :

$$N_{cr}^{(k)} = \frac{k^2\pi^2 EI}{L^2} \qquad (k = 1, 2, 3\ldots)$$

Il existe une infinité d'efforts critiques ; le plus faible est atteint le premier. C'est la **charge critique d'Euler** :

$$\boxed{N_E = \frac{\pi^2 EI}{L^2}}$$

- $N_E$ est proportionnel à $I$ : on étudie le plan d'inertie **la plus faible**.
- **Modes** : $y = B\sin(k\pi x/L)$. Mode 1 : une demi-onde ; mode 2 : un nœud à $L/2$ ; mode 3 : nœuds à $L/3$ et $2L/3$. Les modes supérieurs sont très difficiles à atteindre : le mode 1 intervient d'abord.

## Poteau console (déplacement en tête permis)

Encastrement en $x = 0$, extrémité libre en $x = L$ chargée par $N$, déplacement en tête $\delta = y(L)$. L'équilibre du tronçon droit donne $M(x) = N\,(\delta - y(x))$, d'où :

$$y'' + \omega^2 y = \omega^2 \delta$$

Solution : $y = \delta + A\cos(\omega x) + B\sin(\omega x)$, avec trois inconnues $A$, $B$, $\delta$ et trois conditions : $y(0) = 0$ ⇒ $A + \delta = 0$ ; $y'(0) = 0$ ⇒ $B\omega = 0$ ; $y(L) = \delta$ ⇒ $A\cos(\omega L) + B\sin(\omega L) = 0$.

Le déterminant du système vaut $-\omega\cos(\omega L)$.

- S'il est non nul : $A = B = \delta = 0$, pas de flambement.
- S'il est nul : $\cos(\omega L) = 0$, $\omega L = (2k+1)\pi/2$, soit $N_{cr}^{(k)} = (2k+1)^2\pi^2EI/(4L^2)$.

Le plus petit ($k = 0$) :

$$N_{cr} = \frac{\pi^2 EI}{4L^2} = \frac{N_E}{4}$$

Un poteau console flambe sous une charge **quatre fois plus faible** que le même poteau bi-articulé.` + MS3_1,
      },
      {
        slug: "contrainte-critique-longueur-flambement",
        kind: "cours",
        title: "Contrainte critique, élancement et longueur de flambement",
        summary: "σ = π²E/λ², rayon de giration, élancement critique de l'acier, tableau des longueurs de flambement.",
        minutes: 25,
        body: String.raw`## Contrainte critique d'Euler

En divisant la charge critique par l'aire $A$ de la section :

$$\sigma_E = \frac{N_E}{A} = \frac{\pi^2 E I}{A L^2}$$

On introduit le **rayon de giration** et l'**élancement** :

$$i = \sqrt{\frac{I}{A}} \;\; \text{(en m)} \qquad \lambda = \frac{L}{i} \;\; \text{(sans unité)}$$

d'où :

$$\boxed{\sigma_E = \frac{\pi^2 E}{\lambda^2}}$$

La contrainte critique ne dépend que du matériau ($E$) et de l'élancement.

## Application à la construction métallique

Dans le plan $(\lambda, \sigma)$, $\sigma_E(\lambda)$ est une hyperbole, bornée par la **limite élastique** $f_e$. L'élancement particulier $\lambda_k$ pour lequel $\sigma_E = f_e$ vaut :

$$\lambda_k = \pi\sqrt{\frac{E}{f_e}}$$

- $\lambda < \lambda_k$ : $\sigma_E > f_e$, la ruine survient par plastification ($\sigma = f_e$) avant tout flambement ;
- $\lambda > \lambda_k$ : $\sigma_E < f_e$, la ruine par **flambement** est possible dès que $\sigma = \sigma_E$.

Acier FeE235 (S235), $E = 210\,000$ MPa, $f_e = 235$ MPa : $\lambda_k = \pi\sqrt{210\,000/235} = 93{,}9$. Le polycopié l'arrondit à « ≅ 93 ».

Le modèle d'Euler suppose une poutre parfaite. Les règlements (Eurocode 3) appliquent en plus un coefficient de réduction qui tient compte des imperfections ; ce n'est pas l'objet de ce chapitre.

## Longueur de flambement

Pour des appuis quelconques, $N_{cr} = m\,\pi^2 EI/L^2$, où $m$ dépend des liaisons. La **longueur de flambement** $l_f$ est la longueur fictive d'une poutre bi-articulée de même charge critique :

$$N_{cr} = \frac{\pi^2 EI}{l_f^2} \qquad \Longrightarrow \qquad l_f = \frac{L}{\sqrt m}$$

Les formules de la contrainte critique restent valables en remplaçant $L$ par $l_f$ : $\lambda = l_f / i$.

| Liaisons | $m$ | $l_f$ | $N_{cr}$ |
|---|---|---|---|
| bi-articulée | 1 | $L$ | $\pi^2EI/L^2$ |
| articulée – encastrée | ≈ 2 | ≈ $0{,}7\,L$ | ≈ $2\pi^2EI/L^2$ |
| bi-encastrée | 4 | $L/2$ | $4\pi^2EI/L^2$ |
| encastrée – libre (console) | 1/4 | $2L$ | $\pi^2EI/(4L^2)$ |
| encastrée – encastrée, tête guidée (déplacement transversal libre) | 1 | $L$ | $\pi^2EI/L^2$ |

Pour le cas articulé–encastré, $l_f = 0{,}7\,L$ est exact à 0,12 % près.` + MS3_1,
      },
      {
        slug: "fiche-flambement-ms3",
        kind: "fiche",
        title: "Fiche — flambement (MS3)",
        summary: "Formules d'Euler, élancement, longueurs de flambement.",
        minutes: 5,
        body: String.raw`- Flambement = instabilité élastique d'une barre **comprimée**, dans le plan d'inertie **minimale**.
- Bi-articulée : $EI\,y'' = -N\,y$ ⇒ $N_E = \pi^2EI/L^2$ (mode 1, une demi-onde).
- Console : $N_{cr} = \pi^2EI/(4L^2) = N_E/4$.
- $i = \sqrt{I/A}$ ; $\lambda = l_f/i$ ; $\sigma_E = \pi^2E/\lambda^2$.
- $\lambda_k = \pi\sqrt{E/f_e}$ ; S235 : $\lambda_k = 93{,}9$. Si $\lambda > \lambda_k$ : flambement avant plastification.
- $l_f = L/\sqrt m$ : bi-articulée $L$ ; articulée–encastrée $0{,}7L$ ; bi-encastrée $L/2$ ; console $2L$ ; encastrée–encastrée à tête guidée $L$.
- Unités : $E$ en MPa = N/mm², $I$ en mm⁴, $L$ en mm ⇒ $N$ en N.` + MS3_1,
      },
    ],
    exercises: [
      {
        title: "Flambement d'un poteau IPE 200 (MS3)",
        difficulty: "intermediaire",
        statement: String.raw`Un poteau en profilé IPE 200, de hauteur $L = 4$ m, est articulé à ses deux extrémités et comprimé par un effort centré. On étudie le flambement selon l'axe faible du profilé.`,
        data: String.raw`- $L = 4$ m ; acier S235 : $E = 210\,000$ MPa, $f_e = 235$ MPa
- IPE 200 : $A = 28{,}5$ cm² ; inertie forte $I_y = 1\,943$ cm⁴ ; inertie faible $I_z = 142{,}4$ cm⁴ (notations des catalogues)`,
        questions: [
          {
            kind: "qcm",
            prompt: "Selon quelle inertie le poteau flambe-t-il ?",
            choices: [
              { label: "l'inertie faible $I_z = 142{,}4$ cm⁴", correct: true },
              { label: "l'inertie forte $I_y = 1\\,943$ cm⁴", correct: false },
              { label: "la somme $I_y + I_z$", correct: false },
            ],
            explanation: "$N_E$ est proportionnelle à $I$ : la plus petite charge critique correspond à l'inertie minimale.",
          },
          { kind: "numeric", prompt: String.raw`Charge critique d'Euler $N_E$.`, unit: "kN", expected: 184.46, tol: 0.005, explanation: String.raw`$N_E = \pi^2 \times 210\,000 \times 142{,}4\cdot10^4 / 4000^2 = 184\,463$ N.` },
          { kind: "numeric", prompt: String.raw`Rayon de giration $i_z$.`, unit: "mm", expected: 22.353, tol: 0.005, explanation: String.raw`$i = \sqrt{142{,}4\cdot10^4 / 2850} = 22{,}35$ mm.` },
          { kind: "numeric", prompt: String.raw`Élancement $\lambda$.`, unit: "", expected: 178.95, tol: 0.005, explanation: String.raw`$\lambda = 4000 / 22{,}35 = 178{,}9$.` },
          { kind: "numeric", prompt: String.raw`Contrainte critique d'Euler $\sigma_E$.`, unit: "MPa", expected: 64.72, tol: 0.005, explanation: String.raw`$\sigma_E = \pi^2 E/\lambda^2 = N_E / A = 184\,463 / 2850 = 64{,}7$ MPa.` },
          { kind: "numeric", prompt: String.raw`Élancement critique $\lambda_k$ de l'acier S235.`, unit: "", expected: 93.91, tol: 0.003, explanation: String.raw`$\lambda_k = \pi\sqrt{210\,000/235} = 93{,}9$.` },
          {
            kind: "qcm",
            prompt: "Quel mode de ruine gouverne ?",
            choices: [
              { label: "le flambement, car $\\lambda > \\lambda_k$ ($\\sigma_E < f_e$)", correct: true },
              { label: "la plastification, car $\\lambda > \\lambda_k$", correct: false },
              { label: "aucun : un poteau comprimé ne peut pas flamber", correct: false },
            ],
            explanation: "$\\sigma_E = 64{,}7$ MPa $< f_e = 235$ MPa : le poteau flamberait bien avant d'atteindre la limite élastique.",
          },
          { kind: "numeric", prompt: String.raw`Même poteau encastré en pied et libre en tête : charge critique.`, unit: "kN", expected: 46.12, tol: 0.005, explanation: String.raw`$l_f = 2L$ : $N_{cr} = N_E/4 = 46{,}1$ kN.` },
        ],
        correction: {
          donnees: String.raw`$L = 4000$ mm ; $E = 210\,000$ MPa ; $f_e = 235$ MPa ; $A = 2850$ mm² ; $I_z = 1\,424\,000$ mm⁴.`,
          schema: String.raw`Poteau vertical bi-articulé, effort de compression centré $N$. Le flambement se produit dans le plan perpendiculaire à l'axe faible (les semelles s'écartent latéralement).`,
          equations: String.raw`$N_E = \pi^2EI/l_f^2$ ; $i = \sqrt{I/A}$ ; $\lambda = l_f/i$ ; $\sigma_E = \pi^2E/\lambda^2$ ; $\lambda_k = \pi\sqrt{E/f_e}$.`,
          calculs: String.raw`$N_E = 9{,}8696 \times 210\,000 \times 1\,424\,000 / 16\cdot10^6 = 184\,463$ N.

$i_z = \sqrt{1\,424\,000/2850} = \sqrt{499{,}6} = 22{,}35$ mm ; $\lambda = 4000/22{,}35 = 178{,}9$.

$\sigma_E = 9{,}8696 \times 210\,000 / 178{,}95^2 = 64{,}7$ MPa (= $N_E/A$).

$\lambda_k = \pi\sqrt{893{,}6} = 93{,}9$.

Console : $l_f = 8000$ mm, $N_{cr} = 184{,}46/4 = 46{,}1$ kN.`,
          resultat: String.raw`$N_E = 184{,}5$ kN ; $i_z = 22{,}35$ mm ; $\lambda = 178{,}9 > \lambda_k = 93{,}9$ : ruine par flambement, $\sigma_E = 64{,}7$ MPa. En console : $N_{cr} = 46{,}1$ kN.`,
          verification: String.raw`Cohérence : $N_E / A = 64{,}7$ MPa $= \pi^2E/\lambda^2$ ✓. Autour de l'axe fort, $N_E$ serait $1943/142{,}4 = 13{,}6$ fois plus grande : le flambement selon l'axe faible gouverne bien. Le résultat est une borne théorique (poteau parfait) : l'Eurocode 3 la réduit pour tenir compte des imperfections.`,
        },
      },
    ],
  },

  /* ================================================================== */
  /* RDM — MS2                                                           */
  /* ================================================================== */
  {
    subject: "rdm",
    chapter: {
      slug: "ms2-caracteristiques-sections",
      title: "MS2 — Caractéristiques des sections de poutres",
      summary: "Cours MS2, chapitre 1 : aire, moment statique, centre de gravité, moments quadratiques, théorème de Huygens.",
      level: "debutant",
      position: 1,
    },
    lessons: [
      {
        slug: "aire-moment-statique-inertie",
        kind: "cours",
        title: "Aire, moment statique, centre de gravité, moments quadratiques",
        summary: "Définitions intégrales, sections composées, théorème de Huygens.",
        minutes: 30,
        body: String.raw`## Section et fibre

La **section** est une tranche transversale de la poutre. On la représente dans le repère $(O, \vec y, \vec z)$, car $\vec x$ est l'axe **longitudinal** de la poutre. Dans ce cours, $\vec y$ est vertical et $\vec z$ horizontal.

Une **fibre** est un élément infinitésimal de la section, d'aire $dS = dy\,dz$.

## Aire

$$A = \int_S dS = \iint dy\,dz$$

## Moment statique

Le moment statique (le mot « moment » est usurpé, mais l'idée est proche du moment d'une force) est la somme des surfaces élémentaires multipliées par leur **distance** à un axe : plus la surface est loin de l'axe, plus il est grand.

$$S_{Oy} = \int_S z\,dS \qquad S_{Oz} = \int_S y\,dS \qquad \text{(en m}^3\text{ ou mm}^3\text{)}$$

Les moments statiques **s'additionnent** pour une section composée, mais ils sont **signés** (une surface située du côté négatif de l'axe compte négativement).

## Centre de gravité

Le **centre de gravité** $G$ est le point par lequel passent tous les axes par rapport auxquels le moment statique est nul. Conséquences :

- le moment statique par rapport à un axe passant par $G$ est nul ;
- le moment statique par rapport à un axe vaut $A$ × (distance de $G$ à l'axe).

$$y_G = \frac{S_{Oz}}{A} \qquad z_G = \frac{S_{Oy}}{A}$$

$G$ ne dépend pas du repère choisi. Pour une section composée de parties d'aires $A_i$ et de centres $G_i$ : $y_G = \dfrac{\sum A_i\,y_{G_i}}{\sum A_i}$.

## Moments quadratiques

Par rapport aux axes $Oy$ et $Oz$ :

$$I_{Oy} = \int_S z^2\,dS \qquad I_{Oz} = \int_S y^2\,dS \qquad I_{Oyz} = \int_S y\,z\,dS \;\; \text{(produit)}$$

Unité : m⁴ ou mm⁴. Ils caractérisent la **rigidité de la section en flexion**. Ils sont toujours positifs (sauf le produit $I_{Oyz}$) et **s'additionnent**, à condition d'être exprimés **par rapport au même axe**.

**Rectangle** $b \times h$ ($h$ suivant $\vec y$), axe $Gz$ passant par son centre (calcul de l'intégrale, résultat classique) :

$$I_{Gz} = \int_{-h/2}^{h/2} y^2\,b\,dy = \frac{b\,h^3}{12}$$

> **Notations.** Avec $\vec y$ vertical, la flexion dans le plan vertical fait intervenir $I_{Gz}$. Les catalogues de profilés (Eurocode 3) appellent au contraire $I_y$ l'inertie **forte** et $I_z$ l'inertie **faible**. Vérifiez toujours quel axe est désigné.

## Théorème de Huygens

Pour une section d'aire $A$ et de centre $G$, et deux axes parallèles $(O\Delta)$ et $(G\Delta)$ distants de $d$ :

$$\boxed{I_{O\Delta} = I_{G\Delta} + A\,d^2}$$

C'est l'outil du changement d'axe : pour une section composée, on calcule l'inertie de chaque partie par rapport à son propre centre, on la **transporte** au centre $G$ de la section entière, puis on additionne.

**Exemple (plateforme).** Rectangle $100 \times 200$ mm ($h = 200$ mm vertical). $I_{Gz} = 100 \times 200^3/12 = 66{,}7\cdot10^6$ mm⁴. Par rapport à sa base ($d = 100$ mm) : $I = 66{,}7\cdot10^6 + 20\,000 \times 100^2 = 266{,}7\cdot10^6$ mm⁴ $= b h^3/3$.` + MS2_1,
      },
      {
        slug: "fiche-sections-ms2",
        kind: "fiche",
        title: "Fiche — caractéristiques des sections (MS2)",
        summary: "Formules et méthode pour une section composée.",
        minutes: 5,
        body: String.raw`- Repère de section $(O, \vec y, \vec z)$, $\vec x$ = axe de la poutre ; $dS = dy\,dz$.
- $A = \int_S dS$ ; $S_{Oz} = \int_S y\,dS$ ; $S_{Oy} = \int_S z\,dS$ (signés, additionnables).
- $y_G = S_{Oz}/A = \sum A_i y_i / \sum A_i$ ; $z_G = S_{Oy}/A$.
- $I_{Oz} = \int_S y^2 dS$ ; $I_{Oy} = \int_S z^2 dS$ ; $I_{Oyz} = \int_S yz\,dS$.
- Rectangle $b \times h$ : $I_{Gz} = bh^3/12$ ; par rapport à la base : $bh^3/3$.
- Huygens : $I_{O\Delta} = I_{G\Delta} + A d^2$ (axes parallèles, $G\Delta$ passant par le centre de la partie).
- Section composée : 1) découper en rectangles ; 2) $G$ global ; 3) Huygens pour chaque partie vers $G$ ; 4) somme.
- ⚠ Catalogues : $I_y$ = inertie forte, $I_z$ = inertie faible.` + MS2_1,
      },
    ],
    exercises: [
      {
        title: "Section en T : centre de gravité et moment quadratique (MS2)",
        difficulty: "intermediaire",
        statement: String.raw`Une poutre a une section en T, composée d'une **table** rectangulaire horizontale posée sur une **âme** rectangulaire verticale. L'origine $O$ est au bas de l'âme, sur l'axe de symétrie vertical ; $\vec y$ est vertical vers le haut.`,
        data: String.raw`- Âme : largeur 40 mm, hauteur 160 mm (de $y = 0$ à $y = 160$ mm)
- Table : largeur 200 mm, épaisseur 40 mm (de $y = 160$ à $y = 200$ mm)`,
        questions: [
          { kind: "numeric", prompt: "Aire de la section.", unit: "mm²", expected: 14400, tol: 0.001, explanation: String.raw`$40 \times 160 + 200 \times 40 = 6400 + 8000 = 14\,400$ mm².` },
          { kind: "numeric", prompt: String.raw`Moment statique $S_{Oz}$ par rapport à l'axe horizontal passant par $O$.`, unit: "mm³", expected: 1952000, tol: 0.001, explanation: String.raw`$6400 \times 80 + 8000 \times 180 = 512\,000 + 1\,440\,000 = 1\,952\,000$ mm³.` },
          { kind: "numeric", prompt: String.raw`Position $y_G$ du centre de gravité.`, unit: "mm", expected: 135.556, tol: 0.002, explanation: String.raw`$y_G = 1\,952\,000 / 14\,400 = 135{,}6$ mm.` },
          { kind: "numeric", prompt: String.raw`Moment quadratique $I_{Gz}$ par rapport à l'axe horizontal passant par $G$.`, unit: "cm⁴", expected: 5027.56, tol: 0.003, explanation: String.raw`Âme : $40 \times 160^3/12 + 6400 \times 55{,}56^2 = 33{,}41\cdot10^6$ mm⁴ ; table : $200 \times 40^3/12 + 8000 \times 44{,}44^2 = 16{,}87\cdot10^6$ mm⁴ ; total $50{,}28\cdot10^6$ mm⁴ $= 5028$ cm⁴.` },
          {
            kind: "qcm",
            prompt: "Pourquoi utilise-t-on le théorème de Huygens dans ce calcul ?",
            choices: [
              { label: "parce que les inerties de l'âme et de la table ne sont pas exprimées par rapport au même axe", correct: true },
              { label: "parce que le moment statique est négatif", correct: false },
              { label: "parce que la section n'est pas symétrique par rapport à un axe vertical", correct: false },
            ],
            explanation: "On n'additionne que des moments quadratiques exprimés par rapport au même axe : chaque partie est transportée de son propre centre vers $G$.",
          },
        ],
        correction: {
          donnees: String.raw`Âme $40 \times 160$ mm, centre à $y = 80$ mm ; table $200 \times 40$ mm, centre à $y = 180$ mm.`,
          schema: String.raw`Section en T, axe de symétrie vertical ($z_G = 0$). Origine au bas de l'âme ; $\vec y$ vers le haut.`,
          equations: String.raw`$A = \sum A_i$ ; $S_{Oz} = \sum A_i y_i$ ; $y_G = S_{Oz}/A$ ; $I_{Gz} = \sum \left( b_i h_i^3/12 + A_i\,(y_i - y_G)^2 \right)$.`,
          calculs: String.raw`$A = 14\,400$ mm² ; $S_{Oz} = 1\,952\,000$ mm³ ; $y_G = 135{,}56$ mm.

Âme : $I_0 = 13\,653\,333$ mm⁴ ; $d = 55{,}56$ mm ; $A d^2 = 19\,753\,086$ mm⁴ ⇒ $33\,406\,420$ mm⁴.

Table : $I_0 = 1\,066\,667$ mm⁴ ; $d = 44{,}44$ mm ; $A d^2 = 15\,802\,469$ mm⁴ ⇒ $16\,869\,136$ mm⁴.

$I_{Gz} = 50\,275\,556$ mm⁴.`,
          resultat: String.raw`$A = 14\,400$ mm² ; $y_G = 135{,}6$ mm au-dessus de la base (64,4 mm sous le haut de la table) ; $I_{Gz} = 50{,}28\cdot10^6$ mm⁴ $= 5028$ cm⁴.`,
          verification: String.raw`$G$ est plus près de la table, qui porte plus de la moitié de l'aire ✓. Contrôle par $I_{Oz} - A\,y_G^2$ : $I_{Oz} = 40 \times 160^3/3 + (200 \times 40^3/12 + 8000 \times 180^2) = 54\,613\,333 + 260\,266\,667 = 314\,880\,000$ mm⁴ ; $314\,880\,000 - 14\,400 \times 135{,}556^2 = 50\,275\,556$ mm⁴ ✓.`,
        },
      },
    ],
  },
  {
    subject: "rdm",
    chapter: {
      slug: "ms2-notion-de-contrainte",
      title: "MS2 — Théorie des poutres : la notion de contrainte (extrait)",
      summary: "Cours MS2, chapitre 2 (pages 3 à 5 seulement) : de la statique à la RDM, vecteur contrainte, contraintes normale et tangentielle, tenseur des contraintes.",
      level: "intermediaire",
      position: 2,
    },
    lessons: [
      {
        slug: "vecteur-contrainte-tenseur",
        kind: "cours",
        title: "De la statique à la RDM : vecteur contrainte et tenseur des contraintes",
        summary: "Limites de la statique, vecteur contrainte, unités, contraintes normale et tangentielle, état de contrainte en un point.",
        minutes: 25,
        body: String.raw`> **Extrait.** Le fichier transmis ne contient que les pages 3 à 5 de ce chapitre (17 pages). La suite (essai de traction, loi de comportement, sollicitations) n'est pas reprise ici ; ces notions sont traitées dans le module interactif « Résistance des matériaux » du site, avec ses propres notations.

## Pourquoi la résistance des matériaux ?

La RDM s'appuie sur la statique, mais va plus loin :

- la statique ne considère que les **actions extérieures** ; la RDM **pénètre à l'intérieur** de la matière (forces sur chaque élément : les **contraintes**) et étudie les **déformations** qui en résultent ;
- la statique suppose les solides **indéformables** ; la RDM autorise les déformations naturelles (dilatation thermique, planche qui fléchit, fil qui s'allonge).

**Limite de la statique** : les systèmes **hyperstatiques**. Une poutre encastrée en $A$ et posée en $B$ sur un appui simple glissant, chargée par une force $F$, a 4 inconnues pour 3 équations. L'appui $B$ reprend forcément un effort vertical qui soulage l'encastrement, mais la statique seule ne permet pas de le calculer : il faut tenir compte des déformations. De même pour une poutre continue sur trois appuis.

Tant que la charge ne dépasse pas une certaine limite, la structure est en équilibre **extérieur** (statique) et en équilibre **intérieur** (liaisons entre éléments de matière, RDM). C'est la **mécanique des milieux continus** qui introduit la notion de contrainte.

## Le vecteur contrainte

Les efforts de cohésion (réduits en $G$) sont les actions du tronçon $(E_d)$ sur $(E_g)$ à travers la section fictive $(S)$. En un point $M$ de la section, sur une petite surface $\Delta S$, s'exerce une action élémentaire $\Delta\vec f$. On note $\vec n$ la **normale extérieure** en $M$ (orientée vers l'extérieur de la matière de $E_g$) et $\vec t$ un vecteur unitaire tangent à la section, tel que $(M, \vec n, \vec t)$ soit **orthonormé direct**.

$$\vec C(M, \vec n) = \lim_{\Delta S \to 0} \frac{\Delta \vec f}{\Delta S} = \frac{d\vec f}{dS}$$

## Unités

$[\text{N}]/[\text{m}^2] = \text{Pa}$.

- $1 \text{ MPa} = 10^6 \text{ Pa} = 1 \text{ N/mm}^2 = 1 \text{ MN/m}^2 = 10 \text{ bars}$ : contraintes admissibles des matériaux ;
- $1 \text{ kPa} = 10^3 \text{ Pa} = 1 \text{ kN/m}^2$ : mécanique des sols.

## Contrainte normale et contrainte tangentielle

On travaille sur des sections droites, de normale $\vec x$. Notation à deux indices : le premier désigne la normale à la facette, le second l'axe de projection.

$$\vec C(M, \vec x) = \sigma\,\vec n + \tau\,\vec t = \sigma_{xx}\,\vec x + \tau_{xy}\,\vec y + \tau_{xz}\,\vec z$$

- $\sigma = \sigma_{xx}$ : **contrainte normale** (projection sur la normale) ;
- $\vec\tau = \tau_{xy}\,\vec y + \tau_{xz}\,\vec z$ : **contrainte tangentielle** (dans le plan de la section).

## État de contrainte en un point

Sur les trois facettes de normales $\vec x$, $\vec y$, $\vec z$ :

- normale $\vec x$ : $\sigma_{xx}\,\vec x + \tau_{xy}\,\vec y + \tau_{xz}\,\vec z$ ;
- normale $\vec y$ : $\tau_{yx}\,\vec x + \sigma_{yy}\,\vec y + \tau_{yz}\,\vec z$ ;
- normale $\vec z$ : $\tau_{zx}\,\vec x + \tau_{zy}\,\vec y + \sigma_{zz}\,\vec z$.

Le **tenseur des contraintes** rassemble ces vecteurs en colonnes :

$$\bar{\bar\sigma} = \begin{bmatrix} \sigma_{xx} & \tau_{yx} & \tau_{zx} \\ \tau_{xy} & \sigma_{yy} & \tau_{zy} \\ \tau_{xz} & \tau_{yz} & \sigma_{zz} \end{bmatrix}$$

Pour une facette de normale unitaire $\vec n = (a, b, c)$ : $\vec C(M, \vec n) = \bar{\bar\sigma} \cdot \vec n$. La contrainte normale sur cette facette vaut $\sigma_n = \vec C \cdot \vec n$.

**Exemple (plateforme).** Un tirant de section $A = 500$ mm² transmet un effort de traction de 60 kN, uniformément réparti : $\sigma = 60\,000/500 = 120$ MPa $= 120\,000$ kPa.` + MS2_2,
      },
    ],
    exercises: [
      {
        title: "Contrainte moyenne et vecteur contrainte (MS2)",
        difficulty: "intermediaire",
        statement: String.raw`1) Un tirant transmet un effort de traction uniformément réparti sur sa section.

2) En un point d'une pièce, l'état de contrainte est plan (dans le plan $(\vec x, \vec y)$). On étudie une facette de normale $\vec n = (\cos 30°, \sin 30°, 0)$, avec $\vec C(M, \vec n) = \bar{\bar\sigma} \cdot \vec n$.`,
        data: String.raw`- Tirant : $N = 50$ kN, $A = 400$ mm²
- État plan : $\sigma_{xx} = 120$ MPa, $\sigma_{yy} = 0$, $\tau_{xy} = \tau_{yx} = 40$ MPa (autres composantes nulles)`,
        questions: [
          { kind: "numeric", prompt: "Contrainte normale dans le tirant.", unit: "MPa", expected: 125, tol: 0.002, explanation: String.raw`$\sigma = 50\,000 / 400 = 125$ N/mm² $= 125$ MPa.` },
          { kind: "numeric", prompt: "La même contrainte exprimée en kPa.", unit: "kPa", expected: 125000, tol: 0.002, explanation: String.raw`$1$ MPa $= 1000$ kPa : $125\,000$ kPa.` },
          { kind: "numeric", prompt: String.raw`Composante $C_x$ du vecteur contrainte sur la facette.`, unit: "MPa", expected: 123.92, tol: 0.003, explanation: String.raw`$C_x = \sigma_{xx}\cos30° + \tau_{yx}\sin30° = 103{,}92 + 20 = 123{,}92$ MPa.` },
          { kind: "numeric", prompt: String.raw`Composante $C_y$ du vecteur contrainte sur la facette.`, unit: "MPa", expected: 34.641, tol: 0.003, explanation: String.raw`$C_y = \tau_{xy}\cos30° + \sigma_{yy}\sin30° = 34{,}64$ MPa.` },
          { kind: "numeric", prompt: String.raw`Contrainte normale $\sigma_n = \vec C \cdot \vec n$ sur la facette.`, unit: "MPa", expected: 124.64, tol: 0.003, explanation: String.raw`$\sigma_n = 123{,}92 \times 0{,}866 + 34{,}64 \times 0{,}5 = 107{,}32 + 17{,}32 = 124{,}64$ MPa.` },
          {
            kind: "qcm",
            prompt: "La contrainte tangentielle est :",
            choices: [
              { label: "la projection du vecteur contrainte dans le plan de la facette", correct: true },
              { label: "la projection du vecteur contrainte sur la normale à la facette", correct: false },
              { label: "toujours nulle sur une section droite", correct: false },
            ],
            explanation: "$\\vec C = \\sigma\\,\\vec n + \\tau\\,\\vec t$ : $\\sigma$ sur la normale, $\\tau$ dans le plan de la facette.",
          },
        ],
        correction: {
          donnees: String.raw`$N = 50$ kN ; $A = 400$ mm². $\sigma_{xx} = 120$ MPa ; $\tau_{xy} = \tau_{yx} = 40$ MPa ; $\vec n = (0{,}8660 \,;\, 0{,}5 \,;\, 0)$.`,
          schema: String.raw`Facette inclinée de 30° : sa normale fait 30° avec $\vec x$. Le vecteur contrainte est décomposé sur $\vec n$ (contrainte normale) et dans le plan de la facette (contrainte tangentielle).`,
          equations: String.raw`$\sigma = N/A$. $\vec C = \bar{\bar\sigma}\cdot\vec n$ : $C_x = \sigma_{xx}a + \tau_{yx}b$ ; $C_y = \tau_{xy}a + \sigma_{yy}b$. $\sigma_n = \vec C \cdot \vec n$.`,
          calculs: String.raw`$\sigma = 50\,000/400 = 125$ MPa $= 125\,000$ kPa.

$C_x = 120 \times 0{,}8660 + 40 \times 0{,}5 = 123{,}92$ MPa ; $C_y = 40 \times 0{,}8660 + 0 = 34{,}64$ MPa.

$\sigma_n = 123{,}92 \times 0{,}8660 + 34{,}64 \times 0{,}5 = 124{,}64$ MPa.`,
          resultat: String.raw`$\sigma = 125$ MPa ; $\vec C = (123{,}92 \,;\, 34{,}64 \,;\, 0)$ MPa ; $\sigma_n = 124{,}6$ MPa.`,
          verification: String.raw`Formule classique de l'état plan : $\sigma_n = \sigma_{xx}\cos^2\theta + \sigma_{yy}\sin^2\theta + 2\tau_{xy}\sin\theta\cos\theta = 120 \times 0{,}75 + 0 + 2 \times 40 \times 0{,}433 = 90 + 34{,}64 = 124{,}64$ MPa ✓.`,
        },
      },
    ],
  },
];
