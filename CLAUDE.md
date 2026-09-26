# SportTracker — Contexte projet

## ⚠️ Avant toute tâche : consulter le vault Obsidian via QMD
Le projet a un **coffre Obsidian** qui documente les tenants et aboutissants (décisions techniques, historique des étapes, journal de session, apprentissages).
**Interroge-le systématiquement via QMD** (collection `obsidian`) pour comprendre le contexte avant d'agir — ne te fie pas au seul code.

- Recherche : `mcp__plugin_qmd_qmd__query` / `search`, avec `collections: ["obsidian"]`.
- Vault : `C:\Users\Damien\Side_Project\Obsidian\Obsidian\SportTracker\`
  - `02-Decisions/` — arbitrages techniques (le *pourquoi*)
  - `03-Features/` — une note par étape (le *quoi*)
  - `04-Journal/` — journal par session
  - `05-Apprentissages/` — concepts appris
- **Après une session ou un changement notable** : mettre à jour le vault (journal + décisions/features concernées) puis **réindexer** (`qmd update && qmd embed`).

## Description
Application PWA de suivi sportif multi-activités (musculation et cardio).
Accessible depuis mobile (iOS, Android) et desktop via navigateur.

## Stack
- **Backend** : ASP.NET Core (API REST)
- **Frontend** : Blazor WASM (PWA) — **gelé**, en cours de remplacement par Ionic + React (TypeScript) dans `SportTracker.Web/` (voir étape 4g)
- **Base de données** : SQLite via EF Core
- **Hébergement** : VPS Hostinger (Linux + Docker)

## Architecture
Clean Architecture — 4 projets séparés :

```
SportTracker/
├── SportTracker.Core/   # Modèles + interfaces (aucune dépendance framework)
├── SportTracker.Data/   # EF Core + Repository pattern
├── SportTracker.Api/    # ASP.NET Core — endpoints REST
├── SportTracker.App/    # Blazor WASM — UI PWA (gelée, supprimée à la bascule)
└── SportTracker.Web/    # Ionic + React + TS — nouvelle UI PWA (à créer, étape 4g)
```

## Objectifs d'apprentissage
- Architecture logicielle C# propre (SOLID, Clean Architecture)
- Repository pattern + MVVM
- Déploiement Docker sur VPS
- Intégration LLM (suggestions de séances — étape 6)

## État d'avancement

### Étape 1 — Modèles de données ✅
- [x] Structure de solution (Core / Data / Api)
- [x] Enums : `ExerciseType`, `MuscleGroup`, `CardioType`
- [x] Modèles : `Exercise`, `ExerciseSet`, `WorkoutExercise`, `WorkoutSession`
- [x] Modèle : `CardioSession`
- [x] Interface : `ISession` (dans `Core/Interfaces/`)
- [x] Diagramme de domaine à jour (`docs/domain-model.puml`)

### Étape 2 — EF Core + Repository ✅
- [x] Créer `SportTrackerDbContext` dans `SportTracker.Data`
- [x] Configurer EF Core + SQLite
- [x] Gérer `List<MuscleGroup>` avec un `ValueConverter`
- [x] Implémenter le Repository pattern (`IRepository<T>`, `WorkoutSessionRepository`, `CardioSessionRepository`)
- [x] Première migration

### Étape 3 — API REST ✅
- [x] `WorkoutSessionController` — 5 endpoints CRUD (`GET`, `GET/{id}`, `POST`, `PUT/{id}`, `DELETE/{id}`)
- [x] `CardioSessionController` — 5 endpoints CRUD
- [x] `ExerciseController` — GET all + POST
- [x] `Program.cs` configuré (`AddControllers()`, `MapControllers()`, `IgnoreCycles`)
- [x] Routes explicites et plurielles (`api/workoutsessions`, `api/cardiosessions`, `api/exercises`)
- [x] Gestion des cas d'erreur (`NotFound`, `BadRequest`, `NoContent`)
- [x] CORS policy `"Frontend"` (`AllowAnyOrigin` en dev)

### Étape 4 — Blazor WASM UI ✅
- [x] `BaseAddress` configurable via `wwwroot/appsettings.json` (clé `ApiBaseUrl`)
- [x] `WorkoutSessions.razor` — liste cliquable `/workoutsessions`
- [x] `NewWorkoutSession.razor` — formulaire création avec exercices + sets dynamiques
- [x] `WorkoutSessionDetail.razor` — détail séance avec tableau des séries
- [x] `CardioSessions.razor` — liste cliquable `/cardiosessions`
- [x] `NewCardioSession.razor` — formulaire création cardio
- [x] `CardioSessionDetail.razor` — détail séance cardio
- [x] Fix cycle JSON (`ReferenceHandler.IgnoreCycles` dans l'API)
- [x] Fix `WorkoutSessionRepository.GetByIdAsync` : `Include`/`ThenInclude` pour charger les relations

### Étape 4b — Programmes d'entraînement (Carnets) ✅
- [x] Modèles : `WorkoutProgram`, `WorkoutProgramSession`, `WorkoutProgramExercise`
- [x] FK nullable `WorkoutProgramSessionId` sur `WorkoutSession`
- [x] Migration EF Core `AddWorkoutPrograms`
- [x] `WorkoutProgramRepository` + DI
- [x] `WorkoutProgramController` — 5 endpoints CRUD (`api/programs`)
- [x] `ExerciseController` — endpoint historique (`api/exercises/{id}/history`)
- [x] Tab bar Séances/Carnets sur la page Workouts
- [x] Pages Blazor : liste programmes, détail, création, séances, exercices, historique
- [x] Timer de repos pré-rempli depuis `RestSeconds`
- [x] Schéma cible structuré (TargetSets, TargetRepsMin/Max, RestSeconds)

### Étape 4d — Authentification & profils ✅
- Design arbitré (voir vault : décision *Authentification & multi-utilisateurs* + note *Étape 4d*)
- **Bloc 1 — Backend Identity + modèle + migration ✅**
  - [x] Package `Microsoft.AspNetCore.Identity.EntityFrameworkCore` dans `SportTracker.Data`
  - [x] `ApplicationUser : IdentityUser` (`Data/Users/`)
  - [x] `SportTrackerDbContext : IdentityDbContext<ApplicationUser>` (`base.OnModelCreating` en 1ʳᵉ ligne)
  - [x] `string UserId` sur `WorkoutSession`, `CardioSession`, `WorkoutProgram` (Core pur)
  - [x] Migration `AddIdentityAndUserScoping` appliquée (7 tables `AspNet*` + `UserId`)
- **Bloc 2 — Endpoints & sécurisation ✅** : `MapIdentityApi`, token ~30 j, `[Authorize]`, filtrage `UserId` (`HasQueryFilter` global) → `404`, CORS resserré
- **Bloc 3 — Front Blazor ✅** : `localStorage`, `AuthenticationStateProvider`, `DelegatingHandler`, routes protégées — flux register/login/logout/persistance validé E2E navigateur

### Étape 4e — Refonte design UI (Stitch → pen.dev) ✅
- Design system Blazor repensé (palette cyan `#78E8E4` / néon `#D4F53C` / dark `#172713`, Barlow / Barlow Condensed), trio Today/Programs/ExerciseLive porté, PWA hors ligne bout en bout (lot 10).
- `design.pen` + exports pen.dev conservés comme référence visuelle (`docs/analyse-hevy/exports-v5/`, palette V4→V5).

### Étape 4f — Implémentation design V5 (analyse Hevy) ✅
- Analyse comparative Hevy vs SportTracker (`docs/analyse-hevy/`) → P0/P1 priorisés, design V5 dans `design.pen` (27 écrans).
- **P0** — types de série (Warmup/Normal/DropSet/Failure), détection de record personnel (PR) en direct, résilience offline de la séance live (brouillons IndexedDB + replay idempotent au retour réseau), suppression de série en direct, démarrage d'une séance à vide en mode live.
- **P1** — RPE et notes par exercice, supersets (regroupement + connecteur visuel), filtres muscle+équipement sur le catalogue d'exercices, création d'exercice personnalisé (UI), graphiques enrichis (volume/meilleur poids/reps) sur l'historique, répartition musculaire + séries/semaine sur Progrès.
- Modèle : `ExerciseSet.SetType/RPE`, `WorkoutExercise.Notes/SupersetGroupId`, `Exercise.Equipment`, `WorkoutSession.ClientDraftId` — migrations `AddWorkoutLoggingDetailsAndEquipment` et `AddLiveWorkoutDraftKey`.
- Implémenté via orchestration multi-agent (`jev-orchestrator`/Orca) — détail dans le vault : [[2026-09-24 Orchestration V5]], [[V5 Fondations backend]], [[Synchronisation des brouillons live V5]].
- Hors scope V5 (P2, non demandé) : dossiers de routines, calendrier d'entraînement, mesures corporelles/photos, wearables.

### Étape 4g — Migration frontend Ionic + React ⏳ À faire
- Décision et arbitrages dans le vault : décision *Réécriture du frontend en Ionic React* + note *Étape 4g*. Choix de préférence assumé (non mesuré), gains attendus : démarrage à froid, geste retour iOS, transitions.
- **`SportTracker.App` gelé** : aucun commit jusqu'à la bascule, sauf le lot L1 (modification tolérée, sans changement de comportement). La nouvelle UI vit dans `SportTracker.Web/` (Vite + Ionic React + TS), déployée sur `https://beta.fmon-vps-n8n.fr` pendant le développement. **Plan d'implémentation (lots, vagues jev-orchestrator) : `Docs/migration-ionic/plan-4g.md`.**
- **Avancement (orchestration jev-orchestrator, `Docs/migration-ionic/plan-4g.md`)** :
  - Vague 1 ✅ intégrée (2026-09-25) : **L0** (`AddOpenApi`/`MapOpenApi` dev, origines CORS `localhost:5173`/`4173`/`beta.`) · **L1** (`SportTracker.Core/Services/StrengthMath.cs`, extraction 1RM/PR figée depuis `ExerciseLive.razor`/`ExerciseHistory.razor`, cas dans `Docs/test-cases/strength-math.json`, 75 tests xUnit verts) · **L2** (squelette `SportTracker.Web/` : routeur complet, thème V5, PWA `service-worker.js`, Playwright WebKit). Validation globale verte (`dotnet build`/`dotnet test` 75/75, `npm ci`/lint/typecheck/build/test/playwright).
  - Vague 2 ✅ intégrée (2026-09-25) : **L3** (client fetch typé + `MapIdentityApi` dans `src/api/`, token `st-auth-token`/propriétaire `st-draft-owner`, kit V5 dans `src/ui/` ; dérogation accordée par Damien pour brancher une garde d'auth minimale dans `src/app/routes.tsx` et implémenter Login/Register dans `src/features/profile/pages.tsx`) · **L5a** (domaine live TS pur : `strengthMath.ts` avec arrondi banker's rounding fidèle au C#, `restTimer.ts` basé sur `endsAt`, `liveDraft.ts`, `DraftStore` mémoire, file de synchro). Validation globale verte (`dotnet test` 75/75, `npm test` 21/21, `playwright test` 2/2 WebKit).
  - Vague 3 ✅ intégrée (2026-09-25) : **L4** (Today, cache TanStack Query, objectif hebdomadaire) · **L5b** (`DraftStore` IndexedDB `sporttracker-live-v2`, périmètre par propriétaire, branchement sur l'API réelle ; bug de persistance corrigé — connexion IndexedDB ouverte/fermée par opération au lieu d'une connexion partagée à vie, requis pour la durabilité sur WebKit) · **L5c** (UI séance live complète : saisie, RPE, notes, supersets, PR, minuteur, catalogue) · **L6** (Programmes) · **L7** (Historique/Progrès, cardio). Un incident quota Codex en cours de vague a interrompu L4 (repris proprement au 4ᵉ essai), L5c et L7 (travail partiel récupéré et terminé par Claude) ; un bug d'intégration (double PUT par file de synchro dupliquée entre L5c et L5b + double instance de module dans le test) trouvé et corrigé après coup. Validation globale verte (`dotnet test` 75/75, `npm test` 43/43, `playwright test` 8/8 WebKit répétés).
  - Vague 4 ✅ intégrée (2026-09-25) : **L8** (Profil : identité, stats agrégées, préférences, aide, déconnexion) · **L8b** (QA mobile WebKit — parcours complet + hors ligne + contrôles tactiles/scroll/spinner, `Docs/qa-4g-mobile-2026-09-25.md` — et mutualisation du refresher dupliqué Today/Programmes/Historique dans `V5Refresher`, correctif d'une zone tactile à 42px). Dispatchés en séquence (L8 puis L8b) plutôt qu'en parallèle pour que la QA/mutualisation porte sur le Profil déjà posé. Validation globale verte (`dotnet test` 75/75, `npm test` 46/46, `playwright test` 16/16 WebKit répétés).
  - **Vague 5 ✅ intégrée (2026-09-25)** : **L9** (`SportTracker.Web/Dockerfile` build Node → nginx statique, `nginx.conf` fallback SPA + `Cache-Control: no-cache` sur `index.html`/`service-worker.js`, service `web` dans `docker-compose.yml` sur le même modèle Traefik que `app`, host `beta.fmon-vps-n8n.fr`). **Build Docker réel vérifié a posteriori** (`docker compose build web` ✅, conteneur démarré et testé : `index.html`/`service-worker.js` répondent 200 avec `Cache-Control: no-cache`, fallback SPA fonctionnel sur une route arbitraire).
  - **L0 à L9 tous intégrés dans `genwox/master`.** Reste : L10 (bascule, manuelle, jamais dispatchée par l'orchestrateur).
  - **Suivi post-vague 5 (2026-09-25)** : flake ponctuel corrigé (clic instable sur « Fermer » de la feuille du minuteur, attendait insuffisamment la fin de la transition CSS — `e2e/helpers.ts` `closeRestTimerSheet`, 25/25 puis 8/8 confirmés). Build Docker `web` vérifié réellement (`docker compose build web` + conteneur testé, voir vague 5).
  - **Correctifs iOS après test iPhone (2026-09-26)** : zoom bloqué (viewport `maximum-scale=1`/`viewport-fit=cover`, champs à 16 px, `touch-action`, `gesturestart` refusé) ; en-tête `V5Header` collant qui devient une barre floutée au défilement et porte la zone de sécurité haute (meta `apple-mobile-web-app-*`, barre d'état `black-translucent`) ; routes « nouveau » avalées par leur route `:id` (IonRouterOutlet retient la **dernière** route qui correspond — l'ordre statique/paramétré est inversé dans `routes.tsx`, test e2e dédié) ; aperçus GIF (`ExerciseThumb`) et démonstration en feuille (`ExerciseDemoSheet`) au lieu d'un lien externe ; fidélité V5 des pages Carnets 10-14 rétablie ; titres qui ne se coupent plus au milieu d'un mot. Validé : lint, typecheck, `npm test` 47/47, Playwright 9/9 (Chromium, WebKit indisponible dans l'environnement cloud).
  - **Plein écran natif (2026-09-26)** : fond Paragon posé sur `html`/`body`/`ion-app`/`.ion-page` (plus aucun blanc sous la barre d'état, pendant les transitions ou le rebond), `theme-color` et manifeste en `#1A7964` (haut du fond), barre d'onglets translucide floutée, vraie icône d'app (l'icône Blazor violette était restée) + icône *maskable* et `apple-touch-icon`, écrans de lancement iOS pour 11 tailles d'iPhone (`scripts/pwa-assets.mjs` les régénère), bandeau « Passe en plein écran » affiché une seule fois dans Safari sur iPhone. **Bug de mise à jour corrigé** : avec `registerType: 'prompt'` sans `onNeedRefresh`, le nouveau service worker restait en attente et l'ancien `index.html` précaché continuait d'être servi (l'iPhone installait même l'ancienne page) ; la mise à jour s'applique désormais à l'ouverture ou au retour dans l'app, jamais sur `/live`.
  - **V6 « app native », lot 1 — kit `src/ui/` (2026-09-26)** : décisions tranchées avec Damien (toutes les recommandations de `Docs/pen-dev/passation-v6-code.md`) : en-tête replié **foncé** `#315E5ECC` + titre blanc (pas le verre clair du kit, illisible sous l'heure blanche) ; **données V5, forme V6** sur Carnets 10-14 ; **un segment filtre, ne change jamais d'onglet** (Progrès reste derrière « Voir mes progrès ») ; rouge `#FF3B30` réservé aux suppressions ; **pas d'haptique** (iOS n'en expose pas aux PWA). Kit dans `src/ui/v6.tsx` + `v6.css` (V6Header, V6BackButton, V6Avatar, V6TabBar, V6Segment, V6Chip/V6ChipRow, V6Toggle, V6List/V6Item/V6InputItem, V6SlidingRow, V6Button, V6StickyAction, V6Sheet, V6Skeleton), `src/ui/v6Feedback.ts` (`useV6ActionSheet`, `useV6Toast`), `src/ui/v6Nav.ts` (transition iOS ramenée à **350 ms** via `navAnimation`, libellés de retour, onglets) ; jetons `--st-v6-*` et `--ion-color-danger` dans `theme.css`. Branché partout : **V6Header remplace V5Header** (grand titre qui défile sous une barre collante 44 pt, petit titre centré au repli), **V6Skeleton remplace V5Loading**, **barre d'onglets V6** (Aujourd'hui · Programmes · Historique, pastille citron derrière l'icône). Le reste du kit (listes, segments, glissements, feuilles…) est adopté écran par écran dans les lots 2 à 5. Page d'essai temporaire **Profil › Aide & support › Aperçu du kit V6** (`/tabs/profile/kit`, `src/ui/KitPage.tsx`) — à retirer à la fin de la V6. Validé : lint, typecheck, `npm test` 50/50, build, Playwright 10/10 ×2 (Chromium, WebKit indisponible dans le cloud), captures comparées aux PNG `design-exports/v6/`. Vault Obsidian non accessible depuis le cloud : à mettre à jour par Damien.
  - **V6 lot 1, retour iPhone (2026-09-26)** : sur l'aperçu du kit, les lignes glissables et les crans de feuille ne réagissaient pas au doigt (ils marchaient dans Chromium). Cause retenue : `touch-action: pan-x pan-y` posé sur `html`/`body`/`#root` pour bloquer le zoom, qui remplace le `manipulation` d'Ionic et casse ses gestes JS sous Safari iOS (ce sont les premiers de l'app : le rafraîchissement iOS est natif, le retour par glissement désactivé). Retour à `touch-action: manipulation` (double-tap toujours bloqué, pincement refusé par `gesturestart`) ; flou d'arrière-plan retiré des éléments qui bougent sous le doigt (ligne glissable, feuille) ; toucher la poignée d'une feuille passe au cran suivant (`handleBehavior="cycle"`, comme la poignée iOS) ; consignes en clair et boutons « Bandeau succès / erreur » sur la page d'aperçu. Test `e2e/kit.spec.ts` (touch-action, glissements gauche/droite, poignée, toast). Validé : lint, typecheck, `npm test` 50/50, build, Playwright 14/14 ×2 (Chromium) ; **correctif non vérifiable dans le cloud (pas de WebKit) : à confirmer sur iPhone**.
  - **V6 lot 2 — séance live (2026-09-26)** : écrans 15, 22, 23, 27. Nouveaux composants du kit dans `src/ui/v6Live.tsx` + `v6Live.css` (exportés par `src/ui/index.tsx`) : **V6Stepper** (− / + de 52 pt ; un tap = un pas au relâcher, appui long = un pas après 400 ms puis toutes les 80 ms, un défilement qui démarre sur la touche ne change rien — logique pure `src/domain/pressRepeat.ts` ; toucher la valeur ouvre le pavé), **V6Keypad** (pavé maison, champs `readonly` + `inputmode="none"`, la 1ʳᵉ touche remplace la valeur, virgule, ⌫, bascule poids / répétitions, clavier physique accepté — `src/domain/keypad.ts`), **V6SetRow** (cercle à toucher → ligne citron + coche + minuteur ; suppression par glissement, compose `V6SlidingRow`), **V6WheelPicker** (molette maison à défilement aimanté sur 3 lignes : l'`IonPicker` inline refusait de se réduire et débordait), **V6Searchbar** (`IonSearchbar`, « Annuler » au focus, 250 ms), **V6LiveMiniBar**. Exercice en direct (15) : V6Header avec retour « Séance » et « Terminer » en haut, « Dernière fois, série N », steppers, segment de type, RPE en 44 pt, séries validées au cercle, repos et notes en liste inset, « Valider la série N » collant. Pavé (22) en feuille 50 %. Minuteur (23) en feuille 25 / 50 % (chrono, « Passer le repos » et « + 30 s » au cran 25 % ; pause, préréglages 30 s à 3 min, molette min / s et prochaine série au cran 50 %), toujours calé sur `endsAt` (`addRestTime`, `setRestDuration`, `restProgress` dans `restTimer.ts`). Bibliothèque (27) en feuille 100 % : recherche, puces muscle / équipement conservées d'une ouverture à l'autre, **sélection multiple** puis « Ajouter à la séance (n) » (un seul exercice → ouvert directement), création d'exercice personnalisé dans la même feuille. **Mini-barre « séance en cours »** (`src/features/live/LiveMiniBar.tsx`) dans le slot bas d'`IonTabs`, au-dessus des onglets : exercice, série, chrono de séance, repos restant, ⏭ pour passer le repos, un tap rouvre la séance. État partagé `st-live-session` (localStorage, `src/features/live/liveSession.ts` + `src/domain/liveSession.ts`) qui porte aussi le minuteur (il survit à un changement de page ou à un rechargement) ; la barre disparaît à « Terminer » ou dès que le brouillon n'existe plus ; une séance de carnet n'y entre qu'à sa 1ʳᵉ série validée ; les mises à jour PWA attendent aussi tant qu'elle est affichée. Brouillons IndexedDB, file de synchro, détection de record et GIF (`ExerciseThumb`, `ExerciseDemoSheet`) inchangés. Correctifs du kit lot 1 : les boutons V6 d'une barre d'outils (`V6StickyAction`) étaient à 80 % d'opacité ; `V6Sheet` suit `willDismiss` (une réouverture rapide faisait osciller la feuille) ; petit titre replié tronqué quand il y a un retour et une action texte ; `V6SlidingRow` prend `className` et un libellé accessible, `V6Sheet` prend `subtitle`, `className` et `backdropBreakpoint` (au cran 25 % du minuteur, la page reste utilisable). Aperçu du kit : section « Séance live (lot 2) ». Validé : lint, typecheck, `npm test` 68/68 (`src/domain/liveV6.test.ts`), build, Playwright 19/19 ×2 en Chromium (nouveau `e2e/live-v6.spec.ts` ; `live`, `qa-mobile` et `kit` adaptés : ajout via la bibliothèque, retour natif, suppression par glissement), captures comparées aux PNG `design-exports/v6/`. **WebKit indisponible dans le cloud : à valider sur iPhone.** Vault Obsidian non accessible depuis le cloud : à mettre à jour par Damien.
  - **V6 lot 3 — Aujourd’hui et Carnets (2026-09-26)** : écrans 03, 10, 11, 12, 13, 14, 24. **Données V5, forme V6** (décision tranchée) : les statuts **Fait / À faire**, le badge **Actif**, la progression de la semaine, les **supersets** et les **badges de type de série** sont dérivés de ce que l’API stocke déjà (aucun nouveau modèle) — logique pure `src/features/programs/programData.ts` (séance « Fait » = séance datée de la semaine liée par `WorkoutProgramSessionId` ; carnet « Actif » = celui de la dernière séance liée ; supersets et badges « Dernière fois » = dernière séance enregistrée de cette séance du carnet). `GET api/programs` ne renvoie pas les séances : chaque carnet est relu en entier (`useProgramDetails`, `src/features/programs/programQueries.ts`, même cache que son détail). Nouveaux composants du kit dans `src/ui/v6Plan.tsx` + `v6Plan.css` : **V6SessionRow** (carte séance / carnet : pastille, titre, détail, badges V5, chevron ; couleur du carnet en point sur la pastille), **V6Badge**, **V6ReorderList / V6ReorderRow** (`IonReorderGroup`, poignée ≡, ligne soulevée à 1,03 avec ombre, glisser à gauche pour « Retirer »), **V6ContextMenu** (appui long 500 ms — `src/domain/longPress.ts` —, clic droit ou appui long Android ; fond flouté, aperçu de la ligne, actions dont la destructive en rouge système), **V6StepperItem** (− / + 44 pt dans une liste inset, appui long = répétition), **V6TextareaItem** ; hooks de pointeur regroupés dans `src/ui/v6Hooks.ts` (`usePressRepeat` du lot 2, `useV6LongPress`). Aujourd’hui (03) : « Ta séance du jour » = prochaine séance à faire du carnet actif avec **« Commencer »** (live plein écran) et « Séance à vide » ; séance du jour déjà enregistrée → « Continuer » (séance de carnet) ou « Voir la séance » ; ligne de synchro avec icône, « 0 j » quand la série est nulle. Accueil sans séance (24) : « Démarrer une séance à vide » / « Choisir un carnet », étapes du mode direct, **« Créer un exercice personnalisé »** ouvre la bibliothèque du lot 2 directement sur le formulaire (`CatalogSheet startCreating`). Carnets (10) : grand titre « Tes carnets », cartes avec Actif / Superset / % de la semaine, **appui long → menu** (Ouvrir, Nouvelle séance, Dupliquer, Supprimer le carnet avec feuille d’actions), « Nouveau carnet » collant ; **pas de segment Muscu / Cardio / Carnets** (un segment ne change jamais d’onglet). Nouveau carnet (11) : listes inset (Nom, Objectif), 8 couleurs V5 en cibles 44 pt, séances en lignes glissables, « Créer le carnet » collant, erreurs à l’encre sous le champ. Détail du carnet (12) : objectif, semaine (n / total), exercices · séries cibles · supersets, séances avec Fait / À faire, **appui long → menu** (Démarrer en live, Ouvrir, Modifier, Dupliquer — pas de suppression de séance : le `PUT` du carnet ne supprime pas les séances absentes), « Démarrer {prochaine séance} » collant. Séance du carnet (14) : « Modifier » dans la barre, résumé avec statut, exercices **réordonnés à la poignée** et **retirés par glissement avec confirmation en feuille d’actions** (enregistrés tout de suite, cache optimiste annulé si le serveur refuse), connecteur et badge superset, badges « Dernière fois » (Éch. / Normal / Drop / Échec), GIF en feuille, « Démarrer en live » + « Séance à vide » collants. Nouvelle séance (13) et « Modifier » (14) partagent l’éditeur : liste inset « Nom », exercices réordonnables / retirables, paramètres de l’exercice choisi (steppers Séries / Reps min / Reps max, **repos à la molette en feuille 50 %**), bibliothèque du lot 2 en feuille 100 % (sélection multiple), « Créer la séance » / « Enregistrer » collants. Tirer pour rafraîchir partout, squelettes seulement sans cache. Les feuilles et menus des pages Carnets sont rendus hors d’`IonContent` (comme le live). Écran 05 (Nouvelle séance muscu) déplacé tel quel dans `src/features/programs/workoutPages.tsx`, refait au lot 4. Correctifs du kit : action texte de l’en-tête (« Modifier ») en blanc quand la barre est repliée ; petit titre replié resserré dès qu’il y a un libellé de retour. Aperçu du kit : section « Carnets (lot 3) ». Ordre des routes inchangé (statique après `:id`, test e2e vert). Validé : lint, typecheck, `npm test` 81/81 (`programData.test.ts`), build, Playwright 26/26 ×2 en Chromium (nouveau `e2e/programs-v6.spec.ts` + `e2e/programsMock.ts` : appui long, duplication, suppression, formulaire, réordonnancement à la poignée, retrait par glissement, molette, Commencer, état vide), captures comparées aux PNG `design-exports/v6/`. **WebKit indisponible dans le cloud : à valider sur iPhone** (appui long, poignée ≡, flou du menu). Vault Obsidian non accessible depuis le cloud : à mettre à jour par Damien.
- **Exigences dès le 1er écran** : données via TanStack Query (cache affiché puis rafraîchi, jamais de spinner pleine page) ; tout défilement dans `IonContent` ; `mode: 'ios'` ; composants Ionic pour les comportements de plateforme, composants V5 maison pour l'identité visuelle ; minuteur de repos basé sur l'heure de fin (pas un compteur).
- **Navigation v1** : 3 onglets (Today · Programmes · Historique/Progrès), Profil via avatar ; détails empilés avec geste retour ; feuilles pour catalogue, création d'exercice, pavé de saisie, minuteur ; séance live plein écran, sortie par « Terminer ».
- Ordre : prérequis backend (`MapOpenApi` en dev + origines CORS `localhost:5173` et `https://beta.fmon-vps-n8n.fr`) → tests xUnit de la logique C# (1RM, PR, minuteur) → auth/client HTTP → Today → séance live + brouillons offline (+ mêmes tests en Vitest) → Programmes → Historique/Progrès → Profil.
- Types TS générés depuis OpenAPI (`openapi-typescript`). Mises à jour PWA appliquées au prochain lancement, jamais pendant une séance live.
- **Bascule** sur `app.fmon-vps-n8n.fr` quand tous les écrans sont portés : service worker publié à `/service-worker.js` (remplace celui de Blazor), reprise du token `st-auth-token`, brouillons `sporttracker-live-v1` synchronisés avant, puis suppression de `SportTracker.App`.
- Risques acceptés : pas de mesure préalable, pas de test mode avion avant bascule.

### Étape 5 — Docker + déploiement VPS ✅
- [x] Déployé sur VPS Hostinger via Docker + Traefik (HTTPS Let's Encrypt)
- [x] App : `https://app.fmon-vps-n8n.fr` — API : `https://api.fmon-vps-n8n.fr`
- [x] Trousseau Data Protection persisté dans le volume `dp-keys` (`/keys`) — les tokens survivent aux redéploiements
- ⚠️ À revérifier avant déploiement : build WASM complet (`ConvertDllsToWebCil`) buté sur un verrou Windows local pendant l'implémentation V5 (probable conflit de builds concurrents entre worktrees) — `dotnet build`/`dotnet test` classiques passent sans erreur.

### Étape 6 — Intégration LLM ⏳ À faire
- Reportée après la bascule Ionic (étape 4g) ; seule la conception de l'endpoint backend peut être avancée. Synchro catalogue Hevy (`SportTracker.Tools`) en pause tant que la clé API Pro manque.

## Diagrammes
- `Docs/Model/domain-model.puml` — modèles de domaine (Core)
- `Docs/data-layer.puml` — couche Data (repositories + DbContext)
- `Docs/Flux_API.puml` — flux d'un appel HTTP (séquence)
