# Edit Program Session — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un mode édition inline à `ProgramSessionDetail.razor` permettant de renommer la séance, modifier les targets des exercices, ajouter et supprimer des exercices.

**Architecture:** Un booléen `isEditing` commute l'affichage entre mode lecture (existant) et mode édition (nouveau). L'état édition est une copie locale des données ; la sauvegarde fait un GET du programme complet, remplace la session, puis PUT.

**Tech Stack:** Blazor WASM, HttpClient, `api/programs/{id}` (GET + PUT)

## Global Constraints

- Ne pas casser le mode lecture existant
- Réutiliser les classes CSS existantes : `field-input`, `field-label`, `field-group`, `field-group--sm`, `target-fields`, `exercise-block`, `exercise-block__header`, `ex-search`, `ex-dropdown`, `ex-option`, `remove-btn`, `form-actions`, `submit-btn`, `cancel-btn`, `error-card`, `section-label`
- Pattern recherche exercice identique à `NewProgramSession.razor` (`onfocusin/onfocusout` + `onmousedown:preventDefault`)

---

### Task 1 : Chargement parallèle + état édition

**Files:**
- Modify: `SportTracker.App/Pages/ProgramSessionDetail.razor` — bloc `@code` uniquement

**Interfaces:**
- Produit : `isEditing`, `editName`, `editExercises`, `availableExercises`, `searchText`, `showDropdown`, `isSaving`, `errorMessage`, méthodes `EnterEditMode()`, `CancelEdit()`, `RemoveExercise(int)`, `SelectExercise(Exercise)`, `SaveAsync()`

- [ ] **Remplacer le bloc `@code` complet** par le code suivant dans `ProgramSessionDetail.razor` (conserver `FormatSchema` tel quel) :

```csharp
@code {
    [Parameter] public int ProgramId { get; set; }
    [Parameter] public int SessionId { get; set; }

    private WorkoutProgramSession? session;
    private bool isEditing;
    private string editName = string.Empty;
    private List<ExerciseEditForm> editExercises = new();
    private List<Exercise> availableExercises = new();
    private string searchText = string.Empty;
    private bool showDropdown;
    private bool isSaving;
    private string? errorMessage;

    protected override async Task OnInitializedAsync()
    {
        var programTask = Http.GetFromJsonAsync<WorkoutProgram>($"api/programs/{ProgramId}");
        var exercisesTask = Http.GetFromJsonAsync<List<Exercise>>("api/exercises");
        await Task.WhenAll(programTask, exercisesTask);

        var program = programTask.Result;
        session = program?.Sessions.FirstOrDefault(s => s.Id == SessionId);
        availableExercises = exercisesTask.Result ?? new();
    }

    private void EnterEditMode()
    {
        editName = session!.Name;
        editExercises = session.Exercises.OrderBy(e => e.Order).Select(pe => new ExerciseEditForm
        {
            ExerciseId = pe.ExerciseId,
            ExerciseName = pe.Exercise?.Name ?? string.Empty,
            TargetSets = pe.TargetSets,
            TargetRepsMin = pe.TargetRepsMin,
            TargetRepsMax = pe.TargetRepsMax,
            RestSeconds = pe.RestSeconds
        }).ToList();
        searchText = string.Empty;
        showDropdown = false;
        isEditing = true;
    }

    private void CancelEdit()
    {
        isEditing = false;
        errorMessage = null;
    }

    private void RemoveExercise(int index) => editExercises.RemoveAt(index);

    private void SelectExercise(Exercise ex)
    {
        editExercises.Add(new ExerciseEditForm
        {
            ExerciseId = ex.Id,
            ExerciseName = ex.Name,
            TargetSets = 3,
            TargetRepsMin = 10,
            TargetRepsMax = 12,
            RestSeconds = 120
        });
        searchText = string.Empty;
        showDropdown = false;
    }

    private async Task SaveAsync()
    {
        if (!editExercises.Any())
        {
            errorMessage = "La séance doit contenir au moins un exercice.";
            return;
        }

        isSaving = true;
        errorMessage = null;

        var program = await Http.GetFromJsonAsync<WorkoutProgram>($"api/programs/{ProgramId}");
        if (program == null)
        {
            errorMessage = "Programme introuvable.";
            isSaving = false;
            return;
        }

        var target = program.Sessions.FirstOrDefault(s => s.Id == SessionId);
        if (target == null)
        {
            errorMessage = "Séance introuvable.";
            isSaving = false;
            return;
        }

        target.Name = editName;
        target.Exercises = editExercises.Select((ef, i) => new WorkoutProgramExercise
        {
            ExerciseId = ef.ExerciseId,
            Order = i,
            TargetSets = ef.TargetSets,
            TargetRepsMin = ef.TargetRepsMin,
            TargetRepsMax = ef.TargetRepsMax,
            RestSeconds = ef.RestSeconds
        }).ToList();

        var response = await Http.PutAsJsonAsync($"api/programs/{ProgramId}", program);
        if (response.IsSuccessStatusCode)
        {
            var updated = await Http.GetFromJsonAsync<WorkoutProgram>($"api/programs/{ProgramId}");
            session = updated?.Sessions.FirstOrDefault(s => s.Id == SessionId);
            isEditing = false;
        }
        else
        {
            errorMessage = $"Erreur lors de la sauvegarde ({(int)response.StatusCode}).";
        }

        isSaving = false;
    }

    private string FormatSchema(WorkoutProgramExercise pe)
    {
        var reps = pe.TargetRepsMin == pe.TargetRepsMax
            ? $"{pe.TargetRepsMin}"
            : $"{pe.TargetRepsMin}-{pe.TargetRepsMax}";

        var rest = pe.RestSeconds >= 60
            ? $"{pe.RestSeconds / 60} min{(pe.RestSeconds % 60 > 0 ? $" {pe.RestSeconds % 60:D2}" : "")}"
            : $"{pe.RestSeconds}s";

        return $"{pe.TargetSets}x{reps} et {rest} de pause";
    }

    private class ExerciseEditForm
    {
        public int ExerciseId { get; set; }
        public string ExerciseName { get; set; } = string.Empty;
        public int TargetSets { get; set; }
        public int TargetRepsMin { get; set; }
        public int TargetRepsMax { get; set; }
        public int RestSeconds { get; set; }
    }
}
```

- [ ] **Vérifier que la page compile** (le markup existant référence `session` qui est toujours déclaré — aucune régression attendue)

- [ ] **Commit**

```bash
git add SportTracker.App/Pages/ProgramSessionDetail.razor
git commit -m "feat: add edit mode state and logic to ProgramSessionDetail"
```

---

### Task 2 : Markup mode édition + bouton ✏️

**Files:**
- Modify: `SportTracker.App/Pages/ProgramSessionDetail.razor` — partie HTML

**Interfaces:**
- Consomme : tout ce que produit Task 1

- [ ] **Remplacer le bloc HTML complet** (de `<div class="workouts-page">` jusqu'à `</div>` final, avant `@code`) par :

```razor
<div class="workouts-page">

    <div class="form-header">
        <a href="/programs/@ProgramId" class="back-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"/>
            </svg>
        </a>
        @if (!isEditing && session != null)
        {
            <button type="button" class="edit-btn" @onclick="EnterEditMode">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </button>
        }
    </div>

    @if (session == null)
    {
        <div class="st-skel-block">
            <div class="st-skeleton st-skel-med"></div>
            <div class="st-skeleton st-skel-tall"></div>
            <div class="st-skeleton st-skel-tall"></div>
        </div>
    }
    else if (isEditing)
    {
        <div class="field-group" style="margin-bottom: 1rem;">
            <label class="field-label">Nom de la séance</label>
            <input type="text" class="field-input" @bind="editName" @bind:event="oninput" placeholder="Nom de la séance" />
        </div>

        <div class="section-label">EXERCICES</div>

        @for (int i = 0; i < editExercises.Count; i++)
        {
            var idx = i;
            var ef = editExercises[idx];
            <div class="exercise-block">
                <div class="exercise-block__header">
                    <span style="font-weight: 600; font-size: 0.95rem;">@ef.ExerciseName</span>
                    <button type="button" class="remove-btn" @onclick="() => RemoveExercise(idx)">✕</button>
                </div>
                <div class="target-fields">
                    <div class="field-group field-group--sm">
                        <label class="field-label">Séries</label>
                        <input type="number" class="field-input" @bind="ef.TargetSets" min="1" />
                    </div>
                    <div class="field-group field-group--sm">
                        <label class="field-label">Reps min</label>
                        <input type="number" class="field-input" @bind="ef.TargetRepsMin" min="1" />
                    </div>
                    <div class="field-group field-group--sm">
                        <label class="field-label">Reps max</label>
                        <input type="number" class="field-input" @bind="ef.TargetRepsMax" min="1" />
                    </div>
                    <div class="field-group field-group--sm">
                        <label class="field-label">Repos (s)</label>
                        <input type="number" class="field-input" @bind="ef.RestSeconds" min="0" />
                    </div>
                </div>
            </div>
        }

        @{
            var filtered = string.IsNullOrWhiteSpace(searchText)
                ? Enumerable.Empty<Exercise>()
                : availableExercises
                    .Where(e => e.Name.Contains(searchText, StringComparison.OrdinalIgnoreCase))
                    .Take(8);
        }
        <div class="ex-search" style="margin-top: 0.5rem;">
            <input type="text" class="field-input"
                   placeholder="Ajouter un exercice..."
                   value="@searchText"
                   @oninput="e => searchText = e.Value?.ToString() ?? string.Empty"
                   @onfocusin="() => showDropdown = true"
                   @onfocusout="() => showDropdown = false" />
            @if (showDropdown && filtered.Any())
            {
                <div class="ex-dropdown">
                    @foreach (var ex in filtered)
                    {
                        <button type="button" class="ex-option"
                                @onmousedown:preventDefault
                                @onclick="() => SelectExercise(ex)">
                            @ex.Name
                        </button>
                    }
                </div>
            }
        </div>

        @if (errorMessage is not null)
        {
            <div class="error-card">@errorMessage</div>
        }

        <div class="form-actions">
            <button type="button" class="submit-btn" @onclick="SaveAsync" disabled="@isSaving">
                @(isSaving ? "Enregistrement..." : "Enregistrer")
            </button>
            <button type="button" class="cancel-btn" @onclick="CancelEdit">Annuler</button>
        </div>
    }
    else
    {
        <h1 class="workouts-title">
            <span class="title-eyebrow">Exercices</span>
            @session.Name
        </h1>

        <div class="exercise-list">
            @foreach (var pe in session.Exercises.OrderBy(e => e.Order))
            {
                var ex = pe.Exercise;
                if (ex == null) continue;

                var schema = FormatSchema(pe);

                <a href="/programs/@ProgramId/sessions/@SessionId/exercises/@ex.Id/history" class="exercise-card">
                    @if (!string.IsNullOrEmpty(ex.GifUrl))
                    {
                        <img src="@ex.GifUrl" alt="@ex.Name" class="exercise-card__img" loading="lazy" />
                    }
                    else
                    {
                        <div class="exercise-card__img-placeholder">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M6 5v14"/><path d="M18 5v14"/><path d="M2 9h4"/><path d="M18 9h4"/><path d="M2 15h4"/><path d="M18 15h4"/><line x1="6" y1="9" x2="18" y2="9"/><line x1="6" y1="15" x2="18" y2="15"/>
                            </svg>
                        </div>
                    }
                    <div class="exercise-card__info">
                        <h3 class="exercise-card__name">@ex.Name</h3>
                        <p class="exercise-card__schema">@schema</p>
                    </div>
                </a>
            }
        </div>
    }

</div>
```

- [ ] **Ajouter le style du bouton edit-btn** dans `SportTracker.App/wwwroot/app.css` :

```css
.edit-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-secondary, #888);
    padding: 4px;
    display: flex;
    align-items: center;
}
.edit-btn:hover {
    color: var(--color-text-primary, #fff);
}
```

- [ ] **Vérifier manuellement :**
  1. Lancer l'API (`dotnet run` dans `SportTracker.Api/`)
  2. Lancer le frontend (`dotnet run` dans `SportTracker.App/`)
  3. Ouvrir une séance de carnet → le bouton ✏️ apparaît en haut à droite
  4. Clic ✏️ → mode édition : nom éditable, targets, barre de recherche
  5. Modifier le nom + un target + ajouter/supprimer un exercice
  6. Clic **Enregistrer** → retour mode lecture avec les nouvelles valeurs
  7. Clic ✏️ à nouveau → **Annuler** → valeurs inchangées

- [ ] **Commit**

```bash
git add SportTracker.App/Pages/ProgramSessionDetail.razor SportTracker.App/wwwroot/app.css
git commit -m "feat: add inline edit mode to ProgramSessionDetail"
```
