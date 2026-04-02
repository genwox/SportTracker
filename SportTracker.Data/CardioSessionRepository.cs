using Microsoft.EntityFrameworkCore;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Models;

namespace SportTracker.Data;

public class CardioSessionRepository : IRepository<CardioSession>
{
    private readonly SportTrackerDbContext _context;

    public CardioSessionRepository(SportTrackerDbContext context)
    {
        _context = context;
    }
    public async Task<CardioSession?> GetByIdAsync(int id)
    {
        return await _context.CardioSessions.FindAsync(id);
    }

    public async Task<IEnumerable<CardioSession>> GetAllAsync()
    {
        return await _context.CardioSessions.ToListAsync();
    }

    public async Task AddAsync(CardioSession entity)
    {
        _context.CardioSessions.Add(entity);
        await _context.SaveChangesAsync();     
    }

    public async Task UpdateAsync(CardioSession entity)
    {
        _context.CardioSessions.Update(entity);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var entity = await _context.CardioSessions.FindAsync(id);

        if (entity == null)
        {
            return;
        }
        _context.CardioSessions.Remove(entity);
        await _context.SaveChangesAsync();
    }
}