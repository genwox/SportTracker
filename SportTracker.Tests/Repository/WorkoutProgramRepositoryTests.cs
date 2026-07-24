using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using SportTracker.Core.Models;
using SportTracker.Data;
using SportTracker.Data.Repository;

namespace SportTracker.Tests.Repository;

public class WorkoutProgramRepositoryTests : IDisposable
{
    private SqliteConnection _connection = null!;
    private SportTrackerDbContext _context = null!;
    private WorkoutProgramRepository _repository = null!;

    public WorkoutProgramRepositoryTests() => Setup();

    private void Setup()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<SportTrackerDbContext>()
            .UseSqlite(_connection)
            .Options;

        _context = new SportTrackerDbContext(options);
        _context.Database.EnsureCreated();

        _repository = new WorkoutProgramRepository(_context);
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
    }

    // -------------------------------------------------------------------------
    // UpdateAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task UpdateAsync_ReplacesExercisesWithNewOnes()
    {
        // ARRANGE
        var exercise1 = new Exercise { Name = "Squat",       MuscleGroups = [] };
        var exercise2 = new Exercise { Name = "Bench Press", MuscleGroups = [] };
        _context.Exercises.AddRange(exercise1, exercise2);
        await _context.SaveChangesAsync();

        var program = new WorkoutProgram
        {
            Name = "PPL",
            Sessions =
            [
                new WorkoutProgramSession
                {
                    Name = "Push",
                    Order = 1,
                    Exercises =
                    [
                        new WorkoutProgramExercise { ExerciseId = exercise1.Id, Order = 1, TargetSets = 3, TargetRepsMin = 8, TargetRepsMax = 12, RestSeconds = 90  },
                        new WorkoutProgramExercise { ExerciseId = exercise2.Id, Order = 2, TargetSets = 4, TargetRepsMin = 6, TargetRepsMax = 10, RestSeconds = 120 }
                    ]
                }
            ]
        };
        await _repository.AddAsync(program);
        _context.ChangeTracker.Clear();

        var updatedProgram = new WorkoutProgram
        {
            Id = program.Id,
            Name = "PPL Updated",
            Sessions =
            [
                new WorkoutProgramSession
                {
                    Id = program.Sessions[0].Id,
                    Name = "Push",
                    Order = 1,
                    WorkoutProgramId = program.Id,
                    Exercises =
                    [
                        new WorkoutProgramExercise
                        {
                            ExerciseId   = exercise1.Id,
                            Order        = 1,
                            TargetSets   = 5,
                            TargetRepsMin = 3,
                            TargetRepsMax = 5,
                            RestSeconds  = 180
                        }
                    ]
                }
            ]
        };

        // ACT
        await _repository.UpdateAsync(updatedProgram);
        _context.ChangeTracker.Clear();

        // ASSERT
        var exercises = await _context.WorkoutProgramExercises.ToListAsync();
        Assert.Single(exercises);
        Assert.Equal(exercise1.Id, exercises[0].ExerciseId);
        Assert.Equal(5,   exercises[0].TargetSets);
        Assert.Equal(3,   exercises[0].TargetRepsMin);
        Assert.Equal(180, exercises[0].RestSeconds);
    }

    [Fact]
    public async Task UpdateAsync_PreservesExistingSessionId()
    {
        // ARRANGE
        var exercise = new Exercise { Name = "Squat", MuscleGroups = [] };
        _context.Exercises.Add(exercise);
        await _context.SaveChangesAsync();

        var program = new WorkoutProgram
        {
            Name = "Test",
            Sessions = [new WorkoutProgramSession { Name = "Day 1", Order = 1, Exercises = [] }]
        };
        await _repository.AddAsync(program);
        _context.ChangeTracker.Clear();

        var sessionId = program.Sessions[0].Id;

        var updatedProgram = new WorkoutProgram
        {
            Id = program.Id,
            Name = "Test Updated",
            Sessions =
            [
                new WorkoutProgramSession
                {
                    Id = sessionId,
                    Name = "Day 1 Updated",
                    Order = 1,
                    WorkoutProgramId = program.Id,
                    Exercises =
                    [
                        new WorkoutProgramExercise
                        {
                            ExerciseId    = exercise.Id,
                            Order         = 1,
                            TargetSets    = 3,
                            TargetRepsMin = 8,
                            TargetRepsMax = 12,
                            RestSeconds   = 60
                        }
                    ]
                }
            ]
        };

        // ACT
        await _repository.UpdateAsync(updatedProgram);
        _context.ChangeTracker.Clear();

        // ASSERT
        var sessions = await _context.WorkoutProgramSessions.ToListAsync();
        Assert.Single(sessions);
        Assert.Equal(sessionId,      sessions[0].Id);
        Assert.Equal("Day 1 Updated", sessions[0].Name);
    }

    // -------------------------------------------------------------------------
    // GetByIdAsync
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetByIdAsync_ReturnsSessionsAndExercisesOrdered()
    {
        // ARRANGE
        var ex1 = new Exercise { Name = "A", MuscleGroups = [] };
        var ex2 = new Exercise { Name = "B", MuscleGroups = [] };
        _context.Exercises.AddRange(ex1, ex2);
        await _context.SaveChangesAsync();

        var program = new WorkoutProgram
        {
            Name = "PPL",
            Sessions =
            [
                new WorkoutProgramSession
                {
                    Name = "Push",
                    Order = 2,
                    Exercises =
                    [
                        new WorkoutProgramExercise { ExerciseId = ex2.Id, Order = 2, TargetSets = 3, TargetRepsMin = 8, TargetRepsMax = 12, RestSeconds = 90 },
                        new WorkoutProgramExercise { ExerciseId = ex1.Id, Order = 1, TargetSets = 3, TargetRepsMin = 8, TargetRepsMax = 12, RestSeconds = 90 }
                    ]
                },
                new WorkoutProgramSession { Name = "Pull", Order = 1, Exercises = [] }
            ]
        };
        await _repository.AddAsync(program);
        _context.ChangeTracker.Clear();

        // ACT
        var result = await _repository.GetByIdAsync(program.Id);

        // ASSERT
        Assert.NotNull(result);
        Assert.Equal("Pull", result!.Sessions[0].Name);            // Order 1 → premier
        Assert.Equal("Push", result.Sessions[1].Name);             // Order 2 → deuxième
        Assert.Equal(ex1.Id, result.Sessions[1].Exercises[0].ExerciseId); // Order 1 dans Push
        Assert.Equal(ex2.Id, result.Sessions[1].Exercises[1].ExerciseId); // Order 2 dans Push
    }
}
