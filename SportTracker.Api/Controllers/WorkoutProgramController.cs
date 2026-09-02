using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Models;

namespace SportTracker.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/programs")]
public class WorkoutProgramController : ControllerBase
{
    private readonly IRepository<WorkoutProgram> _programRepository;

    public WorkoutProgramController(IRepository<WorkoutProgram> programRepository)
    {
        _programRepository = programRepository;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllAsync()
    {
        var programs = await _programRepository.GetAllAsync();
        return Ok(programs);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetByIdAsync(int id)
    {
        var program = await _programRepository.GetByIdAsync(id);
        if (program == null) return NotFound();
        return Ok(program);
    }

    [HttpPost]
    public async Task<IActionResult> CreateAsync([FromBody] WorkoutProgram program)
    {
        await _programRepository.AddAsync(program);
        return Ok(program);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAsync(int id, [FromBody] WorkoutProgram program)
    {
        if (id != program.Id) return BadRequest();
        var existing = await _programRepository.GetByIdAsync(id);
        if (existing == null) return NotFound();
        await _programRepository.UpdateAsync(program);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAsync(int id)
    {
        var program = await _programRepository.GetByIdAsync(id);
        if (program == null) return NotFound();
        await _programRepository.DeleteAsync(id);
        return NoContent();
    }
}
