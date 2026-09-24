using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using SportTracker.Core.Models;
using SportTracker.Data;
using SportTracker.Data.Repository;
using SportTracker.Tests.Support;

namespace SportTracker.Tests.Repository;

public class OwnershipUpdateTests : IDisposable
{
    private readonly SqliteConnection _connection = new("DataSource=:memory:");
    private readonly DbContextOptions<SportTrackerDbContext> _options;

    public OwnershipUpdateTests()
    {
        _connection.Open();
        _options = new DbContextOptionsBuilder<SportTrackerDbContext>()
            .UseSqlite(_connection).Options;
        using var context = Context("owner");
        context.Database.EnsureCreated();
    }

    private SportTrackerDbContext Context(string userId) =>
        new(_options, new FakeCurrentUserService(userId));

    public void Dispose() => _connection.Dispose();

    [Fact]
    public async Task WorkoutPutGraph_CannotTransferOwner()
    {
        using (var context = Context("owner"))
        {
            var repository = new WorkoutSessionRepository(context);
            var original = new WorkoutSession { Name = "Original" };
            await repository.AddAsync(original);
            await repository.GetByIdAsync(original.Id); // Controller existence check tracks the old graph.
            await repository.UpdateAsync(new WorkoutSession
            {
                Id = original.Id, Name = "Updated", UserId = "attacker"
            });
        }

        using var owner = Context("owner");
        var saved = await owner.WorkoutSessions.SingleAsync();
        Assert.Equal("owner", saved.UserId);
        Assert.Equal("Updated", saved.Name);
        using var attacker = Context("attacker");
        Assert.Empty(await attacker.WorkoutSessions.ToListAsync());
    }

    [Fact]
    public async Task CardioPut_CannotTransferOwner()
    {
        using (var context = Context("owner"))
        {
            var repository = new CardioSessionRepository(context);
            var original = new CardioSession { Name = "Original" };
            await repository.AddAsync(original);
            await repository.GetByIdAsync(original.Id);
            await repository.UpdateAsync(new CardioSession
            {
                Id = original.Id, Name = "Updated", UserId = "attacker"
            });
        }

        using var owner = Context("owner");
        var saved = await owner.CardioSessions.SingleAsync();
        Assert.Equal("owner", saved.UserId);
        Assert.Equal("Updated", saved.Name);
        using var attacker = Context("attacker");
        Assert.Empty(await attacker.CardioSessions.ToListAsync());
    }

    [Fact]
    public async Task ProgramThreeStepPut_CannotTransferOwner()
    {
        using (var context = Context("owner"))
        {
            var exercise = new Exercise { Name = "Squat", MuscleGroups = [] };
            context.Exercises.Add(exercise);
            await context.SaveChangesAsync();
            var repository = new WorkoutProgramRepository(context);
            var original = new WorkoutProgram
            {
                Name = "Original",
                Sessions = [new WorkoutProgramSession
                {
                    Name = "Day", Exercises = [new WorkoutProgramExercise { ExerciseId = exercise.Id }]
                }]
            };
            await repository.AddAsync(original);
            await repository.GetByIdAsync(original.Id);
            await repository.UpdateAsync(new WorkoutProgram
            {
                Id = original.Id, Name = "Updated", UserId = "attacker",
                Sessions = [new WorkoutProgramSession
                {
                    Id = original.Sessions[0].Id, WorkoutProgramId = original.Id,
                    Name = "Day", Exercises = [new WorkoutProgramExercise { ExerciseId = exercise.Id }]
                }]
            });
        }

        using var owner = Context("owner");
        var saved = await owner.WorkoutPrograms.Include(p => p.Sessions)
            .ThenInclude(s => s.Exercises).SingleAsync();
        Assert.Equal("owner", saved.UserId);
        Assert.Equal("Updated", saved.Name);
        Assert.Single(saved.Sessions[0].Exercises);
        using var attacker = Context("attacker");
        Assert.Empty(await attacker.WorkoutPrograms.ToListAsync());
    }
}
