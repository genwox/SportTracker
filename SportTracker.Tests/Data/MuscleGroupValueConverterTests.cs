using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using SportTracker.Core.Enums;
using SportTracker.Core.Models;
using SportTracker.Data;

namespace SportTracker.Tests.Data;

public class MuscleGroupValueConverterTests : IDisposable
{
    private SqliteConnection _connection = null!;
    private SportTrackerDbContext _context = null!;

    public MuscleGroupValueConverterTests() => Setup();

    private void Setup()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<SportTrackerDbContext>()
            .UseSqlite(_connection)
            .Options;

        _context = new SportTrackerDbContext(options);
        _context.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
    }

    // -------------------------------------------------------------------------
    // Round-trip List<MuscleGroup> ↔ string CSV
    // -------------------------------------------------------------------------

    [Fact]
    public async Task RoundTrip_MultipleMuscleGroups_PreservesAllGroups()
    {
        // ARRANGE
        var exercise = new Exercise
        {
            Name = "Pull-up",
            MuscleGroups = [MuscleGroup.Back, MuscleGroup.Biceps, MuscleGroup.Shoulders]
        };
        _context.Exercises.Add(exercise);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        // ACT
        var loaded = await _context.Exercises.FindAsync(exercise.Id);

        // ASSERT
        Assert.NotNull(loaded);
        Assert.Equal(3, loaded!.MuscleGroups.Count);
        Assert.Contains(MuscleGroup.Back,      loaded.MuscleGroups);
        Assert.Contains(MuscleGroup.Biceps,    loaded.MuscleGroups);
        Assert.Contains(MuscleGroup.Shoulders, loaded.MuscleGroups);
    }

    [Fact]
    public async Task RoundTrip_SingleMuscleGroup_PreservesGroup()
    {
        // ARRANGE
        var exercise = new Exercise { Name = "Crunch", MuscleGroups = [MuscleGroup.Abs] };
        _context.Exercises.Add(exercise);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        // ACT
        var loaded = await _context.Exercises.FindAsync(exercise.Id);

        // ASSERT
        Assert.NotNull(loaded);
        Assert.Single(loaded!.MuscleGroups);
        Assert.Equal(MuscleGroup.Abs, loaded.MuscleGroups[0]);
    }

    [Fact]
    public async Task RoundTrip_EmptyMuscleGroups_ReturnsEmptyList()
    {
        // ARRANGE
        var exercise = new Exercise { Name = "Mystery Move", MuscleGroups = [] };
        _context.Exercises.Add(exercise);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        // ACT
        var loaded = await _context.Exercises.FindAsync(exercise.Id);

        // ASSERT
        Assert.NotNull(loaded);
        Assert.Empty(loaded!.MuscleGroups);
    }

    [Fact]
    public async Task RoundTrip_AllMuscleGroups_NoneOmitted()
    {
        // ARRANGE
        var all = Enum.GetValues<MuscleGroup>().ToList();
        var exercise = new Exercise { Name = "Full Body", MuscleGroups = all };
        _context.Exercises.Add(exercise);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        // ACT
        var loaded = await _context.Exercises.FindAsync(exercise.Id);

        // ASSERT
        Assert.NotNull(loaded);
        Assert.Equal(all.Count, loaded!.MuscleGroups.Count);
        foreach (var group in all)
            Assert.Contains(group, loaded.MuscleGroups);
    }

    [Fact]
    public async Task RoundTrip_OrderPreserved()
    {
        // ARRANGE
        var exercise = new Exercise
        {
            Name = "Deadlift",
            MuscleGroups = [MuscleGroup.Legs, MuscleGroup.Back, MuscleGroup.Glutes]
        };
        _context.Exercises.Add(exercise);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        // ACT
        var loaded = await _context.Exercises.FindAsync(exercise.Id);

        // ASSERT
        Assert.Equal(MuscleGroup.Legs,   loaded!.MuscleGroups[0]);
        Assert.Equal(MuscleGroup.Back,   loaded.MuscleGroups[1]);
        Assert.Equal(MuscleGroup.Glutes, loaded.MuscleGroups[2]);
    }
}
