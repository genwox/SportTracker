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
- **Bloc 2 — Endpoints & sécurisation ✅** : `MapIdentityApi`, token ~30 j, `[Authorize]`, filtrage `UserId` → `404`, CORS production et trousseau persistant
- **Bloc 3 — Front Blazor ✅** : `localStorage`, `AuthenticationStateProvider`, `DelegatingHandler`, routes protégées

### Étape 4f — Expérience V5 ✅
- Bibliothèque d'exercices, historique et graphiques de progression.
- Journalisation live avec types de séries, RPE, notes, supersets et reprise hors ligne.
- Synchronisation des brouillons avec détection et résolution des conflits.

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

### Étape 6 — Intégration LLM ⏳ À faire
- Reportée après la bascule Ionic (étape 4g) ; seule la conception de l'endpoint backend peut être avancée. Synchro catalogue Hevy (`SportTracker.Tools`) en pause tant que la clé API Pro manque.

## Diagrammes
- `Docs/Model/domain-model.puml` — modèles de domaine (Core)
- `Docs/data-layer.puml` — couche Data (repositories + DbContext)
- `Docs/Flux_API.puml` — flux d'un appel HTTP (séquence)
