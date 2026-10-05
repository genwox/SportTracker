using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Models;

namespace SportTracker.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/healthmetrics")]
public class HealthMetricController(IHealthMetricRepository repository) : ControllerBase
{
    public record WeightInput([property: Required, Range(typeof(decimal), "1", "500")] decimal? Value);
    public record StepsInput([property: Required, Range(0, 200000)] int? Value);

    [HttpGet]
    public async Task<ActionResult<List<DailyHealthMetric>>> GetAll(CancellationToken ct) => Ok(await repository.GetAllAsync(ct));

    [HttpPut("weight/{date}")]
    public async Task<ActionResult<DailyHealthMetric>> SaveWeight(DateOnly date, WeightInput input, CancellationToken ct)
    {
        if (date == default || input.Value is not (>= 1 and <= 500)) return BadRequest();
        return Ok(await repository.SaveAsync(date, decimal.Round(input.Value.Value, 2), null, ct));
    }

    [HttpPut("steps/{date}")]
    public async Task<ActionResult<DailyHealthMetric>> SaveSteps(DateOnly date, StepsInput input, CancellationToken ct)
    {
        if (date == default || input.Value is not (>= 0 and <= 200000)) return BadRequest();
        return Ok(await repository.SaveAsync(date, null, input.Value, ct));
    }

    [HttpDelete("{kind}/{date}")]
    public async Task<IActionResult> Delete(string kind, DateOnly date, CancellationToken ct)
    {
        if (kind is not ("weight" or "steps")) return BadRequest();
        return await repository.DeleteAsync(date, kind == "weight", ct) ? NoContent() : NotFound();
    }
}
