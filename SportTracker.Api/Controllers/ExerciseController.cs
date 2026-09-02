using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Models;
using SportTracker.Data;

namespace SportTracker.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/exercises")]
public class ExerciseController : ControllerBase
{
    private readonly IRepository<Exercise> _exerciseRepository;
    private readonly SportTrackerDbContext _context;

    public ExerciseController(IRepository<Exercise> exerciseRepository, SportTrackerDbContext context)
    {
        _exerciseRepository = exerciseRepository;
        _context = context;
    }

    // Catalogue global partagé : consultable sans compte.
    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetAllAsync()
    {
        var exercises = await _exerciseRepository.GetAllAsync();
        return Ok(exercises);
    }

    [HttpPost]
    public async Task<IActionResult> CreateAsync([FromBody] Exercise exercise)
    {
        await _exerciseRepository.AddAsync(exercise);
        return Ok(exercise);
    }

    [HttpGet("{id}/history")]
    public async Task<IActionResult> GetHistoryAsync(int id)
    {
        var exercise = await _exerciseRepository.GetByIdAsync(id);
        if (exercise == null) return NotFound();

        // Racine = WorkoutSessions (filtrée par UserId via le query filter global) :
        // l'historique est donc automatiquement borné à l'utilisateur courant.
        var sessions = await _context.WorkoutSessions
            .Include(ws => ws.WorkoutExercises!)
                .ThenInclude(we => we.ExerciseSets)
            .Where(ws => ws.WorkoutExercises!.Any(we => we.ExerciseId == id))
            .ToListAsync();

        var history = sessions
            .SelectMany(ws => ws.WorkoutExercises!
                .Where(we => we.ExerciseId == id)
                .SelectMany(we => we.ExerciseSets ?? new List<ExerciseSet>())
                .Select(s => new { ws.Date, Set = s }))
            .GroupBy(x => x.Date.Date)
            .Select(g => new
            {
                Date = g.Key,
                TotalReps = g.Sum(x => x.Set.Repetitions),
                TotalVolume = g.Sum(x => x.Set.Repetitions * x.Set.Weight),
                Sets = g.OrderBy(x => x.Set.Id)
                    .Select((x, i) => new
                    {
                        Order = i + 1,
                        x.Set.Repetitions,
                        x.Set.Weight
                    }).ToList()
            })
            .OrderByDescending(h => h.Date)
            .ToList();

        return Ok(history);
    }

    [HttpPost("{exerciseId}/log")]
    public async Task<IActionResult> LogSetAsync(int exerciseId, [FromBody] LogSetRequest request)
    {
        var exercise = await _exerciseRepository.GetByIdAsync(exerciseId);
        if (exercise == null) return NotFound();

        // On traverse WorkoutPrograms (racine filtrée par UserId) : une session de
        // carnet appartenant à un autre utilisateur reste introuvable → 404.
        var programSession = await _context.WorkoutPrograms
            .SelectMany(p => p.Sessions)
            .FirstOrDefaultAsync(s => s.Id == request.WorkoutProgramSessionId);
        if (programSession == null) return NotFound();

        var today = DateTime.Today;
        var workoutSession = await _context.WorkoutSessions
            .Include(ws => ws.WorkoutExercises!)
                .ThenInclude(we => we.ExerciseSets)
            .FirstOrDefaultAsync(ws =>
                ws.WorkoutProgramSessionId == request.WorkoutProgramSessionId &&
                ws.Date.Date == today);

        if (workoutSession == null)
        {
            workoutSession = new WorkoutSession
            {
                Name = $"{programSession.Name} — {today:dd/MM/yyyy}",
                Date = today,
                WorkoutProgramSessionId = request.WorkoutProgramSessionId,
                Duration = TimeSpan.Zero,
                WorkoutExercises = new List<WorkoutExercise>()
            };
            _context.WorkoutSessions.Add(workoutSession);
        }

        workoutSession.WorkoutExercises ??= new List<WorkoutExercise>();

        var workoutExercise = workoutSession.WorkoutExercises
            .FirstOrDefault(we => we.ExerciseId == exerciseId);

        if (workoutExercise == null)
        {
            workoutExercise = new WorkoutExercise
            {
                ExerciseId = exerciseId,
                ExerciseSets = new List<ExerciseSet>()
            };
            workoutSession.WorkoutExercises.Add(workoutExercise);
        }

        workoutExercise.ExerciseSets ??= new List<ExerciseSet>();

        var newSet = new ExerciseSet
        {
            Repetitions = request.Repetitions,
            Weight = request.Weight
        };
        workoutExercise.ExerciseSets.Add(newSet);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            order = workoutExercise.ExerciseSets.Count,
            repetitions = newSet.Repetitions,
            weight = newSet.Weight
        });
    }

    public record LogSetRequest(int WorkoutProgramSessionId, int Repetitions, double Weight);
}
