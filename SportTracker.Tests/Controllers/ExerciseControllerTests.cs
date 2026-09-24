using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using SportTracker.Api.Controllers;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Enums;
using SportTracker.Core.Models;
using SportTracker.Data;
using SportTracker.Data.Repository;
using SportTracker.Tests.Support;

namespace SportTracker.Tests.Controllers;

public class ExerciseControllerTests : IDisposable
{
    private SportTrackerDbContext _context = null!;
    private Mock<IRepository<Exercise>> _exerciseRepoMock = null!;
    private ExerciseController _controller = null!;

    public ExerciseControllerTests() => Setup();

    private void Setup()
    {
        var options = new DbContextOptionsBuilder<SportTrackerDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _context = new SportTrackerDbContext(options, new FakeCurrentUserService());
        _exerciseRepoMock = new Mock<IRepository<Exercise>>();
        _controller = new ExerciseController(_exerciseRepoMock.Object, _context);
    }

    public void Dispose() => _context.Dispose();

    // La séance de carnet est atteinte via son WorkoutProgram (filtré par UserId) :
    // on la rattache à un carnet appartenant à l'utilisateur courant.
    private void AddOwnedProgramSession(string name, int sessionId = 5, string userId = FakeCurrentUserService.DefaultUserId)
        => _context.WorkoutPrograms.Add(new WorkoutProgram
        {
            Name = "Carnet",
            UserId = userId,
            Sessions = [new WorkoutProgramSession { Id = sessionId, Name = name, Order = 1 }]
        });

    // Accède aux propriétés de types anonymes internal (cross-assembly) via réflexion.
    // dynamic respecte la visibilité du type déclarant et échoue dans ce cas.
    private static T Prop<T>(object obj, string name) =>
        (T)obj.GetType().GetProperty(name)!.GetValue(obj)!;

    [Fact]
    public async Task GetAll_WithCombinedFilters_ReturnsOnlyMatchingExercises()
    {
        var exercises = new[]
        {
            new Exercise { Name = "Bench", MuscleGroups = [MuscleGroup.Chest], Equipment = "Barbell" },
            new Exercise { Name = "Fly", MuscleGroups = [MuscleGroup.Chest], Equipment = "Cable" },
            new Exercise { Name = "Row", MuscleGroups = [MuscleGroup.Back], Equipment = "Barbell" }
        };
        _exerciseRepoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(exercises);

        var all = Assert.IsType<OkObjectResult>(await _controller.GetAllAsync());
        Assert.Equal(3, Assert.IsAssignableFrom<IEnumerable<Exercise>>(all.Value).Count());

        var filtered = Assert.IsType<OkObjectResult>(
            await _controller.GetAllAsync(MuscleGroup.Chest, " barbell "));
        Assert.Equal("Bench", Assert.Single(Assert.IsAssignableFrom<IEnumerable<Exercise>>(filtered.Value)).Name);
    }

    [Fact]
    public async Task Create_PersistsEquipmentAndReturnsCreatedWithRetrievableLocation()
    {
        var controller = new ExerciseController(new ExerciseRepository(_context), _context);
        var exercise = new Exercise
        {
            Name = "Custom press",
            Type = ExerciseType.Strength,
            MuscleGroups = [MuscleGroup.Chest],
            Equipment = "Dumbbell"
        };

        var created = Assert.IsType<CreatedAtActionResult>(await controller.CreateAsync(exercise));
        Assert.Equal(nameof(ExerciseController.GetByIdAsync), created.ActionName);
        Assert.Equal(exercise.Id, created.RouteValues!["id"]);
        var retrieved = Assert.IsType<OkObjectResult>(await controller.GetByIdAsync(exercise.Id));
        Assert.Equal("Dumbbell", Assert.IsType<Exercise>(retrieved.Value).Equipment);
        Assert.Equal("Dumbbell", (await _context.Exercises.FindAsync(exercise.Id))!.Equipment);
    }

    [Fact]
    public async Task Create_WithoutName_ReturnsBadRequest()
    {
        var result = await _controller.CreateAsync(new Exercise { Name = " " });
        Assert.IsType<BadRequestObjectResult>(result);
        _exerciseRepoMock.Verify(r => r.AddAsync(It.IsAny<Exercise>()), Times.Never);
    }

    [Fact]
    public void ExerciseSet_DefaultAndRpeRange()
    {
        var set = new ExerciseSet();
        Assert.Equal(SetType.Normal, set.SetType);
        set.RPE = 10;
        Assert.Equal(10, set.RPE);
        Assert.Throws<ArgumentOutOfRangeException>(() => set.RPE = 0);
        Assert.Throws<ArgumentOutOfRangeException>(() => set.RPE = 11);
    }

    // -------------------------------------------------------------------------
    // LogSetAsync — guards
    // -------------------------------------------------------------------------

    [Fact]
    public async Task LogSet_UnknownExercise_ReturnsNotFound()
    {
        // ARRANGE
        _exerciseRepoMock.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((Exercise?)null);

        // ACT
        var result = await _controller.LogSetAsync(99, new ExerciseController.LogSetRequest(1, 10, 50.0));

        // ASSERT
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task LogSet_UnknownProgramSession_ReturnsNotFound()
    {
        // ARRANGE
        var exercise = new Exercise { Id = 1, Name = "Squat" };
        _exerciseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(exercise);
        // Aucune WorkoutProgramSession dans le contexte

        // ACT
        var result = await _controller.LogSetAsync(1, new ExerciseController.LogSetRequest(999, 10, 50.0));

        // ASSERT
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task LogSet_ProgramSessionOfAnotherUser_ReturnsNotFound()
    {
        // ARRANGE
        var exercise = new Exercise { Id = 1, Name = "Squat" };
        _exerciseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(exercise);

        AddOwnedProgramSession("Push A", userId: "other-user");
        _context.SaveChanges(); // synchrone : pas d'estampillage UserId, le carnet reste à l'autre compte

        // ACT
        var result = await _controller.LogSetAsync(1, new ExerciseController.LogSetRequest(5, 8, 80.0));

        // ASSERT
        Assert.IsType<NotFoundResult>(result);
        Assert.Empty(await _context.WorkoutSessions.IgnoreQueryFilters().ToListAsync());
    }

    // -------------------------------------------------------------------------
    // LogSetAsync — création de session
    // -------------------------------------------------------------------------

    [Fact]
    public async Task LogSet_NoExistingSession_CreatesSessionWithSetAndReturnsOk()
    {
        // ARRANGE
        var exercise = new Exercise { Id = 1, Name = "Squat" };
        _exerciseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(exercise);

        AddOwnedProgramSession("Push A");
        await _context.SaveChangesAsync();

        // ACT
        var result = await _controller.LogSetAsync(1, new ExerciseController.LogSetRequest(5, 8, 80.0));

        // ASSERT
        Assert.IsType<OkObjectResult>(result);

        var sessions = await _context.WorkoutSessions
            .Include(ws => ws.WorkoutExercises)!
            .ThenInclude(we => we.ExerciseSets)
            .ToListAsync();
        Assert.Single(sessions);
        Assert.Equal(5, sessions[0].WorkoutProgramSessionId);

        var sets = sessions[0].WorkoutExercises!.SelectMany(we => we.ExerciseSets!).ToList();
        Assert.Single(sets);
        Assert.Equal(8, sets[0].Repetitions);
        Assert.Equal(80.0, sets[0].Weight);
    }

    [Fact]
    public async Task LogSet_ExistingSessionSameDay_AddsSetToExistingSession()
    {
        // ARRANGE
        var exercise = new Exercise { Id = 1, Name = "Squat" };
        _exerciseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(exercise);

        AddOwnedProgramSession("Push A");

        _context.WorkoutSessions.Add(new WorkoutSession
        {
            Name = "Push A — session",
            Date = DateTime.Today,
            WorkoutProgramSessionId = 5,
            Duration = TimeSpan.Zero,
            WorkoutExercises =
            [
                new WorkoutExercise
                {
                    ExerciseId = 1,
                    ExerciseSets = [new ExerciseSet { Repetitions = 10, Weight = 75.0 }]
                }
            ]
        });
        await _context.SaveChangesAsync();

        // ACT
        var result = await _controller.LogSetAsync(1, new ExerciseController.LogSetRequest(5, 12, 80.0));

        // ASSERT
        Assert.IsType<OkObjectResult>(result);
        Assert.Single(await _context.WorkoutSessions.ToListAsync());

        var sets = await _context.ExerciseSets.ToListAsync();
        Assert.Equal(2, sets.Count);
        Assert.Contains(sets, s => s.Repetitions == 12 && s.Weight == 80.0);
    }

    [Fact]
    public async Task LogSet_ExistingSessionNewExercise_CreatesWorkoutExerciseAndAddSet()
    {
        // ARRANGE
        var exercise = new Exercise { Id = 2, Name = "Bench Press" };
        _exerciseRepoMock.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(exercise);

        AddOwnedProgramSession("Push A");

        _context.WorkoutSessions.Add(new WorkoutSession
        {
            Name = "Push A — session",
            Date = DateTime.Today,
            WorkoutProgramSessionId = 5,
            Duration = TimeSpan.Zero,
            WorkoutExercises =
            [
                new WorkoutExercise
                {
                    ExerciseId = 1,
                    ExerciseSets = [new ExerciseSet { Repetitions = 10, Weight = 60.0 }]
                }
            ]
        });
        await _context.SaveChangesAsync();

        // ACT
        var result = await _controller.LogSetAsync(2, new ExerciseController.LogSetRequest(5, 8, 100.0));

        // ASSERT
        Assert.IsType<OkObjectResult>(result);

        var workoutExercises = await _context.WorkoutExercises
            .Include(we => we.ExerciseSets)
            .ToListAsync();
        Assert.Equal(2, workoutExercises.Count);

        var newWe = workoutExercises.First(we => we.ExerciseId == 2);
        Assert.Single(newWe.ExerciseSets!);
        Assert.Equal(8, newWe.ExerciseSets![0].Repetitions);
    }

    // -------------------------------------------------------------------------
    // LogSetAsync — champ order dans la réponse
    // -------------------------------------------------------------------------

    [Fact]
    public async Task LogSet_FirstSet_ReturnsOrder1()
    {
        // ARRANGE
        var exercise = new Exercise { Id = 1, Name = "Squat" };
        _exerciseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(exercise);

        AddOwnedProgramSession("Push");
        await _context.SaveChangesAsync();

        // ACT
        var result = await _controller.LogSetAsync(1, new ExerciseController.LogSetRequest(5, 10, 60.0));

        // ASSERT
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(1, Prop<int>(ok.Value!, "order"));
    }

    [Fact]
    public async Task LogSet_SecondSetSameExercise_ReturnsOrder2()
    {
        // ARRANGE
        var exercise = new Exercise { Id = 1, Name = "Squat" };
        _exerciseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(exercise);

        AddOwnedProgramSession("Push");
        await _context.SaveChangesAsync();

        await _controller.LogSetAsync(1, new ExerciseController.LogSetRequest(5, 10, 60.0));

        // ACT
        var result = await _controller.LogSetAsync(1, new ExerciseController.LogSetRequest(5, 8, 65.0));

        // ASSERT
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(2, Prop<int>(ok.Value!, "order"));
    }

    [Fact]
    public async Task LogSet_ReturnsCorrectRepetitionsAndWeight()
    {
        // ARRANGE
        var exercise = new Exercise { Id = 1, Name = "Bench" };
        _exerciseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(exercise);

        AddOwnedProgramSession("Push");
        await _context.SaveChangesAsync();

        // ACT
        var result = await _controller.LogSetAsync(1, new ExerciseController.LogSetRequest(5, 12, 80.5));

        // ASSERT
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(12, Prop<int>(ok.Value!, "repetitions"));
        Assert.Equal(80.5, Prop<double>(ok.Value!, "weight"));
    }

    // -------------------------------------------------------------------------
    // GetHistoryAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetHistory_UnknownExercise_ReturnsNotFound()
    {
        // ARRANGE
        _exerciseRepoMock.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((Exercise?)null);

        // ACT
        var result = await _controller.GetHistoryAsync(99);

        // ASSERT
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task GetHistory_MultipleSets_GroupsByDateDescending()
    {
        // ARRANGE
        var exercise = new Exercise { Id = 1, Name = "Squat" };
        _exerciseRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(exercise);
        _context.Exercises.Add(exercise);

        var dateOld = new DateTime(2026, 1, 1);
        var dateNew = new DateTime(2026, 6, 1);

        var sessionOld = new WorkoutSession { Name = "Old", Date = dateOld, Duration = TimeSpan.Zero };
        var sessionNew = new WorkoutSession { Name = "New", Date = dateNew, Duration = TimeSpan.Zero };
        _context.WorkoutSessions.AddRange(sessionOld, sessionNew);
        await _context.SaveChangesAsync();

        var weOld = new WorkoutExercise { ExerciseId = 1, WorkoutSessionId = sessionOld.Id };
        var weNew = new WorkoutExercise { ExerciseId = 1, WorkoutSessionId = sessionNew.Id };
        _context.WorkoutExercises.AddRange(weOld, weNew);
        await _context.SaveChangesAsync();

        _context.ExerciseSets.AddRange(
            new ExerciseSet { WorkoutExerciseId = weOld.Id, Repetitions = 10, Weight = 60.0 },
            new ExerciseSet { WorkoutExerciseId = weOld.Id, Repetitions = 10, Weight = 60.0 },
            new ExerciseSet { WorkoutExerciseId = weNew.Id, Repetitions = 8,  Weight = 80.0 });
        await _context.SaveChangesAsync();

        // ACT
        var result = await _controller.GetHistoryAsync(1);

        // ASSERT
        var ok = Assert.IsType<OkObjectResult>(result);
        var items = ((System.Collections.IEnumerable)ok.Value!).Cast<object>().ToList();

        Assert.Equal(2, items.Count);

        // Ordre décroissant : dateNew en premier
        Assert.Equal(dateNew.Date, Prop<DateTime>(items[0], "Date"));
        Assert.Equal(8,      Prop<int>   (items[0], "TotalReps"));
        Assert.Equal(640.0,  Prop<double>(items[0], "TotalVolume"));

        // Session ancienne : 2 × 10 reps × 60 kg
        Assert.Equal(dateOld.Date, Prop<DateTime>(items[1], "Date"));
        Assert.Equal(20,     Prop<int>   (items[1], "TotalReps"));
        Assert.Equal(1200.0, Prop<double>(items[1], "TotalVolume"));
    }

    [Fact]
    public async Task DeleteSet_OnlyRemovesSetFromOwnedWorkout()
    {
        var owned = new WorkoutSession { Name = "Owned", Date = DateTime.Today,
            WorkoutExercises = [new WorkoutExercise { ExerciseId = 1,
                ExerciseSets = [new ExerciseSet { Repetitions = 10, Weight = 60 }] }] };
        var foreign = new WorkoutSession { Name = "Foreign", Date = DateTime.Today,
            WorkoutExercises = [new WorkoutExercise { ExerciseId = 1,
                ExerciseSets = [new ExerciseSet { Repetitions = 8, Weight = 80 }] }] };
        _context.WorkoutSessions.AddRange(owned, foreign);
        await _context.SaveChangesAsync();
        foreign.UserId = "other-user";
        await _context.SaveChangesAsync();

        var ownSetId = owned.WorkoutExercises![0].ExerciseSets![0].Id;
        var foreignSetId = foreign.WorkoutExercises![0].ExerciseSets![0].Id;
        Assert.IsType<NoContentResult>(await _controller.DeleteSetAsync(1, ownSetId));
        Assert.IsType<NotFoundResult>(await _controller.DeleteSetAsync(1, ownSetId));
        Assert.IsType<NotFoundResult>(await _controller.DeleteSetAsync(1, foreignSetId));
        Assert.NotNull(await _context.ExerciseSets.FindAsync(foreignSetId));
    }
}
