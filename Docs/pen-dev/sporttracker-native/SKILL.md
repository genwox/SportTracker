---
name: sporttracker-native
description: Règles de design SportTracker V6 « app native » (Ionic React, mode iOS). Identité V5 figée (couleurs, polices, rayons, verre), composants et interactions refaits façon app native. À charger avant toute modification de design.pen, quel que soit le modèle ou le fournisseur.
---

# SportTracker V6 : penser comme une app native

## Contexte
- SportTracker est une app de suivi sportif (musculation + cardio), utilisée comme PWA installée sur l'écran d'accueil d'un iPhone ou d'un Android.
- Le front est codé en **Ionic React avec `mode: 'ios'` sur toutes les plateformes**. Chaque composant que tu dessines doit exister dans Ionic ou être simple à coder par-dessus.
- La référence est la rangée **`ST1 V5 · 01` à `ST1 V5 · 27`** plus le frame **`ST1 V5 · Guide palette et polices`**. Lis-les avant de commencer.
- **Ne modifie jamais un frame V5 (ni V1 à V4).** Tu travailles uniquement sur des frames `ST1 V6 · …`.
- Le but de V6 : garder exactement la même identité visuelle, et que l'utilisateur croie tenir une app de l'App Store, pas un site web emballé en PWA.

## Identité figée : interdiction d'y toucher
Utilise les variables existantes (`$st1-v4-*`) et n'ajoute **aucune couleur ni police**.

| Rôle | Variable | Valeur |
|---|---|---|
| Fond | `$st1-v4-background` | `#E7F2F1` + image de fond Paragon (fill) |
| Carte (verre) | `$st1-v4-card` | `#F8FFFFE6` |
| Surface | `$st1-v4-surface` | `#DDF6F4D9` |
| Texte principal | `$st1-v4-ink` | `#082D45` |
| Texte secondaire | `$st1-v4-muted` | `#315A70` |
| Action / accent | `$st1-v4-action` | `#D4F53C` |
| Encre nav | (couleur V5) | `#102737` |
| Voile clair / segment | (couleurs V5) | `#FFFFFF80` / `#FFFFFF70` |
| Contour verre | (couleur V5) | `#123D3226` |

- **Polices** : titres `Foruner` (`$st1-v4-display`) ; textes `Plus Jakarta Sans` (`$st1-v4-body`) en 500/600/700.
- **Verre** : fond card, contour 1 px `#123D3226`, flou d'arrière-plan 12.
- **Rayons** : 28 téléphone · 20 cartes · 16 blocs · 14 boutons · 12 puces · 8 badges.
- Les motifs V5 restent tels quels : badges de type de série, badge RPE, bandeau PR, connecteur superset, indicateur de synchro, note par exercice, puces de filtre.

## Ce que tu as le droit (et le devoir) de changer
Les boutons, les champs, les toggles, les listes, la navigation, les feuilles, les états d'interaction et les transitions entre pages.

### Gabarit
- Téléphone **390 × 844** (même taille que V5), barre d'état 47 pt, indicateur d'accueil 34 pt. Les zones de sécurité (safe areas) sont toujours respectées.
- Zones tactiles d'**au moins 44 × 44 pt**, y compris les icônes seules.
- Icônes : une seule bibliothèque, **Lucide**, en trait. Nomme chaque calque d'icône avec son équivalent Ionicons (ex. `icon/chevronBack`), c'est la librairie utilisée dans le code.

### Motifs natifs attendus (nom du composant Ionic entre parenthèses)
1. **Grand titre repliable** (`IonHeader collapse="condense"`) : grand titre Foruner en haut de page ; au défilement, il se replie en petit titre centré dans une barre translucide floutée. Dessine les deux états.
2. **Retour natif** (`IonBackButton`) : chevron plus libellé de la page précédente, en haut à gauche. Le geste de retour par glissement depuis le bord gauche est annoté sur chaque page de détail.
3. **Barre d'onglets** (`IonTabBar`) : 3 onglets (Aujourd'hui · Programmes · Historique), icône plus libellé, fond translucide flouté collé au bas de l'écran, au-dessus de l'indicateur d'accueil. Le Profil s'ouvre depuis l'avatar. Pas de menu burger.
4. **Contrôle segmenté** (`IonSegment`) à la place des onglets maison (Muscu/Cardio, Semaine/Mois…).
5. **Toggles iOS** (`IonToggle`) à la place des cases à cocher et des boutons oui/non. Actif = `$st1-v4-action`.
6. **Listes groupées inset** (`IonList inset`) pour le Profil, les réglages et les formulaires : lignes de 44 pt min, chevron à droite pour ce qui navigue, séparateurs fins.
7. **Actions par glissement** (`IonItemSliding`) sur les séances, séries et exercices : glisser à gauche pour Supprimer (rouge système), à droite pour Dupliquer / Terminer.
8. **Feuilles modales à crans** (`IonModal` avec `breakpoints` 0.25 / 0.5 / 1) avec poignée : catalogue d'exercices, création d'exercice, pavé de saisie, minuteur de repos. Dessine chaque cran utilisé.
9. **Feuilles d'actions** (`IonActionSheet`) pour les choix et les suppressions (« Supprimer la séance », « Annuler ») à la place des pop-ups web.
10. **Pavé numérique et steppers** pour poids et répétitions : gros boutons − / + (appui long = répétition), pavé numérique maison dans une feuille (`22 · Saisie précise`), jamais le clavier texte.
11. **Sélecteur à molette** (`IonPicker` / `ion-datetime` wheel) pour les durées (repos, cardio).
12. **Tirer pour rafraîchir** (`IonRefresher`) sur les listes, et des **squelettes** (`IonSkeletonText`) au lieu des spinners pleine page.
13. **Barre de recherche iOS** (`IonSearchbar`) avec bouton « Annuler ».
14. **Réordonnancement** (`IonReorder`) des exercices d'un programme ou d'une séance, avec poignée.
15. **Toasts** (`IonToast`) discrets en haut de l'écran pour les confirmations, pas de bandeau qui décale le contenu.
16. **Bouton d'action principal collant** en bas (au-dessus de la barre d'onglets ou de l'indicateur d'accueil) pour l'action n°1 de l'écran, par exemple « Démarrer la séance » ou « Terminer ».
17. **Mini-barre « séance en cours »** (dans le style des lecteurs de musique) collée au-dessus de la barre d'onglets tant qu'une séance live est ouverte : nom de l'exercice, chrono, minuteur de repos ; un tap rouvre la séance plein écran.
18. **Valider une série** : cercle à cocher sur la ligne ; au tap, la ligne se remplit en `$st1-v4-action` avec une coche et le minuteur de repos démarre. Annote l'haptique.
19. **Appui long** : menu contextuel (style iOS, flou d'arrière-plan) sur une séance ou un exercice.

### États à dessiner pour chaque composant interactif
Repos · appuyé (échelle 0.97, voile) · désactivé · chargement (squelette) · erreur. Pour les feuilles : chaque cran. Pour les lignes glissables : fermé et ouvert.

### Mouvement (à annoter, le code le reproduira)
- Navigation empilée : glissement horizontal, 350 ms, `cubic-bezier(0.32, 0.72, 0, 1)` ; la page précédente recule de 30 % et s'assombrit légèrement.
- Feuille : montée par ressort (spring), fond assombri à 40 %, fermeture par glissement vers le bas.
- Appui : échelle 0.97 en 100 ms, retour en 150 ms.
- Haptique (annotation seulement) : légère sur toggle et validation de série, moyenne sur record personnel, avertissement sur suppression.
- Jamais de soulignement de lien ni de curseur main, pas de survol (hover) comme seul indice, pas de sélection de texte sur les boutons.

## Règles de travail sur le canevas
- Nommage : `ST1 V6 · NN · Nom de l'écran` (même numéro et même nom que V5). Composants : `V6 Kit · …`.
- Placement : rangée V6 à **y = 27600**, même colonne x que l'écran V5 correspondant (V5 `01` est à x = -2951, puis +500 par écran). Le kit va à x = -3451 (à gauche de `01`), le tableau des interactions sous la rangée, à y = 29000.
- Chaque écran V6 a le même en-tête que V5 (numéro + fichier source) et une **note sous le téléphone** qui liste : composants Ionic utilisés, gestes, transitions d'entrée et de sortie.
- Réutilise les composants `V6 Kit · …` en instances (refs) : ne redessine pas un bouton à la main dans un écran.
- Ne supprime ni ne déplace aucun frame qui n'est pas à toi. Si un composant du kit te manque, signale-le dans ta note au lieu de le créer en double.
- Garde les mêmes données et le même contenu que l'écran V5 (textes, chiffres, fonctionnalités). V6 change la forme, pas le produit.
