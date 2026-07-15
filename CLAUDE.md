# SportTracker — Contexte projet

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

### Étape 5 — Docker + déploiement VPS ⏳ À faire
### Étape 6 — Intégration LLM ⏳ À faire

## Diagrammes
- `Docs/Model/domain-model.puml` — modèles de domaine (Core)
- `Docs/data-layer.puml` — couche Data (repositories + DbContext)
- `Docs/Flux_API.puml` — flux d'un appel HTTP (séquence)
