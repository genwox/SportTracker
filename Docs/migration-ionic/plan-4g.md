# Plan d'implémentation — Étape 4g : migration du frontend vers Ionic + React

Brief pour **`jev-orchestrator`** (Orca). Ce fichier est versionné dans le dépôt (`Docs/migration-ionic/plan-4g.md`). Chaque worker le lit depuis sa propre copie de travail (worktree) : la spec de chaque sous-tâche se contente de pointer vers son lot.

- Sous-domaine de test : **`beta.fmon-vps-n8n.fr`**
- API : `https://api.fmon-vps-n8n.fr`
- App actuelle (Blazor, gelée) : `https://app.fmon-vps-n8n.fr`

---

## A. Avant de lancer l'orchestrateur (Damien)

1. **Fusionner la branche `claude/zen-cori-wvv1dp` dans `master`.** Elle ne contient que de la doc, dont ce plan. Les worktrees enfants partent de `master` par défaut : sans cette fusion, les workers ne voient pas le plan.
2. **Créer les 4 notes du vault** (fichier `vault-notes-migration-ionic.md`), puis lancer `qmd update && qmd embed`.
3. **Vérifier l'accès réseau des agents.** Les lots 0, 1 et 2 font `dotnet restore` / `npm install`, et le lot 2 `npx playwright install webkit`. À vérifier dans la config de Codex (le sandbox `workspace-write` coupe le réseau par défaut) : sinon ces installations échouent. Soit autoriser le réseau dans le sandbox, soit laisser `route` choisir un autre agent pour ces lots.
4. **Prévenir les blocages sans surveillance** (pièges connus du skill) :
   - invite de confiance au premier lancement de Claude Code sur un dossier : à pré-accepter ;
   - approbations Codex en plein travail : `approval_policy = "never"` ;
   - réglage expérimental Orca « Use updated structured native chat » : doit être **désactivé**.
5. `check_env.py --live` doit afficher `PRÊT`.

---

## B. Orchestration

### Vagues

| Vague | Sous-tâches (parallèles dans une vague) | Timeout conseillé | Worktree : `--base-branch` |
|---|---|---|---|
| 1 | **L0** prérequis backend · **L1** tests C# 1RM/PR · **L2** squelette Web | 15 / 30 / 45 min | défaut (`master`) |
| 2 | **L3** auth + client HTTP + kit V5 · **L5a** domaine live (TS pur) | 45 / 30 min | **branche de l'orchestrateur** (contient la vague 1) |
| 3 | **L4** Today · **L5b** brouillons IndexedDB + synchro · **L5c** UI séance live · **L6** Programmes · **L7** Historique/Progrès | 30 / 45 / 60 / 45 / 60 min | branche de l'orchestrateur (vagues 1 et 2) |
| 4 | **L8** Profil · **L8b** QA mobile WebKit + mutualisation | 20 / 60 min | branche de l'orchestrateur (vagues 1 à 3) |
| 5 | **L9** conteneur + compose `beta.` | 30 min | branche de l'orchestrateur |
| — | **L10** bascule | **Humaine, hors orchestrateur** | — |

Les timeouts sont des estimations. Le défaut du skill (15 min) est **trop court** pour la plupart des lots : passer `--timeout-ms` explicitement.

### Règles pour l'orchestrateur

- **Dépendance de contenu** : à partir de la vague 2, chaque worktree enfant est créé avec `--base-branch <ta branche>`, **après** la fusion (`integrate.py`) de toute la vague précédente. Un worker parti de `master` ne verrait pas le squelette.
- **Une vague ne démarre qu'après l'intégration de la précédente et une validation globale verte** (section D).
- **Pas de build Blazor en parallèle** : L1 est le seul lot qui compile `SportTracker.App`. Des builds WASM concurrents entre worktrees provoquent le verrou `ConvertDllsToWebCil` (rencontré en V5).
- **Zones de fichiers exclusives** (évite les conflits d'`integrate.py`) :
  - L2 possède `src/app/` (routeur, providers, thème) ; L3 possède `src/api/` et `src/ui/` ;
  - en vagues 3 et 4, chaque lot ne modifie que `src/features/<son-dossier>/` ;
  - L5a possède `src/domain/`. L5b est le seul à modifier `src/features/live/drafts/index.ts`.
  - Un lot qui a besoin d'un composant partagé nouveau le crée dans son dossier ; L8b mutualise.
- **Escalades** : toutes les décisions de produit et d'architecture sont tranchées (section C et vault). Une question d'un worker qui remet en cause une décision de ce plan est **remontée à Damien**, pas tranchée via `ask`.
- **Doc et vault** : mis à jour **uniquement par l'orchestrateur**, après chaque vague : checklist 4g dans `CLAUDE.md` **et** `AGENTS.md`, journal + note Étape 4g du vault, `qmd update && qmd embed`. Les workers n'y touchent jamais.
- **L10 n'est jamais dispatché.**

---

## C. Règles communes (à respecter par chaque worker)

- **Avant de commencer** : lire `CLAUDE.md` (section *Étape 4g*), ce plan (sections C, D et ton lot), et interroger le vault via QMD (collection `obsidian`) si disponible : décision *Réécriture du frontend en Ionic React*, note *Étape 4g — Migration frontend Ionic React*.
- **Décisions tranchées, à ne pas rediscuter** : Ionic + React + TS ; TanStack Query ; navigation v1 ci-dessous ; charte V5 telle quelle ; `SportTracker.App` gelé.
- **`SportTracker.App` (Blazor) est gelé.** Aucune modification, sauf au lot L1. Il sert de **référence fonctionnelle** : pour chaque écran, lire la page `.razor` et son `.razor.css` avant de porter.
- **Référence visuelle** : charte V5 (`design.pen`, `design-exports/`), tokens dans `SportTracker.App/wwwroot/css/app.css` et `v4.css`.
- **Exigences non négociables** :
  - données via **TanStack Query** : afficher le cache, puis rafraîchir en arrière-plan. Jamais de `fetch` dans un `useEffect` suivi d'un spinner pleine page. Squelettes uniquement au tout premier chargement ;
  - tout défilement dans **`IonContent`**, jamais le `body` ;
  - `setupIonicReact({ mode: 'ios' })` ;
  - composants Ionic pour les **comportements de plateforme** (navigation, `IonModal` en feuille, action sheets, tirer pour rafraîchir, interrupteurs, sélecteurs, `IonList` avec glisser pour supprimer) ; composants V5 maison pour l'**identité visuelle** (cartes, gros chiffres, lignes de série, minuteur).
- **Navigation v1** :
  - 3 onglets : Today · Programmes · Historique/Progrès ; Profil via l'avatar de l'en-tête ;
  - détails empilés avec geste retour ;
  - feuilles (`IonModal`) : catalogue, création d'exercice, pavé de saisie, minuteur ;
  - séance live plein écran, hors onglets, **sans geste retour**, sortie par « Terminer ».
- **Rester dans sa zone de fichiers** (section B).
- **Rapport de fin** : fichiers touchés, commandes de validation lancées et leur résultat, écarts par rapport au brief, points *à vérifier par Damien* (ressenti Safari, installation sur l'écran d'accueil). Ces points ne bloquent pas la validation du lot.

---

## D. Validation

Chaque worker lance, pour ce qu'il a touché :
- backend : `dotnet build` + `dotnet test` ;
- front (dans `SportTracker.Web/`) : `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, et `npx playwright test` à partir de L2.

L'orchestrateur relance **l'ensemble** après chaque vague intégrée.

---

## E. Lots

### L0 — Prérequis backend

- `SportTracker.Api/Program.cs` : `builder.Services.AddOpenApi();` puis `if (app.Environment.IsDevelopment()) app.MapOpenApi();`. Le package `Microsoft.AspNetCore.OpenApi` est déjà référencé.
- `SportTracker.Api/appsettings.json` → `AllowedOrigins` : ajouter `http://localhost:5173` et `http://localhost:4173` (aperçu Vite).
- `SportTracker.Api/appsettings.Production.json` → `AllowedOrigins` : ajouter `https://beta.fmon-vps-n8n.fr`.
- Ne pas toucher à Data Protection : déjà persisté (`Program.cs:41-44`, volume `dp-keys`).

**Acceptation** : `GET http://localhost:5294/openapi/v1.json` répond en dev ; `dotnet test` vert.

### L1 — Figer la logique 1RM/PR par des tests (C#)

Logique actuelle :
- **1RM (Epley)** : `ExerciseLive.razor:305`, `OneRm = poids > 0 && reps > 0 ? Math.Round(poids * (1 + reps / 30.0), 1) : 0`. Même formule, **sans arrondi**, dans `ExerciseHistory.razor:147` (`MaxOneRm`).
- **Détection de PR** : `ExerciseLive.razor:623-633`.
  - `previousBest` = maximum du 1RM **non arrondi** sur toutes les séries de l'historique et du jour, avec poids > 0 et reps > 0. Les échauffements sont inclus, aucun filtre sur `SetType`.
  - PR si `achieved > previousBest + 0.05`, où `achieved` est le 1RM **arrondi** de la série saisie.
  - « Premier 1RM estimé » si `previousBest == 0`.
  - **Figer ce comportement tel quel**, bizarreries comprises. Toute correction se fera après la bascule.

À faire :
- Extraire ces règles dans une classe pure `SportTracker.Core/Services/StrengthMath.cs` (`EstimateOneRm(weight, reps, round)`, `DetectPersonalRecord(...)`).
- Faire appeler cette classe par les deux pages : **seule** modification tolérée dans `SportTracker.App`, sans changement de comportement.
- Écrire les cas dans **`Docs/test-cases/strength-math.json`** (entrées → sortie attendue). Cas à couvrir :
  - poids ou reps à 0 ;
  - arrondi à 0,1 ;
  - premier 1RM ;
  - égalité exacte ;
  - écart de +0,04 / +0,05 / +0,06 ;
  - échauffement plus lourd que la série de travail ;
  - historique vide.
- Tests xUnit dans `SportTracker.Tests` qui **lisent ce JSON**.

**Acceptation** : `dotnet test` vert ; `dotnet build SportTracker.App` OK.

### L2 — Squelette `SportTracker.Web/`

- Vite + React + TS, `@ionic/react`, `@ionic/react-router`, `@tanstack/react-query`, `vite-plugin-pwa`, `vitest`, `openapi-typescript`, ESLint, `@playwright/test`.
- Structure :
  - `src/app/` : routeur, providers, thème ;
  - `src/api/` : vide, rempli par L3 ;
  - `src/domain/` : vide, rempli par L5a ;
  - `src/ui/` : vide, rempli par L3 ;
  - `src/features/{today,live,programs,history,profile}/` avec une page vide chacune.
- **Toutes les routes des lots 4 à 8 déclarées maintenant** dans `src/app/routes.tsx`. Les lots suivants ne touchent plus au routeur.
- Navigation v1 (section C) avec `IonTabs` ; route de séance live hors des onglets.
- Thème V5 :
  - variables CSS Ionic et tokens (cyan `#78E8E4`, néon `#D4F53C`, dark `#172713`, Barlow / Barlow Condensed) ;
  - `overscroll-behavior: none` sur `html`/`body` ;
  - `-webkit-tap-highlight-color: transparent`.
- PWA :
  - manifest repris de `SportTracker.App/wwwroot/manifest.webmanifest` ;
  - `registerType: 'prompt'`, jamais d'`autoUpdate` ;
  - **nom du service worker : `service-worker.js`**, indispensable pour la bascule.
- Script `npm run gen:api` : génère `src/api/schema.d.ts` depuis `http://localhost:5294/openapi/v1.json` (fourni par L0). Fichier versionné, à générer si l'API tourne, sinon laisser le script prêt.
- `VITE_API_BASE_URL` : dev `http://localhost:5294`, prod `https://api.fmon-vps-n8n.fr`.
- Playwright : projet **WebKit**, viewport 390×844, test de fumée (les 3 onglets s'affichent).
- `.gitignore` : `SportTracker.Web/node_modules/`, `SportTracker.Web/dist/`, `SportTracker.Web/dev-dist/`, `SportTracker.Web/test-results/`, `SportTracker.Web/playwright-report/`.

**Acceptation** : validation D verte. *À vérifier par Damien* : pas de rebond de tout l'écran sur Safari iOS.

### L3 — Auth, client HTTP, kit V5

Références : `SportTracker.App/Auth/` (`AuthService.cs`, `TokenStore.cs`, `AuthHeaderHandler.cs`, `CustomAuthenticationStateProvider.cs`), `Pages/Login.razor`, `Pages/Register.razor`, `Shared/`.

- Endpoints `MapIdentityApi` :
  - `POST /login` : body `email`/`password`, réponse avec `accessToken` ;
  - `POST /register` : 200 sans corps, puis login automatique ;
  - `GET /manage/info`.
- Token dans `localStorage` sous la **même clé `st-auth-token`**, propriétaire des brouillons sous `st-draft-owner`. Mêmes noms que Blazor, pour la bascule.
- Client `fetch` typé dans `src/api/`, qui ajoute `Authorization: Bearer`. Un `401` efface le token et renvoie vers la connexion.
- Routes protégées ; la déconnexion vide le cache TanStack Query.
- **Kit V5** dans `src/ui/`, à partir de `Shared/` (`V4Button`, `V4Card`, `V4Header`, `V4State`, `V4Loading`) : bouton, carte, en-tête avec avatar, état vide/erreur, squelette.

**Acceptation** : validation D ; test Playwright de connexion avec l'API mockée (`page.route`).

### L5a — Domaine live (TypeScript pur, sans UI)

Zone : `src/domain/` + `src/features/live/drafts/index.ts` (création).
- `strengthMath.ts` : portage exact de L1. Tests Vitest qui lisent **`Docs/test-cases/strength-math.json`**.
- `restTimer.ts` : minuteur basé sur **l'heure de fin** (`endsAt`), avec pause, reprise, relance et état terminé. Jamais un compteur. Tests avec de fausses horloges, dont une suspension de 90 s.
- `liveDraft.ts` : modèle de brouillon calqué sur `LiveDraftService.cs` / `LiveExerciseDraft` (`ClientDraftId`, `PendingSync`, `SyncConflict`, séries avec `SetType`, `RPE`, notes).
- Interface `DraftStore` (get / put / list / remove, périmètre par propriétaire) et une implémentation **en mémoire**.
- `src/features/live/drafts/index.ts` exporte `draftStore = createMemoryDraftStore()`. L5b remplacera **cette seule ligne**.
- File de synchronisation pure : une seule synchro à la fois, 3 tentatives, gestion du conflit. Testée avec une API factice.

**Acceptation** : `npm test` vert, 100 % des cas du JSON passent.

### L4 — Today

Références : `Pages/Today.razor` (+ `.css`), `Services/WeeklyGoalService.cs` et ses tests `SportTracker.Tests/Services/WeeklyGoalServiceTests.cs` (porter la logique dans `src/features/today/` avec les mêmes cas en Vitest).

**Acceptation** : second affichage instantané depuis le cache, tirer pour rafraîchir, test Playwright.

### L5b — Brouillons IndexedDB + synchronisation

Zone : `src/features/live/drafts/`.

Références : `Services/LiveDraftService.cs`, `wwwroot/js/live-drafts.js`, `Layout/MainLayout.razor`.

API :
- `PUT api/workoutsessions/live/{draftId}/exercises/{exerciseId}` (idempotent) ;
- `GET api/workoutsessions/live/{draftId}`.

À faire :
- Implémentation IndexedDB de `DraftStore` : périmètre par propriétaire (e-mail en minuscules via `/manage/info`, repli sur le token hors ligne puis migration, comme `OwnerAsync`).
- Base IndexedDB : **nouveau nom `sporttracker-live-v2`**. Les brouillons Blazor sont synchronisés avant la bascule, sans reprise automatique.
- Branchement de la file de synchro de L5a sur l'API réelle. Déclencheurs : lancement, `online`, `visibilitychange`.
- Remplacer la ligne de `index.ts` par l'implémentation IndexedDB.

**Acceptation** : tests Vitest avec `fake-indexeddb` ; test Playwright hors ligne (`context.setOffline(true)`) : saisie → rechargement → retour du réseau → PUT reçu une fois (API mockée).

### L5c — UI séance live

Zone : `src/features/live/`, sauf `drafts/`.

Références : `Pages/LiveWorkoutSession.razor`, `Pages/ExerciseLive.razor` (878 lignes), `Shared/ExerciseLibrary.razor`.

- Utiliser **uniquement** `draftStore` (import depuis `drafts/index.ts`) et le domaine de L5a, sans accès direct à IndexedDB.
- Écrans :
  - séance live plein écran ;
  - ExerciseLive ;
  - feuille de saisie (`IonModal`) : types de série, RPE, notes ;
  - feuille du minuteur (`restTimer`) ;
  - supersets ;
  - suppression de série (`DELETE api/exercises/{exerciseId}/sets/{setId}`) ;
  - notification de PR ;
  - démarrage d'une séance à vide ;
  - catalogue d'exercices en feuille, avec filtres muscle + équipement ;
  - résolution de conflit, avec les mêmes messages que `ConflictMessage`.
- **Pas de bannière de mise à jour PWA pendant une séance live.**

**Acceptation** : parcours Playwright complet avec l'API mockée : démarrer, saisir 3 séries, PR affiché, minuteur, terminer.

### L6 — Programmes

Références : `Programs.razor`, `ProgramDetail.razor`, `ProgramSessionDetail.razor`, `NewProgramSession.razor`, `NewWorkoutSession.razor`. API : `api/programs`. Pages empilées avec geste retour.

### L7 — Historique / Progrès

Références :
- `History.razor`, `ExerciseHistory.razor`, `Progress.razor`, `WorkoutSessionDetail.razor` ;
- cardio : `CardioSessions`, `CardioSessionDetail`, `NewCardioSession`.

Graphiques volume / meilleur 1RM / reps (1RM **via `src/domain/strengthMath.ts`**, pas de recopie), répartition musculaire, séries par semaine.

### L8 — Profil

Références : `Profile.razor`, `ProfilePreferences.razor`, `Help.razor`. Déconnexion via L3.

### L8b — QA mobile WebKit + mutualisation

Sur le modèle de `Docs/qa-v5-mobile-2026-09-24.md`.
- Parcours Playwright WebKit 390×844 : connexion → Today → séance → 3 séries → PR → minuteur → terminer → historique. Plus le même parcours hors ligne.
- Contrôles :
  - zones tactiles ≥ 44 px ;
  - aucun défilement du `body` ;
  - aucun spinner pleine page au second affichage ;
  - safe areas (encoche, barre d'accueil).
- Mutualiser dans `src/ui/` les composants dupliqués entre lots.
- Rapport `Docs/qa-4g-mobile-<date>.md`.

### L9 — Conteneur et compose `beta.`

- `SportTracker.Web/Dockerfile` : build Node, puis serveur de fichiers statiques (nginx). Fallback SPA vers `index.html`. `Cache-Control: no-cache` sur `service-worker.js` et `index.html`.
- `docker-compose.yml` : service `web`, labels Traefik `Host(\`beta.fmon-vps-n8n.fr\`)`, `entrypoints=websecure`, `tls.certresolver=mytlschallenge`, réseau `traefik` (même modèle que le service `app`).
- Le déploiement sur le VPS est fait **par Damien**, pas par le worker.

---

## F. L10 — Bascule sur `app.fmon-vps-n8n.fr` (Damien, hors orchestrateur)

1. Sur l'iPhone, vérifier qu'aucun brouillon Blazor n'est en attente d'envoi.
2. Faire pointer le routeur Traefik `app.fmon-vps-n8n.fr` vers le service `web`. Retirer le service `app`.
3. Vérifier que `https://app.fmon-vps-n8n.fr/service-worker.js` sert bien le service worker Ionic. Sinon, déployer un kill-switch à cette URL : vider les caches, se désinscrire, recharger.
4. Sur l'iPhone : rouvrir l'appli, vérifier que c'est la version Ionic, sans reconnexion.
5. CORS : `https://app.fmon-vps-n8n.fr` est déjà autorisée. Retirer `https://beta.fmon-vps-n8n.fr` si le sous-domaine n'est plus utilisé.
6. Nettoyage (un agent peut préparer la PR) : supprimer `SportTracker.App` du dépôt, de `SportTracker.sln`, du `docker-compose.yml` et du `Dockerfile` de l'API (ligne `COPY SportTracker.App/...csproj`).
7. Mettre à jour `CLAUDE.md`, `AGENTS.md`, le vault ; reconstruire graphify entièrement.

**Prêt à basculer** :
- L0 à L9 intégrés ;
- validation D verte ;
- rapport QA L8b sans bloquant ;
- remplacement du service worker vérifié sur l'iPhone.

(Test mode avion et séances de test volontairement non retenus : voir la décision.)
