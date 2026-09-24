# Inventaire des fonctionnalités existantes — SportTracker

> Base de comparaison avec Hevy. Inventaire factuel de ce qui existe **réellement** dans le code au 2026-09-22, sur la branche `genwox/pipeline-1-inventaire_sporttracker_code`. Ce n'est pas un audit de qualité : uniquement le périmètre fonctionnel actuel, avec preuves `fichier:ligne`.

## 1. Exercices

- **Modèle** `Exercise` — `Id`, `Name`, `Type` (enum `ExerciseType`), `MuscleGroups` (`List<MuscleGroup>`), `GifUrl`, `InstructionsFr`.
  `SportTracker.Core\Models\Exercise.cs:5-13`
- **Enums**
  - `ExerciseType` : `Strength`, `Cardio` — `SportTracker.Core\Enums\ExerciseType.cs:3-7`
  - `MuscleGroup` : `Chest, Back, Shoulders, Biceps, Triceps, Legs, Glutes, Abs, FullBody` — `SportTracker.Core\Enums\MuscleGroup.cs:3-14`
- **Persistance** : conversion `List<MuscleGroup>` ↔ `string` (CSV) via `ValueConverter`/`ValueComparer` — `SportTracker.Data\SportTrackerDbContext.cs:34-51`
- **Catalogue partagé** : les `Exercise` ne sont **pas** filtrés par `UserId` (pas de `HasQueryFilter` sur `Exercise`, contrairement à `WorkoutSession`/`CardioSession`/`WorkoutProgram`) — `SportTracker.Data\SportTrackerDbContext.cs:71-73`. Confirmé côté API par un commentaire explicite « Catalogue global partagé : consultable sans compte » — `SportTracker.Api\Controllers\ExerciseController.cs:24-25`.
- **Seed** : 1324 exercices importés au démarrage depuis un dataset GitHub (`hasaneyldrm/exercises-dataset`), avec mapping `Body_Part`→`ExerciseType`, mapping heuristique `Target`→`MuscleGroup`, URL de GIF (base raw GitHub) et `InstructionsFr` (clé `fr` du dictionnaire d'instructions) — `SportTracker.Data\Seed\ExerciseSeeder.cs:8-52`. Le seed ne s'exécute que si `Exercises` est vide — ligne 14. Invoqué au démarrage de l'API — `SportTracker.Api\Program.cs:75-80`.
- **API**
  - `GET /api/exercises` — liste complète, `[AllowAnonymous]` — `SportTracker.Api\Controllers\ExerciseController.cs:25-31`
  - `POST /api/exercises` — création — `ExerciseController.cs:33-38`
  - `GET /api/exercises/{id}/history` — historique groupé par date (total reps, volume total, séries ordonnées), calculé en traversant `WorkoutSessions` (donc borné par le filtre global `UserId`) — `ExerciseController.cs:40-77`
  - `POST /api/exercises/{exerciseId}/log` — enregistre une série depuis une séance "live" : retrouve/crée la `WorkoutSession` du jour liée à la `WorkoutProgramSession`, retrouve/crée le `WorkoutExercise`, ajoute l'`ExerciseSet` — `ExerciseController.cs:79-147`
- **UI**
  - `ExerciseLive.razor` — écran "séance live" par exercice : historique dernière fois, saisie poids/reps par steppers + pavé numérique, calcul 1RM (formule d'Epley), validation de série (`POST .../log`), minuteur de repos circulaire, visionneuse GIF + instructions — `SportTracker.App\Pages\ExerciseLive.razor` (ex. GIF/instructions : lignes 34-40, 146-159 ; 1RM ligne 214 ; validation lignes 349-374)
  - `ExerciseHistory.razor` — historique par exercice : record 1RM estimé, graphique en barres de l'évolution du 1RM, liste chronologique des séances avec séries — `SportTracker.App\Pages\ExerciseHistory.razor:1-160`

## 2. Séances de musculation (WorkoutSession)

- **Modèles**
  - `WorkoutSession` (`ISession`, `IUserOwned`) : `Id`, `WorkoutExercises`, `Date`, `Duration`, `Name`, `WorkoutProgramSessionId?`, `UserId` — `SportTracker.Core\Models\WorkoutSession.cs:5-15`
  - `WorkoutExercise` : lien `Exercise` + liste `ExerciseSet` — `SportTracker.Core\Models\WorkoutExercise.cs:3-11`
  - `ExerciseSet` : `Weight` (double), `Repetitions` (int) — `SportTracker.Core\Models\ExerciseSet.cs:3-10`
- **Repository** `WorkoutSessionRepository` — `GetByIdAsync`/`GetAllAsync` avec `Include(WorkoutExercises).ThenInclude(Exercise)` + `ThenInclude(ExerciseSets)` ; Add/Update/Delete simples — `SportTracker.Data\Repository\WorkoutSessionRepository.cs:15-55`
- **API** `WorkoutSessionController` — CRUD complet, `[Authorize]`, routes `api/workoutsessions` : `GET` liste, `GET/{id}`, `POST`, `PUT/{id}` (404 si inexistant, 400 si id mismatch), `DELETE/{id}` — `SportTracker.Api\Controllers\WorkoutSessionController.cs:8-73`
- **UI**
  - `WorkoutSessions.razor` — liste des séances triées par date décroissante, état vide/chargement/erreur, lien création — `SportTracker.App\Pages\WorkoutSessions.razor:1-71`
  - `NewWorkoutSession.razor` — formulaire : nom, date, durée, ajout dynamique d'exercices (recherche dans le catalogue) + séries dynamiques (poids/reps) par exercice, soumission `POST` — `SportTracker.App\Pages\NewWorkoutSession.razor:1-100`
  - `WorkoutSessionDetail.razor` — détail : durée, volume total (Σ poids×reps), nombre d'exercices, liste des exercices avec leurs séries formatées — `SportTracker.App\Pages\WorkoutSessionDetail.razor:1-52`

## 3. Cardio (CardioSession)

- **Modèle** `CardioSession` (`ISession`, `IUserOwned`) : `Name`, `Date`, `Duration`, `Distance`, `ElevationGain`, `Type` (`CardioType`), `UserId` — `SportTracker.Core\Models\CardioSession.cs:7-17`
- **Enum** `CardioType` : `Run, Walk, Swim, Bike` — `SportTracker.Core\Enums\CardioType.cs:3-9`
- **Repository** `CardioSessionRepository` — CRUD simple (`FindAsync`, pas d'`Include` car pas de relations) — `SportTracker.Data\Repository\CardioSessionRepository.cs:7-48`
- **API** `CardioSessionController` — CRUD complet, `[Authorize]`, routes `api/cardiosessions` (mêmes garanties que WorkoutSession) — `SportTracker.Api\Controllers\CardioSessionController.cs:8-72`
- **UI**
  - `CardioSessions.razor` — liste triée par date, icône par type, distance affichée — `SportTracker.App\Pages\CardioSessions.razor:1-29`
  - `NewCardioSession.razor` — formulaire : nom, sélecteur de type (boutons), date, durée, distance, dénivelé, validations côté client (durée ≥1min, distance/dénivelé ≥0) — `SportTracker.App\Pages\NewCardioSession.razor:1-45`
  - `CardioSessionDetail.razor` — détail : distance, durée, allure/km calculée (`Pace`), dénivelé — `SportTracker.App\Pages\CardioSessionDetail.razor:1-38` (calcul allure ligne 36)

## 4. Programmes / Carnets (WorkoutProgram)

- **Modèles**
  - `WorkoutProgram` (`IUserOwned`) : `Name`, `Objective?`, `ColorHex` (défaut `#4A90D9`), `Sessions`, `UserId` — `SportTracker.Core\Models\WorkoutProgram.cs:5-13`
  - `WorkoutProgramSession` : `Name`, `Order`, FK `WorkoutProgramId`, `Exercises` — `SportTracker.Core\Models\WorkoutProgramSession.cs:3-11`
  - `WorkoutProgramExercise` : `Order`, FK `WorkoutProgramSessionId`, FK `ExerciseId`, **schéma cible** `TargetSets`, `TargetRepsMin`, `TargetRepsMax`, `RestSeconds` — `SportTracker.Core\Models\WorkoutProgramExercise.cs:3-15`
- **Relations EF** : cascade `WorkoutProgram→Sessions`, cascade `Session→Exercises`, `WorkoutSession→WorkoutProgramSession` en `SetNull` — `SportTracker.Data\SportTrackerDbContext.cs:53-69`
- **Repository** `WorkoutProgramRepository` — `GetByIdAsync` avec `Include(Sessions.OrderBy(Order)).ThenInclude(Exercises.OrderBy(Order)).ThenInclude(Exercise)` ; `UpdateAsync` fait un remplacement complet des `WorkoutProgramExercise` existants (delete + réinsertion, `ChangeTracker.Clear()`) — `SportTracker.Data\Repository\WorkoutProgramRepository.cs:16-63`
- **API** `WorkoutProgramController` — CRUD complet, `[Authorize]`, routes `api/programs` — `SportTracker.Api\Controllers\WorkoutProgramController.cs:11-60`
- **UI**
  - `Programs.razor` — liste des carnets avec couleur, objectif, compteurs — `SportTracker.App\Pages\Programs.razor:1-47`
  - `NewProgram.razor` — création : nom, objectif, couleur (palette de 8), une ou plusieurs séances nommées — `SportTracker.App\Pages\NewProgram.razor:1-21`
  - `ProgramDetail.razor` — détail carnet : objectif, compteurs séances/exercices, liste des séances — `SportTracker.App\Pages\ProgramDetail.razor:1-38`
  - `NewProgramSession.razor` — ajout d'une séance à un carnet existant : sélecteur d'exercices (recherche), et pour chaque exercice le schéma cible (séries, reps min/max, repos) — `SportTracker.App\Pages\NewProgramSession.razor:1-212` (formulaire cible lignes 40-46, valeurs par défaut lignes 204-211)
  - `ProgramSessionDetail.razor` — détail d'une séance de carnet : mode lecture (liste exercices avec GIF, schéma formaté `FormatSchema`, bouton "Démarrer en live") et mode édition (modifier nom, séries/reps/repos par exercice, ajouter/retirer un exercice via un picker de recherche) — `SportTracker.App\Pages\ProgramSessionDetail.razor:1-273` (`FormatSchema` ligne 258-262 ; démarrage live ligne 105)
  - **Timer de repos pré-rempli depuis `RestSeconds`** : voir `ExerciseLive.razor` (`restSeconds = Math.Max(0, pe.RestSeconds)` ligne 246, dial de minuteur lignes 121-144)

## 5. Journalisation / Historique

- **Page History** (`/history`) — agrège `WorkoutSession` + `CardioSession` en une liste unique, avec filtres "Tous/Muscu/Cardio" et regroupement par période ("Cette semaine" / "Semaine dernière" / "Plus tôt") — `SportTracker.App\Pages\History.razor:1-167` (filtres lignes 9-17 ; regroupement `GetPeriodLabel` lignes 140-148)
- **Historique par exercice** : voir section 1 (`GET /api/exercises/{id}/history`, page `ExerciseHistory.razor`)

## 6. Stats / Progrès (calculs réellement présents dans le code)

- **Today.razor** (`/`, page d'accueil)
  - Séance du jour (workout ou cardio) et suggestion de reprise de la dernière séance — `SportTracker.App\Pages\Today.razor:161-222`
  - Compteurs "cette semaine" (lundi→aujourd'hui, ISO) : nombre de séances, **volume hebdo** = Σ(poids×reps) sur tous les `ExerciseSet` de la semaine (formaté en kg ou tonnes), **temps hebdo** = somme des durées workout+cardio — `Today.razor:197-220` (volume ligne 204-208, temps ligne 210-212)
  - Mini-graphique en barres du nombre de séances par jour de la semaine (L→D) — `Today.razor:214-220`
- **Progress.razor** (`/progress`)
  - Minutes cette semaine + delta vs semaine précédente — `SportTracker.App\Pages\Progress.razor:126-131`
  - **Streak** (série de jours consécutifs avec au moins une séance, en remontant depuis aujourd'hui) — `Progress.razor:135-141`
  - Nombre de séances cette semaine vs objectif hebdomadaire (`WeeklyGoalService`) — `Progress.razor:133, 93`
  - Graphique en barres "séances par jour" sur 7 jours — `Progress.razor:143-149`
- **WeeklyGoalService** — objectif hebdomadaire (nombre de séances, défaut 4), stocké en `localStorage` sous une clé versionnée par l'email réel du compte (récupéré via `GET manage/info`) — `SportTracker.App\Services\WeeklyGoalService.cs:20-125`
- **Profile.razor** (`/profile`) — total séances, streak, minutes totales, séances de la semaine vs objectif, date "membre depuis" (date de la plus ancienne séance) — `SportTracker.App\Pages\Profile.razor:164-182`
- **ExerciseHistory.razor** — 1RM estimé (formule d'Epley : `poids × (1 + reps/30)`), record et évolution par séance — voir section 1
- Pas de calcul de records par exercice (PR) en dehors du 1RM estimé, pas de calendrier, pas de graphique de progression de poids corporel : ces notions n'existent pas dans le code actuel.

## 7. Authentification / Profils — état ACTUEL du code

L'étape 4d est **plus avancée que ce que documente le vault** ("Bloc 2/3 à faire") : le code montre une authentification fonctionnelle de bout en bout (backend + frontend), pas seulement le "Bloc 1".

- **Backend Identity**
  - `ApplicationUser : IdentityUser` — `SportTracker.Data\Users\ApplicationUser.cs:5-7`
  - `SportTrackerDbContext : IdentityDbContext<ApplicationUser>` — `SportTracker.Data\SportTrackerDbContext.cs:12`
  - `ICurrentUserService` (Core, interface) / `CurrentUserService` (Api, lit `ClaimTypes.NameIdentifier` du `HttpContext`) — `SportTracker.Core\Interfaces\ICurrentUserService.cs:3-6`, `SportTracker.Api\Services\CurrentUserService.cs:6-11`
  - `IUserOwned` (Core) implémenté par `WorkoutSession`, `CardioSession`, `WorkoutProgram` — `SportTracker.Core\Interfaces\IUserOwned.cs:3-6`
  - `builder.Services.AddIdentityApiEndpoints<ApplicationUser>()` + `app.MapIdentityApi<ApplicationUser>()` → endpoints `login`, `register`, `manage/info`, etc. actifs — `SportTracker.Api\Program.cs:32-33, 70`
  - Bearer token expiration **30 jours** — `Program.cs:35-36`
  - Data Protection persistée dans `/keys` en production (fix du point ouvert du vault "persister le trousseau") — `Program.cs:42-44`
  - `[Authorize]` sur tous les controllers (`ExerciseController`, `WorkoutSessionController`, `CardioSessionController`, `WorkoutProgramController`), avec `GET /api/exercises` explicitement `[AllowAnonymous]` (catalogue public) — voir refs section 1/2/3/4
  - **Filtrage par utilisateur** : `HasQueryFilter` global EF Core sur `WorkoutSession`, `CardioSession`, `WorkoutProgram` (`UserId == _currentUser.UserId`) — `SportTrackerDbContext.cs:71-73` — une ressource d'un autre utilisateur devient donc invisible (équivalent 404 implicite, pas de filtrage manuel dans les controllers)
  - **Stamping automatique du `UserId`** à la création (`SaveChangesAsync` → `StampUserId()`) — `SportTrackerDbContext.cs:76-90`
  - Migration `AddIdentityAndUserScoping` appliquée — `SportTracker.Data\Migrations\20260831195210_AddIdentityAndUserScoping.cs`
- **Frontend Blazor**
  - `TokenStore` — persistance du bearer token en `localStorage`, cache mémoire — `SportTracker.App\Auth\TokenStore.cs:9-37`
  - `AuthService` — `LoginAsync`/`RegisterAsync` (enchaîne sur login)/`LogoutAsync`, consomme les endpoints Identity — `SportTracker.App\Auth\AuthService.cs:10-92`
  - `CustomAuthenticationStateProvider` — état connecté = présence d'un token (tokens Identity opaques, aucun claim décodé) — `SportTracker.App\Auth\CustomAuthenticationStateProvider.cs:11-31`
  - `AuthHeaderHandler` (`DelegatingHandler`) — injecte `Authorization: Bearer`, sur 401 purge la session et redirige vers `/login?returnUrl=...` — `SportTracker.App\Auth\AuthHeaderHandler.cs:11-35`
  - Câblage DI complet dans `Program.cs` (App) : `TokenStore` singleton, `AuthenticationStateProvider`, `HttpClient` nommé avec handler — `SportTracker.App\Program.cs:15-38`
  - `MainLayout.razor` protège toutes les routes via `<AuthorizeView>` (`Authorized`/`NotAuthorized`→`RedirectToLogin`/`Authorizing`) — `SportTracker.App\Layout\MainLayout.razor:3-21`
  - Pages `Login.razor` (`/login`, `[AllowAnonymous]`, layout `EmptyLayout`) et `Register.razor` (`/register`, idem) — `SportTracker.App\Pages\Login.razor:1-82`, `SportTracker.App\Pages\Register.razor:1-80`
  - Page `Profile.razor` — affiche email (via `manage/info`), date d'inscription, stats, déconnexion — `SportTracker.App\Pages\Profile.razor:111-190`
  - Page `ProfilePreferences.razor` — réglage de l'objectif hebdomadaire — `SportTracker.App\Pages\ProfilePreferences.razor:1-93`
  - CORS : origines whitelistées via config (`AllowedOrigins`), plus `AllowAnyOrigin` générique de dev — `SportTracker.Api\Program.cs:56-60` (⚠️ écart avec la doc CLAUDE.md qui indique encore "AllowAnyOrigin en dev" en toutes circonstances — voir section 8)

## 8. UI / Navigation générale

- **Layouts**
  - `MainLayout.razor` — shell applicatif protégé par auth, lien d'évitement `#main-content`, barre de nav basse — `SportTracker.App\Layout\MainLayout.razor:1-22`
  - `EmptyLayout.razor` — layout minimal pour Login/Register (fichier présent, non détaillé ici)
  - `NavMenu.razor` — barre de navigation basse (Accueil / Séances / Progrès / Historique / Profil), état actif dérivé de l'URL — `SportTracker.App\Layout\NavMenu.razor:1-16`
- **Composants partagés (`Shared/`)**
  - `V4Header`, `V4Card`, `V4Button`, `V4Loading`, `V4State` (état vide/erreur avec retry), `V4ActivityTabs` (onglets Séances/Cardio/Carnets), `RedirectToLogin` — `SportTracker.App\Shared\*.razor`
- **PWA**
  - `manifest.webmanifest` — nom "SportTracker", `display: standalone`, icônes 192/512 — `SportTracker.App\wwwroot\manifest.webmanifest:1-22`
  - `service-worker.published.js` — cache offline des assets statiques (dll/wasm/html/css/…), stratégie cache-first avec fallback réseau, gestion des navigations vers `index.html` — `SportTracker.App\wwwroot\service-worker.published.js:1-61`
- **Pages diverses** : `Help.razor` (aide), `NotFound.razor` (404 routeur) — présentes mais non détaillées (hors périmètre de comparaison fonctionnelle Hevy).

## Écarts vault vs code

1. **Étape 4d (Auth)** : le vault marque "Bloc 2 — Endpoints & sécurisation" et "Bloc 3 — Front Blazor" comme *à faire*. Le code montre les deux **entièrement implémentés** : `MapIdentityApi`, token 30 j, `[Authorize]` partout, filtrage `UserId` via `HasQueryFilter` global, `TokenStore`/`AuthService`/`AuthHeaderHandler`/`CustomAuthenticationStateProvider`, pages Login/Register/Profile fonctionnelles, `MainLayout` protégé. Le CLAUDE.md du projet est donc en retard sur le code réel à ce sujet.
2. **CORS** : le CLAUDE.md dit "CORS policy `Frontend` (`AllowAnyOrigin` en dev)". Le code actuel utilise une liste d'origines whitelistées issue de la config (`AllowedOrigins`), pas un `AllowAnyOrigin` inconditionnel — `SportTracker.Api\Program.cs:56-60`.
3. **Repositories sans controller** (`ExerciseSetRepository`, `WorkoutExerciseRepository`) : confirmé toujours vrai — ces classes existent (`SportTracker.Data\Repository\ExerciseSetRepository.cs`, `WorkoutExerciseRepository.cs`) mais ne sont **ni enregistrées en DI** dans `SportTracker.Api\Program.cs` (seuls `WorkoutSession`, `CardioSession`, `Exercise`, `WorkoutProgram` y figurent — lignes 47-54), **ni exposées** par un controller dédié.
4. Le vault ne mentionne pas explicitement le calcul 1RM (Epley) ni le minuteur de repos circulaire dans `ExerciseLive.razor` — fonctionnalités bien présentes dans le code, à intégrer dans la comparaison avec Hevy.
