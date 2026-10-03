# V6 lot 4 — Historique, Progrès et cardio

- **Date(s)** : 2026-09-26
- **Session** : https://claude.ai/code/session_012qDYjvKDTxxkny21S9YGVo · branche `claude/admiring-dijkstra-vn9shy`
- **Étape du projet** : 4g — V6 « app native », lot 4 (écrans 04, 06, 07, 08, 09, 16, 17, 18)
- **Commits** : `2867363` feat(web): V6 lot 4 — Historique, Progrès et cardio (écrans 04, 06 à 09, 16 à 18)

## Ce qui a été fait
- **Lecture préalable** : `CLAUDE.md`, `Docs/pen-dev/passation-v6-code.md` (décisions tranchées), `Docs/pen-dev/sporttracker-native/SKILL.md`, frame « ST1 V6 · Rapport » de `design.pen`, PNG `design-exports/v6/` des 8 écrans du lot. Réutilisation des composants des lots 1 à 3 (V6Header, V6Segment, V6Chip/V6ChipRow, V6List/V6Item/V6InputItem, V6Sheet, V6WheelPicker, V6StickyAction, V6SessionRow, V6Badge, V6ContextMenu, `useV6ActionSheet`, `useV6Toast`, `useV6LongPress`).
- **Logique pure** `SportTracker.Web/src/features/history/historyData.ts` (+ `historyData.test.ts`) : records de musculation (`workoutRecords`), records cardio (`cardioRecords`), compte des types de série (`setTypeCounts`), blocs de superset (`exerciseBlocks`), filtres muscle (`muscleFilters`, `matchesMuscle`) et période (`periodOptions`, `inPeriod`), semaines ISO (`isoWeek`, `weeklyTotals`), allure / totaux / durées (`paceLabel`, `cardioTotals`, `minutesLabel`, `durationParts`, `toTimeSpan`, `parseDecimal`), tonnage (`tonnage`, `tonnageParts`), duplication (`duplicateWorkout`, `duplicateCardio`).
- **Kit `src/ui/`** :
  - `v6Plan.tsx` / `v6Plan.css` : `V6SessionRow` accepte une valeur à droite (`value` : « PR », « 8,2 km », nombre de séries) ; nouveau `V6SlidingSessionRow` (IonItemSliding autour de V6SessionRow : Supprimer à gauche en rouge système, glissement complet = suppression ; Dupliquer à droite en citron ; carte opaque et sans flou pendant le glissement).
  - Nouveau `v6History.tsx` / `v6History.css` : `V6ChartCard`, `V6Bars` (barres foncées, barre mise en avant en citron, valeur 0 = trait de 4 pt), `V6StatTiles` (valeur Foruner + unité plus petite), `V6RecordBanner` (bandeau record V5 avec badge PR). Exportés par `src/ui/index.tsx`.
  - `v6Hooks.ts` : hook `useV6BackHref(fallback)` qui lit `routeInfo.pushedByRoute` d'Ionic au montage de la page.
  - `v6Nav.ts` (+ `v6Nav.test.ts`) : libellés de retour « Séance » (séance de carnet et séance d'historique), « Sortie », « Séances », « Progrès ».
  - `v6.css` : un libellé de retour long se tronque dans sa colonne.
  - `KitPage.tsx` : section « Historique (lot 4) » sur la page d'aperçu du kit.
- **Pages** (`src/features/history/`) :
  - `shared.tsx` réécrit : coquille de page (V6Header, rafraîchissement, action collante, hôte de portail pour feuilles et menus hors d'`IonContent`, comme les Carnets), `QueryError`, helpers de dates, `useInvalidateSessions` et `useSessionActions` (suppression avec feuille d'actions et retrait optimiste du cache, duplication par POST, toasts).
  - Nouveau `rows.tsx` : `useSessionRows` construit les lignes glissables des listes 04, 07 et 17 et leur menu contextuel partagé (Ouvrir, Dupliquer, Supprimer).
  - `sessionPages.tsx` : Historique (17) — liste inset « Voir mes progrès » / « Séances musculation » / « Sorties cardio », segment Tout / Muscu / Cardio, puces de période, « Séances par semaine » (6 sem.), liste plate ; Progrès (18) — tuiles séances/objectif, minutes, série en cours, badges « Objectif atteint » et écart avec la semaine passée, répartition musculaire 30 j, séries par groupe, séries par semaine, temps actif (minutes par jour).
  - `strengthPages.tsx` : Séances (04, nouvelle page) — puces Tous / Pecs / Dos / Jambes / Épaules / Bras / Abdos, badges « Éch. ×2 · Normal ×5 … », « Nouvelle séance » collant ; Détail muscu (06) — tuiles volume / séries / records, bloc superset avec connecteur citron, séries V5 (n°, badge de type, poids, reps, RPE, ★), note, GIF en feuille, nom → historique, appui long → menu ; Historique exercice (16) — tuiles 1RM / poids max / volume, segment 1RM / Volume / Poids max / Reps qui choisit le graphique, bandeau record, liste des séances.
  - `cardioPages.tsx` : Cardio (07) — segment Tout / Course / Vélo / Natation / Marche, tuiles sur 4 semaines, volume hebdomadaire, « Nouvelle séance cardio » collant (`?type=`) ; formulaire commun Nouvelle sortie (08) / Modifier la sortie — activité en segment, durée à la molette h / min en feuille 50 %, liste inset Mesures (Durée, Distance (km), Dénivelé (m), Allure calculée) et Sortie (Nom, Date), erreurs sous le champ, saisie conservée et toast « Réessayer » si le réseau échoue, « Supprimer la sortie » en édition ; Détail cardio (09) — tuiles distance / allure / dénivelé, « Tes sorties · {activité} », bandeau record, « Modifier la sortie » collant.
  - `history.css` réécrit pour la V6 ; `pages.tsx` exporte les nouvelles pages.
- **Routes** (`src/app/routes.tsx`) : `/tabs/history/workouts` (04), `/tabs/history/workouts/new` (écran 05 inchangé, déclaré après `:sessionId`), `/tabs/history/cardio/:sessionId/edit`.
- **Écran 05** (`src/features/programs/workoutPages.tsx`, reste en V5) : retour calculé par `useV6BackHref` (« Séances » depuis l'historique, Carnets sinon), invalidation des caches `['history']` et `['today']` après l'enregistrement ; la page d'attente `ExerciseHistoryPage` de l'onglet Programmes est remplacée par la vraie page 16.
- **Tests e2e** : nouveaux `e2e/history-v6.spec.ts` (5 scénarios) et `e2e/historyMock.ts` (API en mémoire, dates relatives à aujourd'hui) ; `e2e/navigation.spec.ts` et `e2e/qa-mobile.spec.ts` adaptés au titre « Historique ».
- **Documentation** : entrée « V6 lot 4 » ajoutée dans `CLAUDE.md` et `AGENTS.md` ; lot 4 coché dans `Docs/pen-dev/passation-v6-code.md`.

## Décisions prises
- **Pas de « Modifier la séance » collant sur 06.** L'édition d'une séance datée correspond à l'écran 21 (lot 5). Écarté : un bouton sans destination ou inventer un autre bouton. Tranché par Claude.
- **Cardio : on garde les données V5.** Pas de calories, de RPE, de note ni d'allure par km, car l'API ne les stocke pas. Le dénivelé remplace les kcal ; le graphique de 09 compare les 8 dernières sorties de la même activité au lieu de l'allure par km. Écarté : ajouter des champs au modèle (contraire à la décision « données V5, forme V6 » de Damien). Application par Claude de la décision de Damien.
- **Accès à 04 et 07** par une liste inset en haut de l'Historique (« Séances musculation », « Sorties cardio », plus « Voir mes progrès »). Écarté : le segment Séances / Carnets de la maquette, car un segment ne change jamais d'onglet (décision de Damien). Placement tranché par Claude.
- **Définition des records.** Une série ★ est la meilleure série d'un exercice dans la séance, si son 1RM estimé (Epley, même calcul que le live) dépasse de plus de 0,05 kg le meilleur des séances précédentes. La première séance d'un exercice n'est jamais un record. Une sortie est « PR » si elle est plus longue que toutes les sorties précédentes de la même activité. Tranché par Claude.
- **Duplication** : la copie est datée de maintenant et n'a ni lien de carnet (`workoutProgramSessionId: null`) ni clé de brouillon. Sinon elle compterait comme « Fait » dans le carnet. Tranché par Claude.
- **Retour des pages de détail** vers la page qui les a poussées (`routeInfo.pushedByRoute`), avec un repli fixe après un rechargement. Écarté : des `backHref` fixes, qui donnaient « Historique » même en venant de Séances ou d'Aujourd'hui. Tranché par Claude.
- **Ajout de « Modifier la sortie »** : nouvelle route d'édition qui réutilise le formulaire 08 (PUT), pour que le bouton collant de la maquette 09 ait une vraie destination. Tranché par Claude.
- **16** : le segment choisit lequel des 4 graphiques V5 est affiché, au lieu de les empiler. **18** : « Temps actif » en minutes par jour (la V5 comptait des séances par jour). Les tuiles gardent les mesures V5 (séances / objectif, minutes, série en cours) plutôt que le volume et la régularité de la maquette. Tranché par Claude.
- **Puces de période** : les 3 derniers mois qui ont des séances, puis une puce par année plus ancienne. Toucher la puce active la désélectionne. Tranché par Claude.
- **Écran 05 laissé en V5** : il ne figure pas dans la liste du lot 4 donnée par Damien, même si la note du lot 3 le disait « refait au lot 4 ». Périmètre fixé par Damien.

## Problèmes rencontrés et solutions
- **Petit titre replié qui chevauchait le libellé de retour** (« Historique » sous « HAUT DU CORPS », vu sur la capture de 06). Cause : la barre est une grille `1fr auto 1fr` et le bouton retour ne rétrécissait pas dans sa colonne. Correctif dans `v6.css` (`.v6-header-bar__start .v6-back { max-width: 100%; min-width: 0 }`) : le libellé se tronque (« Histori… »). Vérifié sur une nouvelle capture.
- **Tuiles de chiffres tronquées** (« 38,7 … », « 2 H 1… », « 82 K… »). Cause : la police Foruner est large et la tuile ne fait qu'un tiers de 390 px. Correctif : l'unité est rendue à part en petit (`unit` de `V6StatTiles`), la taille passe à `clamp(18px, 5.4vw, 22px)` et le temps s'affiche « 2h17 ». Vérifié sur capture.
- **Unité en double dans le formulaire cardio** : « en km » en aide sous le champ, plus « 0 km » en texte indicatif. Correctif : libellés « Distance (km) » / « Dénivelé (m) », sans aide.
- **Tests e2e : la page précédente reste dans le DOM pendant la transition de push.** Les sélecteurs `.ion-page:not(.ion-page-hidden) …` trouvaient deux lignes ou l'ancien bouton retour. Avant de toucher au test, j'ai vérifié par un journal console temporaire que `pushedByRoute` valait bien `/tabs/history/workouts/51` sur la page 16. Correctif côté test : lignes ciblées par le `aria-label` de leur section et bouton retour pris en `.last()`.
- **Test de suppression : le bouton de la 2ᵉ feuille d'actions est « détaché du DOM »** juste après « Annuler » sur la 1ʳᵉ. Dans un script de diagnostic avec des pauses, une seule feuille s'ouvre et tout fonctionne. La cause exacte n'est pas établie ; probablement une feuille présentée pendant que la précédente se ferme encore. Correctif dans le test : attendre qu'aucune `ion-action-sheet` ne reste avant de reglisser.
- **`page.goto` interrompu (`ERR_ABORTED`)** juste après « Enregistrer » d'une sortie modifiée. Cause : l'app revient au détail (`goBack`) en même temps. Correctif : attendre l'URL du détail (et vérifier la distance mise à jour) avant de naviguer.
- **`qa-mobile` en mode strict** : `getByText('Séance musculation')` trouvait aussi les libellés masqués « Supprimer Séance musculation » / « Dupliquer Séance musculation » des nouvelles lignes glissables. Correctif : `{ exact: true }`.
- **Cache non rafraîchi après l'enregistrement de l'écran 05** (défaut V5 existant, devenu visible parce que la liste 04 reste montée dans la pile). Correctif : invalidation de `['history']` et `['today']` avant la navigation.

## Apprentissages
- **Ionic React connaît la page d'origine d'un push** : `useIonRouter().routeInfo.pushedByRoute`, lu au montage de la page, donne un retour fidèle à iOS (« Séances », « Aujourd'hui »…). Il est `undefined` après un rechargement ou un lien direct : il faut un repli.
- **Pendant une transition Ionic, deux `.ion-page` sont visibles** et la page quittée n'a pas encore `.ion-page-hidden`. Dans les tests, cibler un conteneur propre à la page (section avec `aria-label`) ou le dernier élément, plutôt que `.ion-page:not(.ion-page-hidden)`.
- **Libellés accessibles cachés et `getByText`** : un texte réservé aux lecteurs d'écran (« Supprimer X ») est trouvé par `getByText('X')` ; utiliser `exact: true`.
- **Grille de barre d'en-tête `1fr auto 1fr`** : un enfant `ion-button` ne rétrécit pas sous sa colonne sans `max-width: 100%; min-width: 0`.
- **Police d'affichage large dans des tuiles au tiers d'écran** : séparer l'unité en petit plutôt que réduire tout le nombre.
- **Records dérivés côté client** : parcourir les séances par date en gardant le meilleur 1RM par exercice, et mettre à jour ce meilleur seulement après la séance (sinon une séance se compare à elle-même).

## Validation
- `npm run lint` : OK. `npm run typecheck` : OK.
- `npm test` (Vitest) : 13 fichiers, **94/94** (dont `historyData.test.ts`, 13 tests, et `v6Nav.test.ts` étendu).
- `npm run build` : OK (precache de 28 entrées).
- Playwright en Chromium (config temporaire non commitée, `executablePath: '/opt/pw-browsers/chromium'`) : suite complète **31/31 deux fois de suite** ; `e2e/history-v6.spec.ts` 5/5.
- Après la dernière modification (invalidation du cache de l'écran 05) : lint, typecheck, `npm test` 94/94, build OK, et Playwright **14/14** sur `history-v6`, `navigation` et `programs-v6`. La suite complète n'a **pas** été relancée après cette dernière modification.
- Captures des 8 écrans (repos et défilé) prises sans API (interception de `http://localhost:5294/**`) et comparées à l'œil aux PNG `design-exports/v6/`.
- **Non vérifié** : WebKit / Safari iOS (absent du cloud), donc ni les glissements au doigt, ni l'appui long, ni la molette sur iPhone ; aucun essai contre la vraie API (uniquement des mocks) ; pas de build Docker ; vault Obsidian inaccessible depuis le cloud.

## Reste à faire
- **Damien** : tester sur iPhone les glissements gauche / droite sur les séances (avec et sans glissement complet), l'appui long (menu flouté sans ouverture de la séance), les segments et puces sans changement d'onglet, le libellé de retour selon la page d'origine, la molette de durée et la saisie « 8,2 » sans zoom, la modification et la suppression d'une sortie, l'appui long sur un exercice dans 06. Priorité haute avant le lot 5.
- **Damien** : fusionner `claude/admiring-dijkstra-vn9shy` dans `master` (les sessions cloud ne peuvent pas pousser sur `master`).
- **À trancher par Damien** : dans quel lot refaire l'écran 05 (Nouvelle séance muscu, encore en V5) ; il n'est dans aucun lot du plan.
- **Lot 5** (01, 02, 19, 20, 21, 25, 26) : l'écran 21 doit fournir l'édition d'une séance datée, puis brancher « Modifier la séance » sur 06.
- **Fin de V6** : retirer la page d'aperçu du kit (`/tabs/profile/kit`).

## Notes Obsidian à mettre à jour
- « Étape 4g — Migration frontend Ionic React » : ajouter le lot 4 (écrans, nouvelles routes, composants du kit, validation, points iPhone à tester).
- Journal : créer l'entrée de session du 2026-09-26 (V6 lot 4).
- Décision existante « Réécriture du frontend en Ionic React » / décisions V6 : compléter avec les arbitrages ci-dessus (pas de « Modifier la séance » avant l'écran 21, écarts cardio, définition des records, duplication datée d'aujourd'hui, retour via `pushedByRoute`).
- Apprentissages à créer : « Retour natif avec `pushedByRoute` (Ionic React) » et « Tests Playwright pendant les transitions Ionic ».
