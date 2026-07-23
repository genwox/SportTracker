using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Models;
using SportTracker.Data;

namespace SportTracker.Api.Controllers;

[ApiController]
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

        var history = await _context.ExerciseSets
            .Include(s => s.WorkoutExercise)
                .ThenInclude(we => we!.WorkoutSession)
            .Where(s => s.WorkoutExercise!.ExerciseId == id)
            .GroupBy(s => s.WorkoutExercise!.WorkoutSession!.Date.Date)
            .Select(g => new
            {
                Date = g.Key,
                TotalReps = g.Sum(s => s.Repetitions),
                TotalVolume = g.Sum(s => s.Repetitions * s.Weight),
                Sets = g.OrderBy(s => s.Id).Select((s, i) => new
                {
                    Order = i + 1,
                    s.Repetitions,
                    s.Weight
                }).ToList()
            })
            .OrderByDescending(h => h.Date)
            .ToListAsync();

        return Ok(history);
    }
}
