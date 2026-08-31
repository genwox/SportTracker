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
- **Frontend** : Blazor WASM (PWA)
- **Base de données** : SQLite via EF Core
- **Hébergement** : VPS Hostinger (Linux + Docker)

## Architecture
Clean Architecture — 4 projets séparés :

```
SportTracker/
├── SportTracker.Core/   # Modèles + interfaces (aucune dépendance framework)
├── SportTracker.Data/   # EF Core + Repository pattern
├── SportTracker.Api/    # ASP.NET Core — endpoints REST
└── SportTracker.App/    # Blazor WASM — UI PWA
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

### Étape 4d — Authentification & profils ⏳ En cours
- Design arbitré (voir vault : décision *Authentification & multi-utilisateurs* + note *Étape 4d*)
- **Bloc 1 — Backend Identity + modèle + migration ✅**
  - [x] Package `Microsoft.AspNetCore.Identity.EntityFrameworkCore` dans `SportTracker.Data`
  - [x] `ApplicationUser : IdentityUser` (`Data/Users/`)
  - [x] `SportTrackerDbContext : IdentityDbContext<ApplicationUser>` (`base.OnModelCreating` en 1ʳᵉ ligne)
  - [x] `string UserId` sur `WorkoutSession`, `CardioSession`, `WorkoutProgram` (Core pur)
  - [x] Migration `AddIdentityAndUserScoping` appliquée (7 tables `AspNet*` + `UserId`)
- **Bloc 2 — Endpoints & sécurisation** ⏳ À faire : `MapIdentityApi`, token ~30 j, `[Authorize]`, filtrage `UserId` → `404`, CORS resserré
- **Bloc 3 — Front Blazor** ⏳ À faire : `localStorage`, `AuthenticationStateProvider`, `DelegatingHandler`, routes protégées

### Étape 5 — Docker + déploiement VPS ✅
- [x] Déployé sur VPS Hostinger via Docker + Traefik (HTTPS Let's Encrypt)
- [x] App : `https://app.fmon-vps-n8n.fr` — API : `https://api.fmon-vps-n8n.fr`
- ⚠️ Point ouvert pour l'auth : persister le trousseau Data Protection dans un volume

### Étape 6 — Intégration LLM ⏳ À faire

## Diagrammes
- `Docs/Model/domain-model.puml` — modèles de domaine (Core)
- `Docs/data-layer.puml` — couche Data (repositories + DbContext)
- `Docs/Flux_API.puml` — flux d'un appel HTTP (séquence)
