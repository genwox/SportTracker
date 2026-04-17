using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using SportTracker.Core.Enums;
using SportTracker.Core.Models;

namespace SportTracker.Data;

public class SportTrackerDbContext :  DbContext
{
    public SportTrackerDbContext(DbContextOptions<SportTrackerDbContext> options)
    : base (options) {}
    
    public DbSet<WorkoutExercise>  WorkoutExercises { get; set; }
    public DbSet<WorkoutSession> WorkoutSessions { get; set; }
    public DbSet<CardioSession> CardioSessions { get; set; }
    public DbSet<ExerciseSet> ExerciseSets { get; set; }
    public DbSet<Exercise> Exercises { get; set; }
    
    protected override void  OnModelCreating(ModelBuilder modelBuilder)
    {
        var converter = new ValueConverter<List<MuscleGroup>, string>(
            v => string.Join(',', v),
            v => v.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(Enum.Parse<MuscleGroup>)
                .ToList()
        );
        
        var comparer = new ValueComparer<List<MuscleGroup>>(
            (c1, c2) => c1!.SequenceEqual(c2!),
            c => c.Aggregate(0, (a, v) =>
                    HashCode.Combine(a, v.GetHashCode())),
            c => c.ToList()
        );
        
        modelBuilder.Entity<Exercise>()
            .Property(e => e.MuscleGroups)
            .HasConversion(converter)
            .Metadata.SetValueComparer(comparer);
    }
}