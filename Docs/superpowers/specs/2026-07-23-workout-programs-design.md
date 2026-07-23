# Workout Programs (Carnets) — Design Spec

## Objectif

Permettre de creer des programmes d'entrainement (carnets) contenant des seances modeles reutilisables, chacune composee d'exercices cibles avec des parametres structures (series, reps, repos). Suivre la progression globale par exercice via un historique date.

## Decisions de conception

- **Scope** : musculation uniquement. Le cardio reste gere separement.
- **Modele + historique separes** : les seances modeles restent intactes ; chaque execution cree un log date (via `WorkoutSession` existant).
- **Schema cible structure** : `TargetSets`, `TargetRepsMin`, `TargetRepsMax`, `RestSeconds` — alimente le timer et l'affichage.
- **Historique global** : la progression d'un exercice regroupe toutes ses executions, tous carnets confondus.
- **Couleur libre** : l'utilisateur choisit la couleur du carnet dans une palette predefinie. La lettre est derivee de l'initiale du nom.
- **Deux flux coexistent** : seances libres (ad-hoc) et seances depuis un carnet.
- **Navigation** : sous-onglets dans la page Workouts existante (Seances / Carnets), pas de nouvel item dans la bottom-nav.

---

## 1. Modele de donnees (SportTracker.Core)

### Nouvelles entites

```csharp
public class WorkoutProgram
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Objective { get; set; }
    public string ColorHex { get; set; } = "#4A90D9";
    public List<WorkoutProgramSession> Sessions { get; set; } = new();
}

public class WorkoutProgramSession
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Order { get; set; }
    public int WorkoutProgramId { get; set; }
    public WorkoutProgram? WorkoutProgram { get; set; }
    public List<WorkoutProgramExercise> Exercises { get; set; } = new();
}

public class WorkoutProgramExercise
{
    public int Id { get; set; }
    public int Order { get; set; }
    public int WorkoutProgramSessionId { get; set; }
    public WorkoutProgramSession? WorkoutProgramSession { get; set; }
    public int ExerciseId { get; set; }
    public Exercise? Exercise { get; set; }
    public int TargetSets { get; set; }
    public int TargetRepsMin { get; set; }
    public int TargetRepsMax { get; set; }
    public int RestSeconds { get; set; }
}
```

### Modification existante

`WorkoutSession` gagne un champ optionnel :

```csharp
public int? WorkoutProgramSessionId { get; set; }
public WorkoutProgramSession? WorkoutProgramSession { get; set; }
```

FK configuree en `OnDelete: SetNull` — supprimer un carnet ne supprime jamais l'historique.

### Historique de progression

Pas de nouvelle table. On interroge la chaine existante `ExerciseSet` -> `WorkoutExercise` -> `WorkoutSession` filtree par `ExerciseId`, groupee par `WorkoutSession.Date`.

---

## 2. Couche Data (SportTracker.Data)

### DbContext

Nouveaux `DbSet` :
- `DbSet<WorkoutProgram> WorkoutPrograms`
- `DbSet<WorkoutProgramSession> WorkoutProgramSessions`
- `DbSet<WorkoutProgramExercise> WorkoutProgramExercises`

### Configuration EF Core (OnModelCreating)

- `WorkoutProgramSession` -> `WorkoutProgram` : cascade delete
- `WorkoutProgramExercise` -> `WorkoutProgramSession` : cascade delete
- `WorkoutSession.WorkoutProgramSessionId` : FK nullable, `OnDelete: SetNull`

### Repository

`WorkoutProgramRepository : IRepository<WorkoutProgram>` avec `GetByIdAsync` qui fait `Include(Sessions).ThenInclude(Exercises).ThenInclude(Exercise)`.

### Migration

Nouvelle migration EF Core pour les 3 tables + la colonne nullable sur `WorkoutSessions`.

---

## 3. API (SportTracker.Api)

### WorkoutProgramController

| Verbe  | Route                            | Description                                        |
|--------|----------------------------------|----------------------------------------------------|
| GET    | `api/programs`                   | Liste tous les carnets (sans detail seances)       |
| GET    | `api/programs/{id}`              | Detail d'un carnet avec seances + exercices cibles |
| POST   | `api/programs`                   | Creer un carnet (payload inclut seances/exercices) |
| PUT    | `api/programs/{id}`              | Modifier un carnet (cascade seances/exercices)     |
| DELETE | `api/programs/{id}`              | Supprimer un carnet                                |

### ExerciseController (extension)

| Verbe | Route                              | Description                                             |
|-------|------------------------------------|---------------------------------------------------------|
| GET   | `api/exercises/{id}/history`       | Historique global : sets groupes par date, totaux reps/volume |

Le payload de l'historique :

```json
[
  {
    "date": "2026-05-20",
    "totalReps": 48,
    "totalVolume": 5760,
    "sets": [
      { "order": 1, "repetitions": 12, "weight": 120 },
      { "order": 2, "repetitions": 12, "weight": 120 }
    ]
  }
]
```

---

## 4. UI (SportTracker.App)

### Navigation

La page Workouts (`/workoutsessions`) recoit 2 onglets en haut :
- **Seances** : liste actuelle (inchangee)
- **Carnets** : redirige vers `/programs`

### Nouvelles pages

| Route                                                       | Ecran                                    |
|-------------------------------------------------------------|------------------------------------------|
| `/programs`                                                 | Liste des carnets (pastille + nom + objectif) |
| `/programs/new`                                             | Formulaire creation carnet               |
| `/programs/{id}`                                            | Detail carnet : liste des seances modeles |
| `/programs/{id}/sessions/new`                               | Ajout d'une seance au carnet             |
| `/programs/{id}/sessions/{sid}`                             | Liste des exercices cibles de la seance  |
| `/programs/{id}/sessions/{sid}/exercises/{eid}/history`     | Historique progression exercice          |

### Ecran liste des carnets (`/programs`)

- Chaque carnet : pastille ronde (couleur choisie + initiale du nom), nom, objectif en sous-titre
- Bouton "+" flottant en bas a droite pour creer un carnet
- Style coherent avec la liste de seances existante (dark theme)

### Ecran detail carnet (`/programs/{id}`)

- Header : nom du carnet, objectif
- Liste des seances modeles (pastille bleue + initiale + nom)
- Bouton "+" pour ajouter une seance

### Ecran exercices de la seance (`/programs/{id}/sessions/{sid}`)

- Header : "Exercices" + sous-titre nom de la seance
- Liste des exercices avec image (GifUrl), nom, schema cible formate ("3x10-12 et 2 min pause")
- Clic sur un exercice -> historique de progression

### Ecran historique progression (`/programs/{id}/sessions/{sid}/exercises/{eid}/history`)

- Header : nom exercice + schema cible
- Blocs dates (ordre decroissant) avec bandeau bleu : date, total reps, total volume (kg)
- Sous chaque bloc : detail des series (Serie 1 : X reps x Y kg)
- Timer de repos en bas (pre-rempli avec `RestSeconds`)
- Bouton "+" pour ajouter une nouvelle entree

---

## 5. Ce qui ne change pas

- `CardioSession` et ses pages restent inchanges
- Le flux de creation de seance libre (`/workoutsessions/new`) reste operationnel
- Les pages Progress, History, Today, Profile ne sont pas modifiees
- Le catalogue `Exercise` existant est reutilise tel quel
