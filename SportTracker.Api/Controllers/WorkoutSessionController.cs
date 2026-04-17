using Microsoft.AspNetCore.Mvc;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Models;

namespace SportTracker.Api.Controllers;

[ApiController]
[Route("api/workoutsessions")]
public class WorkoutSessionController : ControllerBase
{
    private readonly  IRepository<WorkoutSession> _workoutSessionRepository;
    
    public WorkoutSessionController(IRepository<WorkoutSession> workoutSessionRepository)
    {
        _workoutSessionRepository = workoutSessionRepository;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllAsync()
    {
        var workoutSessions = await _workoutSessionRepository.GetAllAsync();
        return  Ok(workoutSessions);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetByIdAsync(int id)
    {
        var workoutSession = await _workoutSessionRepository.GetByIdAsync(id);
        if (workoutSession == null)
        {
            return NotFound();
        }
        return Ok(workoutSession);
    }

    [HttpPost]
    public async Task<IActionResult> CreateAsync([FromBody] WorkoutSession workoutSession)
    { 
        await _workoutSessionRepository.AddAsync(workoutSession);
        return Ok(workoutSession);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAsync(int id, [FromBody] WorkoutSession workoutSession)
    {
        if (id != workoutSession.Id)
        {
            return BadRequest();
        }
        var updatedWorkoutSession = await _workoutSessionRepository.GetByIdAsync(id);
        if (updatedWorkoutSession == null)
        {
            return NotFound();
        }
        await _workoutSessionRepository.UpdateAsync(workoutSession);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAsync(int id)
    {
        var workoutSession = await _workoutSessionRepository.GetByIdAsync(id);
        if (workoutSession == null)
        {
            return NotFound();
        }
        await _workoutSessionRepository.DeleteAsync(id);
        return NoContent();
    }
}