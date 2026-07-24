# Design — Page Live d'exercice avec enregistrement de séries

**Date :** 2026-07-24

## Objectif

Ajouter une page "Live" dédiée à un exercice, accessible depuis la séance de carnet, permettant de voir le gif et les instructions, d'enregistrer des séries au fur et à mesure via un pavé numérique, et d'accéder à l'historique complet.

## Périmètre

- Nouveau endpoint API : `POST api/exercises/{exerciseId}/log`
- Nouvelle page Blazor : `ExerciseLive.razor`
- Modification `ProgramSessionDetail.razor` : lien vers `/live` au lieu de `/history`
- `ExerciseHistory.razor` : inchangée

---

## 1. Endpoint API

**Route :** `POST api/exercises/{exerciseId}/log`  
**Contrôleur :** `ExerciseController` (fichier existant)

**Body (JSON) :**
```json
{ "workoutProgramSessionId": 1, "repetitions": 12, "weight": 120.0 }
```

**Logique (find-or-create) :**
1. Cherche une `WorkoutSession` où `WorkoutProgramSessionId == body.workoutProgramSessionId` ET `Date.Date == DateTime.Today`
2. Si absente → crée la `WorkoutSession` :
   - `Name` = nom de la `WorkoutProgramSession` + " — " + date (ex : "Push A — 24/07/2026")
   - `Date` = `DateTime.Today`
   - `WorkoutProgramSessionId` = body.workoutProgramSessionId
   - `Duration` = `TimeSpan.Zero`
3. Cherche un `WorkoutExercise` avec `ExerciseId == exerciseId` dans la session
4. Si absent → crée le `WorkoutExercise` (`ExerciseId`, `WorkoutSessionId`)
5. Ajoute un `ExerciseSet` : `Repetitions`, `Weight`
6. `SaveChangesAsync()`
7. Retourne `200 OK` avec `{ order, repetitions, weight }` (`order` = index 1-based dans la liste des sets de cet exercice aujourd'hui)

**Dépendances :** accès au `SportTrackerDbContext` directement (comme `GetHistoryAsync`).

**Erreurs :**
- `workoutProgramSessionId` inexistant → `404 Not Found`
- `exerciseId` inexistant → `404 Not Found`

---

## 2. Nouvelle page `ExerciseLive.razor`

**Route :** `/programs/{ProgramId:int}/sessions/{SessionId:int}/exercises/{ExerciseId:int}/live`

### Chargement initial (`OnInitializedAsync`)

En parallèle (`Task.WhenAll`) :
- `GET api/programs/{ProgramId}` → résoudre `WorkoutProgramSession` (pour nom, `RestSeconds`, targets, exercice avec gif + instructions)
- `GET api/exercises/{ExerciseId}/history` → récupérer les sets d'aujourd'hui (filtrés sur `Date.Date == today` côté client)

### Structure de la page

```
[← Retour séance]                    [Historique →]

[GIF de l'exercice — pleine largeur]

Nom de l'exercice
Schema : 3x10-12 et 2 min de pause

Instructions :
(texte InstructionsFr si disponible)

── AUJOURD'HUI ──────────────────────
  Série 1    12 reps × 120 kg
  Série 2    11 reps × 120 kg

[+ Série]  ← bouton FAB en bas à droite

[Timer de repos — visible après chaque validation]
```

### Bottom sheet (pavé numérique)

Ouvert par le FAB `+`. Ferme avec un bouton ✕ ou en appuyant en dehors.

Structure :
```
Nombre de répétitions :     12
[1][2][3]
[4][5][6]
[7][8][9]
[0]   [Effacer]

Charge :                   120
[1][2][3]
[4][5][6]
[7][8][9]
[0][PDC][Effacer]

[Valider la série]
```

- **PDC** = Poids Du Corps (insère `0`)
- Pré-rempli avec la dernière série d'aujourd'hui (ou vide si première)
- "Valider la série" → POST `/log` → ajoute la série dans "Aujourd'hui" → ferme le sheet → démarre le timer

### Timer de repos

- Même logique que dans `ExerciseHistory.razor` (copier le code `ToggleTimer` / `OnTimerTick`)
- Démarre automatiquement après chaque validation
- S'affiche en bas de page (sticky ou inline)
- `IDisposable` pour cleanup du `System.Timers.Timer`

### État interne

```csharp
string exerciseName
string? exerciseGifUrl
string? exerciseInstructions
string? schema
int restSeconds
int workoutProgramSessionId

List<TodaySet> todaySets   // séries d'aujourd'hui
bool showSheet             // bottom sheet visible
string repsInput           // saisie pavé reps
string weightInput         // saisie pavé charge
bool isSaving

// Timer (copié de ExerciseHistory)
int timerRemaining
bool timerRunning
System.Timers.Timer? timer
```

```csharp
class TodaySet { int Order; int Repetitions; double Weight; }
```

---

## 3. Modification `ProgramSessionDetail.razor`

Changer le `href` des cartes exercice :

```
Avant : /programs/@ProgramId/sessions/@SessionId/exercises/@ex.Id/history
Après : /programs/@ProgramId/sessions/@SessionId/exercises/@ex.Id/live
```

---

## Navigation finale

```
ProgramDetail → ProgramSessionDetail → ExerciseLive ──→ ExerciseHistory
                                             ↑ (retour ←)
```
