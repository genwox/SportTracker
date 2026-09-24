using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SportTracker.Core.Enums;
using SportTracker.Core.Models;
using SportTracker.Data;

namespace SportTracker.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/workoutsessions/live")]
public class LiveWorkoutController(SportTrackerDbContext context) : ControllerBase
{
    public record LiveSet(double Weight, int Repetitions, SetType SetType, int? RPE);
    public record SyncExerciseRequest(int? WorkoutProgramSessionId, DateTime? WorkoutDate, string? SessionName,
        string? Notes, int? SupersetGroupId, List<LiveSet> Sets, int? ExpectedWorkoutSessionId = null);

    // Each request is a complete snapshot of one exercise. Replaying the same draft after
    // a lost acknowledgement leaves the same sets on the server instead of adding duplicates.
    // A draft that was already attached to a server session sends its id: if that session
    // is gone (deleted elsewhere), the snapshot is rejected with 409 instead of recreating it.
    [HttpPut("{draftId:guid}/exercises/{exerciseId:int}")]
    public async Task<IActionResult> SyncExerciseAsync(Guid draftId, int exerciseId,
        [FromBody] SyncExerciseRequest request)
    {
        if (draftId == Guid.Empty || request.Sets is null ||
            request.Sets.Any(s => s.Weight < 0 || s.Repetitions < 1 ||
                s.RPE is < 1 or > 10 || !Enum.IsDefined(s.SetType)))
            return BadRequest("Invalid live exercise data.");

        if (!await context.Exercises.AnyAsync(e => e.Id == exerciseId)) return NotFound();

        WorkoutProgramSession? programSession = null;
        if (request.WorkoutProgramSessionId is int programSessionId)
        {
            // Traverse the user-scoped root, so another user's program remains invisible.
            programSession = await context.WorkoutPrograms
                .SelectMany(p => p.Sessions)
                .FirstOrDefaultAsync(s => s.Id == programSessionId);
            if (programSession is null) return NotFound();
            if (!await context.WorkoutProgramExercises.AnyAsync(e =>
                    e.WorkoutProgramSessionId == programSessionId && e.ExerciseId == exerciseId))
                return NotFound();
        }

        var today = request.WorkoutDate?.Date ?? DateTime.Today;
        if (today > DateTime.Today.AddDays(1) || today < DateTime.Today.AddYears(-1))
            return BadRequest("Workout date is out of range.");
        var workouts = context.WorkoutSessions
            .Include(ws => ws.WorkoutExercises!).ThenInclude(we => we.ExerciseSets);
        var workout = programSession is null
            ? await workouts.FirstOrDefaultAsync(ws => ws.ClientDraftId == draftId)
            : await workouts.FirstOrDefaultAsync(ws =>
                ws.WorkoutProgramSessionId == programSession.Id && ws.Date.Date == today);

        if (request.ExpectedWorkoutSessionId is int expectedId && workout?.Id != expectedId)
            return Conflict("La séance ciblée n'existe plus : le brouillon n'a pas été appliqué.");

        if (workout is null)
        {
            workout = new WorkoutSession
            {
                Name = string.IsNullOrWhiteSpace(request.SessionName)
                    ? programSession is null ? $"Séance libre — {today:dd/MM/yyyy}" : $"{programSession.Name} — {today:dd/MM/yyyy}"
                    : request.SessionName.Trim(),
                Date = today,
                Duration = TimeSpan.Zero,
                WorkoutProgramSessionId = programSession?.Id,
                ClientDraftId = programSession is null ? draftId : null,
                WorkoutExercises = []
            };
            context.WorkoutSessions.Add(workout);
        }

        workout.WorkoutExercises ??= [];
        var workoutExercise = workout.WorkoutExercises.FirstOrDefault(we => we.ExerciseId == exerciseId);
        if (workoutExercise is null)
        {
            workoutExercise = new WorkoutExercise { ExerciseId = exerciseId, ExerciseSets = [] };
            workout.WorkoutExercises.Add(workoutExercise);
        }

        workoutExercise.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        workoutExercise.SupersetGroupId = request.SupersetGroupId;
        if (workoutExercise.ExerciseSets is { Count: > 0 })
            context.ExerciseSets.RemoveRange(workoutExercise.ExerciseSets);
        workoutExercise.ExerciseSets = request.Sets.Select(s => new ExerciseSet
        {
            Weight = s.Weight, Repetitions = s.Repetitions, SetType = s.SetType, RPE = s.RPE
        }).ToList();

        await context.SaveChangesAsync();
        return Ok(new
        {
            workoutSessionId = workout.Id,
            workoutExerciseId = workoutExercise.Id,
            sets = workoutExercise.ExerciseSets.Select((s, i) => new
            {
                s.Id, Order = i + 1, s.Weight, s.Repetitions, s.SetType, s.RPE
            })
        });
    }

    [HttpGet("{draftId:guid}")]
    public async Task<IActionResult> GetDraftAsync(Guid draftId)
    {
        var workout = await context.WorkoutSessions
            .Include(ws => ws.WorkoutExercises!).ThenInclude(we => we.ExerciseSets)
            .Include(ws => ws.WorkoutExercises!).ThenInclude(we => we.Exercise)
            .FirstOrDefaultAsync(ws => ws.ClientDraftId == draftId);
        return workout is null ? NotFound() : Ok(workout);
    }
}
