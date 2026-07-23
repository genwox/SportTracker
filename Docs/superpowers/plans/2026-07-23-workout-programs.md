# Workout Programs (Carnets) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add workout programs (carnets) with reusable session templates and per-exercise progression history to the SportTracker application.

**Architecture:** Three new Core models (`WorkoutProgram`, `WorkoutProgramSession`, `WorkoutProgramExercise`) sit above the existing `WorkoutSession` log layer. A nullable FK on `WorkoutSession` links executed sessions back to their template. The exercise history endpoint queries the existing `ExerciseSet` chain grouped by date. New Blazor pages mirror the 4-level navigation: Programs list > Sessions list > Exercises list > Exercise history.

**Tech Stack:** .NET 10, ASP.NET Core, Blazor WASM, EF Core + SQLite, C#

## Global Constraints

- Target framework: `net10.0`
- No test project exists yet — this plan does not add one (consistent with current project state)
- All repositories implement `IRepository<T>` from `SportTracker.Core.Interfaces`
- JSON serialization uses `ReferenceHandler.IgnoreCycles`
- CORS policy `"Frontend"` is already configured (`AllowAnyOrigin` in dev)
- Commit messages: no `Co-Authored-By` or Claude mention (user preference from `feedback_commits.md`)
- All new pages follow existing dark theme design tokens in `wwwroot/css/app.css`
- EF Core migrations run automatically at startup via `db.Database.MigrateAsync()`

---

### Task 1: Core Models — New Entities + WorkoutSession FK

**Files:**
- Create: `SportTracker.Core/Models/WorkoutProgram.cs`
- Create: `SportTracker.Core/Models/WorkoutProgramSession.cs`
- Create: `SportTracker.Core/Models/WorkoutProgramExercise.cs`
- Modify: `SportTracker.Core/Models/WorkoutSession.cs`

**Interfaces:**
- Consumes: `Exercise` from `SportTracker.Core.Models` (already exists)
- Produces: `WorkoutProgram`, `WorkoutProgramSession`, `WorkoutProgramExercise` — used by Task 2 (DbContext), Task 3 (Repository), Task 4 (Controller), Tasks 5-9 (Blazor pages)

- [ ] **Step 1: Create `WorkoutProgram.cs`**

```csharp
// SportTracker.Core/Models/WorkoutProgram.cs
namespace SportTracker.Core.Models;

public class WorkoutProgram
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Objective { get; set; }
    public string ColorHex { get; set; } = "#4A90D9";
    public List<WorkoutProgramSession> Sessions { get; set; } = new();
}
```

- [ ] **Step 2: Create `WorkoutProgramSession.cs`**

```csharp
// SportTracker.Core/Models/WorkoutProgramSession.cs
namespace SportTracker.Core.Models;

public class WorkoutProgramSession
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Order { get; set; }
    public int WorkoutProgramId { get; set; }
    public WorkoutProgram? WorkoutProgram { get; set; }
    public List<WorkoutProgramExercise> Exercises { get; set; } = new();
}
```

- [ ] **Step 3: Create `WorkoutProgramExercise.cs`**

```csharp
// SportTracker.Core/Models/WorkoutProgramExercise.cs
namespace SportTracker.Core.Models;

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

- [ ] **Step 4: Add nullable FK to `WorkoutSession.cs`**

Add these two properties after the existing `Name` property:

```csharp
public int? WorkoutProgramSessionId { get; set; }
public WorkoutProgramSession? WorkoutProgramSession { get; set; }
```

- [ ] **Step 5: Build to verify**

Run: `dotnet build SportTracker.Core/SportTracker.Core.csproj`
Expected: Build succeeded.

- [ ] **Step 6: Commit**

```bash
git add SportTracker.Core/Models/WorkoutProgram.cs SportTracker.Core/Models/WorkoutProgramSession.cs SportTracker.Core/Models/WorkoutProgramExercise.cs SportTracker.Core/Models/WorkoutSession.cs
git commit -m "feat: add WorkoutProgram, WorkoutProgramSession, WorkoutProgramExercise models + FK on WorkoutSession"
```

---

### Task 2: Data Layer — DbContext, EF Config, Migration

**Files:**
- Modify: `SportTracker.Data/SportTrackerDbContext.cs`

**Interfaces:**
- Consumes: `WorkoutProgram`, `WorkoutProgramSession`, `WorkoutProgramExercise` from Task 1
- Produces: `DbSet<WorkoutProgram>`, `DbSet<WorkoutProgramSession>`, `DbSet<WorkoutProgramExercise>` — used by Task 3 (Repository)

- [ ] **Step 1: Add DbSets to `SportTrackerDbContext.cs`**

Add after the existing `DbSet<Exercise> Exercises` line:

```csharp
public DbSet<WorkoutProgram> WorkoutPrograms { get; set; }
public DbSet<WorkoutProgramSession> WorkoutProgramSessions { get; set; }
public DbSet<WorkoutProgramExercise> WorkoutProgramExercises { get; set; }
```

- [ ] **Step 2: Add EF configuration in `OnModelCreating`**

Add at the end of the `OnModelCreating` method, after the existing `modelBuilder.Entity<Exercise>()` block:

```csharp
modelBuilder.Entity<WorkoutProgramSession>()
    .HasOne(s => s.WorkoutProgram)
    .WithMany(p => p.Sessions)
    .HasForeignKey(s => s.WorkoutProgramId)
    .OnDelete(DeleteBehavior.Cascade);

modelBuilder.Entity<WorkoutProgramExercise>()
    .HasOne(e => e.WorkoutProgramSession)
    .WithMany(s => s.Exercises)
    .HasForeignKey(e => e.WorkoutProgramSessionId)
    .OnDelete(DeleteBehavior.Cascade);

modelBuilder.Entity<WorkoutSession>()
    .HasOne(ws => ws.WorkoutProgramSession)
    .WithMany()
    .HasForeignKey(ws => ws.WorkoutProgramSessionId)
    .OnDelete(DeleteBehavior.SetNull);
```

- [ ] **Step 3: Build to verify**

Run: `dotnet build SportTracker.Data/SportTracker.Data.csproj`
Expected: Build succeeded.

- [ ] **Step 4: Create EF migration**

Run from the repo root:

```bash
dotnet ef migrations add AddWorkoutPrograms --project SportTracker.Data --startup-project SportTracker.Api
```

Expected: Migration files created in `SportTracker.Data/Migrations/`.

- [ ] **Step 5: Verify migration applies**

Run:

```bash
dotnet ef database update --project SportTracker.Data --startup-project SportTracker.Api
```

Expected: Database updated successfully. Tables `WorkoutPrograms`, `WorkoutProgramSessions`, `WorkoutProgramExercises` created. Column `WorkoutProgramSessionId` added to `WorkoutSessions`.

- [ ] **Step 6: Commit**

```bash
git add SportTracker.Data/
git commit -m "feat: add DbSets and EF config for workout programs + migration"
```

---

### Task 3: Repository + DI Registration

**Files:**
- Create: `SportTracker.Data/Repository/WorkoutProgramRepository.cs`
- Modify: `SportTracker.Api/Program.cs`

**Interfaces:**
- Consumes: `IRepository<T>` from `SportTracker.Core.Interfaces`, `SportTrackerDbContext` from Task 2
- Produces: `WorkoutProgramRepository` implementing `IRepository<WorkoutProgram>` — used by Task 4 (Controller)

- [ ] **Step 1: Create `WorkoutProgramRepository.cs`**

```csharp
// SportTracker.Data/Repository/WorkoutProgramRepository.cs
using Microsoft.EntityFrameworkCore;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Models;

namespace SportTracker.Data.Repository;

public class WorkoutProgramRepository : IRepository<WorkoutProgram>
{
    private readonly SportTrackerDbContext _context;

    public WorkoutProgramRepository(SportTrackerDbContext context)
    {
        _context = context;
    }

    public async Task<WorkoutProgram?> GetByIdAsync(int id)
    {
        return await _context.WorkoutPrograms
            .Include(p => p.Sessions.OrderBy(s => s.Order))
                .ThenInclude(s => s.Exercises.OrderBy(e => e.Order))
                    .ThenInclude(e => e.Exercise)
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task<IEnumerable<WorkoutProgram>> GetAllAsync()
    {
        return await _context.WorkoutPrograms.ToListAsync();
    }

    public async Task AddAsync(WorkoutProgram entity)
    {
        _context.WorkoutPrograms.Add(entity);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(WorkoutProgram entity)
    {
        _context.WorkoutPrograms.Update(entity);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var entity = await _context.WorkoutPrograms.FindAsync(id);
        if (entity == null) return;
        _context.WorkoutPrograms.Remove(entity);
        await _context.SaveChangesAsync();
    }
}
```

- [ ] **Step 2: Register in DI — `Program.cs`**

Add after the existing `AddScoped<IRepository<Exercise>, ExerciseRepository>()` line:

```csharp
builder.Services.
    AddScoped<IRepository<WorkoutProgram>, WorkoutProgramRepository>();
```

Also add the using if not already present (it should be via `SportTracker.Core.Models`):

```csharp
using SportTracker.Data.Repository;
```

This using is already present in `Program.cs`, so no change needed for it.

- [ ] **Step 3: Build to verify**

Run: `dotnet build SportTracker.Api/SportTracker.Api.csproj`
Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add SportTracker.Data/Repository/WorkoutProgramRepository.cs SportTracker.Api/Program.cs
git commit -m "feat: add WorkoutProgramRepository + DI registration"
```

---

### Task 4: API Controllers — WorkoutProgramController + Exercise History Endpoint

**Files:**
- Create: `SportTracker.Api/Controllers/WorkoutProgramController.cs`
- Modify: `SportTracker.Api/Controllers/ExerciseController.cs`

**Interfaces:**
- Consumes: `IRepository<WorkoutProgram>` from Task 3, `SportTrackerDbContext` (injected for history query)
- Produces: REST endpoints `api/programs` (CRUD) and `api/exercises/{id}/history` — used by Tasks 5-9 (Blazor pages)

- [ ] **Step 1: Create `WorkoutProgramController.cs`**

```csharp
// SportTracker.Api/Controllers/WorkoutProgramController.cs
using Microsoft.AspNetCore.Mvc;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Models;

namespace SportTracker.Api.Controllers;

[ApiController]
[Route("api/programs")]
public class WorkoutProgramController : ControllerBase
{
    private readonly IRepository<WorkoutProgram> _programRepository;

    public WorkoutProgramController(IRepository<WorkoutProgram> programRepository)
    {
        _programRepository = programRepository;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllAsync()
    {
        var programs = await _programRepository.GetAllAsync();
        return Ok(programs);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetByIdAsync(int id)
    {
        var program = await _programRepository.GetByIdAsync(id);
        if (program == null) return NotFound();
        return Ok(program);
    }

    [HttpPost]
    public async Task<IActionResult> CreateAsync([FromBody] WorkoutProgram program)
    {
        await _programRepository.AddAsync(program);
        return Ok(program);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAsync(int id, [FromBody] WorkoutProgram program)
    {
        if (id != program.Id) return BadRequest();
        var existing = await _programRepository.GetByIdAsync(id);
        if (existing == null) return NotFound();
        await _programRepository.UpdateAsync(program);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAsync(int id)
    {
        var program = await _programRepository.GetByIdAsync(id);
        if (program == null) return NotFound();
        await _programRepository.DeleteAsync(id);
        return NoContent();
    }
}
```

- [ ] **Step 2: Add exercise history endpoint to `ExerciseController.cs`**

Add these usings at the top of the file:

```csharp
using Microsoft.EntityFrameworkCore;
using SportTracker.Data;
```

Add a second constructor parameter and field:

```csharp
private readonly IRepository<Exercise> _exerciseRepository;
private readonly SportTrackerDbContext _context;

public ExerciseController(IRepository<Exercise> exerciseRepository, SportTrackerDbContext context)
{
    _exerciseRepository = exerciseRepository;
    _context = context;
}
```

Add this endpoint after the existing `CreateAsync` method:

```csharp
[HttpGet("{id}/history")]
public async Task<IActionResult> GetHistoryAsync(int id)
{
    var exercise = await _exerciseRepository.GetByIdAsync(id);
    if (exercise == null) return NotFound();

    var history = await _context.ExerciseSets
        .Include(s => s.WorkoutExercise)
            .ThenInclude(we => we.WorkoutSession)
        .Where(s => s.WorkoutExercise!.ExerciseId == id)
        .GroupBy(s => s.WorkoutExercise!.WorkoutSession!.Date.Date)
        .Select(g => new
        {
            Date = g.Key,
            TotalReps = g.Sum(s => s.Repetitions),
            TotalVolume = g.Sum(s => s.Repetitions * s.Weight),
            Sets = g.OrderBy(s => s.Id).Select((s, i) => new
            {
                Order = i + 1,
                s.Repetitions,
                s.Weight
            }).ToList()
        })
        .OrderByDescending(h => h.Date)
        .ToListAsync();

    return Ok(history);
}
```

- [ ] **Step 3: Build to verify**

Run: `dotnet build SportTracker.Api/SportTracker.Api.csproj`
Expected: Build succeeded.

- [ ] **Step 4: Smoke test the API**

Run the API:

```bash
dotnet run --project SportTracker.Api
```

In a second terminal, test the endpoints:

```bash
curl http://localhost:5000/api/programs
```

Expected: `[]` (empty array, 200 OK)

```bash
curl -X POST http://localhost:5000/api/programs -H "Content-Type: application/json" -d "{\"name\":\"Test Program\",\"objective\":\"Test\",\"colorHex\":\"#FF5733\",\"sessions\":[{\"name\":\"Base\",\"order\":0,\"exercises\":[]}]}"
```

Expected: 200 OK with the created program JSON including an `id`.

Stop the API after testing.

- [ ] **Step 5: Commit**

```bash
git add SportTracker.Api/Controllers/WorkoutProgramController.cs SportTracker.Api/Controllers/ExerciseController.cs
git commit -m "feat: add WorkoutProgramController CRUD + exercise history endpoint"
```

---

### Task 5: UI — Workouts Page Tabs (Seances / Carnets)

**Files:**
- Modify: `SportTracker.App/Pages/WorkoutSessions.razor`
- Modify: `SportTracker.App/wwwroot/css/app.css`

**Interfaces:**
- Consumes: Nothing new
- Produces: Tab navigation on the Workouts page — `activeTab` state toggling between sessions list and programs list. The "Carnets" tab links to `/programs` (created in Task 6).

- [ ] **Step 1: Add tab UI to `WorkoutSessions.razor`**

Replace the `<div class="workouts-header">` block (lines 5-9) with:

```html
<div class="tab-bar">
    <a href="/workoutsessions" class="tab-bar__tab tab-bar__tab--active">Seances</a>
    <a href="/programs" class="tab-bar__tab">Carnets</a>
</div>

<div class="workouts-header">
    <h1 class="workouts-title">
        <span class="title-eyebrow">Find your</span>
        Workouts
    </h1>
    <a href="/workoutsessions/new" class="new-btn">+ Nouvelle</a>
</div>
```

- [ ] **Step 2: Add tab-bar CSS to `app.css`**

Add at the end of the file:

```css
/* ── Tab bar (Workouts / Programs) ────────────────────── */
.tab-bar {
    display: flex;
    gap: 0;
    margin-bottom: 1rem;
    border-bottom: 2px solid rgba(255,255,255,0.1);
}

.tab-bar__tab {
    flex: 1;
    text-align: center;
    padding: 0.75rem 0;
    font-family: var(--st-font-display);
    font-weight: 700;
    font-size: 0.95rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--st-nav-inactive);
    text-decoration: none;
    border-bottom: 3px solid transparent;
    transition: color 0.2s, border-color 0.2s;
}

.tab-bar__tab--active {
    color: var(--st-white);
    border-bottom-color: var(--st-neon);
}

.tab-bar__tab:hover {
    color: var(--st-white);
}
```

- [ ] **Step 3: Build to verify**

Run: `dotnet build SportTracker.App/SportTracker.App.csproj`
Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add SportTracker.App/Pages/WorkoutSessions.razor SportTracker.App/wwwroot/css/app.css
git commit -m "feat: add Seances/Carnets tab bar on Workouts page"
```

---

### Task 6: UI — Programs List Page (`/programs`)

**Files:**
- Create: `SportTracker.App/Pages/Programs.razor`
- Modify: `SportTracker.App/wwwroot/css/app.css`

**Interfaces:**
- Consumes: `GET api/programs` from Task 4, returns `List<WorkoutProgram>` with `Id`, `Name`, `Objective`, `ColorHex`
- Produces: Programs list page — links to `/programs/{id}` (Task 7) and `/programs/new` (this task)

- [ ] **Step 1: Create `Programs.razor`**

```razor
@page "/programs"
@using SportTracker.Core.Models
@inject HttpClient Http

<div class="workouts-page">

    <div class="tab-bar">
        <a href="/workoutsessions" class="tab-bar__tab">Seances</a>
        <a href="/programs" class="tab-bar__tab tab-bar__tab--active">Carnets</a>
    </div>

    <div class="workouts-header">
        <h1 class="workouts-title">
            <span class="title-eyebrow">Mes</span>
            Carnets
        </h1>
        <a href="/programs/new" class="new-btn">+ Nouveau</a>
    </div>

    @if (programs == null)
    {
        <div class="st-skel-block">
            <div class="st-skeleton st-skel-tall"></div>
            <div class="st-skeleton st-skel-tall"></div>
            <div class="st-skeleton st-skel-tall"></div>
        </div>
    }
    else if (!programs.Any())
    {
        <div class="empty-state">
            <p class="empty-title">Aucun carnet</p>
            <p class="empty-sub">Cree ton premier programme d'entrainement.</p>
            <a href="/programs/new" class="empty-cta">+ Nouveau carnet</a>
        </div>
    }
    else
    {
        <div class="programs-list">
            @foreach (var program in programs)
            {
                <a href="/programs/@program.Id" class="program-card">
                    <div class="program-card__pill" style="background-color: @program.ColorHex">
                        @program.Name.Substring(0, 1).ToUpper()
                    </div>
                    <div class="program-card__info">
                        <h2 class="program-card__name">@program.Name</h2>
                        @if (!string.IsNullOrEmpty(program.Objective))
                        {
                            <p class="program-card__objective">@program.Objective</p>
                        }
                    </div>
                </a>
            }
        </div>
    }

</div>

@code {
    private List<WorkoutProgram>? programs;

    protected override async Task OnInitializedAsync()
    {
        programs = await Http.GetFromJsonAsync<List<WorkoutProgram>>("api/programs");
    }
}
```

- [ ] **Step 2: Add programs CSS to `app.css`**

Add at the end of the file:

```css
/* ── Programs list ────────────────────────────────────── */
.programs-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.program-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 0.5rem;
    text-decoration: none;
    color: var(--st-white);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    transition: background 0.15s;
}

.program-card:hover {
    background: rgba(255,255,255,0.04);
}

.program-card__pill {
    width: 50px;
    height: 50px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--st-font-display);
    font-weight: 800;
    font-size: 1.3rem;
    color: var(--st-white);
    flex-shrink: 0;
}

.program-card__info {
    min-width: 0;
}

.program-card__name {
    font-family: var(--st-font-display);
    font-weight: 700;
    font-size: 1.05rem;
    margin: 0;
    color: var(--st-white);
}

.program-card__objective {
    font-size: 0.82rem;
    color: var(--st-text-muted);
    margin: 0.15rem 0 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
```

- [ ] **Step 3: Build to verify**

Run: `dotnet build SportTracker.App/SportTracker.App.csproj`
Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add SportTracker.App/Pages/Programs.razor SportTracker.App/wwwroot/css/app.css
git commit -m "feat: add programs list page with color pill cards"
```

---

### Task 7: UI — New Program Form (`/programs/new`) + Program Detail (`/programs/{id}`)

**Files:**
- Create: `SportTracker.App/Pages/NewProgram.razor`
- Create: `SportTracker.App/Pages/ProgramDetail.razor`
- Modify: `SportTracker.App/wwwroot/css/app.css`

**Interfaces:**
- Consumes: `POST api/programs` and `GET api/programs/{id}` from Task 4, `GET api/exercises` for exercise picker
- Produces: Create program form and program detail page (lists sessions). Links to `/programs/{id}/sessions/{sid}` (Task 8).

- [ ] **Step 1: Create `NewProgram.razor`**

```razor
@page "/programs/new"
@using SportTracker.Core.Models
@inject HttpClient Http
@inject NavigationManager Nav

<div class="form-page">

    <div class="form-header">
        <a href="/programs" class="back-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"/>
            </svg>
        </a>
        <h1 class="form-title">Nouveau carnet</h1>
    </div>

    <EditForm Model="form" OnValidSubmit="HandleSubmit">
        <DataAnnotationsValidator />

        <div class="field-group">
            <label class="field-label">Nom du programme</label>
            <InputText class="field-input" @bind-Value="form.Name" placeholder="Ex : Full body gem" />
        </div>

        <div class="field-group">
            <label class="field-label">Objectif (optionnel)</label>
            <InputText class="field-input" @bind-Value="form.Objective" placeholder="Ex : prise de volume sur 3 seances" />
        </div>

        <div class="field-group">
            <label class="field-label">Couleur</label>
            <div class="color-picker">
                @foreach (var color in colorOptions)
                {
                    <button type="button"
                            class="color-swatch @(form.ColorHex == color ? "color-swatch--selected" : "")"
                            style="background-color: @color"
                            @onclick="() => form.ColorHex = color">
                    </button>
                }
            </div>
        </div>

        <div class="section-label">SEANCES</div>

        @for (int i = 0; i < sessions.Count; i++)
        {
            var idx = i;
            <div class="session-template-row">
                <input type="text" class="field-input" @bind="sessions[idx].Name" placeholder="Ex : Base, Volume, Finition..." />
                <button type="button" class="set-remove" @onclick="() => sessions.RemoveAt(idx)">&#10005;</button>
            </div>
        }

        <button type="button" class="add-exercise-btn" @onclick="AddSession">+ Seance</button>

        @if (errorMessage is not null)
        {
            <div class="error-card">@errorMessage</div>
        }

        <div class="form-actions">
            <button type="submit" class="submit-btn" disabled="@isSaving">
                @(isSaving ? "Enregistrement..." : "Creer le carnet")
            </button>
            <a href="/programs" class="cancel-btn">Annuler</a>
        </div>
    </EditForm>

</div>

@code {
    private WorkoutProgram form = new();
    private List<SessionForm> sessions = new() { new SessionForm() };
    private bool isSaving;
    private string? errorMessage;

    private static readonly string[] colorOptions =
    {
        "#4A90D9", "#E57C3A", "#5BBD72", "#D94A6B",
        "#9B59B6", "#1ABC9C", "#E74C3C", "#F1C40F"
    };

    private void AddSession() => sessions.Add(new SessionForm());

    private async Task HandleSubmit()
    {
        if (string.IsNullOrWhiteSpace(form.Name))
        {
            errorMessage = "Le nom du programme est requis.";
            return;
        }
        if (sessions.Any(s => string.IsNullOrWhiteSpace(s.Name)))
        {
            errorMessage = "Chaque seance doit avoir un nom.";
            return;
        }

        isSaving = true;
        errorMessage = null;

        form.Sessions = sessions.Select((s, i) => new WorkoutProgramSession
        {
            Name = s.Name,
            Order = i
        }).ToList();

        var response = await Http.PostAsJsonAsync("api/programs", form);
        if (response.IsSuccessStatusCode)
            Nav.NavigateTo("/programs");
        else
        {
            errorMessage = $"Erreur lors de la creation ({(int)response.StatusCode}).";
            isSaving = false;
        }
    }

    private class SessionForm
    {
        public string Name { get; set; } = string.Empty;
    }
}
```

- [ ] **Step 2: Create `ProgramDetail.razor`**

```razor
@page "/programs/{ProgramId:int}"
@using SportTracker.Core.Models
@inject HttpClient Http

<div class="workouts-page">

    <div class="form-header">
        <a href="/programs" class="back-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"/>
            </svg>
        </a>
    </div>

    @if (program == null)
    {
        <div class="st-skel-block">
            <div class="st-skeleton st-skel-med"></div>
            <div class="st-skeleton st-skel-tall"></div>
        </div>
    }
    else
    {
        <h1 class="workouts-title">
            <span class="title-eyebrow">Seances</span>
            @program.Name
        </h1>

        @if (!string.IsNullOrEmpty(program.Objective))
        {
            <p class="program-detail__objective">@program.Objective</p>
        }

        <div class="programs-list">
            @foreach (var session in program.Sessions.OrderBy(s => s.Order))
            {
                <a href="/programs/@ProgramId/sessions/@session.Id" class="program-card">
                    <div class="program-card__pill" style="background-color: @program.ColorHex">
                        @session.Name.Substring(0, 1).ToUpper()
                    </div>
                    <div class="program-card__info">
                        <h2 class="program-card__name">@session.Name</h2>
                    </div>
                </a>
            }
        </div>
    }

</div>

@code {
    [Parameter] public int ProgramId { get; set; }
    private WorkoutProgram? program;

    protected override async Task OnInitializedAsync()
    {
        program = await Http.GetFromJsonAsync<WorkoutProgram>($"api/programs/{ProgramId}");
    }
}
```

- [ ] **Step 3: Add new CSS to `app.css`**

Add at the end of the file:

```css
/* ── Color picker ─────────────────────────────────────── */
.color-picker {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
}

.color-swatch {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    border: 3px solid transparent;
    cursor: pointer;
    transition: border-color 0.15s, transform 0.1s;
}

.color-swatch--selected {
    border-color: var(--st-white);
    transform: scale(1.15);
}

/* ── Session template row ─────────────────────────────── */
.session-template-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 0.5rem;
}

.session-template-row .field-input {
    flex: 1;
}

/* ── Program detail ───────────────────────────────────── */
.program-detail__objective {
    color: var(--st-text-muted);
    font-size: 0.88rem;
    margin: -0.5rem 0 1rem;
}
```

- [ ] **Step 4: Build to verify**

Run: `dotnet build SportTracker.App/SportTracker.App.csproj`
Expected: Build succeeded.

- [ ] **Step 5: Commit**

```bash
git add SportTracker.App/Pages/NewProgram.razor SportTracker.App/Pages/ProgramDetail.razor SportTracker.App/wwwroot/css/app.css
git commit -m "feat: add new program form + program detail page"
```

---

### Task 8: UI — Session Exercises Page (`/programs/{id}/sessions/{sid}`)

**Files:**
- Create: `SportTracker.App/Pages/ProgramSessionDetail.razor`
- Modify: `SportTracker.App/wwwroot/css/app.css`

**Interfaces:**
- Consumes: `GET api/programs/{id}` from Task 4 — extracts the specific `WorkoutProgramSession` and its `WorkoutProgramExercise` list (each with `Exercise.Name`, `Exercise.GifUrl`, `TargetSets`, `TargetRepsMin`, `TargetRepsMax`, `RestSeconds`)
- Produces: Exercise list page. Links to `/programs/{id}/sessions/{sid}/exercises/{eid}/history` (Task 9).

- [ ] **Step 1: Create `ProgramSessionDetail.razor`**

```razor
@page "/programs/{ProgramId:int}/sessions/{SessionId:int}"
@using SportTracker.Core.Models
@inject HttpClient Http

<div class="workouts-page">

    <div class="form-header">
        <a href="/programs/@ProgramId" class="back-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"/>
            </svg>
        </a>
    </div>

    @if (session == null)
    {
        <div class="st-skel-block">
            <div class="st-skeleton st-skel-med"></div>
            <div class="st-skeleton st-skel-tall"></div>
            <div class="st-skeleton st-skel-tall"></div>
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

@code {
    [Parameter] public int ProgramId { get; set; }
    [Parameter] public int SessionId { get; set; }
    private WorkoutProgramSession? session;

    protected override async Task OnInitializedAsync()
    {
        var program = await Http.GetFromJsonAsync<WorkoutProgram>($"api/programs/{ProgramId}");
        session = program?.Sessions.FirstOrDefault(s => s.Id == SessionId);
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
}
```

- [ ] **Step 2: Add exercise list CSS to `app.css`**

Add at the end of the file:

```css
/* ── Exercise list (program session) ──────────────────── */
.exercise-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.exercise-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.85rem 0.5rem;
    text-decoration: none;
    color: var(--st-white);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    transition: background 0.15s;
}

.exercise-card:hover {
    background: rgba(255,255,255,0.04);
}

.exercise-card__img {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
    background: rgba(255,255,255,0.08);
}

.exercise-card__img-placeholder {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: rgba(255,255,255,0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--st-nav-inactive);
}

.exercise-card__info {
    min-width: 0;
}

.exercise-card__name {
    font-family: var(--st-font-display);
    font-weight: 700;
    font-size: 1rem;
    margin: 0;
    color: var(--st-white);
}

.exercise-card__schema {
    font-size: 0.8rem;
    color: var(--st-nav-inactive);
    margin: 0.15rem 0 0;
}
```

- [ ] **Step 3: Build to verify**

Run: `dotnet build SportTracker.App/SportTracker.App.csproj`
Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add SportTracker.App/Pages/ProgramSessionDetail.razor SportTracker.App/wwwroot/css/app.css
git commit -m "feat: add session exercises page with schema display"
```

---

### Task 9: UI — Exercise History + Rest Timer (`/programs/{id}/sessions/{sid}/exercises/{eid}/history`)

**Files:**
- Create: `SportTracker.App/Pages/ExerciseHistory.razor`
- Modify: `SportTracker.App/wwwroot/css/app.css`

**Interfaces:**
- Consumes: `GET api/exercises/{id}/history` from Task 4 (returns `List<{ Date, TotalReps, TotalVolume, Sets[] }>`), `GET api/programs/{id}` to get exercise name and rest seconds from the program template
- Produces: Final page — exercise progression history with rest timer. No downstream consumers.

- [ ] **Step 1: Create `ExerciseHistory.razor`**

```razor
@page "/programs/{ProgramId:int}/sessions/{SessionId:int}/exercises/{ExerciseId:int}/history"
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
    </div>

    @if (loading)
    {
        <div class="st-skel-block">
            <div class="st-skeleton st-skel-med"></div>
            <div class="st-skeleton st-skel-tall"></div>
            <div class="st-skeleton st-skel-tall"></div>
        </div>
    }
    else
    {
        <div class="history-header">
            @if (!string.IsNullOrEmpty(exerciseGifUrl))
            {
                <img src="@exerciseGifUrl" alt="@exerciseName" class="history-header__img" />
            }
            <div>
                <h1 class="history-header__name">@exerciseName</h1>
                @if (schema is not null)
                {
                    <p class="history-header__schema">@schema</p>
                }
            </div>
        </div>

        @if (history.Any())
        {
            @foreach (var entry in history)
            {
                <div class="history-block">
                    <div class="history-block__header">
                        <span class="history-block__date">@entry.Date.ToString("dd/MM")<br/>@entry.Date.ToString("yyyy")</span>
                        <span class="history-block__stat">Total</span>
                        <span class="history-block__stat">@entry.TotalReps<br/><small>reps</small></span>
                        <span class="history-block__stat">@entry.TotalVolume<br/><small>kg</small></span>
                    </div>
                    @foreach (var set in entry.Sets)
                    {
                        <div class="history-set-row">
                            <span class="history-set-row__label">Serie @set.Order</span>
                            <span class="history-set-row__value">
                                <strong>@set.Repetitions</strong> reps x <strong>@set.Weight</strong> kg
                            </span>
                        </div>
                    }
                </div>
            }
        }
        else
        {
            <div class="empty-state">
                <p class="empty-title">Aucun historique</p>
                <p class="empty-sub">Les donnees apparaitront apres ta premiere seance.</p>
            </div>
        }

        @if (restSeconds > 0)
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
    }

</div>

@code {
    [Parameter] public int ProgramId { get; set; }
    [Parameter] public int SessionId { get; set; }
    [Parameter] public int ExerciseId { get; set; }

    private bool loading = true;
    private string exerciseName = "";
    private string? exerciseGifUrl;
    private string? schema;
    private int restSeconds;
    private List<HistoryEntry> history = new();

    private int timerRemaining;
    private bool timerRunning;
    private System.Timers.Timer? timer;

    protected override async Task OnInitializedAsync()
    {
        var programTask = Http.GetFromJsonAsync<WorkoutProgram>($"api/programs/{ProgramId}");
        var historyTask = Http.GetFromJsonAsync<List<HistoryEntry>>($"api/exercises/{ExerciseId}/history");

        await Task.WhenAll(programTask, historyTask);

        var program = programTask.Result;
        history = historyTask.Result ?? new();

        var session = program?.Sessions.FirstOrDefault(s => s.Id == SessionId);
        var pe = session?.Exercises.FirstOrDefault(e => e.ExerciseId == ExerciseId);
        var exercise = pe?.Exercise;

        exerciseName = exercise?.Name ?? "Exercice";
        exerciseGifUrl = exercise?.GifUrl;

        if (pe is not null)
        {
            var reps = pe.TargetRepsMin == pe.TargetRepsMax
                ? $"{pe.TargetRepsMin}"
                : $"{pe.TargetRepsMin}-{pe.TargetRepsMax}";
            var rest = pe.RestSeconds >= 60
                ? $"{pe.RestSeconds / 60} min{(pe.RestSeconds % 60 > 0 ? $" {pe.RestSeconds % 60:D2}" : "")} pause"
                : $"{pe.RestSeconds}s pause";
            schema = $"{pe.TargetSets}x{reps}  et {rest} - repos {rest}";
            restSeconds = pe.RestSeconds;
        }

        timerRemaining = restSeconds;
        loading = false;
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
            if (timerRemaining <= 0)
                timerRemaining = restSeconds;

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

- [ ] **Step 2: Add history + timer CSS to `app.css`**

Add at the end of the file:

```css
/* ── Exercise history ─────────────────────────────────── */
.history-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.2rem;
}

.history-header__img {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    object-fit: cover;
    background: rgba(255,255,255,0.08);
}

.history-header__name {
    font-family: var(--st-font-display);
    font-weight: 800;
    font-size: 1.3rem;
    margin: 0;
    color: var(--st-white);
}

.history-header__schema {
    font-size: 0.8rem;
    color: var(--st-nav-inactive);
    margin: 0.1rem 0 0;
    font-style: italic;
}

.history-block {
    margin-bottom: 1rem;
}

.history-block__header {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: linear-gradient(135deg, #4A90D9, #357ABD);
    border-radius: var(--st-radius-card);
    padding: 0.9rem 1.2rem;
    margin-bottom: 0.3rem;
    color: var(--st-white);
    font-family: var(--st-font-display);
    font-weight: 700;
}

.history-block__date {
    font-size: 1.1rem;
    line-height: 1.2;
    min-width: 55px;
}

.history-block__stat {
    font-size: 1rem;
    text-align: center;
    flex: 1;
}

.history-block__stat small {
    font-size: 0.7rem;
    font-weight: 400;
    opacity: 0.8;
}

.history-set-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.7rem 1rem;
    border-bottom: 1px solid rgba(255,255,255,0.06);
}

.history-set-row__label {
    color: var(--st-text-muted);
    font-size: 0.85rem;
}

.history-set-row__value {
    color: #4A90D9;
    font-size: 1.1rem;
    font-family: var(--st-font-display);
}

.history-set-row__value strong {
    font-weight: 800;
    font-size: 1.25rem;
}

/* ── Rest timer ───────────────────────────────────────── */
.rest-timer {
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 1rem;
    background: rgba(30, 30, 30, 0.95);
    backdrop-filter: blur(10px);
    border-radius: var(--st-radius-pill);
    padding: 0.6rem 1.5rem;
    z-index: 50;
}

.rest-timer__label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--st-text-muted);
}

.rest-timer__time {
    font-family: var(--st-font-display);
    font-weight: 800;
    font-size: 1.4rem;
    color: var(--st-white);
    min-width: 60px;
    text-align: center;
}

.rest-timer__btn {
    background: none;
    border: none;
    color: var(--st-white);
    cursor: pointer;
    padding: 0.2rem;
    display: flex;
    align-items: center;
}
```

- [ ] **Step 3: Build to verify**

Run: `dotnet build SportTracker.App/SportTracker.App.csproj`
Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add SportTracker.App/Pages/ExerciseHistory.razor SportTracker.App/wwwroot/css/app.css
git commit -m "feat: add exercise history page with rest timer"
```

---

### Task 10: UI — Add Exercises to Session Template (Edit Session)

**Files:**
- Create: `SportTracker.App/Pages/NewProgramSession.razor`
- Modify: `SportTracker.App/Pages/ProgramDetail.razor`

**Interfaces:**
- Consumes: `GET api/exercises` (list all exercises for the picker), `GET api/programs/{id}` and `PUT api/programs/{id}` from Task 4
- Produces: Form to add a session with exercises to an existing program. Links from ProgramDetail "+" button.

- [ ] **Step 1: Create `NewProgramSession.razor`**

```razor
@page "/programs/{ProgramId:int}/sessions/new"
@using SportTracker.Core.Models
@inject HttpClient Http
@inject NavigationManager Nav

<div class="form-page">

    <div class="form-header">
        <a href="/programs/@ProgramId" class="back-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"/>
            </svg>
        </a>
        <h1 class="form-title">Nouvelle seance</h1>
    </div>

    @if (availableExercises is null)
    {
        <div class="st-skel-block">
            <div class="st-skeleton st-skel-sm"></div>
        </div>
    }
    else
    {
        <EditForm Model="form" OnValidSubmit="HandleSubmit">
            <DataAnnotationsValidator />

            <div class="field-group">
                <label class="field-label">Nom de la seance</label>
                <InputText class="field-input" @bind-Value="form.Name" placeholder="Ex : Base, Volume, Finition..." />
            </div>

            <div class="section-label">EXERCICES</div>

            @for (int i = 0; i < exercises.Count; i++)
            {
                var idx = i;
                var ef = exercises[idx];
                <div class="exercise-block">
                    <div class="exercise-block__header">
                        @{
                            var selectedEx = availableExercises.FirstOrDefault(e => e.Id == ef.ExerciseId);
                            var filtered = string.IsNullOrWhiteSpace(ef.SearchText)
                                ? Enumerable.Empty<Exercise>()
                                : availableExercises
                                    .Where(e => e.Name.Contains(ef.SearchText, StringComparison.OrdinalIgnoreCase))
                                    .Take(8);
                        }
                        @if (selectedEx is not null)
                        {
                            <div class="ex-selected">
                                <span>@selectedEx.Name</span>
                                <button type="button" class="ex-clear" @onclick="() => ClearExercise(idx)">&#10005;</button>
                            </div>
                        }
                        else
                        {
                            <div class="ex-search">
                                <input type="text" class="field-input"
                                       placeholder="Rechercher un exercice..."
                                       value="@ef.SearchText"
                                       @oninput="e => ef.SearchText = e.Value?.ToString() ?? string.Empty"
                                       @onfocusin="() => ef.ShowDropdown = true"
                                       @onfocusout="() => ef.ShowDropdown = false" />
                                @if (ef.ShowDropdown && filtered.Any())
                                {
                                    <div class="ex-dropdown">
                                        @foreach (var ex in filtered)
                                        {
                                            <button type="button" class="ex-option"
                                                    @onmousedown:preventDefault
                                                    @onclick="() => SelectExercise(idx, ex)">
                                                @ex.Name
                                            </button>
                                        }
                                    </div>
                                }
                            </div>
                        }
                        <button type="button" class="remove-btn" @onclick="() => exercises.RemoveAt(idx)">&#10005;</button>
                    </div>

                    <div class="target-fields">
                        <div class="field-group field-group--sm">
                            <label class="field-label">Series</label>
                            <InputNumber class="field-input" @bind-Value="ef.TargetSets" min="1" />
                        </div>
                        <div class="field-group field-group--sm">
                            <label class="field-label">Reps min</label>
                            <InputNumber class="field-input" @bind-Value="ef.TargetRepsMin" min="1" />
                        </div>
                        <div class="field-group field-group--sm">
                            <label class="field-label">Reps max</label>
                            <InputNumber class="field-input" @bind-Value="ef.TargetRepsMax" min="1" />
                        </div>
                        <div class="field-group field-group--sm">
                            <label class="field-label">Repos (s)</label>
                            <InputNumber class="field-input" @bind-Value="ef.RestSeconds" min="0" />
                        </div>
                    </div>
                </div>
            }

            <button type="button" class="add-exercise-btn" @onclick="AddExercise">+ Exercice</button>

            @if (errorMessage is not null)
            {
                <div class="error-card">@errorMessage</div>
            }

            <div class="form-actions">
                <button type="submit" class="submit-btn" disabled="@isSaving">
                    @(isSaving ? "Enregistrement..." : "Ajouter la seance")
                </button>
                <a href="/programs/@ProgramId" class="cancel-btn">Annuler</a>
            </div>
        </EditForm>
    }

</div>

@code {
    [Parameter] public int ProgramId { get; set; }

    private SessionForm form = new();
    private List<ExerciseForm> exercises = new() { new() };
    private List<Exercise>? availableExercises;
    private bool isSaving;
    private string? errorMessage;

    protected override async Task OnInitializedAsync()
    {
        availableExercises = await Http.GetFromJsonAsync<List<Exercise>>("api/exercises");
    }

    private void AddExercise() => exercises.Add(new());
    private void SelectExercise(int idx, Exercise ex)
    {
        exercises[idx].ExerciseId = ex.Id;
        exercises[idx].SearchText = string.Empty;
        exercises[idx].ShowDropdown = false;
    }
    private void ClearExercise(int idx)
    {
        exercises[idx].ExerciseId = 0;
        exercises[idx].SearchText = string.Empty;
    }

    private async Task HandleSubmit()
    {
        if (string.IsNullOrWhiteSpace(form.Name))
        {
            errorMessage = "Le nom de la seance est requis.";
            return;
        }
        if (exercises.Any(e => e.ExerciseId == 0))
        {
            errorMessage = "Selectionne un exercice pour chaque ligne.";
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

        var newSession = new WorkoutProgramSession
        {
            Name = form.Name,
            Order = program.Sessions.Count,
            WorkoutProgramId = ProgramId,
            Exercises = exercises.Select((e, i) => new WorkoutProgramExercise
            {
                ExerciseId = e.ExerciseId,
                Order = i,
                TargetSets = e.TargetSets,
                TargetRepsMin = e.TargetRepsMin,
                TargetRepsMax = e.TargetRepsMax,
                RestSeconds = e.RestSeconds
            }).ToList()
        };

        program.Sessions.Add(newSession);

        var response = await Http.PutAsJsonAsync($"api/programs/{ProgramId}", program);
        if (response.IsSuccessStatusCode)
            Nav.NavigateTo($"/programs/{ProgramId}");
        else
        {
            errorMessage = $"Erreur ({(int)response.StatusCode}).";
            isSaving = false;
        }
    }

    private class SessionForm
    {
        public string Name { get; set; } = string.Empty;
    }

    private class ExerciseForm
    {
        public int ExerciseId { get; set; }
        public string SearchText { get; set; } = string.Empty;
        public bool ShowDropdown { get; set; }
        public int TargetSets { get; set; } = 3;
        public int TargetRepsMin { get; set; } = 10;
        public int TargetRepsMax { get; set; } = 12;
        public int RestSeconds { get; set; } = 120;
    }
}
```

- [ ] **Step 2: Add "+" button link in `ProgramDetail.razor`**

After the closing `</div>` of the `programs-list` div, add:

```html
<a href="/programs/@ProgramId/sessions/new" class="fab-btn">+</a>
```

- [ ] **Step 3: Add target fields + fab CSS to `app.css`**

Add at the end of the file:

```css
/* ── Target fields row ────────────────────────────────── */
.target-fields {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

.field-group--sm {
    flex: 1;
    min-width: 0;
}

.field-group--sm .field-label {
    font-size: 0.7rem;
}

.field-group--sm .field-input {
    padding: 0.4rem 0.5rem;
    font-size: 0.85rem;
}

/* ── Floating action button ───────────────────────────── */
.fab-btn {
    position: fixed;
    bottom: 90px;
    right: 20px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #4A90D9;
    color: var(--st-white);
    font-size: 1.8rem;
    font-weight: 300;
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    box-shadow: 0 4px 14px rgba(74, 144, 217, 0.4);
    z-index: 40;
    transition: transform 0.15s, box-shadow 0.15s;
}

.fab-btn:hover {
    transform: scale(1.08);
    box-shadow: 0 6px 20px rgba(74, 144, 217, 0.5);
}
```

- [ ] **Step 4: Build to verify**

Run: `dotnet build SportTracker.App/SportTracker.App.csproj`
Expected: Build succeeded.

- [ ] **Step 5: Commit**

```bash
git add SportTracker.App/Pages/NewProgramSession.razor SportTracker.App/Pages/ProgramDetail.razor SportTracker.App/wwwroot/css/app.css
git commit -m "feat: add session creation form with exercise picker and target fields"
```

---

### Task 11: End-to-End Smoke Test + CLAUDE.md Update

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: All prior tasks
- Produces: Updated project documentation

- [ ] **Step 1: Start the API and App**

In two terminals:

```bash
# Terminal 1
dotnet run --project SportTracker.Api

# Terminal 2
dotnet run --project SportTracker.App
```

- [ ] **Step 2: Manual smoke test**

Navigate to the Blazor app URL (typically `http://localhost:5200` or as configured). Verify:

1. `/workoutsessions` — tab bar shows "Seances" (active) and "Carnets"
2. Click "Carnets" tab — navigates to `/programs` showing empty state
3. Click "+ Nouveau" — `/programs/new` form renders with name, objective, color picker, session list
4. Create a program "Full body gem" with sessions "Base" and "Volume"
5. Verify redirect to `/programs` — program shows with color pill
6. Click the program — `/programs/1` shows "Base" and "Volume" sessions
7. Click "+" — add a session with exercises (search, pick exercise, set target fields)
8. Click a session — exercises listed with schema text
9. Click an exercise — history page renders (empty state if no workout logs yet)
10. Timer play/pause button works

- [ ] **Step 3: Update `CLAUDE.md`**

Add a new section after "Etape 4" in the progress tracking:

```markdown
### Etape 4b — Programmes d'entrainement (Carnets) ✅
- [x] Modeles : `WorkoutProgram`, `WorkoutProgramSession`, `WorkoutProgramExercise`
- [x] FK nullable `WorkoutProgramSessionId` sur `WorkoutSession`
- [x] Migration EF Core `AddWorkoutPrograms`
- [x] `WorkoutProgramRepository` + DI
- [x] `WorkoutProgramController` — 5 endpoints CRUD (`api/programs`)
- [x] `ExerciseController` — endpoint historique (`api/exercises/{id}/history`)
- [x] Tab bar Seances/Carnets sur la page Workouts
- [x] Pages Blazor : liste programmes, detail, creation, seances, exercices, historique
- [x] Timer de repos pre-rempli depuis `RestSeconds`
- [x] Schema cible structure (TargetSets, TargetRepsMin/Max, RestSeconds)
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with workout programs milestone"
```
