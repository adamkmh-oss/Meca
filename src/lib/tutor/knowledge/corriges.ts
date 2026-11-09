/**
 * Corrigés de référence du TD « Torseur de cohésion des portiques plans
 * isostatiques » (MS – Mécanique des Structures 3) et méthode associée.
 * Transcription du dossier de corrigés du projet Meca (texte uniquement :
 * les schémas des PDF ne sont pas reproduits).
 */

export const CONVENTIONS_TD = String.raw`
# Conventions des corrigés du TD (Mécanique des Structures 3)

- Relation du cours : dM/dx = −T(x).
- Deux niveaux de repère : un repère global (X, Y), origine en A, pour le PFS et les réactions ; un repère local (x, y) par barre (symbole en L : coin = origine, bras long = x, bras court = y), y obtenu en tournant x de +90°. Le repère local oriente le torseur de cohésion de sa barre uniquement.
- Une abscisse ne se poursuit pas d'une barre à l'autre : au moins une coupure par barre, chaque barre repart de l'origine de son repère local.
- Torseur de cohésion : il s'applique sur la partie à gauche de la coupure. Partie gauche isolée → étiquettes +N(x), +T(x), +M(x). Partie droite isolée → étiquettes −N(x), −T(x), −M(x), flèches inchangées dans le sens positif du repère.
- Toujours isoler le côté le moins chargé.
- Schémas d'isolement : réactions inconnues en rouge, dans le sens positif du repère global ; schéma d'équilibre : réactions connues en bleu, dans leur sens réel avec grandeur positive, appuis supprimés ; composantes nulles non dessinées.
- Charge répartie : résultante en gris, pointillés, entre parenthèses, avec sa position cotée (elle sert uniquement au bras de levier).
- Diagrammes : tracés perpendiculairement à la ligne moyenne de la barre, aplat bleu, signe ⊕/⊖ cerclé dans chaque zone ; le signe est porté par le symbole, jamais par le côté de tracé ; fibre tendue du côté opposé au diagramme.
- Liaisons : articulation = 2 inconnues sans moment ; appui simple = 1 inconnue ; nœud rigide = pas de symbole, pas d'équation supplémentaire, N/T/M se répartissent entre les branches ; extrémité libre = pas une liaison. Degré d'hyperstaticité h = 3 − (nombre d'inconnues de liaison) pour un portique sans rotule ; isostatique si h = 0.
- Force oblique : projeter d'abord (angle depuis la verticale → Fx = F sin α, Fy = F cos α), puis superposer si les composantes chargent des barres différentes.
- Vérification de l'équilibre : moments en un point différent de celui du calcul (sinon contrôle circulaire).

## Structure type d'un corrigé
1. Mise en place : énoncé, repères, liaisons, degré d'hyperstaticité.
2. Réactions d'appui : isolement, PFS (ΣFx, ΣFy, ΣM en un point qui élimine un maximum d'inconnues), résultats commentés.
3. Vérification de l'équilibre.
4. Torseur de cohésion : coupures Σ1, Σ2, … ; un tronçon par barre, équations d'équilibre, expressions N(x), T(x), M(x) avec domaine ; contrôle dM/dx = −T.
5. Récapitulatif et contrôles : M = 0 aux extrémités libres, articulées, appuis simples d'extrémité ; équilibre des moments et des efforts au nœud rigide ; sauts de T et M ; degré de M = degré de T + 1 ; moment maximal.
6. Diagrammes N, T, M avec valeurs remarquables.
7. Lecture : rôle de chaque barre, changements de signe, fibres tendues, valeur de dimensionnement.
8. Ce qu'il faut retenir.

## Pièges à signaler
- Barre inclinée : angle θ pris depuis la verticale → cos θ sur l'axe de la barre, sin θ en travers (inverse si l'angle est pris depuis l'horizontale). Poser ω = L/H pour éviter les racines carrées.
- Bras de levier = distance perpendiculaire à la force (force verticale → distance horizontale, ex. x sin θ), jamais la longueur de barre x.
- Oublier l'opposé du torseur quand on isole la partie à droite.
- À un nœud rigide à plusieurs branches, le moment se répartit : un moment continu au nœud signale souvent l'oubli d'une barre.
- Une articulation impose M = 0 ; un encastrement donne le moment maximal au pied.
`;

export const CORRIGE_S6 = String.raw`
# Corrigé — Structure (S6) : poutre sur béquille (version de référence, angle θ depuis la verticale)

Énoncé. La structure (S6) est formée de deux barres. La poutre CD, horizontale, de longueur 3L, repose en D sur un appui simple ; elle déborde à gauche de B sur une longueur L — la partie CB est en console, son extrémité C est libre. Elle est soutenue en B par la béquille AB, barre inclinée articulée au sol en A, à la verticale de C, de hauteur H. L'ensemble porte une charge uniformément répartie p dirigée vers le bas sur toute la longueur de CD.

Géométrie : ω = L/H = tan θ (θ angle de la béquille avec la verticale) ; sin θ = ω/√(1+ω²) ; cos θ = 1/√(1+ω²) ; AB = H√(1+ω²).
Repères du sujet : sur CB et BD, x de gauche à droite, y vers le haut ; sur AB, x monte de A vers B le long de la barre, y perpendiculaire, tourné vers le haut et la gauche.

Liaisons : articulation en A (Ax, Ay), appui simple en D (Dy) ; nœud B rigide (trois branches CB, BD, AB), C libre. h = 3 − 3 = 0 : isostatique.

Réactions. Résultante de la répartie 3pL au milieu de CD (X = 3L/2).
ΣFx = 0 ⇒ Ax = 0 ; ΣFy = 0 ⇒ Ay + Dy − 3pL = 0 ; ΣM/A = 0 ⇒ Dy·3L − 3pL·3L/2 = 0.
Résultats : Ax = 0 ; Ay = 3pL/2 ; Dy = 3pL/2. (La résultante tombe à mi-distance de A et D : résultat symétrique ; la position de B n'intervient pas.)
Vérification : ΣM/B = −Ay·L + Dy·2L − 3pL·L/2 = −3pL²/2 + 3pL² − 3pL²/2 = 0.

Coupures : Σ1 sur la console CB (x depuis C, 0 ≤ x ≤ L), Σ2 sur la travée BD (x depuis B, 0 ≤ x ≤ 2L), Σ3 sur la béquille AB (x depuis A, 0 ≤ x ≤ H√(1+ω²)).

Console (partie gauche de Σ1, ne porte que px, résultante en x/2) :
N(x) = 0 ; T(x) − px = 0 ; M(x) + px·x/2 = 0 ⇒ N_CB = 0, T_CB = px, M_CB = −px²/2. En B : T = pL, M = −pL²/2 (fibre supérieure tendue).

Travée (partie droite de Σ2 : charge p(2L − x) et Dy = 3pL/2 ; étiquettes −N, −T, −M) :
−N(x) = 0 ; −T(x) − p(2L − x) + 3pL/2 = 0 ; −M(x) − p(2L − x)·(2L − x)/2 + (3pL/2)(2L − x) = 0.
Résultats : N_BD = 0 ; T_BD = px − pL/2 ; M_BD = p(L + x)(2L − x)/2. Racines −L et 2L, extremum en x0 = L/2 : M_max = 9pL²/8. En B : M_BD(0) = pL² ; en D : T = 3pL/2 = Dy, M = 0.

Béquille (partie gauche de Σ3 : seule Ay ; projection Ay·cos θ selon x, Ay·sin θ selon y ; bras de levier de Ay = x·sin θ) :
N(x) + (3pL/2)cos θ = 0 ; T(x) + (3pL/2)sin θ = 0 ; M(x) − (3pL/2)·x·sin θ = 0.
Résultats : N_AB = −3pL/(2√(1+ω²)) (compression) ; T_AB = −3pLω/(2√(1+ω²)) ; M_AB = (3pL/2)·x·sin θ. En B : M_B = (3pL/2)·ωH = 3pL²/2.

Contrôles au nœud B : ΣM/B = −M_CB(L) + M_BD(0) − M_AB(H√(1+ω²)) = pL²/2 + pL² − 3pL²/2 = 0. Saut du tranchant de la poutre : T_BD(0) − T_CB(L) = −pL/2 − pL = −3pL/2 (force verticale Ay apportée par la béquille). Saut de moment de la poutre en B : 3pL²/2 = moment de la béquille en tête. M_BD est le moment d'une poutre sur deux appuis de portée 3L placés en C et D.

Diagrammes : N : −3pL/(2√(1+ω²)) sur AB, 0 sur CD. T : pL en B côté console, −pL/2 en B côté travée, 3pL/2 en D, −3pLω/(2√(1+ω²)) sur AB. M : −pL²/2 en B côté console, pL² en B côté travée, 9pL²/8 au milieu de CD, 3pL²/2 en tête de béquille (plus grande valeur absolue).

Exemple chiffré (fiche méthode) : L = 2 m, H = 4 m, p = 10 kN/m → ω = 0,5, √(1+ω²) = 1,118, sin θ = 0,447, cos θ = 0,894, AB = 4,47 m, Ay = 30 kN, N_AB = −26,8 kN, T_AB = −13,4 kN, M_B = 60 kN·m ; contrôle 26,8² + 13,4² ≈ 30².

À retenir : une barre inclinée se traite dans son propre repère (angle depuis la verticale → cos θ sur l'axe) ; le bras de levier est une distance perpendiculaire à la force (x·sin θ, pas x) ; isoler le côté le moins chargé et ne pas oublier l'opposé du torseur à droite ; le nœud rigide est le meilleur contrôle.
`;

export const FICHE_BARRE_INCLINEE = String.raw`
# Fiche méthode — le tronçon d'une barre inclinée (S6, partie 3.4)

1. Choisir la moitié à garder : le côté le plus simple (ici le pied A avec la seule réaction Ay). Comme c'est la partie gauche au sens du repère local, les étiquettes restent N(x), T(x), M(x) sans signe moins.
2. Installer le repère local : x le long de la barre de A vers B (x = longueur de barre comptée depuis A), y = x tourné de +90°. Angle utile θ depuis la verticale, ω = L/H.
3. Projeter la force verticale : composante le long de la barre = Ay·cos θ (côté adjacent), composante en travers = Ay·sin θ (côté opposé). Réflexe : angle depuis la verticale → cos θ sur l'axe.
4. Bras de levier : force verticale → distance horizontale entre A et la section = x·sin θ. Erreur classique : multiplier par x.
5. Écrire les trois équations dans le sens positif du repère local.
Contrôles : M = 0 à l'articulation ; dM/dx = −T ; N² + T² = Ay² ; équilibre des moments au nœud B.
Pièges : se tromper d'angle ; prendre x comme bras de levier ; isoler le mauvais côté sans corriger les signes.
`;

export const CORRIGE_S4 = String.raw`
# Corrigé — Structure (S4) : portique à force oblique

Énoncé. Poteau AB vertical de hauteur H, articulé au sol en A. Poutre CD horizontale traversant le poteau au nœud B : console CB de longueur L (C libre), travée BD de longueur 2L jusqu'à l'appui simple D. Force unique F appliquée en C, vers le haut et vers la droite, inclinée de α par rapport à la verticale.
Projection : Fx = F sin α, Fy = F cos α (positives pour 0 < α < 90°).
Repères du sujet : sur CB et BD, x de gauche à droite, y vers le haut (CB : origine C ; BD : origine B) ; sur AB, x monte de A vers B, y vers la gauche.
Liaisons : articulation A (Ax, Ay), appui simple D (Dy), nœud B rigide à trois branches. h = 3 − (2 + 1) = 0.

Réactions par superposition.
(Sx), Fx seule : ΣFx : Ax + Fx = 0 ; ΣFy : Ay + Dy = 0 ; ΣM/A : Dy·2L − Fx·H = 0 → Ax = −Fx ; Ay = −HFx/(2L) ; Dy = HFx/(2L). (Bras de levier de Fx = H, pas L ; Ay et Dy forment un couple de bras 2L.)
(Sy), Fy seule : Ax = 0 ; Ay + Dy + Fy = 0 ; Dy·2L − Fy·L = 0 → Ay = −3Fy/2 ; Dy = Fy/2.
(S4) : Ax = −Fx ; Ay = −(3Fy/2 + HFx/(2L)) ; Dy = Fy/2 + HFx/(2L).
Vérification (moments en D) : H·Ax − 2L·Ay − 3L·Fy = −HFx + (3LFy + HFx) − 3LFy = 0.

Torseurs (convention dM/dx = −T) :
- Console CB, partie gauche de Σ1 (Fx, Fy en C), 0 ≤ x ≤ L : N(x) + Fx = 0 ; T(x) + Fy = 0 ; M(x) − Fy·x = 0 → N_CB = −Fx ; T_CB = −Fy ; M_CB = Fy·x.
- Travée BD, partie droite de Σ2 (Dy seule), 0 ≤ x ≤ 2L : −N = 0 ; −T + Dy = 0 ; −M + Dy(2L − x) = 0 → N_BD = 0 ; T_BD = Fy/2 + HFx/(2L) ; M_BD = (LFy + HFx)(2L − x)/(2L).
- Poteau AB, partie gauche de Σ3 (réactions de A : Fx vers la gauche, 3Fy/2 + HFx/(2L) vers le bas), 0 ≤ x ≤ H : N − (3Fy/2 + HFx/(2L)) = 0 ; T + Fx = 0 ; M − Fx·x = 0 → N_AB = 3Fy/2 + HFx/(2L) (traction) ; T_AB = −Fx ; M_AB = Fx·x.

Contrôles : nœud B : −M_CB(L) + M_BD(0) − M_AB(H) = −LFy + (LFy + HFx) − HFx = 0 ; T_BD(0) − T_CB(L) = N_AB ; N_BD(0) − N_CB(L) = Fx = −T_AB. M = 0 en C, A et D. Saut de moment de la poutre en B = HFx (moment du poteau en tête). Maximum : LFy + HFx en B côté travée = F(L cos α + H sin α) = F·d, d bras de levier de F par rapport à A, maximal pour tan α = H/L.
Lecture : console comprimée par Fx et fléchie par Fy ; travée : ni N ni charge ; poteau tendu et fléchi par Fx seule. β = HFx/(LFy) = (H/L) tan α : part du moment de nœud reprise par le poteau = β/(1+β). α = 0 : le poteau devient un tirant, moment continu en B ; α = 90° : console seulement comprimée.
`;
