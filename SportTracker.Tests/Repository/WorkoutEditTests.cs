using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using SportTracker.Core.Enums;
using SportTracker.Core.Models;
using SportTracker.Data;
using SportTracker.Tests.Support;

namespace SportTracker.Tests.Repository;

/// « Modifier la séance » (V6 · 21) sends the whole session: what it leaves out is deleted.
public class WorkoutEditTests : IDisposable
{
    private readonly SqliteConnection _connection = new("DataSource=:memory:");
    private readonly DbContextOptions<SportTrackerDbContext> _options;
    private readonly int _benchId;
    private readonly int _rowId;

    public WorkoutEditTests()
    {
        _connection.Open();
        _options = new DbContextOptionsBuilder<SportTrackerDbContext>().UseSqlite(_connection).Options;
        using var context = Context();
        context.Database.EnsureCreated();
        var bench = new Exercise { Name = "Développé couché", MuscleGroups = [] };
        var row = new Exercise { Name = "Tirage vertical", MuscleGroups = [] };
        context.Exercises.AddRange(bench, row);
        context.SaveChanges();
        _benchId = bench.Id;
        _rowId = row.Id;
    }

    private SportTrackerDbContext Context() => new(_options, new FakeCurrentUserService("owner"));

    public void Dispose() => _connection.Dispose();

    private async Task<WorkoutSession> Seed()
    {
        using var context = Context();
        var session = new WorkoutSession
        {
            Name = "Haut du corps",
            WorkoutExercises =
            [
                new WorkoutExercise { ExerciseId = _benchId, ExerciseSets = [new ExerciseSet { Weight = 20, Repetitions = 12, SetType = SetType.Warmup }, new ExerciseSet { Weight = 60, Repetitions = 10 }] },
                new WorkoutExercise { ExerciseId = _rowId, ExerciseSets = [new ExerciseSet { Weight = 45, Repetitions = 12 }] },
            ],
        };
        await new WorkoutSessionRepository(context).AddAsync(session);
        return session;
    }

    private static WorkoutSession Copy(WorkoutSession session, IEnumerable<WorkoutExercise> exercises) => new()
    {
        Id = session.Id, Name = session.Name, Date = session.Date, Duration = session.Duration, WorkoutExercises = exercises.ToList(),
    };

    private static WorkoutExercise Keep(WorkoutExercise exercise, IEnumerable<ExerciseSet> sets) => new()
    {
        Id = exercise.Id, ExerciseId = exercise.ExerciseId, WorkoutSessionId = exercise.WorkoutSessionId,
        ExerciseSets = sets.Select(s => new ExerciseSet { Id = s.Id, WorkoutExerciseId = s.WorkoutExerciseId, Weight = s.Weight, Repetitions = s.Repetitions, SetType = s.SetType }).ToList(),
    };

    [Fact]
    public async Task Put_DeletesTheSetsAndExercisesLeftOut()
    {
        var seeded = await Seed();
        var bench = seeded.WorkoutExercises![0];
        using (var context = Context())
        {
            var repository = new WorkoutSessionRepository(context);
            await repository.GetByIdAsync(seeded.Id); // Controller existence check tracks the old graph.
            await repository.UpdateAsync(Copy(seeded, [Keep(bench, bench.ExerciseSets!.Skip(1))]));
        }

        using var check = Context();
        var saved = await new WorkoutSessionRepository(check).GetByIdAsync(seeded.Id);
        var exercise = Assert.Single(saved!.WorkoutExercises!);
        Assert.Equal(_benchId, exercise.ExerciseId);
        var set = Assert.Single(exercise.ExerciseSets!);
        Assert.Equal(60, set.Weight);
        Assert.Equal(1, await check.ExerciseSets.CountAsync());
    }

    [Fact]
    public async Task Put_WithNewRows_RecreatesTheExercisesInTheSentOrder()
    {
        var seeded = await Seed();
        var reordered = seeded.WorkoutExercises!.AsEnumerable().Reverse().Select(e => new WorkoutExercise
        {
            ExerciseId = e.ExerciseId, ExerciseSets = e.ExerciseSets!.Select(s => new ExerciseSet { Weight = s.Weight, Repetitions = s.Repetitions, SetType = s.SetType }).ToList(),
        });
        using (var context = Context())
            await new WorkoutSessionRepository(context).UpdateAsync(Copy(seeded, reordered));

        using var check = Context();
        var saved = await new WorkoutSessionRepository(check).GetByIdAsync(seeded.Id);
        Assert.Equal([_rowId, _benchId], saved!.WorkoutExercises!.Select(e => e.ExerciseId));
        Assert.Equal([20d, 60d], saved.WorkoutExercises![1].ExerciseSets!.Select(s => s.Weight));
        Assert.Equal(2, await check.WorkoutExercises.CountAsync());
        Assert.Equal(3, await check.ExerciseSets.CountAsync());
    }

    [Fact]
    public async Task Put_WithoutExerciseList_LeavesTheExercisesUntouched()
    {
        var seeded = await Seed();
        using (var context = Context())
            await new WorkoutSessionRepository(context).UpdateAsync(new WorkoutSession { Id = seeded.Id, Name = "Renommée" });

        using var check = Context();
        var saved = await new WorkoutSessionRepository(check).GetByIdAsync(seeded.Id);
        Assert.Equal("Renommée", saved!.Name);
        Assert.Equal(2, saved.WorkoutExercises!.Count);
        Assert.Equal(3, await check.ExerciseSets.CountAsync());
    }
}
