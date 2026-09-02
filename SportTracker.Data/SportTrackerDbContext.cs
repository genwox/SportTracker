using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using SportTracker.Core.Enums;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Models;
using SportTracker.Data.Users;

namespace SportTracker.Data;

public class SportTrackerDbContext :  IdentityDbContext<ApplicationUser>
{
    private readonly ICurrentUserService _currentUser;

    public SportTrackerDbContext(DbContextOptions<SportTrackerDbContext> options, ICurrentUserService currentUser)
        : base(options)
    {
        _currentUser = currentUser;
    }

    public DbSet<WorkoutExercise>  WorkoutExercises { get; set; }
    public DbSet<WorkoutSession> WorkoutSessions { get; set; }
    public DbSet<CardioSession> CardioSessions { get; set; }
    public DbSet<ExerciseSet> ExerciseSets { get; set; }
    public DbSet<Exercise> Exercises { get; set; }
    public DbSet<WorkoutProgram> WorkoutPrograms { get; set; }
    public DbSet<WorkoutProgramSession> WorkoutProgramSessions { get; set; }
    public DbSet<WorkoutProgramExercise> WorkoutProgramExercises { get; set; }

    protected override void  OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
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
        
        modelBuilder.Entity<WorkoutSession>().HasQueryFilter(ws => ws.UserId == _currentUser.UserId);
        modelBuilder.Entity<CardioSession>().HasQueryFilter(cs => cs.UserId == _currentUser.UserId);
        modelBuilder.Entity<WorkoutProgram>().HasQueryFilter(wp => wp.UserId == _currentUser.UserId);
    }

    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        StampUserId();
        return base.SaveChangesAsync(ct);
    }

    private void StampUserId()
    {
        var userId = _currentUser.UserId;
        if(userId == null)
        {return;}
        foreach(var entry in ChangeTracker.Entries<IUserOwned>())
            if(entry.State == EntityState.Added)
                entry.Entity.UserId = userId;
    }
}