using Microsoft.AspNetCore.Mvc;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Models;

namespace SportTracker.Api.Controllers;

[ApiController]
[Route("api/exercises")]
public class ExerciseController : ControllerBase
{
    private readonly IRepository<Exercise> _exerciseRepository;

    public ExerciseController(IRepository<Exercise> exerciseRepository)
    {
        _exerciseRepository = exerciseRepository;
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
}
