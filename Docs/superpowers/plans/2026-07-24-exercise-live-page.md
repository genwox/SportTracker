# Exercise Live Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une page "Live" dédiée à un exercice permettant de voir le gif, les instructions, et d'enregistrer des séries au fur et à mesure via un pavé numérique.

**Architecture:** Nouveau endpoint `POST api/exercises/{exerciseId}/log` fait un find-or-create d'une `WorkoutSession` pour aujourd'hui liée à la `WorkoutProgramSession`, puis ajoute un `ExerciseSet`. La nouvelle page `ExerciseLive.razor` charge le programme et l'historique en parallèle, affiche gif + instructions + séries du jour, et ouvre un bottom sheet numpad pour saisir chaque série.

**Tech Stack:** Blazor WASM .NET 10, ASP.NET Core, EF Core, HttpClient, `System.Timers.Timer`

## Global Constraints

- Réutiliser les classes CSS existantes : `workouts-page`, `form-header`, `back-link`, `section-label`, `history-set-row`, `history-set-row__label`, `history-set-row__value`, `rest-timer`, `rest-timer__label`, `rest-timer__time`, `rest-timer__btn`, `submit-btn`, `fab-btn`, `st-skel-block`, `st-skeleton`, `st-skel-tall`, `st-skel-med`
- Design tokens disponibles : `--st-cyan`, `--st-neon`, `--st-dark`, `--st-card-bg`, `--st-nav-inactive`, `--st-radius-card`, `--st-font-body`
- Pas de tests automatisés côté frontend — vérification manuelle via navigateur
- `ExerciseSet.Weight` est `double`, `ExerciseSet.Repetitions` est `int`
- `WorkoutExercise.WorkoutSessionId` est `int` (FK non-nullable)
- `WorkoutSession.WorkoutExercises` est `List<WorkoutExercise>?` (nullable)

---

### Task 1 : Endpoint API `POST api/exercises/{exerciseId}/log`

**Files:**
- Modify: `SportTracker.Api/Controllers/ExerciseController.cs`

**Interfaces:**
- Consomme : `SportTrackerDbContext` (déjà injecté via `_context`), `IRepository<Exercise>` (déjà injecté via `_exerciseRepository`)
- Produit : `POST api/exercises/{exerciseId}/log` — body `{ workoutProgramSessionId, repetitions, weight }` → `200 OK { order, repetitions, weight }` ou `404`

- [ ] **Ajouter le record `LogSetRequest` et l'action `LogSetAsync`** à la fin de `ExerciseController.cs`, avant la dernière accolade fermante :

```csharp
[HttpPost("{exerciseId}/log")]
public async Task<IActionResult> LogSetAsync(int exerciseId, [FromBody] LogSetRequest request)
{
    var exercise = await _exerciseRepository.GetByIdAsync(exerciseId);
    if (exercise == null) return NotFound();

    var programSession = await _context.WorkoutProgramSessions
        .FirstOrDefaultAsync(s => s.Id == request.WorkoutProgramSessionId);
    if (programSession == null) return NotFound();

    var today = DateTime.Today;
    var workoutSession = await _context.WorkoutSessions
        .Include(ws => ws.WorkoutExercises!)
            .ThenInclude(we => we.ExerciseSets)
        .FirstOrDefaultAsync(ws =>
            ws.WorkoutProgramSessionId == request.WorkoutProgramSessionId &&
            ws.Date.Date == today);

    if (workoutSession == null)
    {
        workoutSession = new WorkoutSession
        {
            Name = $"{programSession.Name} — {today:dd/MM/yyyy}",
            Date = today,
            WorkoutProgramSessionId = request.WorkoutProgramSessionId,
            Duration = TimeSpan.Zero,
            WorkoutExercises = new List<WorkoutExercise>()
        };
        _context.WorkoutSessions.Add(workoutSession);
    }

    workoutSession.WorkoutExercises ??= new List<WorkoutExercise>();

    var workoutExercise = workoutSession.WorkoutExercises
        .FirstOrDefault(we => we.ExerciseId == exerciseId);

    if (workoutExercise == null)
    {
        workoutExercise = new WorkoutExercise
        {
            ExerciseId = exerciseId,
            ExerciseSets = new List<ExerciseSet>()
        };
        workoutSession.WorkoutExercises.Add(workoutExercise);
    }

    workoutExercise.ExerciseSets ??= new List<ExerciseSet>();

    var newSet = new ExerciseSet
    {
        Repetitions = request.Repetitions,
        Weight = request.Weight
    };
    workoutExercise.ExerciseSets.Add(newSet);

    await _context.SaveChangesAsync();

    return Ok(new
    {
        order = workoutExercise.ExerciseSets.Count,
        repetitions = newSet.Repetitions,
        weight = newSet.Weight
    });
}

public record LogSetRequest(int WorkoutProgramSessionId, int Repetitions, double Weight);
```

- [ ] **Vérifier que l'API compile** :

```bash
dotnet build SportTracker.Api/SportTracker.Api.csproj
```
Attendu : `Build succeeded. 0 Error(s)`

- [ ] **Tester l'endpoint manuellement** — lancer l'API (`dotnet run --project SportTracker.Api`) puis envoyer :

```
POST http://localhost:5294/api/exercises/1/log
Content-Type: application/json

{ "workoutProgramSessionId": 1, "repetitions": 12, "weight": 80 }
```
Attendu : `200 OK` avec `{ "order": 1, "repetitions": 12, "weight": 80 }`  
Un second appel identique → `{ "order": 2, ... }`  
Un troisième appel le lendemain (ou avec une date différente) → nouvelle WorkoutSession créée.

- [ ] **Commit** :

```bash
git add SportTracker.Api/Controllers/ExerciseController.cs
git commit -m "feat: add POST exercises/{id}/log endpoint for live set recording"
```

---

### Task 2 : `ExerciseLive.razor` + CSS + changement de navigation

**Files:**
- Create: `SportTracker.App/Pages/ExerciseLive.razor`
- Modify: `SportTracker.App/wwwroot/css/app.css` — ajouter les classes en fin de fichier
- Modify: `SportTracker.App/Pages/ProgramSessionDetail.razor` — changer `/history` en `/live` (1 ligne)

**Interfaces:**
- Consomme : `POST api/exercises/{exerciseId}/log` (Task 1), `GET api/programs/{id}`, `GET api/exercises/{id}/history`
- Produit : page à la route `/programs/{ProgramId}/sessions/{SessionId}/exercises/{ExerciseId}/live`

- [ ] **Créer `SportTracker.App/Pages/ExerciseLive.razor`** avec le contenu complet suivant :

```razor
@page "/programs/{ProgramId:int}/sessions/{SessionId:int}/exercises/{ExerciseId:int}/live"
@using SportTracker.Core.Models
@using System.Timers
@inject HttpClient Http
@implements IDisposable

<div class="workouts-page">

    <div class="form-header">
        <a href="/programs/@ProgramId/sessions/@SessionId" class="back-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"/>
            </svg>
        </a>
        <a href="/programs/@ProgramId/sessions/@SessionId/exercises/@ExerciseId/history" class="history-link">Historique</a>
    </div>

    @if (loading)
    {
        <div class="st-skel-block">
            <div class="st-skeleton st-skel-tall"></div>
            <div class="st-skeleton st-skel-med"></div>
            <div class="st-skeleton st-skel-sm"></div>
        </div>
    }
    else
    {
        @if (!string.IsNullOrEmpty(exerciseGifUrl))
        {
            <img src="@exerciseGifUrl" alt="@exerciseName" class="live-gif" />
        }

        <h1 class="workouts-title">@exerciseName</h1>

        @if (schema is not null)
        {
            <p class="live-schema">@schema</p>
        }

        @if (!string.IsNullOrEmpty(exerciseInstructions))
        {
            <p class="live-instructions">@exerciseInstructions</p>
        }

        @if (todaySets.Any())
        {
            <div class="section-label">AUJOURD'HUI</div>
            @foreach (var set in todaySets)
            {
                <div class="history-set-row">
                    <span class="history-set-row__label">Série @set.Order</span>
                    <span class="history-set-row__value">
                        <strong>@set.Repetitions</strong> reps × <strong>@set.Weight</strong> kg
                    </span>
                </div>
            }
        }

        @if (restSeconds > 0 && (timerRunning || timerRemaining < restSeconds))
        {
            <div class="rest-timer">
                <span class="rest-timer__label">repos</span>
                <span class="rest-timer__time">@FormatTime(timerRemaining)</span>
                <button class="rest-timer__btn" @onclick="ToggleTimer">
                    @if (timerRunning)
                    {
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                        </svg>
                    }
                    else
                    {
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                    }
                </button>
            </div>
        }

        <button type="button" class="fab-btn" @onclick="OpenSheet">+</button>
    }

</div>

@if (showSheet)
{
    <div class="sheet-backdrop" @onclick="CloseSheet"></div>
    <div class="sheet">
        <div class="sheet-header">
            <button type="button" class="sheet-close" @onclick="CloseSheet">✕</button>
        </div>

        <div class="numpad-section">
            <div class="numpad-label">
                <span>Nombre de répétitions</span>
                <span class="numpad-value">@(string.IsNullOrEmpty(repsInput) ? "—" : repsInput)</span>
            </div>
            <div class="numpad-grid">
                @foreach (var key in new[] { "1","2","3","4","5","6","7","8","9","0","","Effacer" })
                {
                    @if (key == "")
                    {
                        <span class="numpad-spacer"></span>
                    }
                    else
                    {
                        var k = key;
                        <button type="button" class="numpad-btn" @onclick="() => PressReps(k)">@k</button>
                    }
                }
            </div>
        </div>

        <div class="numpad-section">
            <div class="numpad-label">
                <span>Charge</span>
                <span class="numpad-value">@(string.IsNullOrEmpty(weightInput) ? "—" : weightInput) kg</span>
            </div>
            <div class="numpad-grid">
                @foreach (var key in new[] { "1","2","3","4","5","6","7","8","9","0","PDC","Effacer" })
                {
                    var k = key;
                    <button type="button" class="numpad-btn @(k == "PDC" ? "numpad-btn--pdc" : "")" @onclick="() => PressWeight(k)">@k</button>
                }
            </div>
        </div>

        <button type="button" class="submit-btn" @onclick="ValidateSetAsync" disabled="@isSaving">
            @(isSaving ? "Enregistrement..." : "Valider la série")
        </button>
    </div>
}

@code {
    [Parameter] public int ProgramId { get; set; }
    [Parameter] public int SessionId { get; set; }
    [Parameter] public int ExerciseId { get; set; }

    private bool loading = true;
    private string exerciseName = "";
    private string? exerciseGifUrl;
    private string? exerciseInstructions;
    private string? schema;
    private int restSeconds;
    private int workoutProgramSessionId;

    private List<TodaySet> todaySets = new();
    private bool showSheet;
    private string repsInput = "";
    private string weightInput = "";
    private bool isSaving;

    private int timerRemaining;
    private bool timerRunning;
    private System.Timers.Timer? timer;

    protected override async Task OnInitializedAsync()
    {
        var programTask = Http.GetFromJsonAsync<WorkoutProgram>($"api/programs/{ProgramId}");
        var historyTask = Http.GetFromJsonAsync<List<HistoryEntry>>($"api/exercises/{ExerciseId}/history");
        await Task.WhenAll(programTask, historyTask);

        var program = programTask.Result;
        var history = historyTask.Result ?? new();

        var session = program?.Sessions.FirstOrDefault(s => s.Id == SessionId);
        if (session != null)
            workoutProgramSessionId = session.Id;

        var pe = session?.Exercises.FirstOrDefault(e => e.ExerciseId == ExerciseId);
        var exercise = pe?.Exercise;

        exerciseName = exercise?.Name ?? "Exercice";
        exerciseGifUrl = exercise?.GifUrl;
        exerciseInstructions = exercise?.InstructionsFr;

        if (pe is not null)
        {
            var reps = pe.TargetRepsMin == pe.TargetRepsMax
                ? $"{pe.TargetRepsMin}"
                : $"{pe.TargetRepsMin}-{pe.TargetRepsMax}";
            var rest = pe.RestSeconds >= 60
                ? $"{pe.RestSeconds / 60} min{(pe.RestSeconds % 60 > 0 ? $" {pe.RestSeconds % 60:D2}" : "")}"
                : $"{pe.RestSeconds}s";
            schema = $"{pe.TargetSets}x{reps} et {rest} de pause";
            restSeconds = pe.RestSeconds;
        }

        var todayEntry = history.FirstOrDefault(h => h.Date.Date == DateTime.Today);
        if (todayEntry != null)
        {
            todaySets = todayEntry.Sets.Select(s => new TodaySet
            {
                Order = s.Order,
                Repetitions = s.Repetitions,
                Weight = s.Weight
            }).ToList();
        }

        timerRemaining = restSeconds;
        loading = false;
    }

    private void OpenSheet()
    {
        var last = todaySets.LastOrDefault();
        repsInput = last != null ? last.Repetitions.ToString() : "";
        weightInput = last != null ? last.Weight.ToString("0.##") : "";
        showSheet = true;
    }

    private void CloseSheet() => showSheet = false;

    private void PressReps(string key)
    {
        if (key == "Effacer")
            repsInput = repsInput.Length > 0 ? repsInput[..^1] : "";
        else
            repsInput += key;
    }

    private void PressWeight(string key)
    {
        if (key == "Effacer")
            weightInput = weightInput.Length > 0 ? weightInput[..^1] : "";
        else if (key == "PDC")
            weightInput = "0";
        else
            weightInput += key;
    }

    private async Task ValidateSetAsync()
    {
        if (!int.TryParse(repsInput, out var reps) || reps <= 0) return;
        if (!double.TryParse(weightInput, out var weight)) return;

        isSaving = true;
        try
        {
            var response = await Http.PostAsJsonAsync(
                $"api/exercises/{ExerciseId}/log",
                new { workoutProgramSessionId, repetitions = reps, weight });

            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<LogSetResult>();
                if (result != null)
                    todaySets.Add(new TodaySet
                    {
                        Order = result.Order,
                        Repetitions = result.Repetitions,
                        Weight = result.Weight
                    });
                showSheet = false;
                StartTimer();
            }
        }
        finally
        {
            isSaving = false;
        }
    }

    private void StartTimer()
    {
        timer?.Stop();
        timer?.Dispose();
        timerRemaining = restSeconds;
        timerRunning = true;
        timer = new System.Timers.Timer(1000);
        timer.Elapsed += OnTimerTick;
        timer.Start();
    }

    private void ToggleTimer()
    {
        if (timerRunning)
        {
            timer?.Stop();
            timerRunning = false;
        }
        else
        {
            if (timerRemaining <= 0) timerRemaining = restSeconds;
            timer = new System.Timers.Timer(1000);
            timer.Elapsed += OnTimerTick;
            timer.Start();
            timerRunning = true;
        }
    }

    private void OnTimerTick(object? sender, ElapsedEventArgs e)
    {
        timerRemaining--;
        if (timerRemaining <= 0)
        {
            timer?.Stop();
            timerRunning = false;
            timerRemaining = restSeconds;
        }
        InvokeAsync(StateHasChanged);
    }

    private string FormatTime(int totalSeconds)
    {
        var m = totalSeconds / 60;
        var s = totalSeconds % 60;
        return $"{m:D2}:{s:D2}";
    }

    public void Dispose()
    {
        timer?.Stop();
        timer?.Dispose();
    }

    private class TodaySet
    {
        public int Order { get; set; }
        public int Repetitions { get; set; }
        public double Weight { get; set; }
    }

    private class LogSetResult
    {
        public int Order { get; set; }
        public int Repetitions { get; set; }
        public double Weight { get; set; }
    }

    private class HistoryEntry
    {
        public DateTime Date { get; set; }
        public int TotalReps { get; set; }
        public double TotalVolume { get; set; }
        public List<SetEntry> Sets { get; set; } = new();
    }

    private class SetEntry
    {
        public int Order { get; set; }
        public int Repetitions { get; set; }
        public double Weight { get; set; }
    }
}
```

- [ ] **Ajouter les classes CSS** à la fin de `SportTracker.App/wwwroot/css/app.css` :

```css
/* ── Exercise Live page ─────────────────────────────────── */
.live-gif {
    width: 100%;
    max-height: 260px;
    object-fit: cover;
    border-radius: var(--st-radius-card);
    margin-bottom: 1rem;
}

.live-schema {
    color: var(--st-nav-inactive);
    font-size: 0.9rem;
    margin: -0.5rem 0 0.75rem;
}

.live-instructions {
    font-size: 0.88rem;
    line-height: 1.5;
    opacity: 0.75;
    margin-bottom: 1.25rem;
}

.history-link {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--st-dark);
    text-decoration: none;
    margin-left: auto;
    padding: 4px 8px;
}

/* ── Bottom sheet ───────────────────────────────────────── */
.sheet-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 100;
}

.sheet {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--st-card-bg);
    border-radius: 20px 20px 0 0;
    padding: 1rem 1.25rem 2rem;
    z-index: 101;
    max-height: 90vh;
    overflow-y: auto;
}

.sheet-header {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 0.5rem;
}

.sheet-close {
    background: none;
    border: none;
    font-size: 1.1rem;
    cursor: pointer;
    color: var(--st-dark);
    padding: 4px 8px;
}

.numpad-section {
    margin-bottom: 1.25rem;
}

.numpad-label {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 0.75rem;
    font-weight: 600;
}

.numpad-value {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--st-dark);
}

.numpad-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
}

.numpad-btn {
    background: #f0f0f0;
    border: none;
    border-radius: 12px;
    padding: 1rem;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    color: var(--st-dark);
    font-family: var(--st-font-body);
}

.numpad-btn:active {
    background: var(--st-cyan);
}

.numpad-btn--pdc {
    background: var(--st-neon);
}

.numpad-spacer {
    display: block;
}
```

- [ ] **Modifier `ProgramSessionDetail.razor`** — changer le `href` de la carte exercice (ligne ~38) :

```razor
// Avant
<a href="/programs/@ProgramId/sessions/@SessionId/exercises/@ex.Id/history" class="exercise-card">

// Après
<a href="/programs/@ProgramId/sessions/@SessionId/exercises/@ex.Id/live" class="exercise-card">
```

- [ ] **Vérifier que le frontend compile** :

```bash
dotnet build SportTracker.App/SportTracker.App.csproj
```
Attendu : `Build succeeded. 0 Error(s)`

- [ ] **Tester manuellement** (API + App lancés) :
  1. Carnets → programme → séance → clic sur un exercice → page Live s'ouvre (gif + nom + schema + instructions)
  2. Clic `+` → bottom sheet avec pavé reps + pavé charge
  3. Saisir 12 reps / 80 kg → "Valider la série" → série apparaît dans "AUJOURD'HUI" → timer démarre
  4. Recharger la page → la série d'aujourd'hui est toujours là (persistée)
  5. Clic "Historique" → page history avec l'entrée du jour visible
  6. PDC → charge passe à 0

- [ ] **Commit** :

```bash
git add SportTracker.App/Pages/ExerciseLive.razor SportTracker.App/wwwroot/css/app.css SportTracker.App/Pages/ProgramSessionDetail.razor
git commit -m "feat: add ExerciseLive page with numpad set recording"
```
