using Microsoft.AspNetCore.Mvc;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Models;

namespace SportTracker.Api.Controllers;

[ApiController]
[Route("api/cardiosessions")]
public class CardioSessionController : ControllerBase
{
    private readonly  IRepository<CardioSession> _cardioSessionRepository;
    
    public CardioSessionController(IRepository<CardioSession> cardioSessionRepository)
    {
        _cardioSessionRepository = cardioSessionRepository;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllAsync()
    {
        var cardioSessions = await _cardioSessionRepository.GetAllAsync();
        return  Ok(cardioSessions);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetByIdAsync(int id)
    {
        var cardioSession = await _cardioSessionRepository.GetByIdAsync(id);
        if (cardioSession == null)
        {
            return NotFound();
        }
        return Ok(cardioSession);
    }

    [HttpPost]
    public async Task<IActionResult> CreateAsync([FromBody] CardioSession cardioSession)
    { 
        await _cardioSessionRepository.AddAsync(cardioSession);
        return Ok(cardioSession);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAsync(int id, [FromBody] CardioSession cardioSession)
    {
        if (id != cardioSession.Id)
        {
            return BadRequest();
        }
        var updatedCardioSession = await _cardioSessionRepository.GetByIdAsync(id);
        if (updatedCardioSession == null)
        {
            return NotFound();
        }
        await _cardioSessionRepository.UpdateAsync(cardioSession);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAsync(int id)
    {
        var cardioSession = await _cardioSessionRepository.GetByIdAsync(id);
        if (cardioSession == null)
        {
            return NotFound();
        }
        await _cardioSessionRepository.DeleteAsync(id);
        return NoContent();
    }
}