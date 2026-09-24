using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SportTracker.Api.Controllers;
using SportTracker.Core.Enums;
using SportTracker.Core.Models;
using SportTracker.Data;
using SportTracker.Tests.Support;

namespace SportTracker.Tests.Controllers;

public class LiveWorkoutControllerTests
{
    private static SportTrackerDbContext CreateContext() => new(
        new DbContextOptionsBuilder<SportTrackerDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options,
        new FakeCurrentUserService());

    [Fact]
    public async Task ReplayingAndEditingStandaloneSnapshot_DoesNotDuplicateSets()
    {
        await using var db = CreateContext();
        db.Exercises.Add(new Exercise { Id = 10, Name = "Bench", MuscleGroups = [MuscleGroup.Chest] });
        await db.SaveChangesAsync();
        var controller = new LiveWorkoutController(db);
        var draftId = Guid.NewGuid();
        var request = new LiveWorkoutController.SyncExerciseRequest(null, DateTime.Today,
            "Séance libre", "Bonne forme", 1,
            [new LiveWorkoutController.LiveSet(60, 10, SetType.Normal, 8)]);

        Assert.IsType<OkObjectResult>(await controller.SyncExerciseAsync(draftId, 10, request));
        Assert.IsType<OkObjectResult>(await controller.SyncExerciseAsync(draftId, 10, request));

        var session = Assert.Single(await db.WorkoutSessions.Include(ws => ws.WorkoutExercises!)
            .ThenInclude(we => we.ExerciseSets).ToListAsync());
        Assert.Equal(draftId, session.ClientDraftId);
        var exercise = Assert.Single(session.WorkoutExercises!);
        var set = Assert.Single(exercise.ExerciseSets!);
        Assert.Equal(8, set.RPE);
        Assert.Equal(SetType.Normal, set.SetType);
        Assert.Equal("Bonne forme", exercise.Notes);
        Assert.Equal(1, exercise.SupersetGroupId);

        var cleared = request with { Sets = [] };
        Assert.IsType<OkObjectResult>(await controller.SyncExerciseAsync(draftId, 10, cleared));
        Assert.Empty(exercise.ExerciseSets!);
    }

    [Fact]
    public async Task RoutineOwnedByOtherUser_IsNotVisibleToLiveSync()
    {
        await using var db = CreateContext();
        db.Exercises.Add(new Exercise { Id = 11, Name = "Squat", MuscleGroups = [MuscleGroup.Legs] });
        var foreignProgram = new WorkoutProgram
        {
            Name = "Private",
            Sessions = [new WorkoutProgramSession
            {
                Id = 42, Name = "Day", Exercises = [new WorkoutProgramExercise
                {
                    ExerciseId = 11, TargetSets = 3, TargetRepsMin = 8, TargetRepsMax = 10
                }]
            }]
        };
        db.WorkoutPrograms.Add(foreignProgram);
        await db.SaveChangesAsync();
        foreignProgram.UserId = "other-user";
        await db.SaveChangesAsync();
        var controller = new LiveWorkoutController(db);
        var request = new LiveWorkoutController.SyncExerciseRequest(42, DateTime.Today,
            null, null, null, [new LiveWorkoutController.LiveSet(80, 8, SetType.Normal, null)]);

        Assert.IsType<NotFoundResult>(await controller.SyncExerciseAsync(Guid.NewGuid(), 11, request));
        Assert.Empty(await db.WorkoutSessions.ToListAsync());
    }
}
