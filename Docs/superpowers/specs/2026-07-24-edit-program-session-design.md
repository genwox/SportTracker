# Design — Édition inline d'une séance de carnet

**Date :** 2026-07-24  
**Fichier concerné :** `SportTracker.App/Pages/ProgramSessionDetail.razor`

## Objectif

Permettre de modifier une `WorkoutProgramSession` existante : renommer la séance, ajouter/supprimer des exercices, et ajuster les targets (sets, reps min/max, repos).

## Comportement

### Mode lecture (état actuel)
- Header avec bouton retour + nouveau bouton ✏️ à droite
- Liste des exercices avec schéma formaté (ex. `3x10-12 et 2 min de pause`)
- Clic ✏️ → bascule en mode édition

### Mode édition
- Le titre de la séance devient un `<input>` éditable
- Chaque exercice affiche :
  - Nom de l'exercice (non modifiable) + bouton ✕ pour supprimer l'exercice
  - 4 champs : Séries / Reps min / Reps max / Repos (s)
- En bas de la liste : barre de recherche pour ajouter un nouvel exercice (même pattern que `NewProgramSession.razor` : `onfocusin/onfocusout` + dropdown filtré)
- Boutons **Enregistrer** et **Annuler** en pied de page

### Sauvegarde
1. `GET api/programs/{ProgramId}` — récupère le programme complet
2. Remplace la session correspondante (`Id == SessionId`) dans `program.Sessions`
3. `PUT api/programs/{ProgramId}` avec le programme mis à jour
4. Succès → retour en mode lecture avec les nouvelles données

### Annuler
- Jette la copie locale, retour en mode lecture (données inchangées)

## État interne (code)

```
bool isEditing
string editName                     // copie du nom de la séance
List<ExerciseForm> editExercises    // copie des exercices avec leurs targets
List<Exercise> availableExercises   // chargé au OnInitializedAsync
string searchText / bool showDropdown // pour l'ajout d'exercice
```

`ExerciseForm` contient : `ExerciseId`, `ExerciseName`, `TargetSets`, `TargetRepsMin`, `TargetRepsMax`, `RestSeconds`.

## Chargement initial

`OnInitializedAsync` charge en parallèle :
- `GET api/programs/{ProgramId}` → résout la session
- `GET api/exercises` → liste pour la recherche

## Contraintes

- Pas de validation bloquante côté UI sauf : au moins un exercice requis pour sauvegarder
- En cas d'erreur HTTP sur le PUT : afficher un message d'erreur, rester en mode édition
