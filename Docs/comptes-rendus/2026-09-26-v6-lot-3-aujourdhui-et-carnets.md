# V6 lot 3 — Aujourd’hui et Carnets

- **Date(s)** : 2026-09-26
- **Session** : https://claude.ai/code/session_019VHV6vEowFkYpnJvYTi8dM · branche `claude/cool-gauss-fqlvk1`
- **Étape du projet** : 4g — V6 « app native », lot 3 (écrans 03, 10, 11, 12, 13, 14, 24)
- **Commits** : `b285b1d` feat(web): V6 lot 3 — Aujourd'hui et Carnets (écrans 03, 10 à 14, 24)

## Ce qui a été fait
- **Lecture préalable** : `CLAUDE.md`, `Docs/pen-dev/passation-v6-code.md` (« Décisions tranchées »), `Docs/pen-dev/sporttracker-native/SKILL.md`, PNG `design-exports/v6/` (03, 10 à 14, 24), textes des frames V6 et V5 correspondants et rapport V6 extraits de `design.pen`, pages Blazor `ProgramSessionDetail.razor` (pour savoir ce que la V5 affichait réellement), `WorkoutProgramRepository` / `WorkoutProgramController` (comportement du `PUT` et du `DELETE`).
- **Kit V6 — nouveaux composants** (`SportTracker.Web/src/ui/v6Plan.tsx` + `v6Plan.css`, exportés par `src/ui/index.tsx`) :
  - `V6SessionRow` : carte de séance ou de carnet (pastille, titre, détail, badges V5, chevron) ; la couleur du carnet est un point sur la pastille.
  - `V6Badge` : badge V5 (tons action, surface, échauffement, drop set, échec, encre).
  - `V6ReorderList` / `V6ReorderRow` : `IonReorderGroup` avec poignée ≡, ligne soulevée (ombre, échelle 1,03), glisser à gauche pour « Retirer ».
  - `V6ContextMenu` : menu d’appui long en `IonModal` avec animations maison (fondu + échelle), fond flouté, aperçu de la ligne, actions (destructive en rouge système).
  - `V6StepperItem` : ligne de liste inset avec − / + de 44 pt (appui long = répétition).
  - `V6TextareaItem` : champ multi-ligne à libellé fixe, 16 px.
- **Hooks de pointeur** regroupés dans `src/ui/v6Hooks.ts` : `usePressRepeat` (déplacé depuis `v6Live.tsx`) et `useV6LongPress` ; logique pure de l’appui long dans `src/domain/longPress.ts` (500 ms, annulé au-delà de 10 px de mouvement, le clic qui suit est avalé, clic droit / appui long Android ouvrent directement).
- **Données V5 dérivées** (`src/features/programs/programData.ts`, sans nouveau modèle ni changement d’API) : séance « Fait » cette semaine, carnet « Actif », progression de la semaine, prochaine séance, supersets et badges « Dernière fois » (types de série) tirés de la dernière séance enregistrée de la séance du carnet, déplacement d’un élément de liste, format du repos, `withSession`, `programPayload` (corps du `PUT` sans objets imbriqués), `duplicateProgram`.
- **Requêtes partagées** (`src/features/programs/programQueries.ts`) : `usePrograms`, `useProgram`, `useProgramDetails` (relit chaque carnet en entier), `useProgramsSettled`.
- **Écrans** :
  - 10 Carnets (`src/features/programs/pages.tsx`) : grand titre « Tes carnets », cartes avec Actif / Superset / % de la semaine, appui long → menu (Ouvrir, Nouvelle séance, Dupliquer, Supprimer le carnet confirmé en feuille d’actions), « Nouveau carnet » collant, tirer pour rafraîchir.
  - 11 Nouveau carnet : listes inset (Nom, Objectif), 8 couleurs V5 en cibles 44 pt (grille 4 × 2 dans une carte), séances en lignes glissables, « Créer le carnet » collant, erreurs à l’encre sous le champ, erreur réseau en toast avec « Réessayer ».
  - 12 Détail du carnet : objectif, semaine (n / total + barre), exercices · séries cibles · supersets, séances avec Fait / À faire, appui long → menu (Démarrer en live, Ouvrir, Modifier, Dupliquer), « Démarrer {prochaine séance} » collant.
  - 13 Nouvelle séance du carnet et 14 « Modifier » : même éditeur (nom, exercices réordonnables et retirables avec confirmation, paramètres de l’exercice choisi en steppers, repos à la molette `V6WheelPicker` en feuille 50 %, bibliothèque `CatalogSheet` du lot 2 en feuille 100 % avec sélection multiple), « Créer la séance » / « Enregistrer » collants.
  - 14 Séance du carnet : « Modifier » dans la barre, résumé avec statut, exercices réordonnés à la poignée et retirés par glissement (enregistrés aussitôt, cache TanStack Query optimiste annulé si le serveur refuse), connecteur et badge superset, badges « Dernière fois », GIF en feuille, « Démarrer en live » + « Séance à vide » collants.
  - 03 Aujourd’hui (`src/features/today/pages.tsx`, `today.css`) : « Ta séance du jour » = prochaine séance à faire du carnet actif, « Commencer » ouvre le live ; séance déjà enregistrée aujourd’hui → « Continuer » (séance de carnet) ou « Voir la séance » ; ligne de synchro avec icône ; « Reprendre » en `V6SessionRow`.
  - 24 Accueil sans séance : « Démarrer une séance à vide » / « Choisir un carnet », étapes du mode direct, « Créer un exercice personnalisé » ouvre la bibliothèque sur le formulaire (nouvelle option `startCreating` / `createLabel` de `src/features/live/CatalogSheet.tsx`), « 0 j » dans la ligne de synchro.
- **Écran 05** (Nouvelle séance muscu, lot 4) déplacé sans changement de comportement dans `src/features/programs/workoutPages.tsx` (réexporté par `pages.tsx`, routes inchangées).
- **Correctifs du kit** (`src/ui/v6.css`) : action texte de l’en-tête (« Modifier ») en blanc quand la barre est repliée ; petit titre replié limité à `100vw - 190px` dès qu’il y a un libellé de retour.
- **Aperçu du kit** (`src/ui/KitPage.tsx`) : section « Carnets (lot 3) » (appui long, poignée, retrait, stepper, badges).
- **Tests** : `src/features/programs/programData.test.ts` (13 tests, dont l’appui long) ; `e2e/programs-v6.spec.ts` (7 tests) + `e2e/programsMock.ts` (API en mémoire : carnets, séances liées, catalogue, enregistrement des `PUT` / `POST` / `DELETE`).
- **Docs** : `CLAUDE.md` et `AGENTS.md` (puce « V6 lot 3 »), `Docs/pen-dev/passation-v6-code.md` (lot 3 coché).

## Décisions prises
- **Statuts, Actif, supersets et badges dérivés côté client** des séances enregistrées (rien de nouveau dans l’API). Option écartée : ajouter des champs au modèle. Raison : la consigne était « garder les données V5 », et elles se calculent depuis `WorkoutProgramSessionId` et les séances existantes. Tranché par Claude, en application de la décision de Damien « données V5, forme V6 ».
- **Pas de segment Muscu / Cardio / Carnets sur l’écran 10** (dessiné dans la V6). Raison : il changerait d’onglet, contraire à la décision n° 3 (« un segment filtre, ne change jamais d’onglet »). Décision de Damien appliquée par Claude.
- **Pas de « Supprimer la séance » dans le menu de l’écran 12** ; « Dupliquer » à la place. Raison : `WorkoutProgramRepository.UpdateAsync` ne supprime pas les séances absentes du `PUT`, l’action n’aurait aucun effet. Option écartée : modifier l’API (hors périmètre du lot). Tranché par Claude, signalé à Damien.
- **Relire chaque carnet en entier** (`useProgramDetails`) au lieu de modifier `GET api/programs`, qui ne renvoie pas les séances. Option écartée : ajouter un `Include` côté API (hors périmètre front, redéploiement de l’API). Tranché par Claude.
- **« Ta séance du jour »** (03) = prochaine séance « À faire » du carnet actif, avec « Commencer ». Avant, la carte ne montrait qu’une séance déjà enregistrée aujourd’hui. Raison : c’est le contenu des frames V5/V6 03 (« Commencer »). Tranché par Claude.
- **Couleurs du carnet** : les 8 couleurs V5 conservées, en grille 4 × 2 dans une carte, plutôt qu’une rangée de 6 comme dans la V6. Raison : 8 cibles de 44 pt ne tiennent pas sur une ligne de 350 pt ; garder les données V5. Tranché par Claude.
- **Couleur du carnet en point sur la pastille** plutôt qu’un liseré. Raison : le liseré en `box-shadow` donnait une forme de parenthèse sur la capture. Tranché par Claude.
- **Feuilles et menus rendus hors d’`IonContent`** (portail vers un hôte placé à côté, comme les pages live du lot 2). Tranché par Claude.
- **Titres des sections** : Foruner sur l’écran 10 (« Mes programmes »), petites capitales de liste sur 12 à 14, comme les PNG. Libellé « Nom » au lieu de « Nom du carnet » (tronqué dans la colonne de 112 pt ; le rapport V6 signalait déjà les libellés sur deux lignes). Tranché par Claude.

## Problèmes rencontrés et solutions
- **Lint `react-refresh/only-export-components`** : des hooks (`usePressRepeat`, `useV6LongPress`) et des fonctions (`usePrograms`, `useProgramDetails`) exportés depuis des fichiers de composants. Correctif : hooks déplacés dans `src/ui/v6Hooks.ts`, requêtes dans `programQueries.ts` ; `useV6ActionSheet` / `useV6Toast` importés depuis `src/ui/v6Feedback.ts` plutôt que réexportés par `index.tsx`. Vérifié par `npm run lint`.
- **Lint `react-hooks/refs`** (« Cannot access refs during render ») : l’objet d’appui long était créé dans `useState` avec une fonction lisant une ref, et l’éditeur gardait le brouillon dans une ref affectée pendant le rendu. Correctif : objet créé paresseusement dans les gestionnaires d’événements (`pressRef.current ??=`) ; l’éditeur reçoit une fonction `change(update)` qui passe par le `setState` fonctionnel. Vérifié par `npm run lint`.
- **Page visible à travers les feuilles** sur les captures (Today et éditeur de séance). Cause retenue : feuilles déclarées dans `IonContent`, alors que le lot 2 les place à côté. Correctif : hôte d’overlays à côté d’`IonContent` (`createPortal`) pour les pages Carnets, `CatalogSheet` sorti d’`IonContent` sur Today. Le voile clair qui reste correspond au fond de feuille à 96 % du kit (styles calculés vérifiés : `rgba(243, 252, 252, 0.96)`). Le flou (`backdrop-filter`) ne s’affiche pas dans les captures Chromium sans GPU : non vérifiable dans le cloud.
- **Feuille du repos sans fond assombri** : avec les crans `[0, 0.5]`, `backdropBreakpoint` vaut 0,5 par défaut et le fond ne s’assombrit qu’au-delà. Correctif : `backdropBreakpoint={0}` sur cette feuille. Vérifié sur capture.
- **Flou du menu contextuel invisible** : posé sur le fond `ion-backdrop`, dont l’opacité est de 40 %, le flou n’apparaissait qu’à 40 %. Correctif : flou porté par la zone du menu (opaque une fois ouverte). Non vérifiable dans Chromium sans GPU.
- **Petit titre replié « MODIFIER LA SÉANCE » par-dessus le libellé « Carnet »** : la règle du kit ne resserrait le titre que s’il y avait aussi une action texte. Correctif : nouvelle règle dès qu’il y a un retour. Vérifié sur capture.
- **Mode « Modifier » ouvert en milieu de page** (défilement conservé). Correctif : `scrollToTop(0)` à l’entrée et à la sortie du mode. Vérifié sur capture.
- **Scintillement possible au démarrage à froid** : Aujourd’hui aurait affiché « Aucune séance prévue » le temps de lire les carnets. Correctif : `useProgramsSettled` ; squelette de la carte tant que la liste et le détail des carnets ne sont pas lus. Trouvé à la relecture, pas observé.
- **Tests e2e** : poignée ≡ cachée sous la barre d’action collante (le geste ne démarrait pas — diagnostiqué avec `elementFromPoint`) → la ligne est centrée avant le glisser ; sélecteurs ambigus (« Push Pull Legs » et sa copie ; vignette et ligne nommées « Développé couché ») → `.first()` et `^` ; « Démarrer une séance à vide » mène à `/live/<uuid>` → expression régulière adaptée. La vignette sans GIF n’est plus un bouton désactivé mais un simple aperçu.

## Apprentissages
- `IonReorderGroup` : le geste de réordonnancement ne démarre que si le pointeur touche réellement l’`ion-reorder` ; une barre collante (`IonFooter`) par-dessus suffit à le bloquer, sans erreur.
- `IonReorderGroup` (Ionic 8.8) : `ionItemReorder` est déprécié au profit de `ionReorderEnd` ; `detail.complete()` déplace le DOM, l’état React peut ensuite être réordonné avec des `key` stables sans conflit (vérifié en e2e).
- Feuille Ionic : `backdropBreakpoint` est le cran **à partir duquel** le fond commence à s’assombrir ; avec un seul cran, il faut le mettre à 0 pour avoir un fond sombre.
- Un `backdrop-filter` sur un élément à opacité partielle ne floute qu’en proportion de cette opacité : le porter par un élément opaque.
- Appui long sur une ligne qui navigue : éviter `routerLink` (un `<a>` déclenche l’aperçu de lien d’iOS) et avaler le clic qui termine l’appui long ; `-webkit-touch-callout: none` + `user-select: none` sur la ligne.
- Avec `eslint-plugin-react-hooks` 7, lire ou passer une ref pendant le rendu est une erreur : créer les objets mutables paresseusement dans les gestionnaires.
- `GET api/programs` ne renvoie pas les séances (pas d’`Include` dans `GetAllAsync`) et `PUT api/programs/{id}` ne supprime pas les séances absentes du corps (seuls les exercices sont recréés).

## Validation
- `npm run lint` : 0 erreur. `npm run typecheck` : 0 erreur.
- `npm test` (Vitest) : 81/81 (12 fichiers ; 68 avant ce lot + 13 dans `programData.test.ts`).
- `npm run build` : OK (service worker généré).
- Playwright en Chromium (config temporaire avec `executablePath: '/opt/pw-browsers/chromium'`, non commitée) : 26/26 avec `--repeat-each=2` (52 passés), dont les 7 nouveaux tests `e2e/programs-v6.spec.ts` ; le test d’ordre des routes (`navigation.spec.ts`) reste vert. Suite relancée intégralement après chaque correctif, dernière fois après le correctif du scintillement.
- Captures 390 × 844 (script Playwright local avec `e2e/programsMock.ts`, non commité) comparées aux PNG `design-exports/v6/` 03, 10, 11, 12, 13, 14, 24, y compris états repliés, menu contextuel, feuille du repos et feuille de création d’exercice.
- **Non vérifié** : WebKit / Safari iOS (absent du cloud) — appui long, poignée ≡, glissement dans les listes, flou du menu et des barres, rendu des feuilles. Aucun test sur iPhone. API réelle non appelée (tout est simulé).

## Reste à faire
- **Damien, priorité haute** : tester sur iPhone (liste donnée en fin de session : appui long sur carnet et séance, poignée ≡ puis rechargement, retrait par glissement, molette du repos, steppers, carte « Ta séance du jour », accueil vide, formulaire Nouveau carnet, barre repliée de 12 et 14, tirer pour rafraîchir, section « Carnets (lot 3) » de l’aperçu du kit), puis fusionner la branche (`--ff-only`).
- **À décider (Damien)** : suppression d’une séance de carnet — nécessite que le `PUT` du carnet supprime les séances absentes, ou un endpoint dédié.
- **Optionnel (API)** : `Include` des séances dans `GET api/programs` pour éviter une requête par carnet.
- **Lot 4** : Historique, Progrès et cardio (04, 06 à 09, 16 à 18) ; refaire l’écran 05 (`workoutPages.tsx`) ; `V6SessionRow` et `V6ContextMenu` sont prêts pour les listes 04, 07, 17.
- Fin de V6 : retirer la page d’aperçu du kit.

## Notes Obsidian à mettre à jour
- « Étape 4g — Migration frontend Ionic React » : ajouter le lot 3 (écrans, composants, validation, points iPhone à vérifier).
- Décision « Réécriture du frontend en Ionic React » / note V6 : préciser l’application de « données V5, forme V6 » sur les Carnets (dérivation côté client), l’absence de segment sur 10, l’absence de suppression de séance.
- Journal : entrée 2026-09-26 « V6 lot 3 — Aujourd’hui et Carnets ».
- À créer (05-Apprentissages) : « Ionic — réordonnancement, crans de feuille et appui long » (points de la section Apprentissages).
- À créer ou compléter : note sur les limites de l’API Carnets (`GET` sans séances, `PUT` qui ne supprime pas les séances).
