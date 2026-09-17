# Passation — variantes ST1

## Ressources locales

- `resources/Paragon (1).jpg` à `Paragon (3).jpg` et `resources/Paragon (8).jpg` : fonds des variantes V1 à V4.
- `resources/Estofe Regular.ttf` et `resources/Foruner.ttf` : polices source demandées.

Les chemins d’image utilisés dans `design.pen` sont relatifs au document : `./design-exports/st1-variants/resources/...`.

## Icônes locales

Les icônes PNG d’origine sont présentes à la racine du projet (`020-home.png`, `010-Dumbell.png`, `050-ranking.png`, `030-stopwatch.png`, `047-user.png` et icônes métier associées). Les 704 références des variantes V1–V4 et de la planche comparative pointent désormais vers ces fichiers relatifs (`./<nom>.png`) ; aucune référence au dossier Downloads ne subsiste.

## V1 — Cyan Athlétique

- État : 27/27 écrans terminés, nommés `ST1 V1 · NN · …`, sur la rangée à `y=17900`.
- Fond : `Paragon (1).jpg`, appliqué au téléphone avec un remplissage `fill`.
- Styles indépendants : variables préfixées `st1-v1-` (fond, cartes translucides, surface, encre marine, texte secondaire, action citron, police d’affichage `Estofe`).
- Palette : cartes claires translucides ; encre `#082D45` ; secondaire `#315A70` ; action `#D4F53C`.
- Guide : frame `ST1 V1 · Guide palette et polices` (`WG33N`).
- Contrôles : captures des écrans 01, 03, 10 et 15 ; aucun débordement structurel signalé par Pencil.

### Police validée

`Estofe` est désormais reconnue par Pencil après l’import des polices custom dans le document et le rechargement du connecteur. Les titres et l’identité de V1 sont rendus avec Estofe ; Plus Jakarta Sans reste réservé aux paragraphes, formulaires, navigation et données. Vérifié sur les écrans 01, 03, 10 et 15.

## V2 — Marine nocturne

- État : 27/27 écrans terminés, nommés `ST1 V2 · NN · …`, sur la rangée à `y=19300`, sous V1 et dans le même ordre.
- Fond : `Paragon (2).jpg`, appliqué à chaque téléphone en remplissage `fill`.
- Styles indépendants : variables préfixées `st1-v2-` (fond, cartes marine, surface, encre blanche, texte secondaire, action cyan, affichage et corps).
- Palette : fond `#061F33`, cartes `#082D45E8`, surfaces `#113D59E8`, texte blanc, secondaire `#C4DAD9`, action cyan `#78E8E4`.
- Typographies : Foruner pour l’identité et les titres ; Plus Jakarta Sans pour les paragraphes, formulaires, boutons, navigation, données et minuteurs.
- Navigation : composant isolé `ST1 V2 · Navigation mobile (composant)` ; ses états actifs sont cyan et ses surfaces marine.
- Guide : frame `ST1 V2 · Guide palette et polices` (`prVVO`).
- Contrôles : captures des écrans 01, 03, 10 et 15, puis contrôle structurel des 27 écrans. Aucun héritage `st1-v1-*` ni débordement V2 ; l’écran 16 est volontairement prolongé pour afficher son historique complet.

## V3 — Violet minéral

- État : 27/27 écrans terminés, nommés `ST1 V3 · NN · …`, sur la rangée à `y=20700`, sous V2 et dans le même ordre.
- Fond : `Paragon (3).jpg`, appliqué à chaque téléphone en remplissage `fill`.
- Styles indépendants : variables préfixées `st1-v3-` (fond, cartes violet sombre, surface, encre blanche, texte secondaire, action menthe, affichage et corps).
- Palette : fond `#171126`, cartes `#2B1F47E8`, surfaces `#38295AE8`, texte blanc, secondaire `#D5CBEA`, action menthe `#80F2D0`.
- Typographies : Estofe pour l’identité et les titres ; Plus Jakarta Sans pour les paragraphes, formulaires, boutons, navigation, données et minuteurs.
- Navigation : composant isolé `ST1 V3 · Navigation mobile (composant)` ; ses surfaces violet sombre sont indépendantes des variantes précédentes.
- Guide : frame `ST1 V3 · Guide palette et polices` (`kRcfj`).
- Contrôles : captures des écrans 01, 03, 10 et 15, puis vues longues/états 06, 16, 22, 23 et 25 et contrôle structurel des 27. Aucun débordement ni héritage `st1-v2-*` relevé ; les vues longues restent volontairement prolongées.

## V4 — Émeraude Studio, palette V1

- État : 27/27 écrans terminés, nommés `ST1 V4 · NN · …`, sur la rangée à `y=22100`, sous V3 et dans le même ordre.
- Fond : `Paragon (8).jpg`, appliqué à chacun des téléphones internes de largeur 390 px, en remplissage `fill`.
- Styles indépendants : variables préfixées `st1-v4-` (fond, cartes, surface, encre, texte secondaire, action, affichage et corps). Aucun token `st1-v3-*` ne subsiste dans les copies V4.
- Palette : code couleur V1 appliqué à V4 : fond neutre `#E7F2F1` ; cartes claires translucides `#F8FFFFE6` ; surface `#DDF6F4D9` ; encre marine `#082D45` ; secondaire `#315A70` ; action citron `#D4F53C`. Le fond téléphone conserve `Paragon (8).jpg`.
- Typographies : Foruner pour l’identité et les titres ; Plus Jakarta Sans pour les paragraphes, formulaires, boutons, navigation, données et minuteurs.
- Navigation : les 27 surcharges de navigation V4 sont indépendantes et emploient les surfaces claires / marine avec l’état actif citron.
- Lisibilité sur gradient : les 26 sous-libellés d’en-tête posés directement sur le fond (dates, retours et accroches) utilisent désormais `#D4F53C`. Les textes au sein des cartes, champs et de la navigation conservent leurs couleurs de lecture dédiées.
- Guide : frame `ST1 V4 · Guide palette et polices` (`RN6L1`).
- Contrôles : captures des écrans 01, 03, 10 et 15, puis vues longues/états 06, 16, 22, 23, 25, 26 et 27 ; contrôle structurel complet des 27 sans contenu tronqué ni débordement signalé par Pencil.

## Comparaison finale

- Planche : frame `ST1 · Comparaison finale — Accueils V1 à V4` (`ms5aU`) avec les quatre accueils et leurs labels.
- Export PNG : `comparison/ms5aU.png`.

## Suite attendue

1. Variantes V1 à V4 et planche comparative terminées.
2. Toute évolution ultérieure doit préserver les tokens isolés de chaque variante.
