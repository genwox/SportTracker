using Microsoft.EntityFrameworkCore;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Models;

namespace SportTracker.Data;

public class WorkoutSessionRepository : IRepository<WorkoutSession>
{
    private readonly SportTrackerDbContext _context;

    public WorkoutSessionRepository(SportTrackerDbContext context)
    {
        _context = context;
    }
    public async Task<WorkoutSession?> GetByIdAsync(int id)
    {
        return await _context.WorkoutSessions
            .Include(ws => ws.WorkoutExercises)!
                .ThenInclude(we => we.Exercise)
            .Include(ws => ws.WorkoutExercises)!
                .ThenInclude(we => we.ExerciseSets)
            .FirstOrDefaultAsync(ws => ws.Id == id);
    }

    public async  Task<IEnumerable<WorkoutSession>> GetAllAsync()
    {
        return await _context.WorkoutSessions.ToListAsync();
    }

    public async Task AddAsync(WorkoutSession entity)
    {
        _context.WorkoutSessions.Add(entity); 
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(WorkoutSession entity)
    {
        _context.WorkoutSessions.Update(entity);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var entity = await _context.WorkoutSessions.FindAsync(id);
        
        if (entity == null)
        {
            return;
        }
        _context.WorkoutSessions.Remove(entity);
        await _context.SaveChangesAsync();
    }
}